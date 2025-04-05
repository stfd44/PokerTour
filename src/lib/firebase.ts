import { initializeApp } from 'firebase/app';
// Import necessary Firestore functions: doc, getDoc, setDoc
import { getFirestore, doc, getDoc, setDoc, DocumentReference, DocumentData } from 'firebase/firestore'; // Removed updateDoc, collection; Added DocumentReference, DocumentData
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return null;
  }
};

// Provide a more specific type for the error if possible, otherwise use 'unknown' or 'Error'
export const handleDatabaseError = (error: unknown) => {
  console.error('Database error:', error);
  // Check if it's an error object before accessing message
  if (error instanceof Error) {
    alert(error.message);
  } else {
    alert('An unknown database error occurred.');
  }
};

// Use DocumentReference<DocumentData> for docRef type
export const isCreator = async (docRef: DocumentReference<DocumentData>, userId: string): Promise<boolean> => {
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    // Explicitly type data or access properties safely
    const data = docSnap.data();
    // Check if creatorId exists before comparing
    return data?.creatorId === userId;
  } else {
    return false;
  }
};

// --- New User Data Functions ---

// Type for user data stored in Firestore
interface UserData {
  nickname: string | null;
  // Add other user-specific fields here if needed in the future
}

// Get user data from Firestore
export const getUserData = async (userId: string): Promise<UserData | null> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    } else {
      console.log(`No user data found for user ${userId}`);
      return null; // No document found
    }
  } catch (error) {
    console.error("Error getting user data:", error);
    handleDatabaseError(error); // Use existing error handler
    return null; // Return null on error
  }
};

// Save or update user data in Firestore
export const saveUserData = async (userId: string, data: Partial<UserData>): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    // Use setDoc with merge: true to create or update partially
    await setDoc(userDocRef, data, { merge: true });
    console.log(`User data saved for user ${userId}`);
  } catch (error) {
    console.error("Error saving user data:", error);
    handleDatabaseError(error); // Use existing error handler
    // Re-throw or handle as needed
    throw error;
  }
};
