// api/chat-ia.js - Función Serverless para Vercel
export default async function handler(req, res) {
  // 1. Cabeceras CORS obligatorias
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a peticiones OPTIONS (Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Permitir solo peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: 'Método no permitido. Usa POST.'
    });
  }

  // 2. Extraer datos del cuerpo de la petición
  const { prompt, contextoUsuario } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({
      status: 'error',
      message: 'El campo "prompt" es obligatorio.'
    });
  }

  // 3. Obtener la API Key de Groq desde las variables de Vercel
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      status: 'error',
      message: 'Falta la variable GROQ_API_KEY en Vercel.'
    });
  }

  // 4. Preparar el mensaje para Groq
  let systemMessage = 'Eres CrecerIA, un asistente virtual educativo amable e inteligente integrado en la app escolar CRECER. Responde de forma clara y directa en español.';
  if (contextoUsuario) {
    systemMessage += ` Contexto del estudiante: ${JSON.stringify(contextoUsuario)}`;
  }

  // 5. Llamada a la API de Groq
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
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt.trim() }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        status: 'error',
        message: data.error?.message || 'Error al comunicarse con Groq.'
      });
    }

    const respuestaIA = data.choices?.[0]?.message?.content || 'Sin respuesta generada por la IA.';

    return res.status(200).json({
      status: 'success',
      respuesta: respuestaIA
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor.',
      detalle: error.message
    });
  }
}