/* =================================================================
   MÓDULO DE PERFIL - PLATAFORMA CRECER (Versión Definitiva)
   ================================================================= */

import { db } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { observarSesion, mostrarToast } from './global.js';

function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return '--';
    const partes = fechaNacimiento.split('-');
    if (partes.length !== 3) return '--';
    
    const anio = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);
    
    const hoy = new Date();
    const cumpleanos = new Date(anio, mes, dia);
    
    if (isNaN(cumpleanos.getTime())) return '--';
    
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const m = hoy.getMonth() - cumpleanos.getMonth();
    
    if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
        edad--;
    }
    return edad >= 0 ? edad : '--';
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '--';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const dia = parseInt(partes[2], 10);
    const mes = meses[parseInt(partes[1], 10) - 1];
    const anio = partes[0];
    
    return `${dia} ${mes}. ${anio}`;
}

function comprimirImagen(file, maxWidth = 250, maxHeight = 250) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrlComprimida = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrlComprimida);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

function aplicarTema(tema) {
    const esOscuro = tema === 'dark';

    if (esOscuro) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }

    actualizarIconoTema(tema);
}

function actualizarIconoTema(tema) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = tema === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTema() {
    const temaActual = localStorage.getItem('theme') || 
                      (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

    const nuevoTema = temaActual === 'dark' ? 'light' : 'dark';
    aplicarTema(nuevoTema);
}

document.addEventListener('DOMContentLoaded', () => {
    // Referencias DOM
    const profileImage = document.getElementById('profileImage');
    const avatarInitial = document.getElementById('avatarInitial');
    const profileDisplayName = document.getElementById('profileDisplayName');
    const profileUserEmailDisplay = document.getElementById('profileUserEmailDisplay');
    
    const profileFullName = document.getElementById('profileFullName');
    const profileBirthDateDisplay = document.getElementById('profileBirthDateDisplay');
    const profileCalculatedAge = document.getElementById('profileCalculatedAge');
    const profileEmailVal = document.getElementById('profileEmailVal');

    const profilePhotoUrl = document.getElementById('profilePhotoUrl');
    const profileFile = document.getElementById('profileFile');
    const fileNameDisplay = document.getElementById('fileNameDisplay');

    const avatarWrapper = document.getElementById('avatarWrapper');
    const photoOptionsModal = document.getElementById('photoOptionsModal');
    const cancelPhotoBtn = document.getElementById('cancelPhotoBtn');
    const applyPhotoBtn = document.getElementById('applyPhotoBtn');
    const closePhotoModalBtn = document.getElementById('closePhotoModalBtn');

    let themeToggle = document.getElementById('themeToggle');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    let usuarioActual = null;
    let nombreUsuarioActual = 'Usuario';

    // Inicialización del tema según preferencia guardada
    const temaGuardado = localStorage.getItem('theme');
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const temaInicial = temaGuardado ? temaGuardado : (prefiereDark ? 'dark' : 'light');
    aplicarTema(temaInicial);

    // Event Listener único para el botón de conmutación de tema
    if (themeToggle) {
        const nuevoBtn = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(nuevoBtn, themeToggle);
        themeToggle = nuevoBtn;

        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTema();
        });
    }

    // Menú hamburguesa móvil
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            navMenu.classList.toggle('active');
        });
    }

    // Dropdown de módulos
    const dropdown = document.querySelector(".dropdown");
    const dropdownBtn = document.getElementById("dropdownBtn");

    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener("click", (e) => {
            e.preventDefault();
            dropdown.classList.toggle("active");
        });

        window.addEventListener("click", (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
            }
        });
    }

    // Control de Modal
    const abrirModal = (e) => {
        if (e) e.preventDefault();
        if (photoOptionsModal) photoOptionsModal.style.display = 'flex';
    };

    const cerrarModal = (e) => {
        if (e) e.preventDefault();
        if (photoOptionsModal) photoOptionsModal.style.display = 'none';
        if (profilePhotoUrl) profilePhotoUrl.value = '';
        if (profileFile) {
            try { profileFile.value = ''; } catch(err) {}
        }
        if (fileNameDisplay) fileNameDisplay.textContent = 'Ningún archivo seleccionado';
    };

    if (avatarWrapper) {
        avatarWrapper.addEventListener('click', abrirModal);
        avatarWrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                abrirModal(e);
            }
        });
    }

    if (cancelPhotoBtn) cancelPhotoBtn.addEventListener('click', cerrarModal);
    if (closePhotoModalBtn) closePhotoModalBtn.addEventListener('click', cerrarModal);

    if (photoOptionsModal) {
        photoOptionsModal.addEventListener('click', (e) => {
            if (e.target === photoOptionsModal) cerrarModal(e);
        });
    }

    if (profileFile) {
        profileFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (fileNameDisplay) fileNameDisplay.textContent = `📎 ${file.name}`;
                if (profilePhotoUrl) profilePhotoUrl.value = '';
            } else {
                if (fileNameDisplay) fileNameDisplay.textContent = 'Ningún archivo seleccionado';
            }
        });
    }

    if (profilePhotoUrl) {
        profilePhotoUrl.addEventListener('input', () => {
            if (profilePhotoUrl.value.trim() !== '') {
                if (profileFile) {
                    try { profileFile.value = ''; } catch(err) {}
                }
                if (fileNameDisplay) fileNameDisplay.textContent = 'Ningún archivo seleccionado';
            }
        });
    }

    // Aplicar Foto de Perfil
    if (applyPhotoBtn) {
        applyPhotoBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!usuarioActual) {
                mostrarToast('No hay una sesión activa.', 'danger');
                return;
            }

            const urlVal = profilePhotoUrl ? profilePhotoUrl.value.trim() : '';
            const fileVal = (profileFile && profileFile.files && profileFile.files.length > 0) ? profileFile.files[0] : null;

            let nuevaFoto = '';

            if (urlVal !== '') {
                nuevaFoto = urlVal;
            } else if (fileVal !== null) {
                try {
                    nuevaFoto = await comprimirImagen(fileVal, 250, 250);
                } catch (error) {
                    console.error("Error al comprimir imagen:", error);
                    mostrarToast('Error al procesar la imagen seleccionada.', 'danger');
                    return;
                }
            } else {
                mostrarToast('Por favor, ingresa una URL o selecciona una imagen.', 'warning');
                return;
            }

            try {
                applyPhotoBtn.disabled = true;
                applyPhotoBtn.textContent = 'Guardando... ⏳';

                const userRef = doc(db, 'usuarios', usuarioActual.uid);
                await setDoc(userRef, {
                    userId: usuarioActual.uid,
                    fotoPerfil: nuevaFoto,
                    actualizadoEn: new Date().toISOString()
                }, { merge: true });

                actualizarVisualizacionFoto(nuevaFoto, nombreUsuarioActual);
                mostrarToast('¡Foto de perfil actualizada correctamente!', 'success');
                cerrarModal();

            } catch (err) {
                console.error("Error al guardar foto en Firestore:", err);
                mostrarToast('Error al guardar la foto de perfil.', 'danger');
            } finally {
                applyPhotoBtn.disabled = false;
                applyPhotoBtn.textContent = 'Aplicar Foto';
            }
        });
    }

    // Carga de la Sesión de Usuario y Documento en Firestore
    observarSesion(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        usuarioActual = user;
        const emailUser = user.email || 'correo@ejemplo.com';

        if (profileUserEmailDisplay) profileUserEmailDisplay.textContent = emailUser;
        if (profileEmailVal) profileEmailVal.textContent = emailUser;

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
                const parts = (user.displayName || emailUser.split('@')[0]).split(' ');
                nombre = parts[0] || 'Estudiante';
                apellido = parts.slice(1).join(' ') || '';

                await setDoc(userRef, {
                    userId: user.uid,
                    nombre: nombre,
                    apellido: apellido,
                    email: emailUser,
                    creadoEn: new Date().toISOString()
                }, { merge: true });
            }

            nombreUsuarioActual = nombre || 'Usuario';
            const nombreCompleto = `${nombre} ${apellido}`.trim() || 'Estudiante';

            if (profileDisplayName) profileDisplayName.textContent = nombreCompleto;
            if (profileFullName) profileFullName.textContent = nombreCompleto;
            if (profileBirthDateDisplay) profileBirthDateDisplay.textContent = formatearFecha(fechaNac);
            if (profileCalculatedAge) profileCalculatedAge.textContent = calcularEdad(fechaNac);

            actualizarVisualizacionFoto(foto, nombreUsuarioActual);

        } catch (error) {
            console.error("Error al obtener información de Firestore:", error);
            mostrarToast('Error al cargar la información del usuario.', 'danger');
        }
    });

    /**
     * Muestra la foto de perfil o activa la inicial si hay error de carga (ej. 429 Too Many Requests)
     */
    function actualizarVisualizacionFoto(urlFoto, nombreUsuario) {
        if (!profileImage || !avatarInitial) return;

        if (urlFoto && urlFoto.trim() !== '') {
            // Manejador de error para capturar fallos de red (Rate limit HTTP 429)
            profileImage.onerror = () => {
                console.warn("No se pudo cargar la imagen remota (posible límite de peticiones HTTP 429). Mostrando inicial.");
                profileImage.style.display = 'none';
                avatarInitial.textContent = nombreUsuario ? nombreUsuario.charAt(0).toUpperCase() : 'U';
                avatarInitial.style.display = 'flex';
            };

            profileImage.onload = () => {
                profileImage.style.display = 'block';
                avatarInitial.style.display = 'none';
            };

            profileImage.src = urlFoto;
        } else {
            profileImage.style.display = 'none';
            profileImage.src = '';
            avatarInitial.textContent = nombreUsuario ? nombreUsuario.charAt(0).toUpperCase() : 'U';
            avatarInitial.style.display = 'flex';
        }
    }
});