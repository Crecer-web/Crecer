// api/chat-ia.js - Función Serverless para Vercel integrada con Groq (Llama 3.1)
export default async function handler(req, res) {
  // 1. Configuración de cabeceras CORS para permitir peticiones HTTP desde el frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a peticiones Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Permitir únicamente solicitudes con el método POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: 'Método no permitido. Usa POST.'
    });
  }

  // 2. Extraer y validar los datos enviados en el cuerpo de la petición (body)
  const { prompt, contextoUsuario } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({
      status: 'error',
      message: 'El campo "prompt" es obligatorio y debe contener texto válido.'
    });
  }

  // 3. Obtener la clave de API (GROQ_API_KEY) desde las variables de entorno de Vercel
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      status: 'error',
      message: 'Falta la variable GROQ_API_KEY en la configuración de Vercel.'
    });
  }

  // 4. Formatear la instrucción de sistema para CrecerIA
  let systemMessage = 'Eres CrecerIA, un asistente virtual educativo amable e inteligente integrado en la app escolar CRECER. Responde de forma clara y directa en español.';
  if (contextoUsuario) {
    systemMessage += ` Contexto del estudiante: ${JSON.stringify(contextoUsuario)}`;
  }

  // 5. Petición HTTP hacia la API de Groq
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

    // Validar si la respuesta HTTP de la API de Groq no fue exitosa
    if (!response.ok) {
      return res.status(response.status).json({
        status: 'error',
        message: data.error?.message || 'Error al comunicarse con la API de Groq.'
      });
    }

    // Extraer el texto generado por la IA
    const respuestaIA = data.choices?.[0]?.message?.content || 'Sin respuesta generada por la IA.';

    // Retornar la respuesta exitosa al frontend
    return res.status(200).json({
      status: 'success',
      respuesta: respuestaIA
    });

  } catch (error) {
    // Captura de errores inesperados de conexión o del servidor
    return res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor.',
      detalle: error.message
    });
  }
}