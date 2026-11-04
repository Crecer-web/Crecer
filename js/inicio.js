/* =================================================================
   PANEL PRINCIPAL DE INICIO - PLATAFORMA CRECER (Velocidad Optimizada)
   ================================================================= */

import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    doc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion, mostrarToast } from './global.js';
import { abrirArchivoAdjunto } from './archivos.js';

let currentUser = null;
let todasLasTareas = [];
let filtroActual = 'Todos';
let textoBusqueda = '';

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    // Control de la mini ventana Modal de Confirmación
    const modal = document.getElementById('modalConfirmacion');
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const btnCancelarModal = document.getElementById('btnCancelarModal');
    const btnAceptarModal = document.getElementById('btnAceptarModal');
    const modalMensajeTexto = document.getElementById('modalMensajeTexto');

    let accionPendiente = null;

    const abrirModalConfirmacion = (mensaje, callback) => {
        if (modalMensajeTexto) modalMensajeTexto.textContent = mensaje;
        accionPendiente = callback;
        if (modal) modal.classList.remove('hidden');
    };

    const cerrarModalConfirmacion = () => {
        accionPendiente = null;
        if (modal) modal.classList.add('hidden');
    };

    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalConfirmacion);
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModalConfirmacion);
    if (btnAceptarModal) {
        btnAceptarModal.addEventListener('click', async () => {
            if (typeof accionPendiente === 'function') {
                await accionPendiente();
            }
            cerrarModalConfirmacion();
        });
    }

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            navMenu.classList.toggle('active');
        });
    }

    const dropdown = document.querySelector(".dropdown");
    const dropdownBtn = document.getElementById("dropdownBtn");

    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdown.classList.toggle("active");
        });

        window.addEventListener("click", (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
            }
        });
    }

    observarSesion((user) => {
        if (user) {
            currentUser = user;
            cargarTareasFirestore();
            inicializarFiltrosYBusqueda();
        } else {
            window.location.href = 'login.html';
        }
    });

    window.crecerAbrirModalEliminar = abrirModalConfirmacion;
});

async function cargarTareasFirestore() {
    if (!currentUser) return;

    try {
        const q = query(collection(db, "formularios"), where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);

        todasLasTareas = [];
        snapshot.forEach(documento => {
            const data = documento.data();
            if (!data.eliminado && !data.enPapelera) {
                todasLasTareas.push({
                    id: documento.id,
                    ...data
                });
            }
        });

        todasLasTareas.sort((a, b) => (a.materia || '').localeCompare(b.materia || ''));

        renderizarTareas();
        actualizarMetricas();

    } catch (err) {
        console.error("Error al cargar tareas de Firestore:", err);
        mostrarToast('Error al obtener tus tareas guardadas.', 'danger');
    }
}

