import { StateCreator } from 'zustand';
import { db, handleDatabaseError } from '../../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Game, Player, TournamentStore, TournamentStoreActions } from '../types/tournamentTypes';
import { updateGameState } from '../helpers/tournamentHelpers'; // Import helper

// Define the slice for timer actions
export type TimerActionSlice = Pick<TournamentStoreActions,
  'pauseTimer' |
  'resumeTimer' |
  'advanceBlindLevel' |
  'resetLevelTimer' |
  'updateLevelDuration'
>;

export const createTimerActionSlice: StateCreator<
  TournamentStore,
  [],
  [],
  TimerActionSlice
> = (set) => ({
  // --- Timer Control Implementations ---

  pauseTimer: async (tournamentId: string, gameId: string, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const game = tournamentData.games.find((g: Game) => g.id === gameId);
      if (!game || game.isPaused || game.status !== 'in_progress') return; // Already paused or not running

      const isPlayerInGame = game.players.some((p: Player) => p.id === userId);
      if (!isPlayerInGame) {
        throw new Error("Only players in the game can pause the timer.");
      }

      const now = Date.now();
      const levelDurationMs = game.levelDuration * 60 * 1000;
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
      // Use updateGameState helper for local state update
      set((state) => ({
        tournaments: updateGameState(state, tournamentId, gameId, updates),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  resumeTimer: async (tournamentId: string, gameId: string, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const game = tournamentData.games.find((g: Game) => g.id === gameId);
      if (!game || !game.isPaused || game.status !== 'in_progress' || game.remainingTimeOnPause === null) return; // Not paused or invalid state

      const isPlayerInGame = game.players.some((p: Player) => p.id === userId);
      if (!isPlayerInGame) {
        throw new Error("Only players in the game can resume the timer.");
      }

      const now = Date.now();
      const levelDurationMs = game.levelDuration * 60 * 1000;
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
      // Use updateGameState helper for local state update
      set((state) => ({
        tournaments: updateGameState(state, tournamentId, gameId, updates),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  advanceBlindLevel: async (tournamentId: string, gameId: string, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const game = tournamentData.games.find((g: Game) => g.id === gameId);
      if (!game || game.status !== 'in_progress') return; // Game not running

      const isPlayerInGame = game.players.some((p: Player) => p.id === userId);
      if (!isPlayerInGame) {
        throw new Error("Only players in the game can change the blind level.");
      }

      const nextLevel = game.currentLevel + 1;
      const newBlindStructure = [...game.blindStructure];

      // If the next blind level is not defined, create it by doubling the previous one.
      if (nextLevel >= newBlindStructure.length) {
        const lastBlinds = newBlindStructure[newBlindStructure.length - 1];
        newBlindStructure.push({
          small: lastBlinds.small * 2,
          big: lastBlinds.big * 2,
        });
      }

      const updates: Partial<Game> = {
        currentLevel: nextLevel,
        blindStructure: newBlindStructure,
        levelStartTime: Date.now(),
        isPaused: false,
        remainingTimeOnPause: null,
      };

      const updatedGames = tournamentData.games.map((g: Game) =>
        g.id === gameId ? { ...g, ...updates } : g
      );

      await updateDoc(tournamentRef, { games: updatedGames });
      // Use updateGameState helper for local state update
      set((state) => ({
        tournaments: updateGameState(state, tournamentId, gameId, updates),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  resetLevelTimer: async (tournamentId: string, gameId: string, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const game = tournamentData.games.find((g: Game) => g.id === gameId);
      if (!game || game.status !== 'in_progress') return;

      const isPlayerInGame = game.players.some((p: Player) => p.id === userId);
      if (!isPlayerInGame) {
        throw new Error("Only players in the game can reset the timer.");
      }

      const updates: Partial<Game> = {
        levelStartTime: Date.now(),
        isPaused: false,
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

  updateLevelDuration: async (tournamentId: string, gameId: string, newDuration: number, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const game = tournamentData.games.find((g: Game) => g.id === gameId);
      if (!game || game.status !== 'in_progress') return;

      const isPlayerInGame = game.players.some((p: Player) => p.id === userId);
      if (!isPlayerInGame) {
        throw new Error("Only players in the game can update the level duration.");
      }

      if (newDuration <= 0) {
        throw new Error("Level duration must be a positive number.");
      }

      const updates: Partial<Game> = {
        levelDuration: newDuration,
        levelStartTime: Date.now(),
        isPaused: false,
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
});
