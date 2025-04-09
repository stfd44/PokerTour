import { StateCreator } from 'zustand';
import { db, handleDatabaseError } from '../../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Game, TournamentStore, TournamentStoreActions } from '../types/tournamentTypes';
import { updateGameState } from '../helpers/tournamentHelpers'; // Import helper

// Define the slice for timer actions
export type TimerActionSlice = Pick<TournamentStoreActions,
  'pauseTimer' |
  'resumeTimer' |
  'advanceBlindLevel'
>;

export const createTimerActionSlice: StateCreator<
  TournamentStore,
  [],
  [],
  TimerActionSlice
> = (set) => ({
  // --- Timer Control Implementations ---

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
      // Use updateGameState helper for local state update
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
      // Use updateGameState helper for local state update
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
      // Use updateGameState helper for local state update
      set((state) => ({
        tournaments: updateGameState(state, tournamentId, gameId, updates),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },
});
