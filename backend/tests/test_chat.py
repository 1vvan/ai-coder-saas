"""Tests for the AI chat backend.

The LLM call itself is mocked, so these run without network or an API key and
exercise the parts we own: message assembly, structured-output parsing, the
camelCase JSON contract with the frontend, and the /api/chat route.
"""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app import chat as chat_module
from app.main import app
from app.models import AiChatResult, ChatRequest, NdaFields

client = TestClient(app)


def test_nda_fields_uses_camelcase_json():
    fields = NdaFields(effective_date="2026-07-05", nda_term_kind="expires")
    dumped = fields.model_dump(by_alias=True, exclude_none=True)
    assert dumped == {"effectiveDate": "2026-07-05", "ndaTermKind": "expires"}


def test_nda_fields_accepts_camelcase_input():
    fields = NdaFields.model_validate(
        {"governingLaw": "Delaware", "party1": {"printName": "Jane Doe"}}
    )
    assert fields.governing_law == "Delaware"
    assert fields.party1 is not None and fields.party1.print_name == "Jane Doe"


def test_build_messages_includes_known_values_and_history():
    req = ChatRequest.model_validate(
        {
            "messages": [{"role": "user", "content": "Let's start"}],
            "currentFields": {"governingLaw": "Delaware"},
        }
    )
    messages = chat_module.build_messages(req)
    assert messages[0]["role"] == "system"
    assert "Delaware" in messages[0]["content"]
    assert messages[-1] == {"role": "user", "content": "Let's start"}


def test_build_messages_omits_context_when_no_known_values():
    req = ChatRequest.model_validate(
        {"messages": [{"role": "user", "content": "hi"}], "currentFields": {}}
    )
    system = chat_module.build_messages(req)[0]["content"]
    assert "Values already captured" not in system


def _mock_completion(structured: dict):
    """Return a fake litellm.completion that yields the given structured JSON."""

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
        "reply": "Great, what's the purpose?",
        "fields": {"governingLaw": "Delaware"},
        "complete": False,
    }
    monkeypatch.setattr(chat_module, "completion", _mock_completion(structured))
    req = ChatRequest.model_validate(
        {"messages": [{"role": "user", "content": "hi"}], "currentFields": {}}
    )
    result = chat_module.run_chat(req)
    assert isinstance(result, AiChatResult)
    assert result.fields.governing_law == "Delaware"
    assert result.complete is False


def test_chat_endpoint_returns_camelcase(monkeypatch):
    structured = {
        "reply": "All set!",
        "fields": {
            "effectiveDate": "2026-07-05",
            "party1": {"printName": "Jane Doe", "company": "Acme"},
        },
        "complete": True,
    }
    monkeypatch.setattr(chat_module, "completion", _mock_completion(structured))
    resp = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Acme, effective today"}],
            "currentFields": {"purpose": "Evaluate a deal"},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"] == "All set!"
    assert body["complete"] is True
    assert body["fields"]["effectiveDate"] == "2026-07-05"
    assert body["fields"]["party1"]["printName"] == "Jane Doe"


def test_chat_endpoint_handles_llm_error(monkeypatch):
    def _boom(*args, **kwargs):
        raise RuntimeError("LLM exploded")

    monkeypatch.setattr(chat_module, "completion", _boom)
    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "hi"}], "currentFields": {}},
    )
    assert resp.status_code == 502
    assert "unavailable" in resp.json()["detail"].lower()


def test_health_endpoint():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
