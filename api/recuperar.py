from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import os

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Obtener el tamaño de los datos enviados desde el frontend (JavaScript)
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Decodificar el JSON recibido del cliente
            data = json.loads(post_data.decode('utf-8'))
            correo_destino = data.get('email')
            
            # Validar que se haya proporcionado un correo electrónico
            if not correo_destino:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'No se proporcionó un correo electrónico.'}).encode('utf-8'))
                return

            # =================================================================
            # CONFIGURACIÓN DE LA API DE RESEND SEGURA (Variables de entorno)
            # =================================================================
            RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
            
            if not RESEND_API_KEY:
                raise Exception("La variable de entorno RESEND_API_KEY no está configurada en el servidor.")

            api_url = "https://api.resend.com/emails"

            # Estructura completa del correo HTML profesional para la plataforma CRECER
            payload = {
                "from": "Plataforma CRECER <onboarding@resend.dev>",
                "to": [correo_destino],
                "subject": "CRECER - Recuperación de Contraseña",
                "html": """
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Recuperación de Contraseña - CRECER</title>
                </head>
                <body style="font-family: Arial, sans-serif; background-color: #f1f5f9; color: #0f172a; padding: 30px; margin: 0;">
                    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 35px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        
                        <!-- Encabezado -->
                        <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 25px;">
                            <h1 style="color: #0f172a; font-size: 24px; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">CRECER</h1>
                            <p style="color: #475569; font-size: 14px; margin: 5px 0 0 0;">Plataforma de Gestión Académica</p>
                        </div>

                        <!-- Cuerpo del mensaje -->
                        <h2 style="color: #2563eb; font-size: 18px; margin-top: 0;">Solicitud de Recuperación de Contraseña</h2>
                        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hola,</p>
                        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Has solicitado restablecer tu contraseña en la plataforma institucional <strong>CRECER</strong>.</p>
                        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Para continuar con el proceso de manera segura, haz clic en el siguiente botón:</p>
                        
                        <!-- Botón de acción -->
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="https://crecer-jet.vercel.app/login.html" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);">Restablecer Contraseña</a>
                        </div>

                        <p style="font-size: 14px; line-height: 1.5; color: #475569;">Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
                        <p style="font-size: 13px; color: #2563eb; word-break: break-all; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">https://crecer-jet.vercel.app/login.html</p>

                        <!-- Pie de página -->
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center;">
                            <p style="font-size: 12px; color: #94a3b8; margin: 0;">Si no solicitaste este cambio, puedes ignorar este mensaje de manera segura.</p>
                            <p style="font-size: 12px; color: #94a3b8; margin: 5px 0 0 0;">&copy; 2026 Plataforma CRECER &bull; Todos los derechos reservados.</p>
                        </div>

                    </div>
                </body>
                </html>
                """
            }

            # Configurar la petición HTTP hacia la API de Resend
            req = urllib.request.Request(
                api_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    'Authorization': f'Bearer {RESEND_API_KEY}',
                    'Content-Type': 'application/json'
                },
                method='POST'
            )

            # Enviar la solicitud a los servidores de Resend
            with urllib.request.urlopen(req) as response:
                response_body = response.read().decode('utf-8')
                
                # Responder al frontend de manera exitosa
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'message': 'Correo enviado correctamente a la bandeja principal.'}).encode('utf-8'))

        except Exception as e:
            # Capturar cualquier error imprevisto del servidor e informarlo
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))