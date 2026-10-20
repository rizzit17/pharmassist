from types import SimpleNamespace
import pytest
from app.langgraph.nodes import conversation, intent_detection, response_formatter
from app.langgraph.graph import build_graph, route_after_input_type


@pytest.mark.asyncio
async def test_followup_uses_live_model_with_context(monkeypatch):
    captured = {}
    async def model(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(content="The manufacturing date is 15 January 2026.")
    monkeypatch.setattr(conversation, "invoke_llm_with_retry", model)
    state = {"intent": "GENERAL_QUERY", "user_message": "manufacture date of these tablets?",
             "complaint": {"manufacturing_date": "2026-01-15", "product_strength": "500 mg"},
             "chat_history": [{"role": "user", "content": "Original complaint"}]}
    result = await conversation.conversation_node(state)
    assert result["assistant_message"] == "The manufacturing date is 15 January 2026."
    assert "2026-01-15" in captured["messages"][1].content
    assert "Original complaint" in captured["messages"][1].content
    assert captured["node_name"] == "conversation"
    assert "complaint" not in result
    formatted = await response_formatter.response_formatter_node({**state, **result})
    assert formatted["assistant_message"] == result["assistant_message"]


@pytest.mark.asyncio
async def test_weight_prompt_distinguishes_strength_and_missing_weight(monkeypatch):
    async def model(**kwargs):
        prompt = kwargs["messages"][0].content
        assert "total" in prompt and "tablet weight" in prompt
        assert "Never invent" in prompt
        return SimpleNamespace(content="Total tablet weight wasn't provided. The 500 mg value is the product strength.")
    monkeypatch.setattr(conversation, "invoke_llm_with_retry", model)
    result = await conversation.conversation_node({"user_message": "what is the weight", "complaint": {"product_strength": "500 mg"}})
    assert "wasn't provided" in result["assistant_message"]


@pytest.mark.asyncio
async def test_question_provider_failure_keeps_draft(monkeypatch):
    async def fail(**kwargs):
        raise RuntimeError("offline")
    monkeypatch.setattr(conversation, "invoke_llm_with_retry", fail)
    result = await conversation.conversation_node({"complaint": {"product_name": "Test"}})
    assert result["status"] == "error"
    assert "complaint" not in result


@pytest.mark.asyncio
async def test_intent_failure_routes_question_conservatively(monkeypatch):
    async def fail(**kwargs):
        raise RuntimeError("offline")
    monkeypatch.setattr(intent_detection, "invoke_llm_with_retry", fail)
    result = await intent_detection.intent_detection_node({"user_message": "what batch is this?"})
    assert result["intent"] == "GENERAL_QUERY"
    assert route_after_input_type(result) == "conversation"


@pytest.mark.asyncio
async def test_real_graph_question_reaches_conversation(monkeypatch):
    async def classifier(**kwargs):
        return SimpleNamespace(content='{"intent": "GENERAL_QUERY"}')
    async def answer(**kwargs):
        return SimpleNamespace(content="Manufactured on 15 January 2026.")
    monkeypatch.setattr(intent_detection, "invoke_llm_with_retry", classifier)
    monkeypatch.setattr(conversation, "invoke_llm_with_retry", answer)
    draft = {"manufacturing_date": "2026-01-15"}
    result = await build_graph().ainvoke({"session_id": "query-test", "user_message": "manufacture date?", "complaint": draft, "status": "processing"}, config={"configurable": {"thread_id": "query-test"}})
    assert result["assistant_message"] == "Manufactured on 15 January 2026."
    assert result["complaint"] == draft
    assert result["status"] == "success"
