import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc,
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion, mostrarToast, mostrarConfirmacion } from './global.js';

let currentUser = null;
let misNotas = [];

function inicializarTema() {
    const themeToggle = document.getElementById('themeToggle');
    const temaGuardado = localStorage.getItem('theme');
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const temaInicial = temaGuardado ? temaGuardado : (prefiereDark ? 'dark' : 'light');

    aplicarTemaDirecto(temaInicial);

    if (themeToggle) {
        const nuevoToggle = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(nuevoToggle, themeToggle);

        nuevoToggle.addEventListener('click', () => {
            const esOscuroActual = document.documentElement.getAttribute('data-theme') === 'dark' || 
                                   document.body.getAttribute('data-theme') === 'dark';
            
            const nuevoTema = esOscuroActual ? 'light' : 'dark';
            aplicarTemaDirecto(nuevoTema);
        });
    }
}

function aplicarTemaDirecto(tema) {
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

document.addEventListener('DOMContentLoaded', () => {
    inicializarTema();

    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
        });
    }

    const dropdown = document.querySelector(".dropdown");
    const dropdownBtn = document.getElementById("dropdownBtn");

    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdown.classList.toggle("active");
        });

        window.addEventListener("click", (e) => {
            if (dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
            }
        });
    }

    const modal = document.getElementById('modalEditarNota');
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const btnCancelarEdit = document.getElementById('btnCancelarEdit');

    const cerrarModal = () => {
        if (modal) modal.classList.add('hidden');
    };

    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModal);
    if (btnCancelarEdit) btnCancelarEdit.addEventListener('click', cerrarModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarModal();
        });
    }
});

observarSesion((user) => {
    if (user) {
        currentUser = user;
        cargarNotas();
    } else {
        window.location.href = 'login.html';
    }
});

async function cargarNotas() {
    if (!currentUser) return;

    try {
        const q = query(collection(db, "notas"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        misNotas = [];
        querySnapshot.forEach((docSnap) => {
            misNotas.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderizarMateriasAgrupadas();
    } catch (error) {
        console.error("Error al cargar notas de la base de datos:", error);
        mostrarToast('Error al sincronizar calificaciones con la base de datos', 'danger');
    }
}

function normalizarTextoMateria(texto) {
    if (!texto) return '';
    return texto
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function renderizarMateriasAgrupadas() {
    const materiasGrid = document.getElementById('materiasGrid');
    const promedioGeneralEl = document.getElementById('promedioGeneral');
    const promedioEstadoEl = document.getElementById('promedioEstado');
    const totalNotasBadge = document.getElementById('totalNotasBadge');

    if (!materiasGrid) return;
    materiasGrid.innerHTML = '';

    if (misNotas.length === 0) {
        materiasGrid.innerHTML = '<p class="empty-msg">Aún no has registrado calificaciones en el sistema académico.</p>';
        if (totalNotasBadge) totalNotasBadge.textContent = '0 materias';
        if (promedioGeneralEl) promedioGeneralEl.textContent = '--';
        if (promedioEstadoEl) {
            promedioEstadoEl.textContent = 'Registra tus calificaciones para calcular de forma automática el promedio individual de cada materia y tu rendimiento global.';
        }
        return;
    }

    const agrupadoPorMateria = {};

    misNotas.forEach(nota => {
        const materiaNombreOriginal = (nota.materia || 'Sin Materia').trim();
        const claveMateria = normalizarTextoMateria(materiaNombreOriginal);

        if (!agrupadoPorMateria[claveMateria]) {
            agrupadoPorMateria[claveMateria] = {
                nombreOriginal: materiaNombreOriginal,
                evaluaciones: []
            };
        }
        agrupadoPorMateria[claveMateria].evaluaciones.push(nota);
    });

    const llavesMaterias = Object.keys(agrupadoPorMateria);
    if (totalNotasBadge) {
        totalNotasBadge.textContent = `${llavesMaterias.length} ${llavesMaterias.length === 1 ? 'materia' : 'materias'}`;
    }

    let sumaTotalTodasLasNotas = 0;
    let cantidadTotalEvaluaciones = misNotas.length;

    llavesMaterias.sort().forEach(clave => {
        const materiaObj = agrupadoPorMateria[clave];
        const evaluaciones = materiaObj.evaluaciones;

        let sumaMateria = 0;
        evaluaciones.forEach(ev => {
            const numVal = parseFloat(ev.calificacion) || 0;
            sumaMateria += numVal;
            sumaTotalTodasLasNotas += numVal;
        });

        const promedioMateria = (sumaMateria / evaluaciones.length).toFixed(2);
        const esAprobado = parseFloat(promedioMateria) >= 6;

        const cardMateria = document.createElement('article');
        cardMateria.className = 'materia-card';

        let evaluacionesHTML = '';
        evaluaciones.forEach(ev => {
            evaluacionesHTML += `
                <div class="evaluacion-item">
                    <div class="evaluacion-info">
                        <span class="evaluacion-nombre">${sanearTexto(ev.evaluacion)}</span>
                        <span class="evaluacion-meta">Fecha: ${sanearTexto(ev.fecha || 'Sin fecha')} ${ev.observacion ? `&bull; <i>${sanearTexto(ev.observacion)}</i>` : ''}</span>
                    </div>
                    <div class="evaluacion-nota-group">
                        <span class="evaluacion-nota">${parseFloat(ev.calificacion).toFixed(1)}</span>
                        <button class="btn-edit-eval" data-id="${ev.id}" title="Editar nota" type="button">Editar</button>
                        <button class="btn-delete-eval" data-id="${ev.id}" title="Eliminar nota" type="button">Eliminar</button>
                    </div>
                </div>
            `;
        });

        cardMateria.innerHTML = `
            <div class="materia-card-header">
                <div class="materia-titulo-group">
                    <h4>${sanearTexto(materiaObj.nombreOriginal)}</h4>
                </div>
                <div class="materia-promedio-badge ${esAprobado ? 'aprobado' : 'reprobado'}">
                    Promedio: ${promedioMateria}
                </div>
            </div>
            <div class="evaluaciones-list">
                ${evaluacionesHTML}
            </div>
        `;

        cardMateria.querySelectorAll('.btn-edit-eval').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idNota = e.currentTarget.getAttribute('data-id');
                abrirModalEdicion(idNota);
            });
        });

        cardMateria.querySelectorAll('.btn-delete-eval').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idNota = e.currentTarget.getAttribute('data-id');
                
                let confirmado = false;
                if (typeof mostrarConfirmacion === 'function') {
                    confirmado = await mostrarConfirmacion(`¿Deseas eliminar esta nota?`, 'Eliminar Nota');
                } else {
                    confirmado = window.confirm(`¿Estás seguro de eliminar esta nota?`);
                }

                if (confirmado) {
                    try {
                        await deleteDoc(doc(db, "notas", idNota));
                        mostrarToast('Nota eliminada correctamente', 'info');
                        await cargarNotas();
                    } catch (err) {
                        console.error("Error al eliminar la nota:", err);
                        mostrarToast('Error al procesar la eliminación', 'danger');
                    }
                }
            });
        });

        materiasGrid.appendChild(cardMateria);
    });

    const promedioGeneral = (sumaTotalTodasLasNotas / cantidadTotalEvaluaciones).toFixed(2);
    if (promedioGeneralEl) promedioGeneralEl.textContent = promedioGeneral;

    if (promedioEstadoEl) {
        const promedioNum = parseFloat(promedioGeneral);
        if (promedioNum >= 8.5) {
            promedioEstadoEl.textContent = 'Excelente rendimiento académico general en tus materias.';
        } else if (promedioNum >= 7) {
            promedioEstadoEl.textContent = 'Muy buen desempeño académico, continúas con un promedio sólido.';
        } else if (promedioNum >= 6) {
            promedioEstadoEl.textContent = 'Rendimiento regular aprobado. Mantén atención constante a los parciales.';
        } else {
            promedioEstadoEl.textContent = 'Promedio general por debajo de 6. Se recomienda revisar las materias reprobadas.';
        }
    }
}

