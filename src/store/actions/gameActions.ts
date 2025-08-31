import { StateCreator } from 'zustand';
// Removed unused isCreator
import { db, handleDatabaseError } from '../../lib/firebase';
import { doc, updateDoc, arrayUnion, getDoc, runTransaction } from 'firebase/firestore';
import { Blinds, Game, Player, Tournament, TournamentStore, TournamentStoreActions } from '../types/tournamentTypes';
import { cleanGameForFirestore, calculateResultsForGame } from '../helpers/tournamentHelpers';

// Define the slice for game actions
export type GameActionSlice = Pick<TournamentStoreActions,
  'addGame' |
  // 'updateGame' |
  'startGame' |
  'endGame' |
  'deleteGame' |
  'updateBlinds'
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
    gameData: Pick<Game, 'startingStack' | 'players' | 'tournamentId' | 'prizePool' | 'distributionPercentages' | 'winnings' | 'potContributions' | 'totalPotAmount'>,
    initialBlinds: Blinds,
    levelDuration: number,
    rebuyAllowedUntilLevel: number = 2
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
        levelDurations: [levelDuration],
        blindStructure: [initialBlinds],
        players: (gameData.players || []).map(p => ({ // Sanitize players
            id: p.id,
            name: p.name,
            nickname: p.nickname ?? null,
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
        startedAt: null, // Not started yet
        endedAt: null, // Not ended yet
        results: [], // Initialize results as empty array
        // Rebuy fields initialization
        rebuyAllowedUntilLevel: rebuyAllowedUntilLevel,
        totalRebuys: 0,
        rebuyAmount: tournamentData.buyin, // Set rebuy amount from tournament buyin
        // ADDED: Pot management fields (only if provided)
        ...(gameData.potContributions && {
          potContributions: gameData.potContributions,
          totalPotAmount: gameData.totalPotAmount || 0
        })
      };

      console.log(`[addGame] Creating ${gameData.potContributions ? 'pot-based' : 'traditional'} game ${gameId}`, {
        usePot: !!gameData.potContributions,
        potAmount: gameData.totalPotAmount || 0,
        contributionsCount: gameData.potContributions?.length || 0
      });
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
  // TODO: Refactor updateGame to work with the new data structure if needed.
  // Commenting out for now as it's not used by the new features.
  // updateGame: async (tournamentId: string, gameId: string, gameData: Partial<Game>) => {
  // },

  // Starting a Game - Refactored to use Firestore Transaction
  startGame: async (tournamentId: string, gameId: string, userId: string) => {
    const tournamentRef = doc(db, "tournaments", tournamentId);
    try {
      await runTransaction(db, async (transaction) => {
        const tournamentDoc = await transaction.get(tournamentRef);
        if (!tournamentDoc.exists()) {
          throw new Error("Tournament not found");
        }
        const tournamentData = tournamentDoc.data() as Tournament;

        // Check if the user is a registered player in the tournament
        const isParticipant = tournamentData.registrations.some(p => p.id === userId);
        if (!isParticipant) {
          throw new Error("Only registered players can start a game.");
        }

         if (!tournamentData.games) {
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
        
        // Calculate results for the ended game
        const resultsCalculation = calculateResultsForGame(gameToEnd);
        let gameResults = gameToEnd.results || [];
        let finalWinnings = gameToEnd.winnings || { first: 0, second: 0, third: 0 };
        
        if (resultsCalculation) {
          gameResults = resultsCalculation.results;
          finalWinnings = resultsCalculation.finalWinnings;
          console.log(`[endGame Transaction - ${gameId}] Calculated results:`, gameResults);
        } else {
          console.warn(`[endGame Transaction - ${gameId}] Could not calculate results for game`);
        }

        const updatedGameData = cleanGameForFirestore({
            ...gameToEnd,
            status: 'ended',
            endedAt: now,
            results: gameResults, // Store calculated results
            winnings: finalWinnings, // Store updated winnings
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

  updateBlinds: async (tournamentId: string, gameId: string, newBlinds: Blinds, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);

      await runTransaction(db, async (transaction) => {
        const tournamentDoc = await transaction.get(tournamentRef);
        if (!tournamentDoc.exists()) {
          throw new Error("Tournament not found");
        }
        const tournamentData = tournamentDoc.data();
        if (!tournamentData || !tournamentData.games) {
          throw new Error("Tournament data or games array is missing");
        }

        const gameIndex = tournamentData.games.findIndex((g: Game) => g.id === gameId);
        if (gameIndex === -1) {
          throw new Error("Game not found");
        }

        const game = tournamentData.games[gameIndex];

        if (game.status !== 'in_progress') {
          throw new Error("Blinds can only be changed while the game is in progress.");
        }

        const isPlayerInGame = game.players.some((p: Player) => p.id === userId);
        if (!isPlayerInGame) {
          throw new Error("Only players in the game can update the blinds.");
        }

        // Create a new array for the blind structure to avoid direct mutation
        const updatedBlindStructure = [...game.blindStructure];
        const nextLevel = game.currentLevel + 1;

        // Ensure the array is long enough to hold the next level's blinds
        while (updatedBlindStructure.length <= nextLevel) {
          const lastBlinds = updatedBlindStructure[updatedBlindStructure.length - 1] || { small: 5, big: 10 }; // Fallback
          updatedBlindStructure.push({
            small: lastBlinds.small * 2,
            big: lastBlinds.big * 2,
          });
        }
        
        // Update the blinds for the *next* level
        updatedBlindStructure[nextLevel] = newBlinds;

        const updatedGame = { ...game, blindStructure: updatedBlindStructure };
        
        const updatedGames = [...tournamentData.games];
        updatedGames[gameIndex] = updatedGame;

        transaction.update(tournamentRef, { games: updatedGames });

        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId ? { ...t, games: updatedGames } : t
          ),
        }));
      });
    } catch (error) {
      handleDatabaseError(error);
      throw error;
    }
  },
});
