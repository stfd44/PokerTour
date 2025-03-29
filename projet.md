# Analyse du Projet PokerTour

## Technologies Utilisées

- Firebase (Firestore likely)
- Firebase SDK
- Node.js/npm
- React
- Tailwind CSS
- TypeScript
- Vite
- Zustand (State Management)

## Structure du Projet (Focus sur `src`)

```
/
├── ├── App.tsx
├── ├── components
├── │   ├── layout
├── │   │   └── Header.tsx
├── │   ├── Login.tsx
├── │   ├── NicknamePrompt.d.ts
├── │   ├── NicknamePrompt.tsx
├── │   └── tournament
├── │       ├── CreateTournament.tsx
├── │       ├── GameForm.tsx
├── │       ├── GameList.tsx
├── │       ├── GameTimer.tsx
├── │       ├── GameView.tsx
├── │       ├── TournamentGames.tsx
├── │       └── TournamentList.tsx
├── ├── index.css
├── ├── lib
├── │   ├── firebase.ts
├── │   └── utils.ts
├── ├── main.tsx
├── ├── pages
├── │   ├── Home.tsx
├── │   ├── MainLayout.tsx
├── │   ├── Profile.tsx
├── │   ├── Stats.tsx
├── │   ├── Teams
├── │   │   └── Teams.tsx
├── │   └── Tournaments.tsx
├── ├── store
├── │   ├── tournamentStore.ts
├── │   ├── useAuthStore.ts
├── │   └── useTeamStore.ts
├── └── vite-env.d.ts
```

## Points Clés de l'Architecture

**Frontend:**
- **Framework UI:** React (via Vite + TypeScript).
- **Routing:** Probablement géré via `react-router-dom` (à vérifier dans `package.json` ou l'utilisation dans `App.tsx`/`main.tsx`).
- **State Management:** Zustand (basé sur `src/store`).
- **Styling:** Tailwind CSS.
- **Structure:** Organisation par fonctionnalités/types (`components`, `pages`, `store`, `lib`).

**Backend/Base de Données:**
- **Service:** Firebase (probablement Firestore pour la base de données NoSQL temps réel).
- **Authentification:** Firebase Authentication (supposé, basé sur `useAuthStore.ts` et `firebase.ts`).
- **Règles de sécurité:** Définies dans `firestore.rules`.

**Fonctionnalités Principales (déduites des noms de fichiers):**
- Gestion de l'authentification utilisateur (`Login.tsx`, `useAuthStore.ts`).
- Création et gestion de tournois (`CreateTournament.tsx`, `TournamentList.tsx`, `tournamentStore.ts`).
- Gestion des parties dans un tournoi (`GameForm.tsx`, `GameList.tsx`, `GameTimer.tsx`, `GameView.tsx`).
- Affichage des statistiques (`Stats.tsx`).
- Gestion des équipes (`Teams.tsx`, `useTeamStore.ts`).
- Profil utilisateur (`Profile.tsx`).

## Extraits de Code Clés

### `src/main.tsx`

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
        <App />
    </BrowserRouter>
  </React.StrictMode>
);

```

### `src/App.tsx`

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import React, { useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { MainLayout } from './pages/MainLayout';
import { Header } from './components/layout/Header';
import Teams from './pages/Teams/Teams';
import { useAuthStore } from './store/useAuthStore';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import Tournaments from './pages/Tournaments';
import { useTeamStore } from './store/useTeamStore';
import { NicknamePrompt } from './components/NicknamePrompt';

function App() {
  // Get user, setUser, isLoading, and requiresNickname from the store
  const { user, setUser, isLoading, requiresNickname } = useAuthStore();
  const { fetchTeams } = useTeamStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      await setUser(currentUser);
      if (currentUser && useAuthStore.getState().user?.nickname) {
        fetchTeams(currentUser.uid);
      }
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [setUser, fetchTeams]);

  // Use the isLoading state from the store
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  // If user is logged in but requires a nickname, show the prompt
  if (user && requiresNickname) {
    return <NicknamePrompt />;
  }

  // Main application routes
  return (
    <>
      <Routes>
        <Route
          path="/login"
          // Redirect to home if user exists (even if nickname is pending, handled above)
          element={user ? <Navigate to="/" /> : <Login />}
        />
        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                {/* Pass the AppUser object */}
                <Header />
                <MainLayout />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
         {/* Update other protected routes similarly */}
         <Route
          path="/teams"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header />
                <Teams />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/tournaments"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header />
                <Tournaments />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/stats"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header />
                <Stats />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/profile"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header />
                <Profile />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </>
  );
}

export default App;

```

