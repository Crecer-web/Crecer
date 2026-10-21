// ==========================================
// MÓDULO GLOBAL Y UTILIDADES - CRECER
// ==========================================
import { auth } from './firebase-config.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/**
 * Observador de autenticación de Firebase
 */
export function observarSesion(callback) {
    return onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}

/**
 * Cierre de sesión seguro de Firebase y redirección al login
 */
export async function cerrarSesion() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        mostrarToast("No se pudo cerrar sesión correctamente.", "danger");
    }
}

/**
 * Reemplazo asíncrono estilizado para confirm() nativo del navegador
 */
export function mostrarConfirmacion(mensaje, titulo = '¿Estás seguro?') {
    return new Promise((resolve) => {
        const modalExistente = document.getElementById('customConfirmModal');
        if (modalExistente) modalExistente.remove();

        const overlay = document.createElement('div');
        overlay.id = 'customConfirmModal';
        overlay.className = 'custom-confirm-overlay';

        overlay.innerHTML = `
            <div class="custom-confirm-card" role="dialog" aria-modal="true">
                <h4>⚠️ ${sanearTextoGlobal(titulo)}</h4>
                <p>${sanearTextoGlobal(mensaje)}</p>
                <div class="custom-confirm-actions">
                    <button type="button" class="btn-confirm-cancel" id="btnConfirmCancel">Cancelar</button>
                    <button type="button" class="btn-confirm-accept" id="btnConfirmAccept">Aceptar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });

        const btnCancel = overlay.querySelector('#btnConfirmCancel');
        const btnAccept = overlay.querySelector('#btnConfirmAccept');

        const cerrarModal = (resultado) => {
            document.removeEventListener('keydown', manejarTeclas);
            overlay.classList.remove('show');
            overlay.addEventListener('transitionend', () => {
                if (overlay.parentElement) {
                    overlay.remove();
                }
                resolve(resultado);
            }, { once: true });
        };

        const manejarTeclas = (e) => {
            if (e.key === 'Escape') cerrarModal(false);
            if (e.key === 'Enter') cerrarModal(true);
        };

        document.addEventListener('keydown', manejarTeclas);
        btnCancel.addEventListener('click', () => cerrarModal(false));
        btnAccept.addEventListener('click', () => cerrarModal(true));

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cerrarModal(false);
        });
    });
}

/**
 * Sistema de Notificaciones Flotantes (Toast)
 */
export function mostrarToast(mensaje, tipo = 'info', duracion = 3500) {
    let container = document.getElementById('toast-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const iconos = {
        success: '✅',
        danger: '⚠️',
        error: '❌',
        warning: '🔔',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        <span style="font-size: 1.1rem; display: inline-flex; align-items: center;">${iconos[tipo] || 'ℹ️'}</span>
        <span style="flex: 1;">${sanearTextoGlobal(mensaje)}</span>
        <button type="button" class="toast-close" aria-label="Cerrar">&times;</button>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    toast.querySelector('.toast-close').addEventListener('click', () => {
        ocultarToast(toast);
    });

    setTimeout(() => {
        ocultarToast(toast);
    }, duracion);
}

function ocultarToast(toast) {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
        if (toast.parentElement) {
            toast.remove();
        }
    });
}

function sanearTextoGlobal(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Aplica el tema de manera segura sobre la etiqueta principal
 */
function aplicarTema(tema) {
    if (tema === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function actualizarIconoTema(btn, tema) {
    if (!btn) return;
    btn.textContent = tema === 'dark' ? '☀️' : '🌙';
}

// Aplicar tema de forma inmediata apenas se ejecuta el script
const temaInicial = localStorage.getItem('theme') || 'light';
aplicarTema(temaInicial);

// Eventos tras la carga completa del DOM
document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('themeToggle');
    const temaActual = localStorage.getItem('theme') || 'light';

    aplicarTema(temaActual);
    if (themeBtn) {
        actualizarIconoTema(themeBtn, temaActual);
        
        themeBtn.addEventListener('click', () => {
            const esDarkActual = document.documentElement.getAttribute('data-theme') === 'dark';
            const nuevoTema = esDarkActual ? 'light' : 'dark';
            
            aplicarTema(nuevoTema);
            localStorage.setItem('theme', nuevoTema);
            localStorage.setItem('crecer-theme', nuevoTema);
            actualizarIconoTema(themeBtn, nuevoTema);
        });
    }

    // Control del Menú Desplegable (Dropdowns)
    const dropdowns = document.querySelectorAll(".dropdown");

    dropdowns.forEach((dropdown) => {
        const dropBtn = dropdown.querySelector(".dropdown-btn") || dropdown.querySelector(".dropbtn");

        if (dropBtn) {
            dropBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                dropdowns.forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove("active");
                        const content = d.querySelector('.dropdown-content');
                        if (content) content.classList.remove('show');
                    }
                });

                dropdown.classList.toggle("active");
                const dropdownContent = dropdown.querySelector('.dropdown-content');
                if (dropdownContent) {
                    dropdownContent.classList.toggle('show');
                }
            });
        }
    });

    window.addEventListener("click", (e) => {
        dropdowns.forEach((dropdown) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
                const dropdownContent = dropdown.querySelector('.dropdown-content');
                if (dropdownContent) {
                    dropdownContent.classList.remove('show');
                }
            }
        });
    });

    // Manejo de Cierre de Sesión
    const ejecutarCierreSesion = async (e) => {
        if (e) e.preventDefault();
        await cerrarSesion();
    };

    ['btnCerrarSesion', 'logoutBtn', 'btnLogout'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', ejecutarCierreSesion);
        }
    });
});