import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc,
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion } from './global.js';

// Función auxiliar segura para mostrar notificaciones toast si existe en el entorno global
function dispararToast(mensaje, tipo = 'info') {
    if (typeof mostrarToast === 'function') {
        mostrarToast(mensaje, tipo);
    } else {
        console.log(`[Toast ${tipo.toUpperCase()}]: ${mensaje}`);
    }
}

let currentUser = null;
let todosLosFormularios = [];
let filtroTipo = 'Todos';

// 1. Protección de Ruta e inicialización de sesión
observarSesion((user) => {
    if (user) {
        currentUser = user;
        cargarDatos();
    } else {
        window.location.href = 'login.html';
    }
});

// 2. Cargar datos de Firestore abarcando tanto el campo estandarizado 'enPapelera' como 'eliminado'
async function cargarDatos() {
    if (!currentUser) return;

    try {
        const q = query(collection(db, "formularios"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        todosLosFormularios = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            todosLosFormularios.push({ 
                id: docSnap.id, 
                ...data,
                // Unificación inteligente de banderas de papelera para compatibilidad absoluta
                enPapelera: data.enPapelera === true || data.eliminado === true 
            });
        });

        renderizarVista();
    } catch (error) {
        console.error("Error al cargar datos de Firestore:", error);
        dispararToast('Error al sincronizar la información con la base de datos', 'danger');
    }
}

// 3. Renderizar tarjetas, contadores y papelera de forma segura y completa
function renderizarVista() {
    const searchVal = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    const cardsGrid = document.getElementById('cardsGrid');
    const trashGrid = document.getElementById('trashGrid');

    let pendientesCount = 0;
    let completadasCount = 0;
    let papeleraCount = 0;

    if (cardsGrid) cardsGrid.innerHTML = '';
    if (trashGrid) trashGrid.innerHTML = '';

    todosLosFormularios.forEach((item) => {
        // Validación unificada si se encuentra dentro de la papelera
        if (item.enPapelera) {
            papeleraCount++;
            if (trashGrid) {
                trashGrid.appendChild(crearTarjetaPapelera(item));
            }
            return;
        }

        // Conteo de métricas para elementos activos
        if (item.completada) {
            completadasCount++;
        } else {
            pendientesCount++;
        }

        // Aplicar filtros de tipo y búsqueda de texto
        const cumpleFiltroTipo = (filtroTipo === 'Todos') || (item.tipo === filtroTipo);
        const materiaTexto = item.materia ? item.materia.toLowerCase() : '';
        const temaTexto = item.tema ? item.tema.toLowerCase() : '';
        const cumpleBusqueda = materiaTexto.includes(searchVal) || temaTexto.includes(searchVal);

        if (cumpleFiltroTipo && cumpleBusqueda && cardsGrid) {
            cardsGrid.appendChild(crearTarjetaActiva(item));
        }
    });

    // Control de estado visual si la papelera se encuentra vacía
    if (trashGrid && papeleraCount === 0) {
        trashGrid.innerHTML = `
            <div class="trash-empty">
                <p>La papelera está completamente vacía.</p>
            </div>
        `;
    }

    // Actualizar contadores en la interfaz de manera completamente segura
    const cantPendientesEl = document.getElementById('cantPendientes');
    const cantCompletadasEl = document.getElementById('cantCompletadas');
    const cantPapeleraEl = document.getElementById('cantPapelera');

    if (cantPendientesEl) cantPendientesEl.textContent = pendientesCount;
    if (cantCompletadasEl) cantCompletadasEl.textContent = completadasCount;
    if (cantPapeleraEl) cantPapeleraEl.textContent = papeleraCount;
}

// 4. Crear elemento HTML detallado para tarjeta activa
function crearTarjetaActiva(item) {
    const card = document.createElement('div');
    card.className = `item-card ${item.completada ? 'completed' : ''}`;
    
    const tipoBadgeClass = item.tipo === 'Examen' ? 'badge-examen' : 'badge-tarea';

    card.innerHTML = `
        <div class="card-header">
            <span class="badge ${tipoBadgeClass}">${item.tipo || 'General'}</span>
            <span class="card-materia">${item.materia || 'Sin materia'}</span>
        </div>
        <h3>${item.tema || 'Sin tema especificado'}</h3>
        <p class="card-desc">${item.descripcion || 'Sin descripción detallada disponible'}</p>
        
        ${item.adjuntoNombre ? `
            <div class="card-attachment">
                📎 <strong>Adjunto:</strong> ${item.adjuntoNombre}
            </div>
        ` : ''}

        <div class="card-dates">
            📅 <strong>Entrega:</strong> ${item.fechaEntrega || '--/--/----'} a las ${item.horaEntrega || '--:--'} hs
        </div>

        <div class="card-actions">
            <button type="button" class="btn-status" data-id="${item.id}" data-status="${item.completada}">
                ${item.completada ? '✅ Completada' : '⏳ Pendiente'}
            </button>
            <button type="button" class="btn-trash" data-id="${item.id}" title="Mover a Papelera">🗑️</button>
        </div>
    `;

    // Evento interactivo para cambiar el estado de completado
    card.querySelector('.btn-status').addEventListener('click', async () => {
        try {
            await updateDoc(doc(db, "formularios", item.id), { completada: !item.completada });
            cargarDatos();
        } catch (error) {
            console.error("Error al actualizar estado:", error);
            dispararToast('No se pudo actualizar el estado del elemento', 'danger');
        }
    });

    // Evento interactivo robusto para enviar a la papelera (Actualiza ambas propiedades de control para compatibilidad)
    card.querySelector('.btn-trash').addEventListener('click', async () => {
        try {
            await updateDoc(doc(db, "formularios", item.id), { 
                enPapelera: true,
                eliminado: true,
                eliminadoEn: new Date()
            });
            dispararToast('Elemento enviado a la papelera correctamente', 'success');
            cargarDatos();
        } catch (error) {
            console.error("Error al mover a la papelera:", error);
            dispararToast('No se pudo enviar el elemento a la papelera', 'danger');
        }
    });

    return card;
}

