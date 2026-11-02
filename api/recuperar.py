from http.server import BaseHTTPRequestHandler
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Obtener el tamaño de los datos enviados desde el frontend (JavaScript)
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Decodificar el JSON recibido
            data = json.loads(post_data.decode('utf-8'))
            correo_destino = data.get('email')
            
            if not correo_destino:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'No se proporcionó un correo electrónico.'}).encode('utf-8'))
                return

            # ==========================================
            # CONFIGURACIÓN DE TU CUENTA DE GMAIL
            # ==========================================
            remitente = "evolucion.crecer@gmail.com"  
            password_app = "vrnzkzwxyrpbfdrk"  
            
            asunto = "CRECER - Recuperación de Contraseña"
            
            mensaje = MIMEMultipart("alternative")
            mensaje["Subject"] = asunto
            mensaje["From"] = f"Plataforma CRECER <{remitente}>"
            mensaje["To"] = correo_destino

            # Estructura del correo HTML profesional que irá a la bandeja principal
            # CORRECCIÓN: Reemplaza 'tu-proyecto.vercel.app' con tu dominio real de Vercel
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #0f172a; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <h2 style="color: #2563eb; margin-top: 0;">CRECER &bull; Gestión Académica</h2>
                        <p>Hola,</p>
                        <p>Has solicitado restablecer tu contraseña en la plataforma institucional <strong>CRECER</strong>.</p>
                        <p>Para continuar con el proceso de recuperación, haz clic en el siguiente botón:</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="https://crecer-jet.vercel.app/login.html" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
                        </p>
                        <p style="font-size: 0.85rem; color: #64748b;">Si no solicitaste este cambio, puedes ignorar este mensaje de manera segura.</p>
                    </div>
                </body>
            </html>
            """

            mensaje.attach(MIMEText(html_content, "html"))

            # Conexión al servidor SMTP seguro de Gmail (Puerto 465 con SSL)
            servidor = smtplib.SMTP_SSL("smtp.gmail.com", 465)
            servidor.login(remitente, password_app)
            servidor.sendmail(remitente, correo_destino, mensaje.as_string())
            servidor.quit()

            # Responder al frontend que todo salió exitoso
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'message': 'Correo enviado a la bandeja principal'}).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))