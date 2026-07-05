#!/usr/bin/env bash
# Build and start Prelegal in a Docker container (macOS).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Building prelegal image…"
docker build -t prelegal:latest .

echo "Starting container…"
docker rm -f prelegal >/dev/null 2>&1 || true
docker run -d --name prelegal -p 8000:8000 prelegal:latest

echo "Prelegal is running at http://localhost:8000"
