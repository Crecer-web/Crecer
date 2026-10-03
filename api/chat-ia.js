// api/chat-ia.js

export default async function handler(req, res) {
  // Manejo de cabeceras CORS para peticiones seguras entre cliente y backend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder inmediatamente a las peticiones de verificación previa OPTIONS (Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validar que únicamente se procesen solicitudes mediante el método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Método no permitido' });
  }

  // Extraer el mensaje y el contexto del cuerpo de la petición con fallback seguro
  const { prompt, contextoUsuario } = req.body || {};

  // Validar que el prompt no llegue vacío
  if (!prompt) {
    return res.status(400).json({ status: 'error', message: 'Escribe una pregunta o mensaje.' });
  }

  // Obtener la clave de API desde las variables de entorno de Vercel
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ status: 'error', message: 'Error de configuración: Falta la clave GEMINI_API_KEY en Vercel.' });
  }

  // Definir las instrucciones de comportamiento y personalidad de la IA (CrecerIA)
  const systemInstruction = `Eres "CrecerIA", un tutor académico integrado en la agenda estudiantil CRECER.
Tu función es ayudar a los estudiantes a organizar sus tareas, dar consejos de estudio y resolver dudas sobre sus exámenes.
Responde siempre de forma motivadora, concisa y en español.${contextoUsuario ? ` Contexto actual del estudiante: ${JSON.stringify(contextoUsuario)}` : ''}`;

  try {
    // Consulta HTTP a la API de Gemini utilizando el modelo activo gemini-2.5-flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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

    // Procesar la respuesta recibida en formato JSON
    const data = await response.json();

    // Validar si la respuesta de la API devuelve un código de estado de error (p. ej., 400, 403, 500)
    if (!response.ok) {
      console.error("Error devuelto por la API de Gemini:", data);
      return res.status(response.status).json({ 
        status: 'error', 
        message: data.error?.message || 'Error al procesar la consulta con Gemini.' 
      });
    }

    // Extraer la respuesta generada por el modelo
    const respuestaIA = data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude procesar la respuesta en este momento.";

    // Retornar la respuesta al cliente
    return res.status(200).json({ status: 'success', respuesta: respuestaIA });

  } catch (error) {
    console.error("Error en Serverless Function:", error);
    return res.status(500).json({ status: 'error', message: 'Error interno en el servidor.' });
  }
}