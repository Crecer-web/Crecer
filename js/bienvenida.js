import { observarSesion } from './global.js';

document.addEventListener('DOMContentLoaded', () => {
    const authActionBtn = document.getElementById('authActionBtn');
    const registerActionBtn = document.getElementById('registerActionBtn'); // Si tienes un botón secundario específico de registro

    observarSesion((user) => {
        if (authActionBtn) {
            if (user) {
                authActionBtn.textContent = 'Ir a mis Tareas 📋';
                authActionBtn.href = 'tareas.html';
            } else {
                authActionBtn.textContent = 'Iniciar Sesión 🚀';
                authActionBtn.href = 'login.html';
            }
        }

        // Aseguramos que el botón de registro abra el login directo en la pestaña de registro
        if (registerActionBtn) {
            if (user) {
                registerActionBtn.href = 'tareas.html';
            } else {
                registerActionBtn.href = 'login.html?mode=register';
            }
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
  // Seleccionamos todos los contenedores de menú desplegable
  const dropdowns = document.querySelectorAll(".dropdown");

  dropdowns.forEach(function (dropdown) {
    const dropBtn = dropdown.querySelector(".dropbtn"); // Ajusta la clase del botón si es distinta

    if (dropBtn) {
      dropBtn.addEventListener("click", function (e) {
        // Previene el comportamiento por defecto si es un enlace
        e.preventDefault();
        
        // Alterna la clase 'active' para mostrar/ocultar el contenido
        dropdown.classList.toggle("active");
      });
    }
  });

  // Cierra el menú si se hace clic fuera de él
  window.addEventListener("click", function (e) {
    dropdowns.forEach(function (dropdown) {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("active");
      }
    });
  });
});