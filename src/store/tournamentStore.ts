import { create } from 'zustand';
import { db, handleDatabaseError, isCreator } from '../lib/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, getDoc, query, where } from 'firebase/firestore';
import { useTeamStore } from './useTeamStore'; // Import useTeamStore

export interface Player {
  id: string;
  name: string;
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
  registerToTournament: (tournamentId: string, userId: string, player: Player) => Promise<void>;
  unregisterFromTournament: (tournamentId: string, userId: string) => Promise<void>;
  startTournament: (tournamentId: string, userId: string) => Promise<void>;
  addGame: (tournamentId: string, gameData: Omit<Game, 'id' | 'status'>) => Promise<void>;
  updateGame: (tournamentId: string, gameId: string, gameData: Partial<Game>) => Promise<void>;
  startGame: (tournamentId: string, gameId: string, players: Player[]) => Promise<void>;
  endGame: (tournamentId: string, gameId: string) => Promise<void>;
  deleteGame: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  tournaments: [],

  // Fetching Tournaments
  fetchTournaments: async (userId) => { // Add userId parameter
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
  addTournament: async (tournamentData, userId, teamId) => { // Add teamId parameter
    try {
      const docRef = await addDoc(collection(db, "tournaments"), {
        ...tournamentData,
        registrations: [],
        creatorId: userId,
        games: [],
        status: 'scheduled',
        teamId: teamId, // Add teamId to Firestore document
      });
      set((state) => ({
        tournaments: [
          ...state.tournaments,
          {
            id: docRef.id,
            ...tournamentData,
            registrations: [],
            creatorId: userId,
            games: [],
            status: 'scheduled',
            teamId: teamId, // Add teamId to local state
          },
        ],
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Deleting a Tournament
  deleteTournament: async (tournamentId: string, userId: string) => {
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
  registerToTournament: async (tournamentId: string, userId: string, player: Player) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      await updateDoc(tournamentRef, {
        registrations: arrayUnion(player),
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, registrations: [...t.registrations, player] }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Unregistering from a Tournament
  unregisterFromTournament: async (tournamentId: string, userId: string) => {
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
  startTournament: async (tournamentId: string, userId: string) => {
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
        status: 'pending',
      };
      await updateDoc(tournamentRef, {
        games: arrayUnion(newGame),
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, games: [...t.games, newGame] }
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
