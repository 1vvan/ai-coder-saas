"""FastAPI app exposing the AI chat that fills in a Mutual NDA (PL-4)."""

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

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from .chat import run_chat  # noqa: E402
from .db import init_db, record_login  # noqa: E402
from .documents import get_document_type, registry_as_api  # noqa: E402
from .models import AiChatResult, ChatRequest, LoginRequest, LoginResponse  # noqa: E402
from .terms import parse_terms  # noqa: E402

logger = logging.getLogger("prelegal")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Fresh temporary database on every startup (PL-3 foundation).
    init_db()
    yield


app = FastAPI(title="Prelegal API", lifespan=lifespan)

# The frontend runs on next dev (localhost, any port during development).
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/login", response_model=LoginResponse)
def login(req: LoginRequest) -> LoginResponse:
    # Fake login: no authentication yet (PL-3). Any non-empty email lets the
    # user in; the password is intentionally ignored and never stored.
    email = req.email.strip()
    if not email:
        raise HTTPException(status_code=422, detail="Email is required.")
    record_login(email)
    return LoginResponse(ok=True, email=email)


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
