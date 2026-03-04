#!/bin/bash
# Railway start script

echo "Installing dependencies..."
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

echo "Running database migrations..."
python -c "from app import app, db; app.app_context().push(); db.create_all()" 2>/dev/null || echo "DB may already exist"

echo "Starting server..."
gunicorn app:app --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 4 --timeout 60
