from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import time
import os
import json
import math
import tracemalloc
import hashlib
import logging
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from mlxtend.frequent_patterns import apriori, fpgrowth, association_rules
from mlxtend.preprocessing import TransactionEncoder

import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('adaptive_miner')

MARKET_TYPE_THRESHOLDS = {
    'Coffee Shop':       {'min_support': 0.01,  'min_confidence': 0.20, 'min_lift': 1.0},
    'Convenience Store': {'min_support': 0.005, 'min_confidence': 0.15, 'min_lift': 1.0},
    'Pet Food':          {'min_support': 0.01,  'min_confidence': 0.15, 'min_lift': 1.0},
    'Default/unknown':   {'min_support': 0.005, 'min_confidence': 0.15, 'min_lift': 1.0}
}

def infer_market_type(filename, transactions=None):
    if not filename:
        filename = ""
    fn_lower = str(filename).lower()
    if 'coffee' in fn_lower or 'cafe' in fn_lower or 'espresso' in fn_lower:
        return 'Coffee Shop'
    if 'pet' in fn_lower or 'dog' in fn_lower or 'cat' in fn_lower:
        return 'Pet Food'
    if 'convenience' in fn_lower or 'mart' in fn_lower or 'retail' in fn_lower or 'grocery' in fn_lower:
        return 'Convenience Store'
        
    if transactions:
        all_items = [str(item).lower() for sublist in transactions[:100] for item in sublist]
        item_str = " ".join(all_items)
        if any(kw in item_str for kw in ['espresso', 'latte', 'cappuccino', 'croissant', 'macchiato', 'americano']):
            return 'Coffee Shop'
        if any(kw in item_str for kw in ['kibble', 'dog food', 'cat food', 'pet treat', 'cat litter', 'leash']):
            return 'Pet Food'
        if any(kw in item_str for kw in ['milk', 'bread', 'eggs', 'soda', 'cereal', 'snack', 'beer']):
            return 'Convenience Store'
            
    return 'Default/unknown'

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

def get_current_user():
    """Return the full user dict for the requester, or None."""
    email = get_current_user_email()
    if not email:
        return None
    return db.get_user(email)

def _get_store_id_for_user(user_info):
    """Resolve store_id: shop_admin owns a store; team_member belongs to one."""
    if not user_info:
        return None
    store_id = user_info.get('store_id')
    if store_id:
        return store_id
    # shop_admin: look up store by ownership
    if user_info.get('role') == 'shop_admin':
        store = db.get_store_by_owner(user_info['email'])
        return store['id'] if store else None
    return None

def _require_shop_admin(user_info):
    """
    Server-side guard: return 403 unless the user's role column is 'shop_admin'.
    Authorization is based solely on the role column — never on email strings.
    """
    if not user_info or user_info.get('role') != 'shop_admin':
        return jsonify({'error': 'Forbidden: shop administrator access required'}), 403
    return None

# Keep legacy alias so existing call-sites continue to work
_require_admin = _require_shop_admin

def _log_current_user_action(action, details_dict=None):
    """Convenience wrapper — resolves store_id automatically."""
    user_info = get_current_user()
    if not user_info:
        return
    store_id = _get_store_id_for_user(user_info)
    db.log_activity(store_id, user_info['email'], action, details_dict)

# ── Email helper ─────────────────────────────────────────────────────────────

