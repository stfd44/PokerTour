// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // Import Firestore functions

// Firebase configuration (you should ideally move these to environment variables)
const firebaseConfig = {
  apiKey: "AIzaSyAjTzxWNQCsXbrM47iYoYJ4WH3XH2tN0iY",
  authDomain: "pokertour-bf6b4.firebaseapp.com",
  projectId: "pokertour-bf6b4",
  storageBucket: "pokertour-bf6b4.firebasestorage.app",
  messagingSenderId: "611114291347",
  appId: "1:611114291347:web:a2eaf14a442ccc5308fd66",
  measurementId: "G-BNP0BZJEBH"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Get Firebase Auth instance
export const auth = getAuth(app);

// Get Firestore instance
export const db = getFirestore(app);

// Google Provider
const provider = new GoogleAuthProvider();

/**
 * Sign in with Google using a popup.
 * @returns A Promise that resolves with the signed-in user.
 */
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    // This gives you a Google Access Token. You can use it to access the Google API.
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    // The signed-in user info.
    const user = result.user;
    console.log("Utilisateur connecté avec Google :", user);
    return user;
  } catch (error) {
    // Handle Errors here.
    const errorCode = error.code;
    const errorMessage = error.message;
    // The email of the user's account used.
    // const email = error.customData.email;
    // The AuthCredential type that was used.
    // const credential = GoogleAuthProvider.credentialFromError(error);
    console.error("Erreur de connexion Google :", errorCode, errorMessage);
    return null;
  }
};
