// api/chat-ia.js - Integración con Groq (Llama 3)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Método no permitido' });

  const { prompt, contextoUsuario } = req.body || {};
  if (!prompt) return res.status(400).json({ status: 'error', message: 'Escribe un mensaje.' });

  // Usamos GROQ_API_KEY en lugar de GEMINI_API_KEY
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ status: 'error', message: 'Falta GROQ_API_KEY en Vercel.' });

  const systemMessage = `Eres CrecerIA, un asistente virtual educativo amable e inteligente integrado en la app escolar CRECER. Responde de forma clara y directa en español.${contextoUsuario ? ` Contexto del estudiante: ${JSON.stringify(contextoUsuario)}` : ''}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ status: 'error', message: data.error?.message || 'Error en la API de Groq.' });
    }

    const respuestaIA = data.choices?.[0]?.message?.content || "Sin respuesta.";
    return res.status(200).json({ status: 'success', respuesta: respuestaIA });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
  }
}