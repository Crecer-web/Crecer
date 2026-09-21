import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
  const taskCountEl = document.getElementById('taskCount');
  const examCountEl = document.getElementById('examCount');

  try {
    // Obtener contadores de la base de datos de Firestore
    const tasksSnap = await getDocs(collection(db, 'tareas'));
    taskCountEl.textContent = `${tasksSnap.size} activas`;

    const examsSnap = await getDocs(collection(db, 'examenes'));
    examCountEl.textContent = `${examsSnap.size} agendados`;
  } catch (error) {
    console.error("Error al obtener resúmenes del dashboard:", error);
    taskCountEl.textContent = '0';
    examCountEl.textContent = '0';
  }
});