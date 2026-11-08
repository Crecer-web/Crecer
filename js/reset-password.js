/* =================================================================
   SISTEMA DE RESTABLECIMIENTO DIRECTO SIN SESIÓN OBLIGATORIA - CRECER
   ================================================================= */

import { mostrarToast } from './global.js';

// Captura de parámetros de la URL
const urlParams = new URLSearchParams(window.location.search);
const userEmail = urlParams.get('email');
const timeStampParam = urlParams.get('tstamp');

// Tiempo límite de caducidad: 10 minutos exactos (600.000 ms)
const EXPIRATION_LIMIT_MS = 10 * 60 * 1000;

document.addEventListener('DOMContentLoaded', () => {
    const formRestaurar = document.getElementById('resetPasswordForm');
    const btnActualizar = document.getElementById('btnActualizar');
    const inputPassword = document.getElementById('newPassword');
    const inputConfirm = document.getElementById('confirmPassword');

    console.log("[Seguridad CRECER]: Analizando enlace para:", userEmail);

    // 1. Validar que exista el correo en la URL
    if (!userEmail) {
        console.warn("[Seguridad CRECER]: No se detectó correo en la URL.");
        mostrarToast('⚠️ Enlace inválido o incompleto.', 'danger');
        
        if (btnActualizar) {
            btnActualizar.disabled = true;
            btnActualizar.textContent = 'Enlace Inválido';
        }
        return;
    }

    // 2. Control de expiración del enlace a los 10 minutos
    if (timeStampParam) {
        const creationTime = parseInt(timeStampParam, 10);
        const currentTime = Date.now();

        if (!isNaN(creationTime) && (currentTime - creationTime) > EXPIRATION_LIMIT_MS) {
            console.error("[Seguridad CRECER]: El enlace ha superado la ventana de 10 minutos.");
            mostrarToast('⚠️ El enlace ha caducado (más de 10 minutos). Solicita uno nuevo.', 'danger');
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

    // Enlace válido dentro del tiempo: se habilita el formulario
    if (btnActualizar) {
        btnActualizar.disabled = false;
        btnActualizar.textContent = 'Actualizar Contraseña';
    }

    // 3. Envío del formulario de actualización
    if (formRestaurar) {
        formRestaurar.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nuevaClave = inputPassword ? inputPassword.value.trim() : '';
            const repetirClave = inputConfirm ? inputConfirm.value.trim() : '';

            if (!nuevaClave || !repetirClave) {
                mostrarToast('Por favor completa ambos campos.', 'warning');
                return;
            }

            if (nuevaClave.length < 6) {
                mostrarToast('La contraseña debe tener al menos 6 caracteres.', 'warning');
                if (inputPassword) inputPassword.focus();
                return;
            }

            if (nuevaClave !== repetirClave) {
                mostrarToast('Las contraseñas no coinciden.', 'danger');
                if (inputConfirm) inputConfirm.focus();
                return;
            }

            if (btnActualizar) {
                btnActualizar.disabled = true;
                btnActualizar.textContent = 'Actualizando contraseña... ⏳';
            }

            try {
                // Notificación visual de éxito y simulación de procesamiento
                mostrarToast('¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión...', 'success');
                formRestaurar.reset();

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);

            } catch (error) {
                console.error("[Error actualizando contraseña]:", error);
                mostrarToast(`Error al actualizar la contraseña: ${error.message}`, 'danger');
                
                if (btnActualizar) {
                    btnActualizar.disabled = false;
                    btnActualizar.textContent = 'Actualizar Contraseña';
                }
            }
        });
    }
});