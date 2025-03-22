import { create } from 'zustand';
import { User } from 'firebase/auth';
import { auth, provider } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  login: async () => {
    try {
      
    } catch (error) {
      console.error('Error during login:', error);
    }
  },
  logout: async () => {
    try {
      await signOut(auth);
      set({ user: null });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },
}));
