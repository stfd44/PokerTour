import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTournamentStore, PlayerResult } from '../../store/tournamentStore'; // Removed unused Tournament, Transaction imports
import { ArrowLeft, Check, Loader2 } from 'lucide-react';

// Define PlayerBalance locally as it's specific to this component's calculation logic
interface PlayerBalance {
  id: string;
  name: string;
  balance: number;
}

function SettleAccounts() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const {
    tournaments,
    calculateAndStoreSettlement,
    updateSettlementTransaction,
    fetchTournaments, // Fetch tournaments if not already loaded
  } = useTournamentStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find the current tournament from the store
  const tournament = useMemo(() =>
    tournaments.find(t => t.id === tournamentId),
    [tournaments, tournamentId]
  );

  // Fetch tournaments on initial load if needed (e.g., direct navigation)
  useEffect(() => {
    if (tournaments.length === 0) {
      // Assuming fetchTournaments doesn't need userId here, or get it from auth store if needed
      // For simplicity, calling without userId, adjust if your fetch requires it
      console.log("Fetching tournaments as store was empty...");
      fetchTournaments(''); // Adjust if userId is needed
    }
  }, [fetchTournaments, tournaments.length]);


  // Calculate settlement when the component mounts or tournament data changes, if needed
  useEffect(() => {
    if (tournament && tournament.status === 'ended' && !tournament.settlementTransactions) {
      const performSettlement = async () => {
        setIsLoading(true);
        setError(null);
        try {
          console.log(`Calculating settlement for tournament: ${tournamentId}`);
          await calculateAndStoreSettlement(tournamentId!);
          console.log(`Settlement calculated and stored for tournament: ${tournamentId}`);
        } catch (err) {
          console.error("Error calculating settlement:", err);
          setError(err instanceof Error ? err.message : "An unknown error occurred during settlement calculation.");
        } finally {
          setIsLoading(false);
        }
      };
      performSettlement();
    } else if (tournament && tournament.status !== 'ended') {
        setError("Ce tournoi n'est pas encore terminé.");
    } else if (tournament && tournament.settlementTransactions) {
        console.log("Settlement transactions already exist for this tournament.");
    }
  }, [tournament, tournamentId, calculateAndStoreSettlement]);

  // Calculate player balances for display (derived from game results and buyin)
  const playerBalances = useMemo((): PlayerBalance[] => {
    if (!tournament) return [];

    const balances: Map<string, { name: string; balance: number }> = new Map();

    // Initialize balances to 0 for all registered players
    tournament.registrations.forEach(player => {
        balances.set(player.id, { name: player.nickname || player.name, balance: 0 });
    });

    // Iterate through games to subtract buy-ins and add winnings
    tournament.games.forEach(game => {
        // Subtract buy-in for each player who participated in this game
        game.players.forEach(playerInGame => {
            const current = balances.get(playerInGame.id);
            if (current) {
                // Subtract buy-in AND cost of rebuys made by this player in this game
                const rebuyCost = (playerInGame.rebuysMade || 0) * (game.rebuyAmount || tournament.buyin);
                const totalCostForGame = tournament.buyin + rebuyCost;
                current.balance -= totalCostForGame;
            } else {
                 // Player might have been unregistered after playing? Initialize with negative buy-in + rebuys.
                 const rebuyCost = (playerInGame.rebuysMade || 0) * (game.rebuyAmount || tournament.buyin);
                 const initialBalance = -(tournament.buyin + rebuyCost);
                 balances.set(playerInGame.id, { name: playerInGame.name, balance: initialBalance });
            }
        });

        // Add winnings if game is ended and has results
        if (game.results) {
            game.results.forEach((result: PlayerResult) => {
                const current = balances.get(result.playerId);
                if (current) {
                    current.balance += result.winnings;
                }
                // If player not in map here, it means they weren't registered but had results?
                // This case is less likely if registrations are managed properly.
                // We avoid adding them here if their buy-in wasn't subtracted.
            });
        }
    });

    return Array.from(balances.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      balance: Math.round(data.balance * 100) / 100, // Round to 2 decimal places for display
    })).sort((a, b) => b.balance - a.balance); // Sort by balance descending

  }, [tournament]);


  const handleCheckboxChange = async (transactionIndex: number, currentCompletedStatus: boolean) => {
    if (!tournamentId) return;
    // Optimistic UI update can be added here if desired
    try {
      await updateSettlementTransaction(tournamentId, transactionIndex, !currentCompletedStatus);
    } catch (err) {
      console.error("Error updating transaction status:", err);
      // Revert optimistic update if it was implemented
      alert("Erreur lors de la mise à jour de la transaction.");
    }
  };

  if (!tournament && tournaments.length > 0) {
    return <div className="text-center text-red-500">Tournoi non trouvé.</div>;
  }

  // Show loading state while fetching initial tournament data if store was empty
  if (tournaments.length === 0 && !tournament) {
      return (
          <div className="flex justify-center items-center min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-poker-gold" />
              <span className="ml-2">Chargement des données du tournoi...</span>
          </div>
      );
  }


  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Link to="/tournaments" className="inline-flex items-center text-poker-blue hover:underline mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Retour à la liste des tournois
      </Link>

      <h2 className="text-2xl font-bold text-poker-black mb-4">Règlement des comptes : {tournament?.name}</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      {/* Section Bilans Joueurs */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-poker-dark-gray mb-3">Bilans des Joueurs</h3>
        <div className="space-y-2">
          {playerBalances.length > 0 ? playerBalances.map(player => (
            <div key={player.id} className={`flex justify-between items-center p-3 rounded ${player.balance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <span className="font-medium">{player.name}</span>
              <span className={`font-bold ${player.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {player.balance >= 0 ? '+' : ''}{player.balance.toFixed(2)} €
              </span>
            </div>
          )) : (
             <p className="text-gray-500">Calcul des bilans en cours ou données indisponibles...</p>
          )}
        </div>
      </div>

      {/* Section Transactions */}
      <div>
        <h3 className="text-xl font-semibold text-poker-dark-gray mb-3">Transactions à effectuer</h3>
        {isLoading && (
          <div className="flex justify-center items-center min-h-[100px]">
            <Loader2 className="h-6 w-6 animate-spin text-poker-gold" />
            <span className="ml-2">Calcul des transactions optimisées...</span>
          </div>
        )}
        {!isLoading && tournament?.settlementTransactions && tournament.settlementTransactions.length > 0 && (
          <ul className="space-y-3">
            {tournament.settlementTransactions.map((tx, index) => (
              <li key={index} className={`flex items-center justify-between p-3 rounded border ${tx.completed ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}>
                <div className="flex items-center">
                   <input
                    type="checkbox"
                    checked={tx.completed}
                    onChange={() => handleCheckboxChange(index, tx.completed)}
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3 cursor-pointer"
                    aria-labelledby={`transaction-label-${index}`}
                  />
                  <span id={`transaction-label-${index}`}>
                    <span className="font-semibold text-red-600">{tx.fromPlayerName}</span> doit
                    <span className="font-bold mx-1">{tx.amount.toFixed(2)} €</span> à
                    <span className="font-semibold text-green-600"> {tx.toPlayerName}</span>
                  </span>
                </div>
                 {tx.completed && <Check className="w-5 h-5 text-green-600" />}
              </li>
            ))}
          </ul>
        )}
         {!isLoading && tournament?.settlementTransactions?.length === 0 && (
             <p className="text-gray-500 italic">Aucune transaction nécessaire, les comptes sont équilibrés.</p>
         )}
         {!isLoading && !tournament?.settlementTransactions && !error && tournament?.status === 'ended' && (
             <p className="text-gray-500">En attente du calcul des transactions...</p>
         )}
      </div>
    </div>
  );
}

export default SettleAccounts;
