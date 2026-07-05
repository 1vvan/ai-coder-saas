# Prelegal backend

FastAPI service powering the AI chat that fills in a Mutual NDA (PL-4).

The chat endpoint talks to `openrouter/openai/gpt-oss-120b` via LiteLLM with
Cerebras pinned as the inference provider, using Structured Outputs so each
turn returns both a conversational reply and the NDA fields extracted so far.

## Setup

Requires [uv](https://docs.astral.sh/uv/) and a repo-root `.env` containing:

```
OPENROUTER_API_KEY=sk-or-...
```

Install dependencies:

```bash
uv sync
```

## Run

```bash
uv run uvicorn app.main:app --reload --port 8000
```

The frontend (`next dev`) calls it at `http://localhost:8000` by default;
override with `NEXT_PUBLIC_API_BASE` in the frontend if needed.

## Test

```bash
uv run pytest
```

Tests mock the LLM, so they run without a key or network.

## API

- `GET /api/health` — health check.
- `POST /api/chat` — body `{ messages: [{role, content}], currentFields: {...} }`;
  returns `{ reply, fields, complete }`. `fields` is a partial set of Mutual NDA
  cover-page values (camelCase, matching the frontend's `NdaFormData`).
