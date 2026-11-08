/* =================================================================
   SISTEMA DE ENVÍO DE CORREO DE RECUPERACIÓN - CRECER
   ================================================================= */

import { mostrarToast } from './global.js';

document.addEventListener('DOMContentLoaded', () => {
    const formRecuperar = document.getElementById('recuperarForm');
    const btnEnviar = document.getElementById('btnEnviarRecovery');
    const inputEmail = document.getElementById('recoveryEmail');

    if (!formRecuperar) return;

    formRecuperar.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = inputEmail ? inputEmail.value.trim() : '';

        // Validaciones básicas de entrada
        if (!email) {
            mostrarToast('Por favor, ingresa tu correo electrónico.', 'warning');
            if (inputEmail) inputEmail.focus();
            return;
        }

        // Expresión regular para validar formato de correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            mostrarToast('Por favor, ingresa un correo electrónico válido.', 'warning');
            if (inputEmail) inputEmail.focus();
            return;
        }

        // Deshabilitar botón y mostrar estado de carga
        if (btnEnviar) {
            btnEnviar.disabled = true;
            btnEnviar.textContent = 'Enviando instrucciones... ⏳';
        }

        try {
            // Detectar automáticamente si estamos en entorno local o producción en Vercel
            const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
            
            // Endpoint del backend Flask (en local apunta al puerto 5000 o ruta relativa, en Vercel a la ruta de la API)
            const apiUrl = isLocal ? 'http://127.0.0.1:5000/api/send-reset-email' : '/api/send-reset-email';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    is_local: isLocal
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'No se pudo procesar la solicitud en el servidor.');
            }

            // Éxito en el envío del correo corporativo
            mostrarToast('¡Correo enviado con éxito! Revisa tu bandeja de entrada (y spam).', 'success');
            formRecuperar.reset();

            // Redirigir al login después de unos segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 4000);

        } catch (error) {
            console.error('[Error en Recuperación]:', error);
            mostrarToast(`Error: ${error.message}`, 'danger');

            // Restaurar botón
            if (btnEnviar) {
                btnEnviar.disabled = false;
                btnEnviar.textContent = 'Enviar Instrucciones';
            }
        }
    });
});