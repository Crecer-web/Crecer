import { observarSesion } from './global.js';

document.addEventListener('DOMContentLoaded', () => {
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navRegisterBtn = document.getElementById('navRegisterBtn');
    const heroStartBtn = document.getElementById('heroStartBtn');

    // Control dinámico seguro de botones según el estado de la sesión de Firebase
    observarSesion((user) => {
        if (user) {
            // Usuario Autenticado: Redirigir directamente a la agenda activa
            if (navLoginBtn) {
                navLoginBtn.textContent = 'Ir a la Agenda';
                navLoginBtn.setAttribute('href', 'inicio.html');
            }
            if (navRegisterBtn) {
                navRegisterBtn.style.display = 'none'; // Ocultamos el registro si ya tiene sesión
            }
            if (heroStartBtn) {
                heroStartBtn.textContent = 'Ingresar a mi Cuenta';
                heroStartBtn.setAttribute('href', 'inicio.html');
            }
        } else {
            // Usuario Visitante: Mantener accesos institucionales estándar
            if (navLoginBtn) {
                navLoginBtn.textContent = 'Iniciar Sesión';
                navLoginBtn.setAttribute('href', 'login.html');
            }
            if (navRegisterBtn) {
                navRegisterBtn.style.display = 'inline-flex';
                navRegisterBtn.setAttribute('href', 'register.html');
            }
            if (heroStartBtn) {
                heroStartBtn.textContent = 'Comenzar Ahora';
                heroStartBtn.setAttribute('href', 'register.html');
            }
        }
    });

    // Menús desplegables (Dropdowns) robustos con control de errores
    const dropdowns = document.querySelectorAll(".dropdown");

    if (dropdowns.length > 0) {
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
    }
});