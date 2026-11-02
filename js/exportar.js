/* =================================================================
   MÓDULO DE RESPALDO Y REPORTES - PLATAFORMA CRECER (Versión Definitiva)
   ================================================================= */

import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion, mostrarToast } from './global.js';

let currentUser = null;

// ==========================================
// GESTIÓN DE TEMA (CLARO / OSCURO)
// ==========================================
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
            e.preventDefault();
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
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
            }
        });
    }

    observarSesion((user) => {
        if (user) {
            currentUser = user;
            inicializarEventosExportacion();
        } else {
            window.location.href = 'login.html';
        }
    });
});

function inicializarEventosExportacion() {
    const btnTareasCSV = document.getElementById('btnExportTareasCSV');
    const btnTareasPDF = document.getElementById('btnExportTareasPDF');
    if (btnTareasCSV) btnTareasCSV.addEventListener('click', () => exportarTareas('csv'));
    if (btnTareasPDF) btnTareasPDF.addEventListener('click', () => exportarTareas('pdf'));

    const btnNotasCSV = document.getElementById('btnExportNotasCSV');
    const btnNotasPDF = document.getElementById('btnExportNotasPDF');
    if (btnNotasCSV) btnNotasCSV.addEventListener('click', () => exportarNotas('csv'));
    if (btnNotasPDF) btnNotasPDF.addEventListener('click', () => exportarNotas('pdf'));

    const btnHorarioCSV = document.getElementById('btnExportHorarioCSV');
    const btnHorarioPDF = document.getElementById('btnExportHorarioPDF');
    if (btnHorarioCSV) btnHorarioCSV.addEventListener('click', () => exportarHorario('csv'));
    if (btnHorarioPDF) btnHorarioPDF.addEventListener('click', () => exportarHorario('pdf'));

    const btnIntegral = document.getElementById('btnExportIntegralPDF');
    if (btnIntegral) btnIntegral.addEventListener('click', exportarReporteIntegral);
}

