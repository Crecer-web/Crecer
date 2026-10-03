// api/chat-ia.js

export default async function handler(req, res) {
  // Manejo de CORS si se requiere
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Método no permitido' });
  }

  const { prompt, contextoUsuario } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ status: 'error', message: 'Escribe una pregunta o mensaje.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ status: 'error', message: 'Falta la clave GEMINI_API_KEY en Vercel.' });
  }

  const systemInstruction = `Eres "CrecerIA", un tutor académico integrado en la agenda estudiantil CRECER.
Tu función es ayudar a los estudiantes a organizar sus tareas, dar consejos de estudio y resolver dudas sobre sus exámenes.
Responde siempre de forma motivadora, concisa y en español.${contextoUsuario ? ` Contexto actual del estudiante: ${JSON.stringify(contextoUsuario)}` : ''}`;

  try {
    // Usamos el modelo estable gemini-1.5-flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nPregunta del alumno: ${prompt}` }]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error devuelto por la API de Gemini:", data);
      return res.status(response.status).json({ 
        status: 'error', 
        message: data.error?.message || 'Error al procesar la consulta con Gemini.' 
      });
    }

    const respuestaIA = data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude procesar la respuesta en este momento.";

    return res.status(200).json({ status: 'success', respuesta: respuestaIA });

  } catch (error) {
    console.error("Error en Serverless Function:", error);
    return res.status(500).json({ status: 'error', message: 'Error interno en el servidor.' });
  }
}