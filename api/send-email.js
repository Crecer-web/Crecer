export default async function handler(req, res) {
  // Manejo de peticiones preflight CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      status: 'error', 
      message: 'Método no permitido. Utiliza POST.' 
    });
  }

  const { email, tokenRecuperacion } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ 
      status: 'error', 
      message: 'El correo electrónico es requerido y debe ser un texto válido.' 
    });
  }

  if (!tokenRecuperacion || typeof tokenRecuperacion !== 'string') {
    return res.status(400).json({ 
      status: 'error', 
      message: 'El token de recuperación es requerido.' 
    });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@tu-dominio-verificado.com";
  const senderName = process.env.BREVO_SENDER_NAME || "CRECER Plataforma";

  if (!apiKey) {
    console.error("Error crítico: BREVO_API_KEY no está configurada en Vercel.");
    return res.status(500).json({ 
      status: 'error', 
      message: 'Configuración interna del servidor incompleta. Contacta al administrador.' 
    });
  }

  const templateId = parseInt(process.env.BREVO_TEMPLATE_ID || '1', 10);
  const baseUrl = process.env.APP_BASE_URL || 'https://crecer-web.vercel.app';
  const linkRecuperacion = `${baseUrl}/reset-password.html?token=${encodeURIComponent(tokenRecuperacion)}`;

  const datosEnvio = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [{ email: email.trim().toLowerCase() }],
    templateId: templateId,
    params: {
      link_recuperacion: linkRecuperacion
    }
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(datosEnvio)
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ 
        status: 'success', 
        message: 'Correo de recuperación enviado con éxito.', 
        messageId: data.messageId 
      });
    } else {
      console.error("Error devuelto por la API de Brevo:", data);
      return res.status(response.status).json({ 
        status: 'error', 
        message: data.message || 'Error al comunicarse con el servidor de correo.', 
        details: data 
      });
    }

  } catch (error) {
    console.error("Error no controlado en Serverless Function send-email:", error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Error interno de red o servidor al enviar el correo.', 
      error: error.message 
    });
  }
}