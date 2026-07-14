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
            user_email TEXT NULL REFERENCES users(email) ON DELETE CASCADE,
            file_hash TEXT NULL,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            transaction_count INTEGER,
            unique_items INTEGER
        )
    ''')
    
    # Check existing datasets columns for migrations
    cursor.execute("PRAGMA table_info(datasets)")
    ds_columns = [col[1] for col in cursor.fetchall()]
    if 'user_email' not in ds_columns:
        try:
            cursor.execute("ALTER TABLE datasets ADD COLUMN user_email TEXT REFERENCES users(email) ON DELETE CASCADE")
        except sqlite3.OperationalError:
            pass
    if 'file_hash' not in ds_columns:
        try:
            cursor.execute("ALTER TABLE datasets ADD COLUMN file_hash TEXT")
        except sqlite3.OperationalError:
            pass
    
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
            user_email TEXT NULL REFERENCES users(email) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
        )
    ''')
    
    # Check if dataset_id / user_email columns exist in transactions (for backward compatibility)
    cursor.execute("PRAGMA table_info(transactions)")
    tx_columns = [col[1] for col in cursor.fetchall()]
    if 'dataset_id' not in tx_columns:
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE")
        except sqlite3.OperationalError:
            pass
    if 'user_email' not in tx_columns:
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN user_email TEXT REFERENCES users(email) ON DELETE CASCADE")
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
    
    # Create performance indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_datasets_user ON datasets(user_email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_user_dataset ON transactions(user_email, dataset_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_transaction_items_tx ON transaction_items(transaction_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_transaction_items_item ON transaction_items(item)")
    
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

def get_transactions(user_email=None, dataset_id=None):
    conn = get_db_connection()
    query = '''
        SELECT t.id, ti.item 
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
    '''
    conditions = []
    params = []
    if user_email:
        conditions.append("(t.user_email = ? OR t.user_email IS NULL)")
        params.append(user_email)
    if dataset_id:
        conditions.append("t.dataset_id = ?")
        params.append(dataset_id)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY t.id"
    rows = conn.execute(query, params).fetchall()
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

def get_transactions_with_dates(user_email=None, dataset_id=None):
    conn = get_db_connection()
    query = '''
        SELECT t.id, t.created_at, ti.item 
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
    '''
    conditions = []
    params = []
    if user_email:
        conditions.append("(t.user_email = ? OR t.user_email IS NULL)")
        params.append(user_email)
    if dataset_id:
        conditions.append("t.dataset_id = ?")
        params.append(dataset_id)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY t.id"
    rows = conn.execute(query, params).fetchall()
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

def clear_transactions(user_email=None, dataset_id=None):
    conn = get_db_connection()
    query = 'DELETE FROM transactions'
    conditions = []
    params = []
    if user_email:
        conditions.append("user_email = ?")
        params.append(user_email)
    if dataset_id:
        conditions.append("dataset_id = ?")
        params.append(dataset_id)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    conn.execute(query, params)
    conn.commit()
    conn.close()

def add_transaction(items, user_email=None, dataset_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Sync products first
        unique_items = list(set(items))
        for item in unique_items:
            cursor.execute('INSERT OR IGNORE INTO products (name) VALUES (?)', (item,))
            
        cursor.execute('INSERT INTO transactions (dataset_id, user_email) VALUES (?, ?)', (dataset_id, user_email))
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

def add_transactions(list_of_items, dataset_id=None, user_email=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Sync all unique products
        all_items = [item for sublist in list_of_items for item in sublist]
        unique_items = list(set(all_items))
        for item in unique_items:
            cursor.execute('INSERT OR IGNORE INTO products (name) VALUES (?)', (item,))
            
        for items in list_of_items:
            cursor.execute('INSERT INTO transactions (dataset_id, user_email) VALUES (?, ?)', (dataset_id, user_email))
            tx_id = cursor.lastrowid
            items_data = [(tx_id, item) for item in items]
            cursor.executemany('INSERT INTO transaction_items (transaction_id, item) VALUES (?, ?)', items_data)
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_datasets(user_email=None):
    conn = get_db_connection()
    if user_email:
        rows = conn.execute('SELECT * FROM datasets WHERE user_email = ? ORDER BY upload_date DESC', (user_email,)).fetchall()
    else:
        rows = conn.execute('SELECT * FROM datasets ORDER BY upload_date DESC').fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_dataset_by_id(dataset_id, user_email=None):
    conn = get_db_connection()
    if user_email:
        row = conn.execute('SELECT * FROM datasets WHERE id = ? AND user_email = ?', (dataset_id, user_email)).fetchone()
    else:
        row = conn.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def add_dataset(name, transaction_count, unique_items, user_email=None, file_hash=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO datasets (name, user_email, file_hash, transaction_count, unique_items) VALUES (?, ?, ?, ?, ?)',
        (name, user_email, file_hash, transaction_count, unique_items)
    )
    ds_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return ds_id

def get_dataset_by_hash(file_hash, user_email=None):
    conn = get_db_connection()
    if user_email:
        row = conn.execute('SELECT * FROM datasets WHERE file_hash = ? AND user_email = ? ORDER BY upload_date DESC LIMIT 1', (file_hash, user_email)).fetchone()
    else:
        row = conn.execute('SELECT * FROM datasets WHERE file_hash = ? ORDER BY upload_date DESC LIMIT 1', (file_hash,)).fetchone()
    conn.close()
    return dict(row) if row else None

def cleanup_duplicate_datasets(user_email=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    # 1. Clean up duplicate file_hash entries
    query_hash = '''
        DELETE FROM datasets
        WHERE id NOT IN (
            SELECT MAX(id)
            FROM datasets
            WHERE file_hash IS NOT NULL
            GROUP BY user_email, file_hash
        ) AND file_hash IS NOT NULL
    '''
    if user_email:
        query_hash += ' AND user_email = ?'
        cursor.execute(query_hash, (user_email,))
    else:
        cursor.execute(query_hash)
        
    # 2. Clean up duplicate name + transaction_count entries (for files uploaded before file_hash was set)
    query_name = '''
        DELETE FROM datasets
        WHERE id NOT IN (
            SELECT MAX(id)
            FROM datasets
            GROUP BY user_email, name, transaction_count
        )
    '''
    if user_email:
        query_name += ' AND user_email = ?'
        cursor.execute(query_name, (user_email,))
    else:
        cursor.execute(query_name)
        
    conn.commit()
    conn.close()

def delete_dataset(dataset_id, user_email=None):
    conn = get_db_connection()
    if user_email:
        conn.execute('DELETE FROM datasets WHERE id = ? AND user_email = ?', (dataset_id, user_email))
    else:
        conn.execute('DELETE FROM datasets WHERE id = ?', (dataset_id,))
    conn.commit()
    conn.close()
    return True

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
