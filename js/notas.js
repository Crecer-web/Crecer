import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion } from './global.js';

let currentUser = null;
let misNotas = [];

// Guard de autenticación
observarSesion((user) => {
    if (user) {
        currentUser = user;
        cargarNotas();
    } else {
        window.location.href = 'login.html';
    }
});

// Cargar notas desde Firestore
async function cargarNotas() {
    if (!currentUser) return;

    try {
        const q = query(collection(db, "notas"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        misNotas = [];
        querySnapshot.forEach((docSnap) => {
            misNotas.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderizarNotas();
    } catch (error) {
        console.error("Error al cargar notas:", error);
    }
}

// Renderizar tarjetas y calcular promedios
function renderizarNotas() {
    const notasGrid = document.getElementById('notasGrid');
    const promedioGeneralEl = document.getElementById('promedioGeneral');
    const promedioEstadoEl = document.getElementById('promedioEstado');

    notasGrid.innerHTML = '';

    if (misNotas.length === 0) {
        notasGrid.innerHTML = '<p class="empty-msg">Aún no has registrado calificaciones.</p>';
        promedioGeneralEl.textContent = '--';
        promedioEstadoEl.textContent = 'Registra tus calificaciones para calcular tu desempeño.';
        return;
    }

    let sumaTotal = 0;

    misNotas.forEach((item) => {
        sumaTotal += parseFloat(item.calificacion);

        const card = document.createElement('div');
        card.className = 'nota-card';
        card.innerHTML = `
            <div class="nota-header">
                <span class="nota-materia">${item.materia}</span>
                <span class="nota-badge ${item.calificacion >= 6 ? 'aprobado' : 'reprobado'}">${item.calificacion}</span>
            </div>
            <h4>${item.evaluacion}</h4>
            <small class="nota-fecha">📅 ${item.fecha || 'Sin fecha'}</small>
            <button class="btn-delete-nota" data-id="${item.id}" title="Eliminar nota">🗑️</button>
        `;

        // Evento eliminar nota
        card.querySelector('.btn-delete-nota').addEventListener('click', async () => {
            if (confirm(`¿Eliminar la nota de ${item.materia}?`)) {
                await deleteDoc(doc(db, "notas", item.id));
                if (typeof mostrarToast === 'function') mostrarToast('Nota eliminada', 'info');
                cargarNotas();
            }
        });

        notasGrid.appendChild(card);
    });

    // Cálculo de Promedio General
    const promedio = (sumaTotal / misNotas.length).toFixed(2);
    promedioGeneralEl.textContent = promedio;

    if (promedio >= 7) {
        promedioEstadoEl.textContent = '🌟 ¡Excelente rendimiento académico!';
    } else if (promedio >= 6) {
        promedioEstadoEl.textContent = '👍 Vas por buen camino, ¡mantenlo así!';
    } else {
        promedioEstadoEl.textContent = '⚠️ Requiere un esfuerzo adicional para reforzar materias.';
    }
}

// Guardar nueva nota
const notaForm = document.getElementById('notaForm');

if (notaForm) {
    notaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) return;

        const btn = document.getElementById('btnGuardarNota');
        btn.disabled = true;

        const materia = document.getElementById('materiaNotaInput').value.trim();
        const evaluacion = document.getElementById('evaluacionInput').value.trim();
        const calificacion = parseFloat(document.getElementById('calificacionInput').value);
        const fecha = document.getElementById('fechaNotaInput').value;

        try {
            await addDoc(collection(db, "notas"), {
                userId: currentUser.uid,
                materia,
                evaluacion,
                calificacion,
                fecha,
                creadoEn: new Date().toISOString()
            });

            if (typeof mostrarToast === 'function') {
                mostrarToast('Nota registrada con éxito', 'success');
            }

            notaForm.reset();
            cargarNotas();
        } catch (error) {
            console.error("Error al registrar nota:", error);
            if (typeof mostrarToast === 'function') mostrarToast('Error al guardar la nota', 'danger');
        } finally {
            btn.disabled = false;
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