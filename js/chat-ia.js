// js/chat-ia.js

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('chat-ia-toggle');
  const chatWindow = document.getElementById('chat-ia-window');
  const closeBtn = document.getElementById('chat-ia-close');
  const sendBtn = document.getElementById('chat-ia-send');
  const inputField = document.getElementById('chat-ia-input-field');
  const messagesContainer = document.getElementById('chat-ia-messages');

  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => chatWindow.classList.toggle('hidden'));
  closeBtn.addEventListener('click', () => chatWindow.classList.add('hidden'));

  sendBtn.addEventListener('click', enviarMensaje);
  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enviarMensaje();
  });

  async function enviarMensaje() {
    const texto = inputField.value.trim();
    if (!texto) return;

    agregarMensaje(texto, 'user');
    inputField.value = '';

    const indicadorCarga = agregarMensaje('Escribiendo...', 'ia');

    try {
      const res = await fetch('/api/chat-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: texto })
      });

      const data = await res.json();
      indicadorCarga.remove();

      if (res.ok && data.status === 'success') {
        agregarMensaje(data.respuesta, 'ia');
      } else {
        agregarMensaje(data.message || 'Error al conectar con la IA.', 'ia');
      }
    } catch (err) {
      indicadorCarga.remove();
      agregarMensaje('Error de conexión con el backend.', 'ia');
    }
  }

  function agregarMensaje(texto, emisor) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-msg', emisor);
    msgDiv.textContent = texto;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return msgDiv;
  }
});