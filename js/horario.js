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
import { observarSesion, mostrarToast, mostrarConfirmacion } from './global.js';

let currentUser = null;
let misClases = [];
let claseSeleccionadaId = null;
let diaSeleccionadoMobile = 'lunes';

// Bloques horarios extendidos desde las 07:00 hasta las 22:00 hs
const bloquesHorarios = [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", 
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", 
    "19:00", "20:00", "21:00", "22:00"
];

const diasSemana = ["lunes", "martes", "miercoles", "jueves", "viernes"];

// ==========================================
// GESTIÓN ROBUSTA DE TEMA (CLARO / OSCURO)
// ==========================================
function inicializarTema() {
    const themeToggle = document.getElementById('themeToggle');
    
    // Obtener tema guardado previamente o usar el del sistema
    const temaGuardado = localStorage.getItem('theme');
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const temaInicial = temaGuardado ? temaGuardado : (prefiereDark ? 'dark' : 'light');

    aplicarTemaDirecto(temaInicial);

    if (themeToggle) {
        // Remover listeners anteriores clonando el nodo para evitar duplicidad de eventos
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

    // Menú hamburguesa móvil
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
});

// Observador de Estado de Sesión
observarSesion((user) => {
    if (user) {
        currentUser = user;
        
        const diasNombres = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
        const hoyNombre = diasNombres[new Date().getDay()];
        if (diasSemana.includes(hoyNombre)) {
            diaSeleccionadoMobile = hoyNombre;
        }

        configurarPestanasMobile();
        cargarHorario();
    } else {
        window.location.href = 'login.html';
    }
});

function configurarPestanasMobile() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        const dayAttr = tab.getAttribute('data-day');
        if (dayAttr === diaSeleccionadoMobile) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }

        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            diaSeleccionadoMobile = e.currentTarget.getAttribute('data-day');
            renderizarGrillaSemanal();
        });
    });
}

