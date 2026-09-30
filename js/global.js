// ==========================================
// MÓDULO GLOBAL Y UTILIDADES
// ==========================================
import { auth } from './firebase-config.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/**
 * Observa el estado de autenticación del usuario actual.
 * @param {Function} callback - Función que recibe al usuario autenticado o null.
 */
export function observarSesion(callback) {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}

/**
 * Función global para mostrar notificaciones Toast en pantalla.
 * @param {string} mensaje - Texto a mostrar.
 * @param {string} tipo - Tipo de notificación ('success', 'danger', 'info').
 */
export function mostrarToast(mensaje, tipo = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    toast.style.cssText = `
        padding: 12px 20px;
        border-radius: 8px;
        color: #fff;
        font-size: 0.9rem;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: opacity 0.3s ease;
        background-color: ${tipo === 'success' ? '#10b981' : tipo === 'danger' ? '#ef4444' : '#3b82f6'};
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

/**
 * Función centralizada para cerrar la sesión activa del usuario.
 */
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
 * Actualiza la etiqueta y el icono dentro del botón de selección de tema.
 * @param {HTMLElement} btn - Botón del DOM
 * @param {string} theme - Tema activo ('dark' o 'light')
 */
function actualizarTextoBotonTema(btn, theme) {
    if (!btn) return;
    btn.innerHTML = theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
}

// Inicialización de event listeners cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

    // 1. Inicialización y Persistencia del Modo Oscuro (Soporta data-theme en <html> y clase dark-mode en <body>)
    const currentTheme = localStorage.getItem('crecer-theme') || localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.add('dark-mode');
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.classList.remove('dark-mode');
    }

    // 2. Insertar contenedor de Toasts si no existe en el DOM
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }

    // 3. Configurar el botón de cambio de tema
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        actualizarTextoBotonTema(themeBtn, currentTheme);
        
        themeBtn.addEventListener('click', () => {
            const isDarkAttr = document.documentElement.getAttribute('data-theme') === 'dark';
            const isDarkClass = document.body.classList.contains('dark-mode');
            const isDark = isDarkAttr || isDarkClass;

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

    // 4. Menú navegable responsive (Menú principal)
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // 5. Configurar el menú desplegable (Soporta múltiples estructuras: .dropdown, #dropdownBtn/#dropdownContent, etc.)
    const dropdowns = document.querySelectorAll(".dropdown");

    dropdowns.forEach(function (dropdown) {
        const dropBtn = dropdown.querySelector(".dropdown-btn") || dropdown.querySelector(".dropbtn") || document.getElementById('dropdownBtn');

        if (dropBtn) {
            dropBtn.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Cierra otros dropdowns abiertos
                dropdowns.forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove("active");
                        const content = d.querySelector('.dropdown-content') || document.getElementById('dropdownContent');
                        if (content) content.classList.remove('show');
                    }
                });

                dropdown.classList.toggle("active");
                const dropdownContent = dropdown.querySelector('.dropdown-content') || document.getElementById('dropdownContent');
                if (dropdownContent) {
                    dropdownContent.classList.toggle('show');
                }
            });
        }
    });

    // Cierra cualquier dropdown al hacer clic fuera
    window.addEventListener("click", function (e) {
        dropdowns.forEach(function (dropdown) {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
                const dropdownContent = dropdown.querySelector('.dropdown-content') || document.getElementById('dropdownContent');
                if (dropdownContent) {
                    dropdownContent.classList.remove('show');
                }
            }
        });
    });

    // 6. Configurar el botón de Cierre de Sesión (Soporta IDs 'btnCerrarSesion', 'logoutBtn' y 'btnLogout')
    const ejecutarCierreSesion = async (e) => {
        if (e) e.preventDefault();
        try {
            await cerrarSesion();
        } catch (error) {
            console.error("Error al cerrar sesión mediante función principal:", error);
            try {
                await signOut(auth);
                window.location.href = 'login.html';
            } catch (err) {
                console.error("Error definitivo al cerrar sesión:", err);
            }
        }
    };

    ['btnCerrarSesion', 'logoutBtn', 'btnLogout'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', ejecutarCierreSesion);
        }
    });
});