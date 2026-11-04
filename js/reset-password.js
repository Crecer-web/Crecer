/* =================================================================
   SISTEMA AVANZADO DE RESTABLECIMIENTO DE CONTRASEÑA - CRECER
   ================================================================= */

import { auth } from './firebase-config.js';
import { confirmPasswordReset, verifyPasswordResetCode } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { mostrarToast } from './global.js';

// Extracción estricta de parámetros en la URL para capturar el oobCode de Firebase
const urlParams = new URLSearchParams(window.location.search);
const oobCode = urlParams.get('oobCode');

document.addEventListener('DOMContentLoaded', async () => {
    const formRestaurar = document.getElementById('resetPasswordForm');
    const btnActualizar = document.getElementById('btnActualizar');
    const inputPassword = document.getElementById('newPassword');
    const inputConfirm = document.getElementById('confirmPassword');

    // Validación crítica de seguridad: Si no hay oobCode, el enlace no es legítimo
    if (!oobCode) {
        console.error("[Seguridad CRECER]: Intento de acceso sin código de verificación oobCode.");
        mostrarToast('⚠️ Enlace de recuperación inválido o expirado.', 'danger');
        setTimeout(() => { 
            window.location.href = 'login.html'; 
        }, 3500);
        return;
    }

    // Comprobación de validez del código directamente con los servidores de Firebase
    try {
        await verifyPasswordResetCode(auth, oobCode);
        console.log("[Seguridad CRECER]: Código oobCode verificado y válido.");
    } catch (error) {
        console.error("[Error de Validación Firebase]:", error);
        mostrarToast('⚠️ El enlace de recuperación ha expirado o ya fue utilizado previamente.', 'danger');
        setTimeout(() => { 
            window.location.href = 'login.html'; 
        }, 4000);
        return;
    }

    // Manejador del evento Submit para procesar el cambio de contraseña
    if (formRestaurar) {
        formRestaurar.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nuevaClave = inputPassword ? inputPassword.value.trim() : '';
            const repetirClave = inputConfirm ? inputConfirm.value.trim() : '';

            // Validaciones locales exhaustivas de longitud y coincidencia
            if (!nuevaClave || !repetirClave) {
                mostrarToast('Por favor, completa todos los campos obligatorios.', 'warning');
                return;
            }

            if (nuevaClave.length < 6) {
                mostrarToast('La nueva contraseña debe contener al menos 6 caracteres.', 'warning');
                if (inputPassword) inputPassword.focus();
                return;
            }

            if (nuevaClave !== repetirClave) {
                mostrarToast('Las contraseñas ingresadas no coinciden entre sí.', 'danger');
                if (inputConfirm) inputConfirm.focus();
                return;
            }

            // Feedback visual dinámico de procesamiento en curso
            if (btnActualizar) {
                btnActualizar.disabled = true;
                btnActualizar.textContent = 'Actualizando credenciales... ⏳';
            }

            try {
                // Ejecución oficial de la actualización de contraseña en Firebase Auth
                await confirmPasswordReset(auth, oobCode, nuevaClave);
                
                mostrarToast('¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión...', 'success');
                
                // Limpieza de campos por seguridad
                formRestaurar.reset();

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);

            } catch (error) {
                console.error("[Error Crítico al Actualizar Credencial]:", error);
                mostrarToast(`Error al actualizar: ${error.message}`, 'danger');
                
                if (btnActualizar) {
                    btnActualizar.disabled = false;
                    btnActualizar.textContent = 'Actualizar Contraseña';
                }
            }
        });
    }
});