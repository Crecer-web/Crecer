/* =================================================================
   MÓDULO PAPELERA DE RECICLAJE - CRECER (Versión Definitiva)
   ================================================================= */

import { db } from './firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion, mostrarToast } from './global.js';   

/**
 * Aplica el tema dado de forma estricta, unificada y sincronizada
 * @param {string} tema - 'dark' o 'light'
 */
function aplicarTema(tema) {
    const esOscuro = tema === 'dark';

    if (esOscuro) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = esOscuro ? '☀️' : '🌙';
    }
}

/**
 * Conmutación directa e instantánea garantizada con 1 solo clic
 */
function toggleTema() {
    // Leemos el tema actual directamente de localStorage
    const temaActual = localStorage.getItem('theme') || 
                      (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

    const nuevoTema = temaActual === 'dark' ? 'light' : 'dark';
    aplicarTema(nuevoTema);
}

document.addEventListener('DOMContentLoaded', () => {
    const trashGrid = document.getElementById('trashGrid');
    let themeToggle = document.getElementById('themeToggle');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    // 1. Cargar e inicializar tema al montar el DOM
    const temaGuardado = localStorage.getItem('theme');
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const temaInicial = temaGuardado ? temaGuardado : (prefiereDark ? 'dark' : 'light');
    
    aplicarTema(temaInicial);

    // 2. Limpieza de listeners previos y asignación directa de 1 clic
    if (themeToggle) {
        // Clonamos el nodo para remover cualquier event listener heredado de global.js
        const nuevoBtn = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(nuevoBtn, themeToggle);
        themeToggle = nuevoBtn;

        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTema();
        });
    }

    // 3. Menú hamburguesa para vista móvil
    if (menuToggle && navMenu) {
        menuToggle.onclick = (e) => {
            e.preventDefault();
            navMenu.classList.toggle('active');
        };
    }

    // 4. Menú desplegable (Dropdown de módulos)
    const dropdown = document.querySelector(".dropdown");
    const dropdownBtn = document.getElementById("dropdownBtn");

    if (dropdownBtn && dropdown) {
        dropdownBtn.onclick = (e) => {
            e.preventDefault();
            dropdown.classList.toggle("active");
        };

        window.addEventListener("click", (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
            }
        });
    }

    // 5. Verificación de sesión e inicialización de Firestore
    observarSesion(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        await cargarElementosPapelera(user.uid);
    });

    /**
     * Escanea registros eliminados en colecciones de Firestore
     */
    async function cargarElementosPapelera(userId) {
        if (!trashGrid) return;

        try {
            trashGrid.innerHTML = `
                <div class="trash-empty" style="font-style: normal;">
                    <p>🔄 Sincronizando elementos eliminados...</p>
                </div>
            `;

            let elementosEliminadosTotales = [];
            const coleccionesAEvaluar = ['formularios', 'notas', 'tareas'];

            for (const nombreColeccion of coleccionesAEvaluar) {
                try {
                    const q = query(
                        collection(db, nombreColeccion), 
                        where('userId', '==', userId)
                    );
                    
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach((documento) => {
                        const data = documento.data();
                        
                        const estaEliminado = data.enPapelera === true || 
                                              data.eliminado === true || 
                                              data.eliminado === "true";

                        if (estaEliminado) {
                            if (!elementosEliminadosTotales.some(el => el.id === documento.id)) {
                                elementosEliminadosTotales.push({
                                    id: documento.id,
                                    coleccion: nombreColeccion,
                                    ...data
                                });
                            }
                        }
                    });
                } catch (errColeccion) {
                    console.warn(`Aviso: No se pudo procesar la colección '${nombreColeccion}':`, errColeccion);
                }
            }

            renderizarCuadriculaPapelera(elementosEliminadosTotales);

        } catch (error) {
            console.error("Error general al procesar la papelera:", error);
            mostrarToast('No se pudieron cargar los elementos eliminados', 'danger');
            if (trashGrid) {
                trashGrid.innerHTML = `
                    <div class="trash-empty">
                        <p>Ocurrió un error al conectar con la base de datos.</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Renderiza dinámicamente las tarjetas de la papelera
     */
    function renderizarCuadriculaPapelera(elementos) {
        trashGrid.innerHTML = '';

        if (!elementos || elementos.length === 0) {
            trashGrid.innerHTML = `
                <div class="trash-empty">
                    <p>La papelera está completamente vacía.</p>
                </div>
            `;
            return;
        }

        elementos.forEach((item) => {
            const tituloVisual = item.titulo || item.nombre || item.materia || item.tema || 'Sin título o tema';
            const descripcionVisual = item.contenido || item.descripcion || item.evaluacion || item.detalle || 'Sin descripción adicional registrada.';
            
            let tipoEtiqueta = 'Elemento';
            if (item.coleccion === 'tareas') tipoEtiqueta = 'Tarea';
            else if (item.coleccion === 'notas') tipoEtiqueta = 'Nota';
            else if (item.tipo) tipoEtiqueta = item.tipo;

            const card = document.createElement('div');
            card.className = 'trash-item';
            card.innerHTML = `
                <div class="trash-item-info">
                    <span class="trash-item-badge">${sanearTexto(tipoEtiqueta)}</span>
                    <strong>${sanearTexto(tituloVisual)}</strong>
                    <span>${sanearTexto(descripcionVisual.substring(0, 75))}${descripcionVisual.length > 75 ? '...' : ''}</span>
                </div>
                <div class="trash-actions">
                    <button type="button" class="btn-restore" data-id="${item.id}" data-coleccion="${item.coleccion}">
                        ↩️ Restaurar
                    </button>
                    <button type="button" class="btn-delete-perm" data-id="${item.id}" data-coleccion="${item.coleccion}">
                        ❌ Eliminar
                    </button>
                </div>
            `;
            trashGrid.appendChild(card);
        });

        vincularAccionesBotones();
    }

    /**
     * Asigna eventos para restaurar o eliminar definitivamente
     */
    function vincularAccionesBotones() {
        document.querySelectorAll('.btn-restore').forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const coleccion = e.currentTarget.getAttribute('data-coleccion');

                try {
                    const docRef = doc(db, coleccion, id);
                    await updateDoc(docRef, { 
                        enPapelera: false,
                        eliminado: false,
                        restauradoEn: new Date().toISOString()
                    });

                    mostrarToast('Elemento restaurado con éxito al panel activo', 'success');
                    
                    observarSesion(user => {
                        if (user) cargarElementosPapelera(user.uid);
                    });
                } catch (err) {
                    console.error("Error al intentar restaurar el elemento:", err);
                    mostrarToast('Error al restaurar el elemento seleccionado', 'danger');
                }
            };
        });

        document.querySelectorAll('.btn-delete-perm').forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const coleccion = e.currentTarget.getAttribute('data-coleccion');

                if (window.confirm('¿Estás totalmente seguro de eliminar este elemento de forma permanente? Esta acción no se puede deshacer.')) {
                    try {
                        await deleteDoc(doc(db, coleccion, id));
                        mostrarToast('Elemento eliminado permanentemente', 'success');
                        
                        observarSesion(user => {
                            if (user) cargarElementosPapelera(user.uid);
                        });
                    } catch (err) {
                        console.error("Error al intentar eliminar permanentemente:", err);
                        mostrarToast('No se pudo eliminar el elemento del sistema', 'danger');
                    }
                }
            };
        });
    }

    /**
     * Sanea cadenas para evitar inyección HTML
     */
    function sanearTexto(texto) {
        if (!texto) return '';
        return String(texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});