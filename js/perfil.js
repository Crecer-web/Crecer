import { db, auth } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion } from './global.js';

function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return '--';
    const hoy = new Date();
    const cumpleanos = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const m = hoy.getMonth() - cumpleanos.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
        edad--;
    }
    return edad;
}

document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhotoUrl = document.getElementById('profilePhotoUrl');
    const profileImage = document.getElementById('profileImage');
    const avatarInitial = document.getElementById('avatarInitial');
    const profileDisplayName = document.getElementById('profileDisplayName');
    const profileFullName = document.getElementById('profileFullName');
    const profileUserEmailDisplay = document.getElementById('profileUserEmailDisplay');
    const edadSpan = document.getElementById('profileCalculatedAge');
    const profileFile = document.getElementById('profileFile');
    const fileNameDisplay = document.getElementById('fileNameDisplay');

    const avatarWrapper = document.getElementById('avatarWrapper');
    const photoOptionsModal = document.getElementById('photoOptionsModal');
    const cancelPhotoBtn = document.getElementById('cancelPhotoBtn');
    const applyPhotoBtn = document.getElementById('applyPhotoBtn');

    let fotoActualTemporal = '';
    let usuarioActual = null;
    let nombreUsuarioActual = 'Usuario';

    // 1. Mostrar/Ocultar modal de foto al hacer clic en el avatar
    if (avatarWrapper && photoOptionsModal) {
        avatarWrapper.addEventListener('click', () => {
            photoOptionsModal.style.display = photoOptionsModal.style.display === 'none' ? 'flex' : 'none';
        });
    }

    if (cancelPhotoBtn && photoOptionsModal) {
        cancelPhotoBtn.addEventListener('click', () => {
            photoOptionsModal.style.display = 'none';
        });
    }

    // 2. Control al seleccionar un archivo local
    if (profileFile) {
        profileFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (fileNameDisplay) fileNameDisplay.textContent = file.name;
                // Limpiar el campo de URL de forma segura sin provocar errores
                if (profilePhotoUrl) profilePhotoUrl.value = ''; 
            } else {
                if (fileNameDisplay) fileNameDisplay.textContent = 'Ningún archivo seleccionado';
            }
        });
    }

    // 3. Control al escribir una URL (Limpia el archivo seleccionado visualmente)
    if (profilePhotoUrl) {
        profilePhotoUrl.addEventListener('input', () => {
            if (profilePhotoUrl.value.trim() !== '') {
                if (profileFile) {
                    try { profileFile.value = ''; } catch(err) { /* Ignorar si el navegador bloquea reseteo */ }
                }
                if (fileNameDisplay) fileNameDisplay.textContent = 'Ningún archivo seleccionado';
            }
        });
    }

    // 4. Botón Aplicar Foto (Procesa URL o Archivo con seguridad)
    if (applyPhotoBtn) {
        applyPhotoBtn.addEventListener('click', (e) => {
            e.preventDefault();

            const urlVal = profilePhotoUrl ? profilePhotoUrl.value.trim() : '';
            const fileVal = (profileFile && profileFile.files && profileFile.files.length > 0) ? profileFile.files[0] : null;

            if (urlVal !== '') {
                // Caso A: Usar URL directa
                fotoActualTemporal = urlVal;
                actualizarVisualizacionFoto(fotoActualTemporal, nombreUsuarioActual);
                mostrarMensaje('Foto actualizada por URL. Haz clic en "Guardar Cambios".', 'success');
                if (photoOptionsModal) photoOptionsModal.style.display = 'none';

            } else if (fileVal !== null) {
                // Caso B: Usar archivo local mediante FileReader
                const reader = new FileReader();
                
                reader.onload = function(event) {
                    fotoActualTemporal = event.target.result;
                    actualizarVisualizacionFoto(fotoActualTemporal, nombreUsuarioActual);
                    mostrarMensaje('Foto cargada desde archivo. Haz clic en "Guardar Cambios".', 'success');
                    if (photoOptionsModal) photoOptionsModal.style.display = 'none';
                };

                reader.onerror = function(err) {
                    console.error("Error al leer el archivo:", err);
                    mostrarMensaje('Error al leer el archivo de imagen local.', 'danger');
                };

                reader.readAsDataURL(fileVal);
            } else {
                mostrarMensaje('Por favor, ingresa una URL válida o selecciona un archivo de imagen.', 'warning');
            }
        });
    }

    // 5. Cargar datos del usuario desde Firestore
    observarSesion(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        usuarioActual = user;
        if (profileEmail) profileEmail.value = user.email || '';
        if (profileUserEmailDisplay) profileUserEmailDisplay.textContent = user.email || '';

        const userRef = doc(db, 'usuarios', user.uid);
        try {
            const docSnap = await getDoc(userRef);
            let nombre = '';
            let apellido = '';
            let fechaNac = '';
            let foto = user.photoURL || '';

            if (docSnap.exists()) {
                const data = docSnap.data();
                nombre = data.nombre || '';
                apellido = data.apellido || '';
                fechaNac = data.fechaNacimiento || '';
                foto = data.fotoPerfil || foto;
            } else {
                const parts = (user.displayName || user.email.split('@')[0]).split(' ');
                nombre = parts[0] || 'Usuario';
                apellido = parts.slice(1).join(' ') || '';
            }

            nombreUsuarioActual = nombre;
            const nombreCompleto = `${nombre} ${apellido}`.trim();
            if (profileDisplayName) profileDisplayName.textContent = nombreCompleto;
            if (profileFullName) profileFullName.textContent = `Nombre y Apellido: ${nombreCompleto}`;
            
            if (edadSpan && fechaNac) {
                edadSpan.textContent = calcularEdad(fechaNac);
            }

            fotoActualTemporal = foto;
            actualizarVisualizacionFoto(fotoActualTemporal, nombreUsuarioActual);

        } catch (error) {
            console.error("Error al obtener perfil:", error);
        }
    });

    // 6. Enviar y guardar cambios definitivos en Firestore
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!usuarioActual) {
                mostrarMensaje('No hay una sesión activa.', 'danger');
                return;
            }

            try {
                const userRef = doc(db, 'usuarios', usuarioActual.uid);
                await setDoc(userRef, {
                    email: usuarioActual.email,
                    fotoPerfil: fotoActualTemporal,
                    actualizadoEn: new Date()
                }, { merge: true });

                mostrarMensaje('¡Perfil guardado con éxito en la base de datos!', 'success');
            } catch (error) {
                console.error("Error al actualizar perfil en Firestore:", error);
                mostrarMensaje('Error al actualizar el perfil en la base de datos.', 'danger');
            }
        });
    }

    function actualizarVisualizacionFoto(urlFoto, nombreUsuario) {
        if (urlFoto && urlFoto.trim() !== '') {
            if (profileImage) {
                profileImage.src = urlFoto;
                profileImage.style.display = 'block';
            }
            if (avatarInitial) {
                avatarInitial.style.display = 'none';
            }
        } else {
            if (profileImage) {
                profileImage.style.display = 'none';
                profileImage.src = '';
            }
            if (avatarInitial) {
                avatarInitial.textContent = nombreUsuario ? nombreUsuario.charAt(0).toUpperCase() : 'U';
                avatarInitial.style.display = 'flex';
            }
        }
    }

    function mostrarMensaje(texto, tipo) {
        if (typeof mostrarToast === 'function') {
            mostrarToast(texto, tipo);
        } else {
            alert(texto);
        }
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