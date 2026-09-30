import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion } from './global.js';

async function guardarPerfilUsuario(uid, datos) {
    try {
        const userRef = doc(db, 'usuarios', uid);
        await setDoc(userRef, datos, { merge: true });
    } catch (error) {
        console.error("Error al guardar perfil en Firestore:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const btnGoogleAuth = document.getElementById('btnGoogleAuth');

    // 1. Registro con correo y contraseña
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('registerEmail')?.value.trim() || '';
            const password = document.getElementById('registerPassword')?.value.trim() || '';
            const age = document.getElementById('registerAge')?.value.trim() || '';

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await guardarPerfilUsuario(user.uid, {
                    email: email,
                    edad: age,
                    fotoPerfil: '',
                    creadoEn: new Date()
                });

                if (typeof mostrarToast === 'function') {
                    mostrarToast('¡Cuenta creada con éxito!', 'success');
                }
                
                // Redirección a la página principal tras medio segundo
                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 500);

            } catch (error) {
                console.error("Error Registro:", error);
                let msg = 'Error al registrarse.';
                
                if (error.code === 'auth/email-already-in-use') {
                    msg = 'Este correo ya está registrado. Prueba iniciar sesión.';
                } else if (error.code === 'auth/weak-password') {
                    msg = 'La contraseña debe tener al menos 6 caracteres.';
                } else if (error.code === 'auth/invalid-email') {
                    msg = 'El formato del correo electrónico no es válido.';
                }

                if (typeof mostrarToast === 'function') {
                    mostrarToast(msg, 'danger');
                } else {
                    alert(msg);
                }
            }
        });
    }

    // 2. Registro / Autenticación con Google
    if (btnGoogleAuth) {
        btnGoogleAuth.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                await guardarPerfilUsuario(user.uid, {
                    email: user.email,
                    nombre: user.displayName || '',
                    fotoPerfil: user.photoURL || '',
                    actualizadoEn: new Date()
                });

                if (typeof mostrarToast === 'function') {
                    mostrarToast('¡Bienvenido!', 'success');
                }

                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 500);

            } catch (error) {
                console.error("Error Google Auth:", error);
                let errorMsg = 'No se pudo completar el acceso con Google.';
                
                if (error.code === 'auth/popup-closed-by-user') {
                    errorMsg = 'La ventana de Google se cerró antes de finalizar.';
                }

                if (typeof mostrarToast === 'function') {
                    mostrarToast(errorMsg, 'danger');
                } else {
                    alert(errorMsg);
                }
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
  // Seleccionamos todos los contenedores de menú desplegable
  const dropdowns = document.querySelectorAll(".dropdown");

  dropdowns.forEach(function (dropdown) {
    const dropBtn = dropdown.querySelector(".dropbtn"); // Ajusta la clase del botón si es distinta

    if (dropBtn) {
      dropBtn.addEventListener("click", function (e) {
        // Previene el comportamiento por defecto si es un enlace
        e.preventDefault();
        
        // Alterna la clase 'active' para mostrar/ocultar el contenido
        dropdown.classList.toggle("active");
      });
    }
  });

  // Cierra el menú si se hace clic fuera de él
  window.addEventListener("click", function (e) {
    dropdowns.forEach(function (dropdown) {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("active");
      }
    });
  });
});