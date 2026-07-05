"""Pydantic models for the AI chat that fills in a Mutual NDA (PL-4).

Field names mirror the frontend `NdaFormData` (see frontend/src/lib/nda.ts).
Python attributes are snake_case; the JSON representation is camelCase via an
alias generator, so requests/responses and the LLM's structured output all
speak the same camelCase shape the frontend uses.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base model whose JSON shape is camelCase but accepts either casing."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Party(CamelModel):
    print_name: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    notice_address: Optional[str] = None


class NdaFields(CamelModel):
    """The user-editable Mutual NDA cover-page fields.

    Every field is optional: the chat fills them in incrementally, and any
    field the AI has not yet learned stays ``None`` so the frontend can leave
    the existing value untouched.
    """

    purpose: Optional[str] = None
    effective_date: Optional[str] = None  # ISO yyyy-mm-dd
    nda_term_kind: Optional[Literal["expires", "untilTerminated"]] = None
    nda_term_years: Optional[int] = None
    confidentiality_kind: Optional[Literal["years", "perpetuity"]] = None
    confidentiality_years: Optional[int] = None
    governing_law: Optional[str] = None
    jurisdiction: Optional[str] = None
    modifications: Optional[str] = None
    party1: Optional[Party] = None
    party2: Optional[Party] = None


class AiChatResult(CamelModel):
    """Structured output the LLM must return on every turn."""

    reply: str
    fields: NdaFields
    complete: bool


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(CamelModel):
    messages: list[ChatMessage]
    current_fields: NdaFields


class ChatResponse(CamelModel):
    reply: str
    fields: NdaFields
    complete: bool


class LoginRequest(CamelModel):
    email: str
    password: str


class LoginResponse(CamelModel):
    ok: bool
    email: str
