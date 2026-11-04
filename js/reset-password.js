/* =================================================================
   SISTEMA DE RESTABLECIMIENTO Y EXPIRACIÓN EN 10 MINUTOS - CRECER
   ================================================================= */

import { auth } from './firebase-config.js';
import { confirmPasswordReset, verifyPasswordResetCode } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { mostrarToast } from './global.js';

// Extraer parámetros oobCode y tstamp de la URL
const urlParams = new URLSearchParams(window.location.search);
const oobCode = urlParams.get('oobCode');
const timeStampParam = urlParams.get('tstamp');

// Tiempo límite de caducidad: 10 minutos (600.000 ms)
const EXPIRATION_LIMIT_MS = 10 * 60 * 1000;

document.addEventListener('DOMContentLoaded', async () => {
    const formRestaurar = document.getElementById('resetPasswordForm');
    const btnActualizar = document.getElementById('btnActualizar');
    const inputPassword = document.getElementById('newPassword');
    const inputConfirm = document.getElementById('confirmPassword');

    // 1. Verificación del parámetro de seguridad oobCode
    if (!oobCode) {
        console.warn("[Seguridad CRECER]: Entrando a reset-password sin código oobCode en la URL.");
        mostrarToast('⚠️ Debes acceder desde el enlace enviado a tu correo.', 'warning');
        
        // Si no hay oobCode, deshabilitar el botón para evitar envíos vacíos
        if (btnActualizar) {
            btnActualizar.disabled = true;
            btnActualizar.textContent = 'Enlace Inválido o Ausente';
        }
        return;
    }

    // 2. Control de expiración del enlace a los 10 minutos
    if (timeStampParam) {
        const creationTime = parseInt(timeStampParam, 10);
        const currentTime = Date.now();

        if (!isNaN(creationTime) && (currentTime - creationTime) > EXPIRATION_LIMIT_MS) {
            console.error("[Seguridad CRECER]: El token ha superado la ventana de 10 minutos.");
            mostrarToast('⚠️ El enlace ha caducado (pasaron más de 10 minutos). Solicita uno nuevo.', 'danger');
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

    // 3. Verificación del token con los servidores de Firebase
    try {
        await verifyPasswordResetCode(auth, oobCode);
        console.log("[Seguridad CRECER]: Código oobCode verificado correctamente en Firebase.");
    } catch (error) {
        console.error("[Error Firebase Auth Code]:", error);
        mostrarToast('⚠️ El enlace de recuperación es inválido o ya fue utilizado.', 'danger');
        if (btnActualizar) {
            btnActualizar.disabled = true;
            btnActualizar.textContent = 'Código Inválido';
        }
        return;
    }

    // 4. Envío del formulario de actualización
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
                await confirmPasswordReset(auth, oobCode, nuevaClave);
                mostrarToast('¡Contraseña actualizada con éxito! Redirigiendo...', 'success');
                formRestaurar.reset();

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);

            } catch (error) {
                console.error("[Error confirmPasswordReset]:", error);
                mostrarToast(`Error al cambiar contraseña: ${error.message}`, 'danger');
                if (btnActualizar) {
                    btnActualizar.disabled = false;
                    btnActualizar.textContent = 'Actualizar Contraseña';
                }
            }
        });
    }
});