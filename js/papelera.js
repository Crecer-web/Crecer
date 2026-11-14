/* =================================================================
   MÓDULO PAPELERA DE RECICLAJE - CRECER
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

function aplicarTemaDirecto(tema) {
    const themeToggle = document.getElementById('themeToggle');

    if (tema === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (themeToggle) themeToggle.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        if (themeToggle) themeToggle.textContent = '🌙';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const trashGrid = document.getElementById('trashGrid');
    const themeToggle = document.getElementById('themeToggle');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const btnVaciarPapelera = document.getElementById('btnVaciarPapelera');

    const modal = document.getElementById('modalConfirmacion');
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const btnCancelarModal = document.getElementById('btnCancelarModal');
    const btnAceptarModal = document.getElementById('btnAceptarModal');
    const modalMensajeTexto = document.getElementById('modalMensajeTexto');

    let accionPendiente = null;
    let currentUser = null;

    const abrirModal = (mensaje, callback) => {
        if (modalMensajeTexto) modalMensajeTexto.textContent = mensaje;
        accionPendiente = callback;
        if (modal) modal.classList.remove('hidden');
    };

    const cerrarModal = () => {
        accionPendiente = null;
        if (modal) modal.classList.add('hidden');
    };

    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModal);
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModal);
    if (btnAceptarModal) {
        btnAceptarModal.addEventListener('click', async () => {
            if (typeof accionPendiente === 'function') {
                await accionPendiente();
            }
            cerrarModal();
        });
    }

    const temaGuardado = localStorage.getItem('theme');
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const temaInicial = temaGuardado ? temaGuardado : (prefiereDark ? 'dark' : 'light');
    
    aplicarTemaDirecto(temaInicial);

    if (themeToggle) {
        const nuevoToggle = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(nuevoToggle, themeToggle);

        nuevoToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const esOscuroActual = document.documentElement.getAttribute('data-theme') === 'dark' || 
                                   document.body.getAttribute('data-theme') === 'dark';
            aplicarTemaDirecto(esOscuroActual ? 'light' : 'dark');
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
        dropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdown.classList.toggle("active");
        });

        window.addEventListener("click", (e) => {
            if (dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
            }
        });
    }

    if (btnVaciarPapelera) {
        btnVaciarPapelera.addEventListener('click', () => {
            if (!currentUser) return;
            abrirModal('¿Estás seguro de vaciar toda la papelera? Se eliminarán permanentemente todos los elementos.', async () => {
                await vaciarPapeleraCompleta(currentUser.uid);
            });
        });
    }

    observarSesion(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;
        await cargarElementosPapelera(currentUser.uid);
    });

    async function cargarElementosPapelera(userId) {
        if (!trashGrid) return;

        try {
            trashGrid.innerHTML = `
                <div class="trash-empty" style="font-style: normal;">
                    <p>Verificando registros y aplicando retención de 48 horas...</p>
                </div>
            `;

            let elementosValidos = [];
            const coleccionesAEvaluar = ['formularios', 'notas', 'recursos', 'horarios'];
            const ahora = new Date().getTime();
            const LIMITE_48HS = 48 * 60 * 60 * 1000;

            for (const nombreColeccion of coleccionesAEvaluar) {
                try {
                    const q = query(
                        collection(db, nombreColeccion), 
                        where('userId', '==', userId)
                    );
                    
                    const querySnapshot = await getDocs(q);
                    
                    for (const documento of querySnapshot.docs) {
                        const data = documento.data();
                        const estaEliminado = data.enPapelera === true || 
                                              data.eliminado === true || 
                                              data.eliminado === "true";

                        if (estaEliminado) {
                            let tiempoEliminacion = data.eliminadoEn ? new Date(data.eliminadoEn).getTime() : 0;
                            
                            if (!tiempoEliminacion) {
                                await updateDoc(doc(db, nombreColeccion, documento.id), {
                                    eliminadoEn: new Date().toISOString()
                                });
                                tiempoEliminacion = ahora;
                            }

                            if (ahora - tiempoEliminacion >= LIMITE_48HS) {
                                await deleteDoc(doc(db, nombreColeccion, documento.id));
                            } else {
                                if (!elementosValidos.some(el => el.id === documento.id)) {
                                    elementosValidos.push({
                                        id: documento.id,
                                        coleccion: nombreColeccion,
                                        ...data
                                    });
                                }
                            }
                        }
                    }
                } catch (errColeccion) {
                    console.warn(`Aviso en colección '${nombreColeccion}':`, errColeccion);
                }
            }

            renderizarCuadriculaPapelera(elementosValidos);

        } catch (error) {
            console.error("Error al procesar la papelera:", error);
            mostrarToast('No se pudieron cargar los elementos eliminados', 'danger');
            if (trashGrid) {
                trashGrid.innerHTML = `<div class="trash-empty"><p>Error al sincronizar con la base de datos.</p></div>`;
            }
        }
    }

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
            let tituloVisual = item.titulo || item.nombre || item.materia || item.tema || 'Sin título';
            let descripcionVisual = item.contenido || item.descripcion || item.evaluacion || item.detalle || item.url || (item.horaInicio ? `Clase: ${item.horaInicio} - ${item.horaFin}` : 'Sin descripción adicional.');
            
            let tipoEtiqueta = 'Elemento';
            if (item.coleccion === 'formularios') tipoEtiqueta = 'Tarea / Recordatorio';
            else if (item.coleccion === 'notas') tipoEtiqueta = 'Calificación';
            else if (item.coleccion === 'recursos') tipoEtiqueta = 'Recurso / Enlace';
            else if (item.coleccion === 'horarios') tipoEtiqueta = 'Clase / Horario';

            const card = document.createElement('div');
            card.className = 'trash-item';
            card.innerHTML = `
                <div class="trash-item-info">
                    <span class="trash-item-badge">${sanearTexto(tipoEtiqueta)}</span>
                    <strong>${sanearTexto(tituloVisual)}</strong>
                    <span>${sanearTexto(String(descripcionVisual).substring(0, 75))}${String(descripcionVisual).length > 75 ? '...' : ''}</span>
                </div>
                <div class="trash-actions">
                    <button type="button" class="btn-restore" data-id="${item.id}" data-coleccion="${item.coleccion}">
                        Restaurar
                    </button>
                    <button type="button" class="btn-delete-perm" data-id="${item.id}" data-coleccion="${item.coleccion}">
                        Eliminar
                    </button>
                </div>
            `;
            trashGrid.appendChild(card);
        });

        vincularAccionesBotones();
    }

    function vincularAccionesBotones() {
        document.querySelectorAll('.btn-restore').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const coleccion = e.currentTarget.getAttribute('data-coleccion');

                try {
                    const docRef = doc(db, coleccion, id);
                    await updateDoc(docRef, { 
                        enPapelera: false,
                        eliminado: false,
                        eliminadoEn: null,
                        restauradoEn: new Date().toISOString()
                    });

                    mostrarToast('Elemento restaurado con éxito al panel activo', 'success');
                    if (currentUser) cargarElementosPapelera(currentUser.uid);
                } catch (err) {
                    console.error("Error al restaurar:", err);
                    mostrarToast('Error al restaurar el elemento', 'danger');
                }
            });
        });

        document.querySelectorAll('.btn-delete-perm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const coleccion = e.currentTarget.getAttribute('data-coleccion');

                abrirModal('¿Estás seguro de eliminar este elemento de forma permanente de Firestore?', async () => {
                    try {
                        await deleteDoc(doc(db, coleccion, id));
                        mostrarToast('Elemento eliminado permanentemente de Firestore', 'success');
                        if (currentUser) cargarElementosPapelera(currentUser.uid);
                    } catch (err) {
                        console.error("Error al eliminar:", err);
                        mostrarToast('No se pudo eliminar el elemento', 'danger');
                    }
                });
            });
        });
    }

    async function vaciarPapeleraCompleta(userId) {
        try {
            const coleccionesAEvaluar = ['formularios', 'notas', 'recursos', 'horarios'];
            let contadorBorrados = 0;

            for (const nombreColeccion of coleccionesAEvaluar) {
                const q = query(collection(db, nombreColeccion), where('userId', '==', userId));
                const querySnapshot = await getDocs(q);

                for (const documento of querySnapshot.docs) {
                    const data = documento.data();
                    if (data.enPapelera === true || data.eliminado === true || data.eliminado === "true") {
                        await deleteDoc(doc(db, nombreColeccion, documento.id));
                        contadorBorrados++;
                    }
                }
            }

            mostrarToast(`Papelera vaciada con éxito (${contadorBorrados} elementos borrados)`, 'success');
            await cargarElementosPapelera(userId);
        } catch (err) {
            console.error("Error al vaciar papelera:", err);
            mostrarToast('Error al vaciar la papelera', 'danger');
        }
    }

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