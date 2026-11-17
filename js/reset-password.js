/* =================================================================
   SISTEMA DE CAMBIO DE CONTRASEÑA (FLASK SMTP + FIREBASE) - CRECER (Unificado)
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

const urlParams = new URLSearchParams(window.location.search);
const userEmail = urlParams.get('email');
const timeStampParam = urlParams.get('tstamp');

const EXPIRATION_LIMIT_MS = 10 * 60 * 1000; // 10 minutos exactos de validez

document.addEventListener('DOMContentLoaded', () => {
    let themeToggle = document.getElementById('themeToggle');
    const formRestaurar = document.getElementById('resetPasswordForm');
    const btnActualizar = document.getElementById('btnActualizar');
    const inputPassword = document.getElementById('newPassword');
    const inputConfirm = document.getElementById('confirmPassword');

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

    if (!userEmail) {
        mostrarToast('Enlace de restablecimiento inválido o incompleto.', 'danger');
        
        if (btnActualizar) {
            btnActualizar.disabled = true;
            btnActualizar.textContent = 'Enlace Inválido';
        }
        return;
    }

    if (timeStampParam) {
        const creationTime = parseInt(timeStampParam, 10);
        const tiempoActual = Date.now();

        if (isNaN(creationTime) || (tiempoActual - creationTime) > EXPIRATION_LIMIT_MS) {
            mostrarToast('El enlace ha caducado (duración máxima de 10 minutos). Solicita uno nuevo.', 'danger');
            
            if (btnActualizar) {
                btnActualizar.disabled = true;
                btnActualizar.textContent = 'Enlace Expirado';
            }

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 4000);
            return;
        }
    }

    if (btnActualizar) {
        btnActualizar.disabled = false;
        btnActualizar.textContent = 'Actualizar Contraseña';
    }

    if (formRestaurar) {
        formRestaurar.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nuevaClave = inputPassword ? inputPassword.value.trim() : '';
            const repetirClave = inputConfirm ? inputConfirm.value.trim() : '';

            if (!nuevaClave || !repetirClave) {
                mostrarToast('Por favor completa ambos campos obligatorios.', 'warning');
                return;
            }

            if (nuevaClave.length < 8) {
                mostrarToast('La contraseña debe contener al menos 8 caracteres.', 'warning');
                if (inputPassword) inputPassword.focus();
                return;
            }

            if (nuevaClave !== repetirClave) {
                mostrarToast('Las contraseñas ingresadas no coinciden.', 'danger');
                if (inputConfirm) inputConfirm.focus();
                return;
            }

            if (btnActualizar) {
                btnActualizar.disabled = true;
                btnActualizar.textContent = 'Actualizando en Firebase...';
            }

            try {
                const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
                const apiUrl = isLocal ? 'http://127.0.0.1:5000/api/update-password' : '/api/update-password';

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: userEmail,
                        new_password: nuevaClave,
                        tstamp: timeStampParam
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'No se pudo actualizar la contraseña en el servidor.');
                }

                mostrarToast('Contraseña establecida con éxito. Ya puedes iniciar sesión.', 'success');
                formRestaurar.reset();

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3500);

            } catch (error) {
                mostrarToast(`Error: ${error.message}`, 'danger');

                if (btnActualizar) {
                    btnActualizar.disabled = false;
                    btnActualizar.textContent = 'Actualizar Contraseña';
                }
            }
        });
    }
});