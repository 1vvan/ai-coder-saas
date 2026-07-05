"""Pydantic request/response models for the foundation API (PL-3)."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base model whose JSON shape is camelCase but accepts either casing."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LoginRequest(CamelModel):
    # Fake login: a display name is all we ask for; email is optional.
    name: str
    email: Optional[str] = None


class User(CamelModel):
    id: int
    name: str
    email: Optional[str] = None
    created_at: str
