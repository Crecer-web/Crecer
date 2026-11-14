import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { mostrarToast } from './global.js';

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
    let themeToggle = document.getElementById('themeToggle');
    const registerForm = document.getElementById('registerForm');
    const btnGoogleAuth = document.getElementById('btnGoogleAuth');
    const btnSubmitRegister = document.getElementById('btnSubmitRegister');

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

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nameInput = document.getElementById('registerName');
            const lastNameInput = document.getElementById('registerLastName');
            const birthDateInput = document.getElementById('registerBirthDate');
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');
            const confirmPasswordInput = document.getElementById('registerConfirmPassword');

            const nombre = nameInput ? nameInput.value.trim() : '';
            const apellido = lastNameInput ? lastNameInput.value.trim() : '';
            const fechaNacimiento = birthDateInput ? birthDateInput.value : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

            if (!nombre || !apellido || !fechaNacimiento || !email || !password || !confirmPassword) {
                mostrarToast('Por favor, completa todos los campos requeridos.', 'danger');
                return;
            }

            if (password !== confirmPassword) {
                mostrarToast('Las contraseñas no coinciden. Por favor, revísalas.', 'danger');
                if (confirmPasswordInput) confirmPasswordInput.focus();
                return;
            }

            if (password.length < 6) {
                mostrarToast('La contraseña debe tener al menos 6 caracteres.', 'danger');
                return;
            }

            if (btnSubmitRegister) {
                btnSubmitRegister.disabled = true;
                btnSubmitRegister.textContent = 'Creando cuenta...';
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                const nombreCompleto = `${nombre} ${apellido}`;
                await updateProfile(user, {
                    displayName: nombreCompleto
                });

                await guardarPerfilUsuario(user.uid, {
                    nombre: nombre,
                    apellido: apellido,
                    fechaNacimiento: fechaNacimiento,
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

                if (btnSubmitRegister) {
                    btnSubmitRegister.disabled = false;
                    btnSubmitRegister.textContent = 'Crear Cuenta';
                }
            }
        });
    }

    if (btnGoogleAuth) {
        btnGoogleAuth.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            btnGoogleAuth.disabled = true;

            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                const partesNombre = (user.displayName || '').split(' ');
                const nombre = partesNombre[0] || 'Usuario';
                const apellido = partesNombre.slice(1).join(' ') || '';

                await guardarPerfilUsuario(user.uid, {
                    nombre: nombre,
                    apellido: apellido,
                    email: user.email,
                    fotoPerfil: user.photoURL || '',
                    actualizadoEn: new Date().toISOString()
                }, { merge: true });

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
                    errorMsg = 'Error de red durante la autenticación con Google.';
                }

                mostrarToast(errorMsg, 'danger');
                btnGoogleAuth.disabled = false;
            }
        });
    }
});