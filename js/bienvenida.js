import { observarSesion } from './global.js';

document.addEventListener('DOMContentLoaded', () => {
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navRegisterBtn = document.getElementById('navRegisterBtn');
    const heroStartBtn = document.getElementById('heroStartBtn');

    // Control dinámico de botones según el estado de la sesión de Firebase
    observarSesion((user) => {
        if (user) {
            // Usuario Autenticado: Redirigir directamente a la agenda activa
            if (navLoginBtn) {
                navLoginBtn.textContent = 'Ir a la Agenda 📋';
                navLoginBtn.href = 'inicio.html';
            }
            if (navRegisterBtn) {
                navRegisterBtn.style.display = 'none'; // Ocultamos el registro si ya tiene sesión
            }
            if (heroStartBtn) {
                heroStartBtn.textContent = 'Ingresar a mi Cuenta 🚀';
                heroStartBtn.href = 'inicio.html';
            }
        } else {
            // Usuario Visitante: Mantener accesos institucionales estándar
            if (navLoginBtn) {
                navLoginBtn.textContent = 'Iniciar Sesión';
                navLoginBtn.href = 'login.html';
            }
            if (navRegisterBtn) {
                navRegisterBtn.style.display = 'inline-flex';
                navRegisterBtn.href = 'register.html';
            }
            if (heroStartBtn) {
                heroStartBtn.textContent = 'Comenzar Ahora 🚀';
                heroStartBtn.href = 'register.html';
            }
        }
    });

    // Menús desplegables (Dropdowns) por seguridad de interacción
    const dropdowns = document.querySelectorAll(".dropdown");

    dropdowns.forEach((dropdown) => {
        const dropBtn = dropdown.querySelector(".dropbtn");

        if (dropBtn) {
            dropBtn.addEventListener("click", (e) => {
                e.preventDefault();
                dropdown.classList.toggle("active");
            });
        }
    });

    window.addEventListener("click", (e) => {
        dropdowns.forEach((dropdown) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
            }
        });
    });
});