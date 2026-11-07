# =================================================================
# BACKEND API - PLATAFORMA CRECER (FLASK & FIREBASE ADMIN & SMTP)
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
from firebase_admin import credentials, auth

if os.path.exists('.env'):
    load_dotenv()

app = Flask(__name__)
CORS(app)

# Inicialización blindada de Firebase Admin para Vercel
if not firebase_admin._apps:
    try:
        private_key = os.environ.get('FIREBASE_PRIVATE_KEY')
        client_email = os.environ.get('FIREBASE_CLIENT_EMAIL')
        project_id = os.environ.get('FIREBASE_PROJECT_ID')
        
        if private_key and client_email and project_id:
            formatted_key = private_key.strip('"\'')
            if '\\n' in formatted_key:
                formatted_key = formatted_key.replace('\\n', '\n')
            
            cert_dict = {
                "type": "service_account",
                "project_id": project_id.strip('"\''),
                "private_key": formatted_key,
                "client_email": client_email.strip('"\''),
            }
            cred = credentials.Certificate(cert_dict)
            firebase_admin.initialize_app(cred)
            print("[Firebase Admin]: Inicializado con éxito.")
        else:
            firebase_admin.initialize_app()
    except Exception as e:
        print(f"[Error Init Firebase Admin]: {str(e)}")

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "system": "Plataforma CRECER Backend",
        "version": "4.0.0"
    })

@app.route('/api/send-reset-email', methods=['POST'])
def send_reset_email():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se recibieron datos JSON'}), 400

        user_email = data.get('email')
        is_local = data.get('is_local', False)

        if not user_email:
            return jsonify({'error': 'El correo es obligatorio'}), 400

        sender_email = os.environ.get('EMAIL_USER')
        sender_password = os.environ.get('EMAIL_PASS')

        if not sender_email or not sender_password:
            return jsonify({'error': 'Faltan credenciales de correo en Vercel'}), 500

        base_url = 'http://127.0.0.1:5500/reset-password.html' if is_local else 'https://crecer-jet.vercel.app/reset-password.html'

        # Generación oficial del enlace con el oobCode real y firmado por Firebase
        try:
            action_code_settings = auth.ActionCodeSettings(
                url=base_url,
                handleCodeInApp=True
            )
            link_firebase = auth.generate_password_reset_link(user_email, action_code_settings)
        except Exception as fb_error:
            return jsonify({'error': f'Firebase rechazó la generación del link: {str(fb_error)}'}), 400

        timestamp_actual = int(time.time() * 1000)
        
        # Insertamos el oobCode real que viene de Firebase dentro de nuestra estructura con el timestamp
        enlace_con_tiempo = f"{link_firebase}&tstamp={timestamp_actual}"

        # Construcción del correo corporativo HTML con diseño
        msg = MIMEMultipart("alternative")
        msg['Subject'] = "CRECER - Sistema de Recuperación y Seguridad Académica"
        msg['From'] = f"Plataforma CRECER <{sender_email}>"
        msg['To'] = user_email

        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }}
                .email-wrapper {{ width: 100%; table-layout: fixed; background-color: #f3f4f6; padding: 40px 0; }}
                .email-content {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }}
                .email-header {{ background-color: #4f46e5; color: #ffffff; padding: 24px; text-align: center; }}
                .email-body {{ padding: 32px; color: #374151; line-height: 1.6; }}
                .btn-container {{ text-align: center; margin: 32px 0; }}
                .btn-reset {{ background-color: #4f46e5; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(79, 70, 229,.3); }}
                .email-footer {{ background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }}
            </style>
        </head>
        <body>
            <div class="email-wrapper">
                <div class="email-content">
                    <div class="email-header">
                        <h2 style="margin: 0; font-size: 22px;">Plataforma Académica CRECER</h2>
                    </div>
                    <div class="email-body">
                        <p style="margin-top: 0;">Estimado usuario,</p>
                        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta académica.</p>
                        <p>Haz clic en el siguiente botón para establecer tus nuevas credenciales (válido por 10 minutos):</p>
                        <div class="btn-container">
                            <a href="{enlace_con_tiempo}" class="btn-reset" target="_blank">Establecer Nueva Contraseña</a>
                        </div>
                        <p style="font-size: 14px; color: #6b7280;">Si tú no solicitaste esto, puedes ignorar este mensaje.</p>
                    </div>
                    <div class="email-footer">
                        <p style="margin: 0;">Proyecto de Tesina - Sexto Año | Sistema CRECER</p>
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

        return jsonify({'message': 'Correo enviado con éxito'}), 200

    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)