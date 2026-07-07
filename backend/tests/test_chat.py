"""Tests for the type-aware AI chat backend (PL-4/PL-5).

The LLM call is mocked, so these run without network or a key and exercise the
parts we own: message assembly, structured-output parsing, the camelCase
contract, and the routes.
"""

from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app import chat as chat_module
from app.main import app
from app.models import AiChatResult, ChatRequest

client = TestClient(app)


def test_result_uses_camelcase_json():
    result = AiChatResult(
        reply="hi", document_type="pilot-agreement", suggested_type="mutual-nda"
    )
    dumped = result.model_dump(by_alias=True)
    assert dumped["documentType"] == "pilot-agreement"
    assert dumped["suggestedType"] == "mutual-nda"


def test_request_accepts_camelcase_input():
    req = ChatRequest.model_validate(
        {
            "messages": [{"role": "user", "content": "hi"}],
            "documentType": "cloud-service-agreement",
            "fields": [{"key": "fees", "value": "$100/mo"}],
            "parties": [{"role": "Provider", "printName": "Jane"}],
        }
    )
    assert req.document_type == "cloud-service-agreement"
    assert req.fields[0].key == "fees"
    assert req.parties[0].print_name == "Jane"


def test_system_prompt_lists_all_types():
    # The catalog embedded in the prompt should mention every supported slug.
    assert "mutual-nda" in chat_module.SYSTEM_PROMPT
    assert "business-associate-agreement" in chat_module.SYSTEM_PROMPT
    assert "ai-addendum" in chat_module.SYSTEM_PROMPT


def test_build_messages_includes_state_and_history():
    req = ChatRequest.model_validate(
        {
            "messages": [{"role": "user", "content": "Let's start"}],
            "documentType": "service-level-agreement",
            "fields": [{"key": "targetUptime", "value": "99.9%"}],
        }
    )
    messages = chat_module.build_messages(req)
    assert messages[0]["role"] == "system"
    assert "service-level-agreement" in messages[0]["content"]
    assert "99.9%" in messages[0]["content"]
    assert messages[-1] == {"role": "user", "content": "Let's start"}


def _mock_completion(structured: dict):
    def _fake(*args, **kwargs):
        content = json.dumps(structured)

        class _Msg:
            def __init__(self, c):
                self.content = c

        class _Choice:
            def __init__(self, c):
                self.message = _Msg(c)

        class _Resp:
            def __init__(self, c):
                self.choices = [_Choice(c)]

        return _Resp(content)

    return _fake


def test_run_chat_parses_structured_output(monkeypatch):
    structured = {
        "reply": "What's the pilot period?",
        "documentType": "pilot-agreement",
        "fields": [{"key": "product", "value": "Acme Widget"}],
        "parties": [{"role": "Provider", "printName": "Jane", "company": "Acme"}],
        "complete": False,
    }
    monkeypatch.setattr(chat_module, "completion", _mock_completion(structured))
    req = ChatRequest.model_validate(
        {"messages": [{"role": "user", "content": "pilot"}]}
    )
    result = chat_module.run_chat(req)
    assert isinstance(result, AiChatResult)
    assert result.document_type == "pilot-agreement"
    assert result.fields[0].value == "Acme Widget"


def test_chat_endpoint_returns_camelcase(monkeypatch):
    structured = {
        "reply": "I can't do that, but a Cloud Service Agreement is closest.",
        "unsupported": True,
        "suggestedType": "cloud-service-agreement",
        "complete": False,
    }
    monkeypatch.setattr(chat_module, "completion", _mock_completion(structured))
    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "I need an employment contract"}]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["unsupported"] is True
    assert body["suggestedType"] == "cloud-service-agreement"


def test_chat_endpoint_handles_llm_error(monkeypatch):
    def _boom(*args, **kwargs):
        raise RuntimeError("LLM exploded")

    monkeypatch.setattr(chat_module, "completion", _boom)
    resp = client.post(
        "/api/chat", json={"messages": [{"role": "user", "content": "hi"}]}
    )
    assert resp.status_code == 502
    assert "unavailable" in resp.json()["detail"].lower()


def test_health_endpoint():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
