"""FastAPI app for the Prelegal V1 foundation (PL-3).

This is the technical foundation only: a backend that serves the statically
built frontend, a temporary SQLite database recreated on every startup, and a
*fake* login that brings the user into the platform without any authentication.
Product features (the NDA creator) are unchanged from the prototype.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import db
from .models import LoginRequest, User


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Fresh, empty database on every boot.
    db.init_db()
    yield


app = FastAPI(title="Prelegal API", lifespan=lifespan)

# During development the frontend runs on `next dev` (localhost, any port).
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/login", response_model=User)
def login(req: LoginRequest) -> User:
    """Fake login: record the visitor and let them in — no password, no auth."""
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="A name is required.")
    email = req.email.strip() if req.email else None
    row = db.create_user(name, email or None)
    return User(**row)


# Serve the statically-exported frontend from the same origin, when present
# (set in the Docker image). Mounted last so the /api/* routes above take
# precedence. In local dev the frontend is served by `next dev` instead.
_static_dir = os.environ.get("PRELEGAL_STATIC_DIR")
if _static_dir and Path(_static_dir).is_dir():
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
