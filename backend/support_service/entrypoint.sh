#!/bin/bash
set -e

echo "Waiting for database to be ready..."
sleep 5

echo "Initializing database..."
python -m app.seed

echo "Starting Support Service..."
exec python -m flask run --host=0.0.0.0 --port=5004
