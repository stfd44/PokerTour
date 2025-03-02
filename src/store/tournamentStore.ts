import { create } from 'zustand';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  setDoc,
  Timestamp,
  getDoc,
  FirestoreError,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

// Interfaces (unchanged)
export interface Player {
  id: string;
  name: string;
  eliminated?: boolean;
}

export interface Game {
  id: string;
  players: Player[];
  startingStack: number;
  blinds: {
    small: number;
    big: number;
  };
  blindLevels: number;
  status: 'pending' | 'in_progress' | 'finished';
  startedAt?: Date | null;
  winner?: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  date: Date | Timestamp | string;
  buyin: number;
  maxPlayers: number;
  location: string;
  registrations: Player[];
  creatorId: string;
  status: 'scheduled' | 'in_progress' | 'finished';
  games: Game[];
}

// Store Interface (unchanged)
interface TournamentStore {
  tournaments: Tournament[];
  fetchTournaments: () => Promise<void>; //remove userId
  addTournament: (tournamentData: Omit<Tournament, 'id' | 'registrations' | 'creatorId' | 'status' | 'games' | 'date'>, userId: string) => Promise<void>;
  registerToTournament: (tournamentId: string, userId: string, playerData: Player) => Promise<void>;
  unregisterFromTournament: (tournamentId: string, userId: string) => Promise<void>;
  deleteTournament: (tournamentId: string, userId:string) => Promise<void>; //add userId
  startTournament: (tournamentId: string, userId: string) => Promise<void>;
  addGame: (tournamentId: string, game: Omit<Game, "id" | "status">) => Promise<void>;
  startGame: (tournamentId: string, gameId: string, players: Player[]) => Promise<void>;
  updateGame: (tournamentId: string, gameId: string, update: Partial<Pick<Game, "players">>, userId: string) => Promise<void>;
  endGame: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
  deleteGame: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
}

// Helper function to handle database errors (improved)
const handleDatabaseError = (error: any) => {
  if (error instanceof FirestoreError) {
    console.error("Firestore error:", error.code, error.message);
    // You might want to throw different types of errors based on the Firestore error code
    // For example, if it's a "permission-denied" error, throw a specific PermissionError
    if (error.code === 'permission-denied') {
      throw new Error('You do not have permission to perform this action.');
    }
  } else {
    console.error("An unexpected error occurred:", error);
  }
  throw error; // Re-throw the error to be handled by the caller
};

// Helper function to check if the user is the creator (DRY)
const isCreator = async (tournamentRef: any, userId: string): Promise<boolean> => {
  const docSnap = await getDoc(tournamentRef);
  if (!docSnap.exists()) {
    throw new Error(`Tournament not found`);
  }
  return docSnap.data().creatorId === userId;
};

