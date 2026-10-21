import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { mostrarToast } from './global.js';

/**
 * Guarda o actualiza los datos del usuario en Firestore al iniciar sesión.
 * @param {string} uid - ID del usuario autenticado
 * @param {Object} datos - Objeto con los campos a fusionar en la base de datos
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
    const loginForm = document.getElementById('loginForm');
    const btnGoogleAuth = document.getElementById('btnGoogleAuth');
    const btnSubmitLogin = document.getElementById('btnSubmitLogin');
    const linkOlvido = document.getElementById('linkOlvidoPassword');

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

                // Actualizar último acceso en Firestore
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

    // 3. Solicitud de recuperación de contraseña con auxilio si el campo está vacío
    if (linkOlvido) {
        linkOlvido.addEventListener('click', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('loginEmail');
            let email = emailInput ? emailInput.value.trim() : '';

            // Si el campo de correo está vacío, se solicita mediante un prompt rápido
            if (!email) {
                email = prompt('Por favor, ingresa tu correo electrónico para enviar el enlace de recuperación:');
                if (email) {
                    email = email.trim();
                    if (emailInput) emailInput.value = email;
                } else {
                    return; // El usuario canceló la entrada
                }
            }

            try {
                await sendPasswordResetEmail(auth, email);
                mostrarToast('Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.', 'success');
            } catch (error) {
                console.error("Error de recuperación Firebase:", error);
                let msgError = 'No se pudo enviar el correo de recuperación.';
                
                if (error.code === 'auth/user-not-found') {
                    msgError = 'No existe una cuenta registrada con este correo.';
                } else if (error.code === 'auth/invalid-email') {
                    msgError = 'El correo ingresado no es válido.';
                } else if (error.code === 'auth/too-many-requests') {
                    msgError = 'Has realizado demasiados intentos. Por favor espera unos minutos.';
                }

                mostrarToast(msgError, 'danger');
            }
        });
    }
});