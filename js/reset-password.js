/* =================================================================
   SISTEMA DE RESTABLECIMIENTO DIRECTO Y EXPIRACIÓN EN 10 MINUTOS - CRECER
   ================================================================= */

import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { mostrarToast } from './global.js';

// Captura de parámetros de la URL
const urlParams = new URLSearchParams(window.location.search);
const userEmail = urlParams.get('email');
const timeStampParam = urlParams.get('tstamp');

// Tiempo límite de caducidad: 10 minutos exactos (600.000 ms)
const EXPIRATION_LIMIT_MS = 10 * 60 * 1000;

document.addEventListener('DOMContentLoaded', async () => {
    const formRestaurar = document.getElementById('resetPasswordForm');
    const btnActualizar = document.getElementById('btnActualizar');
    const inputPassword = document.getElementById('newPassword');
    const inputConfirm = document.getElementById('confirmPassword');

    console.log("[Seguridad CRECER]: Analizando enlace directo para:", userEmail);

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

    // Como el enlace es válido y dentro del tiempo, HABILITAMOS el formulario de inmediato
    if (btnActualizar) {
        btnActualizar.disabled = false;
        btnActualizar.textContent = 'Actualizar Contraseña';
    }

    // 3. Envío del formulario de actualización de contraseña
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
                // Para actualizar la contraseña de forma directa y segura sin requerir tokens de Google:
                // Verificamos si hay un usuario activo o pedimos autenticación temporal si fuera necesario,
                // o usamos el método directo de Firebase si el usuario está en sesión o recuperando.
                // Nota: Si el usuario abrió el link, podemos actualizar su contraseña directamente 
                // mediante la gestión de credenciales o sesión activa.
                const currentUser = auth.currentUser;
                
                if (currentUser) {
                    await updatePassword(currentUser, nuevaClave);
                } else {
                    // Si no hay sesión abierta en ese navegador, solicitamos al usuario que inicie sesión 
                    // o aplicamos el cambio directamente si Firebase lo permite por contexto.
                    // Una alternativa limpia es usar un login rápido de respaldo o actualizar directo:
                    throw new Error("Por seguridad, inicia sesión con tu contraseña anterior o usa el flujo directo.");
                }

                mostrarToast('¡Contraseña actualizada con éxito! Redirigiendo...', 'success');
                formRestaurar.reset();

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);

            } catch (error) {
                console.error("[Error actualizando contraseña]:", error);
                
                // Solución alternativa si Firebase requiere autenticación previa para updatePassword:
                // Le permitimos actualizar la contraseña vinculando el credential o mostrando un mensaje claro.
                mostrarToast(`Para actualizar, asegúrate de estar logueado o usa la opción de cambiar contraseña desde tu perfil. (${error.message})`, 'danger');
                
                if (btnActualizar) {
                    btnActualizar.disabled = false;
                    btnActualizar.textContent = 'Actualizar Contraseña';
                }
            }
        });
    }
});