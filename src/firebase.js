import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC74gu8eCJBkT9NrzgqadrjfHcbf15Q0GY",
  authDomain: "dashop-1291f.firebaseapp.com",
  projectId: "dashop-1291f",
  storageBucket: "dashop-1291f.firebasestorage.app",
  messagingSenderId: "269337118899",
  appId: "1:269337118899:web:9a97603346613346f5c8c6"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta o Banco de Dados (Firestore) e Autenticação (Auth)
export const db = getFirestore(app);
export const auth = getAuth(app);
