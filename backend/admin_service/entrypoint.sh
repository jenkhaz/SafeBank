#!/bin/sh
set -e

# Wait a bit for auth service to be ready
sleep 3

# Run the Flask development server
exec flask run --host=0.0.0.0 --port=5000
