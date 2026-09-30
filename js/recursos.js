import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion } from './global.js';
let currentUser = null;

observarSesion((user) => {
    if (user) {
        currentUser = user;
        cargarRecursos();
    } else {
        window.location.href = 'login.html';
    }
});

const recursoForm = document.getElementById('recursoForm');
const recursosGrid = document.getElementById('recursosGrid');

if (recursoForm) {
    recursoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) return;

        const titulo = document.getElementById('tituloInput').value.trim();
        const categoria = document.getElementById('categoriaSelect').value;
        const url = document.getElementById('urlInput').value.trim();
        const descripcion = document.getElementById('descripcionInput').value.trim();

        try {
            await addDoc(collection(db, "recursos"), {
                userId: currentUser.uid,
                titulo,
                categoria,
                url,
                descripcion,
                creadoEn: new Date().toISOString()
            });

            recursoForm.reset();
            cargarRecursos();
        } catch (error) {
            console.error("Error al guardar recurso:", error);
            alert("Error al guardar el recurso.");
        }
    });
}

async function cargarRecursos() {
    if (!currentUser || !recursosGrid) return;

    try {
        const q = query(collection(db, "recursos"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        recursosGrid.innerHTML = '';

        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();

            const card = document.createElement('div');
            card.className = 'recurso-card';
            card.innerHTML = `
                <div class="recurso-header">
                    <span class="badge ${data.categoria.toLowerCase()}">${data.categoria}</span>
                    <button class="btn-eliminar-recurso" data-id="${docSnapshot.id}">🗑️</button>
                </div>
                <h3>${data.titulo}</h3>
                ${data.descripcion ? `<p>${data.descripcion}</p>` : ''}
                <a href="${data.url}" target="_blank" rel="noopener noreferrer" class="btn-enlace">Abrir Recurso 🔗</a>
            `;

            recursosGrid.appendChild(card);
        });

        // Eventos para borrar recursos
        document.querySelectorAll('.btn-eliminar-recurso').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                try {
                    await deleteDoc(doc(db, "recursos", id));
                    cargarRecursos();
                } catch (err) {
                    console.error("Error al eliminar recurso:", err);
                }
            });
        });

    } catch (error) {
        console.error("Error al cargar recursos:", error);
    }
}

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