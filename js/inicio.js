import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc,
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion, mostrarToast } from './global.js';

let currentUser = null;
let todosLosFormularios = [];
let filtroTipo = 'Todos';

// Registrar el Service Worker para notificaciones automáticas en segundo plano
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.error('Error al registrar el Service Worker:', err);
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

    // Filtros de búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', renderizarVista);
    }

    const filterBtns = document.querySelectorAll('.btn-filter');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filtroTipo = e.target.getAttribute('data-filter') || 'Todos';
            renderizarVista();
        });
    });
});

// Control de Sesión
observarSesion((user) => {
    if (user) {
        currentUser = user;
        cargarDatos();
    } else {
        window.location.href = 'login.html';
    }
});

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
                enPapelera: data.enPapelera === true || data.eliminado === true 
            });
        });

        renderizarVista();
    } catch (error) {
        console.error("Error al cargar datos:", error);
        mostrarToast('Error al sincronizar datos', 'danger');
    }
}

function renderizarVista() {
    const searchVal = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    const cardsGrid = document.getElementById('cardsGrid');

    let pendientesCount = 0;
    let completadasCount = 0;

    const cardsFragment = document.createDocumentFragment();

    if (cardsGrid) cardsGrid.innerHTML = '';

    todosLosFormularios.forEach((item) => {
        // Ignorar elementos que estén en la papelera
        if (item.enPapelera) return;

        if (item.completada) {
            completadasCount++;
        } else {
            pendientesCount++;
        }

        const cumpleFiltroTipo = (filtroTipo === 'Todos') || (item.tipo === filtroTipo);
        const materiaTexto = item.materia ? item.materia.toLowerCase() : '';
        const temaTexto = item.tema ? item.tema.toLowerCase() : '';
        const cumpleBusqueda = materiaTexto.includes(searchVal) || temaTexto.includes(searchVal);

        if (cumpleFiltroTipo && cumpleBusqueda && cardsGrid) {
            cardsFragment.appendChild(crearTarjetaActiva(item));
        }
    });

    if (cardsGrid) {
        if (cardsFragment.children.length === 0) {
            cardsGrid.innerHTML = `<p style="color: var(--text-muted, #94a3b8); grid-column: 1 / -1; text-align: center; padding: 2rem 0;">No tenés entregas que coincidan con el filtro.</p>`;
        } else {
            cardsGrid.appendChild(cardsFragment);
        }
    }

    const cantPendientesEl = document.getElementById('cantPendientes');
    const cantCompletadasEl = document.getElementById('cantCompletadas');

    if (cantPendientesEl) cantPendientesEl.textContent = pendientesCount;
    if (cantCompletadasEl) cantCompletadasEl.textContent = completadasCount;
}

function crearTarjetaActiva(item) {
    const card = document.createElement('div');
    card.className = `item-card ${item.completada ? 'completed' : ''}`;
    const tipoBadgeClass = item.tipo === 'Examen' ? 'badge-examen' : 'badge-tarea';

    card.innerHTML = `
        <div class="card-header">
            <span class="badge ${tipoBadgeClass}">${item.tipo || 'General'}</span>
            <span class="card-materia">${item.materia || 'Sin materia'}</span>
        </div>
        <h3>${item.tema || 'Sin tema'}</h3>
        <p class="card-desc">${item.descripcion || 'Sin descripción'}</p>
        ${item.adjuntoNombre ? `<div class="card-attachment">📎 ${item.adjuntoNombre}</div>` : ''}
        <div class="card-dates">📅 Entrega: ${item.fechaEntrega || '--/--/----'} ${item.horaEntrega || ''} hs</div>
        <div class="card-actions">
            <button type="button" class="btn-status">${item.completada ? '✅ Completada' : '⏳ Pendiente'}</button>
            <button type="button" class="btn-trash" title="Enviar a Papelera">🗑️</button>
        </div>
    `;

    card.querySelector('.btn-status').addEventListener('click', async () => {
        try {
            await updateDoc(doc(db, "formularios", item.id), { completada: !item.completada });
            cargarDatos();
        } catch (error) {
            mostrarToast('Error al cambiar estado', 'danger');
        }
    });

    card.querySelector('.btn-trash').addEventListener('click', async () => {
        try {
            await updateDoc(doc(db, "formularios", item.id), { 
                enPapelera: true,
                eliminado: true,
                eliminadoEn: new Date().toISOString()
            });
            mostrarToast('Elemento enviado a la papelera', 'success');
            cargarDatos();
        } catch (error) {
            mostrarToast('Error al mover a la papelera', 'danger');
        }
    });

    return card;
}