#!/bin/bash
# Railway start script

# Install dependencies
pip install -r requirements.txt

# Run migrations if needed
python -c "from app import app, db; app.app_context().push(); db.create_all()" 2>/dev/null || true

# Start the application with gunicorn
gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 60
