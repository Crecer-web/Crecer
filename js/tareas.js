import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const taskForm = document.getElementById('taskForm');
  const taskTitleInput = document.getElementById('taskTitle');
  const taskDueDateInput = document.getElementById('taskDueDate');
  const taskList = document.getElementById('taskList');
  const loading = document.getElementById('loading');

  const tareasRef = collection(db, 'tareas');

  // Función para obtener y listar las tareas desde Firestore
  async function cargarTareas() {
    taskList.innerHTML = '';
    loading.style.display = 'block';

    try {
      const q = query(tareasRef, orderBy('fecha', 'asc'));
      const querySnapshot = await getDocs(q);
      loading.style.display = 'none';

      if (querySnapshot.empty) {
        taskList.innerHTML = '<li class="loading-text">No hay tareas pendientes.</li>';
        return;
      }

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
          <div class="item-info">
            <strong>${data.titulo}</strong>
            <span>Vence: ${data.fecha}</span>
          </div>
          <button class="btn-delete" data-id="${docSnap.id}">Eliminar</button>
        `;
        taskList.appendChild(li);
      });

      // Asignar eventos de eliminación
      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          await deleteDoc(doc(db, 'tareas', id));
          cargarTareas();
        });
      });

    } catch (error) {
      console.error("Error al cargar tareas:", error);
      loading.textContent = 'Error al consultar la base de datos.';
    }
  }

  // Guardar nueva tarea
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = taskTitleInput.value.trim();
    const fecha = taskDueDateInput.value;

    if (!titulo || !fecha) return;

    try {
      await addDoc(tareasRef, { 
        titulo, 
        fecha, 
        creadoEn: new Date() 
      });
      taskForm.reset();
      cargarTareas();
    } catch (error) {
      console.error("Error al guardar la tarea:", error);
    }
  });

  // Cargar lista inicial
  cargarTareas();
});