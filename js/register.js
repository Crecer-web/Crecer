import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion, mostrarToast } from './global.js';

/**
 * Guarda o actualiza la información de perfil en la colección "usuarios" usando el UID como clave.
 * @param {string} uid - Identificador único del usuario de Firebase Auth
 * @param {Object} datos - Objeto con las propiedades del usuario a fusionar
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
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const btnGoogleAuth = document.getElementById('btnGoogleAuth');
    const btnSubmitRegister = document.getElementById('btnSubmitRegister');

    // 1. Registro con correo electrónico y contraseña
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');
            const ageInput = document.getElementById('registerAge');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value.trim() : '';
            const age = ageInput ? ageInput.value.trim() : '';

            // Validaciones básicas de cliente
            if (!email || !password) {
                mostrarToast('Por favor, completa todos los campos requeridos.', 'danger');
                return;
            }

            if (password.length < 6) {
                mostrarToast('La contraseña debe tener al menos 6 caracteres.', 'danger');
                return;
            }

            // Cambiar estado visual del botón
            if (btnSubmitRegister) {
                btnSubmitRegister.disabled = true;
                btnSubmitRegister.textContent = 'Creando cuenta... ⏳';
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Guardar datos iniciales en la base de datos Firestore asociados al UID
                await guardarPerfilUsuario(user.uid, {
                    email: email,
                    edad: age,
                    fotoPerfil: '',
                    creadoEn: new Date().toISOString(),
                    actualizadoEn: new Date().toISOString()
                });

                mostrarToast('¡Cuenta creada con éxito! Redirigiendo...', 'success');

                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 800);

            } catch (error) {
                console.error("Error en Registro:", error);
                let msg = 'Error al registrarse. Inténtalo de nuevo.';
                
                if (error.code === 'auth/email-already-in-use') {
                    msg = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
                } else if (error.code === 'auth/weak-password') {
                    msg = 'La contraseña es demasiado débil. Usa al menos 6 caracteres.';
                } else if (error.code === 'auth/invalid-email') {
                    msg = 'El formato del correo electrónico ingresado no es válido.';
                } else if (error.code === 'auth/network-request-failed') {
                    msg = 'Error de red. Verifica tu conexión a internet.';
                }

                mostrarToast(msg, 'danger');

                // Restablecer botón en caso de error
                if (btnSubmitRegister) {
                    btnSubmitRegister.disabled = false;
                    btnSubmitRegister.textContent = 'Crear Cuenta';
                }
            }
        });
    }

    // 2. Registro / Inicio de Sesión con Google
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
                    actualizadoEn: new Date().toISOString()
                });

                mostrarToast('¡Bienvenido/a a CRECER!', 'success');

                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 800);

            } catch (error) {
                console.error("Error en Google Auth:", error);
                let errorMsg = 'No se pudo completar el registro con Google.';
                
                if (error.code === 'auth/popup-closed-by-user') {
                    errorMsg = 'La ventana de inicio de sesión de Google se cerró antes de completar el proceso.';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMsg = 'Error de conexión durante la autenticación con Google.';
                }

                mostrarToast(errorMsg, 'danger');
                btnGoogleAuth.disabled = false;
            }
        });
    }
});

// Soporte para menús desplegables en móviles o interfaces con componente dropdown
document.addEventListener("DOMContentLoaded", function () {
    const dropdowns = document.querySelectorAll(".dropdown");

    dropdowns.forEach(function (dropdown) {
        const dropBtn = dropdown.querySelector(".dropbtn") || dropdown.querySelector(".dropdown-btn");

        if (dropBtn) {
            dropBtn.addEventListener("click", function (e) {
                e.preventDefault();
                dropdown.classList.toggle("active");
            });
        }
    });

    window.addEventListener("click", function (e) {
        dropdowns.forEach(function (dropdown) {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
            }
        });
    });
});