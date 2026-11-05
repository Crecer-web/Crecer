/* =================================================================
   SISTEMA DE RESTABLECIMIENTO Y EXPIRACIÓN EN 10 MINUTOS - CRECER
   ================================================================= */

import { auth } from './firebase-config.js';
import { confirmPasswordReset, verifyPasswordResetCode } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { mostrarToast } from './global.js';

// Extraer parámetros oobCode y tstamp de la URL del enlace recibido por correo
const urlParams = new URLSearchParams(window.location.search);
const oobCode = urlParams.get('oobCode');
const timeStampParam = urlParams.get('tstamp');

// Tiempo límite de caducidad: 10 minutos exactos (600.000 ms)
const EXPIRATION_LIMIT_MS = 10 * 60 * 1000;

document.addEventListener('DOMContentLoaded', async () => {
    const formRestaurar = document.getElementById('resetPasswordForm');
    const btnActualizar = document.getElementById('btnActualizar');
    const inputPassword = document.getElementById('newPassword');
    const inputConfirm = document.getElementById('confirmPassword');

    console.log("[Seguridad CRECER]: Verificando parámetros de acceso a reset-password.");

    // 1. Verificación de presencia del código oobCode
    if (!oobCode) {
        console.warn("[Seguridad CRECER]: Intento de acceso sin oobCode en la URL.");
        mostrarToast('⚠️ Debes acceder desde el enlace enviado a tu correo electrónico.', 'warning');
        
        if (btnActualizar) {
            btnActualizar.disabled = true;
            btnActualizar.textContent = 'Enlace Inválido o Ausente';
        }
        return;
    }

    // 2. Control de expiración por ventana de tiempo (10 minutos)
    if (timeStampParam) {
        const creationTime = parseInt(timeStampParam, 10);
        const currentTime = Date.now();

        if (!isNaN(creationTime) && (currentTime - creationTime) > EXPIRATION_LIMIT_MS) {
            console.error("[Seguridad CRECER]: El token ha superado el límite de 10 minutos.");
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

    // 3. Verificación de validez del token en los servidores de Firebase Auth
    try {
        const emailAsociado = await verifyPasswordResetCode(auth, oobCode);
        console.log("[Seguridad CRECER]: Token oobCode validado correctamente para:", emailAsociado);
    } catch (error) {
        console.error("[Error Firebase Auth Code Verification]:", error);
        mostrarToast('⚠️ El enlace de recuperación es inválido, expiro o ya fue utilizado.', 'danger');
        
        if (btnActualizar) {
            btnActualizar.disabled = true;
            btnActualizar.textContent = 'Código No Válido';
        }
        return;
    }

    // 4. Procesamiento del formulario de cambio de clave
    if (formRestaurar) {
        formRestaurar.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nuevaClave = inputPassword ? inputPassword.value.trim() : '';
            const repetirClave = inputConfirm ? inputConfirm.value.trim() : '';

            if (!nuevaClave || !repetirClave) {
                mostrarToast('Por favor completa ambos campos obligatorios.', 'warning');
                return;
            }

            if (nuevaClave.length < 6) {
                mostrarToast('La contraseña debe tener al menos 6 caracteres.', 'warning');
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
                btnActualizar.textContent = 'Actualizando contraseña... ⏳';
            }

            try {
                await confirmPasswordReset(auth, oobCode, nuevaClave);
                console.log("[Seguridad CRECER]: Contraseña actualizada exitosamente.");
                mostrarToast('¡Contraseña actualizada con éxito! Redirigiendo al login...', 'success');
                formRestaurar.reset();

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);

            } catch (error) {
                console.error("[Error confirmPasswordReset]:", error);
                mostrarToast(`Error al cambiar la contraseña: ${error.message}`, 'danger');
                
                if (btnActualizar) {
                    btnActualizar.disabled = false;
                    btnActualizar.textContent = 'Actualizar Contraseña';
                }
            }
        });
    }
});