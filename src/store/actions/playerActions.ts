import { StateCreator } from 'zustand';
import { db, handleDatabaseError } from '../../lib/firebase';
import { doc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { Game, Player, TournamentStore, TournamentStoreActions } from '../types/tournamentTypes';
import { cleanGameForFirestore } from '../helpers/tournamentHelpers';
import { sendGameEventPush, getOrCreatePushDeviceId } from '../../lib/pushNotifications';

// Define the slice for player actions within a game
export type PlayerActionSlice = Pick<TournamentStoreActions,
  'eliminatePlayer' |
  'reinstatePlayer' |
  'rebuyPlayer' |
  'updatePlayerPayment'
>;

export const createPlayerActionSlice: StateCreator<
  TournamentStore,
  [],
  [],
  PlayerActionSlice
> = (set) => ({
  updatePlayerPayment: async (tournamentId, gameId, playerId, rebuyIndex, paid) => {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const updatedGames = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(tournamentRef);
      const data = snapshot.data();
      if (!data) throw new Error('Tournoi introuvable.');
      const games = data.games as Game[];
      const game = games.find((item) => item.id === gameId);
      const player = game?.players.find((item) => item.id === playerId);
      if (!game || !player) throw new Error('Joueur introuvable dans cette partie.');
      if (rebuyIndex !== null && (!Number.isInteger(rebuyIndex) || rebuyIndex < 0 || rebuyIndex >= (player.rebuysMade ?? 0))) {
        throw new Error('Recave introuvable.');
      }
      const players = game.players.map((item) => {
        if (item.id !== playerId) return item;
        if (rebuyIndex === null) return { ...item, buyInPaid: paid };
        const rebuyPayments = Array.from({ length: item.rebuysMade ?? 0 }, (_, index) =>
          index === rebuyIndex ? paid : (item.rebuyPayments?.[index] ?? false));
        return { ...item, rebuyPayments };
      });
      const gamesToSave = games.map((item) => cleanGameForFirestore(item.id === gameId ? { ...item, players } : item));
      transaction.update(tournamentRef, { games: gamesToSave });
      return gamesToSave;
    });
    set((state) => ({
      tournaments: state.tournaments.map((item) => item.id === tournamentId ? { ...item, games: updatedGames } : item),
    }));
  },

  // --- Player Elimination/Reinstatement ---

  eliminatePlayer: async (tournamentId, gameId, playerId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const now = Date.now();
      let playerName = '';
      const updatedGames = tournamentData.games.map((game: Game) => {
        if (game.id === gameId) {
          const updatedPlayers = game.players.map(player => {
            if (player.id === playerId) {
              playerName = player.nickname || player.name;
              return { ...player, eliminated: true, eliminationTime: now };
            }
            return player;
          });
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

      if (playerName) {
        sendGameEventPush({
          tournamentId,
          gameId,
          eventType: 'elimination',
          playerName,
          excludeDeviceId: getOrCreatePushDeviceId(),
        }).catch(err => console.warn('Failed to send elimination push notification', err));
      }
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
      const playerIndex = game.players.findIndex((p: Player) => p.id === playerId);
      if (playerIndex === -1) {
        throw new Error("Player not found in this game.");
      }
      if (!game.players[playerIndex].eliminated) {
        throw new Error("Player is not eliminated.");
      }
      const player = game.players[playerIndex];
      const rebuyLimitMode = game.rebuyLimitMode || 'until_level';
      if (rebuyLimitMode === 'until_level') {
        if (game.currentLevel >= game.rebuyAllowedUntilLevel) {
          throw new Error(`Les recaves sont autorisées jusqu'à la fin du niveau ${game.rebuyAllowedUntilLevel}. Niveau actuel : ${game.currentLevel + 1}.`);
        }
      } else {
        const maxRebuysPerPlayer = game.maxRebuysPerPlayer ?? 0;
        const playerRebuys = player.rebuysMade || 0;
        if (playerRebuys >= maxRebuysPerPlayer) {
          throw new Error(`Ce joueur a déjà atteint la limite de ${maxRebuysPerPlayer} recave(s).`);
        }
      }
      // --- End Validation ---

      // --- Perform Rebuy ---
      let playerName = '';
      const updatedPlayers = game.players.map((player: Player) => {
        if (player.id === playerId) {
          playerName = player.nickname || player.name;
          // Reinstate player and increment their rebuy count
          return {
            ...player,
            eliminated: false,
            eliminationTime: null,
            rebuysMade: (player.rebuysMade || 0) + 1,
            rebuyPayments: [
              ...Array.from({ length: player.rebuysMade ?? 0 }, (_, index) => player.rebuyPayments?.[index] ?? false),
              false,
            ]
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

      if (playerName) {
        sendGameEventPush({
          tournamentId,
          gameId,
          eventType: 'rebuy',
          playerName,
          excludeDeviceId: getOrCreatePushDeviceId(),
        }).catch(err => console.warn('Failed to send rebuy push notification', err));
      }

    } catch (error) {
      handleDatabaseError(error);
      // Re-throw the error so the UI can potentially catch it and display a message
      throw error;
    }
  },
});
