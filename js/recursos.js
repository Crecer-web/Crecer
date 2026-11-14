/* =================================================================
   MÓDULO DE RECURSOS Y APUNTES - PLATAFORMA CRECER (Versión Definitiva)
   ================================================================= */

import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    doc, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion, mostrarToast, mostrarConfirmacion } from './global.js';

let currentUser = null;

/**
 * Valida que una URL sea estrictamente segura (http:// o https://)
 * y previene la inyección de esquemas maliciosos como javascript:
 */
function esUrlSegura(url) {
    if (!url || typeof url !== 'string') return false;
    const urlLimpia = url.trim();
    if (!urlLimpia) return false;
    try {
        const parsed = new URL(urlLimpia);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

/**
 * Conmutación e inicialización estricta del Tema
 */
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
    let themeToggle = document.getElementById('themeToggle');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    // Inicialización del tema según preferencia guardada
    const temaGuardado = localStorage.getItem('theme');
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const temaInicial = temaGuardado ? temaGuardado : (prefiereDark ? 'dark' : 'light');
    
    aplicarTemaDirecto(temaInicial);

    // Conmutación directa con 1 solo clic removiendo duplicados
    if (themeToggle) {
        const nuevoBtn = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(nuevoBtn, themeToggle);
        themeToggle = nuevoBtn;

        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const esOscuroActual = document.documentElement.getAttribute('data-theme') === 'dark' || 
                                   document.body.getAttribute('data-theme') === 'dark';
            
            const nuevoTema = esOscuroActual ? 'light' : 'dark';
            aplicarTemaDirecto(nuevoTema);
        });
    }

    // Menú hamburguesa para vista móvil
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            navMenu.classList.toggle('active');
        });
    }

    // Dropdown de módulos
    const dropdown = document.querySelector(".dropdown");
    const dropdownBtn = document.getElementById("dropdownBtn");

    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener("click", (e) => {
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

    // Protección de Ruta y observación de sesión
    observarSesion((user) => {
        if (user) {
            currentUser = user;
            cargarRecursos();
        } else {
            window.location.href = 'login.html';
        }
    });
});

const resourceForm = document.getElementById('resourceForm');
const resourceGrid = document.getElementById('resourceGrid');
const loadingResources = document.getElementById('loadingResources');

// Guardar Recurso
if (resourceForm) {
    resourceForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) return;

        const materia = document.getElementById('resSubject').value.trim();
        const titulo = document.getElementById('resTitle').value.trim();
        const url = document.getElementById('resUrl').value.trim();

        if (!materia || !titulo || !url) {
            mostrarToast('Por favor, completa todos los campos requeridos.', 'danger');
            return;
        }

        // Validación estricta de protocolo seguro (http:// o https://)
        if (!esUrlSegura(url)) {
            mostrarToast('⚠️ Por favor ingresa un enlace web válido que comience con http:// o https://', 'danger');
            return;
        }

        const btn = document.getElementById('btnGuardarRecurso');
        if (btn) btn.disabled = true;

        try {
            await addDoc(collection(db, "recursos"), {
                userId: currentUser.uid,
                materia: materia,
                titulo: titulo,
                url: url,
                enPapelera: false,
                eliminado: false,
                creadoEn: new Date().toISOString()
            });

            mostrarToast('Recurso guardado con éxito', 'success');

            resourceForm.reset();
            cargarRecursos();
        } catch (error) {
            console.error("Error al guardar recurso:", error);
            mostrarToast('Error al guardar el recurso.', 'danger');
        } finally {
            if (btn) btn.disabled = false;
        }
    });
}

// Cargar Recursos
async function cargarRecursos() {
    if (!currentUser || !resourceGrid) return;

    try {
        if (loadingResources) loadingResources.style.display = 'block';

        const q = query(collection(db, "recursos"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        resourceGrid.innerHTML = '';
        if (loadingResources) loadingResources.style.display = 'none';

        if (querySnapshot.empty) {
            resourceGrid.innerHTML = '<p class="loading-text">No tienes recursos ni enlaces guardados.</p>';
            return;
        }

        let elementosVisibles = 0;

        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();

            // Filtrar eliminados o movidos a papelera
            if (data.enPapelera === true || data.eliminado === true || data.eliminado === "true") return;

            elementosVisibles++;

            // Verificar si el enlace guardado en la base de datos es seguro
            const enlaceValido = esUrlSegura(data.url);
            const enlaceHtml = enlaceValido 
                ? `<a href="${sanearTexto(data.url)}" target="_blank" rel="noopener noreferrer" class="link-btn">Abrir Recurso 🔗</a>`
                : `<span class="link-btn disabled" style="opacity:0.6; cursor:not-allowed;">Enlace Inseguro ⚠️</span>`;

            const card = document.createElement('div');
            card.className = 'resource-card';
            card.innerHTML = `
                <div>
                    <span>${sanearTexto(data.materia)}</span>
                    <h4>${sanearTexto(data.titulo)}</h4>
                    ${enlaceHtml}
                </div>
                <button type="button" class="btn-delete" data-id="${docSnapshot.id}">🗑️ Eliminar</button>
            `;

            resourceGrid.appendChild(card);
        });

        if (elementosVisibles === 0) {
            resourceGrid.innerHTML = '<p class="loading-text">No tienes recursos activos guardados.</p>';
            return;
        }

        // Eventos para mover recurso a la papelera utilizando mostrarConfirmacion estandarizado
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const confirmado = await mostrarConfirmacion(
                    '¿Deseas enviar este recurso a la papelera de reciclaje?',
                    'Enviar a Papelera'
                );

                if (confirmado) {
                    try {
                        const docRef = doc(db, "recursos", id);
                        await updateDoc(docRef, {
                            enPapelera: true,
                            eliminado: true,
                            eliminadoEn: new Date().toISOString()
                        });
                        mostrarToast('Recurso enviado a la papelera', 'info');
                        cargarRecursos();
                    } catch (err) {
                        console.error("Error al mover recurso a papelera:", err);
                        mostrarToast('Error al eliminar el recurso', 'danger');
                    }
                }
            });
        });

    } catch (error) {
        console.error("Error al cargar recursos:", error);
        if (loadingResources) loadingResources.style.display = 'none';
        mostrarToast('Error al cargar la lista de recursos', 'danger');
    }
}

// Función de saneamiento contra inyección HTML
function sanearTexto(texto) {
    if (!texto) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}