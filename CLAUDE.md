# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation supports all 11 document types via AI chat with full user authentication and document persistence.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
Consider statically building the frontend and serving it via FastAPI, if that will work.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status

The V1 product is complete — all planned Jira stories (PL-1 → PL-6) are delivered and merged to `main`.

### Delivered
- **PL-1 — Template dataset:** 11 Common Paper legal templates in `templates/` (CC BY 4.0), indexed by `catalog.json`.
- **PL-2 — Mutual NDA prototype:** initial form-based NDA creator (superseded by the AI chat).
- **PL-3 — V1 foundation:** FastAPI backend, Next.js frontend, throwaway SQLite DB, and start/stop scripts for Mac/Linux/Windows.
- **PL-4 — AI chat:** freeform chat that drives document drafting via the LLM instead of a fixed form.
- **PL-5 — All document types:** the chat supports all 11 types, detects the wanted type, and offers the closest match when an unsupported document is requested.
- **PL-6 — Multiple users & final polish:** real accounts, per-user saved documents, professional SaaS styling, and a draft/legal-review disclaimer.

### Architecture
- **Backend** (`backend/`, uv + FastAPI, Python 3.14):
  - `main.py` — routes and the `Bearer`-token auth dependency.
  - `db.py` — throwaway SQLite recreated on every startup; `users` (salted PBKDF2-HMAC-SHA256 hashes), `sessions` (opaque tokens), and `documents` tables.
  - `documents.py` — registry of the 11 document types (fields, party roles) — single source of truth for the chat, forms, and previews.
  - `chat.py` — LiteLLM → OpenRouter `openai/gpt-oss-120b` (Cerebras provider) with Structured Outputs.
  - `terms.py` — parses each template's verbatim Standard Terms (never LLM-generated).
- **Frontend** (`frontend/`, Next.js 16 + React 19 + Tailwind v4), statically exported (`output: "export"`) and served by FastAPI from the same origin in the container.
- **Packaging:** multi-stage `Dockerfile` builds the static frontend, then runs the FastAPI backend serving both `/api/*` and the static files on port 8000.

### API endpoints
- Auth: `POST /api/signup`, `POST /api/login`, `POST /api/logout`, `GET /api/me`
- Document catalog: `GET /api/documents`, `GET /api/documents/{slug}/terms`
- Saved drafts (auth): `GET/POST /api/drafts`, `GET/DELETE /api/drafts/{id}`
- Chat: `POST /api/chat` · Health: `GET /api/health`

### Running & tests
- Start: `bash scripts/start-mac.sh` (builds the image, runs the container) → http://localhost:8000 · Stop: `bash scripts/stop-mac.sh`.
- Backend tests: `cd backend && uv run --frozen pytest` (auth, sessions, per-user draft isolation, chat, document registry).
- Frontend: `cd frontend && npm run build && npm run lint`.

### Known constraints (by design)
- The SQLite database is intentionally temporary and is wiped on every container restart, so accounts and saved documents do not persist across restarts.
- Generated documents are drafts only and are labeled as subject to legal review.
