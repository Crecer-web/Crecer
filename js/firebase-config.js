// ==========================================
// CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Configuración del proyecto de Firebase con tus credenciales reales
const firebaseConfig = {
  apiKey: "AIzaSyBvzStzUNt0kjfyL5mNBzIqI1PbdzypOTI",
  authDomain: "crecer-web.firebaseapp.com",
  projectId: "crecer-web",
  storageBucket: "crecer-web.appspot.com",
  messagingSenderId: "317004134591",
  appId: "1:317004134591:web:d6d20a224f393a339aee0a",
  measurementId: "G-5SR5DK594M"
};

// Inicializar la aplicación de Firebase
const app = initializeApp(firebaseConfig);

// Exportar las instancias del servicio para ser utilizadas en los demás módulos
export const db = getFirestore(app);
export const auth = getAuth(app);