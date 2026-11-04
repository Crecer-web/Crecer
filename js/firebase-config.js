// ==========================================
// CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvzStzUNt0kjfyL5mNBzIqI1PbdzypOTI",
  authDomain: "crecer-web.firebaseapp.com",
  projectId: "crecer-web",
  storageBucket: "crecer-web.appspot.com",
  messagingSenderId: "317004134591",
  appId: "1:317004134591:web:d6d20a224f393a339aee0a",
  measurementId: "G-5SR5DK594M"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
let messaging = null;

try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn("Firebase Messaging no está disponible en este entorno.");
}

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