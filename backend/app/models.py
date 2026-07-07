"""Pydantic models for the AI chat and auth (PL-4/PL-5).

The chat is document-type-agnostic: the AI detects which supported document the
user wants, extracts that type's fields as generic key/value pairs (the field
keys are defined per type in documents.py), and collects the signature parties.
Field names are snake_case in Python and camelCase in JSON via an alias.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class FieldValue(CamelModel):
    key: str
    value: str


class PartyInfo(CamelModel):
    role: Optional[str] = None
    print_name: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    notice_address: Optional[str] = None


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(CamelModel):
    messages: list[ChatMessage]
    document_type: Optional[str] = None
    fields: list[FieldValue] = []
    parties: list[PartyInfo] = []


class AiChatResult(CamelModel):
    """Structured output the LLM returns, and the /api/chat response shape."""

    reply: str
    document_type: Optional[str] = None
    unsupported: bool = False
    suggested_type: Optional[str] = None
    fields: list[FieldValue] = []
    parties: list[PartyInfo] = []
    complete: bool = False


class LoginRequest(CamelModel):
    email: str
    password: str


class SignupRequest(CamelModel):
    email: str
    password: str


class AuthResponse(CamelModel):
    """Returned by /api/signup and /api/login: the session token and email."""

    token: str
    email: str


class SaveDocumentRequest(CamelModel):
    """Persist (create or update) a user's generated document."""

    id: Optional[int] = None
    document_type: str
    title: Optional[str] = None
    fields: list[FieldValue] = []
    parties: list[PartyInfo] = []
    complete: bool = False


class DocumentSummary(CamelModel):
    id: int
    doc_type: str
    title: str
    complete: bool
    created_at: str
    updated_at: str


class SavedDocument(DocumentSummary):
    fields: list[FieldValue] = []
    parties: list[PartyInfo] = []
