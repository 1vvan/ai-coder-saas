"""FastAPI app exposing the AI chat that fills in a Mutual NDA (PL-4)."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

# Load the repo-root .env (holds OPENROUTER_API_KEY) before importing anything
# that reads the environment. main.py lives at backend/app/main.py, so the repo
# root is two directories up.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

import logging  # noqa: E402

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from .chat import run_chat  # noqa: E402
from .models import ChatRequest, ChatResponse  # noqa: E402

logger = logging.getLogger("prelegal")

app = FastAPI(title="Prelegal API")

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


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    try:
        result = run_chat(req)
    except Exception as exc:  # noqa: BLE001 - surface a clean error to the client
        logger.exception("chat completion failed")
        raise HTTPException(
            status_code=502,
            detail=(
                "The AI service is unavailable. Check the server's "
                "OPENROUTER_API_KEY and try again."
            ),
        ) from exc
    return ChatResponse(reply=result.reply, fields=result.fields, complete=result.complete)
