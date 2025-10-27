// Firebase init (v10 modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updatePassword 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  serverTimestamp, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Config do Firebase unificado
export const firebaseConfig = {
  apiKey: "AIzaSyBWmq02P8pGbl2NmppEAIKtF9KtQ7AzTFQ",
  authDomain: "unificado-441cd.firebaseapp.com",
  projectId: "unificado-441cd",
  storageBucket: "unificado-441cd.firebasestorage.app",
  messagingSenderId: "671392063569",
  appId: "1:671392063569:web:57e3f6b54fcdc45862d870",
  measurementId: "G-6GQX395J9C"
};

// Inicializa app, auth e db
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Mantém persistência local como no backup antigo
setPersistence(auth, browserLocalPersistence);

// Exporta todas as funções usadas no app.js
export { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updatePassword, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  serverTimestamp, 
  orderBy 
};