function descargarCSV(contenido, nombreArchivo) {
    const blob = new Blob(["\uFEFF" + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarToast('Archivo CSV descargado con éxito', 'success');
}

/**
 * Función mejorada para abrir la ventana de impresión limpia sin mostrar "about:blank"
 */
function abrirVentanaImpresion(titulo, contenidoHTML) {
    const ventana = window.open('', '_blank');
    
    if (!ventana) {
        mostrarToast('El navegador bloqueó la ventana emergente. Por favor, permite las ventanas pop-up.', 'danger');
        return;
    }

    ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>${titulo} - CRECER</title>
            <style>
                :root {
                    --primary: #0f172a;
                    --accent: #2563eb;
                    --border: #e2e8f0;
                    --border-dark: #cbd5e1;
                    --bg-light: #f8fafc;
                }
                
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    padding: 2.5rem;
                    color: var(--primary);
                    line-height: 1.6;
                    background-color: #ffffff;
                    margin: 0;
                }

                /* Encabezado del reporte ordenado */
                .report-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 3px solid var(--accent);
                    padding-bottom: 1.25rem;
                    margin-bottom: 2rem;
                    gap: 1rem;
                }

                .report-title-area h1 {
                    margin: 0 0 0.3rem 0;
                    color: var(--primary);
                    font-size: 1.5rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    text-transform: uppercase;
                }

                .report-title-area p {
                    margin: 0;
                    color: #64748b;
                    font-size: 0.88rem;
                    font-weight: 500;
                }

                .report-badge {
                    background: var(--bg-light);
                    color: var(--primary);
                    border: 1px solid var(--border-dark);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    white-space: nowrap;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }

                /* Títulos de sección internos */
                h2 {
                    color: var(--primary);
                    font-size: 1.1rem;
                    margin-top: 2rem;
                    margin-bottom: 0.85rem;
                    font-weight: 700;
                    border-left: 4px solid var(--accent);
                    padding-left: 0.6rem;
                    letter-spacing: -0.01em;
                }

                /* Tablas ordenadas y limpias */
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 0.5rem;
                    margin-bottom: 1.5rem;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 0 0 1px var(--border);
                }

                th, td {
                    border-bottom: 1px solid var(--border);
                    border-right: 1px solid var(--border);
                    padding: 0.8rem 1rem;
                    text-align: left;
                    font-size: 0.88rem;
                }

                th:last-child, td:last-child {
                    border-right: none;
                }

                th {
                    background-color: var(--bg-light);
                    font-weight: 700;
                    color: var(--primary);
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 0.04em;
                }

                tr:last-child td {
                    border-bottom: none;
                }

                tr:nth-child(even) {
                    background-color: #fcfcfd;
                }

                /* Pie de página institucional */
                .footer-print {
                    margin-top: 3.5rem;
                    font-size: 0.78rem;
                    color: #64748b;
                    text-align: center;
                    border-top: 1px solid var(--border);
                    padding-top: 1.2rem;
                }

                /* Botón flotante de impresión */
                .print-actions {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--primary);
                    color: #fff;
                    border: none;
                    padding: 0.65rem 1.25rem;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.88rem;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.2);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    z-index: 9999;
                    transition: background 0.2s, transform 0.1s;
                }

                .print-actions:hover {
                    background: var(--accent);
                    transform: translateY(-1px);
                }

                @media print {
                    .print-actions { display: none !important; }
                    body { padding: 0.5rem !important; }
                    table { box-shadow: none !important; }
                }
            </style>
        </head>
        <body>
            <button class="print-actions" onclick="window.print()">
                🖨️ Imprimir / Guardar PDF
            </button>

            <div class="report-header">
                <div class="report-title-area">
                    <h1>CRECER &bull; ${titulo}</h1>
                    <p>Plataforma Institucional de Gestión Académica</p>
                </div>
                <div class="report-badge">
                    📅 Fecha: ${new Date().toLocaleDateString('es-AR')}
                </div>
            </div>

            ${contenidoHTML}

            <div class="footer-print">
                &copy; 2026 CRECER &bull; Reporte generado automáticamente para uso institucional y personal.
            </div>

            <script>
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        window.print();
                    }, 350);
                });
            </script>
        </body>
        </html>
    `);
    ventana.document.close();
}
/**
 * Obtiene todas las calificaciones del usuario ordenadas alfabéticamente por materia
 */
async function obtenerNotasUsuario() {
    let listaNotas = [];
    try {
        const snapNotas = await getDocs(query(collection(db, "notas"), where("userId", "==", currentUser.uid)));
        snapNotas.forEach(doc => {
            const d = doc.data();
            listaNotas.push({
                materia: d.materia || 'Sin Materia',
                evaluacion: d.evaluacion || 'Evaluación',
                nota: d.calificacion !== undefined ? d.calificacion : (d.nota || '-'),
                fecha: d.fecha || '-'
            });
        });
    } catch (e) {
        console.warn("Error al consultar notas:", e);
    }

    listaNotas.sort((a, b) => a.materia.localeCompare(b.materia));
    return listaNotas;
}

/**
 * Obtiene todas las tareas y exámenes desde la colección "formularios" ordenados alfabéticamente
 */
async function obtenerTareasUsuario() {
    let listaTareas = [];
    try {
        const snapFormularios = await getDocs(query(collection(db, "formularios"), where("userId", "==", currentUser.uid)));
        snapFormularios.forEach(doc => {
            const d = doc.data();
            if (!d.eliminado && !d.enPapelera) {
                listaTareas.push({
                    materia: d.materia || 'Sin Materia',
                    titulo: d.tema || d.titulo || 'Sin Título',
                    tipo: d.tipo || 'Tarea',
                    fecha: d.fechaEntrega || d.fecha || '-',
                    hora: d.horaEntrega || '',
                    descripcion: d.descripcion || '',
                    completada: d.completada ? 'Sí' : 'No'
                });
            }
        });
    } catch (e) {
        console.warn("Error al consultar formularios/tareas:", e);
    }

    listaTareas.sort((a, b) => a.materia.localeCompare(b.materia));
    return listaTareas;
}

async function exportarTareas(formato) {
    try {
        mostrarToast('Procesando reporte de tareas...', 'info');
        const listaTareas = await obtenerTareasUsuario();

        if (listaTareas.length === 0) {
            mostrarToast('No hay tareas o exámenes registrados para exportar.', 'warning');
            return;
        }

        if (formato === 'csv') {
            let csv = "Materia,Título,Tipo,Fecha Límite,Hora,Descripción,Completada\n";
            listaTareas.forEach(d => {
                csv += `"${d.materia}","${d.titulo}","${d.tipo}","${d.fecha}","${d.hora}","${d.descripcion.replace(/"/g, '""')}","${d.completada}"\n`;
            });
            descargarCSV(csv, `CRECER_Agenda_Tareas_${new Date().toISOString().slice(0,10)}.csv`);
        } else {
            let html = `<table><thead><tr><th>Materia</th><th>Título / Tema</th><th>Tipo</th><th>Fecha y Hora</th><th>Descripción</th><th>Estado</th></tr></thead><tbody>`;
            listaTareas.forEach(d => {
                html += `<tr>
                    <td><strong>${d.materia}</strong></td>
                    <td>${d.titulo}</td>
                    <td>${d.tipo}</td>
                    <td>${d.fecha} ${d.hora ? 'a las ' + d.hora : ''}</td>
                    <td>${d.descripcion || '-'}</td>
                    <td>${d.completada === 'Sí' ? 'Completada' : 'Pendiente'}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
            abrirVentanaImpresion('Reporte Completo de Tareas y Exámenes', html);
        }
    } catch (err) {
        console.error("Error exportando tareas:", err);
        mostrarToast('Error al obtener los datos de la agenda.', 'danger');
    }
}

async function exportarNotas(formato) {
    try {
        mostrarToast('Procesando boletín de calificaciones...', 'info');
        const listaNotas = await obtenerNotasUsuario();

        if (listaNotas.length === 0) {
            mostrarToast('No hay calificaciones registradas para exportar.', 'warning');
            return;
        }

        if (formato === 'csv') {
            let csv = "Materia,Evaluación,Nota,Fecha\n";
            listaNotas.forEach(d => {
                csv += `"${d.materia}","${d.evaluacion}","${d.nota}","${d.fecha}"\n`;
            });
            descargarCSV(csv, `CRECER_Boletin_${new Date().toISOString().slice(0,10)}.csv`);
        } else {
            let html = `<table><thead><tr><th>Materia</th><th>Evaluación</th><th>Calificación</th><th>Fecha</th></tr></thead><tbody>`;
            listaNotas.forEach(d => {
                html += `<tr><td><strong>${d.materia}</strong></td><td>${d.evaluacion}</td><td><strong>${d.nota}</strong></td><td>${d.fecha}</td></tr>`;
            });
            html += `</tbody></table>`;
            abrirVentanaImpresion('Boletín de Calificaciones Académicas', html);
        }
    } catch (err) {
        console.error("Error exportando notas:", err);
        mostrarToast('Error al obtener las calificaciones.', 'danger');
    }
}

async function exportarHorario(formato) {
    try {
        mostrarToast('Procesando horario escolar...', 'info');
        const q = query(collection(db, "horarios"), where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);

        let listaHorarios = [];
        snapshot.forEach(doc => {
            listaHorarios.push(doc.data());
        });

        listaHorarios.sort((a, b) => (a.materia || '').localeCompare(b.materia || ''));

        if (listaHorarios.length === 0) {
            mostrarToast('No tienes materias en tu horario para exportar.', 'warning');
            return;
        }

        if (formato === 'csv') {
            let csv = "Día,Hora Inicio,Hora Fin,Materia,Aula\n";
            listaHorarios.forEach(d => {
                csv += `"${d.dia || ''}","${d.horaInicio || ''}","${d.horaFin || ''}","${d.materia || ''}","${d.aula || ''}"\n`;
            });
            descargarCSV(csv, `CRECER_Horario_${new Date().toISOString().slice(0,10)}.csv`);
        } else {
            let html = `<table><thead><tr><th>Día</th><th>Horario</th><th>Materia</th><th>Aula</th></tr></thead><tbody>`;
            listaHorarios.forEach(d => {
                html += `<tr><td>${d.dia || '-'}</td><td>${d.horaInicio || ''} - ${d.horaFin || ''}</td><td><strong>${d.materia || '-'}</strong></td><td>${d.aula || '-'}</td></tr>`;
            });
            html += `</tbody></table>`;
            abrirVentanaImpresion('Horario Escolar Semanal', html);
        }
    } catch (err) {
        console.error("Error exportando horario:", err);
        mostrarToast('Error al obtener el horario escolar.', 'danger');
    }
}

async function exportarReporteIntegral() {
    try {
        mostrarToast('Generando informe consolidado de agenda...', 'info');

        const [listaTareas, listaNotas] = await Promise.all([
            obtenerTareasUsuario(),
            obtenerNotasUsuario()
        ]);

        let html = `<h2>1. Tareas y Exámenes de la Agenda </h2>`;
        if (listaTareas.length > 0) {
            html += `<table><thead><tr><th>Materia</th><th>Título / Tema</th><th>Tipo</th><th>Fecha y Hora</th><th>Descripción</th><th>Estado</th></tr></thead><tbody>`;
            listaTareas.forEach(d => {
                html += `<tr>
                    <td><strong>${d.materia}</strong></td>
                    <td>${d.titulo}</td>
                    <td>${d.tipo}</td>
                    <td>${d.fecha} ${d.hora ? 'a las ' + d.hora : ''}</td>
                    <td>${d.descripcion || '-'}</td>
                    <td>${d.completada === 'Sí' ? 'Completada' : 'Pendiente'}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
        } else {
            html += `<p>No hay tareas registradas en la agenda.</p>`;
        }

        html += `<h2 style="margin-top:2.5rem;">2. Calificaciones Académicas </h2>`;
        if (listaNotas.length > 0) {
            html += `<table><thead><tr><th>Materia</th><th>Evaluación</th><th>Calificación</th><th>Fecha</th></tr></thead><tbody>`;
            listaNotas.forEach(d => {
                html += `<tr><td><strong>${d.materia}</strong></td><td>${d.evaluacion}</td><td><strong>${d.nota}</strong></td><td>${d.fecha}</td></tr>`;
            });
            html += `</tbody></table>`;
        } else {
            html += `<p>No hay calificaciones registradas.</p>`;
        }

        abrirVentanaImpresion('Respaldo Integral Académico y de Agenda', html);

    } catch (err) {
        console.error("Error en reporte integral:", err);
        mostrarToast('Error al consolidar la información de la agenda.', 'danger');
    }
}