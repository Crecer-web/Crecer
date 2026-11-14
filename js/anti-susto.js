/* =================================================================
   SISTEMA ANTI-SUSTO - PLATAFORMA CRECER (FIREBASE FIRESTORE)
   ================================================================= */

import { auth, db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    setDoc, 
    getDocs, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { mostrarToast, mostrarConfirmacion } from './global.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formCargaTarea');
    const btnEnableNotifications = document.getElementById('btnEnableNotifications');
    const permissionBanner = document.getElementById('permissionBanner');
    const taskList = document.getElementById('taskList');
    const btnSubmitTarea = document.getElementById('btnSubmitTarea');

    const phoneNotification = document.getElementById('phoneNotification');
    const notifTitle = document.getElementById('notifTitle');
    const notifMessage = document.getElementById('notifMessage');

    const themeToggle = document.getElementById('themeToggle');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    let usuarioActualUid = null;

    // Sincronización del botón de Modo Claro / Oscuro
    const actualizarIconoTema = (tema) => {
        if (themeToggle) {
            themeToggle.textContent = tema === 'dark' ? '☀️' : '🌙';
        }
    };

    const temaActual = localStorage.getItem('theme') || 'light';
    actualizarIconoTema(temaActual);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const esDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const nuevoTema = esDark ? 'light' : 'dark';

            if (nuevoTema === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            }
            actualizarIconoTema(nuevoTema);
        });
    }

    // Menú hamburguesa móvil
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // Observar sesión activa de Firebase para asociar las tareas al usuario logueado
    onAuthStateChanged(auth, (user) => {
        if (user) {
            usuarioActualUid = user.uid;
            refrescarLista();
        } else {
            // Si no hay sesión, redirigir al login por seguridad
            window.location.href = 'login.html';
        }
    });

    // Registrar Service Worker de forma obligatoria para notificaciones push en segundo plano
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
            console.error('[CRECER PWA]: Error registrando Service Worker:', err);
        });
    }

    // Ocultar notificación in-app al tocarla
    if (phoneNotification) {
        phoneNotification.addEventListener('click', () => {
            phoneNotification.classList.remove('show');
        });
    }

    // Mostrar cartel emergente flotante in-app con estilo institucional
    function mostrarNotificacionCelular(titulo, mensaje) {
        if (!notifTitle || !notifMessage || !phoneNotification) return;

        notifTitle.innerText = titulo;
        notifMessage.innerText = mensaje;

        if ("vibrate" in navigator) {
            navigator.vibrate([200, 100, 200]);
        }

        phoneNotification.classList.remove('hidden');
        setTimeout(() => phoneNotification.classList.add('show'), 10);
        setTimeout(() => phoneNotification.classList.remove('show'), 5000);
    }

    // Programar notificación real 24 horas antes con soporte para Service Worker
    function programarAlerta24Horas(tarea) {
        const ahora = new Date().getTime();
        const tiempoEntrega = new Date(tarea.fechaEntrega).getTime();
        
        const MS_24_HORAS = 86400000;
        const momentoAviso = tiempoEntrega - MS_24_HORAS;
        const tiempoFaltante = momentoAviso - ahora;

        if (tiempoFaltante > 0 && tiempoFaltante < 2147483647) {
            setTimeout(async () => {
                const titulo = `🚨 ¡ALERTA ANTI-SUSTO: ${tarea.materia.toUpperCase()}!`;
                const mensaje = `Mañana vence tu entrega: "${tarea.titulo}". ¡Revisa tus pendientes en CRECER!`;

                mostrarNotificacionCelular(titulo, mensaje);

                if ("Notification" in window && Notification.permission === 'granted') {
                    if ('serviceWorker' in navigator) {
                        const registration = await navigator.serviceWorker.ready;
                        if (registration && registration.showNotification) {
                            registration.showNotification(titulo, {
                                body: mensaje,
                                icon: './img/logo.png',
                                badge: './img/logo.png',
                                vibrate: [200, 100, 200],
                                tag: `anti-susto-${tarea.id}`
                            });
                            return;
                        }
                    }
                    new Notification(titulo, { body: mensaje });
                }
            }, tiempoFaltante);
        }
    }

    // Obtener tareas desde Firestore filtradas estrictamente por el usuario actual
    async function obtenerTareasDB() {
        if (!usuarioActualUid) return [];
        try {
            const q = query(
                collection(db, 'tareas_antisusto'), 
                where('userId', '==', usuarioActualUid),
                orderBy('fechaEntrega', 'asc')
            );
            const querySnapshot = await getDocs(q);
            const tareas = [];
            querySnapshot.forEach((docSnap) => {
                tareas.push({ id: docSnap.id, ...docSnap.data() });
            });
            return tareas;
        } catch (error) {
            console.error('Error al obtener tareas de Firestore:', error);
            mostrarToast('No se pudieron sincronizar las tareas del servidor.', 'danger');
            return [];
        }
    }

    // Guardar tarea directamente en Firestore vinculada al UID del usuario
    async function guardarTareaDB(nuevaTarea) {
        try {
            const tareaRef = doc(collection(db, 'tareas_antisusto'));
            await setDoc(tareaRef, {
                id: tareaRef.id,
                userId: usuarioActualUid,
                ...nuevaTarea,
                creadoEn: serverTimestamp()
            });
        } catch (error) {
            console.error('Error guardando tarea en Firestore:', error);
            throw error;
        }
    }

    // Eliminar tarea de Firestore con confirmación modal
    async function eliminarTarea(id) {
        const confirmado = await mostrarConfirmacion('¿Estás seguro de que deseas eliminar esta entrega programada?');
        if (!confirmado) return;

        try {
            await deleteDoc(doc(db, 'tareas_antisusto', id));
            mostrarToast('La entrega ha sido eliminada correctamente.', 'success');
            await refrescarLista();
        } catch (error) {
            console.error('Error al eliminar tarea:', error);
            mostrarToast('No se pudo eliminar el elemento seleccionado.', 'danger');
        }
    }

    // Renderizar lista de tareas en pantalla y programar alertas
    async function refrescarLista() {
        if (!taskList) return;
        const tareas = await obtenerTareasDB();
        taskList.innerHTML = '';

        if (tareas.length === 0) {
            taskList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.88rem; text-align: center; padding: 1.5rem 0;">No hay entregas pendientes en este momento.</p>';
            return;
        }

        tareas.forEach(t => {
            programarAlerta24Horas(t);

            const li = document.createElement('li');
            li.className = 'task-item';
            const fechaFormateada = new Date(t.fechaEntrega).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

            li.innerHTML = `
                <div>
                    <h5>${t.materia} &bull; ${t.titulo}</h5>
                    <p>📅 Límite: ${fechaFormateada}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 0.75rem; color: #34d399; font-weight: 600;">🤖 Alerta 24hs Activa</span>
                    <button class="btn-delete" title="Eliminar entrega" type="button">🗑️</button>
                </div>
            `;

            li.querySelector('.btn-delete').addEventListener('click', () => eliminarTarea(t.id));
            taskList.appendChild(li);
        });
    }

    // Solicitar permisos nativos de notificaciones al navegador/móvil
    if (btnEnableNotifications) {
        btnEnableNotifications.addEventListener('click', async () => {
            if (!("Notification" in window)) {
                mostrarToast("Tu dispositivo no soporta notificaciones push nativas.", "danger");
                return;
            }
            try {
                const permiso = await Notification.requestPermission();
                if (permiso === 'granted') {
                    if (permissionBanner) permissionBanner.style.display = 'none';
                    mostrarNotificacionCelular("¡Alertas Institucionales Activadas!", "Recibirás avisos automáticos 24 horas antes de cada entrega.");
                    mostrarToast("Permisos concedidos con éxito.", "success");

                    if ('serviceWorker' in navigator) {
                        const reg = await navigator.serviceWorker.ready;
                        reg.showNotification("CRECER &bull; Sistema Anti-Susto", {
                            body: "¡Las notificaciones push del sistema están funcionando correctamente!",
                            icon: "./img/logo.png",
                            badge: "./img/logo.png"
                        });
                    }
                } else {
                    mostrarToast("Has denegado los permisos de notificación en el navegador.", "danger");
                }
            } catch (err) {
                console.error("Error al solicitar permisos:", err);
                mostrarToast("Ocurrió un error al activar las notificaciones.", "danger");
            }
        });
    }

    if ("Notification" in window && Notification.permission === 'granted') {
        if (permissionBanner) permissionBanner.style.display = 'none';
    }

    // Manejar envío del formulario de registro de tarea
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const materiaInput = document.getElementById('materia');
            const tituloInput = document.getElementById('titulo');
            const fechaInput = document.getElementById('fechaEntrega');

            if (!materiaInput.value.trim() || !tituloInput.value.trim() || !fechaInput.value) {
                mostrarToast('Por favor, completa todos los campos requeridos.', 'danger');
                return;
            }

            const nuevaTarea = {
                materia: materiaInput.value.trim(),
                titulo: tituloInput.value.trim(),
                fechaEntrega: fechaInput.value
            };

            if (btnSubmitTarea) {
                btnSubmitTarea.disabled = true;
                btnSubmitTarea.textContent = 'Guardando y Programando... ⏳';
            }

            try {
                await guardarTareaDB(nuevaTarea);
                await refrescarLista();

                mostrarNotificacionCelular(
                    "¡Guardado Exitoso! ☁️",
                    `Entrega de ${nuevaTarea.materia} sincronizada en Firestore.`
                );
                mostrarToast("Tarea registrada y alerta configurada correctamente.", "success");
                form.reset();
            } catch (error) {
                console.error("Error al procesar formulario:", error);
                mostrarToast("No se pudo guardar la tarea en Firestore.", "danger");
            } finally {
                if (btnSubmitTarea) {
                    btnSubmitTarea.disabled = false;
                    btnSubmitTarea.textContent = '💾 Guardar Tarea y Automatizar Alerta';
                }
            }
        });
    }
});