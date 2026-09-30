// api/send-email.js

export default async function handler(req, res) {
  // 1. Permitir únicamente peticiones de tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Método no permitido. Utiliza POST.' });
  }

  const { email, tokenRecuperacion } = req.body;

  // 2. Validación de campos requeridos
  if (!email) {
    return res.status(400).json({ status: 'error', message: 'El correo electrónico es requerido.' });
  }

  // 3. Obtener la API Key guardada de forma segura en Vercel
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error("Error: BREVO_API_KEY no está configurada en Vercel.");
    return res.status(500).json({ status: 'error', message: 'Configuración interna del servidor incompleta.' });
  }

  const templateId = 1;
  const linkRecuperacion = `https://crecer-web.vercel.app/reset-password.html?token=${tokenRecuperacion || ''}`;

  const datosEnvio = {
    to: [{ email: email }],
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
      return res.status(200).json({ status: 'success', message: 'Correo enviado con éxito.', data });
    } else {
      console.error("Error devuelto por la API de Brevo:", data);
      return res.status(response.status).json({ status: 'error', message: data.message || 'Error al comunicarse con el servidor de correo.', error: data });
    }

  } catch (error) {
    console.error("Error en la Serverless Function:", error);
    return res.status(500).json({ status: 'error', message: 'Error interno de red o servidor.', error: error.message });
  }
}