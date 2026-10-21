document.addEventListener('DOMContentLoaded', async () => {
    // Configuración de Supabase (Completa con tus credenciales reales si usás Supabase)
    const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
    const SUPABASE_KEY = 'tu-anon-key-aqui';
    const supabase = (window.supabase && SUPABASE_URL !== 'https://tu-proyecto.supabase.co') 
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) 
        : null;

    const form = document.getElementById('formCargaTarea');
    const btnEnableNotifications = document.getElementById('btnEnableNotifications');
    const permissionBanner = document.getElementById('permissionBanner');
    const taskList = document.getElementById('taskList');

    const phoneNotification = document.getElementById('phoneNotification');
    const notifTitle = document.getElementById('notifTitle');
    const notifMessage = document.getElementById('notifMessage');

    // Registrar Service Worker para notificaciones en segundo plano
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

    // Mostrar cartel emergente flotante en pantalla
    function mostrarNotificacionCelular(titulo, mensaje) {
        notifTitle.innerText = titulo;
        notifMessage.innerText = mensaje;

        if ("vibrate" in navigator) {
            navigator.vibrate([200, 100, 200]);
        }

        phoneNotification.classList.remove('hidden');
        setTimeout(() => phoneNotification.classList.add('show'), 10);
        setTimeout(() => phoneNotification.classList.remove('show'), 4500);
    }

    // Programar la notificación automática en primer plano si la app está abierta
    function programarAlerta24Horas(tarea) {
        const ahora = new Date().getTime();
        const tiempoEntrega = new Date(tarea.fechaEntrega).getTime();
        
        const MS_24_HORAS = 86400000; // 24hs en milisegundos
        const momentoAviso = tiempoEntrega - MS_24_HORAS;
        const tiempoFaltante = momentoAviso - ahora;

        if (tiempoFaltante > 0 && tiempoFaltante < 2147483647) { // Límite de setTimeout en JS
            setTimeout(() => {
                const titulo = `🚨 ¡FALTAN 24 HORAS: ${tarea.materia}!`;
                const mensaje = `Mañana vence: "${tarea.titulo}". ¡No te olvides de entregar!`;

                mostrarNotificacionCelular(titulo, mensaje);

                if (Notification.permission === 'granted') {
                    new Notification(titulo, {
                        body: mensaje,
                        icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827504.png'
                    });
                }
            }, tiempoFaltante);
        }
    }

    // Obtener tareas desde la BD o almacenamiento local de respaldo
    async function obtenerTareasDB() {
        if (!supabase) {
            return JSON.parse(localStorage.getItem('tareas_agenda')) || [];
        }

        const { data, error } = await supabase.from('tareas').select('*').order('fechaEntrega', { ascending: true });
        if (error) {
            console.error('Error al traer tareas:', error);
            return JSON.parse(localStorage.getItem('tareas_agenda')) || [];
        }
        return data;
    }

    // Guardar la tarea cargada en el formulario
    async function guardarTareaDB(nuevaTarea) {
        if (!supabase) {
            let local = JSON.parse(localStorage.getItem('tareas_agenda')) || [];
            local.push(nuevaTarea);
            localStorage.setItem('tareas_agenda', JSON.stringify(local));
            return;
        }

        const { error } = await supabase.from('tareas').insert([nuevaTarea]);
        if (error) {
            console.error('Error guardando en DB, guardando en local:', error);
            let local = JSON.parse(localStorage.getItem('tareas_agenda')) || [];
            local.push(nuevaTarea);
            localStorage.setItem('tareas_agenda', JSON.stringify(local));
        }
    }

    // Eliminar tarea
    async function eliminarTarea(id) {
        if (!supabase) {
            let local = JSON.parse(localStorage.getItem('tareas_agenda')) || [];
            local = local.filter(t => t.id !== id);
            localStorage.setItem('tareas_agenda', JSON.stringify(local));
        } else {
            await supabase.from('tareas').delete().eq('id', id);
        }
        await refrescarLista();
    }

    // Dibujar la lista en la pantalla
    async function refrescarLista() {
        const tareas = await obtenerTareasDB();
        taskList.innerHTML = '';

        if (tareas.length === 0) {
            taskList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">No hay entregas pendientes.</p>';
            return;
        }

        tareas.forEach(t => {
            programarAlerta24Horas(t);

            const li = document.createElement('li');
            li.className = 'task-item';
            const fechaFormateada = new Date(t.fechaEntrega).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

            li.innerHTML = `
                <div>
                    <h5>${t.materia} - ${t.titulo}</h5>
                    <p>Entrega: ${fechaFormateada}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.75rem; color: #4ade80;">🤖 Alerta Lista</span>
                    <button class="btn-delete" title="Eliminar">🗑️</button>
                </div>
            `;

            li.querySelector('.btn-delete').addEventListener('click', () => eliminarTarea(t.id));
            taskList.appendChild(li);
        });
    }

    // Solicitar permisos
    btnEnableNotifications.addEventListener('click', async () => {
        if (!("Notification" in window)) return alert("Tu dispositivo no soporta notificaciones.");
        const permiso = await Notification.requestPermission();
        if (permiso === 'granted') {
            permissionBanner.style.display = 'none';
            mostrarNotificacionCelular("¡Alertas Activadas!", "Recibirás avisos a tu celular 24hs antes de cada entrega.");
        }
    });

    if ("Notification" in window && Notification.permission === 'granted') {
        permissionBanner.style.display = 'none';
    }

    // Manejar envío del formulario único
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nuevaTarea = {
            id: Date.now(),
            materia: document.getElementById('materia').value,
            titulo: document.getElementById('titulo').value,
            fechaEntrega: document.getElementById('fechaEntrega').value
        };

        await guardarTareaDB(nuevaTarea);
        await refrescarLista();

        mostrarNotificacionCelular(
            "Guardado Exitoso ☁️",
            `Sincronizado ${nuevaTarea.materia}. Se notificará 24hs antes del vencimiento.`
        );

        form.reset();
    });

    // Carga inicial
    await refrescarLista();
});