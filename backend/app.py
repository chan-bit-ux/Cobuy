from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import time
import os
import json
import math
import tracemalloc
import hashlib
from mlxtend.frequent_patterns import apriori, fpgrowth, association_rules
from mlxtend.preprocessing import TransactionEncoder

import db

app = Flask(__name__)
CORS(app)

# Initialize database tables
db.init_db()

def get_current_user_email():
    email = request.headers.get('X-User-Email')
    if email:
        return email.strip().lower()
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer mock-jwt-token-'):
        return auth.replace('Bearer mock-jwt-token-', '').strip().lower()
    email = request.args.get('user_email') or request.form.get('user_email')
    if email:
        return email.strip().lower()
    return None

# Storage for runtime/transient results
data_store = {
    'last_rules': None
}

def parse_df_to_transactions(df):
    initial_rows = len(df)
    
    if len(df.columns) == 0:
        return [], 0, 0
        
    if len(df.columns) < 2:
        col_name = df.columns[0]
        missing_removed = int(df[col_name].isna().sum())
        
        raw_rows = df[col_name].dropna().astype(str).str.strip().tolist()
        transactions = []
        for row in raw_rows:
            if not row or row.lower() == 'nan':
                continue
            items = [item.strip() for item in row.split(',') if item.strip()]
            unique_items = []
            for item in items:
                if item not in unique_items:
                    unique_items.append(item)
            if unique_items:
                transactions.append(unique_items)
        return transactions, 0, missing_removed

    # 3. Multi-column file: Identify columns dynamically
    col_id = None
    col_item = None
    col_qty = None
    
    # Identify Transaction ID column
    id_keywords = ['id', 'trans', 'order', 'receipt', 'invoice', 'bill', 'no', 'number']
    for col in df.columns:
        col_lower = str(col).lower()
        if any(kw in col_lower for kw in id_keywords):
            col_id = col
            break
    if col_id is None:
        col_id = df.columns[0]
        
    # Identify Item/Product column
    item_keywords = ['item', 'product', 'desc', 'purchase', 'name', 'article', 'goods']
    for col in df.columns:
        if col == col_id:
            continue
        col_lower = str(col).lower()
        if any(kw in col_lower for kw in item_keywords) and 'id' not in col_lower:
            col_item = col
            break
            
    # Check for comma-separated column if not found by keywords
    if col_item is None:
        for col in df.columns:
            if col == col_id:
                continue
            sample_vals = df[col].dropna().head(10).astype(str)
            if any(',' in val for val in sample_vals):
                col_item = col
                break
                
    if col_item is None:
        col_item = df.columns[1] if len(df.columns) > 1 else df.columns[0]
        
    # Identify Quantity column
    qty_keywords = ['qty', 'quantity', 'count', 'vol', 'volume', 'amount_sold']
    for col in df.columns:
        col_lower = str(col).lower()
        if any(kw in col_lower for kw in qty_keywords):
            col_qty = col
            break

    # Clean exact row duplicates first
    df = df.drop_duplicates()
    duplicates_removed = initial_rows - len(df)

    # Count missing values in the key columns
    missing_removed = int(df[[col_id, col_item]].isna().any(axis=1).sum())
    
    # Filter out missing key values
    df_clean = df.dropna(subset=[col_id, col_item])
    
    # Parse rows
    tx_map = {}
    
    for _, row in df_clean.iterrows():
        tx_val = row[col_id]
        item_val = row[col_item]
        
        tx_id = str(tx_val).strip()
        item_str = str(item_val).strip()
        if not tx_id or not item_str or item_str.lower() == 'nan':
            continue
            
        # Extract quantity if column exists
        qty_val = 1
        if col_qty is not None:
            try:
                qty_raw = row[col_qty]
                if not pd.isna(qty_raw):
                    qty_val = int(float(qty_raw))
                    if qty_val < 1:
                        qty_val = 1
            except (ValueError, TypeError):
                qty_val = 1
                
        row_items = [i.strip() for i in item_str.split(',') if i.strip()]
        
        if tx_id not in tx_map:
            tx_map[tx_id] = []
            
        for item in row_items:
            for _ in range(qty_val):
                tx_map[tx_id].append(item)
                
    transactions = [tx for tx in tx_map.values() if tx]
    return transactions, duplicates_removed, missing_removed


