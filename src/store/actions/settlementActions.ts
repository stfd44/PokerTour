import { StateCreator } from 'zustand';
import { db, handleDatabaseError } from '../../lib/firebase';
import { doc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { DetailedSettlement, Game, PlayerSettlementSummary, Tournament, Transaction, TournamentStore, TournamentStoreActions } from '../types/tournamentTypes';
import { calculateResultsForGame, cleanGameForFirestore } from '../helpers/tournamentHelpers';
import { calculateSettlementTransactions } from '../../lib/utils';

// Define the slice for settlement actions
export type SettlementActionSlice = Pick<TournamentStoreActions,
  'calculateAndStoreSettlement' |
  'updateSettlementTransaction'
>;

export const createSettlementActionSlice: StateCreator<
  TournamentStore,
  [],
  [],
  SettlementActionSlice
> = (set) => ({
  // --- Settlement Actions ---
  calculateAndStoreSettlement: async (tournamentId) => {
    const tournamentRef = doc(db, "tournaments", tournamentId);
    try {
        // Use a transaction for the entire read-modify-write process
        await runTransaction(db, async (transaction) => {
            const tournamentDoc = await transaction.get(tournamentRef);
            if (!tournamentDoc.exists()) {
              throw new Error("Tournament not found");
            }
            const tournament = { id: tournamentDoc.id, ...tournamentDoc.data() } as Tournament;

            if (tournament.status !== 'ended') {
              throw new Error("Tournament is not ended yet.");
            }

            console.log(`[calculateAndStoreSettlement Transaction - ${tournamentId}] Starting calculation...`);

            let needsUpdate = false; // Flag to track if games array needs updating
            const gamesWithResults = [...tournament.games]; // Create a mutable copy

            // --- Calculate Missing Results ---
            console.log(`Processing ${gamesWithResults.length} games for missing results...`);
            for (let i = 0; i < gamesWithResults.length; i++) {
                const game = gamesWithResults[i];
                if (game.status === 'ended' && (!game.results || game.results.length === 0)) {
                    console.log(`   >> Game ${i + 1} (ID: ${game.id}) is ended but missing results. Calculating...`);
                    const calculation = calculateResultsForGame(game); // Use helper function
                    if (calculation) {
                        gamesWithResults[i] = {
                            ...game,
                            results: calculation.results,
                            winnings: calculation.finalWinnings, // Store adjusted winnings too
                        };
                        needsUpdate = true;
                        console.log(`   >> Calculated results for Game ${i + 1} (ID: ${game.id})`);
                    } else {
                         console.warn(`   >> Failed to calculate results for Game ${i + 1} (ID: ${game.id})`);
                    }
                }
            }
            // --- End Calculate Missing Results ---


            // 1. Calculate Balances (ENHANCED: Support for both pot-based and traditional games)
            console.log(`Calculating balances for tournament ${tournamentId}. Buy-in per game: ${tournament.buyin}`);
            const playerBalancesMap: Map<string, { name: string; balance: number }> = new Map();
            let totalPotAmount = 0; // Track total pot amount across all games
            const potContributors: string[] = []; // Track who contributed to pots

            // Initialize balances to 0 for all registered players first
            tournament.registrations.forEach(player => {
                playerBalancesMap.set(player.id, { name: player.nickname || player.name, balance: 0 });
            });

            console.log(`Processing ${gamesWithResults.length} games for contributions/buy-ins and winnings...`);
            gamesWithResults.forEach((game, gameIndex) => { // Iterate over the potentially updated array
                console.log(` > Processing Game ${gameIndex + 1} (ID: ${game.id})`);
                
                // ENHANCED: Check if this game uses pot system or traditional system
                const usesPotSystem = game.potContributions && game.potContributions.length > 0;
                console.log(`   Game uses ${usesPotSystem ? 'POT' : 'TRADITIONAL'} system`);

                if (usesPotSystem) {
                    // NEW: Pot-based system - Different logic for contributors vs non-contributors
                    const gamePotAmount = game.totalPotAmount || 0;
                    totalPotAmount += gamePotAmount;
                    console.log(`   Pot amount for this game: ${gamePotAmount}€`);

                    const potContributorIds = game.potContributions ?
                        game.potContributions.filter(c => c.amount > 0).map(c => c.playerId) : [];

                    // Subtract costs based on pot contribution status
                    game.players.forEach(playerInGame => {
                        const currentPlayerData = playerBalancesMap.get(playerInGame.id);
                        const playerName = playerInGame.nickname || playerInGame.name;
                        const hasPaidToPot = potContributorIds.includes(playerInGame.id);

                        if (currentPlayerData) {
                            if (hasPaidToPot) {
                                // Contributor: only subtract rebuys (buy-in already paid to pot)
                                const rebuyCost = (playerInGame.rebuysMade || 0) * (game.rebuyAmount || tournament.buyin);
                                currentPlayerData.balance -= rebuyCost;
                                console.log(`   - ${playerName} paid to pot, only subtracting rebuys: ${rebuyCost}€. New balance: ${currentPlayerData.balance}`);
                            } else {
                                // Non-contributor: subtract full buy-in + rebuys
                                const rebuyCost = (playerInGame.rebuysMade || 0) * (game.rebuyAmount || tournament.buyin);
                                const totalCostForGame = tournament.buyin + rebuyCost;
                                currentPlayerData.balance -= totalCostForGame;
                                console.log(`   - ${playerName} didn't pay to pot, subtracting full cost: ${totalCostForGame}€. New balance: ${currentPlayerData.balance}`);
                            }
                        } else {
                            // Initialize player
                            const rebuyCost = (playerInGame.rebuysMade || 0) * (game.rebuyAmount || tournament.buyin);
                            const initialBalance = hasPaidToPot ? -rebuyCost : -(tournament.buyin + rebuyCost);
                            playerBalancesMap.set(playerInGame.id, { name: playerName, balance: initialBalance });
                        }
                    });

                    // Track pot contributors for this game
                    potContributorIds.forEach(contributorId => {
                        if (!potContributors.includes(contributorId)) {
                            potContributors.push(contributorId);
                            const contributor = game.potContributions?.find(c => c.playerId === contributorId);
                            console.log(`   - ${contributor?.playerName} added to pot contributors list`);
                        }
                    });
                } else {
                    // EXISTING: Traditional system - subtract buy-in for each player *in this game*
                    game.players.forEach(playerInGame => {
                        const currentPlayerData = playerBalancesMap.get(playerInGame.id);
                        if (currentPlayerData) {
                            const rebuyCost = (playerInGame.rebuysMade || 0) * (game.rebuyAmount || tournament.buyin); // Calculate cost of rebuys for this player in this game
                            const totalCostForGame = tournament.buyin + rebuyCost; // Total cost = buyin + rebuys

                            console.log(`   - Subtracting total cost ${totalCostForGame}€ (Buy-in: ${tournament.buyin}€, Rebuys: ${rebuyCost}€ [${playerInGame.rebuysMade || 0} x ${game.rebuyAmount || tournament.buyin}€]) for ${currentPlayerData.name} (ID: ${playerInGame.id}) for game ${game.id}. Old balance: ${currentPlayerData.balance}`);
                            currentPlayerData.balance -= totalCostForGame;
                            console.log(`   - New balance for ${currentPlayerData.name}: ${currentPlayerData.balance}`);

                        } else {
                            // If player played but wasn't registered (e.g., guest removed later?), initialize with negative buy-in + rebuys
                            const rebuyCost = (playerInGame.rebuysMade || 0) * (game.rebuyAmount || tournament.buyin);
                            const initialBalance = -(tournament.buyin + rebuyCost);
                            console.warn(`   - Player ${playerInGame.name} (ID: ${playerInGame.id}) played game ${game.id} but not found in final registrations. Initializing balance with buy-in + rebuys: ${initialBalance}€.`);
                            playerBalancesMap.set(playerInGame.id, { name: playerInGame.name, balance: initialBalance });
                        }
                    });
                }

                // Add winnings if game is ended and has results (same for both systems)
                if (game.results && game.results.length > 0 && game.status === 'ended') {
                    // CORRECTED LOGIC: Use game.winnings as the source of truth for the main pot.
                    const mainPotWinnings = game.winnings || { first: 0, second: 0, third: 0 };
                    const totalRebuyPot = game.players.reduce((sum, p) => sum + (p.rebuysMade || 0) * (game.rebuyAmount || tournament.buyin), 0);
                    
                    console.log(`   >> Adding winnings for ended game ${gameIndex + 1} (ID: ${game.id})`);
                    console.log(`   >> Main pot distribution: 1st=${mainPotWinnings.first}, 2nd=${mainPotWinnings.second}, 3rd=${mainPotWinnings.third}`);
                    console.log(`   >> Rebuy pot to winner: ${totalRebuyPot}`);

                    game.results.forEach(result => {
                        const currentPlayerData = playerBalancesMap.get(result.playerId);
                        if (currentPlayerData) {
                            let winningsForPlayer = 0;
                            
                            // Main pot winnings based on rank (pour les logs de debug)
                            if (result.rank === 1) {
                                winningsForPlayer = mainPotWinnings.first;
                            } else if (result.rank === 2) {
                                winningsForPlayer = mainPotWinnings.second;
                            } else if (result.rank === 3) {
                                winningsForPlayer = mainPotWinnings.third;
                            }

                            // LOGS DE DÉBOGAGE CRITIQUES
                            console.log(`[BALANCE DEBUG] Game ${gameIndex + 1} - Player ${currentPlayerData.name}:`);
                            console.log(`    - Rank: ${result.rank}`);
                            console.log(`    - Main pot winnings: ${winningsForPlayer.toFixed(2)}€`);
                            console.log(`    - Total winnings (includes rebuy distribution): ${result.winnings.toFixed(2)}€`);
                            console.log(`    - Rebuy gains distributed: ${(result.winnings - winningsForPlayer).toFixed(2)}€`);
                            console.log(`    - Current balance before adding: ${currentPlayerData.balance.toFixed(2)}€`);

                            // ✅ CORRECTION APPLIQUÉE : Utiliser result.winnings qui inclut la distribution cyclique des rebuy
                            // Les rebuy sont calculés dans calculateResultsForGame() selon la règle de distribution
                            if (result.winnings > 0) {
                                console.log(`     - [FIXED] Adding total winnings ${result.winnings.toFixed(2)}€ to ${currentPlayerData.name} (ID: ${result.playerId}). Old balance: ${currentPlayerData.balance}`);
                                currentPlayerData.balance += result.winnings;
                                console.log(`     - [FIXED] New balance for ${currentPlayerData.name}: ${currentPlayerData.balance}`);
                            }
                        }
                    });

                } else {
                     console.log(`   >> Skipping winnings for game ${gameIndex + 1} (ID: ${game.id}). Status: ${game.status}, Results Length: ${game.results?.length ?? 0}`);
                }
            });

            console.log(`Total pot amount across all games: ${totalPotAmount}€`);
            console.log(`Pot contributors:`, potContributors);

            console.log("Final calculated balances before settlement:");
            playerBalancesMap.forEach((data, id) => {
                console.log(`  - ${data.name} (ID: ${id}): ${data.balance.toFixed(2)}`);
            });

            const balancesArray = Array.from(playerBalancesMap.entries()).map(([id, data]) => ({
                id, name: data.name, balance: data.balance,
            }));

            // 2. Calculate Optimized Transactions (ENHANCED: Support for pot-based system)
            console.log("Calculating settlement transactions...");
            
            // Determine if any games used the pot system
            const hasAnyPotGames = gamesWithResults.some(game =>
                game.potContributions && game.potContributions.length > 0
            );
            
            let transactions: Transaction[] = [];
            if (hasAnyPotGames) {
                console.log(`[Settlement DEBUG] Starting pot distribution. Total pot: ${totalPotAmount}€`);
                console.log(`[Settlement DEBUG] Player balances:`, balancesArray.map(b => `${b.name}: ${b.balance.toFixed(2)}€`));
                
                // Working copy for optimization
                const workingBalances = balancesArray.map(b => ({ ...b }));
                let remainingPot = totalPotAmount;
                
                // Phase 1: Distribute ENTIRE pot to positive balances
                const allCreditors = workingBalances.filter(p => p.balance > 0.01);
                const totalCreditNeeded = allCreditors.reduce((sum, c) => sum + c.balance, 0);
                console.log(`[Settlement DEBUG] Total positive balances: ${totalCreditNeeded.toFixed(2)}€, Available pot: ${remainingPot.toFixed(2)}€`);
                
                // Distribute pot to cover positive balances completely
                for (const creditor of allCreditors) {
                    if (remainingPot <= 0.01) break;
                    
                    // Give creditor exactly their positive balance (or remaining pot if insufficient)
                    const potShare = Math.min(creditor.balance, remainingPot);
                    
                    if (potShare > 0.01) {
                        transactions.push({
                            fromPlayerId: "POT",
                            fromPlayerName: "POT",
                            toPlayerId: creditor.id,
                            toPlayerName: creditor.name,
                            amount: Math.round(potShare * 100) / 100,
                            completed: false,
                            type: 'pot_withdrawal'
                        });
                        
                        creditor.balance -= potShare;
                        remainingPot -= potShare;
                        console.log(`[Settlement DEBUG] ${creditor.name} receives ${potShare.toFixed(2)}€ from pot. New balance: ${creditor.balance.toFixed(2)}€. Remaining pot: ${remainingPot.toFixed(2)}€`);
                    }
                }
                
                console.log(`[Settlement DEBUG] Pot distribution complete. Distributed: ${(totalPotAmount - remainingPot).toFixed(2)}€, Remaining: ${remainingPot.toFixed(2)}€`);
                console.log(`[Settlement DEBUG] Final balances:`, workingBalances.map(b => `${b.name}: ${b.balance.toFixed(2)}€`));
                
                // Phase 2: Handle remaining debts between players
                const playerDebtTransactions = calculateSettlementTransactions(workingBalances);
                transactions.push(...playerDebtTransactions.map(tx => ({ ...tx, type: 'player_debt' as const })));
                
            } else {
                console.log("Using TRADITIONAL settlement algorithm");
                console.log("Input balances for traditional algorithm:", balancesArray.map(b => `${b.name}: ${b.balance.toFixed(2)}€`));
                transactions = calculateSettlementTransactions(balancesArray);
                transactions = transactions.map(tx => ({ ...tx, type: 'player_debt' as const }));
                console.log("Generated traditional transactions:", transactions.length);
            }
            
            console.log("Calculated transactions:", transactions);

            // NOUVEAU BLOC : Génération du règlement détaillé
            console.log("Checking for and generating detailed settlement object...");
            let detailedSettlementData: DetailedSettlement | null = null;

            if (!tournament.detailedSettlement) {
                console.log("No existing detailed settlement found. Generating new one.");
                const playerSummariesMap: Map<string, PlayerSettlementSummary> = new Map();

                tournament.registrations.forEach(player => {
                    playerSummariesMap.set(player.id, {
                        playerId: player.id,
                        playerName: player.nickname || player.name || 'Unknown Player',
                        totalBuyIn: 0,
                        totalWinnings: 0,
                        netResult: 0,
                        gamesSummary: [],
                        ledger: [], // Assurez-vous que ledger est initialisé
                    });
                });

                gamesWithResults.forEach((game, gameIndex) => {
                    const gameNumber = gameIndex + 1;
                    
                    // CORRECTION: Vérifier si cette partie utilise le système de pot
                    const usesPotSystem = game.potContributions && game.potContributions.length > 0;
                    const potContributorIds = usesPotSystem && game.potContributions ?
                        game.potContributions.filter(c => c.amount > 0).map(c => c.playerId) : [];

                    // Pour chaque joueur de la partie, ajoute les transactions au ledger
                    game.players.forEach(playerInGame => {
                        const summary = playerSummariesMap.get(playerInGame.id);
                        if (!summary) return;

                        // CORRECTION: Ajouter le coût du Buy-in seulement si le joueur n'a pas contribué au pot
                        const hasPaidToPot = usesPotSystem && potContributorIds.includes(playerInGame.id);
                        
                        if (!hasPaidToPot) {
                            // Non-contributeur : ajouter le buy-in
                            summary.ledger.push({
                                gameId: game.id,
                                type: 'buy_in_cost',
                                amount: -tournament.buyin,
                                description: `Buy-in (Partie ${gameNumber})`,
                            });
                        } else {
                            // Contributeur : le buy-in a déjà été payé au pot, pas besoin de l'ajouter
                            console.log(`[DetailedSettlement] ${playerInGame.nickname || playerInGame.name} a contribué au pot, buy-in non ajouté au ledger pour la partie ${gameNumber}`);
                        }

                        // Ajoute les coûts des Rebuys
                        for (let i = 0; i < (playerInGame.rebuysMade || 0); i++) {
                            summary.ledger.push({
                                gameId: game.id,
                                type: 'rebuy_cost',
                                amount: -(game.rebuyAmount || tournament.buyin),
                                description: `Rebuy ${i + 1} (Partie ${gameNumber})`,
                            });
                        }

                        // Récupère les gains du pot principal depuis game.results
                        const result = game.results?.find(r => r.playerId === playerInGame.id);
                        const mainPotWinnings = result?.winnings || 0;

                        if (mainPotWinnings > 0) {
                            // LOGIQUE CORRIGÉE : Utiliser les montants réels au lieu de la répartition proportionnelle
                            
                            // 1. Gains sur le pot de base = winnings prévus pour le 1er (game.winnings.first ou équivalent)
                            // Récupérer les winnings du pot de base depuis la configuration du jeu
                            const gameWinnings = game.winnings || { first: 0, second: 0, third: 0 };
                            let baseWinnings = 0;
                            
                            // Déterminer les gains du pot de base selon le rang
                            if (result?.rank === 1) {
                                baseWinnings = gameWinnings.first;
                            } else if (result?.rank === 2) {
                                baseWinnings = gameWinnings.second;
                            } else if (result?.rank === 3) {
                                baseWinnings = gameWinnings.third;
                            }
                            
                            // Ajouter les gains du pot de base (montant réel, pas proportionnel)
                            if (baseWinnings > 0) {
                                summary.ledger.push({
                                    gameId: game.id,
                                    type: 'winnings',
                                    amount: baseWinnings,
                                    description: `Gains sur le pot de base (Partie ${gameNumber})`,
                                });
                            }

                            // CORRECTION : Les gains de rebuy sont déjà inclus dans result.winnings par calculateResultsForGame
                            // On calcule la différence entre les gains totaux et les gains du pot de base
                            if (result && mainPotWinnings > 0) {
                                const rebuyGainsForPlayer = result.winnings - baseWinnings;
                                
                                if (rebuyGainsForPlayer > 0) {
                                    console.log(`[DETAILED] Game ${gameNumber} - Player ${playerInGame.nickname || playerInGame.name} has rebuy gains: ${rebuyGainsForPlayer}€`);
                                    summary.ledger.push({
                                        gameId: game.id,
                                        type: 'winnings',
                                        amount: rebuyGainsForPlayer,
                                        description: `Gains sur rebuy (Partie ${gameNumber})`,
                                    });
                                }
                            }
                        }
                    });

                });


                playerSummariesMap.forEach(summary => {
                    // Les totaux et le résultat net sont maintenant dérivés du ledger
                    summary.totalBuyIn = summary.ledger
                        .filter(t => t.type === 'buy_in_cost' || t.type === 'rebuy_cost')
                        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

                    summary.totalWinnings = summary.ledger
                        .filter(t => t.type === 'winnings')
                        .reduce((sum, t) => sum + t.amount, 0);
                    
                    summary.netResult = summary.totalWinnings - summary.totalBuyIn;
                });

                detailedSettlementData = {
                    playerSummaries: Array.from(playerSummariesMap.values())
                };
                console.log("Generated detailed settlement:", detailedSettlementData);
            } else {
                console.log("Existing detailed settlement found. Skipping generation.");
            }


            // 3. Update Firestore within the transaction
            const updateData: {
              status: 'ended';
              settlementTransactions: Transaction[];
              games?: Game[];
              detailedSettlement?: DetailedSettlement;
            } = {
              status: 'ended',
              settlementTransactions: transactions,
            };

            if (detailedSettlementData) {
              updateData.detailedSettlement = detailedSettlementData;
            }
            if (needsUpdate) {
              // Only include games if results were calculated
              updateData.games = gamesWithResults.map(g => cleanGameForFirestore(g));
            }

            console.log(`[calculateAndStoreSettlement Transaction - ${tournamentId}] Scheduling update with data:`, updateData);
            transaction.update(tournamentRef, updateData);

            // 4. Update Local State (after scheduling transaction)
            set(state => ({
              tournaments: state.tournaments.map(t =>
                t.id === tournamentId
                  ? {
                      ...t,
                      status: 'ended',
                      settlementTransactions: transactions,
                      ...(needsUpdate && { games: gamesWithResults }),
                      ...(detailedSettlementData && { detailedSettlement: detailedSettlementData }),
                    }
                  : t
              ),
            }));
        }); // End of runTransaction

        console.log(`[calculateAndStoreSettlement - ${tournamentId}] Transaction committed successfully.`);

    } catch (error) {
      console.error(`[calculateAndStoreSettlement - ${tournamentId}] Transaction failed:`, error);
      handleDatabaseError(error);
      throw error;
    }
  },

  updateSettlementTransaction: async (tournamentId, transactionIndex, completed) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      if (!tournamentDoc.exists()) {
        throw new Error("Tournament not found");
      }
      const tournament = { id: tournamentDoc.id, ...tournamentDoc.data() } as Tournament;

      if (!tournament.settlementTransactions || transactionIndex < 0 || transactionIndex >= tournament.settlementTransactions.length) {
        throw new Error("Invalid transaction index or settlement not calculated yet.");
      }

      // Create a new array with the updated transaction
      const updatedTransactions = tournament.settlementTransactions.map((tx, index) =>
        index === transactionIndex ? { ...tx, completed: completed } : tx
      );

      // Update Firestore
      await updateDoc(tournamentRef, {
        settlementTransactions: updatedTransactions,
      });

      // Update Local State
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, settlementTransactions: updatedTransactions }
            : t
        ),
      }));

    } catch (error) {
      handleDatabaseError(error);
      throw error; // Re-throw for UI handling
    }
  },
});