async function cargarHorario() {
    if (!currentUser) return;

    try {
        const q = query(collection(db, "horarios"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        misClases = [];
        querySnapshot.forEach((docSnap) => {
            misClases.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderizarGrillaSemanal();
        calcularProximaClase();
    } catch (error) {
        console.error("Error al obtener documentos de la base de datos:", error);
        mostrarToast('Error al cargar la agenda desde la base de datos', 'danger');
    }
}

function horaAMinutos(horaStr) {
    if (!horaStr) return 0;
    const partes = horaStr.split(':');
    const h = parseInt(partes[0], 10) || 0;
    const m = parseInt(partes[1], 10) || 0;
    return h * 60 + m;
}

function renderizarGrillaSemanal() {
    const tableBody = document.getElementById('horarioTableBody');
    if (!tableBody) return;

    const esMobile = window.innerWidth <= 640;

    diasSemana.forEach(dia => {
        const ths = document.querySelectorAll(`.day-${dia}`);
        ths.forEach(th => {
            if (esMobile) {
                if (dia === diaSeleccionadoMobile) th.classList.add('mobile-visible');
                else th.classList.remove('mobile-visible');
            } else {
                th.classList.remove('mobile-visible');
            }
        });
    });

    tableBody.innerHTML = '';

    bloquesHorarios.forEach((horaBloque) => {
        const tr = document.createElement('tr');

        const tdHora = document.createElement('td');
        tdHora.className = 'time-col';
        tdHora.textContent = horaBloque;
        tr.appendChild(tdHora);

        const minutosBloqueInicio = horaAMinutos(horaBloque);
        const minutosBloqueFin = minutosBloqueInicio + 60;

        diasSemana.forEach((dia) => {
            const tdDia = document.createElement('td');
            tdDia.className = `col-day day-${dia}`;

            if (esMobile && dia === diaSeleccionadoMobile) {
                tdDia.classList.add('mobile-visible');
            }

            const clasesDelBloque = misClases.filter(c => {
                if (!c.dia || !c.horaInicio) return false;
                
                const coincidenciaDia = c.dia.toLowerCase().trim() === dia.toLowerCase().trim();
                const minutosClaseInicio = horaAMinutos(c.horaInicio);

                const coincidenciaHora = minutosClaseInicio >= minutosBloqueInicio && minutosClaseInicio < minutosBloqueFin;

                return coincidenciaDia && coincidenciaHora;
            });

            clasesDelBloque.forEach((clase) => {
                const block = document.createElement('div');
                block.className = 'class-block';
                block.innerHTML = `
                    <div class="class-block-title">${sanearTexto(clase.materia)}</div>
                    <div class="class-block-sub">📍 ${sanearTexto(clase.aula || 'S/A')}</div>
                    <div class="class-block-sub">🕒 ${clase.horaInicio} - ${clase.horaFin}</div>
                `;
                block.addEventListener('click', () => abrirModalDetalles(clase));
                tdDia.appendChild(block);
            });

            tr.appendChild(tdDia);
        });

        tableBody.appendChild(tr);
    });
}

function abrirModalDetalles(clase) {
    claseSeleccionadaId = clase.id;
    document.getElementById('modalSubjectName').textContent = clase.materia;
    document.getElementById('modalClassTime').textContent = `${capitalizar(clase.dia)} de ${clase.horaInicio} a ${clase.horaFin} hs`;
    document.getElementById('modalClassRoom').textContent = clase.aula || 'No asignada';
    document.getElementById('modalClassProf').textContent = clase.profesor || 'No especificado';

    const linkContainer = document.getElementById('modalClassLinkContainer');
    if (clase.enlace && clase.enlace.trim() !== '') {
        linkContainer.innerHTML = `<a href="${sanearTexto(clase.enlace)}" target="_blank" rel="noopener noreferrer" class="btn-join-meet">🔗 Unirse a Videollamada / Recurso</a>`;
    } else {
        linkContainer.innerHTML = '';
    }

    document.getElementById('classDetailModal').style.display = 'flex';
}

const btnCloseModal = document.getElementById('btnCloseModal');
if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
        document.getElementById('classDetailModal').style.display = 'none';
    });
}

const btnDeleteClass = document.getElementById('btnDeleteClass');
if (btnDeleteClass) {
    btnDeleteClass.addEventListener('click', async () => {
        if (!claseSeleccionadaId) return;

        const confirmado = await mostrarConfirmacion(
            '¿Deseas eliminar esta clase de tu horario?',
            'Eliminar Clase'
        );

        if (confirmado) {
            try {
                btnDeleteClass.disabled = true;
                await deleteDoc(doc(db, "horarios", claseSeleccionadaId));
                mostrarToast('Clase eliminada del horario', 'info');
                document.getElementById('classDetailModal').style.display = 'none';
                await cargarHorario();
            } catch (err) {
                console.error("Error al eliminar clase:", err);
                mostrarToast('Error al borrar la clase', 'danger');
            } finally {
                btnDeleteClass.disabled = false;
            }
        }
    });
}

function calcularProximaClase() {
    const nextSubject = document.getElementById('nextClassSubject');
    const nextDetails = document.getElementById('nextClassDetails');
    const actionContainer = document.getElementById('nextClassActionContainer');

    if (!nextSubject || !nextDetails) return;

    if (misClases.length === 0) {
        nextSubject.textContent = 'Sin clases agendadas';
        nextDetails.textContent = 'Agrega tus materias en el formulario para ver la próxima clase.';
        if (actionContainer) actionContainer.innerHTML = '';
        return;
    }

    const diasNombres = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    const hoy = new Date();
    const nombreDiaHoy = diasNombres[hoy.getDay()];

    const clasesDeHoy = misClases.filter(c => c.dia && c.dia.toLowerCase().trim() === nombreDiaHoy.toLowerCase().trim());

    if (clasesDeHoy.length === 0) {
        nextSubject.textContent = '¡No tienes clases hoy!';
        nextDetails.textContent = 'Aprovecha tu tiempo libre para repasar o completar entregas.';
        if (actionContainer) actionContainer.innerHTML = '';
        return;
    }

    clasesDeHoy.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    const proxima = clasesDeHoy[0];

    nextSubject.textContent = proxima.materia;
    nextDetails.textContent = `Hoy a las ${proxima.horaInicio} hs | Aula: ${proxima.aula || 'S/A'} | Prof: ${proxima.profesor || 'S/D'}`;

    if (actionContainer && proxima.enlace) {
        actionContainer.innerHTML = `<a href="${sanearTexto(proxima.enlace)}" target="_blank" rel="noopener noreferrer" class="btn-join-meet">🔗 Unirse a Clase</a>`;
    } else if (actionContainer) {
        actionContainer.innerHTML = '';
    }
}

const horarioForm = document.getElementById('horarioForm');
if (horarioForm) {
    horarioForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            mostrarToast('Debes iniciar sesión para guardar clases.', 'danger');
            return;
        }

        const btn = document.getElementById('btnGuardarClase');
        if (btn) btn.disabled = true;

        const materia = document.getElementById('materiaHorarioInput').value.trim();
        const dia = document.getElementById('diaSelect').value.toLowerCase().trim();
        const horaInicio = document.getElementById('horaInicioInput').value;
        const horaFin = document.getElementById('horaFinInput').value;
        const aula = document.getElementById('aulaInput').value.trim();
        const profesor = document.getElementById('profesorInput').value.trim();
        const enlace = document.getElementById('enlaceInput').value.trim();

        if (!materia || !dia || !horaInicio || !horaFin) {
            mostrarToast('Por favor, completa los campos requeridos.', 'danger');
            if (btn) btn.disabled = false;
            return;
        }

        try {
            await addDoc(collection(db, "horarios"), {
                userId: currentUser.uid,
                materia,
                dia,
                horaInicio,
                horaFin,
                aula,
                profesor,
                enlace,
                enPapelera: false,
                creadoEn: new Date().toISOString()
            });

            mostrarToast('Clase registrada en la base de datos', 'success');
            horarioForm.reset();
            await cargarHorario();
        } catch (error) {
            console.error("Error al registrar clase:", error);
            mostrarToast('Error al guardar en la base de datos', 'danger');
        } finally {
            if (btn) btn.disabled = false;
        }
    });
}

function capitalizar(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
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

window.addEventListener('resize', () => {
    renderizarGrillaSemanal();
});