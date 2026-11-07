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

# Carga las variables de entorno locales si existe el archivo .env en desarrollo
if os.path.exists('.env'):
    load_dotenv()

app = Flask(__name__)
CORS(app)  # Habilita el intercambio de recursos de origen cruzado

# =================================================================
# INICIALIZACIÓN BLINDADA DE FIREBASE ADMIN SDK (LOCAL Y VERCEL)
# =================================================================
if not firebase_admin._apps:
    try:
        cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'serviceAccountKey.json')
        
        if os.path.exists(cred_path):
            # Inicialización local mediante archivo físico de clave privada
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("[Firebase Admin]: Inicializado correctamente con archivo local.")
        else:
            # Inicialización en producción (Vercel) mediante variables de entorno individuales
            private_key = os.environ.get('FIREBASE_PRIVATE_KEY')
            client_email = os.environ.get('FIREBASE_CLIENT_EMAIL')
            project_id = os.environ.get('FIREBASE_PROJECT_ID')
            
            if private_key and client_email and project_id:
                formatted_key = private_key.replace('\\n', '\n')
                cert_dict = {
                    "type": "service_account",
                    "project_id": project_id,
                    "private_key": formatted_key,
                    "client_email": client_email,
                }
                cred = credentials.Certificate(cert_dict)
                firebase_admin.initialize_app(cred)
                print("[Firebase Admin]: Inicializado correctamente con variables de entorno en Vercel.")
            else:
                # Inicialización por defecto de respaldo
                firebase_admin.initialize_app()
                print("[Firebase Admin]: Inicializado con credenciales por defecto del sistema.")
    except Exception as e:
        print(f"[Error Crítico en Inicialización Firebase Admin]: {e}")

# Credenciales y configuraciones iniciales del servidor SMTP de Gmail
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "system": "Plataforma CRECER Backend - Auth Service",
        "version": "3.0.0"
    })

@app.route('/api/send-reset-email', methods=['POST'])
def send_reset_email():
    """
    Endpoint principal para gestionar el restablecimiento de credenciales.
    Utiliza Firebase Admin SDK para generar de forma oficial el enlace con el oobCode
    y utiliza Gmail SMTP para despachar el correo con diseño corporativo HTML avanzado.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se recibieron datos JSON válidos en la petición'}), 400

        user_email = data.get('email')
        is_local = data.get('is_local', False)

        if not user_email:
            return jsonify({'error': 'El campo de correo electrónico es obligatorio'}), 400

        # Credenciales SMTP personales obtenidas de las variables de entorno
        sender_email = os.environ.get('EMAIL_USER')
        sender_password = os.environ.get('EMAIL_PASS')

        if not sender_email or not sender_password:
            return jsonify({'error': 'Faltan configurar las credenciales de correo (EMAIL_USER / EMAIL_PASS)'}), 500

        # Definir la URL de redirección base según el entorno de ejecución
        base_url = 'http://127.0.0.1:5500/reset-password.html' if is_local else 'https://crecer-jet.vercel.app/reset-password.html'

        # Configuración de ActionCodeSettings requerida por Firebase Admin SDK
        action_code_settings = auth.ActionCodeSettings(
            url=base_url,
            handleCodeInApp=True
        )

        try:
            # Generación oficial y segura del link de restablecimiento con el oobCode integrado
            link_firebase = auth.generate_password_reset_link(user_email, action_code_settings)
        except Exception as fb_error:
            error_msg = str(fb_error)
            print(f"[Error Firebase Admin Auth]: {error_msg}")
            return jsonify({'error': f'Firebase rechazó la generación del enlace: {error_msg}'}), 400

        # Inyección de marca temporal (tstamp) para controlar la caducidad estricta de 10 minutos en el cliente
        timestamp_actual = int(time.time() * 1000)
        enlace_con_tiempo = f"{link_firebase}&tstamp={timestamp_actual}"

        # Construcción avanzada del mensaje HTML corporativo para el correo electrónico
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
                        <p>Hemos recibido una solicitud para restablecer la contraseña asociada a tu cuenta en la plataforma de gestión académica.</p>
                        <p>Para proceder con el cambio seguro de tus credenciales, haz clic en el siguiente botón (enlace válido por 10 minutos):</p>
                        <div class="btn-container">
                            <a href="{enlace_con_tiempo}" class="btn-reset" target="_blank">Establecer Nueva Contraseña</a>
                        </div>
                        <p style="font-size: 14px; color: #6b7280;">Si tú no realizaste esta solicitud, puedes ignorar este mensaje con total seguridad; tu cuenta se mantendrá protegida.</p>
                    </div>
                    <div class="email-footer">
                        <p style="margin: 0;">Proyecto de Tesina - Sexto Año | Sistema CRECER</p>
                        <p style="margin: 5px 0 0 0;">Este es un mensaje automático generado por el servidor de autenticación.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html_content, "html"))

        # Establecer conexión segura TLS con el servidor SMTP de Gmail y proceder al envío
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, user_email, msg.as_string())
        server.quit()
        
        print(f"[CRECER Success]: Correo con token oobCode generado y enviado con éxito a {user_email}")
        return jsonify({'message': 'Correo de recuperación con enlace seguro enviado con éxito'}), 200

    except Exception as e:
        error_general = str(e)
        print(f"[Error Crítico en Backend CRECER]: {error_general}")
        return jsonify({'error': f'Error interno del servidor al procesar el correo: {error_general}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)