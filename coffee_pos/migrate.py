"""
Database migration script
Run: python migrate.py
"""
from app import app, db
from sqlalchemy import text

with app.app_context():
    # Check if 'note' column exists in Order table
    try:
        db.session.execute(text("SELECT note FROM 'order' LIMIT 1"))
        print("Column 'note' already exists")
    except Exception as e:
        print("Adding 'note' column to Order table...")
        db.session.execute(text("ALTER TABLE 'order' ADD COLUMN note VARCHAR(500) DEFAULT ''"))
        db.session.commit()
        print("Done!")
    
    # Check other potential missing columns
    try:
        db.session.execute(text("SELECT address FROM shop LIMIT 1"))
        print("Column 'address' already exists")
    except:
        print("Adding 'address' column to Shop table...")
        db.session.execute(text("ALTER TABLE shop ADD COLUMN address VARCHAR(200) DEFAULT ''"))
        db.session.commit()
        print("Done!")
    
    try:
        db.session.execute(text("SELECT phone FROM shop LIMIT 1"))
        print("Column 'phone' already exists")
    except:
        print("Adding 'phone' column to Shop table...")
        db.session.execute(text("ALTER TABLE shop ADD COLUMN phone VARCHAR(20) DEFAULT ''"))
        db.session.commit()
        print("Done!")
    
    print("\nMigration completed!")
