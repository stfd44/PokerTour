import { StateCreator } from 'zustand';
import { db, handleDatabaseError } from '../../lib/firebase';
import { doc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { Game, Tournament, Transaction, TournamentStore, TournamentStoreActions } from '../types/tournamentTypes';
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
                    console.log(`   >> Adding winnings for ended game ${gameIndex + 1} (ID: ${game.id})`);
                    game.results.forEach(result => {
                        const currentPlayerData = playerBalancesMap.get(result.playerId);
                        if (currentPlayerData) {
                             console.log(`     - Adding winnings ${result.winnings} to ${currentPlayerData.name} (ID: ${result.playerId}). Old balance: ${currentPlayerData.balance}`);
                            currentPlayerData.balance += result.winnings;
                             console.log(`     - New balance for ${currentPlayerData.name}: ${currentPlayerData.balance}`);
                        } else {
                            // This case should be less likely now due to the loop above, but keep as a fallback
                            console.warn(`     - Player ${result.playerId} (${result.name}) in results but not map. Balance might be incorrect.`);
                            // Avoid setting balance here as buy-in wasn't subtracted if they weren't in game.players
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
            if (hasAnyPotGames && totalPotAmount > 0) {
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
                transactions = calculateSettlementTransactions(balancesArray);
                transactions = transactions.map(tx => ({ ...tx, type: 'player_debt' as const }));
            }
            
            console.log("Calculated transactions:", transactions);

            // 3. Update Firestore within the transaction
            const updateData: { settlementTransactions: Transaction[]; games?: Game[] } = {
                settlementTransactions: transactions
            };
            if (needsUpdate) {
                // Only include games if results were calculated
                updateData.games = gamesWithResults.map(g => cleanGameForFirestore(g));
                console.log(`[calculateAndStoreSettlement Transaction - ${tournamentId}] Scheduling update for games array (results added) and settlementTransactions.`);
            } else {
                 console.log(`[calculateAndStoreSettlement Transaction - ${tournamentId}] Scheduling update for settlementTransactions only.`);
            }
            transaction.update(tournamentRef, updateData);

            // 4. Update Local State (after scheduling transaction)
            set((state) => ({
                tournaments: state.tournaments.map((t) =>
                  t.id === tournamentId
                    ? { ...t, games: needsUpdate ? gamesWithResults : t.games, settlementTransactions: transactions } // Update games only if needed
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
