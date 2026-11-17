# CRECER - Organizador Académico y Gestor de Tareas

Plataforma web desarrollada como proyecto de tesina para el sexto año de la secundaria. Funciona como un organizador académico completo para estudiantes, permitiendo llevar el control de tareas, exámenes, horarios, calificaciones y recursos de estudio en un solo lugar con sincronización en la nube.

## Tecnologías Utilizadas

* Frontend desarrollado con HTML5, CSS3 y JavaScript modular.
* Autenticación de usuarios y base de datos en tiempo real con Firebase (Authentication y Firestore).
* Sistema de notificaciones por correo electrónico integrado mediante Brevo.
* Despliegue continuo en Vercel.

## Funcionalidades Principales

* Panel de inicio con métricas de tareas pendientes y completadas.
* Filtros avanzados por tipo de actividad y barra de búsqueda en tiempo real.
* Módulo de gestión y almacenamiento de calificaciones.
* Horario de clases y sección de recursos con validación de enlaces web seguros.
* Papelera de reciclaje para la recuperación o eliminación definitiva de registros.
* Sistema de respaldo y exportación de datos.
* Modo claro y modo oscuro sincronizado.
* Sistema de autenticación por correo y contraseña o mediante cuenta de Google.
* Recuperación de contraseña mediante servidor backend con Flask y SMTP.

## Estructura de Archivos del Proyecto

| HTML | JavaScript | CSS |
| :--- | :--- | :--- |
| `inicio.html` | `inicio.js` | `inicio.css` |
| `login.html` | `login.js` | `login.css` |
| `register.html` | `register.js` | `register.css` |
| `perfil.html` | `perfil.js` | `perfil.css` |
| `notas.html` | `notas.js` | `notas.css` |
| `horario.html` | `horario.js` | `horario.css` |
| `recursos.html` | `recursos.js` | `recursos.css` |
| `formularios.html` | `formularios.js` | `formularios.css` |
| `papelera.html` | `papelera.js` | `papelera.css` |
| `exportar.html` | `exportar.js` | `exportar.css` |
| `anti-susto.html` | `anti-susto.js` | `anti-susto.css` |
| `recuperar.html` | `recuperar.js` | `recuperar.css` |
| `reset-password.html` | `reset-password.js` | `reset-password.css` |
| - | `global.js` | `global.css` |
| - | `firebase-config.js` | - |
| - | `archivos.js` | - |