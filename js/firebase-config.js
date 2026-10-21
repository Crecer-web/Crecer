// ==========================================
// CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

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

// Inicializar la aplicación principal
const app = initializeApp(firebaseConfig);

// Inicializar instancias de los servicios
const db = getFirestore(app);
const auth = getAuth(app);
const messaging = getMessaging(app);

// Clave VAPID pública de Firebase
const vapidKey = "TU_VAPID_KEY_DE_FIREBASE";

export { 
  app,
  db, 
  auth, 
  messaging, 
  getToken, 
  onMessage, 
  vapidKey 
};