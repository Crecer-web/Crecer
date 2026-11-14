# =================================================================
# BACKEND API - PLATAFORMA CRECER (FLASK, SMTP & FIREBASE ADMIN)
# =================================================================

import os
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

if os.path.exists('.env'):
    load_dotenv()

if not firebase_admin._apps:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    cred_path = os.path.join(current_dir, 'serviceAccountKey.json')

    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("[CRECER Security]: Firebase Admin inicializado localmente con JSON.")
    elif os.environ.get('FIREBASE_PROJECT_ID'):
        cred_dict = {
            "type": "service_account",
            "project_id": os.environ.get('FIREBASE_PROJECT_ID'),
            "private_key_id": os.environ.get('FIREBASE_PRIVATE_KEY_ID', ''),
            "private_key": os.environ.get('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
            "client_email": os.environ.get('FIREBASE_CLIENT_EMAIL'),
            "client_id": os.environ.get('FIREBASE_CLIENT_ID'),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{os.environ.get('FIREBASE_CLIENT_EMAIL')}"
        }
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        print("[CRECER Security]: Firebase Admin inicializado en Vercel con variables de entorno.")
    else:
        firebase_admin.initialize_app(options={'projectId': 'crecer-web'})
        print("[CRECER Warning]: Inicializado con projectId por defecto.")

app = Flask(__name__)
CORS(app)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "system": "Plataforma CRECER Backend",
        "version": "6.5.0"
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

        if not sender_email or not sender_password:
            return jsonify({'error': 'Faltan credenciales de correo (EMAIL_USER / EMAIL_PASS) en el servidor'}), 500

        base_url = 'http://127.0.0.1:5500/reset-password.html' if is_local else 'https://crecer-jet.vercel.app/reset-password.html'
        
        timestamp_actual = int(time.time() * 1000)
        enlace_con_tiempo = f"{base_url}?email={user_email}&tstamp={timestamp_actual}"

        msg = MIMEMultipart("alternative")
        msg['Subject'] = "CRECER - Sistema de Recuperación y Seguridad Académica"
        msg['From'] = f"Plataforma CRECER <{sender_email}>"
        msg['To'] = user_email

        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{
                    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                    background-color: #f8fafc;
                    margin: 0;
                    padding: 0;
                    -webkit-font-smoothing: antialiased;
                }}
                .email-wrapper {{
                    width: 100%;
                    table-layout: fixed;
                    background-color: #f8fafc;
                    padding: 45px 0;
                }}
                .email-content {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
                }}
                .email-header {{
                    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
                    color: #ffffff;
                    padding: 36px 24px;
                    text-align: center;
                }}
                .email-header h2 {{
                    margin: 0;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                }}
                .email-header p {{
                    margin: 8px 0 0 0;
                    font-size: 13px;
                    color: #e0e7ff;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 600;
                }}
                .email-body {{
                    padding: 40px 36px;
                    color: #1e293b;
                    line-height: 1.7;
                }}
                .email-body p {{
                    margin: 0 0 20px 0;
                    font-size: 15px;
                    color: #334155;
                }}
                .alert-box {{
                    background-color: #eef2ff;
                    border-left: 4px solid #4f46e5;
                    padding: 16px 20px;
                    border-radius: 0 10px 10px 0;
                    font-size: 14px;
                    color: #312e81;
                    margin-bottom: 28px;
                }}
                .alert-box strong {{
                    color: #3730a3;
                }}
                .btn-container {{
                    text-align: center;
                    margin: 35px 0;
                }}
                .btn-reset {{
                    background-color: #4f46e5;
                    color: #ffffff !important;
                    padding: 16px 36px;
                    text-decoration: none;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 15px;
                    display: inline-block;
                    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
                    transition: background-color 0.2s ease;
                }}
                .btn-reset:hover {{
                    background-color: #4338ca;
                }}
                .link-fallback {{
                    word-break: break-all;
                    font-size: 12px;
                    color: #64748b;
                    background-color: #f8fafc;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    margin-top: 15px;
                }}
                .divider {{
                    height: 1px;
                    background-color: #e2e8f0;
                    margin: 30px 0;
                }}
                .security-note {{
                    font-size: 13px;
                    color: #64748b;
                    margin-bottom: 0 !important;
                }}
                .email-footer {{
                    background-color: #f8fafc;
                    padding: 24px;
                    text-align: center;
                    font-size: 12px;
                    color: #94a3b8;
                    border-top: 1px solid #e2e8f0;
                }}
                .email-footer p {{
                    margin: 0;
                }}
            </style>
        </head>
        <body>
            <div class="email-wrapper">
                <div class="email-content">
                    <div class="email-header">
                        <h2>Plataforma Academica CRECER</h2>
                        <p>Seguridad y Gestion Estudiantil</p>
                    </div>
                    <div class="email-body">
                        <p>Estimado/a usuario/a,</p>
                        <p>Hemos procesado una solicitud de acceso para configurar o restablecer las credenciales de su cuenta dentro de la plataforma académica.</p>
                        
                        <div class="alert-box">
                            <strong>Aviso de seguridad importante:</strong> Por protocolos de protección de datos, este enlace de validación cuenta con un tiempo de vida estricto de <strong>10 minutos</strong>.
                        </div>

                        <p>Para proceder con el establecimiento de su nueva contraseña de forma segura, presione el siguiente botón:</p>
                        
                        <div class="btn-container">
                            <a href="{enlace_con_tiempo}" class="btn-reset" target="_blank">Establecer Nueva Contraseña</a>
                        </div>
                        
                        <p style="font-size: 13px; color: #64748b; margin-top: 25px;">Si el botón superior no funciona, puede copiar y pegar el siguiente enlace directamente en su navegador:</p>
                        <div class="link-fallback">{enlace_con_tiempo}</div>

                        <div class="divider"></div>
                        
                        <p class="security-note">Si usted no ha solicitado esta modificación, puede desestimar e ignorar este mensaje con total tranquilidad; su cuenta actual permanecerá intacta y protegida bajo nuestros estándares de seguridad.</p>
                    </div>
                    <div class="email-footer">
                        <p>Proyecto de Tesina - Sexto Ano &bull; Plataforma Académica CRECER</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html_content, "html"))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, user_email, msg.as_string())
        server.quit()

        print(f"[CRECER Success]: Correo de recuperación enviado con éxito a {user_email}")
        return jsonify({'message': 'Correo de recuperación enviado con éxito'}), 200

    except Exception as e:
        print(f"[Error SMTP CRECER]: {str(e)}")
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@app.route('/api/update-password', methods=['POST'])
def update_password():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se recibieron datos JSON válidos'}), 400

        email = data.get('email')
        new_password = data.get('new_password')
        timestamp_envio = data.get('tstamp')

        if not email or not new_password:
            return jsonify({'error': 'Faltan datos obligatorios (email o contraseña)'}), 400

        if len(new_password) < 8:
            return jsonify({'error': 'La contraseña debe contener al menos 8 caracteres'}), 400

        if timestamp_envio:
            try:
                tiempo_actual = int(time.time() * 1000)
                tiempo_limite_ms = 10 * 60 * 1000
                if (tiempo_actual - int(timestamp_envio)) > tiempo_limite_ms:
                    return jsonify({'error': 'El enlace de restablecimiento ha expirado (límite de 10 minutos superado).'}), 400
            except ValueError:
                return jsonify({'error': 'Formato de marca de tiempo inválido.'}), 400
        else:
            return jsonify({'error': 'Falta el parámetro de validación temporal de seguridad.'}), 400

        user = firebase_auth.get_user_by_email(email)
        
        firebase_auth.update_user(
            user.uid,
            password=new_password,
            email_verified=True,
            disabled=False
        )

        print(f"[CRECER Auth]: Contraseña actualizada y acceso dual habilitado de forma segura para {email}")
        return jsonify({'message': 'Contraseña actualizada con éxito en Firebase'}), 200

    except firebase_auth.UserNotFoundError:
        return jsonify({'error': 'Credenciales inválidas o cuenta no registrada.'}), 404
    except Exception as e:
        print(f"[Error Firebase Admin API]: {str(e)}")
        return jsonify({'error': f'Error al actualizar credenciales: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)