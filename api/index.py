import os
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Carga las variables de entorno locales si existe el archivo .env
if os.path.exists('.env'):
    load_dotenv()

app = Flask(__name__)
CORS(app)  # Habilita el intercambio de recursos de origen cruzado para desarrollo local

# Credenciales y configuraciones iniciales del servidor
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

@app.route('/api/send-reset-email', methods=['POST'])
def send_reset_email():
    """
    Endpoint principal para gestionar el restablecimiento de credenciales.
    Se comunica con Google Firebase para generar el enlace con el oobCode único
    y utiliza Gmail SMTP para enviar un correo con diseño corporativo avanzado.
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
        firebase_api_key = os.environ.get('FIREBASE_API_KEY')

        if not sender_email or not sender_password:
            return jsonify({'error': 'Faltan configurar las credenciales de correo (EMAIL_USER / EMAIL_PASS)'}), 500

        if not firebase_api_key:
            return jsonify({'error': 'Falta configurar la clave de API de Firebase (FIREBASE_API_KEY)'}), 500

        # Definir la URL de redirección según el entorno de ejecución
        base_url = 'http://127.0.0.1:5500/reset-password.html' if is_local else 'https://crecer-jet.vercel.app/reset-password.html'

        # Petición oficial a la REST API de Firebase Auth para generar el enlace con el oobCode
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
            error_message = error_data.get('error', {}).get('message', 'Error desconocido al procesar con Firebase')
            print(f"[Error Firebase Auth]: {error_message}")
            return jsonify({'error': f'Firebase rechazó la solicitud: {error_message}'}), 400

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
                        <p>Para proceder con el cambio seguro de tus credenciales, haz clic en el siguiente botón:</p>
                        <div class="btn-container">
                            <a href="{base_url}" class="btn-reset" target="_blank">Establecer Nueva Contraseña</a>
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
        
        return jsonify({'message': 'Correo de recuperación con enlace seguro enviado con éxito'}), 200

    except Exception as e:
        print(f"[Error Crítico en Backend CRECER]: {str(e)}")
        return jsonify({'error': f'Error interno del servidor al procesar el correo: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)