### `src/lib/firebase.ts`

```typescript
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

```

### `src/store/tournamentStore.ts`

```typescript
import { create } from 'zustand';
import { db, handleDatabaseError, isCreator } from '../lib/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, getDoc, query, where } from 'firebase/firestore';
import { useTeamStore } from './useTeamStore'; // Import useTeamStore

export interface Player {
  id: string;
  name: string;
  nickname?: string;
  eliminated?: boolean;
}

export interface Blinds {
  small: number;
  big: number;
}

export interface Game {
  id: string;
  tournamentId: string;
  startingStack: number;
  blinds: Blinds;
  blindLevels: number;
  players: Player[];
  status: 'pending' | 'in_progress' | 'ended';
  startedAt?: string;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  buyin: number;
  maxPlayers: number;
  location: string;
  registrations: Player[];
  creatorId: string;
  games: Game[];
  status: 'scheduled' | 'in_progress' | 'ended';
  teamId: string; // Add teamId to Tournament interface
}

interface TournamentStore {
  tournaments: Tournament[];
  fetchTournaments: (userId: string) => Promise<void>; // Add userId parameter
  addTournament: (tournamentData: Omit<Tournament, 'id' | 'registrations' | 'creatorId' | 'games' | 'status'>, userId: string, teamId: string) => Promise<void>; // Add teamId parameter
  deleteTournament: (tournamentId: string, userId: string) => Promise<void>;
  registerToTournament: (tournamentId: string, userId: string, player: Player, nickname?: string) => Promise<void>;
  unregisterFromTournament: (tournamentId: string, userId: string) => Promise<void>;
  startTournament: (tournamentId: string, userId: string) => Promise<void>;
  addGame: (tournamentId: string, gameData: Omit<Game, 'id' | 'status'>) => Promise<void>;
  updateGame: (tournamentId: string, gameId: string, gameData: Partial<Game>) => Promise<void>;
  startGame: (tournamentId: string, gameId: string, players: Player[]) => Promise<void>;
  endGame: (tournamentId: string, gameId: string) => Promise<void>;
  deleteGame: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
}

export const useTournamentStore = create<TournamentStore>((set) => ({
  tournaments: [],

  // Fetching Tournaments
  fetchTournaments: async () => { // Add userId parameter
    try {
        const { teams } = useTeamStore.getState(); // Get the teams from useTeamStore
        const userTeams = teams.map(team => team.id); // Get the user's team IDs
        if (userTeams.length === 0) {
            set({ tournaments: [] }); // If the user is not in any team, display no tournament
            return;
        }
        const q = query(collection(db, "tournaments"), where("teamId", "in", userTeams)); // Query tournaments where teamId is in userTeams
        const querySnapshot = await getDocs(q);
        const tournaments: Tournament[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Tournament[];
        set({ tournaments });
    } catch (error) {
        handleDatabaseError(error);
    }
  },

  // Adding a Tournament
  addTournament: async (tournamentData, creatorId, teamId) => {
    try {
      const docRef = await addDoc(collection(db, "tournaments"), {
        ...tournamentData,
        registrations: [],
        creatorId: creatorId,
        games: [],
        status: 'scheduled',
        teamId: teamId,
      });
      set((state) => ({
        tournaments: [
          ...state.tournaments,
          {
            id: docRef.id,
            ...tournamentData,
            registrations: [],
            creatorId: creatorId,
            games: [],
            status: 'scheduled',
            teamId: teamId,
          },
        ],
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Deleting a Tournament
  deleteTournament: async (tournamentId, userId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      if (!await isCreator(tournamentRef, userId)) {
        throw new Error("You are not the creator of this tournament");
      }
      await deleteDoc(tournamentRef);
      set((state) => ({
        tournaments: state.tournaments.filter((t) => t.id !== tournamentId),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Registering to a Tournament
    registerToTournament: async (tournamentId, userId, player, nickname) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userNickname = nickname || (userDoc.exists() ? userDoc.data().nickname : null);
      
      await updateDoc(tournamentRef, {
        registrations: arrayUnion({
          id: player.id,
          name: userNickname || player.name
        }),
      });
      const playerWithNickname = {
        id: player.id,
        name: userNickname || player.name,
        nickname: userNickname || undefined
      };
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, registrations: [...t.registrations, playerWithNickname] }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Unregistering from a Tournament
  unregisterFromTournament: async (tournamentId, userId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      const playerToRemove = tournamentData.registrations.find((p: Player) => p.id === userId);
      if (!playerToRemove) {
        throw new Error("Player not found in registrations");
      }
      await updateDoc(tournamentRef, {
        registrations: arrayRemove(playerToRemove),
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, registrations: t.registrations.filter((p) => p.id !== userId) }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Starting a Tournament
  startTournament: async (tournamentId, userId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      if (!await isCreator(tournamentRef, userId)) {
        throw new Error("You are not the creator of this tournament");
      }
      await updateDoc(tournamentRef, {
        status: 'in_progress',
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, status: 'in_progress' }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Adding a Game
  addGame: async (tournamentId: string, gameData: Omit<Game, 'id' | 'status'>) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const gameId = Date.now().toString();
      const newGame = {
        id: gameId,
        ...gameData,
        status: 'pending', // Ensure status is 'pending'
      };
      await updateDoc(tournamentRef, {
        games: arrayUnion(newGame),
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, games: [...t.games, newGame as Game] } // Type assertion to ensure correct type
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Updating a Game
  updateGame: async (tournamentId: string, gameId: string, gameData: Partial<Game>) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      const updatedGames = tournamentData.games.map((game: Game) =>
        game.id === gameId ? { ...game, ...gameData } : game
      );
      await updateDoc(tournamentRef, {
        games: updatedGames,
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Starting a Game
  startGame: async (tournamentId: string, gameId: string, players: Player[]) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      const updatedGames = tournamentData.games.map((game: Game) =>
        game.id === gameId ? { ...game, status: 'in_progress', startedAt: new Date().toISOString(), players: players } : game
      );
      await updateDoc(tournamentRef, {
        games: updatedGames,
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Ending a Game
  endGame: async (tournamentId: string, gameId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      const updatedGames = tournamentData.games.map((game: Game) =>
        game.id === gameId ? { ...game, status: 'ended' } : game
      );
      await updateDoc(tournamentRef, {
        games: updatedGames,
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Deleting a Game
  deleteGame: async (tournamentId: string, gameId: string, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      if (!await isCreator(tournamentRef, userId)) {
        throw new Error("You are not the creator of this tournament");
      }
      const updatedGames = tournamentData.games.filter((game: Game) => game.id !== gameId);
      await updateDoc(tournamentRef, {
        games: updatedGames,
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },
}));

```

### `src/store/useAuthStore.ts`

```typescript
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

```

### `src/pages/MainLayout.tsx`

```typescript
// src/pages/MainLayout.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { CreateTournament } from '../components/tournament/CreateTournament';
import { TournamentList } from '../components/tournament/TournamentList';
import { TournamentGames } from '../components/tournament/TournamentGames';
import Home from './Home';

export function MainLayout() {
  return (
    <div className="min-h-screen container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app/create-tournament" element={<CreateTournament />} />
          <Route path="/tournaments" element={<TournamentList />} />
          <Route path="/tournament/:tournamentId" element={<TournamentGames />} />
        </Routes>
      </div>
    </div>
  );
}

```

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

```

### `package.json`

```json
{
  "name": "poker-tour",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "clsx": "^2.1.0",
    "dom": "^0.0.3",
    "firebase": "^10.8.0",
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.3",
    "tailwind-merge": "^2.2.1",
    "uuid": "^11.1.0",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.9.1",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.18",
    "eslint": "^9.9.1",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.11",
    "globals": "^15.9.0",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "typescript-eslint": "^8.3.0",
    "vite": "^5.4.2"
  }
}

```

