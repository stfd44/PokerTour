import { create } from 'zustand';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Player {
  id: string;
  name: string;
  eliminated?: boolean;
}

export interface Game {
  id: string;
  tournamentId: string;
  startingStack: number;
  blinds: {
    small: number;
    big: number;
  };
  blindLevels: number; // durée en minutes
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  players: Player[];
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  buyin: number;
  maxPlayers: number;
  location: string;
  createdAt: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  startedAt?: string;
  endedAt?: string;
  registrations: Player[];
  games: Game[];
}

interface TournamentStore {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  fetchTournaments: () => Promise<void>;
  addTournament: (tournament: Omit<Tournament, 'id' | 'createdAt' | 'registrations' | 'status' | 'games'>) => Promise<void>;
  registerToTournament: (tournamentId: string, player: Player) => Promise<void>;
  unregisterFromTournament: (tournamentId: string, playerId: string) => Promise<void>;
  startTournament: (tournamentId: string) => Promise<void>;
  addGame: (tournamentId: string, gameData: Omit<Game, 'id' | 'tournamentId' | 'status' | 'createdAt'>) => Promise<void>;
  updateGame: (tournamentId: string, gameId: string, gameData: Partial<Game>) => Promise<void>;
  startGame: (tournamentId: string, gameId: string, players: Player[]) => Promise<void>;
  endGame: (tournamentId: string, gameId: string) => Promise<void>;
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  tournaments: [],
  loading: false,
  error: null,

  fetchTournaments: async () => {
    set({ loading: true, error: null });
    try {
      const tournamentsRef = collection(db, 'tournaments');
      const q = query(tournamentsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const tournaments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tournament[];
      set({ tournaments, loading: false });
    } catch (error) {
      set({ error: 'Erreur lors du chargement des tournois', loading: false });
      console.error('Error fetching tournaments:', error);
    }
  },

  addTournament: async (tournament) => {
    try {
      const tournamentsRef = collection(db, 'tournaments');
      const newTournament = {
        ...tournament,
        createdAt: new Date().toISOString(),
        registrations: [],
        status: 'scheduled',
        games: [],
      };
      const docRef = await addDoc(tournamentsRef, newTournament);
      const tournaments = get().tournaments;
      set({
        tournaments: [{
          ...newTournament,
          id: docRef.id
        } as Tournament, ...tournaments]
      });
    } catch (error) {
      set({ error: 'Erreur lors de la création du tournoi' });
      console.error('Error adding tournament:', error);
    }
  },

  registerToTournament: async (tournamentId, player) => {
    try {
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, {
        registrations: arrayUnion(player)
      });
      const tournaments = get().tournaments.map(tournament =>
        tournament.id === tournamentId
          ? {
              ...tournament,
              registrations: [...tournament.registrations, player]
            }
          : tournament
      );
      set({ tournaments });
    } catch (error) {
      set({ error: "Erreur lors de l'inscription au tournoi" });
      console.error('Error registering to tournament:', error);
    }
  },

  unregisterFromTournament: async (tournamentId, playerId) => {
    try {
      const tournament = get().tournaments.find(t => t.id === tournamentId);
      if (!tournament) return;

      const player = tournament.registrations.find(p => p.id === playerId);
      if (!player) return;

      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, {
        registrations: arrayRemove(player)
      });

      const tournaments = get().tournaments.map(tournament =>
        tournament.id === tournamentId
          ? {
              ...tournament,
              registrations: tournament.registrations.filter(p => p.id !== playerId)
            }
          : tournament
      );
      set({ tournaments });
    } catch (error) {
      set({ error: "Erreur lors de la désinscription du tournoi" });
      console.error('Error unregistering from tournament:', error);
    }
  },

  startTournament: async (tournamentId) => {
    try {
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      const startedAt = new Date().toISOString();
      await updateDoc(tournamentRef, {
        status: 'in_progress',
        startedAt
      });

      const tournaments = get().tournaments.map(tournament =>
        tournament.id === tournamentId
          ? {
              ...tournament,
              status: 'in_progress',
              startedAt
            }
          : tournament
      );
      set({ tournaments });
    } catch (error) {
      set({ error: 'Erreur lors du démarrage du tournoi' });
      console.error('Error starting tournament:', error);
    }
  },

  addGame: async (tournamentId, gameData) => {
    try {
      const tournament = get().tournaments.find(t => t.id === tournamentId);
      if (!tournament) return;

      const newGame = {
        ...gameData,
        id: crypto.randomUUID(),
        tournamentId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        players: gameData.players || []
      };

      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, {
        games: arrayUnion(newGame)
      });

      const tournaments = get().tournaments.map(tournament =>
        tournament.id === tournamentId
          ? {
              ...tournament,
              games: [...tournament.games, newGame]
            }
          : tournament
      );
      set({ tournaments });
    } catch (error) {
      set({ error: 'Erreur lors de la création de la partie' });
      console.error('Error adding game:', error);
    }
  },

  updateGame: async (tournamentId, gameId, gameData) => {
    try {
      const tournament = get().tournaments.find(t => t.id === tournamentId);
      if (!tournament) return;

      const updatedGames = tournament.games.map(game =>
        game.id === gameId
          ? { ...game, ...gameData }
          : game
      );

      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, { games: updatedGames });

      const tournaments = get().tournaments.map(t =>
        t.id === tournamentId
          ? { ...t, games: updatedGames }
          : t
      );
      set({ tournaments });
    } catch (error) {
      set({ error: 'Erreur lors de la mise à jour de la partie' });
      console.error('Error updating game:', error);
    }
  },

  startGame: async (tournamentId, gameId, players) => {
    try {
      const tournament = get().tournaments.find(t => t.id === tournamentId);
      if (!tournament) return;

      const updatedGames = tournament.games.map(game =>
        game.id === gameId
          ? {
              ...game,
              status: 'in_progress',
              startedAt: new Date().toISOString(),
              players: players.map(player => ({ ...player, eliminated: false }))
            }
          : game
      );

      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, { games: updatedGames });

      const tournaments = get().tournaments.map(t =>
        t.id === tournamentId
          ? { ...t, games: updatedGames }
          : t
      );
      set({ tournaments });
    } catch (error) {
      set({ error: 'Erreur lors du démarrage de la partie' });
      console.error('Error starting game:', error);
    }
  },

  endGame: async (tournamentId, gameId) => {
    try {
      const tournament = get().tournaments.find(t => t.id === tournamentId);
      if (!tournament) return;

      const updatedGames = tournament.games.map(game =>
        game.id === gameId
          ? {
              ...game,
              status: 'completed',
              endedAt: new Date().toISOString()
            }
          : game
      );

      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tournamentRef, { games: updatedGames });

      const tournaments = get().tournaments.map(t =>
        t.id === tournamentId
          ? { ...t, games: updatedGames }
          : t
      );
      set({ tournaments });
    } catch (error) {
      set({ error: 'Erreur lors de la fin de la partie' });
      console.error('Error ending game:', error);
    }
  }
}));