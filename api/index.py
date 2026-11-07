# =================================================================
# BACKEND API - PLATAFORMA CRECER (FLASK & FIREBASE REST & SMTP)
# =================================================================

import os
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

if os.path.exists('.env'):
    load_dotenv()

app = Flask(__name__)
CORS(app)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "system": "Plataforma CRECER Backend",
        "version": "3.2.0"
    })

@app.route('/api/send-reset-email', methods=['POST'])
def send_reset_email():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se recibieron datos JSON válidos'}), 400

        user_email = data.get('email')
        is_local = data.get('is_local', False)

        if not user_email:
            return jsonify({'error': 'El correo electrónico es obligatorio'}), 400

        sender_email = os.environ.get('EMAIL_USER')
        sender_password = os.environ.get('EMAIL_PASS')
        firebase_api_key = os.environ.get('FIREBASE_API_KEY')

        if not sender_email or not sender_password:
            return jsonify({'error': 'Faltan credenciales de correo en Vercel'}), 500

        if not firebase_api_key:
            return jsonify({'error': 'Falta configurar FIREBASE_API_KEY en Vercel'}), 500

        # URL de redirección base según el entorno
        base_url = 'http://127.0.0.1:5500/reset-password.html' if is_local else 'https://crecer-jet.vercel.app/reset-password.html'

        # Petición a la REST API de Firebase Auth para generar el enlace de recuperación
        firebase_url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={firebase_api_key}"
        payload = {
            "requestType": "PASSWORD_RESET",
            "email": user_email,
            "continueUrl": base_url,
            "canHandleCodeInApp": True
        }

        firebase_response = requests.post(firebase_url, json=payload)
        
        if firebase_response.status_code != 200:
            error_data = firebase_response.json()
            error_message = error_data.get('error', {}).get('message', 'Error desconocido en Firebase')
            print(f"[Error Firebase Auth]: {error_message}")
            return jsonify({'error': f'Firebase rechazó la solicitud: {error_message}'}), 400

        print(f"[CRECER Success]: Correo de recuperación procesado para {user_email}")
        return jsonify({'message': 'Correo de recuperación enviado con éxito'}), 200

    except Exception as e:
        print(f"[Error Crítico en Backend CRECER]: {str(e)}")
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)