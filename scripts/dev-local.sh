#!/usr/bin/env bash
# Start local SETU-AUTH + SETU-VLE-service + Vite (contact API + frontend).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AUTH="$ROOT/setu_backend/SETU-AUTH"
VLE="$ROOT/setu_backend/SETU-VLE-service"
WEB="$ROOT/setu_website"

cleanup() {
  [[ -n "${AUTH_PID:-}" ]] && kill "$AUTH_PID" 2>/dev/null || true
  [[ -n "${VLE_PID:-}" ]] && kill "$VLE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting SETU-AUTH on :7005..."
(cd "$AUTH" && node server.js) &
AUTH_PID=$!

echo "Starting SETU-VLE-service on :7035..."
(cd "$VLE" && node server.js) &
VLE_PID=$!

for i in $(seq 1 30); do
  curl -sf http://localhost:7005/health >/dev/null 2>&1 && \
  curl -sf http://localhost:7035/health >/dev/null 2>&1 && break
  sleep 0.5
done

echo "Starting website (Vite + contact API)..."
cd "$WEB" && npm run dev:all
