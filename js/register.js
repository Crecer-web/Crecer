import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { mostrarToast } from './global.js';

/**
 * Guarda o actualiza la información del perfil del usuario en la colección "usuarios" de Firestore.
 * @param {string} uid - Identificador único del usuario de Firebase Auth.
 * @param {Object} datos - Objeto con los atributos del usuario.
 */
async function guardarPerfilUsuario(uid, datos) {
    try {
        const userRef = doc(db, 'usuarios', uid);
        await setDoc(userRef, {
            uid: uid,
            ...datos
        }, { merge: true });
    } catch (error) {
        console.error("Error al guardar el perfil en Firestore:", error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const btnGoogleAuth = document.getElementById('btnGoogleAuth');
    const btnSubmitRegister = document.getElementById('btnSubmitRegister');

    // 1. Registro manual con Nombre, Apellido, Correo y Contraseña
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nameInput = document.getElementById('registerName');
            const lastNameInput = document.getElementById('registerLastName');
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');

            const nombre = nameInput ? nameInput.value.trim() : '';
            const apellido = lastNameInput ? lastNameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value.trim() : '';

            // Validaciones de formulario
            if (!nombre || !apellido || !email || !password) {
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
                // Crear usuario en Firebase Authentication
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Actualizar el perfil básico del usuario en Auth (displayName)
                const nombreCompleto = `${nombre} ${apellido}`;
                await updateProfile(user, {
                    displayName: nombreCompleto
                });

                // Guardar en la base de datos Firestore el perfil estructurado
                await guardarPerfilUsuario(user.uid, {
                    nombre: nombre,
                    apellido: apellido,
                    email: email,
                    fotoPerfil: '',
                    creadoEn: new Date().toISOString(),
                    actualizadoEn: new Date().toISOString()
                });

                mostrarToast(`¡Bienvenido/a ${nombre}! Tu cuenta ha sido creada.`, 'success');

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

                // Restablecer botón en caso de falla
                if (btnSubmitRegister) {
                    btnSubmitRegister.disabled = false;
                    btnSubmitRegister.textContent = 'Crear Cuenta';
                }
            }
        });
    }

    // 2. Registro o Inicio de Sesión rápido mediante Google
    if (btnGoogleAuth) {
        btnGoogleAuth.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            btnGoogleAuth.disabled = true;

            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                // Separar el nombre y apellido si displayName existe
                const partesNombre = (user.displayName || '').split(' ');
                const nombre = partesNombre[0] || 'Usuario';
                const apellido = partesNombre.slice(1).join(' ') || '';

                await guardarPerfilUsuario(user.uid, {
                    nombre: nombre,
                    apellido: apellido,
                    email: user.email,
                    fotoPerfil: user.photoURL || '',
                    actualizadoEn: new Date().toISOString()
                });

                mostrarToast(`¡Bienvenido/a ${nombre}!`, 'success');

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