// Store Implementation
export const useTournamentStore = create<TournamentStore>((set, get) => ({
  tournaments: [],

  // Fetching Tournaments
  fetchTournaments: async () => { //remove userId
    try {
      const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
      const tournamentsData = tournamentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate().toISOString(),
        games: (doc.data().games ?? []).map((gameData: any) => ({
          ...gameData,
          startedAt: gameData.startedAt?.toDate() ?? null
        }))
      })) as Tournament[];
      set({ tournaments: tournamentsData });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Adding a Tournament
  addTournament: async (tournamentData, userId) => {
    try {
      const dateTimestamp = Timestamp.fromDate(new Date(tournamentData.date));
      const newTournament: Tournament = {
        ...tournamentData,
        id: uuidv4(),
        registrations: [],
        creatorId: userId,
        status: 'scheduled',
        games: [],
        date: dateTimestamp
      };
      await setDoc(doc(db, "tournaments", newTournament.id), newTournament);
      set((state) => ({ tournaments: [...state.tournaments, newTournament] }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Registering to a Tournament
  registerToTournament: async (tournamentId, userId, playerData) => {
    try {
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, {
        registrations: arrayUnion(playerData),
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, registrations: [...t.registrations, playerData] }
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
        const tournament = get().tournaments.find((t) => t.id === tournamentId);
        if (!tournament) return;
        const playerToRemove = tournament.registrations.find(p => p.id === userId);
        if (!playerToRemove) return;

        const tournamentRef = doc(db, 'tournaments', tournamentId);
        await updateDoc(tournamentRef, {
          registrations: arrayRemove(playerToRemove)
        });
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? { ...t, registrations: t.registrations.filter(p => p.id !== userId) }
              : t
          ),
        }));
    } catch (error) {
       handleDatabaseError(error);
    }
  },

  // Deleting a Tournament
  deleteTournament: async (tournamentId: string, userId: string) => { // add userId
    try {
       const tournamentRef = doc(db, "tournaments", tournamentId);
        if(!await isCreator(tournamentRef,userId)){
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

  // Starting a Tournament
  startTournament: async (tournamentId, userId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
        if(!await isCreator(tournamentRef,userId)){
          throw new Error("You are not the creator of this tournament");
        }
      await updateDoc(tournamentRef, {
        status: "in_progress",
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, status: "in_progress" } : t
        ),
      }));
    } catch (error) {
       handleDatabaseError(error);
    }
  },

  // Adding a Game
  addGame: async (tournamentId, game) => {
    try {
      const gameWithId = {
        ...game,
        id: uuidv4(),
        status: 'pending',
      };
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, {
        games: arrayUnion(gameWithId),
      });

      set(state => ({
        tournaments: state.tournaments.map(t =>
          t.id === tournamentId
            ? { ...t, games: [...t.games, gameWithId] }
            : t
        )
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Starting a Game
  startGame: async (tournamentId, gameId, players) => {
    try {
      const tournament = get().tournaments.find((t) => t.id === tournamentId);
      if (!tournament) return;

      const updatedGames = tournament.games.map(game =>
        game.id === gameId ? { ...game, status: 'in_progress', startedAt: new Date() } : game
      );

      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, { games: updatedGames });

      set(state => ({
        tournaments: state.tournaments.map(t =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        )
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Updating a Game (Restricted to Players)
  updateGame: async (tournamentId, gameId, update, userId) => {
    try {
      const tournament = get().tournaments.find((t) => t.id === tournamentId);
      if (!tournament) return;

      const tournamentRef = doc(db, "tournaments", tournamentId);
        if(!await isCreator(tournamentRef,userId)){
          throw new Error("You are not the creator of this tournament");
        }
      const updatedGames = tournament.games.map(game =>
        game.id === gameId ? { ...game, players: update.players } : game
      );

      await updateDoc(tournamentRef, { games: updatedGames });

      set(state => ({
        tournaments: state.tournaments.map(t =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        )
      }));
    } catch (error) {
       handleDatabaseError(error);
    }
  },
  // Ending a Game
  endGame: async (tournamentId, gameId, userId) => {
    try {
        const tournament = get().tournaments.find((t) => t.id === tournamentId);
        if (!tournament) return;

        const tournamentRef = doc(db, "tournaments", tournamentId);
         if(!await isCreator(tournamentRef,userId)){
          throw new Error("You are not the creator of this tournament");
        }

        const updatedGames = tournament.games.map(game =>
            game.id === gameId ? { ...game, status: 'finished' } : game
        );

        await updateDoc(tournamentRef, { games: updatedGames });

        set(state => ({
            tournaments: state.tournaments.map(t =>
                t.id === tournamentId ? { ...t, games: updatedGames } : t
            )
        }));
    } catch (error) {
        handleDatabaseError(error);
    }
},

 // Deleting a Game
 deleteGame: async (tournamentId, gameId, userId) => {
  try {
      const tournament = get().tournaments.find((t) => t.id === tournamentId);
        if (!tournament) return;

        const tournamentRef = doc(db, "tournaments", tournamentId);
        if(!await isCreator(tournamentRef,userId)){
          throw new Error("You are not the creator of this tournament");
        }

        const updatedGames = tournament.games.filter(game => game.id !== gameId);
      await updateDoc(tournamentRef, { games: updatedGames });
      set(state => ({
        tournaments: state.tournaments.map(t =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        )
      }));
  } catch (error) {
    handleDatabaseError(error);
  }
},
}));
