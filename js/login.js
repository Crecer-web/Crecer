/* =================================================================
   LÓGICA DE INICIO DE SESIÓN - PLATAFORMA CRECER
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
 * Guarda o actualiza los datos del usuario en Firestore al iniciar sesión.
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

    // 1. Iniciar sesión con Correo y Contraseña
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
                console.error("Error en Login:", error);
                let msg = 'Correo o contraseña incorrectos.';

                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    msg = 'Credenciales incorrectas. Si te registraste con Google, usa el botón de Google.';
                } else if (error.code === 'auth/user-not-found') {
                    msg = 'No existe una cuenta registrada con este correo electrónico.';
                } else if (error.code === 'auth/invalid-email') {
                    msg = 'El correo ingresado no es válido.';
                } else if (error.code === 'auth/network-request-failed') {
                    msg = 'Error de conexión a internet. Revisa tu red.';
                }

                mostrarToast(msg, 'danger');

                if (btnSubmitLogin) {
                    btnSubmitLogin.disabled = false;
                    btnSubmitLogin.textContent = 'Ingresar';
                }
            }
        });
    }

    // 2. Iniciar sesión / Registrarse con Google
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
                console.error("Error Google Auth:", error);
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