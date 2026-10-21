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
import { observarSesion, mostrarToast } from './global.js';

let currentUser = null;
let misNotas = [];

/**
 * Función robusta para aplicar y persistir el tema visual de forma inmediata.
 * @param {string} tema - Puede ser 'dark' o 'light'.
 */
function aplicarTema(tema) {
    const themeToggle = document.getElementById('themeToggle');

    if (tema === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (themeToggle) themeToggle.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        if (themeToggle) themeToggle.textContent = '🌙';
    }
}

/**
 * Inicialización de eventos principales al cargar el DOM del documento.
 */
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    // 1. Cargar preferencia inicial del tema desde localStorage o sistema operativo
    const temaGuardado = localStorage.getItem('theme');
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const temaInicial = temaGuardado ? temaGuardado : (prefiereDark ? 'dark' : 'light');
    
    aplicarTema(temaInicial);

    // 2. Conmutador de Tema infalible al primer clic sin desfases
    if (themeToggle) {
        // Removemos eventos previos clonando el nodo para evitar listeners duplicados
        const nuevoToggle = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(nuevoToggle, themeToggle);

        nuevoToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Evaluamos el estado actual directamente desde el atributo del DOM o el almacenamiento
            const esActualmenteDark = document.documentElement.getAttribute('data-theme') === 'dark' || 
                                      document.body.getAttribute('data-theme') === 'dark' ||
                                      localStorage.getItem('theme') === 'dark';

            // Alternamos al opuesto exacto de inmediato
            const nuevoTema = esActualmenteDark ? 'light' : 'dark';
            aplicarTema(nuevoTema);
        });
    }

    // 3. Menú hamburguesa responsivo para dispositivos móviles
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
        });
    }

    // 4. Control del Menú Desplegable (Dropdown de Módulos)
    const dropdown = document.querySelector(".dropdown");
    const dropdownBtn = document.getElementById("dropdownBtn");

    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdown.classList.toggle("active");
        });

        // Cerrar menú desplegable al hacer clic fuera del mismo
        window.addEventListener("click", (e) => {
            if (dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
            }
        });
    }
});

/**
 * Protección de ruta y ciclo de vida mediante el observador de sesión institucional.
 */
observarSesion((user) => {
    if (user) {
        currentUser = user;
        cargarNotas();
    } else {
        window.location.href = 'login.html';
    }
});

/**
 * Cargar calificaciones desde Firestore de forma asíncrona y segura para el usuario actual.
 */
