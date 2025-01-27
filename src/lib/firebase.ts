import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAjTzxWNQCsXbrM47iYoYJ4WH3XH2tN0iY",
  authDomain: "pokertour-bf6b4.firebaseapp.com",
  projectId: "pokertour-bf6b4",
  storageBucket: "pokertour-bf6b4.firebasestorage.app",
  messagingSenderId: "611114291347",
  appId: "1:611114291347:web:a2eaf14a442ccc5308fd66",
  measurementId: "G-BNP0BZJEBH"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);