import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion, mostrarToast } from './global.js';

let currentUser = null;

// Registrar Service Worker para Notificaciones PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.error('Error al registrar Service Worker:', err);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Referencias DOM para menú móvil y tema
    const themeToggle = document.getElementById('themeToggle');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    // Manejo del icono de Tema (Luna 🌙 en Modo Claro, Sol ☀️ en Modo Oscuro)
    const sincronizarTemaUI = () => {
        const esDark = document.body.getAttribute('data-theme') === 'dark';
        if (themeToggle) {
            themeToggle.textContent = esDark ? '☀️' : '🌙';
        }
    };

    // Inicialización del tema según preferencia guardada
    const temaGuardado = localStorage.getItem('theme');
    if (temaGuardado === 'dark' || (!temaGuardado && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.setAttribute('data-theme', 'dark');
    } else {
        document.body.removeAttribute('data-theme');
    }
    sincronizarTemaUI();

    // Event Listener del Botón de Tema (Conmutación y actualización inmediata de Emoji)
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const actualEsDark = document.body.getAttribute('data-theme') === 'dark';
            if (actualEsDark) {
                document.body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            }
            sincronizarTemaUI();
        });
    }

    // Menú hamburguesa móvil
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
});

// Observador de Sesión
observarSesion((user) => {
    if (user) {
        currentUser = user;
    } else {
        window.location.href = 'login.html';
    }
});

// Solicitar Permiso de Notificaciones
async function solicitarPermisosNotificacion() {
    if ("Notification" in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

// Disparar Alerta Flotante (In-App)
function mostrarNotificacionFlotante(titulo, mensaje) {
    const phoneNotification = document.getElementById('phoneNotification');
    const notifTitle = document.getElementById('notifTitle');
    const notifMessage = document.getElementById('notifMessage');

    if (!phoneNotification) return;

    if (notifTitle) notifTitle.innerText = titulo;
    if (notifMessage) notifMessage.innerText = mensaje;

    if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
    }

    phoneNotification.classList.remove('hidden');
    setTimeout(() => phoneNotification.classList.add('show'), 10);
    setTimeout(() => phoneNotification.classList.remove('show'), 4000);
}

// Manejador del Dropzone de Archivos
const materialInput = document.getElementById('materialInput');
const fileTextLabel = document.getElementById('fileTextLabel');

if (materialInput && fileTextLabel) {
    materialInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileTextLabel.textContent = `📎 Archivo adjuntado: ${e.target.files[0].name}`;
        } else {
            fileTextLabel.textContent = 'Haz clic para adjuntar guías, PDFs o imágenes de apoyo';
        }
    });
}

// Manejador de Guardado del Formulario
const formularioForm = document.getElementById('formularioForm');

if (formularioForm) {
    formularioForm.addEventListener('click', solicitarPermisosNotificacion, { once: true });

    formularioForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            mostrarToast("Debes iniciar sesión para realizar esta acción.", "danger");
            return;
        }

        const tipo = document.getElementById('tipoFormulario').value;
        const materia = document.getElementById('materiaInput').value.trim();
        const tema = document.getElementById('temaInput').value.trim();
        const descripcion = document.getElementById('descripcionInput').value.trim();
        const fechaEntrega = document.getElementById('fechaEntregaInput').value;
        const horaEntrega = document.getElementById('horaEntregaInput').value;

        // Validaciones en cliente
        if (!tipo || !materia || !tema || !fechaEntrega || !horaEntrega) {
            mostrarToast("Por favor, completa todos los campos obligatorios (*)", "warning");
            return;
        }

        const btnGuardar = document.getElementById('btnGuardar');
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Guardando y Automatizando... ⏳';
        }

        let fileName = '';
        if (materialInput && materialInput.files.length > 0) {
            fileName = materialInput.files[0].name;
        }

        const fechaHoraString = `${fechaEntrega}T${horaEntrega}`;

        try {
            await addDoc(collection(db, "formularios"), {
                userId: currentUser.uid,
                tipo,
                materia,
                tema,
                descripcion,
                fechaEntrega,
                horaEntrega,
                fechaHoraIso: fechaHoraString,
                adjuntoNombre: fileName,
                completada: false,
                enPapelera: false,
                creadoEn: new Date().toISOString()
            });

            mostrarNotificacionFlotante(
                "¡Alerta Registrada! 🚨",
                `Se programó el aviso automático 24hs antes para ${materia}.`
            );

            setTimeout(() => {
                window.location.href = 'inicio.html';
            }, 1800);

        } catch (error) {
            console.error("Error al guardar formulario en Firestore:", error);
            mostrarToast('Error al guardar el formulario en la base de datos.', 'danger');
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.textContent = '💾 Guardar Formulario y Automatizar Alerta';
            }
        }
    });
}