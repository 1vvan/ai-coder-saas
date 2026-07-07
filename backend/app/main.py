"""FastAPI app: AI chat drafting, user accounts, and saved documents (PL-4→PL-6)."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

# Load the repo-root .env (holds OPENROUTER_API_KEY) before importing anything
# that reads the environment. main.py lives at backend/app/main.py, so the repo
# root is two directories up.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

import logging  # noqa: E402
import os  # noqa: E402
from contextlib import asynccontextmanager  # noqa: E402
from typing import Any  # noqa: E402

from fastapi import Depends, FastAPI, Header, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from . import db  # noqa: E402
from .chat import run_chat  # noqa: E402
from .documents import get_document_type, registry_as_api  # noqa: E402
from .models import (  # noqa: E402
    AiChatResult,
    AuthResponse,
    ChatRequest,
    DocumentSummary,
    LoginRequest,
    SavedDocument,
    SaveDocumentRequest,
    SignupRequest,
)
from .terms import parse_terms  # noqa: E402

logger = logging.getLogger("prelegal")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Fresh temporary database on every startup (PL-3 foundation).
    db.init_db()
    yield


app = FastAPI(title="Prelegal API", lifespan=lifespan)

# The frontend runs on next dev (localhost, any port during development).
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Auth -------------------------------------------------------------------


def current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """Resolve the signed-in user from a ``Bearer <token>`` Authorization header."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    token = authorization.split(" ", 1)[1].strip()
    user = db.user_for_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return user


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/signup", response_model=AuthResponse)
def signup(req: SignupRequest) -> AuthResponse:
    email = req.email.strip()
    if not email:
        raise HTTPException(status_code=422, detail="Email is required.")
    if len(req.password) < 6:
        raise HTTPException(
            status_code=422, detail="Password must be at least 6 characters."
        )
    try:
        user_id = db.create_user(email, req.password)
    except db.EmailTakenError:
        raise HTTPException(
            status_code=409, detail="An account with that email already exists."
        )
    token = db.create_session(user_id)
    return AuthResponse(token=token, email=email)


@app.post("/api/login", response_model=AuthResponse)
def login(req: LoginRequest) -> AuthResponse:
    email = req.email.strip()
    if not email:
        raise HTTPException(status_code=422, detail="Email is required.")
    user_id = db.verify_credentials(email, req.password)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = db.create_session(user_id)
    return AuthResponse(token=token, email=email)


@app.post("/api/logout")
def logout(authorization: str | None = Header(default=None)) -> dict[str, bool]:
    if authorization and authorization.lower().startswith("bearer "):
        db.delete_session(authorization.split(" ", 1)[1].strip())
    return {"ok": True}


@app.get("/api/me", response_model=AuthResponse)
def me(user: dict[str, Any] = Depends(current_user)) -> AuthResponse:
    # Echo the identity back; the client uses this to validate a stored token.
    return AuthResponse(token="", email=user["email"])


# --- Document types (catalog) ----------------------------------------------


@app.get("/api/documents")
def documents() -> dict:
    return {"documentTypes": registry_as_api()}


@app.get("/api/documents/{slug}/terms")
def document_terms(slug: str) -> dict:
    doc = get_document_type(slug)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Unknown document type: {slug}")
    return {
        "slug": doc.slug,
        "title": doc.title,
        "terms": [dict(block) for block in parse_terms(doc.template_file)],
    }


# --- Saved documents (per user) --------------------------------------------


def _to_saved_document(record: dict[str, Any]) -> SavedDocument:
    """Convert a db document record into the API SavedDocument shape."""
    fields = [{"key": k, "value": v} for k, v in record.get("fields", {}).items()]
    return SavedDocument.model_validate(
        {
            "id": record["id"],
            "docType": record["docType"],
            "title": record["title"],
            "complete": record["complete"],
            "createdAt": record["createdAt"],
            "updatedAt": record["updatedAt"],
            "fields": fields,
            "parties": record.get("parties", []),
        }
    )


def _default_title(req: SaveDocumentRequest) -> str:
    doc = get_document_type(req.document_type)
    base = doc.title if doc else req.document_type
    # Prefer a party company for a recognizable name, if we have one.
    for party in req.parties:
        if party.company:
            return f"{base} — {party.company}"
    return base


@app.get("/api/drafts", response_model=list[DocumentSummary])
def list_drafts(user: dict[str, Any] = Depends(current_user)) -> list[DocumentSummary]:
    return [DocumentSummary.model_validate(d) for d in db.list_documents(user["id"])]


@app.post("/api/drafts", response_model=SavedDocument)
def save_draft(
    req: SaveDocumentRequest, user: dict[str, Any] = Depends(current_user)
) -> SavedDocument:
    if get_document_type(req.document_type) is None:
        raise HTTPException(
            status_code=422, detail=f"Unknown document type: {req.document_type}"
        )
    title = (req.title or "").strip() or _default_title(req)
    fields = {f.key: f.value for f in req.fields}
    parties = [p.model_dump(by_alias=True, exclude_none=True) for p in req.parties]
    record = db.save_document(
        user_id=user["id"],
        doc_type=req.document_type,
        title=title,
        fields=fields,
        parties=parties,
        complete=req.complete,
        document_id=req.id,
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _to_saved_document(record)


@app.get("/api/drafts/{document_id}", response_model=SavedDocument)
def get_draft(
    document_id: int, user: dict[str, Any] = Depends(current_user)
) -> SavedDocument:
    record = db.get_document(user["id"], document_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _to_saved_document(record)


@app.delete("/api/drafts/{document_id}")
def delete_draft(
    document_id: int, user: dict[str, Any] = Depends(current_user)
) -> dict[str, bool]:
    if not db.delete_document(user["id"], document_id):
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"ok": True}


# --- AI chat ----------------------------------------------------------------


@app.post("/api/chat", response_model=AiChatResult)
def chat(req: ChatRequest) -> AiChatResult:
    try:
        return run_chat(req)
    except Exception as exc:  # noqa: BLE001 - surface a clean error to the client
        logger.exception("chat completion failed")
        raise HTTPException(
            status_code=502,
            detail=(
                "The AI service is unavailable. Check the server's "
                "OPENROUTER_API_KEY and try again."
            ),
        ) from exc


# Serve the statically-exported frontend from the same origin, when present
# (set in the Docker image). Mounted last so the /api/* routes above take
# precedence. In local dev the frontend is served by `next dev` instead.
_static_dir = os.environ.get("PRELEGAL_STATIC_DIR")
if _static_dir and Path(_static_dir).is_dir():
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
