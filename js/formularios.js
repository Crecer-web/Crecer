/* =================================================================
   MÓDULO DE CARGA Y EDICIÓN DE FORMULARIOS - PLATAFORMA CRECER (Con Compresión de Imágenes)
   ================================================================= */

import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion, mostrarToast } from './global.js';

let currentUser = null;
let editTaskId = null;
let archivoBase64Global = '';
let nombreArchivoGlobal = '';

// Registro seguro de Service Worker para soporte PWA y notificaciones
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.error('Error al registrar Service Worker:', err);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    // Sincronización del icono de tema global (🌙 / ☀️)
    const sincronizarIconoTema = () => {
        const esDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (themeToggle) {
            themeToggle.textContent = esDark ? '☀️' : '🌙';
        }
    };

    sincronizarIconoTema();

    const observer = new MutationObserver(() => {
        sincronizarIconoTema();
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    // Control del menú hamburguesa responsivo en móviles
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            navMenu.classList.toggle('active');
        });
    }

    // Comprobación de parámetros en URL para modo Edición
    const urlParams = new URLSearchParams(window.location.search);
    editTaskId = urlParams.get('id');

    if (editTaskId) {
        const tituloPrinc = document.getElementById('formTituloPrincipal');
        const subtitulo = document.getElementById('formSubtitulo');
        const btnGuardar = document.getElementById('btnGuardar');

        if (tituloPrinc) tituloPrinc.textContent = 'Editar Tarea o Examen';
        if (subtitulo) subtitulo.textContent = 'Modifica los campos necesarios y actualiza la información académica al instante.';
        if (btnGuardar) btnGuardar.textContent = 'Actualizar Formulario';
    }
});

// Verificación asíncrona robusta de la sesión activa de Firebase
observarSesion((user) => {
    if (user) {
        currentUser = user;
        if (editTaskId) {
            cargarDatosParaEditar(editTaskId);
        }
    } else {
        window.location.href = 'login.html';
    }
});

/**
 * Carga los datos existentes desde Firestore para rellenar el formulario de edición
 */
async function cargarDatosParaEditar(id) {
    try {
        const docRef = doc(db, "formularios", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Validación de seguridad por ID de usuario
            if (data.userId && data.userId !== currentUser.uid) {
                mostrarToast("No tienes permisos para editar este registro.", "danger");
                setTimeout(() => { window.location.href = 'inicio.html'; }, 1500);
                return;
            }

            document.getElementById('tipoFormulario').value = data.tipo || '';
            document.getElementById('materiaInput').value = data.materia || '';
            document.getElementById('temaInput').value = data.tema || '';
            document.getElementById('descripcionInput').value = data.descripcion || '';
            document.getElementById('fechaEntregaInput').value = data.fechaEntrega || '';
            document.getElementById('horaEntregaInput').value = data.horaEntrega || '';

            if (data.adjuntoNombre) {
                nombreArchivoGlobal = data.adjuntoNombre;
                archivoBase64Global = data.adjuntoUrl || '';
                const fileTextLabel = document.getElementById('fileTextLabel');
                if (fileTextLabel) {
                    fileTextLabel.textContent = `Archivo cargado previamente: ${data.adjuntoNombre}`;
                }
            }
        } else {
            mostrarToast("El formulario que intentas editar no existe o fue eliminado.", "danger");
        }
    } catch (error) {
        console.error("Error al cargar datos para edición:", error);
        mostrarToast("Error al recuperar los datos del formulario.", "danger");
    }
}

// Solicitud de permisos para notificaciones del navegador
async function solicitarPermisosNotificacion() {
    if ("Notification" in window && Notification.permission === 'default') {
        try {
            await Notification.requestPermission();
        } catch (error) {
            console.warn("No se concedió el permiso de notificaciones nativas:", error);
        }
    }
}

// Despliegue de notificación flotante institucional
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
    requestAnimationFrame(() => {
        phoneNotification.classList.add('show');
    });

    setTimeout(() => {
        phoneNotification.classList.remove('show');
    }, 4500);
}

/**
 * Función para comprimir imágenes automáticamente antes de pasarlas a Base64
 */
function comprimirImagen(archivo, calidad = 0.7, anchoMax = 1200) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(archivo);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let ancho = img.width;
                let alto = img.height;

                // Redimensionar si supera las dimensiones máximas
                if (ancho > alto) {
                    if (ancho > anchoMax) {
                        alto = Math.round((alto * anchoMax) / ancho);
                        ancho = anchoMax;
                    }
                } else {
                    if (alto > anchoMax) {
                        ancho = Math.round((ancho * anchoMax) / alto);
                        alto = anchoMax;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = ancho;
                canvas.height = alto;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, ancho, alto);

                // Exportar como JPEG comprimido a Base64
                const dataUrlComprimida = canvas.toDataURL('image/jpeg', calidad);
                resolve(dataUrlComprimida);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}

