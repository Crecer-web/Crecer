document.addEventListener('DOMContentLoaded', async () => {
    // Configuración de Supabase (Reemplaza con tus credenciales reales o usa respaldo local robusto)
    const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
    const SUPABASE_KEY = 'tu-anon-key-aqui';
    const supabase = (window.supabase && SUPABASE_URL !== 'https://tu-proyecto.supabase.co') 
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) 
        : null;

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

    // Sistema de Notificaciones Toast Elegantes
    function mostrarToast(mensaje, tipo = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        toast.innerHTML = `
            <span>${tipo === 'success' ? '✅' : '⚠️'} ${mensaje}</span>
            <button type="button" class="toast-close">&times;</button>
        `;

        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        const cerrar = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        };

        toast.querySelector('.toast-close').addEventListener('click', cerrar);
        setTimeout(cerrar, 4000);
    }

    // Registrar Service Worker de forma segura para notificaciones persistentes
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('./sw.js');
        } catch (err) {
            console.error('Error registrando Service Worker:', err);
        }
    }

    // Ocultar notificación al tocarla
    phoneNotification.addEventListener('click', () => {
        phoneNotification.classList.remove('show');
    });

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

    // Programar la notificación automática 24 horas antes
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
                    const registration = await navigator.serviceWorker.ready;
                    if (registration && registration.showNotification) {
                        registration.showNotification(titulo, {
                            body: mensaje,
                            icon: './img/logo.png',
                            badge: './img/logo.png',
                            vibrate: [200, 100, 200]
                        });
                    } else {
                        new Notification(titulo, { body: mensaje });
                    }
                }
            }, tiempoFaltante);
        }
    }

    // Obtener tareas desde Supabase o respaldo local seguro (`localStorage`)
    async function obtenerTareasDB() {
        try {
            if (!supabase) {
                return JSON.parse(localStorage.getItem('crecer_tareas_antisusto')) || [];
            }
            const { data, error } = await supabase.from('tareas').select('*').order('fechaEntrega', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error al sincronizar tareas:', error);
            return JSON.parse(localStorage.getItem('crecer_tareas_antisusto')) || [];
        }
    }

    // Guardar tarea con manejo robusto
    async function guardarTareaDB(nuevaTarea) {
        try {
            if (!supabase) {
                let local = JSON.parse(localStorage.getItem('crecer_tareas_antisusto')) || [];
                local.push(nuevaTarea);
                localStorage.setItem('crecer_tareas_antisusto', JSON.stringify(local));
                return;
            }
            const { error } = await supabase.from('tareas').insert([nuevaTarea]);
            if (error) throw error;
        } catch (error) {
            console.error('Error guardando en DB, guardando en respaldo local:', error);
            let local = JSON.parse(localStorage.getItem('crecer_tareas_antisusto')) || [];
            local.push(nuevaTarea);
            localStorage.setItem('crecer_tareas_antisusto', JSON.stringify(local));
        }
    }

    // Eliminar tarea de la base de datos o almacenamiento local
    async function eliminarTarea(id) {
        try {
            if (!supabase) {
                let local = JSON.parse(localStorage.getItem('crecer_tareas_antisusto')) || [];
                local = local.filter(t => t.id !== id);
                localStorage.setItem('crecer_tareas_antisusto', JSON.stringify(local));
            } else {
                const { error } = await supabase.from('tareas').delete().eq('id', id);
                if (error) throw error;
            }
            mostrarToast('La entrega ha sido eliminada correctamente.', 'success');
            await refrescarLista();
        } catch (error) {
            console.error('Error al eliminar tarea:', error);
            mostrarToast('No se pudo eliminar el elemento seleccionado.', 'danger');
        }
    }

    // Renderizar la lista de tareas en pantalla
    async function refrescarLista() {
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

    // Solicitar permisos nativos de notificaciones
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

    // Manejar envío del formulario
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
                id: Date.now(),
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
                    `Entrega de ${nuevaTarea.materia} sincronizada. Alerta programada para 24hs antes.`
                );
                mostrarToast("Tarea registrada y alerta configurada correctamente.", "success");
                form.reset();
            } catch (error) {
                console.error("Error al procesar formulario:", error);
                mostrarToast("No se pudo guardar la tarea en el servidor.", "danger");
            } finally {
                if (btnSubmitTarea) {
                    btnSubmitTarea.disabled = false;
                    btnSubmitTarea.textContent = '💾 Guardar Tarea y Automatizar Alerta';
                }
            }
        });
    }

    // Carga inicial de datos
    await refrescarLista();
});