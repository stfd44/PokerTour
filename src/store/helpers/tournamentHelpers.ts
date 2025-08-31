import { Game, Player, PlayerResult, Tournament, TournamentStore } from '../types/tournamentTypes';

// Helper function to specifically clean a Game object for Firestore
// Removes undefined fields, ensuring compatibility.
export function cleanGameForFirestore(game: Game): Game {
    const cleanedGame: Game = { ...game }; // Clone the game object

    // Iterate over keys of the Game interface
    (Object.keys(cleanedGame) as Array<keyof Game>).forEach(key => {
        if (cleanedGame[key] === undefined) {
            // Firestore forbids undefined, so delete the key if the value is undefined
            delete cleanedGame[key];
        }
    });

    // Specifically clean the players array
    if (cleanedGame.players) {
        cleanedGame.players = cleanedGame.players.map(player => {
            const cleanedPlayer: Player = { ...player };
            (Object.keys(cleanedPlayer) as Array<keyof Player>).forEach(playerKey => {
                if (cleanedPlayer[playerKey] === undefined) {
                    delete cleanedPlayer[playerKey];
                }
            });
            // Ensure required fields that might become undefined are defaulted if necessary
            // (Though the interface marks them optional, Firestore might require consistency)
            cleanedPlayer.eliminated = cleanedPlayer.eliminated ?? false;
            cleanedPlayer.eliminationTime = cleanedPlayer.eliminationTime ?? null;
            cleanedPlayer.rebuysMade = cleanedPlayer.rebuysMade ?? 0;
            cleanedPlayer.nickname = cleanedPlayer.nickname ?? null;
            return cleanedPlayer;
        });
    } else {
        cleanedGame.players = []; // Ensure players array exists
    }

     // Clean nested objects only if they exist (no need to check internal required props)
    if (cleanedGame.distributionPercentages) {
        // No need to delete internal required properties like 'first', 'second', 'third'
        // The main loop handles deleting 'distributionPercentages' itself if it were undefined.
        cleanedGame.distributionPercentages = { ...cleanedGame.distributionPercentages }; // Ensure it's a clean copy if needed
    }
     if (cleanedGame.winnings) {
        // No need to delete internal required properties like 'first', 'second', 'third'
        cleanedGame.winnings = { ...cleanedGame.winnings }; // Ensure it's a clean copy if needed
    }

    // Ensure required fields that might become undefined are defaulted
    cleanedGame.currentLevel = cleanedGame.currentLevel ?? 0;
    cleanedGame.levelStartTime = cleanedGame.levelStartTime ?? 0;
    cleanedGame.isPaused = cleanedGame.isPaused ?? false;
    cleanedGame.remainingTimeOnPause = cleanedGame.remainingTimeOnPause ?? null;
    cleanedGame.status = cleanedGame.status ?? 'pending';


    return cleanedGame;
}


// Helper function to find and update a game within the state
// Note: This modifies the state structure based on the TournamentStore type
export const updateGameState = (state: TournamentStore, tournamentId: string, gameId: string, updates: Partial<Game>): Tournament[] => {
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

// Helper function to calculate results for a single game
// Moved from endGame to be used by calculateAndStoreSettlement
export const calculateResultsForGame = (game: Game): { results: PlayerResult[], finalWinnings: { first: number; second: number; third: number } } | null => {
    if (!game || !game.players || game.players.length === 0) {
        console.warn(`[calculateResultsForGame - ${game.id}] Cannot calculate results, missing player data.`);
        return null; // Cannot calculate without players
    }

    const players = game.players;
    const sortedPlayers = [...players].sort((a, b) => {
        if (!a.eliminated && b.eliminated) return -1;
        if (a.eliminated && !b.eliminated) return 1;
        if (!a.eliminated && !b.eliminated) return 0;
        return (b.eliminationTime ?? 0) - (a.eliminationTime ?? 0);
    });

    const results: PlayerResult[] = sortedPlayers.map((player, index) => {
        const rank = index + 1;
        let points = 0;
        let winnings = 0;
        switch (rank) {
          case 1: points = 10; break;
          case 2: points = 7; break;
          case 3: points = 5; break;
          case 4: points = 3; break;
          case 5: points = 2; break;
          default: points = 1; break;
        }
        if (game.winnings) {
          if (rank === 1) winnings = game.winnings.first ?? 0;
          else if (rank === 2) winnings = game.winnings.second ?? 0;
          else if (rank === 3) winnings = game.winnings.third ?? 0;
        }
        return { playerId: player.id, name: player.nickname || player.name, rank, points, winnings };
    });

    const totalRebuyAmount = (game.totalRebuys || 0) * (game.rebuyAmount || 0);
    const finalWinnings = { ...(game.winnings ?? { first: 0, second: 0, third: 0 }) };
    if (results.length > 0 && totalRebuyAmount > 0) {
        const winnerIndex = results.findIndex(r => r.rank === 1);
        if (winnerIndex !== -1) {
          results[winnerIndex].winnings += totalRebuyAmount;
          finalWinnings.first = (finalWinnings.first ?? 0) + totalRebuyAmount;
        }
    }
    return { results, finalWinnings };
};
