/* =================================================================
   LÓGICA DE RECUPERACIÓN DE CONTRASEÑA - PLATAFORMA CRECER
   ================================================================= */

import { mostrarToast } from './global.js';

// Gestión del Tema (Claro / Oscuro)
function inicializarTema() {
    const themeToggle = document.getElementById('themeToggle');
    const temaGuardado = localStorage.getItem('theme');
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const temaInicial = temaGuardado ? temaGuardado : (prefiereDark ? 'dark' : 'light');

    aplicarTemaDirecto(temaInicial);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const esOscuroActual = document.documentElement.getAttribute('data-theme') === 'dark' || 
                                   document.body.getAttribute('data-theme') === 'dark';
            aplicarTemaDirecto(esOscuroActual ? 'light' : 'dark');
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

    const recuperarForm = document.getElementById('recuperarForm');

    if (recuperarForm) {
        recuperarForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('recoveryEmail');
            const email = emailInput ? emailInput.value.trim() : '';

            if (!email) {
                mostrarToast('Por favor, ingresa tu correo electrónico.', 'danger');
                return;
            }

            const btnEnviar = document.getElementById('btnEnviarRecovery');
            if (btnEnviar) {
                btnEnviar.disabled = true;
                btnEnviar.textContent = 'Procesando recuperación...';
            }

            try {
                let resultado = {};

                // VALIDACIÓN INTELIGENTE: Entorno local (Live Server) vs Producción (Vercel)
                const esLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';

                if (esLocal) {
                    console.warn("Modo local detectado: Simulando respuesta de Python.");
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Simula espera de red
                    resultado = { success: true };
                } else {
                    // Petición real al backend de Python en Vercel
                    const response = await fetch('/api/recuperar', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email: email })
                    });

                    const responseText = await response.text();
                    try {
                        resultado = JSON.parse(responseText);
                    } catch (jsonError) {
                        throw new Error("El servidor no respondió con un formato válido.");
                    }

                    if (!response.ok) {
                        throw new Error(resultado.error || 'No se pudo procesar la solicitud en el servidor.');
                    }
                }

                if (resultado.success) {
                    const mensajeExito = esLocal 
                        ? '¡Simulación local exitosa! (En Vercel enviará el correo real)' 
                        : '¡Correo enviado con éxito a la bandeja principal!';
                    
                    mostrarToast(mensajeExito, 'success');
                    if (emailInput) emailInput.value = '';

                    // Redirigir al login después de 3.5 segundos
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 3500);
                } else {
                    throw new Error(resultado.error || 'No se pudo completar la recuperación.');
                }

            } catch (error) {
                console.error("Error en recuperación:", error);
                mostrarToast(`Error: ${error.message}`, 'danger');
            } finally {
                if (btnEnviar) {
                    btnEnviar.disabled = false;
                    btnEnviar.textContent = 'Enviar Instrucciones';
                }
            }
        });
    }
});