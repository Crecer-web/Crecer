// api/chat-ia.js - Servidor Serverless integrado con Groq para CrecerIA
module.exports = async (req, res) => {
  // 1. Configuración de cabeceras CORS para permitir peticiones desde el frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a la petición preflight de CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validar que únicamente se procesen peticiones HTTP POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: 'Método no permitido. Utiliza POST.'
    });
  }

  // 2. Extraer y validar el prompt y contexto enviados por el usuario
  const { prompt, contextoUsuario } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({
      status: 'error',
      message: 'Escribe un mensaje para poder procesarlo.'
    });
  }

  // 3. Obtener la clave de API desde las variables de entorno de Vercel
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      status: 'error',
      message: 'Falta la variable GROQ_API_KEY en las variables de entorno de Vercel.'
    });
  }

  // 4. Construir la instrucción del sistema agregando el contexto si existe
  let systemMessage = 'Eres CrecerIA, un asistente virtual educativo amable e inteligente integrado en la app escolar CRECER. Responde de forma clara y directa en español.';
  
  if (contextoUsuario) {
    systemMessage += ` Contexto del estudiante: ${JSON.stringify(contextoUsuario)}`;
  }

  // 5. Consumir la API de Groq
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt.trim()
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    // Validar si la API devolvió algún error HTTP (ejemplo: 401, 429, etc.)
    if (!response.ok) {
      return res.status(response.status).json({
        status: 'error',
        message: data.error?.message || 'Ocurrió un error al comunicarse con la API de Groq.'
      });
    }

    // 6. Extraer y retornar la respuesta generada por la IA
    const respuestaIA = data.choices?.[0]?.message?.content || 'Sin respuesta generada por la IA.';

    return res.status(200).json({
      status: 'success',
      respuesta: respuestaIA
    });

  } catch (error) {
    // Manejo de errores imprevistos (pérdida de red, timeout, etc.)
    return res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al procesar la solicitud.',
      detalle: error.message
    });
  }
};