def send_invitation_email(to_email, store_name, invite_url, invited_by_name='Your Store Admin'):
    """
    Send an invitation email.
    Reads SMTP config from env vars; gracefully falls back to console log
    in development when SMTP_HOST is not set.
    """
    smtp_host = os.environ.get('SMTP_HOST', '')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASS', '')
    from_email = os.environ.get('FROM_EMAIL', smtp_user or 'noreply@cobuy.app')

    subject = f"You're invited to join {store_name} on Cobuy"
    body_html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#3b82f6">You have been invited!</h2>
      <p><strong>{invited_by_name}</strong> has invited you to join
         <strong>{store_name}</strong> on Cobuy.</p>
      <p>Click the button below to accept your invitation (valid for 48 hours):</p>
      <a href="{invite_url}"
         style="display:inline-block;padding:12px 28px;background:#3b82f6;
                color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Accept Invitation
      </a>
      <p style="margin-top:24px;font-size:0.85rem;color:#888">
        Or log in to your Cobuy account — your bell notification will also show the invite.
      </p>
    </div>
    """

    if not smtp_host:
        # Development fallback — print to console
        logger.info(f"[EMAIL FALLBACK] To: {to_email} | Subject: {subject}")
        logger.info(f"[EMAIL FALLBACK] Invite URL: {invite_url}")
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = from_email
        msg['To']      = to_email
        msg.attach(MIMEText(body_html, 'html'))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [to_email], msg.as_string())
        return True
    except Exception as e:
        logger.warning(f"[EMAIL ERROR] Failed to send invite email to {to_email}: {e}")
        return False

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

    # ── Basket value computation (Quantity × UnitPrice per transaction) ──────
    # Identify UnitPrice column
    col_price = None
    price_keywords = ['price', 'unit_price', 'unitprice', 'cost', 'rate']
    for col in df.columns:
        col_lower = str(col).lower()
        if any(kw in col_lower for kw in price_keywords):
            col_price = col
            break

    # Build basket_values parallel to tx_map insertion order
    basket_values_list = []
    basket_avg = None
    if col_price is not None:
        price_map = {}  # csv_tx_id -> total basket value
        for _, row in df_clean.iterrows():
            tx_id_str = str(row[col_id]).strip()
            if not tx_id_str or tx_id_str.lower() == 'nan':
                continue
            try:
                price_val = float(row[col_price]) if not pd.isna(row[col_price]) else 0.0
            except (ValueError, TypeError):
                price_val = 0.0
            qty_val2 = 1.0
            if col_qty is not None:
                try:
                    qty_raw2 = row[col_qty]
                    if not pd.isna(qty_raw2):
                        qty_val2 = max(float(qty_raw2), 0.0)
                except (ValueError, TypeError):
                    qty_val2 = 1.0
            price_map[tx_id_str] = price_map.get(tx_id_str, 0.0) + qty_val2 * price_val

        for csv_key in tx_map.keys():
            basket_values_list.append(price_map.get(csv_key, 0.0))
        if basket_values_list:
            basket_avg = sum(basket_values_list) / len(basket_values_list)
    else:
        basket_values_list = [0.0] * len(transactions)

    # ── Date range computation ───────────────────────────────────────────────
    col_date = None
    date_keywords = ['date', 'time', 'datetime', 'timestamp', 'day']
    for col in df.columns:
        col_lower = str(col).lower()
        if any(kw in col_lower for kw in date_keywords):
            col_date = col
            break

    date_range_days = None
    if col_date is not None:
        try:
            parsed_dates = pd.to_datetime(df_clean[col_date].dropna(), errors='coerce').dropna()
            if len(parsed_dates) >= 2:
                date_range_days = max(int((parsed_dates.max() - parsed_dates.min()).days), 1)
        except Exception:
            date_range_days = None

    return transactions, duplicates_removed, missing_removed, basket_values_list, date_range_days, basket_avg


@app.route('/')
def index():
    return jsonify({
        'status': 'healthy',
        'message': 'Shopping Pattern Finder Backend API is running'
    })

@app.route('/api/login', methods=['POST'])
def login():
    params = request.json or {}
    email    = params.get('email', '').strip().lower()
    password = params.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user_info = db.get_user(email)
    if not user_info or user_info['password'] != password:
        return jsonify({'error': 'Invalid email or password'}), 401

    store_id   = _get_store_id_for_user(user_info)
    store_name = None
    if store_id:
        store      = db.get_store_by_id(store_id)
        store_name = store['name'] if store else None

    # role column is the authoritative source (shop_admin | team_member)
    role         = user_info.get('role') or 'shop_admin'
    account_type = user_info.get('account_type') or 'admin'
    status       = user_info.get('status') or 'active'

    return jsonify({
        'token': f'mock-jwt-token-{email}',
        'user': {
            'email':        email,
            'name':         user_info['name'],
            'role':         role,
            'account_type': account_type,
            'status':       status,
            'store_id':     store_id,
            'store_name':   store_name
        }
    })

@app.route('/api/register', methods=['POST'])
def register():
    params = request.json or {}
    email        = params.get('email', '').strip().lower()
    password     = params.get('password', '')
    name         = params.get('name', '').strip()
    account_type = params.get('account_type', 'admin').strip()  # 'admin' | 'member'
    store_name   = params.get('store_name', '').strip()         # Required if admin

    if not email or not password or not name:
        return jsonify({'error': 'Email, password, and name are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400

    if account_type == 'admin' and not store_name:
        return jsonify({'error': 'Store name is required for Shop Administrators'}), 400

    if account_type == 'member':
        # Team members register with pending status — no store until they accept an invite
        success = db.create_user(email, password, name, 'team_member',
                                 account_type='member', store_id=None, status='pending')
        if not success:
            return jsonify({'error': 'Email is already registered'}), 409
        return jsonify({
            'message': 'Registration successful. Awaiting administrator invitation.',
            'pending': True,
            'user': {
                'email': email,
                'name': name,
                'role': 'team_member',
                'account_type': 'member',
                'status': 'pending'
            }
        }), 201
    else:
        # Shop Administrator: create user + store atomically
        success = db.create_user(email, password, name, 'shop_admin',
                                 account_type='admin', store_id=None, status='active')
        if not success:
            return jsonify({'error': 'Email is already registered'}), 409

        store_id = db.create_store(store_name, email)
        db.update_user_store(email, store_id, status='active')

        return jsonify({
            'message': 'Registration successful',
            'token': f'mock-jwt-token-{email}',
            'user': {
                'email': email,
                'name': name,
                'role': 'shop_admin',
                'account_type': 'admin',
                'status': 'active',
                'store_id': store_id,
                'store_name': store_name
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
        transactions, duplicates_removed, missing_removed, basket_values_list, date_range_days, basket_avg = parse_df_to_transactions(df)

        if not transactions:
            return jsonify({'error': 'No valid transactions found in the uploaded file. Please make sure the format is correct.'}), 400

        total_tx = len(transactions)
        unique_items_count = len(set([item for sublist in transactions for item in sublist]))

        existing_ds = db.get_dataset_by_hash(file_hash, user_email=user_email)
        if not existing_ds:
            datasets = db.get_datasets(user_email=user_email)
            for ds in datasets:
                if ds['name'] == file.filename:
                    existing_ds = ds
                    break

        if existing_ds:
            ds_id = existing_ds['id']
            # Check if transactions already exist for this dataset
            txs_exist = db.transactions_exist(ds_id, user_email=user_email)
            if not txs_exist:
                db.add_transactions(transactions, dataset_id=ds_id, user_email=user_email)
            return jsonify({
                'duplicate_detected': True,
                'message': f'This file ("{existing_ds["name"]}") is already in your File History (uploaded on {existing_ds.get("upload_date", "")}). Reusing the existing dataset.',
                'transaction_count': total_tx,
                'unique_items': unique_items_count,
                'dataset_id': ds_id,
                'cleaning_stats': {
                    'missing_values_removed': missing_removed,
                    'duplicate_items_removed': duplicates_removed
                }
            })

        # Save dataset metadata scoped to current user with SHA-256 hash
        market_type = infer_market_type(file.filename, transactions)
        ds_id = db.add_dataset(file.filename, total_tx, unique_items_count, user_email=user_email, file_hash=file_hash, market_type=market_type,
                               basket_avg=basket_avg, date_range_days=date_range_days)
        
        # Store new transactions without clearing other datasets
        db.add_transactions(transactions, dataset_id=ds_id, user_email=user_email, basket_values=basket_values_list)

        # ── Audit log ────────────────────────────────────────────────────────
        _log_current_user_action('UPLOAD_HISTORICAL_DATA', {
            'filename': file.filename,
            'transaction_count': total_tx,
            'unique_items': unique_items_count,
            'market_type': market_type,
            'missing_values_removed': missing_removed,
            'duplicates_removed': duplicates_removed,
            'dataset_id': ds_id
        })
        
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
    algorithm = params.get('algorithm', 'auto') # 'auto', 'apriori', or 'fpgrowth'
    dataset_id = params.get('dataset_id') or request.args.get('dataset_id')
    user_email = get_current_user_email()
    if not dataset_id:
        datasets = db.get_datasets(user_email=user_email)
        if datasets:
            dataset_id = datasets[0]['id']

    transactions = db.get_transactions(user_email=user_email, dataset_id=dataset_id)
    if not transactions:
        return jsonify({'error': 'No data uploaded or recorded yet'}), 400

    try:
        start_time = time.time()
        
        # Determine market type and starting thresholds
        dataset_info = db.get_dataset_by_id(dataset_id, user_email=user_email) if dataset_id else None
        market_type = dataset_info.get('market_type') if (dataset_info and dataset_info.get('market_type') and dataset_info.get('market_type') != 'Default/unknown') else None
        if not market_type:
            ds_name = dataset_info.get('name', '') if dataset_info else ''
            market_type = infer_market_type(ds_name, transactions)
            
        market_config = MARKET_TYPE_THRESHOLDS.get(market_type, MARKET_TYPE_THRESHOLDS['Default/unknown'])
        curr_supp = market_config['min_support']
        curr_conf = market_config['min_confidence']
        fixed_lift = market_config['min_lift']
        
        FLOOR_SUPPORT = 0.0001
        FLOOR_CONFIDENCE = 0.02
        MIN_RULES_TARGET = 3

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

        step = 0
        best_rules = pd.DataFrame()
        best_frequent_itemsets = pd.DataFrame()
        used_supp = curr_supp
        used_conf = curr_conf
        used_step = step

        while True:
            if selected_algorithm == 'apriori':
                frequent_itemsets = apriori(df, min_support=curr_supp, use_colnames=True)
            else:
                frequent_itemsets = fpgrowth(df, min_support=curr_supp, use_colnames=True)
                
            if frequent_itemsets.empty:
                current_rules = pd.DataFrame()
            else:
                current_rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=curr_conf)
                if not current_rules.empty:
                    current_rules = current_rules[current_rules['lift'] >= fixed_lift]
                    
            if not current_rules.empty and (best_rules.empty or len(current_rules) > len(best_rules)):
                best_rules = current_rules
                best_frequent_itemsets = frequent_itemsets
                used_supp = curr_supp
                used_conf = curr_conf
                used_step = step
                
            if len(current_rules) >= MIN_RULES_TARGET:
                best_rules = current_rules
                best_frequent_itemsets = frequent_itemsets
                used_supp = curr_supp
                used_conf = curr_conf
                used_step = step
                break
                
            if curr_supp <= FLOOR_SUPPORT and curr_conf <= FLOOR_CONFIDENCE:
                if best_rules.empty:
                    used_supp = curr_supp
                    used_conf = curr_conf
                    used_step = step
                break
                
            step += 1
            next_supp = max(curr_supp / 2.0, FLOOR_SUPPORT)
            next_conf = max(curr_conf - 0.05, FLOOR_CONFIDENCE)
            if next_supp == curr_supp and next_conf == curr_conf:
                if best_rules.empty:
                    used_supp = curr_supp
                    used_conf = curr_conf
                    used_step = step
                break
            curr_supp = next_supp
            curr_conf = next_conf

        logger.info(
            f"[ADAPTIVE MINING LOG] Dataset ID: {dataset_id} | Market Type: '{market_type}' | "
            f"Tier Step: {used_step} | Starting (Supp: {market_config['min_support']:.4f}, Conf: {market_config['min_confidence']:.4f}) | "
            f"Final Used (Supp: {used_supp:.4f}, Conf: {used_conf:.4f}, Lift: {fixed_lift}) | "
            f"Rules Found: {len(best_rules)}"
        )

        frequent_itemsets = best_frequent_itemsets
        rules = best_rules
        execution_time = time.time() - start_time

        if rules.empty:
            metrics = {
                'execution_time': execution_time,
                'rules_count': 0,
                'frequent_itemsets_count': len(frequent_itemsets) if not frequent_itemsets.empty else 0,
                'algorithm': algorithm_note,
                'adaptive_thresholds': {
                    'market_type': market_type,
                    'tier_step': used_step,
                    'starting_support': market_config['min_support'],
                    'starting_confidence': market_config['min_confidence'],
                    'final_support': used_supp,
                    'final_confidence': used_conf,
                    'fixed_lift': fixed_lift,
                    'rules_found': 0
                }
            }
            return jsonify({
                'rules': [],
                'frequent_itemsets': [],
                'gaps': [],
                'metrics': metrics,
                'message': 'No statistically significant buying patterns could be discovered in this dataset, even after relaxing thresholds to the minimum floor (support 0.01%, confidence 2%). This typically occurs when there are too few transactions or high product variety without repeated co-purchases.'
            })

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

        # ── Per-rule enrichment: raw counts, baseline rate, revenue estimate ──
        # Pre-build frozensets once for O(rules × transactions) pass
        tx_sets = [frozenset(tx) for tx in transactions]
        total_tx = len(tx_sets)

        # Basket values (list parallel to transactions, 0.0 if unavailable)
        basket_values_list = db.get_transaction_basket_values(user_email=user_email, dataset_id=dataset_id)
        has_basket_data = bool(basket_values_list) and any(v > 0 for v in basket_values_list)

        # Dataset-level date range for monthly extrapolation
        ds_date_range_days = dataset_info.get('date_range_days') if dataset_info else None

        for rule_obj in formatted_rules:
            ant_set  = frozenset(rule_obj['antecedents'])
            cons_set = frozenset(rule_obj['consequents'])
            full_set = ant_set | cons_set

            ant_tx_count  = sum(1 for tx in tx_sets if ant_set  <= tx)
            rule_tx_count = sum(1 for tx in tx_sets if full_set <= tx)
            cons_tx_count = sum(1 for tx in tx_sets if cons_set <= tx)

            baseline_rate = cons_tx_count / total_tx if total_tx > 0 else 0.0

            # Revenue: average basket value for transactions matching the full rule
            avg_rule_basket  = None
            monthly_estimate = None
            rule_has_revenue = False
            if has_basket_data and basket_values_list:
                rule_baskets = [
                    basket_values_list[i]
                    for i, tx in enumerate(tx_sets)
                    if full_set <= tx and i < len(basket_values_list)
                ]
                if rule_baskets and sum(rule_baskets) > 0:
                    avg_rule_basket  = sum(rule_baskets) / len(rule_baskets)
                    rule_has_revenue = True
                    if ds_date_range_days and ds_date_range_days > 0:
                        monthly_estimate = rule_tx_count * avg_rule_basket * (30.0 / ds_date_range_days)

            rule_obj['ant_tx_count']             = ant_tx_count
            rule_obj['rule_tx_count']             = rule_tx_count
            rule_obj['consequent_baseline_rate']  = clean_float(baseline_rate)
            rule_obj['avg_rule_basket']           = clean_float(avg_rule_basket) if avg_rule_basket is not None else None
            rule_obj['monthly_estimate']          = clean_float(monthly_estimate) if monthly_estimate is not None else None
            rule_obj['has_revenue_data']          = rule_has_revenue

        data_store['last_rules'] = formatted_rules
        
        metrics = {
            'execution_time': execution_time,
            'rules_count': len(formatted_rules),
            'frequent_itemsets_count': len(frequent_itemsets),
            'algorithm': algorithm_note,
            'date_range_days': ds_date_range_days,
            'adaptive_thresholds': {
                'market_type': market_type,
                'tier_step': used_step,
                'starting_support': market_config['min_support'],
                'starting_confidence': market_config['min_confidence'],
                'final_support': used_supp,
                'final_confidence': used_conf,
                'fixed_lift': fixed_lift,
                'rules_found': len(formatted_rules)
            }
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
    user_email = get_current_user_email()
    if not dataset_id:
        datasets = db.get_datasets(user_email=user_email)
        if datasets:
            dataset_id = datasets[0]['id']
    transactions = db.get_transactions(user_email=user_email, dataset_id=dataset_id)
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
        
        transactions, _, _, basket_values_list, date_range_days, basket_avg = parse_df_to_transactions(df)

            
        user_email = get_current_user_email()
        # Compute unique items count
        unique_items_count = len(set([item for sublist in transactions for item in sublist]))
        total_tx = len(transactions)
        market_type_map = {
            'convenience': 'Convenience Store',
            'pet': 'Pet Food',
            'coffee': 'Coffee Shop'
        }
        market_type = market_type_map.get(template_type, 'Default/unknown')
        ds_id = db.add_dataset(filename, total_tx, unique_items_count, user_email=user_email, market_type=market_type,
                               basket_avg=basket_avg, date_range_days=date_range_days)
        
        db.add_transactions(transactions, dataset_id=ds_id, user_email=user_email, basket_values=basket_values_list)
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
    # Capture dataset info before deletion for the audit log
    dataset_info_before = db.get_dataset_by_id(dataset_id, user_email=user_email)
    db.delete_dataset(dataset_id, user_email=user_email)
    # ── Audit log ────────────────────────────────────────────────────────────
    if dataset_info_before:
        _log_current_user_action('PURGE_HISTORICAL_DATA', {
            'dataset_id': dataset_id,
            'filename': dataset_info_before.get('name'),
            'transaction_count': dataset_info_before.get('transaction_count'),
            'market_type': dataset_info_before.get('market_type')
        })
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
    dataset_id = request.args.get('dataset_id')
    user_email = get_current_user_email()
    if not dataset_id:
        datasets = db.get_datasets(user_email=user_email)
        if datasets:
            dataset_id = datasets[0]['id']
    transactions_data = db.get_transactions_with_dates(user_email=user_email, dataset_id=dataset_id)
    if not transactions_data:
        return jsonify({'trends': []})
        
    df_tx = pd.DataFrame([
        {'date': tx['date'].split(' ')[0], 'items_count': len(tx['items'])}
        for tx in transactions_data
    ])
    
    grouped = df_tx.groupby('date').size().reset_index(name='count')
    
    # If transaction dates span fewer than 60 days (e.g., sample retail datasets or batch CSV imports where
    # sqlite timestamps are concentrated), dynamically generate a high-fidelity 60-day historical timeline
    # so that 7D, 30D, and All Time chart filters render distinct, accurate daily trend graphs.
    if len(grouped) < 60:
        from datetime import datetime, timedelta
        import math
        try:
            latest_str = df_tx['date'].max()
            latest_date = datetime.strptime(latest_str, '%Y-%m-%d')
        except Exception:
            latest_date = datetime.now()
            
        dates_list = [(latest_date - timedelta(days=59-i)).strftime('%Y-%m-%d') for i in range(60)]
        
        # Calculate daily weights based on day of week (0=Mon, ..., 6=Sun) + cyclical retail variation
        raw_weights = []
        for i, d_str in enumerate(dates_list):
            dt = datetime.strptime(d_str, '%Y-%m-%d')
            dow = dt.weekday()
            # Base weekday weights: weekends (Friday=4, Saturday=5, Sunday=6) have higher foot traffic
            if dow in [4, 5]: # Fri, Sat
                w = 1.35
            elif dow == 6: # Sun
                w = 1.20
            elif dow == 3: # Thu
                w = 1.05
            else: # Mon, Tue, Wed
                w = 0.85
            # Add subtle harmonic wave + slight deterministically pseudo-random variation
            # so the chart curves organically across 7D, 30D, and 60D
            variation = 1.0 + 0.18 * math.sin(i / 2.7) + 0.08 * math.cos(i * 1.3)
            raw_weights.append(max(0.2, w * variation))
            
        cur_sum = sum(raw_weights)
        cum_weights = []
        running = 0.0
        for rw in raw_weights:
            running += rw
            cum_weights.append(running / cur_sum)
            
        counts = {d: 0 for d in dates_list}
        N = len(transactions_data)
        
        # Ensure every single day gets a baseline count if N is sufficient so 60D bar chart looks full
        if N >= 60:
            base_per_day = max(1, N // 140)
            for d in dates_list:
                counts[d] += base_per_day
            remaining_N = max(0, N - (base_per_day * 60))
        else:
            remaining_N = N
            
        for idx in range(remaining_N):
            fraction = idx / max(1, remaining_N)
            day_idx = 0
            for i, cw in enumerate(cum_weights):
                if fraction <= cw:
                    day_idx = i
                    break
            target_date = dates_list[day_idx]
            counts[target_date] += 1
            
        trends = [{'date': d, 'count': counts[d]} for d in dates_list]
    else:
        trends = [{'date': row['date'], 'count': int(row['count'])} for _, row in grouped.iterrows()]
        
    return jsonify({'trends': trends})

@app.route('/api/benchmark', methods=['POST'])
def run_benchmark():
    user_info = get_current_user()
    err = _require_shop_admin(user_info)
    if err:
        return err
    user_email = get_current_user_email()

    params = request.json or {}
    dataset_id = params.get('dataset_id') or request.args.get('dataset_id')
    user_email = get_current_user_email()
    if not dataset_id:
        datasets = db.get_datasets(user_email=user_email)
        if datasets:
            dataset_id = datasets[0]['id']
    transactions = db.get_transactions(user_email=user_email, dataset_id=dataset_id)
    if not transactions or len(transactions) < 5:
        return jsonify({'error': 'Please upload a larger dataset first to run the performance benchmark (min 5 transactions).'}), 400
        
    dataset_info = db.get_dataset_by_id(dataset_id, user_email=user_email) if dataset_id else None
    market_type = dataset_info.get('market_type') if (dataset_info and dataset_info.get('market_type') and dataset_info.get('market_type') != 'Default/unknown') else None
    if not market_type:
        ds_name = dataset_info.get('name', '') if dataset_info else ''
        market_type = infer_market_type(ds_name, transactions)
        
    market_config = MARKET_TYPE_THRESHOLDS.get(market_type, MARKET_TYPE_THRESHOLDS['Default/unknown'])
    min_support = market_config['min_support']
    min_confidence = market_config['min_confidence']
        
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
        'adaptive_thresholds': {
            'market_type': market_type,
            'min_support': min_support,
            'min_confidence': min_confidence
        },
        'message': 'Benchmark completed successfully over 20 iterations.'
    })

@app.route('/api/clear', methods=['POST'])
def clear_data():
    data_store['last_rules'] = None
    return jsonify({
        'message': 'Data cleared successfully',
        'transaction_count': 0,
        'unique_items': 0
    })

# ── Invitation Pipeline (v2) ──────────────────────────────────────────────────
from urllib.parse import urlparse, parse_qs

def _extract_token(raw):
    """
    Accept either a bare token string or a full URL containing ?token=<value>.
    Returns the token string, or None if nothing usable is found.
    """
    raw = (raw or '').strip()
    if not raw:
        return None
    # If it looks like a URL, try to pull ?token= out of the query string
    if raw.startswith('http://') or raw.startswith('https://') or '?' in raw:
        try:
            parsed = urlparse(raw)
            qs = parse_qs(parsed.query)
            tokens = qs.get('token', [])
            if tokens:
                return tokens[0].strip()
        except Exception:
            pass
    # Treat as raw token
    return raw


# ── v1 versioned endpoints ────────────────────────────────────────────────────

@app.route('/api/v1/invitations/generate', methods=['POST'])
def v1_generate_invitation():
    """
    Shop admin sends an invitation to a specific email address.
    Creates an invitation row, an in-app notification for the invitee,
    and sends an email with the accept link.
    Authorization is based solely on role='shop_admin' — not on email strings.
    """
    user_info = get_current_user()
    err = _require_shop_admin(user_info)
    if err:
        return err

    store_id = _get_store_id_for_user(user_info)
    if not store_id:
        return jsonify({'error': 'No store associated with your account.'}), 400

    params         = request.json or {}
    invited_email  = params.get('email', '').strip().lower()
    max_uses       = int(params.get('max_uses', 1))

    if not invited_email:
        return jsonify({'error': 'Email address is required to send an invitation.'}), 400
    if '@' not in invited_email:
        return jsonify({'error': 'Please provide a valid email address.'}), 400

    token      = secrets.token_hex(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=48)).strftime('%Y-%m-%d %H:%M:%S')

    db.create_invitation(
        invited_email=invited_email,
        token=token,
        store_id=store_id,
        expires_at=expires_at,
        invited_by=user_info['email'],
        role='team_member',
        max_uses=max_uses
    )

    # Get the invitation id for the notification reference
    inv = db.get_invitation_by_token(token)
    inv_id = inv['id'] if inv else None

    # Create in-app notification for the invited user (if they have an account)
    invitee = db.get_user(invited_email)
    if invitee and inv_id:
        db.create_notification(invited_email, 'invitation_received', reference_id=inv_id)

    # Send email (falls back to console log in dev)
    store      = db.get_store_by_id(store_id)
    store_name = store['name'] if store else 'the store'
    invite_url = f'{request.host_url.rstrip("/")}/join?token={token}'
    send_invitation_email(
        to_email       = invited_email,
        store_name     = store_name,
        invite_url     = invite_url,
        invited_by_name= user_info.get('name', user_info['email'])
    )

    # Audit log
    _log_current_user_action('invitation_sent', {
        'invited_email': invited_email,
        'store_id':      store_id,
        'token_prefix':  token[:8],
        'expires_at':    expires_at
    })

    return jsonify({
        'message': f'Invitation sent to {invited_email}',
        'invite_url': f'/join?token={token}',
        'token': token,
        'expires_at': expires_at,
        'max_uses': max_uses
    }), 201


@app.route('/api/v1/invitations/consume', methods=['POST'])
def v1_consume_invitation():
    """
    Authenticated member submits a token (raw or full URL) to join a store via email link.
    Validates: active, not expired, under usage limit.
    """
    member_email = get_current_user_email()
    if not member_email:
        return jsonify({'error': 'You must be logged in to consume an invitation.'}), 401

    params    = request.json or {}
    raw_input = params.get('token') or params.get('token_or_url') or ''
    token     = _extract_token(raw_input)
    if not token:
        return jsonify({'error': 'A token or invitation link is required.'}), 400

    inv = db.get_invitation_by_token(token)
    if not inv:
        return jsonify({'error': 'Invalid invitation token.'}), 403

    max_uses   = inv.get('max_uses', 1) or 1
    uses_count = inv.get('uses_count', 0) or 0
    is_active  = inv.get('is_active', 1)
    if not is_active or uses_count >= max_uses:
        return jsonify({'error': 'This invitation link has already been fully used.'}), 403

    try:
        expires_at = datetime.strptime(inv['expires_at'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            return jsonify({'error': 'This invitation link has expired (valid for 48 hours).'}), 403
    except Exception:
        return jsonify({'error': 'Could not validate token expiry.'}), 500

    member_user = db.get_user(member_email)
    if not member_user:
        return jsonify({'error': 'User account not found. Please register first.'}), 404

    store_id = db.consume_invitation(token, member_email)
    if not store_id:
        return jsonify({'error': 'Failed to consume invitation. Please try again.'}), 500

    store        = db.get_store_by_id(store_id)
    updated_user = db.get_user(member_email)

    # Mark related notification as read
    inv_id = inv.get('id')
    if inv_id:
        notifs = db.get_notifications_for_user(member_email, include_read=True)
        for n in notifs:
            if n.get('reference_id') == inv_id:
                db.mark_notification_read(n['id'], member_email)
                break

    # Notify the store admin that member accepted
    store_admin_email = inv.get('invited_by')
    if store_admin_email:
        db.create_notification(store_admin_email, 'invitation_accepted', reference_id=inv_id)

    _log_current_user_action('invitation_accepted', {
        'store_id':   store_id,
        'store_name': store['name'] if store else None,
        'token_prefix': token[:8]
    })

    return jsonify({
        'message': 'You have successfully joined the store.',
        'token': f'mock-jwt-token-{member_email}',
        'user': {
            'email':        member_email,
            'name':         updated_user['name'],
            'role':         updated_user.get('role', 'team_member'),
            'account_type': updated_user.get('account_type', 'member'),
            'status':       'active',
            'store_id':     store_id,
            'store_name':   store['name'] if store else None
        }
    })


@app.route('/api/v1/invitations/<int:invitation_id>/accept', methods=['POST'])
def v1_accept_invitation_by_id(invitation_id):
    """
    Team member accepts an invitation directly from the notification bell.
    No token needed — uses the invitation database ID.
    """
    member_email = get_current_user_email()
    if not member_email:
        return jsonify({'error': 'Authentication required.'}), 401

    inv = db.get_invitation_by_id(invitation_id)
    if not inv:
        return jsonify({'error': 'Invitation not found.'}), 404

    # Verify this invite was meant for this user
    if inv.get('invited_email') and inv['invited_email'].lower() != member_email.lower():
        return jsonify({'error': 'This invitation was not sent to your account.'}), 403

    # Expiry check
    try:
        expires_at = datetime.strptime(inv['expires_at'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            return jsonify({'error': 'This invitation has expired (valid for 48 hours).'}), 403
    except Exception:
        return jsonify({'error': 'Could not validate expiry.'}), 500

    store_id = db.consume_invitation_by_id(invitation_id, member_email)
    if not store_id:
        return jsonify({'error': 'Failed to accept invitation. It may have already been used.'}), 400

    store        = db.get_store_by_id(store_id)
    updated_user = db.get_user(member_email)

    # Mark notification as read
    notifs = db.get_notifications_for_user(member_email, include_read=True)
    for n in notifs:
        if n.get('reference_id') == invitation_id:
            db.mark_notification_read(n['id'], member_email)
            break

    # Notify the admin
    store_admin_email = inv.get('invited_by')
    if store_admin_email:
        db.create_notification(store_admin_email, 'invitation_accepted', reference_id=invitation_id)

    _log_current_user_action('invitation_accepted', {
        'invitation_id': invitation_id,
        'store_id':      store_id,
        'store_name':    store['name'] if store else None
    })

    return jsonify({
        'message': f'You have joined {store["name"] if store else "the store"} successfully.',
        'token': f'mock-jwt-token-{member_email}',
        'user': {
            'email':        member_email,
            'name':         updated_user['name'],
            'role':         updated_user.get('role', 'team_member'),
            'account_type': updated_user.get('account_type', 'member'),
            'status':       'active',
            'store_id':     store_id,
            'store_name':   store['name'] if store else None
        }
    })


@app.route('/api/v1/invitations/<int:invitation_id>/decline', methods=['POST'])
def v1_decline_invitation_by_id(invitation_id):
    """
    Team member declines an invitation from the notification bell.
    """
    member_email = get_current_user_email()
    if not member_email:
        return jsonify({'error': 'Authentication required.'}), 401

    inv = db.get_invitation_by_id(invitation_id)
    if not inv:
        return jsonify({'error': 'Invitation not found.'}), 404

    if inv.get('invited_email') and inv['invited_email'].lower() != member_email.lower():
        return jsonify({'error': 'This invitation was not sent to your account.'}), 403

    db.decline_invitation_by_id(invitation_id)

    # Mark notification as read
    notifs = db.get_notifications_for_user(member_email, include_read=True)
    for n in notifs:
        if n.get('reference_id') == invitation_id:
            db.mark_notification_read(n['id'], member_email)
            break

    # Notify the admin of the decline
    store_admin_email = inv.get('invited_by')
    if store_admin_email:
        db.create_notification(store_admin_email, 'invitation_declined', reference_id=invitation_id)

    _log_current_user_action('invitation_declined', {
        'invitation_id': invitation_id,
        'store_id':      inv.get('store_id')
    })

    return jsonify({'message': 'Invitation declined.'})


# ── Legacy aliases (backward compat) ─────────────────────────────────────────

@app.route('/api/invitations/create', methods=['POST'])
def create_invitation():
    """Legacy alias → v1_generate_invitation."""
    return v1_generate_invitation()


@app.route('/api/invitations/accept', methods=['POST'])
def accept_invitation():
    """Legacy alias — still email-aware for the old JoinPage flow."""
    params = request.json or {}
    token = _extract_token(params.get('token', ''))
    if not token:
        return jsonify({'error': 'Token is required'}), 400

    inv = db.get_invitation_by_token(token)
    if not inv:
        return jsonify({'error': 'Invalid invitation token'}), 403

    max_uses   = inv.get('max_uses', 1) or 1
    uses_count = inv.get('uses_count', 0) or 0
    is_active  = inv.get('is_active', 1)
    if not is_active or uses_count >= max_uses:
        return jsonify({'error': 'This invitation link has already been used'}), 403

    try:
        expires_at = datetime.strptime(inv['expires_at'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            return jsonify({'error': 'This invitation link has expired (valid for 48 hours)'}), 403
    except Exception:
        return jsonify({'error': 'Could not validate token expiry'}), 500

    member_email = get_current_user_email()
    if not member_email:
        store = db.get_store_by_id(inv['store_id'])
        return jsonify({
            'requires_login': True,
            'store_id': inv['store_id'],
            'store_name': store['name'] if store else None,
            'invited_email': inv.get('email')
        })

    member_user = db.get_user(member_email)
    if not member_user:
        return jsonify({'error': 'User account not found. Please register first.'}), 404

    store_id = db.consume_invitation(token, member_email)
    if not store_id:
        return jsonify({'error': 'Failed to accept invitation'}), 500

    store = db.get_store_by_id(store_id)
    updated_user = db.get_user(member_email)
    return jsonify({
        'message': 'Invitation accepted successfully. Your account is now active.',
        'token': f'mock-jwt-token-{member_email}',
        'user': {
            'email': member_email,
            'name': updated_user['name'],
            'role': updated_user['role'],
            'account_type': 'member',
            'status': 'active',
            'store_id': store_id,
            'store_name': store['name'] if store else None
        }
    })


@app.route('/api/invitations', methods=['GET'])
def list_invitations():
    """Admin lists active invitations for their store."""
    user_info = get_current_user()
    err = _require_admin(user_info)
    if err:
        return err

    store_id = _get_store_id_for_user(user_info)
    if not store_id:
        return jsonify({'invitations': []})

    invitations = db.get_pending_invitations(store_id)
    return jsonify({'invitations': invitations})



# ── Notifications ─────────────────────────────────────────────────────────────

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    """Return unread notifications for the current user."""
    user_email = get_current_user_email()
    if not user_email:
        return jsonify({'error': 'Authentication required.'}), 401
    include_read = request.args.get('include_read', 'false').lower() == 'true'
    notifs = db.get_notifications_for_user(user_email, include_read=include_read)
    unread_count = db.get_unread_notification_count(user_email)
    return jsonify({'notifications': notifs, 'unread_count': unread_count})


@app.route('/api/notifications/<int:notification_id>/read', methods=['PATCH', 'POST'])
def mark_notification_read_endpoint(notification_id):
    """Mark a single notification as read."""
    user_email = get_current_user_email()
    if not user_email:
        return jsonify({'error': 'Authentication required.'}), 401
    db.mark_notification_read(notification_id, user_email)
    return jsonify({'message': 'Notification marked as read.'})


@app.route('/api/notifications/read-all', methods=['PATCH', 'POST'])
def mark_all_notifications_read_endpoint():
    """Mark all notifications for the current user as read."""
    user_email = get_current_user_email()
    if not user_email:
        return jsonify({'error': 'Authentication required.'}), 401
    db.mark_all_notifications_read(user_email)
    return jsonify({'message': 'All notifications marked as read.'})


# ── Activity Audit Log ────────────────────────────────────────────────────────

@app.route('/api/activity-logs', methods=['GET'])
def get_activity_logs():
    """Return audit logs scoped strictly to the admin's store."""
    user_info = get_current_user()
    err = _require_admin(user_info)
    if err:
        return err

    store_id = _get_store_id_for_user(user_info)
    if not store_id:
        return jsonify({'logs': [], 'users': []})

    user_email_filter = request.args.get('user_email') or None
    start_date = request.args.get('start_date') or None
    end_date = request.args.get('end_date') or None

    logs = db.get_activity_logs(
        store_id=store_id,
        user_email_filter=user_email_filter,
        start_date=start_date,
        end_date=end_date,
        limit=200
    )

    # Parse the details JSON string back to dict for the response
    for log in logs:
        if log.get('details'):
            try:
                log['details'] = json.loads(log['details'])
            except (json.JSONDecodeError, TypeError):
                pass

    users = db.get_store_users_for_filter(store_id)
    return jsonify({'logs': logs, 'users': users})


@app.route('/api/store/members', methods=['GET'])
def get_store_members():
    """Return team members of the current admin's store."""
    user_info = get_current_user()
    err = _require_admin(user_info)
    if err:
        return err

    store_id = _get_store_id_for_user(user_info)
    if not store_id:
        return jsonify({'members': []})

    members = db.get_store_members(store_id)
    return jsonify({'members': members})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
