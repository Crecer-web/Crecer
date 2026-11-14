/* =================================================================
   LÓGICA DE INICIO DE SESIÓN - PLATAFORMA CRECER
   ================================================================= */

import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { mostrarToast } from './global.js';

let autenticandoEnCurso = false;

/**
 * Aplica el tema de forma sincronizada en la vista de inicio de sesión
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
 * Guarda o actualiza los datos del usuario en Firestore al iniciar sesión,
 * preservando la foto de perfil personalizada si ya existe.
 */
async function guardarPerfilUsuario(uid, datos) {
    try {
        const userRef = doc(db, 'usuarios', uid);
        const docSnap = await getDoc(userRef);
        let datosFinales = { uid: uid, ...datos };

        if (docSnap.exists()) {
            const dataActual = docSnap.data();
            // Si el usuario ya tiene una foto personalizada guardada y no viene una nueva por parámetro, se preserva
            if (dataActual.fotoPerfil && (!datos.fotoPerfil || datos.fotoPerfil === '')) {
                delete datosFinales.fotoPerfil;
            }
        }

        await setDoc(userRef, datosFinales, { merge: true });
    } catch (error) {
        console.error("Error al guardar perfil en Firestore:", error);
    }
}

/**
 * Valida formato básico de correo electrónico
 */
function esEmailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Redirigir si ya existe una sesión activa al cargar la página
onAuthStateChanged(auth, (user) => {
    if (user && !autenticandoEnCurso) {
        window.location.href = 'inicio.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    let themeToggle = document.getElementById('themeToggle');
    const loginForm = document.getElementById('loginForm');
    const btnGoogleAuth = document.getElementById('btnGoogleAuth');
    const btnSubmitLogin = document.getElementById('btnSubmitLogin');

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

    const alternarEstadoBotones = (deshabilitado, textoSubmit = 'Ingresar', textoGoogle = 'Continuar con Google') => {
        if (btnSubmitLogin) {
            btnSubmitLogin.disabled = deshabilitado;
            btnSubmitLogin.textContent = textoSubmit;
        }
        if (btnGoogleAuth) {
            btnGoogleAuth.disabled = deshabilitado;
            const spanGoogle = btnGoogleAuth.querySelector('span');
            if (spanGoogle) spanGoogle.textContent = textoGoogle;
        }
    };

    // 1. Iniciar sesión con Correo y Contraseña
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (autenticandoEnCurso) return;
            
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (!email || !password) {
                mostrarToast('Por favor, ingresa tu correo y contraseña.', 'danger');
                return;
            }

            if (!esEmailValido(email)) {
                mostrarToast('El formato del correo ingresado no es válido.', 'danger');
                return;
            }

            autenticandoEnCurso = true;
            alternarEstadoBotones(true, 'Ingresando...', 'Continuar con Google');

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await guardarPerfilUsuario(user.uid, {
                    email: user.email,
                    ultimoAcceso: new Date().toISOString()
                });

                mostrarToast('Sesión iniciada correctamente.', 'success');

                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 500);

            } catch (error) {
                console.error("Error en Login:", error);
                autenticandoEnCurso = false;
                
                let msg = 'Credenciales inválidas. Verifica tu correo y contraseña.';

                if (error.code === 'auth/invalid-email') {
                    msg = 'El formato del correo ingresado no es válido.';
                } else if (error.code === 'auth/too-many-requests') {
                    msg = 'Demasiados intentos fallidos. Intenta nuevamente más tarde.';
                } else if (error.code === 'auth/network-request-failed') {
                    msg = 'Error de conexión a internet. Revisa tu red.';
                }

                mostrarToast(msg, 'danger');
                alternarEstadoBotones(false, 'Ingresar', 'Continuar con Google');
            }
        });
    }

    // 2. Iniciar sesión / Registrarse con Google
    if (btnGoogleAuth) {
        btnGoogleAuth.addEventListener('click', async () => {
            if (autenticandoEnCurso) return;

            const provider = new GoogleAuthProvider();
            autenticandoEnCurso = true;
            alternarEstadoBotones(true, 'Ingresar', 'Conectando con Google...');

            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                await guardarPerfilUsuario(user.uid, {
                    email: user.email,
                    nombre: user.displayName || '',
                    fotoPerfil: user.photoURL || '',
                    ultimoAcceso: new Date().toISOString()
                });

                mostrarToast('Sesión iniciada con éxito.', 'success');

                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 500);

            } catch (error) {
                console.error("Error Google Auth:", error);
                autenticandoEnCurso = false;
                let errorMsg = 'No se pudo iniciar sesión con Google.';

                if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                    errorMsg = 'Se canceló la ventana de inicio de sesión de Google.';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMsg = 'Error de red al intentar conectar con Google.';
                }

                mostrarToast(errorMsg, 'danger');
                alternarEstadoBotones(false, 'Ingresar', 'Continuar con Google');
            }
        });
    }
});