import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración del proyecto de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBvzStzUNt0kjfyL5mNBzIqI1PbdzypOTI",
  authDomain: "crecer-web.firebaseapp.com",
  projectId: "crecer-web",
  storageBucket: "crecer-web.appspot.com",
  messagingSenderId: "317004134591",
  appId: "1:317004134591:web:d6d20a224f393a339aee0a",
  measurementId: "G-5SR5DK594M"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar la instancia de Firestore para ser usada en los demás scripts
export const db = getFirestore(app);