// Manejador del campo de archivos con compresión automática integrada
const materialInput = document.getElementById('materialInput');
const fileTextLabel = document.getElementById('fileTextLabel');

if (materialInput && fileTextLabel) {
    materialInput.addEventListener('change', async (e) => {
        const archivo = e.target.files[0];
        if (archivo) {
            nombreArchivoGlobal = archivo.name;
            fileTextLabel.textContent = `Procesando y optimizando: ${archivo.name}...`;

            try {
                // Verificamos si es una imagen para aplicar compresión canvas
                if (archivo.type.startsWith('image/')) {
                    archivoBase64Global = await comprimirImagen(archivo, 0.7, 1200);
                    fileTextLabel.textContent = `Imagen optimizada y lista: ${archivo.name}`;
                    mostrarToast('Imagen optimizada y cargada con éxito.', 'success');
                } else {
                    // Si es un PDF u otro documento, leemos de forma estándar
                    const reader = new FileReader();
                    reader.onload = function(uploadEvent) {
                        archivoBase64Global = uploadEvent.target.result;
                        fileTextLabel.textContent = `Archivo listo para guardar: ${archivo.name}`;
                        mostrarToast('Archivo cargado con éxito.', 'success');
                    };
                    reader.readAsDataURL(archivo);
                }
            } catch (error) {
                console.error("Error al procesar el archivo:", error);
                mostrarToast('Error al procesar el archivo adjunto.', 'danger');
                fileTextLabel.textContent = 'Error al procesar el archivo. Intenta de nuevo.';
                archivoBase64Global = '';
                nombreArchivoGlobal = '';
            }
        } else {
            fileTextLabel.textContent = 'Haz clic para adjuntar guías, PDFs o imágenes de apoyo';
        }
    });
}

// Envío y almacenamiento del formulario en Firestore
const formularioForm = document.getElementById('formularioForm');

if (formularioForm) {
    formularioForm.addEventListener('click', solicitarPermisosNotificacion, { once: true });

    formularioForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            mostrarToast("Tu sesión ha expirado o no se ha inicializado. Por favor, inicia sesión nuevamente.", "danger");
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
            return;
        }

        const tipo = document.getElementById('tipoFormulario').value;
        const materia = document.getElementById('materiaInput').value.trim();
        const tema = document.getElementById('temaInput').value.trim();
        const descripcion = document.getElementById('descripcionInput').value.trim();
        const fechaEntrega = document.getElementById('fechaEntregaInput').value;
        const horaEntrega = document.getElementById('horaEntregaInput').value;

        if (!tipo || !materia || !tema || !fechaEntrega || !horaEntrega) {
            mostrarToast("Por favor, completa todos los campos obligatorios (*)", "warning");
            return;
        }

        const btnGuardar = document.getElementById('btnGuardar');
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.textContent = editTaskId ? 'Actualizando datos...' : 'Guardando formulario...';
        }

        const fechaHoraString = `${fechaEntrega}T${horaEntrega}`;

        try {
            const datosFormulario = {
                tipo,
                materia,
                tema,
                descripcion,
                fechaEntrega,
                horaEntrega,
                fechaHoraIso: fechaHoraString,
                adjuntoNombre: nombreArchivoGlobal || '',
                adjuntoUrl: archivoBase64Global || '',
                userId: currentUser.uid
            };

            if (editTaskId) {
                const docRef = doc(db, "formularios", editTaskId);
                datosFormulario.actualizadoEn = new Date().toISOString();
                await updateDoc(docRef, datosFormulario);
                mostrarToast("Formulario actualizado con éxito.", "success");
            } else {
                datosFormulario.completada = false;
                datosFormulario.enPapelera = false;
                datosFormulario.creadoEn = new Date().toISOString();

                await addDoc(collection(db, "formularios"), datosFormulario);
                
                mostrarNotificacionFlotante(
                    "Alerta Registrada",
                    `Se programó el aviso automático previo para ${materia}.`
                );
                mostrarToast("Formulario guardado con éxito.", "success");
            }

            setTimeout(() => {
                window.location.href = 'inicio.html';
            }, 1000);

        } catch (error) {
            console.error("Error al guardar en Firestore:", error);
            mostrarToast(`Error al guardar: ${error.message}`, 'danger');
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.textContent = editTaskId ? 'Actualizar Formulario' : 'Guardar Formulario y Automatizar Alerta';
            }
        }
    });
}