/* =================================================================
   SISTEMA DE RESTABLECIMIENTO Y EXPIRACIÓN EN 10 MINUTOS - CRECER
   ================================================================= */

import { auth } from './firebase-config.js';
import { confirmPasswordReset, verifyPasswordResetCode } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { mostrarToast } from './global.js';

// Captura robusta de parámetros (soporta tanto URL estándar como hashes por redirección móvil)
const getQueryParams = () => {
    let search = window.location.search;
    // Si el navegador móvil o Gmail metió un hash o redireccionó extraño, buscar en el hash
    if (!search.includes('oobCode') && window.location.hash.includes('oobCode')) {
        search = '?' + window.location.hash.split('?')[1];
    }
    return new URLSearchParams(search);
};

const urlParams = getQueryParams();
const oobCode = urlParams.get('oobCode');
const timeStampParam = urlParams.get('tstamp');

// Tiempo límite de caducidad: 10 minutos exactos (600.000 ms)
const EXPIRATION_LIMIT_MS = 10 * 60 * 1000;

document.addEventListener('DOMContentLoaded', async () => {
    const formRestaurar = document.getElementById('resetPasswordForm');
    const btnActualizar = document.getElementById('btnActualizar');
    const inputPassword = document.getElementById('newPassword');
    const inputConfirm = document.getElementById('confirmPassword');

    console.log("[Seguridad CRECER]: Analizando parámetros de la URL móvil:", window.location.href);

    // 1. Verificación robusta del parámetro oobCode
    if (!oobCode) {
        console.warn("[Seguridad CRECER]: No se detectó oobCode en la URL.");
        mostrarToast('⚠️ Enlace inválido. Asegúrate de abrir el link completo desde tu correo.', 'danger');
        
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

    // 3. Verificación del token con los servidores de Firebase
    try {
        await verifyPasswordResetCode(auth, oobCode);
        console.log("[Seguridad CRECER]: Código oobCode verificado correctamente en Firebase.");
        
        // Si pasa la verificación, habilitamos el botón por completo
        if (btnActualizar) {
            btnActualizar.disabled = false;
            btnActualizar.textContent = 'Actualizar Contraseña';
        }
    } catch (error) {
        console.error("[Error Firebase Auth Code]:", error);
        mostrarToast('⚠️ El enlace de recuperación es inválido o ya fue utilizado.', 'danger');
        if (btnActualizar) {
            btnActualizar.disabled = true;
            btnActualizar.textContent = 'Código Inválido';
        }
        return;
    }

    // 4. Envío del formulario de actualización de contraseña
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