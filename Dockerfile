# syntax=docker/dockerfile:1

# ---- Stage 1: build the Next.js static export ----
FROM node:22-bookworm-slim AS frontend
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# Same origin inside the container: an empty base makes the client call
# relative /api/* URLs, which FastAPI serves alongside the static files.
ENV NEXT_PUBLIC_API_BASE=""
RUN npm run build

# ---- Stage 2: FastAPI backend that also serves the static frontend ----
FROM ghcr.io/astral-sh/uv:bookworm-slim AS runtime
WORKDIR /app/backend

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

# Install Python deps first for better layer caching. uv provisions the
# project's Python automatically from the lockfile.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

# Backend source
COPY backend/ ./

# Static frontend produced by stage 1
COPY --from=frontend /app/frontend/out /app/static
ENV PRELEGAL_STATIC_DIR=/app/static
# Temporary SQLite DB, recreated fresh on every container start.
ENV PRELEGAL_DB_PATH=/app/backend/prelegal.db

EXPOSE 8000
CMD ["uv", "run", "--frozen", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
