import { StateCreator } from 'zustand';
import { db, handleDatabaseError } from '../../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Game, Player, TournamentStore, TournamentStoreActions } from '../types/tournamentTypes';
import { cleanGameForFirestore } from '../helpers/tournamentHelpers';

// Define the slice for player actions within a game
export type PlayerActionSlice = Pick<TournamentStoreActions,
  'eliminatePlayer' |
  'reinstatePlayer' |
  'rebuyPlayer'
>;

export const createPlayerActionSlice: StateCreator<
  TournamentStore,
  [],
  [],
  PlayerActionSlice
> = (set) => ({
  // --- Player Elimination/Reinstatement ---

  eliminatePlayer: async (tournamentId, gameId, playerId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const now = Date.now();
      const updatedGames = tournamentData.games.map((game: Game) => {
        if (game.id === gameId) {
          const updatedPlayers = game.players.map(player =>
            player.id === playerId
              ? { ...player, eliminated: true, eliminationTime: now }
              : player
          );
          // Return the cleaned game object
          return cleanGameForFirestore({ ...game, players: updatedPlayers });
        }
        // Return other games (already cleaned if fetched correctly, but cleaning again is safe)
        return cleanGameForFirestore(game);
      });

      await updateDoc(tournamentRef, { games: updatedGames });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  reinstatePlayer: async (tournamentId, gameId, playerId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const updatedGames = tournamentData.games.map((game: Game) => {
        if (game.id === gameId) {
          const updatedPlayers = game.players.map(player =>
            player.id === playerId
              ? { ...player, eliminated: false, eliminationTime: null }
              : player
          );
           // Return the cleaned game object
          return cleanGameForFirestore({ ...game, players: updatedPlayers });
        }
         // Return other games (already cleaned if fetched correctly, but cleaning again is safe)
        return cleanGameForFirestore(game);
      });

      await updateDoc(tournamentRef, { games: updatedGames });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // --- Rebuy Player ---
  rebuyPlayer: async (tournamentId, gameId, playerId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const gameIndex = tournamentData.games.findIndex((g: Game) => g.id === gameId);
      if (gameIndex === -1) throw new Error("Game not found");

      const game = tournamentData.games[gameIndex];

      // --- Validation Checks ---
      if (game.status !== 'in_progress') {
        throw new Error("Game is not in progress.");
      }
      if (game.currentLevel >= game.rebuyAllowedUntilLevel) { // Use >= because levels are 0-indexed, level 2 means until *end* of level 2
        throw new Error(`Rebuys are only allowed up to level ${game.rebuyAllowedUntilLevel}. Current level: ${game.currentLevel + 1}.`);
      }
      const playerIndex = game.players.findIndex((p: Player) => p.id === playerId);
      if (playerIndex === -1) {
        throw new Error("Player not found in this game.");
      }
      if (!game.players[playerIndex].eliminated) {
        throw new Error("Player is not eliminated.");
      }
      // --- End Validation ---

      // --- Perform Rebuy ---
      const updatedPlayers = game.players.map((player: Player) => {
        if (player.id === playerId) {
          // Reinstate player and increment their rebuy count
          return {
            ...player,
            eliminated: false,
            eliminationTime: null,
            rebuysMade: (player.rebuysMade || 0) + 1 // Increment player's rebuy count
          };
        }
        return player;
      });

      const updatedGameData: Game = {
        ...game,
        players: updatedPlayers,
        totalRebuys: (game.totalRebuys || 0) + 1,
      };
      

      const updatedGames = [
        ...tournamentData.games.slice(0, gameIndex),
        updatedGameData,
        ...tournamentData.games.slice(gameIndex + 1),
      ].map(g => cleanGameForFirestore(g)); // Clean all games

      await updateDoc(tournamentRef, { games: updatedGames });

      // Update local state
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));

    } catch (error) {
      handleDatabaseError(error);
      // Re-throw the error so the UI can potentially catch it and display a message
      throw error;
    }
  },
});
