/* =================================================================
   LÓGICA DE INICIO DE SESIÓN Y GUÍA DE ACCESO - PLATAFORMA CRECER
   ================================================================= */

import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { mostrarToast } from './global.js';

/**
 * Aplica el tema (claro / oscuro) de forma sincronizada en la vista de inicio de sesión.
 */
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

/**
 * Guarda o actualiza la información básica del usuario en Firestore al iniciar sesión.
 */
async function guardarPerfilUsuario(uid, datos) {
    try {
        const userRef = doc(db, 'usuarios', uid);
        await setDoc(userRef, {
            uid: uid,
            ...datos
        }, { merge: true });
    } catch (error) {
        console.error("Error al guardar perfil en Firestore:", error);
    }
}

/**
 * Resalta visualmente el enlace "¿Olvidaste tu contraseña?" para guiar al usuario
 * cuando ocurre un fallo por incompatibilidad de proveedor o credencial.
 */
function resaltarEnlaceRecuperacion() {
    const linkOlvido = document.getElementById('linkOlvidoPassword');
    if (linkOlvido) {
        linkOlvido.style.transition = 'all 0.3s ease';
        linkOlvido.style.fontWeight = 'bold';
        linkOlvido.style.color = '#ef4444'; // Color rojo destacado
        linkOlvido.style.textDecoration = 'underline';

        // Retorna a su estilo original suavemente tras 6 segundos
        setTimeout(() => {
            linkOlvido.style.fontWeight = 'normal';
            linkOlvido.style.color = '';
            linkOlvido.style.textDecoration = '';
        }, 6000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let themeToggle = document.getElementById('themeToggle');
    const loginForm = document.getElementById('loginForm');
    const btnGoogleAuth = document.getElementById('btnGoogleAuth');
    const btnSubmitLogin = document.getElementById('btnSubmitLogin');

    // Inicialización del tema en la vista de Login
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

    // 1. Manejo del Formulario de Inicio de Sesión (Email / Password)
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value.trim() : '';

            if (!email || !password) {
                mostrarToast('Por favor, ingresa tu correo y contraseña.', 'danger');
                return;
            }

            if (btnSubmitLogin) {
                btnSubmitLogin.disabled = true;
                btnSubmitLogin.textContent = 'Ingresando... ⏳';
            }

            try {
                // Intento de autenticación con Firebase Auth
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await guardarPerfilUsuario(user.uid, {
                    email: user.email,
                    ultimoAcceso: new Date().toISOString()
                });

                mostrarToast('¡Bienvenido de nuevo!', 'success');

                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 600);

            } catch (error) {
                console.error("Error en Login:", error.code, error.message);

                // Captura y manejo guiado de los errores de Firebase Auth
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    mostrarToast(
                        'Credenciales incorrectas. Si te registraste con Google, usa el botón de Google o haz clic en "¿Olvidaste tu contraseña?" para crear una.',
                        'danger'
                    );
                    resaltarEnlaceRecuperacion();

                } else if (error.code === 'auth/user-not-found') {
                    mostrarToast('No existe una cuenta registrada con este correo electrónico.', 'danger');

                } else if (error.code === 'auth/invalid-email') {
                    mostrarToast('El correo electrónico ingresado no es válido.', 'danger');

                } else if (error.code === 'auth/network-request-failed') {
                    mostrarToast('Error de conexión a internet. Revisa tu red.', 'danger');

                } else {
                    mostrarToast('Error al iniciar sesión: ' + error.message, 'danger');
                }

                if (btnSubmitLogin) {
                    btnSubmitLogin.disabled = false;
                    btnSubmitLogin.textContent = 'Ingresar';
                }
            }
        });
    }

    // 2. Manejo del Inicio de Sesión con Google (OAuth)
    if (btnGoogleAuth) {
        btnGoogleAuth.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            btnGoogleAuth.disabled = true;

            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                await guardarPerfilUsuario(user.uid, {
                    email: user.email,
                    nombre: user.displayName || '',
                    fotoPerfil: user.photoURL || '',
                    ultimoAcceso: new Date().toISOString()
                });

                mostrarToast('¡Sesión iniciada con éxito!', 'success');

                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 600);

            } catch (error) {
                console.error("Error Google Auth:", error.code, error.message);
                let errorMsg = 'No se pudo iniciar sesión con Google.';

                if (error.code === 'auth/popup-closed-by-user') {
                    errorMsg = 'Cancelaste la ventana de inicio de sesión de Google.';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMsg = 'Error de red al intentar conectar con Google.';
                }

                mostrarToast(errorMsg, 'danger');
                btnGoogleAuth.disabled = false;
            }
        });
    }
});