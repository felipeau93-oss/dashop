import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDeKClN6EI1wjM2KVsZmZCpmHqj9QzuBxo",
  authDomain: "dashop-eba3f.firebaseapp.com",
  projectId: "dashop-eba3f",
  storageBucket: "dashop-eba3f.firebasestorage.app",
  messagingSenderId: "437302815217",
  appId: "1:437302815217:web:ca6a79473389286ce3bc50"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta o Banco de Dados (Firestore) para usarmos no seu painel
export const db = getFirestore(app);