async function cargarNotas() {
    if (!currentUser) return;

    try {
        const q = query(collection(db, "notas"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        misNotas = [];
        querySnapshot.forEach((docSnap) => {
            misNotas.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderizarNotas();
    } catch (error) {
        console.error("Error al cargar notas de la base de datos:", error);
        mostrarToast('Error al sincronizar calificaciones con la base de datos', 'danger');
    }
}

/**
 * Renderizar tarjetas dinámicas, contadores institucionales y cálculo formal de promedios generales.
 */
function renderizarNotas() {
    const notasGrid = document.getElementById('notasGrid');
    const promedioGeneralEl = document.getElementById('promedioGeneral');
    const promedioEstadoEl = document.getElementById('promedioEstado');
    const totalNotasBadge = document.getElementById('totalNotasBadge');

    if (!notasGrid) return;
    notasGrid.innerHTML = '';

    if (totalNotasBadge) {
        totalNotasBadge.textContent = `${misNotas.length} ${misNotas.length === 1 ? 'registro' : 'registros'}`;
    }

    if (misNotas.length === 0) {
        notasGrid.innerHTML = '<p class="empty-msg">Aún no has registrado calificaciones en el sistema académico.</p>';
        if (promedioGeneralEl) promedioGeneralEl.textContent = '--';
        if (promedioEstadoEl) {
            promedioEstadoEl.textContent = 'Registra tus calificaciones para calcular de forma automática tu desempeño general y estadísticas de aprobación.';
        }
        return;
    }

    let sumaTotal = 0;

    misNotas.forEach((item) => {
        const notaNumerica = parseFloat(item.calificacion) || 0;
        sumaTotal += notaNumerica;

        const card = document.createElement('div');
        card.className = 'nota-card';
        card.innerHTML = `
            <div class="nota-header">
                <span class="nota-materia" title="${sanearTexto(item.materia)}">${sanearTexto(item.materia)}</span>
                <span class="nota-badge ${notaNumerica >= 6 ? 'aprobado' : 'reprobado'}">${item.calificacion}</span>
            </div>
            <h4>${sanearTexto(item.evaluacion)}</h4>
            ${item.observacion ? `<p class="nota-observacion">"${sanearTexto(item.observacion)}"</p>` : ''}
            <small class="nota-fecha">📅 ${sanearTexto(item.fecha || 'Sin fecha asignada')}</small>
            <button class="btn-delete-nota" data-id="${item.id}" title="Eliminar nota" type="button">🗑️</button>
        `;

        // Evento para eliminar nota con confirmación previa e interacción fluida
        const deleteBtn = card.querySelector('.btn-delete-nota');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const confirmado = confirm(`¿Estás seguro de eliminar la calificación de ${item.materia}?`);
                if (confirmado) {
                    try {
                        await deleteDoc(doc(db, "notas", item.id));
                        mostrarToast('Calificación eliminada correctamente', 'info');
                        await cargarNotas();
                    } catch (err) {
                        console.error("Error al eliminar el documento de nota:", err);
                        mostrarToast('Error al procesar la eliminación en el servidor', 'danger');
                    }
                }
            });
        }

        notasGrid.appendChild(card);
    });

    // Cálculo formal y preciso del Promedio General Académico
    const promedio = (sumaTotal / misNotas.length).toFixed(2);
    if (promedioGeneralEl) promedioGeneralEl.textContent = promedio;

    if (promedioEstadoEl) {
        const promedioNum = parseFloat(promedio);
        if (promedioNum >= 8.5) {
            promedioEstadoEl.textContent = '🌟 ¡Excelente rendimiento académico de nivel sobresaliente!';
        } else if (promedioNum >= 7) {
            promedioEstadoEl.textContent = '👍 Muy buen desempeño académico, continúa con este ritmo constante de estudio.';
        } else if (promedioNum >= 6) {
            promedioEstadoEl.textContent = '⚠️ Rendimiento regular aprobado. Se sugiere reforzar conceptos clave en las materias.';
        } else {
            promedioEstadoEl.textContent = '❌ Calificación por debajo del promedio mínimo aprobatorio. Requiere atención y tutoría inmediata.';
        }
    }
}

/**
 * Gestión del formulario para el envío y registro de una nueva nota en Firestore con validaciones completas.
 */
const notaForm = document.getElementById('notaForm');

if (notaForm) {
    notaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            mostrarToast('Debes iniciar sesión para registrar notas', 'danger');
            return;
        }

        const btnGuardar = document.getElementById('btnGuardarNota');
        if (btnGuardar) btnGuardar.disabled = true;

        const materiaInput = document.getElementById('materiaNotaInput');
        const evaluacionInput = document.getElementById('evaluacionInput');
        const calificacionInput = document.getElementById('calificacionInput');
        const fechaInput = document.getElementById('fechaNotaInput');
        const observacionesInput = document.getElementById('observacionesInput');

        const materia = materiaInput ? materiaInput.value.trim() : '';
        const evaluacion = evaluacionInput ? evaluacionInput.value.trim() : '';
        const calificacion = calificacionInput ? parseFloat(calificacionInput.value) : NaN;
        const fecha = fechaInput ? fechaInput.value : '';
        const observacion = observacionesInput ? observacionesInput.value.trim() : '';

        if (!materia || !evaluacion || isNaN(calificacion)) {
            mostrarToast('Por favor, completa todos los campos obligatorios correctamente.', 'danger');
            if (btnGuardar) btnGuardar.disabled = false;
            return;
        }

        if (calificacion < 1 || calificacion > 10) {
            mostrarToast('La calificación debe encontrarse en un rango de 1 a 10.', 'danger');
            if (btnGuardar) btnGuardar.disabled = false;
            return;
        }

        try {
            await addDoc(collection(db, "notas"), {
                userId: currentUser.uid,
                materia,
                evaluacion,
                calificacion,
                fecha,
                observacion,
                creadoEn: new Date().toISOString()
            });

            mostrarToast('Calificación registrada con éxito en el sistema', 'success');
            notaForm.reset();
            await cargarNotas();
        } catch (error) {
            console.error("Error al registrar la nueva nota en Firestore:", error);
            mostrarToast('Error al guardar la calificación en la base de datos', 'danger');
        } finally {
            if (btnGuardar) btnGuardar.disabled = false;
        }
    });
}

/**
 * Función de seguridad para sanear cadenas de texto y evitar inyecciones HTML en la interfaz.
 */
function sanearTexto(texto) {
    if (!texto) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}