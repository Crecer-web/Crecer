import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion } from './global.js';

let currentUser = null;

// Protección de ruta
observarSesion((user) => {
    if (user) {
        currentUser = user;
    } else {
        window.location.href = 'login.html';
    }
});

const formularioForm = document.getElementById('formularioForm');

if (formularioForm) {
    formularioForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            alert("Debes iniciar sesión para realizar esta acción.");
            return;
        }

        const btnGuardar = document.getElementById('btnGuardar');
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Guardando... ⏳';
        }

        const tipo = document.getElementById('tipoFormulario').value;
        const materia = document.getElementById('materiaInput').value.trim();
        const tema = document.getElementById('temaInput').value.trim();
        const descripcion = document.getElementById('descripcionInput').value.trim();
        const fechaEntrega = document.getElementById('fechaEntregaInput').value;
        const horaEntrega = document.getElementById('horaEntregaInput').value;
        const fileInput = document.getElementById('materialInput');

        let fileName = '';

        try {
            // Manejo seguro del nombre del archivo adjunto si se selecciona uno
            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                fileName = file.name;
            }

            // Guardar documento estructurado en la colección "formularios" de Firestore
            await addDoc(collection(db, "formularios"), {
                userId: currentUser.uid,
                tipo, // "Tarea" o "Examen"
                materia,
                tema,
                descripcion,
                fechaEntrega,
                horaEntrega,
                adjuntoNombre: fileName,
                completada: false,
                enPapelera: false, // Control para la papelera de reciclaje
                creadoEn: new Date().toISOString()
            });

            if (typeof mostrarToast === 'function') {
                mostrarToast('¡Formulario creado con éxito!', 'success');
            } else {
                alert('¡Formulario creado con éxito!');
            }

            // Redirigir correctamente al panel de inicio del dashboard
            window.location.href = 'inicio.html';

        } catch (error) {
            console.error("Error al guardar formulario en Firestore:", error);
            if (typeof mostrarToast === 'function') {
                mostrarToast('Error al guardar: ' + error.message, 'danger');
            } else {
                alert('Error al guardar el formulario.');
            }
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.textContent = 'Guardar Formulario';
            }
        }
    });
}

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