function abrirModalEdicion(idNota) {
    const nota = misNotas.find(n => n.id === idNota);
    if (!nota) return;

    document.getElementById('editNotaId').value = nota.id;
    document.getElementById('editMateriaInput').value = nota.materia || '';
    document.getElementById('editEvaluacionInput').value = nota.evaluacion || '';
    document.getElementById('editCalificacionInput').value = nota.calificacion || '';
    document.getElementById('editFechaInput').value = nota.fecha || '';
    document.getElementById('editObservacionesInput').value = nota.observacion || '';

    const modal = document.getElementById('modalEditarNota');
    if (modal) modal.classList.remove('hidden');
}

const editNotaForm = document.getElementById('editNotaForm');
if (editNotaForm) {
    editNotaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idNota = document.getElementById('editNotaId').value;
        const materia = document.getElementById('editMateriaInput').value.trim();
        const evaluacion = document.getElementById('editEvaluacionInput').value.trim();
        const calificacion = parseFloat(document.getElementById('editCalificacionInput').value);
        const fecha = document.getElementById('editFechaInput').value;
        const observacion = document.getElementById('editObservacionesInput').value.trim();

        if (!materia || !evaluacion || isNaN(calificacion)) {
            mostrarToast('Por favor, completa los campos obligatorios.', 'danger');
            return;
        }

        if (calificacion < 1 || calificacion > 10) {
            mostrarToast('La calificación debe estar entre 1 y 10.', 'danger');
            return;
        }

        const btnGuardar = document.getElementById('btnGuardarEditNota');
        if (btnGuardar) btnGuardar.disabled = true;

        try {
            const notaRef = doc(db, "notas", idNota);
            await updateDoc(notaRef, {
                materia,
                evaluacion,
                calificacion,
                fecha,
                observacion,
                actualizadoEn: new Date().toISOString()
            });

            mostrarToast('Calificación actualizada con éxito', 'success');
            document.getElementById('modalEditarNota').classList.add('hidden');
            await cargarNotas();
        } catch (error) {
            console.error("Error al actualizar la nota:", error);
            mostrarToast('Error al actualizar la calificación', 'danger');
        } finally {
            if (btnGuardar) btnGuardar.disabled = false;
        }
    });
}

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

            mostrarToast(`Calificación agregada a "${materia}"`, 'success');
            
            if (evaluacionInput) evaluacionInput.value = '';
            if (calificacionInput) calificacionInput.value = '';
            if (observacionesInput) observacionesInput.value = '';

            await cargarNotas();
        } catch (error) {
            console.error("Error al registrar la nueva nota en Firestore:", error);
            mostrarToast('Error al guardar la calificación en la base de datos', 'danger');
        } finally {
            if (btnGuardar) btnGuardar.disabled = false;
        }
    });
}

function sanearTexto(texto) {
    if (!texto) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}