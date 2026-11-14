/* =================================================================
   SISTEMA DE ENVÍO DE CORREO DE RECUPERACIÓN (FLASK + SMTP) - CRECER
   ================================================================= */

import { mostrarToast } from './global.js';

function aplicarTemaDirecto(tema) {
    const themeToggle = document.getElementById('themeToggle');

    if (tema === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (themeToggle) themeToggle.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        if (themeToggle) themeToggle.textContent = '🌙';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let themeToggle = document.getElementById('themeToggle');
    const formRecuperar = document.getElementById('recuperarForm');
    const btnEnviar = document.getElementById('btnEnviarRecovery');
    const inputEmail = document.getElementById('recoveryEmail');

    // Inicialización del tema
    const temaGuardado = localStorage.getItem('theme');
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const temaInicial = temaGuardado ? temaGuardado : (prefiereDark ? 'dark' : 'light');
    
    aplicarTemaDirecto(temaInicial);

    if (themeToggle) {
        const nuevoBtn = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(nuevoBtn, themeToggle);
        themeToggle = nuevoBtn;

        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const esOscuroActual = document.documentElement.getAttribute('data-theme') === 'dark' || 
                                   document.body.getAttribute('data-theme') === 'dark';
            
            const nuevoTema = esOscuroActual ? 'light' : 'dark';
            aplicarTemaDirecto(nuevoTema);
        });
    }

    if (!formRecuperar) return;

    formRecuperar.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = inputEmail ? inputEmail.value.trim() : '';

        if (!email) {
            mostrarToast('Por favor, ingresa tu correo electrónico.', 'warning');
            if (inputEmail) inputEmail.focus();
            return;
        }

        if (btnEnviar) {
            btnEnviar.disabled = true;
            btnEnviar.textContent = 'Enviando instrucciones...';
        }

        try {
            const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
            const apiUrl = isLocal ? 'http://127.0.0.1:5000/api/send-reset-email' : '/api/send-reset-email';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, is_local: isLocal })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'No se pudo procesar la solicitud en el servidor.');
            }

            mostrarToast('Correo enviado con éxito. Revisa tu bandeja principal.', 'success');
            formRecuperar.reset();

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);

        } catch (error) {
            console.error('[Error en Recuperación]:', error);
            mostrarToast(`Error: ${error.message}`, 'danger');
        } finally {
            if (btnEnviar) {
                btnEnviar.disabled = false;
                btnEnviar.textContent = 'Enviar Instrucciones';
            }
        }
    });
});