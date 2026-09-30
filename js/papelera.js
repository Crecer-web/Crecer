/* =================================================================
   MÓDULO PAPELERA DE RECICLAJE - CRECER (Versión Definitiva y Robusta)
   ================================================================= */

import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion } from './global.js';   

document.addEventListener('DOMContentLoaded', () => {
    const trashGrid = document.getElementById('trashGrid');

    // 1. Verificación de sesión activa al cargar la vista de la papelera
    observarSesion(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        await cargarElementosPapelera(user.uid);
    });

    /**
     * Función unificada para escanear registros eliminados en múltiples colecciones de Firestore.
     * Cubre 'formularios', 'notas' y 'tareas' para prevenir cualquier pérdida visual.
     */
    async function cargarElementosPapelera(userId) {
        if (!trashGrid) return;

        try {
            // Mostrar indicador visual de carga inicial
            trashGrid.innerHTML = `
                <div class="trash-empty" style="font-style: normal;">
                    <p>🔄 Sincronizando elementos eliminados...</p>
                </div>
            `;

            let elementosEliminadosTotales = [];
            const coleccionesAEvaluar = ['formularios', 'notas', 'tareas'];

            for (const nombreColeccion of coleccionesAEvaluar) {
                try {
                    // Consulta estricta filtrando por el usuario actual y el estado de eliminación
                    const q = query(
                        collection(db, nombreColeccion), 
                        where('userId', '==', userId)
                    );
                    
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach((documento) => {
                        const data = documento.data();
                        
                        // Verificación flexible de banderas de papelera (enPapelera o eliminado)
                        const estaEliminado = data.enPapelera === true || 
                                              data.eliminado === true || 
                                              data.eliminado === "true";

                        if (estaEliminado) {
                            // Evitar duplicados por seguridad en el array global
                            if (!elementosEliminadosTotales.some(el => el.id === documento.id)) {
                                elementosEliminadosTotales.push({
                                    id: documento.id,
                                    coleccion: nombreColeccion,
                                    ...data
                                });
                            }
                        }
                    });
                } catch (errColeccion) {
                    console.warn(`Aviso: No se pudo procesar la colección '${nombreColeccion}':`, errColeccion);
                }
            }

            // Renderizar la cuadrícula con los datos encontrados
            renderizarCuadriculaPapelera(elementosEliminadosTotales);

        } catch (error) {
            console.error("Error general al procesar la papelera:", error);
            mostrarToast('No se pudieron cargar los elementos eliminados', 'danger');
            if (trashGrid) {
                trashGrid.innerHTML = `
                    <div class="trash-empty">
                        <p>Ocurrió un error al conectar con la base de datos.</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Dibuja dinámicamente las tarjetas dentro del contenedor de la papelera.
     */
    function renderizarCuadriculaPapelera(elementos) {
        trashGrid.innerHTML = '';

        if (!elementos || elementos.length === 0) {
            trashGrid.innerHTML = `
                <div class="trash-empty">
                    <p>La papelera está completamente vacía.</p>
                </div>
            `;
            return;
        }

        elementos.forEach((item) => {
            // Extracción inteligente de propiedades según la estructura del documento
            const tituloVisual = item.titulo || item.nombre || item.tema || 'Sin título o tema';
            const descripcionVisual = item.contenido || item.descripcion || item.detalle || 'Sin descripción adicional registrada.';
            
            let tipoEtiqueta = 'Elemento';
            if (item.coleccion === 'tareas') tipoEtiqueta = 'Tarea';
            else if (item.coleccion === 'notas') tipoEtiqueta = 'Nota';
            else if (item.tipo) tipoEtiqueta = item.tipo;

            const card = document.createElement('div');
            card.className = 'trash-item';
            card.innerHTML = `
                <div class="trash-item-info">
                    <span class="trash-item-badge">${sanearTexto(tipoEtiqueta)}</span>
                    <strong>${sanearTexto(tituloVisual)}</strong>
                    <span>${sanearTexto(descripcionVisual.substring(0, 75))}${descripcionVisual.length > 75 ? '...' : ''}</span>
                </div>
                <div class="trash-actions">
                    <button type="button" class="btn-restore" data-id="${item.id}" data-coleccion="${item.coleccion}">
                        ↩️ Restaurar
                    </button>
                    <button type="button" class="btn-delete-perm" data-id="${item.id}" data-coleccion="${item.coleccion}">
                        ❌ Eliminar
                    </button>
                </div>
            `;
            trashGrid.appendChild(card);
        });

        // Vincular los eventos interactivos a los botones recién creados
        vincularAccionesBotones();
    }

    /**
     * Asigna los eventos de clic para restaurar o borrar definitivamente los elementos.
     */
    function vincularAccionesBotones() {
        // Botones para Restaurar (vuelve las banderas a false)
        document.querySelectorAll('.btn-restore').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const coleccion = e.currentTarget.getAttribute('data-coleccion');

                try {
                    const docRef = doc(db, coleccion, id);
                    await updateDoc(docRef, { 
                        enPapelera: false,
                        eliminado: false,
                        restauradoEn: new Date()
                    });

                    mostrarToast('Elemento restaurado con éxito al panel activo', 'success');
                    
                    // Recargar los elementos de la papelera actualizados
                    observarSesion(user => {
                        if (user) cargarElementosPapelera(user.uid);
                    });
                } catch (err) {
                    console.error("Error al intentar restaurar el elemento:", err);
                    mostrarToast('Error al restaurar el elemento seleccionado', 'danger');
                }
            });
        });

        // Botones para Borrado Definitivo de la base de datos
        document.querySelectorAll('.btn-delete-perm').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const coleccion = e.currentTarget.getAttribute('data-coleccion');

                if (window.confirm('¿Estás totalmente seguro de eliminar este elemento de forma permanente? Esta acción no se puede deshacer.')) {
                    try {
                        await deleteDoc(doc(db, coleccion, id));
                        mostrarToast('Elemento eliminado permanentemente de la base de datos', 'success');
                        
                        // Recargar los elementos de la papelera actualizados
                        observarSesion(user => {
                            if (user) cargarElementosPapelera(user.uid);
                        });
                    } catch (err) {
                        console.error("Error al intentar eliminar permanentemente:", err);
                        mostrarToast('No se pudo eliminar el elemento del sistema', 'danger');
                    }
                }
            });
        });
    }

    /**
     * Función de seguridad para limpiar textos y prevenir problemas de inyección HTML.
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
});

document.addEventListener("DOMContentLoaded", function () {
  // Seleccionamos todos los contenedores de menú desplegable
  const dropdowns = document.querySelectorAll(".dropdown");

  dropdowns.forEach(function (dropdown) {
    const dropBtn = dropdown.querySelector(".dropbtn"); // Ajusta la clase del botón si es distinta

    if (dropBtn) {
      dropBtn.addEventListener("click", function (e) {
        // Previene el comportamiento por defecto si es un enlace
        e.preventDefault();
        
        // Alterna la clase 'active' para mostrar/ocultar el contenido
        dropdown.classList.toggle("active");
      });
    }
  });

  // Cierra el menú si se hace clic fuera de él
  window.addEventListener("click", function (e) {
    dropdowns.forEach(function (dropdown) {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("active");
      }
    });
  });
});