// 5. Crear elemento HTML para tarjeta ubicada en la papelera
function crearTarjetaPapelera(item) {
    const card = document.createElement('div');
    card.className = 'trash-item';
    
    card.innerHTML = `
        <div class="trash-item-info">
            <span class="trash-item-badge">${item.tipo || 'Elemento'}</span>
            <strong>[${item.materia || 'Sin materia'}] - ${item.tema || 'Sin tema'}</strong>
            <span>${item.descripcion ? item.descripcion.substring(0, 60) + '...' : 'Sin descripción adicional'}</span>
        </div>
        <div class="trash-actions">
            <button type="button" class="btn-restore" data-id="${item.id}">↩️ Restaurar</button>
            <button type="button" class="btn-delete-perm" data-id="${item.id}">❌ Borrar Definitivo</button>
        </div>
    `;

    // Evento para restaurar el elemento (limpia ambas banderas de papelera)
    card.querySelector('.btn-restore').addEventListener('click', async () => {
        try {
            await updateDoc(doc(db, "formularios", item.id), { 
                enPapelera: false,
                eliminado: false,
                restauradoEn: new Date()
            });
            dispararToast('Elemento restaurado con éxito al panel activo', 'success');
            cargarDatos();
        } catch (error) {
            console.error("Error al restaurar elemento:", error);
            dispararToast('Error al intentar restaurar el elemento', 'danger');
        }
    });

    // Evento para eliminar permanentemente de Firestore con confirmación previa
    card.querySelector('.btn-delete-perm').addEventListener('click', async () => {
        if (window.confirm("¿Estás totalmente seguro de eliminar permanentemente este elemento? Esta acción no se puede deshacer.")) {
            try {
                await deleteDoc(doc(db, "formularios", item.id));
                dispararToast('Elemento eliminado permanentemente de la base de datos', 'success');
                cargarDatos();
            } catch (error) {
                console.error("Error al borrar definitivamente:", error);
                dispararToast('No se pudo eliminar el elemento de forma permanente', 'danger');
            }
        }
    });

    return card;
}

// 6. Función extendida global opcional para llamadas externas directas de envío a papelera
async function enviarAPapelera(idItem, nombreColeccion = 'formularios') {
    try {
        const itemRef = doc(db, nombreColeccion, idItem);
        await updateDoc(itemRef, {
            enPapelera: true,
            eliminado: true,
            eliminadoEn: new Date()
        });
        dispararToast('Elemento enviado a la papelera correctamente', 'success');
        if (typeof cargarDatos === 'function') {
            cargarDatos();
        }
    } catch (error) {
        console.error("Error al enviar a la papelera mediante función externa:", error);
        dispararToast('No se pudo enviar el elemento a la papelera', 'danger');
    }
}

// Exponer la función globalmente por si otros scripts la invocan directamente
window.enviarAPapelera = enviarAPapelera;

// 7. Configuración unificada de Listeners del DOM para Búsqueda, Filtros y Menús Desplegables
document.addEventListener('DOMContentLoaded', () => {
    // Búsqueda en tiempo real
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderizarVista();
        });
    }

    // Botones de filtrado superior
    const filterBtns = document.querySelectorAll('.btn-filter');
    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                filtroTipo = e.target.getAttribute('data-filter') || 'Todos';
                renderizarVista();
            });
        });
    }

    // Menús desplegables (Dropdowns) con cierre automático de otros abiertos
    const dropdowns = document.querySelectorAll(".dropdown");

    dropdowns.forEach(function (dropdown) {
        const dropBtn = dropdown.querySelector(".dropdown-btn");

        if (dropBtn) {
            dropBtn.addEventListener("click", function (e) {
                e.preventDefault();
                // Cierra los demás antes de alternar el actual
                dropdowns.forEach(d => {
                    if (d !== dropdown) d.classList.remove("active");
                });
                dropdown.classList.toggle("active");
            });
        }
    });

    // Cierra los menús desplegables al hacer clic fuera de ellos
    window.addEventListener("click", function (e) {
        dropdowns.forEach(function (dropdown) {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
            }
        });
    });
});