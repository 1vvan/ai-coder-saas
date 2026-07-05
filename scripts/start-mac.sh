#!/usr/bin/env bash
# Build and start Prelegal in a Docker container (macOS).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Error: .env not found in $ROOT (needs OPENROUTER_API_KEY)." >&2
  echo "Create it from .env.example and add your key." >&2
  exit 1
fi

echo "Building prelegal image…"
docker build -t prelegal:latest .

echo "Starting container…"
docker rm -f prelegal >/dev/null 2>&1 || true
docker run -d --name prelegal --env-file .env -p 8000:8000 prelegal:latest

echo "Prelegal is running at http://localhost:8000"
