# Prelegal backend (V1 foundation)

FastAPI backend for the Prelegal V1 foundation (PL-3). It serves the statically
built frontend, exposes a small API, and owns a temporary SQLite database that
is recreated on every startup.

## Endpoints

- `GET /api/health` — health check.
- `POST /api/login` — **fake login**. Takes `{ "name": "...", "email": "..." }`
  (email optional), records the visitor in the `users` table, and returns the
  user. No password, no authentication — it just brings the user into the
  platform. Real sign up / sign in is a later story.

## Database

SQLite at `PRELEGAL_DB_PATH` (defaults to `app/prelegal.db`). The file is
deleted and re-created from the schema on every startup, so each run — and each
container boot — starts empty.

## Develop

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

## Test

```bash
cd backend
uv run pytest
```
