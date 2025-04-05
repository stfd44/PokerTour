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
  startedAt?: number; // Changed to number (timestamp) for consistency
  currentLevel: number; // Index of the current blind level (starts at 0)
  levelStartTime: number; // Timestamp when the current level started (adjusted for pauses)
  isPaused: boolean; // Is the timer manually paused?
  remainingTimeOnPause: number | null; // Milliseconds remaining when paused
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
  // New Timer Control Actions
  pauseTimer: (tournamentId: string, gameId: string) => Promise<void>;
  resumeTimer: (tournamentId: string, gameId: string) => Promise<void>;
  advanceBlindLevel: (tournamentId: string, gameId: string) => Promise<void>;
}

// Helper function to find and update a game within the state
const updateGameState = (state: TournamentStore, tournamentId: string, gameId: string, updates: Partial<Game>): Tournament[] => {
  return state.tournaments.map((t) =>
    t.id === tournamentId
      ? {
          ...t,
          games: t.games.map((g) =>
            g.id === gameId ? { ...g, ...updates } : g
          ),
        }
      : t
  );
};

// Removed unused 'get' parameter from create callback
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
      const now = Date.now();
      const updatedGames = tournamentData.games.map((game: Game) =>
        game.id === gameId
          ? {
              ...game,
              status: 'in_progress',
              startedAt: now, // Use timestamp
              players: players,
              // Initialize new timer fields
              currentLevel: 0,
              levelStartTime: now,
              isPaused: false,
              remainingTimeOnPause: null,
            }
          : game
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

  // --- New Timer Control Implementations ---

  pauseTimer: async (tournamentId, gameId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const game = tournamentData.games.find((g: Game) => g.id === gameId);
      if (!game || game.isPaused || game.status !== 'in_progress') return; // Already paused or not running

      const now = Date.now();
      const levelDurationMs = game.blindLevels * 60 * 1000;
      const elapsedInLevel = now - game.levelStartTime;
      const remainingTime = Math.max(0, levelDurationMs - elapsedInLevel); // Ensure non-negative

      const updates: Partial<Game> = {
        isPaused: true,
        remainingTimeOnPause: remainingTime,
      };

      const updatedGames = tournamentData.games.map((g: Game) =>
        g.id === gameId ? { ...g, ...updates } : g
      );

      await updateDoc(tournamentRef, { games: updatedGames });
      set((state) => ({
        tournaments: updateGameState(state, tournamentId, gameId, updates),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  resumeTimer: async (tournamentId, gameId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const game = tournamentData.games.find((g: Game) => g.id === gameId);
      if (!game || !game.isPaused || game.status !== 'in_progress' || game.remainingTimeOnPause === null) return; // Not paused or invalid state

      const now = Date.now();
      const levelDurationMs = game.blindLevels * 60 * 1000;
      // Calculate the new effective start time for the level
      const newLevelStartTime = now - (levelDurationMs - game.remainingTimeOnPause);

      const updates: Partial<Game> = {
        isPaused: false,
        levelStartTime: newLevelStartTime,
        remainingTimeOnPause: null,
      };

      const updatedGames = tournamentData.games.map((g: Game) =>
        g.id === gameId ? { ...g, ...updates } : g
      );

      await updateDoc(tournamentRef, { games: updatedGames });
      set((state) => ({
        tournaments: updateGameState(state, tournamentId, gameId, updates),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  advanceBlindLevel: async (tournamentId, gameId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const game = tournamentData.games.find((g: Game) => g.id === gameId);
      if (!game || game.status !== 'in_progress') return; // Game not running

      const updates: Partial<Game> = {
        currentLevel: game.currentLevel + 1,
        levelStartTime: Date.now(),
        isPaused: false, // Ensure timer is running for the new level
        remainingTimeOnPause: null,
      };

      const updatedGames = tournamentData.games.map((g: Game) =>
        g.id === gameId ? { ...g, ...updates } : g
      );

      await updateDoc(tournamentRef, { games: updatedGames });
      set((state) => ({
        tournaments: updateGameState(state, tournamentId, gameId, updates),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },
}));