function renderizarTareas() {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const tareasFiltradas = todasLasTareas.filter(item => {
        const materia = (item.materia || '').toLowerCase();
        const tema = (item.tema || '').toLowerCase();
        const descripcion = (item.descripcion || '').toLowerCase();
        const queryText = textoBusqueda.toLowerCase();

        const coincideTexto = materia.includes(queryText) || tema.includes(queryText) || descripcion.includes(queryText);
        
        if (filtroActual === 'Todos') return coincideTexto;
        return coincideTexto && (item.tipo || 'Tarea').toLowerCase() === filtroActual.toLowerCase();
    });

    if (tareasFiltradas.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                <p style="font-size: 1.1rem; font-weight: 600;">No se encontraron tareas o materias guardadas.</p>
                <p style="font-size: 0.88rem; margin-top: 0.5rem;">Crea una nueva tarea haciendo clic en el botón superior.</p>
            </div>
        `;
        return;
    }

    const fragmento = document.createDocumentFragment();

    tareasFiltradas.forEach(tarea => {
        const card = document.createElement('article');
        card.className = `item-card ${tarea.completada ? 'completed' : ''}`;
        
        const tipoBadge = tarea.tipo || 'Tarea';
        const badgeClass = tipoBadge.toLowerCase() === 'examen' ? 'badge-examen' : 'badge-tarea';
        const fechaMostrar = tarea.fechaEntrega || tarea.fecha || 'Sin fecha';
        const horaMostrar = tarea.horaEntrega ? `a las ${tarea.horaEntrega}` : '';
        const temaMostrar = tarea.tema || tarea.titulo || 'Sin tema especificativo';
        const descripcionMostrar = tarea.descripcion || '';

        let adjuntoHTML = '';
        if (tarea.adjuntoUrl) {
            adjuntoHTML = `
                <div class="card-attachment" style="margin-top: 0.5rem;">
                    <button type="button" class="btn-abrir-archivo" data-url="${tarea.adjuntoUrl}" data-nombre="${tarea.adjuntoNombre || 'archivo'}" style="background: none; border: none; color: var(--accent); font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.3rem;">
                        📎 ${sanearHTML(tarea.adjuntoNombre || 'Ver archivo adjunto')} ↗
                    </button>
                </div>`;
        } else if (tarea.adjuntoNombre) {
            adjuntoHTML = `
                <div class="card-attachment" style="margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.85rem;">
                    📄 Adjunto: <strong>${sanearHTML(tarea.adjuntoNombre)}</strong>
                </div>`;
        }

        // Estructura con los tres botones (Completada, Editar, Eliminar) uno al lado del otro
        card.innerHTML = `
            <div class="card-body-content">
                <div class="card-header">
                    <span class="badge ${badgeClass}">${sanearHTML(tipoBadge)}</span>
                    <span class="card-dates">📅 ${sanearHTML(fechaMostrar)} ${sanearHTML(horaMostrar)}</span>
                </div>
                <h3 style="margin-bottom: 0.2rem;">📚 ${sanearHTML(tarea.materia || 'Materia sin nombre')}</h3>
                <p class="card-desc" style="font-size: 0.95rem; margin-bottom: 0.4rem;">
                    <strong>Tema:</strong> ${sanearHTML(temaMostrar)}
                </p>
                ${descripcionMostrar ? `<p class="card-desc" style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 0.6rem;">${sanearHTML(descripcionMostrar)}</p>` : ''}
                ${adjuntoHTML}
            </div>
            
            <div class="card-actions">
                <button type="button" class="btn-status" data-id="${tarea.id}">
                    ${tarea.completada ? '↩️ Pendiente' : '✅ Completada'}
                </button>
                <a href="formularios.html?id=${tarea.id}" class="btn-edit-card" title="Editar tarea">
                    ✏️ Editar
                </a>
                <button type="button" class="btn-trash" data-id="${tarea.id}" title="Enviar a la papelera">
                    🗑️ Eliminar
                </button>
            </div>
        `;

        card.querySelector('.btn-status').addEventListener('click', () => cambiarEstadoTarea(tarea.id, !tarea.completada));
        
        card.querySelector('.btn-trash').addEventListener('click', () => {
            window.crecerAbrirModalEliminar(`¿Estás seguro de enviar "${temaMostrar}" a la papelera?`, async () => {
                await enviarAPapelera(tarea.id);
            });
        });
        
        const btnAbrir = card.querySelector('.btn-abrir-archivo');
        if (btnAbrir) {
            btnAbrir.addEventListener('click', (e) => {
                const urlBase64 = e.currentTarget.getAttribute('data-url');
                const nombre = e.currentTarget.getAttribute('data-nombre');
                abrirArchivoAdjunto(urlBase64, nombre);
            });
        }

        fragmento.appendChild(card);
    });

    grid.appendChild(fragmento);
}

function actualizarMetricas() {
    let pendientes = 0;
    let completadas = 0;

    todasLasTareas.forEach(t => {
        if (t.completada) completadas++;
        else pendientes++;
    });

    const elPendientes = document.getElementById('cantPendientes');
    const elCompletadas = document.getElementById('cantCompletadas');

    if (elPendientes) elPendientes.textContent = pendientes;
    if (elCompletadas) elCompletadas.textContent = completadas;
}

function inicializarFiltrosYBusqueda() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            textoBusqueda = e.target.value;
            renderizarTareas();
        });
    }

    const filterButtons = document.querySelectorAll('.btn-filter');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filtroActual = e.target.getAttribute('data-filter');
            renderizarTareas();
        });
    });
}

async function cambiarEstadoTarea(id, nuevoEstado) {
    try {
        const tareaRef = doc(db, "formularios", id);
        await updateDoc(tareaRef, { completada: nuevoEstado });
        
        const index = todasLasTareas.findIndex(t => t.id === id);
        if (index !== -1) {
            todasLasTareas[index].completada = nuevoEstado;
        }

        renderizarTareas();
        actualizarMetricas();
        mostrarToast(nuevoEstado ? '¡Tarea marcada como completada!' : 'Tarea marcada como pendiente', 'success');
    } catch (err) {
        console.error("Error al actualizar estado:", err);
        mostrarToast('No se pudo actualizar el estado de la tarea.', 'danger');
    }
}

async function enviarAPapelera(id) {
    try {
        const tareaRef = doc(db, "formularios", id);
        await updateDoc(tareaRef, { 
            enPapelera: true,
            eliminadoEn: new Date().toISOString()
        });

        todasLasTareas = todasLasTareas.filter(t => t.id !== id);
        renderizarTareas();
        actualizarMetricas();
        mostrarToast('Tarea enviada a la papelera con éxito', 'success');
    } catch (err) {
        console.error("Error al mover a papelera:", err);
        mostrarToast('Error al eliminar la tarea.', 'danger');
    }
}

function sanearHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}