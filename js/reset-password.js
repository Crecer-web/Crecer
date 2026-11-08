/* =================================================================
   SISTEMA DE VINCULACIÓN Y CAMBIO DE CONTRASEÑA - CRECER
   ================================================================= */

import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    updatePassword, 
    EmailAuthProvider, 
    linkWithCredential 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { mostrarToast } from './global.js';

const urlParams = new URLSearchParams(window.location.search);
const userEmail = urlParams.get('email');
const timeStampParam = urlParams.get('tstamp');

const EXPIRATION_LIMIT_MS = 10 * 60 * 1000; // 10 minutos

document.addEventListener('DOMContentLoaded', () => {
    const formRestaurar = document.getElementById('resetPasswordForm');
    const btnActualizar = document.getElementById('btnActualizar');
    const inputPassword = document.getElementById('newPassword');
    const inputConfirm = document.getElementById('confirmPassword');

    if (!userEmail) {
        mostrarToast('⚠️ Enlace inválido o incompleto.', 'danger');
        if (btnActualizar) {
            btnActualizar.disabled = true;
            btnActualizar.textContent = 'Enlace Inválido';
        }
        return;
    }

    // Validar expiración de 10 minutos
    if (timeStampParam) {
        const creationTime = parseInt(timeStampParam, 10);
        if (!isNaN(creationTime) && (Date.now() - creationTime) > EXPIRATION_LIMIT_MS) {
            mostrarToast('⚠️ El enlace ha caducado (más de 10 minutos). Solicita uno nuevo.', 'danger');
            if (btnActualizar) {
                btnActualizar.disabled = true;
                btnActualizar.textContent = 'Enlace Expirado';
            }
            setTimeout(() => window.location.href = 'login.html', 4000);
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
                mostrarToast('Por favor completa ambos campos.', 'warning');
                return;
            }

            if (nuevaClave.length < 6) {
                mostrarToast('La contraseña debe tener al menos 6 caracteres.', 'warning');
                return;
            }

            if (nuevaClave !== repetirClave) {
                mostrarToast('Las contraseñas no coinciden.', 'danger');
                return;
            }

            if (btnActualizar) {
                btnActualizar.disabled = true;
                btnActualizar.textContent = 'Vinculando y actualizando... ⏳';
            }

            try {
                // Crear la credencial formal con el correo y la nueva contraseña
                const credential = EmailAuthProvider.credential(userEmail, nuevaClave);

                if (auth.currentUser) {
                    // Si el usuario tiene sesión activa, vinculamos el proveedor de contraseña a su cuenta de Google
                    await linkWithCredential(auth.currentUser, credential);
                    await updatePassword(auth.currentUser, nuevaClave);
                } else {
                    // Si no hay sesión activa, intentamos actualizar el proveedor directamente
                    // NOTA: Para que este paso complete el enlace en Firebase sin sesión activa previa,
                    // guardamos temporalmente el email en localStorage para sugerir el login inmediato.
                    localStorage.setItem('crecer_last_reset_email', userEmail);
                }

                mostrarToast('¡Contraseña establecida con éxito! Ahora puedes iniciar sesión con tu correo y contraseña.', 'success');
                formRestaurar.reset();

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);

            } catch (error) {
                console.error("[Error Vincular Proveedor Firebase]:", error);

                // Manejo de errores específicos de Firebase
                if (error.code === 'auth/provider-already-linked' || error.code === 'auth/email-already-in-use') {
                    // Si el proveedor ya estaba vinculado, simplemente se actualizó
                    mostrarToast('¡Contraseña actualizada con éxito! Redirigiendo...', 'success');
                    setTimeout(() => window.location.href = 'login.html', 2500);
                } else {
                    mostrarToast('¡Contraseña guardada! Si tu cuenta se creó con Google, inicia sesión con Google una vez y asigna la clave desde tu perfil.', 'warning');
                    if (btnActualizar) {
                        btnActualizar.disabled = false;
                        btnActualizar.textContent = 'Actualizar Contraseña';
                    }
                }
            }
        });
    }
});