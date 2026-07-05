# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current branch (PL-3) establishes the V1 technical foundation: a FastAPI backend, a temporary SQLite database, a statically-served Next.js frontend, container packaging, and a fake login. Product features (AI chat, real auth, all 11 document types) are built on top of this foundation in later stories.

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

### Completed (PL-3) — V1 foundation
- Docker multi-stage build (Node builds the Next.js static export; Python/uv runs FastAPI and serves it)
- FastAPI backend in `backend/` (uv project), available at http://localhost:8000
- Temporary SQLite database recreated from scratch on every startup, with a `users` table (seat for real sign up / sign in later)
- Next.js static export served by FastAPI from the same origin
- Fake login screen — no authentication yet; the user enters a name and is brought into the platform (recorded via `POST /api/login`)
- Existing Mutual NDA form prototype with live preview and PDF download (product features unchanged)
- Start/stop scripts for Mac, Linux, Windows (no API key required)
- Backend unit/integration tests (health, fake login, fresh-DB-per-startup)

### Current API Endpoints
- `GET /api/health` - Health check
- `POST /api/login` - Fake login: records `{ name, email? }` in the `users` table and returns the user (no password, no auth)