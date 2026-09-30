import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { mostrarToast } from './global.js';

/**
 * Función auxiliar para actualizar o guardar datos de perfil en Firestore al iniciar sesión
 * @param {string} uid - ID del usuario autenticado
 * @param {Object} datos - Objeto con los campos a fusionar en la base de datos
 */
async function guardarPerfilUsuario(uid, datos) {
    try {
        const userRef = doc(db, 'usuarios', uid);
        await setDoc(userRef, datos, { merge: true });
    } catch (error) {
        console.error("Error al guardar perfil en Firestore:", error);
    }
}

/**
 * Función para enviar el correo de recuperación de contraseña personalizado a través de la API REST de Brevo
 * @param {string} emailDestino - Correo electrónico del usuario
 * @param {string} tokenRecuperacion - Token o enlace generado para el reseteo
 */
function enviarCorreoRecuperacionBrevo(emailDestino, tokenRecuperacion) {
    // Reemplaza esta cadena con tu clave real xkeysib-... generada en Brevo
    const apiKey = "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"; 
    const templateId = 1; // ID de la plantilla configurada en Brevo

    // Construcción del enlace que recibirá el usuario en el correo
    const linkRecuperacion = `https://tu-dominio-o-ruta/reset-password.html?token=${tokenRecuperacion}`;

    const datosEnvio = {
        to: [{ email: emailDestino }],
        templateId: templateId,
        params: {
            link_recuperacion: linkRecuperacion
        }
    };

    fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json'
        },
        body: JSON.stringify(datosEnvio)
    })
    .then(response => {
        if (response.ok) {
            console.log("Correo enviado exitosamente mediante Brevo.");
            if (typeof mostrarToast === 'function') {
                mostrarToast('Te enviamos un correo para establecer o recuperar tu contraseña.', 'success');
            } else {
                alert('Te enviamos un correo para establecer o recuperar tu contraseña.');
            }
        } else {
            return response.json().then(errData => {
                console.error("Error detallado de Brevo:", errData);
                throw new Error("Error en la respuesta del servidor de correo.");
            });
        }
    })
    .catch(error => {
        console.error("Error de red o API al enviar correo con Brevo:", error);
        let msgErrorBrevo = 'No se pudo enviar el correo de recuperación. Inténtalo de nuevo más tarde.';
        if (typeof mostrarToast === 'function') {
            mostrarToast(msgErrorBrevo, 'danger');
        } else {
            alert(msgErrorBrevo);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const btnGoogleAuth = document.getElementById('btnGoogleAuth');
    const linkOlvido = document.getElementById('linkOlvidoPassword');

    // 1. Iniciar sesión con Correo y Contraseña
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail')?.value.trim() || '';
            const password = document.getElementById('loginPassword')?.value.trim() || '';

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);

                if (typeof mostrarToast === 'function') {
                    mostrarToast('Bienvenido de nuevo', 'success');
                }

                // Redirección con un breve delay para permitir ver la notificación de bienvenida
                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 500);

            } catch (error) {
                console.error("Error Login:", error);
                let msg = 'Correo o contraseña incorrectos';

                // Detección de errores detallados de autenticación
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    msg = 'Contraseña incorrecta. Si te registraste con Google, debes usar el botón de Google.';
                } else if (error.code === 'auth/user-not-found') {
                    msg = 'No existe una cuenta registrada con este correo.';
                } else if (error.code === 'auth/network-request-failed') {
                    msg = 'Error de conexión. Revisa tu internet o la configuración de Firebase.';
                } else if (error.message) {
                    msg = 'Error de conexión o credenciales incorrectas.';
                }

                if (typeof mostrarToast === 'function') {
                    mostrarToast(msg, 'danger');
                } else {
                    alert(msg);
                }
            }
        });
    }

    // 2. Iniciar sesión / Registrarse con Google
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

                window.location.href = 'inicio.html';
            } catch (error) {
                console.error("Error Google Auth:", error);
                let errorMsg = 'No se pudo iniciar sesión con Google.';

                if (error.code === 'auth/popup-closed-by-user') {
                    errorMsg = 'La ventana emergente de Google fue cerrada.';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMsg = 'Error de conexión durante la autenticación con Google.';
                }

                if (typeof mostrarToast === 'function') {
                    mostrarToast(errorMsg, 'danger');
                } else {
                    alert(errorMsg);
                }
            }
        });
    }

    // 3. Restablecer o recuperar contraseña mediante la API de Brevo
    if (linkOlvido) {
        linkOlvido.addEventListener('click', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('loginEmail');
            const email = emailInput ? emailInput.value.trim() : '';

            if (!email) {
                const msgAlertaEmail = 'Por favor, escribe tu correo primero en el campo de arriba.';
                if (typeof mostrarToast === 'function') {
                    mostrarToast(msgAlertaEmail, 'danger');
                } else {
                    alert(msgAlertaEmail);
                }
                return;
            }

            // Generamos un token o código único simulado para la recuperación en el sistema académico CRECER
            const tokenSimulado = Math.random().toString(36).substring(2) + Date.now().toString(36);

            // Llamamos a la función que ejecuta el fetch hacia Brevo
            enviarCorreoRecuperacionBrevo(email, tokenSimulado);
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