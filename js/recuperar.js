/* =================================================================
   SISTEMA DE RECUPERACIÓN DE CONTRASEÑA - PLATAFORMA CRECER
   ================================================================= */

import { mostrarToast } from './global.js';

function esEmailValido(email) {
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regexEmail.test(email);
}

async function procesarRecuperacion(event) {
    event.preventDefault();

    const emailInput = document.getElementById('recoveryEmail');
    const btnEnviar = document.getElementById('btnEnviarRecovery');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
        mostrarToast('Por favor, ingresa tu correo electrónico.', 'danger');
        if (emailInput) emailInput.focus();
        return;
    }

    if (!esEmailValido(email)) {
        mostrarToast('Ingresa un formato de correo electrónico válido.', 'warning');
        if (emailInput) emailInput.focus();
        return;
    }

    let textoOriginalBoton = 'Enviar Instrucciones';
    if (btnEnviar) {
        textoOriginalBoton = btnEnviar.textContent;
        btnEnviar.disabled = true;
        btnEnviar.textContent = 'Enviando correo real... ⏳';
    }

    try {
        // Detecta automáticamente si estás en local o en producción en Vercel
        const esLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
        const urlAPI = esLocal ? 'http://127.0.0.1:5000/api/send-reset-email' : '/api/send-reset-email';
        const linkRedireccion = esLocal ? 'http://127.0.0.1:5500/reset-password.html' : 'https://crecer-jet.vercel.app/reset-password.html';

        const response = await fetch(urlAPI, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                reset_link: linkRedireccion
            })
        });

        const textResponse = await response.text();
        let resultado;
        try {
            resultado = JSON.parse(textResponse);
        } catch (e) {
            throw new Error(`Respuesta inválida del servidor: ${textResponse.substring(0, 100)}`);
        }

        if (response.ok) {
            mostrarToast('¡Correo de recuperación enviado con éxito! Revisa tu bandeja.', 'success');
            if (emailInput) emailInput.value = '';

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        } else {
            throw new Error(resultado.error || 'No se pudo procesar la solicitud.');
        }

    } catch (error) {
        console.error("[CRECER Error - Recuperación]:", error);
        mostrarToast(`Error: ${error.message}`, 'danger');
    } finally {
        if (btnEnviar) {
            btnEnviar.disabled = false;
            btnEnviar.textContent = textoOriginalBoton;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const recuperarForm = document.getElementById('recuperarForm');
    if (recuperarForm) {
        recuperarForm.addEventListener('submit', procesarRecuperacion);
    }
});