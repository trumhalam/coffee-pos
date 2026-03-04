import sqlite3
conn = sqlite3.connect('coffee_pos.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
print('Tables:', [r[0] for r in cursor.fetchall()])
cursor.execute("PRAGMA table_info(shop)")
print('Shop cols:', [c[1] for c in cursor.fetchall()])
conn.close()