@app.route('/')
def index():
    return jsonify({
        'status': 'healthy',
        'message': 'Shopping Pattern Finder Backend API is running'
    })

@app.route('/api/login', methods=['POST'])
def login():
    params = request.json or {}
    email = params.get('email', '').strip().lower()
    password = params.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user_info = db.get_user(email)
    if not user_info or user_info['password'] != password:
        return jsonify({'error': 'Invalid email or password'}), 401

    return jsonify({
        'token': f'mock-jwt-token-{email}',
        'user': {
            'email': email,
            'name': user_info['name'],
            'role': user_info['role']
        }
    })

@app.route('/api/register', methods=['POST'])
def register():
    params = request.json or {}
    email = params.get('email', '').strip().lower()
    password = params.get('password', '')
    name = params.get('name', '').strip()
    role = params.get('role', 'Data Analyst').strip()

    if not email or not password or not name:
        return jsonify({'error': 'Email, password, and name are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400

    success = db.create_user(email, password, name, role)
    if not success:
        return jsonify({'error': 'Email is already registered'}), 409

    return jsonify({
        'message': 'Registration successful',
        'token': f'mock-jwt-token-{email}',
        'user': {
            'email': email,
            'name': name,
            'role': role
        }
    }), 201

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        user_email = get_current_user_email()
        file_content = file.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
        file.seek(0)

        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file)
        else:
            return jsonify({'error': 'Invalid file format'}), 400

        # Preprocessing & Data Cleaning
        transactions, duplicates_removed, missing_removed = parse_df_to_transactions(df)

        if not transactions:
            return jsonify({'error': 'No valid transactions found in the uploaded file. Please make sure the format is correct.'}), 400

        total_tx = len(transactions)
        unique_items_count = len(set([item for sublist in transactions for item in sublist]))

        existing_ds = db.get_dataset_by_hash(file_hash, user_email=user_email)
        if existing_ds:
            ds_id = existing_ds['id']
            db.clear_transactions(user_email=user_email)
            db.add_transactions(transactions, dataset_id=ds_id, user_email=user_email)
            return jsonify({
                'duplicate_detected': True,
                'message': f'This file ("{existing_ds["name"]}") was already uploaded on {existing_ds.get("upload_date", "")}. Reusing existing dataset from your File History.',
                'transaction_count': total_tx,
                'unique_items': unique_items_count,
                'dataset_id': ds_id,
                'cleaning_stats': {
                    'missing_values_removed': missing_removed,
                    'duplicate_items_removed': duplicates_removed
                }
            })

        # Save dataset metadata scoped to current user with SHA-256 hash
        ds_id = db.add_dataset(file.filename, total_tx, unique_items_count, user_email=user_email, file_hash=file_hash)
        
        # Clear previous transaction data for this user and store new transactions
        db.clear_transactions(user_email=user_email)
        db.add_transactions(transactions, dataset_id=ds_id, user_email=user_email)
        
        return jsonify({
            'message': 'File cleaned and processed successfully',
            'transaction_count': total_tx,
            'unique_items': unique_items_count,
            'dataset_id': ds_id,
            'cleaning_stats': {
                'missing_values_removed': missing_removed,
                'duplicate_items_removed': duplicates_removed
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mine', methods=['POST'])
def mine_rules():
    params = request.json or {}
    try:
        min_support = float(params.get('min_support', 0.05))
    except (TypeError, ValueError):
        min_support = 0.05

    try:
        min_confidence = float(params.get('min_confidence', 0.5))
    except (TypeError, ValueError):
        min_confidence = 0.5

    try:
        min_lift = float(params.get('min_lift', 1.0))
    except (TypeError, ValueError):
        min_lift = 1.0

    algorithm = params.get('algorithm', 'auto') # 'auto', 'apriori', or 'fpgrowth'
    dataset_id = params.get('dataset_id') or request.args.get('dataset_id')

    transactions = db.get_transactions(user_email=get_current_user_email(), dataset_id=dataset_id)
    if not transactions:
        return jsonify({'error': 'No data uploaded or recorded yet'}), 400

    try:
        start_time = time.time()
        
        # Preprocessing for association rule mining
        te = TransactionEncoder()
        te_ary = te.fit(transactions).transform(transactions)
        df = pd.DataFrame(te_ary, columns=te.columns_)

        # Intelligent Auto-Selection Logic
        selected_algorithm = algorithm
        algorithm_note = algorithm
        
        if algorithm == 'auto':
            num_tx = len(transactions)
            all_items = [item for sublist in transactions for item in sublist]
            num_items = len(set(all_items))
            
            # If large dataset or very dense itemsets, use FP-Growth. Otherwise use Apriori.
            if num_tx >= 500 or num_items >= 50:
                selected_algorithm = 'fpgrowth'
                algorithm_note = 'FP-Growth (Auto-selected for large data)'
            else:
                selected_algorithm = 'apriori'
                algorithm_note = 'Apriori (Auto-selected for small data)'

        # Mining frequent itemsets
        if selected_algorithm == 'apriori':
            frequent_itemsets = apriori(df, min_support=min_support, use_colnames=True)
        else:
            frequent_itemsets = fpgrowth(df, min_support=min_support, use_colnames=True)

        if frequent_itemsets.empty:
            metrics = {
                'execution_time': time.time() - start_time,
                'rules_count': 0,
                'frequent_itemsets_count': 0,
                'algorithm': algorithm_note
            }
            return jsonify({
                'rules': [],
                'frequent_itemsets': [],
                'gaps': [],
                'metrics': metrics,
                'message': 'No common item combos found with these parameters'
            })

        rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
        
        # Filter by lift
        if not rules.empty:
            rules = rules[rules['lift'] >= min_lift]

        execution_time = time.time() - start_time
        
        # Format rules for JSON
        def clean_float(val, default=0.0):
            if pd.isna(val) or math.isnan(val):
                return default
            if math.isinf(val):
                return 999.0 if val > 0 else -999.0
            return float(val)

        formatted_rules = []
        if not rules.empty:
            for _, row in rules.iterrows():
                formatted_rules.append({
                    'antecedents': list(row['antecedents']),
                    'consequents': list(row['consequents']),
                    'support': clean_float(row['support']),
                    'confidence': clean_float(row['confidence']),
                    'lift': clean_float(row['lift']),
                    'leverage': clean_float(row['leverage']),
                    'conviction': clean_float(row['conviction'])
                })

        # Format frequent itemsets for JSON
        formatted_itemsets = []
        for _, row in frequent_itemsets.iterrows():
            formatted_itemsets.append({
                'items': list(row['itemsets']),
                'support': clean_float(row['support'])
            })

        # Gap Analysis / Missing Links Detector
        gaps = []
        item_supports = {}
        for _, row in frequent_itemsets.iterrows():
            items = list(row['itemsets'])
            if len(items) == 1:
                item_supports[items[0]] = row['support']
                
        sorted_items = sorted(item_supports.items(), key=lambda x: x[1], reverse=True)
        top_n_items = [item for item, sup in sorted_items[:10]]
        
        all_pairs = []
        for i in range(len(top_n_items)):
            for j in range(i + 1, len(top_n_items)):
                all_pairs.append((top_n_items[i], top_n_items[j]))
                
        associated_pairs = set()
        for r in formatted_rules:
            for ant in r['antecedents']:
                for cons in r['consequents']:
                    associated_pairs.add(frozenset([ant, cons]))
                    
        frequent_sets = [frozenset(row['itemsets']) for _, row in frequent_itemsets.iterrows()]
        
        for itemA, itemB in all_pairs:
            pair = frozenset([itemA, itemB])
            if pair not in frequent_sets and pair not in associated_pairs:
                supportA = item_supports.get(itemA, 0)
                supportB = item_supports.get(itemB, 0)
                gaps.append({
                    'item_a': itemA,
                    'item_b': itemB,
                    'support_a': clean_float(supportA),
                    'support_b': clean_float(supportB),
                    'reason': f"Both '{itemA}' ({(supportA*100):.1f}% support) and '{itemB}' ({(supportB*100):.1f}% support) are popular, but they are rarely or never purchased together."
                })

        data_store['last_rules'] = formatted_rules
        
        metrics = {
            'execution_time': execution_time,
            'rules_count': len(formatted_rules),
            'frequent_itemsets_count': len(frequent_itemsets),
            'algorithm': algorithm_note
        }

        return jsonify({
            'rules': formatted_rules,
            'frequent_itemsets': formatted_itemsets,
            'gaps': gaps,
            'metrics': metrics
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    dataset_id = request.args.get('dataset_id')
    transactions = db.get_transactions(user_email=get_current_user_email(), dataset_id=dataset_id)
    if transactions is None or len(transactions) == 0:
        return jsonify({
            'active': False,
            'total_transactions': 0,
            'unique_items_count': 0,
            'top_items': [],
            'all_items': [],
            'recommended_algorithm': 'None'
        })
    
    total_transactions = len(transactions)
    # Get unique items per transaction for basket counting
    basket_items = []
    for sublist in transactions:
        basket_items.extend(list(set(sublist)))
        
    if len(basket_items) == 0:
        return jsonify({
            'active': True,
            'total_transactions': total_transactions,
            'unique_items_count': 0,
            'top_items': [],
            'all_items': [],
            'recommended_algorithm': 'None'
        })
        
    item_counts = pd.Series(basket_items).value_counts().to_dict()
    
    formatted_all_items = [
        {
            'name': k, 
            'value': int(v), 
            'support': float(v) / total_transactions
        } 
        for k, v in item_counts.items()
    ]
    
    unique_items_count = len(item_counts)
    recommended = 'FP-Growth' if total_transactions >= 500 or unique_items_count >= 50 else 'Apriori'
    
    return jsonify({
        'active': True,
        'total_transactions': total_transactions,
        'unique_items_count': unique_items_count,
        'top_items': formatted_all_items[:10],
        'all_items': formatted_all_items,
        'recommended_algorithm': recommended
    })

@app.route('/api/add_transaction', methods=['POST'])
def add_transaction():
    params = request.json or {}
    items = params.get('items', [])
    if not items:
        return jsonify({'error': 'No items in transaction'}), 400
    
    # Strip whitespace, ignore empty items. Keep duplicates to accurately reflect quantity in frequency stats.
    cleaned_items = sorted([item.strip() for item in items if item.strip()])
    if not cleaned_items:
        return jsonify({'error': 'No valid items in transaction'}), 400
        
    db.add_transaction(cleaned_items)
    
    current_transactions = db.get_transactions() or []
    
    return jsonify({
        'message': 'Transaction added successfully',
        'total_transactions': len(current_transactions),
        'unique_items_count': len(set([item for sublist in current_transactions for item in sublist]))
    })

@app.route('/api/load_template', methods=['POST'])
def load_template():
    params = request.json or {}
    template_type = params.get('type')
    
    filename_map = {
        'convenience': 'convenience_store.csv',
        'pet': 'Pet_Shop_Transactions.csv',
        'coffee': 'coffee_shop.csv'
    }
    
    filename = filename_map.get(template_type)
    if not filename:
        return jsonify({'error': 'Invalid template type'}), 400
        
    try:
        # Check if the file is in the workspace root or parent
        filepath = os.path.join(os.getcwd(), filename)
        if not os.path.exists(filepath):
            # Try one level up if running from backend/
            filepath = os.path.join(os.path.dirname(os.getcwd()), filename)
            
        if not os.path.exists(filepath):
            # Try parent directory relative to cwd
            filepath = os.path.join(os.getcwd(), "..", filename)
            
        if not os.path.exists(filepath):
            return jsonify({'error': f'Template file {filename} not found'}), 404
            
        df = pd.read_csv(filepath)
        
        transactions, _, _ = parse_df_to_transactions(df)

            
        user_email = get_current_user_email()
        db.clear_transactions(user_email=user_email)
        # Compute unique items count
        unique_items_count = len(set([item for sublist in transactions for item in sublist]))
        total_tx = len(transactions)
        ds_id = db.add_dataset(filename, total_tx, unique_items_count, user_email=user_email)
        
        db.add_transactions(transactions, dataset_id=ds_id, user_email=user_email)
        data_store['last_rules'] = None # Clear previous rules
        
        return jsonify({
            'message': f'Template {filename} loaded successfully',
            'transaction_count': total_tx,
            'unique_items': unique_items_count
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/datasets', methods=['GET'])
def get_datasets():
    user_email = get_current_user_email()
    db.cleanup_duplicate_datasets(user_email=user_email)
    datasets = db.get_datasets(user_email=user_email)
    return jsonify({'datasets': datasets})

@app.route('/api/datasets/<int:dataset_id>', methods=['DELETE'])
def delete_dataset_endpoint(dataset_id):
    user_email = get_current_user_email()
    db.delete_dataset(dataset_id, user_email=user_email)
    return jsonify({'message': 'Dataset deleted successfully'})

@app.route('/api/history/<int:dataset_id>/activate', methods=['POST'])
@app.route('/api/datasets/<int:dataset_id>/activate', methods=['POST'])
def activate_dataset_endpoint(dataset_id):
    user_email = get_current_user_email()
    dataset = db.get_dataset_by_id(dataset_id, user_email=user_email)
    if not dataset:
        return jsonify({'error': 'History file not found or unauthorized'}), 404
    return jsonify({
        'message': f"Activated historical dataset: {dataset['name']}",
        'dataset': dataset
    })

@app.route('/api/products', methods=['GET', 'POST'])
def manage_products():
    if request.method == 'GET':
        products = db.get_products()
        return jsonify({'products': products})
    else:
        params = request.json or {}
        name = params.get('name', '').strip()
        category = params.get('category', 'Uncategorized').strip()
        price = float(params.get('price', 0.0))
        stock = int(params.get('stock', 0))
        
        if not name:
            return jsonify({'error': 'Product name is required'}), 400
            
        success = db.add_product(name, category, price, stock)
        if not success:
            return jsonify({'error': 'Product name already exists'}), 400
            
        return jsonify({'message': f"Product '{name}' added successfully"}), 201

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product_endpoint(product_id):
    db.delete_product(product_id)
    return jsonify({'message': 'Product deleted successfully'})

@app.route('/api/trends', methods=['GET'])
def get_trends():
    transactions_data = db.get_transactions_with_dates(user_email=get_current_user_email())
    if not transactions_data:
        return jsonify({'trends': []})
        
    df_tx = pd.DataFrame([
        {'date': tx['date'].split(' ')[0], 'items_count': len(tx['items'])}
        for tx in transactions_data
    ])
    
    grouped = df_tx.groupby('date').size().reset_index(name='count')
    trends = [{'date': row['date'], 'count': int(row['count'])} for _, row in grouped.iterrows()]
    return jsonify({'trends': trends})

@app.route('/api/benchmark', methods=['POST'])
def run_benchmark():
    params = request.json or {}
    try:
        min_support = float(params.get('min_support', 0.05))
    except (TypeError, ValueError):
        min_support = 0.05

    try:
        min_confidence = float(params.get('min_confidence', 0.5))
    except (TypeError, ValueError):
        min_confidence = 0.5
    
    transactions = db.get_transactions(user_email=get_current_user_email())
    if not transactions or len(transactions) < 5:
        return jsonify({'error': 'Please upload a larger dataset first to run the performance benchmark (min 5 transactions).'}), 400
        
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df = pd.DataFrame(te_ary, columns=te.columns_)
    
    apriori_times = []
    apriori_memories = []
    fpgrowth_times = []
    fpgrowth_memories = []
    
    N = 20 # 20 iterations
    
    # Benchmarking Apriori
    for _ in range(N):
        tracemalloc.start()
        t0 = time.time()
        try:
            freq = apriori(df, min_support=min_support, use_colnames=True)
            _ = association_rules(freq, metric="confidence", min_threshold=min_confidence)
        except Exception:
            pass
        t1 = time.time()
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        apriori_times.append(t1 - t0)
        apriori_memories.append(peak / (1024 * 1024)) # Convert to MB
        
    # Benchmarking FP-Growth
    for _ in range(N):
        tracemalloc.start()
        t0 = time.time()
        try:
            freq = fpgrowth(df, min_support=min_support, use_colnames=True)
            _ = association_rules(freq, metric="confidence", min_threshold=min_confidence)
        except Exception:
            pass
        t1 = time.time()
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        fpgrowth_times.append(t1 - t0)
        fpgrowth_memories.append(peak / (1024 * 1024)) # Convert to MB
        
    # Paired T-test calculations for execution time
    time_diffs = [a - b for a, b in zip(apriori_times, fpgrowth_times)]
    mean_time_diff = sum(time_diffs) / N
    var_time_diff = sum((d - mean_time_diff) ** 2 for d in time_diffs) / (N - 1) if N > 1 else 0
    std_err_time = math.sqrt(var_time_diff) / math.sqrt(N) if var_time_diff > 0 else 0
    t_stat_time = mean_time_diff / std_err_time if std_err_time > 0 else 0.0
    
    df_val = N - 1
    z_time = t_stat_time * (1.0 - 0.25 / df_val) / math.sqrt(1.0 + (t_stat_time * t_stat_time) / (2.0 * df_val)) if t_stat_time != 0 else 0
    
    def normal_cdf(x):
        return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))
        
    p_value_time = 2.0 * (1.0 - normal_cdf(abs(z_time)))
    
    # Paired T-test calculations for memory usage
    mem_diffs = [a - b for a, b in zip(apriori_memories, fpgrowth_memories)]
    mean_mem_diff = sum(mem_diffs) / N
    var_mem_diff = sum((d - mean_mem_diff) ** 2 for d in mem_diffs) / (N - 1) if N > 1 else 0
    std_err_mem = math.sqrt(var_mem_diff) / math.sqrt(N) if var_mem_diff > 0 else 0
    t_stat_mem = mean_mem_diff / std_err_mem if std_err_mem > 0 else 0.0
    
    z_mem = t_stat_mem * (1.0 - 0.25 / df_val) / math.sqrt(1.0 + (t_stat_mem * t_stat_mem) / (2.0 * df_val)) if t_stat_mem != 0 else 0
    p_value_mem = 2.0 * (1.0 - normal_cdf(abs(z_mem)))
    
    avg_time_apriori = sum(apriori_times) / N
    avg_mem_apriori = sum(apriori_memories) / N
    avg_time_fpgrowth = sum(fpgrowth_times) / N
    avg_mem_fpgrowth = sum(fpgrowth_memories) / N
    
    return jsonify({
        'apriori': {
            'times': apriori_times,
            'memories': apriori_memories,
            'avg_time': avg_time_apriori,
            'avg_mem': avg_mem_apriori
        },
        'fpgrowth': {
            'times': fpgrowth_times,
            'memories': fpgrowth_memories,
            'avg_time': avg_time_fpgrowth,
            'avg_mem': avg_mem_fpgrowth
        },
        't_test_time': {
            't_statistic': t_stat_time,
            'p_value': p_value_time,
            'mean_difference': mean_time_diff,
            'standard_error': std_err_time,
            'is_significant': p_value_time < 0.05
        },
        't_test_mem': {
            't_statistic': t_stat_mem,
            'p_value': p_value_mem,
            'mean_difference': mean_mem_diff,
            'standard_error': std_err_mem,
            'is_significant': p_value_mem < 0.05
        },
        'message': 'Benchmark completed successfully over 20 iterations.'
    })

@app.route('/api/clear', methods=['POST'])
def clear_data():
    db.clear_transactions(user_email=get_current_user_email())
    data_store['last_rules'] = None
    return jsonify({
        'message': 'Data cleared successfully',
        'transaction_count': 0,
        'unique_items': 0
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
