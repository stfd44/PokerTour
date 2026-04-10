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
    cleanedGame.rebuyLimitMode = cleanedGame.rebuyLimitMode ?? 'until_level';


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
    const activePlayers = players.filter(p => !p.eliminated);
    const eliminatedPlayers = players.filter(p => p.eliminated)
        .sort((a, b) => (b.eliminationTime ?? 0) - (a.eliminationTime ?? 0));

    const totalActive = activePlayers.length;
    
    // Assign results
    const results: PlayerResult[] = [];
    
    // 1. Handle Active Players (Equal Ranking)
    if (totalActive > 0) {
        // Calculate total winnings for the ranks occupied by active players (up to 3)
        let totalActiveWinnings = 0;
        if (game.winnings) {
            if (totalActive >= 1) totalActiveWinnings += game.winnings.first ?? 0;
            if (totalActive >= 2) totalActiveWinnings += game.winnings.second ?? 0;
            if (totalActive >= 3) totalActiveWinnings += game.winnings.third ?? 0;
        }
        
        const winningsPerActive = totalActiveWinnings / totalActive;
        
        // CORRECTION: Si la partie est arrêtée avec plusieurs joueurs, ils ont 0 points.
        // Un gagnant unique (totalActive === 1) garde ses 10 points.
        const pointsPerActive = totalActive > 1 ? 0 : 10;
        
        activePlayers.forEach(player => {
            results.push({
                playerId: player.id,
                name: player.nickname || player.name,
                rank: 1, // All share Rank 1
                points: pointsPerActive,
                winnings: winningsPerActive
            });
        });
    }
    
    // 2. Handle Eliminated Players
    eliminatedPlayers.forEach((player, index) => {
        const rank = totalActive + index + 1;
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
        
        results.push({
            playerId: player.id,
            name: player.nickname || player.name,
            rank,
            points,
            winnings
        });
    });

    const totalRebuyAmount = (game.totalRebuys || 0) * (game.rebuyAmount || 0);
    const finalWinnings = { ...(game.winnings ?? { first: 0, second: 0, third: 0 }) };
    
    // CORRECTION DU BUG: Respecter la règle de distribution des rebuy
    if (results.length > 0 && totalRebuyAmount > 0) {
        const rebuyDistributionRule = game.rebuyDistributionRule || 'winner_takes_all';
        console.log(`[calculateResultsForGame] Game ${game.id} - Applying rebuy rule: ${rebuyDistributionRule}, Total rebuy amount: ${totalRebuyAmount}€`);
        
        if (rebuyDistributionRule === 'winner_takes_all') {
            // Règle actuelle: tous les rebuy au vainqueur (ou partagés si ex-aequo)
            const winners = results.filter(r => r.rank === 1);
            if (winners.length > 0) {
                const rebuyPerWinner = totalRebuyAmount / winners.length;
                results.forEach(r => {
                    if (r.rank === 1) {
                        r.winnings += rebuyPerWinner;
                    }
                });
                console.log(`[calculateResultsForGame] Winner takes all rebuy: ${totalRebuyAmount}€ split among ${winners.length} winners (${rebuyPerWinner}€ each)`);
            }
        } else if (rebuyDistributionRule === 'cyclic_distribution') {
            // NOUVELLE RÈGLE: Distribution cyclique des rebuy
            const rebuyAmount = game.rebuyAmount || 0;
            const allRebuys: Array<{playerId: string, playerName: string}> = [];
            
            // Collecte tous les rebuy en ordre
            game.players.forEach(p => {
                for (let i = 0; i < (p.rebuysMade || 0); i++) {
                    allRebuys.push({
                        playerId: p.id,
                        playerName: p.nickname || p.name || 'Joueur inconnu'
                    });
                }
            });
            
            console.log(`[calculateResultsForGame] Cyclic distribution: ${allRebuys.length} rebuys to distribute`);
            
            // Distribution cyclique des rebuy
            allRebuys.forEach((rebuy, index) => {
                const targetRank = (index % 3) + 1; // 1, 2, 3, 1, 2, 3, ...
                const targetResultIndex = results.findIndex(r => r.rank === targetRank);
                
                if (targetResultIndex !== -1) {
                    results[targetResultIndex].winnings += rebuyAmount;
                    console.log(`[calculateResultsForGame] Rebuy ${index + 1} (${rebuyAmount}€) from ${rebuy.playerName} → Rank ${targetRank} (${results[targetResultIndex].name})`);
                }
            });
        }
    }
    return { results, finalWinnings };
};
