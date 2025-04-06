import { create } from 'zustand';
import { User } from 'firebase/auth';
// Removed unused signInWithGoogle import
import { auth, getUserData, saveUserData } from '../lib/firebase';
import { signOut } from 'firebase/auth';

// Define a type for our user data, including the nickname
export interface AppUser {
  uid: string;
  displayName: string | null; // Keep original Google name if needed
  nickname: string | null;
  photoURL: string | null; // Add photoURL
}

interface AuthStore {
  user: AppUser | null; // Use our custom AppUser type
  isLoading: boolean; // To handle loading state during nickname check
  requiresNickname: boolean; // Flag to indicate if nickname input is needed
  setUser: (user: User | null) => Promise<void>; // Make setUser async to handle Firestore check
  setNickname: (nickname: string) => Promise<void>; // Function to save nickname
  clearRequiresNickname: () => void; // Function to reset the flag
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true, // Start in loading state
  requiresNickname: false,

  // Updated setUser to fetch/check nickname
  setUser: async (firebaseUser: User | null) => {
    if (firebaseUser) {
      set({ isLoading: true, requiresNickname: false }); // Set loading true when checking
      try {
        // Use const instead of let as userData is not reassigned
        const userData = await getUserData(firebaseUser.uid);
        if (userData && userData.nickname) {
          set({
            user: {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              nickname: userData.nickname,
              photoURL: firebaseUser.photoURL || null, // Populate photoURL
            },
            isLoading: false,
            requiresNickname: false,
          });
        } else {
          // Nickname doesn't exist, prompt user
          set({
            user: { // Store basic info for now
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              nickname: null,
              photoURL: firebaseUser.photoURL || null, // Populate photoURL
            },
            isLoading: false,
            requiresNickname: true, // Set flag to true
          });
          // If user data didn't exist at all, create it without nickname
          if (!userData) {
            await saveUserData(firebaseUser.uid, { nickname: null });
          }
        }
      } catch (error) {
        console.error("Error fetching/checking user data:", error);
        set({ user: null, isLoading: false, requiresNickname: false }); // Reset on error
      }
    } else {
      // No Firebase user, clear state
      set({ user: null, isLoading: false, requiresNickname: false });
    }
  },

  // Function to save the nickname
  setNickname: async (nickname: string) => {
    const currentUser = get().user;
    if (currentUser && currentUser.uid) {
      set({ isLoading: true });
      try {
        await saveUserData(currentUser.uid, { nickname });
        set({
          user: { ...currentUser, nickname: nickname },
          isLoading: false,
          requiresNickname: false, // Nickname set, clear flag
        });
      } catch (error) {
        console.error("Error saving nickname:", error);
        set({ isLoading: false }); // Reset loading on error
        // Optionally re-throw or handle error display
      }
    } else {
      console.error("Cannot set nickname: No user logged in.");
    }
  },

  // Function to clear the requiresNickname flag manually if needed (e.g., user cancels prompt)
  clearRequiresNickname: () => set({ requiresNickname: false }),


  // Login is now handled by signInWithGoogle directly in components,
  // setUser will be called by the onAuthStateChanged listener.
  // We keep logout.
  logout: async () => {
    try {
      await signOut(auth);
      set({ user: null, isLoading: false, requiresNickname: false }); // Reset state on logout
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },
}));
