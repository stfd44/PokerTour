import { StateCreator } from 'zustand';
// Removed unused isCreator
import { db, handleDatabaseError } from '../../lib/firebase';
import { doc, updateDoc, arrayUnion, getDoc, runTransaction } from 'firebase/firestore';
import { Game, Player, Tournament, TournamentStore, TournamentStoreActions } from '../types/tournamentTypes'; // Added Player import
import { cleanGameForFirestore } from '../helpers/tournamentHelpers';

// Define the slice for game actions
export type GameActionSlice = Pick<TournamentStoreActions,
  'addGame' |
  'updateGame' |
  'startGame' |
  'endGame' |
  'deleteGame'
>;

export const createGameActionSlice: StateCreator<
  TournamentStore,
  [],
  [],
  GameActionSlice
> = (set) => ({
  // Adding a Game
  addGame: async (
    tournamentId: string,
    gameData: Pick<Game, 'startingStack' | 'blinds' | 'blindLevels' | 'players' | 'tournamentId' | 'prizePool' | 'distributionPercentages' | 'winnings'>,
    rebuyAllowedUntilLevel: number = 2 // Default rebuy level to 2
  ) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef); // Fetch tournament to get buyin
      if (!tournamentDoc.exists()) {
        throw new Error("Tournament not found");
      }
      const tournamentData = tournamentDoc.data() as Tournament;
      const gameId = Date.now().toString();

      // Construct the full newGame object with all defaults
      const newGame: Game = {
        id: gameId,
        // Fields from gameData
        startingStack: gameData.startingStack,
        blinds: gameData.blinds,
        blindLevels: gameData.blindLevels,
        players: (gameData.players || []).map(p => ({ // Sanitize players
            id: p.id,
            name: p.name,
            nickname: p.nickname ?? undefined,
            eliminated: p.eliminated ?? false,
            eliminationTime: p.eliminationTime ?? null,
            rebuysMade: p.rebuysMade ?? 0, // Ensure rebuysMade exists
        })),
        tournamentId: gameData.tournamentId,
        prizePool: gameData.prizePool ?? 0, // Default prize/winnings if somehow missing
        distributionPercentages: gameData.distributionPercentages ?? { first: 60, second: 25, third: 15 },
        winnings: gameData.winnings ?? { first: 0, second: 0, third: 0 },
        // Explicit defaults for fields NOT in gameData
        status: 'pending',
        currentLevel: 0,
        levelStartTime: 0, // Or Date.now() if preferred, but 0 is safe
        isPaused: false,
        remainingTimeOnPause: null,
        startedAt: undefined, // Not started yet
        endedAt: null, // Not ended yet
        results: [], // Initialize results as empty array
        // Rebuy fields initialization
        rebuyAllowedUntilLevel: rebuyAllowedUntilLevel,
        totalRebuys: 0,
        rebuyAmount: tournamentData.buyin, // Set rebuy amount from tournament buyin
      };
      // Clean the object before saving
      const cleanNewGame = cleanGameForFirestore(newGame);
      await updateDoc(tournamentRef, {
        games: arrayUnion(cleanNewGame), // Add the cleaned game object
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
      // Map over games, ensuring defaults for all potentially missing fields in *every* game object
      const updatedGames = tournamentData.games.map((game: Game): Game => { // Add explicit : Game type
        const gameWithDefaults: Game = { // Apply defaults first, ensure type is Game
            ...game, // Spread original game first
            currentLevel: game.currentLevel ?? 0,
            levelStartTime: game.levelStartTime ?? 0,
            isPaused: game.isPaused ?? false,
            remainingTimeOnPause: game.remainingTimeOnPause ?? null,
            endedAt: game.endedAt ?? null,
            prizePool: game.prizePool ?? 0,
            distributionPercentages: game.distributionPercentages ?? { first: 60, second: 25, third: 15 },
            winnings: game.winnings ?? { first: 0, second: 0, third: 0 },
            results: game.results ?? [], // Ensure results exists
            rebuyAllowedUntilLevel: game.rebuyAllowedUntilLevel ?? 2,
            totalRebuys: game.totalRebuys ?? 0,
            rebuyAmount: game.rebuyAmount ?? 0,
            players: (game.players || []).map(p => ({ // Ensure players and their fields exist
                ...p,
                eliminated: p.eliminated ?? false,
                eliminationTime: p.eliminationTime ?? null,
                rebuysMade: p.rebuysMade ?? 0,
            })),
        };
        // If this is the game being updated, construct the final object field by field
        if (game.id === gameId) {
            const finalGameData: Game = {
                // Start with defaults applied to the original game
                ...gameWithDefaults,
                // Selectively overwrite with values from gameData if they are not undefined
                ...(gameData.tournamentId !== undefined && { tournamentId: gameData.tournamentId }),
                ...(gameData.startingStack !== undefined && { startingStack: gameData.startingStack }),
                ...(gameData.blinds !== undefined && { blinds: gameData.blinds }),
                ...(gameData.blindLevels !== undefined && { blindLevels: gameData.blindLevels }),
                ...(gameData.players !== undefined && { players: gameData.players }), // Assume gameData.players is already clean/complete if provided
                ...(gameData.status !== undefined && { status: gameData.status }),
                ...(gameData.startedAt !== undefined && { startedAt: gameData.startedAt }),
                ...(gameData.currentLevel !== undefined && { currentLevel: gameData.currentLevel }),
                ...(gameData.levelStartTime !== undefined && { levelStartTime: gameData.levelStartTime }),
                ...(gameData.isPaused !== undefined && { isPaused: gameData.isPaused }),
                ...(gameData.remainingTimeOnPause !== undefined && { remainingTimeOnPause: gameData.remainingTimeOnPause }),
                ...(gameData.endedAt !== undefined && { endedAt: gameData.endedAt }),
                ...(gameData.prizePool !== undefined && { prizePool: gameData.prizePool }),
                ...(gameData.distributionPercentages !== undefined && { distributionPercentages: gameData.distributionPercentages }),
                ...(gameData.winnings !== undefined && { winnings: gameData.winnings }),
                ...(gameData.results !== undefined && { results: gameData.results }),
                ...(gameData.rebuyAllowedUntilLevel !== undefined && { rebuyAllowedUntilLevel: gameData.rebuyAllowedUntilLevel }),
                ...(gameData.totalRebuys !== undefined && { totalRebuys: gameData.totalRebuys }),
                ...(gameData.rebuyAmount !== undefined && { rebuyAmount: gameData.rebuyAmount }),
            };
             // Log a warning if any undefined values were skipped (optional)
             for (const key in gameData) {
                 if (gameData[key as keyof Game] === undefined) {
                     console.warn(`Attempted to set undefined for field ${key} in updateGame. Skipping.`);
                 }
             }
            // Clean the final merged object before returning
            return cleanGameForFirestore(finalGameData);
        }
        // Return other games with defaults applied and cleaned
        return cleanGameForFirestore(gameWithDefaults);
      });

      await updateDoc(tournamentRef, {
        games: updatedGames, // Write the fully cleaned array
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

  // Starting a Game - Refactored to use Firestore Transaction
  startGame: async (tournamentId: string, gameId: string) => {
    const tournamentRef = doc(db, "tournaments", tournamentId);
    try {
      await runTransaction(db, async (transaction) => {
        const tournamentDoc = await transaction.get(tournamentRef);
        if (!tournamentDoc.exists()) {
          throw new Error("Tournament not found");
        }
        const tournamentData = tournamentDoc.data();
         if (!tournamentData || !tournamentData.games) {
           throw new Error("Tournament data or games array is missing");
        }

        const gameToStartIndex = tournamentData.games.findIndex((g: Game) => g.id === gameId);
        if (gameToStartIndex === -1) {
          console.log(`[startGame Transaction - ${gameId}] Game not found.`);
          return; // Exit transaction if game doesn't exist
        }
        const gameToStart = tournamentData.games[gameToStartIndex];

        // Avoid re-starting if already in progress or ended
        if (gameToStart.status !== 'pending') {
            console.log(`[startGame Transaction - ${gameId}] Game already started or ended (status: ${gameToStart.status}).`);
            return;
        }

        const now = Date.now();

        // Prepare the updated game data using existing players
        const updatedGameData = cleanGameForFirestore({
            ...gameToStart, // Keep existing game data
            status: 'in_progress',
            startedAt: now,
            levelStartTime: now, // Reset level start time
            isPaused: false, // Ensure not paused
            remainingTimeOnPause: null, // Clear pause time
            // Ensure other fields retain their values or defaults if needed
            currentLevel: gameToStart.currentLevel ?? 0,
            prizePool: gameToStart.prizePool ?? 0,
            distributionPercentages: gameToStart.distributionPercentages ?? { first: 60, second: 25, third: 15 },
            winnings: gameToStart.winnings ?? { first: 0, second: 0, third: 0 },
            rebuyAllowedUntilLevel: gameToStart.rebuyAllowedUntilLevel ?? 2,
            totalRebuys: gameToStart.totalRebuys ?? 0,
            rebuyAmount: gameToStart.rebuyAmount ?? 0,
            results: gameToStart.results ?? [],
            players: (gameToStart.players || []).map((p: Player) => ({ // Added Player type for p
                ...p,
                eliminated: p.eliminated ?? false,
                eliminationTime: p.eliminationTime ?? null,
                rebuysMade: p.rebuysMade ?? 0,
            })),
        });

        // Create the updated games array based on the data read within the transaction
        const updatedGames = tournamentData.games.map((g: Game, index: number) =>
            index === gameToStartIndex ? updatedGameData : g
        ).map((g: Game) => cleanGameForFirestore(g)); // Clean all games

        // Perform the update within the transaction
        transaction.update(tournamentRef, { games: updatedGames });
        console.log(`[startGame Transaction - ${gameId}] Transaction update scheduled.`);

        // Update local state optimistically
        set((state) => ({
            tournaments: state.tournaments.map((t) =>
              t.id === tournamentId ? { ...t, games: updatedGames } : t
            ),
        }));
      }); // End of runTransaction

      console.log(`[startGame - ${gameId}] Transaction committed successfully.`);

    } catch (error) {
      console.error(`[startGame - ${gameId}] Transaction failed:`, error);
      handleDatabaseError(error);
    }
  },

  // Ending a Game - Refactored to use Firestore Transaction (Simplified: Only marks as ended)
  endGame: async (tournamentId: string, gameId: string) => {
    const tournamentRef = doc(db, "tournaments", tournamentId);
    try {
      await runTransaction(db, async (transaction) => {
        const tournamentDoc = await transaction.get(tournamentRef);
        if (!tournamentDoc.exists()) {
          throw new Error("Tournament not found");
        }
        const tournamentData = tournamentDoc.data();
        if (!tournamentData || !tournamentData.games) {
           throw new Error("Tournament data or games array is missing");
        }

        const gameToEndIndex = tournamentData.games.findIndex((g: Game) => g.id === gameId);
        if (gameToEndIndex === -1) {
          console.log(`[endGame Transaction - ${gameId}] Game not found.`);
          return; // Exit transaction if game doesn't exist
        }
        const gameToEnd = tournamentData.games[gameToEndIndex];

        // Only proceed if the game is not already ended
        if (gameToEnd.status === 'ended') {
            console.log(`[endGame Transaction - ${gameId}] Game already marked as ended.`);
            return;
        }

        const now = Date.now();
        // Simplified: Only update status and endedAt. Results calculation moved to settlement.
        const updatedGameData = cleanGameForFirestore({
            ...gameToEnd,
            status: 'ended',
            endedAt: now,
            // results and winnings are NOT calculated or updated here anymore
        });

        // Create the updated games array
        const updatedGames = tournamentData.games.map((g: Game, index: number) =>
            index === gameToEndIndex ? updatedGameData : g
        ).map((g: Game) => cleanGameForFirestore(g));

        // Perform the update within the transaction
        transaction.update(tournamentRef, { games: updatedGames });
        console.log(`[endGame Transaction - ${gameId}] Marked game as ended. Transaction update scheduled.`);

        // Update local state optimistically (optional, but can improve UI responsiveness)
         set((state) => ({
             tournaments: state.tournaments.map((t) =>
               t.id === tournamentId ? { ...t, games: updatedGames } : t
             ),
         }));
      }); // End of runTransaction

      console.log(`[endGame - ${gameId}] Mark as ended transaction committed successfully.`);

    } catch (error) {
      console.error(`[endGame - ${gameId}] Mark as ended transaction failed:`, error);
      handleDatabaseError(error);
    }
  }, // End of endGame function

  // Deleting a Game
  deleteGame: async (tournamentId: string, gameId: string, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();

      if (!tournamentData) {
        throw new Error("Tournament not found");
      }

      // Check if the user is the creator - This is the only check needed now.
      if (tournamentData.creatorId !== userId) {
         // Use direct comparison since we have the data
        throw new Error("You are not authorized to delete games in this tournament.");
      }

      // Filter out the game to be deleted (no status check needed)
      const updatedGames = tournamentData.games.filter((game: Game) => game.id !== gameId);

      // Update the document in Firestore
      await updateDoc(tournamentRef, {
        games: updatedGames,
      });

      // Update the local state
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },
});
