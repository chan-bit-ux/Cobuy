import sqlite3

conn = sqlite3.connect('database.db')
conn.row_factory = sqlite3.Row

# Check current state of ezon1
cur = conn.cursor()
cur.execute("SELECT * FROM users WHERE email='ezon1@test.com'")
user = dict(cur.fetchone())
print("Current user:", user)

# If they have no store, create one for them
if not user.get('store_id'):
    cur.execute(
        "INSERT INTO stores (name, owner_email) VALUES (?, ?)",
        ('Coffee Shop', 'ezon1@test.com')
    )
    store_id = cur.lastrowid
    cur.execute(
        "UPDATE users SET store_id=?, account_type='admin', status='active' WHERE email='ezon1@test.com'",
        (store_id,)
    )
    conn.commit()
    print(f"Created store_id={store_id} and assigned to ezon1@test.com")
else:
    print("User already has a store.")

conn.close()
