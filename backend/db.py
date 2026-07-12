import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys support in SQLite
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL
        )
    ''')
    
    # Create datasets table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS datasets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            transaction_count INTEGER,
            unique_items INTEGER
        )
    ''')
    
    # Create products table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            category TEXT DEFAULT 'Uncategorized',
            price REAL DEFAULT 0.0,
            stock INTEGER DEFAULT 0
        )
    ''')
    
    # Create transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset_id INTEGER NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
        )
    ''')
    
    # Check if dataset_id column exists (for backward compatibility if database exists without it)
    cursor.execute("PRAGMA table_info(transactions)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'dataset_id' not in columns:
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE")
        except sqlite3.OperationalError:
            pass
            
    # Create transaction_items table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transaction_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER NOT NULL,
            item TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE
        )
    ''')
    
    # Seed default admin user if not exists
    cursor.execute('SELECT * FROM users WHERE email = ?', ('admin@ruleminer.ai',))
    if not cursor.fetchone():
        cursor.execute(
            'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
            ('admin@ruleminer.ai', 'password123', 'Admin User', 'Lead Data Scientist')
        )
        
    conn.commit()
    conn.close()

def get_user(email):
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    if user:
        return dict(user)
    return None

def create_user(email, password, name, role):
    conn = get_db_connection()
    success = False
    try:
        conn.execute(
            'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
            (email, password, name, role)
        )
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    finally:
        conn.close()
    return success

def get_transactions():
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT t.id, ti.item 
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        ORDER BY t.id
    ''').fetchall()
    conn.close()
    
    if not rows:
        return None
        
    transactions_map = {}
    for row in rows:
        tx_id = row['id']
        item = row['item']
        if tx_id not in transactions_map:
            transactions_map[tx_id] = []
        transactions_map[tx_id].append(item)
        
    sorted_keys = sorted(transactions_map.keys())
    return [transactions_map[k] for k in sorted_keys]

def get_transactions_with_dates():
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT t.id, t.created_at, ti.item 
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        ORDER BY t.id
    ''').fetchall()
    conn.close()
    
    if not rows:
        return []
        
    transactions_map = {}
    for row in rows:
        tx_id = row['id']
        created_at = row['created_at']
        item = row['item']
        if tx_id not in transactions_map:
            transactions_map[tx_id] = {'date': created_at, 'items': []}
        transactions_map[tx_id]['items'].append(item)
        
    sorted_keys = sorted(transactions_map.keys())
    return [transactions_map[k] for k in sorted_keys]

def clear_transactions():
    conn = get_db_connection()
    conn.execute('DELETE FROM transactions')
    conn.commit()
    conn.close()

def add_transaction(items):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Sync products first
        unique_items = list(set(items))
        for item in unique_items:
            cursor.execute('INSERT OR IGNORE INTO products (name) VALUES (?)', (item,))
            
        cursor.execute('INSERT INTO transactions (dataset_id) VALUES (NULL)')
        tx_id = cursor.lastrowid
        
        items_data = [(tx_id, item) for item in items]
        cursor.executemany('INSERT INTO transaction_items (transaction_id, item) VALUES (?, ?)', items_data)
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
    return tx_id

def add_transactions(list_of_items, dataset_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Sync all unique products
        all_items = [item for sublist in list_of_items for item in sublist]
        unique_items = list(set(all_items))
        for item in unique_items:
            cursor.execute('INSERT OR IGNORE INTO products (name) VALUES (?)', (item,))
            
        for items in list_of_items:
            cursor.execute('INSERT INTO transactions (dataset_id) VALUES (?)', (dataset_id,))
            tx_id = cursor.lastrowid
            items_data = [(tx_id, item) for item in items]
            cursor.executemany('INSERT INTO transaction_items (transaction_id, item) VALUES (?, ?)', items_data)
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_datasets():
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM datasets ORDER BY upload_date DESC').fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_dataset(name, transaction_count, unique_items):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO datasets (name, transaction_count, unique_items) VALUES (?, ?, ?)',
        (name, transaction_count, unique_items)
    )
    ds_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return ds_id

def get_products():
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM products ORDER BY name').fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_product(product_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
    conn.commit()
    conn.close()
    return True

def add_product(name, category='Uncategorized', price=0.0, stock=0):
    conn = get_db_connection()
    cursor = conn.cursor()
    success = False
    try:
        cursor.execute(
            'INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)',
            (name, category, price, stock)
        )
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    finally:
        conn.close()
    return success
