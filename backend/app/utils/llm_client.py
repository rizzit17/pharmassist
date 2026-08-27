"""
Shared LLM client factory with tenacity retry + timeout.
ALL LangGraph nodes must use this helper rather than creating Groq clients ad-hoc.
"""
import logging
from typing import Any, Optional
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)
from langchain_groq import ChatGroq

from app.core.config import settings

import contextvars

logger = logging.getLogger(__name__)

active_primary_model_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("active_primary_model", default=None)
active_secondary_model_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("active_secondary_model", default=None)


def get_llm(node_name: str = "default", temperature: float = 0.1, override_model: Optional[str] = None) -> ChatGroq:
    """
    Return a configured ChatGroq instance for the given node.
    Model is selected based on request headers / user settings or fallback defaults.
    """
    if override_model:
        model = override_model
    else:
        custom_primary = active_primary_model_var.get()
        custom_secondary = active_secondary_model_var.get()

        if settings.use_large_model and node_name in settings.large_model_nodes:
            model = custom_secondary or settings.secondary_model
        else:
            model = custom_primary or settings.primary_model

    if "llama-3.1" in model.lower() or "llama-3.3" in model.lower() or "gemma" in model.lower() or "llama3" in model.lower():
        model = "openai/gpt-oss-120b" if settings.use_large_model else "openai/gpt-oss-20b"

    return ChatGroq(
        model=model,
        api_key=settings.groq_api_key,
        temperature=temperature,
        timeout=settings.groq_timeout_seconds,
        max_retries=0,  # We handle retries via tenacity, not the SDK
    )


def _should_retry(exc: BaseException) -> bool:
    """Return True if exception is transient (network timeout, rate limit) and worth retrying."""
    exc_str = str(exc).lower()
    if any(kw in exc_str for kw in ["401", "400", "invalid api key", "api_key", "decommissioned", "not exist", "model_not_found"]):
        return False
    return True

def make_retry_decorator():
    """Build a tenacity retry decorator per the global config."""
    from tenacity import retry_if_exception
    return retry(
        stop=stop_after_attempt(settings.groq_max_retries + 1),
        wait=wait_exponential(multiplier=1, min=1, max=5),
        retry=retry_if_exception(_should_retry),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )


async def invoke_llm_with_retry(
    node_name: str,
    messages: list,
    temperature: float = 0.1,
) -> Any:
    """
    Invoke the LLM for a given node with retry/backoff.
    If a model returns 404 or model_not_found, automatically tries fallback models.
    """
    fallback_models = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"]

    last_exception = None
    for model_candidate in [None] + fallback_models:
        try:
            llm = get_llm(node_name, temperature, override_model=model_candidate)

            @make_retry_decorator()
            async def _call():
                return await llm.ainvoke(messages)

            return await _call()
        except Exception as e:
            last_exception = e
            err_str = str(e).lower()
            if "model_not_found" in err_str or "does not exist" in err_str or "404" in err_str or "decommissioned" in err_str:
                logger.warning("Model %s failed with not found (%s), trying next fallback.", model_candidate, e)
                continue
            else:
                raise e

    if last_exception:
        raise last_exception

