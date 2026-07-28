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

logger = logging.getLogger(__name__)


def get_llm(node_name: str = "default", temperature: float = 0.1) -> ChatGroq:
    """
    Return a configured ChatGroq instance for the given node.
    Model is selected based on node name + use_large_model config flag.
    """
    model = settings.model_for_node(node_name)
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
    if any(kw in exc_str for kw in ["401", "400", "invalid api key", "api_key", "decommissioned"]):
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
    Raises the underlying exception after max retries (caller must catch).
    """
    llm = get_llm(node_name, temperature)

    @make_retry_decorator()
    async def _call():
        return await llm.ainvoke(messages)

    return await _call()
