// ==========================================
// MÓDULO GLOBAL Y UTILIDADES - CRECER
// ==========================================
import { auth } from './firebase-config.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Observador de autenticación
export function observarSesion(callback) {
    return onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}

// Cierre de sesión de Firebase
export async function cerrarSesion() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        mostrarToast("No se pudo cerrar sesión", "danger");
    }
}

/**
 * Reemplazo asíncrono estilizado para confirm() nativo del navegador
 * @param {string} mensaje - Pregunta o advertencia a mostrar
 * @param {string} titulo - Título de la alerta
 * @returns {Promise<boolean>} Devuelve true si el usuario hace clic en Aceptar
 */
export function mostrarConfirmacion(mensaje, titulo = '¿Estás seguro?') {
    return new Promise((resolve) => {
        // Eliminar modal previo si existe
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

        // Animación de entrada
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
 * @param {string} mensaje 
 * @param {string} tipo - 'success', 'danger', 'error', 'warning', 'info'
 * @param {number} duracion - Tiempo en milisegundos
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

function actualizarTextoBotonTema(btn, theme) {
    if (!btn) return;
    btn.innerHTML = theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
}

// Inicialización de Interfaz y Eventos Globales
document.addEventListener('DOMContentLoaded', () => {
    // 1. Gestión de Tema Modo Claro / Oscuro
    const currentTheme = localStorage.getItem('crecer-theme') || localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.add('dark-mode');
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.classList.remove('dark-mode');
    }

    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        actualizarTextoBotonTema(themeBtn, currentTheme);
        
        themeBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark-mode');

            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                document.body.classList.remove('dark-mode');
                localStorage.setItem('crecer-theme', 'light');
                localStorage.setItem('theme', 'light');
                actualizarTextoBotonTema(themeBtn, 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.body.classList.add('dark-mode');
                localStorage.setItem('crecer-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                actualizarTextoBotonTema(themeBtn, 'dark');
            }
        });
    }

    // 2. Control del Menú Desplegable (Dropdowns)
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

    // 3. Manejo Unificado de Cierre de Sesión
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