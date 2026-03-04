"""
Chay app: python run.py
"""
from app import app, db

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("="*50)
        print("Coffee POS System - Full Version")
        print("="*50)
        print("Mo trinh duyet tai: http://localhost:5000")
        print("="*50)
    app.run(debug=True, host='0.0.0.0', port=5000)
