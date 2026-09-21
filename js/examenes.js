import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const examForm = document.getElementById('examForm');
  const examSubjectInput = document.getElementById('examSubject');
  const examTopicsInput = document.getElementById('examTopics');
  const examDateInput = document.getElementById('examDate');
  const examGrid = document.getElementById('examGrid');
  const loadingExams = document.getElementById('loadingExams');

  const examenesRef = collection(db, 'examenes');

  // Función para obtener y mostrar los exámenes desde Firestore
  async function cargarExamenes() {
    examGrid.innerHTML = '';
    loadingExams.style.display = 'block';

    try {
      const q = query(examenesRef, orderBy('fecha', 'asc'));
      const querySnapshot = await getDocs(q);
      loadingExams.style.display = 'none';

      if (querySnapshot.empty) {
        examGrid.innerHTML = '<p class="loading-text">No hay exámenes programados.</p>';
        return;
      }

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const card = document.createElement('div');
        card.className = 'exam-card';
        card.innerHTML = `
          <div>
            <h4>${data.materia}</h4>
            <p><strong>Temario:</strong> ${data.temario}</p>
            <div class="exam-date-badge">📅 Fecha: ${data.fecha}</div>
          </div>
          <button class="btn-delete" data-id="${docSnap.id}">Eliminar Examen</button>
        `;
        examGrid.appendChild(card);
      });

      // Asignar eventos de eliminación
      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          await deleteDoc(doc(db, 'examenes', id));
          cargarExamenes();
        });
      });

    } catch (error) {
      console.error("Error al cargar exámenes:", error);
      loadingExams.textContent = 'Error al consultar la base de datos.';
    }
  }

  // Guardar nuevo examen
  examForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const materia = examSubjectInput.value.trim();
    const temario = examTopicsInput.value.trim();
    const fecha = examDateInput.value;

    if (!materia || !temario || !fecha) return;

    try {
      await addDoc(examenesRef, { 
        materia, 
        temario, 
        fecha, 
        creadoEn: new Date() 
      });
      examForm.reset();
      cargarExamenes();
    } catch (error) {
      console.error("Error al agendar el examen:", error);
    }
  });

  // Cargar lista inicial
  cargarExamenes();
});