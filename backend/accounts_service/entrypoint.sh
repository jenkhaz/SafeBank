#!/bin/sh

echo "[AUTH] Starting container..."

# Run migrations/seed logic BEFORE starting Flask
python -m app.seed || true

echo "[AUTH] Seed complete. Starting Flask..."
exec "$@"
