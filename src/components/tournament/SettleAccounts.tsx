import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTournamentStore } from '../../store/tournamentStore';
import type { PlayerSettlementSummary } from '../../store/types/tournamentTypes';
import { ArrowLeft, Check, Loader2, ChevronDown } from 'lucide-react';

// Sub-component for displaying individual player settlement details
const PlayerSettlementDetails: React.FC<{ summary: PlayerSettlementSummary }> = ({ summary }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { playerName, netResult, totalBuyIn, totalWinnings } = summary;

  const isNetPositive = netResult >= 0;

  return (
    <div className={`border rounded-lg overflow-hidden ${isNetPositive ? 'border-green-200' : 'border-red-200'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 text-left focus:outline-none"
      >
        <span className="font-medium">{playerName}</span>
        <div className="flex items-center">
          <span className={`font-bold ${isNetPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isNetPositive ? '+' : ''}{netResult.toFixed(2)} €
          </span>
          <ChevronDown className={`w-5 h-5 ml-2 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="p-3 border-t bg-gray-50">
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div>
              <p className="font-semibold">Total Buy-ins:</p>
              <p>{totalBuyIn.toFixed(2)} €</p>
            </div>
            <div>
              <p className="font-semibold">Total Gains:</p>
              <p className="text-green-600">{totalWinnings.toFixed(2)} €</p>
            </div>
          </div>
          <h4 className="font-semibold text-sm mb-2">Grand livre des transactions :</h4>
          <ul className="space-y-1 text-xs">
            {summary.ledger.map((entry, index) => (
              <li key={index} className="flex justify-between items-center">
                <span>{entry.description}</span>
                <span className={entry.amount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {entry.amount >= 0 ? '+' : ''}{entry.amount.toFixed(2)} €
                </span>
              </li>
            ))}
          </ul>

        </div>
      )}
    </div>
  );
};


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

  const handleRecalculateSettlement = async () => {
    if (!tournamentId) return;
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Forçage du recalcul pour le tournoi: ${tournamentId}`);
      await calculateAndStoreSettlement(tournamentId);
      console.log(`Recalcul terminé pour le tournoi: ${tournamentId}`);
    } catch (err) {
      console.error("Erreur lors du recalcul:", err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue lors du recalcul.");
    } finally {
      setIsLoading(false);
    }
  };

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

      <h2 className="text-2xl font-bold text-poker-black mb-4">Bilan du tournoi : {tournament?.name}</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      {/* Section Bilans Joueurs */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-poker-dark-gray mb-3">Bilans des Joueurs</h3>
        <div className="space-y-2">
          {tournament?.detailedSettlement?.playerSummaries ? (
            [...tournament.detailedSettlement.playerSummaries]
              .sort((a, b) => b.netResult - a.netResult)
              .map(summary => (
                <PlayerSettlementDetails key={summary.playerId} summary={summary} />
              ))
          ) : (
            <div className="flex items-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Chargement du règlement détaillé...</span>
            </div>
          )}
        </div>
      </div>

      {/* Section Transactions */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-semibold text-poker-dark-gray">Transactions à effectuer</h3>
          {tournament?.status === 'ended' && (
            <button
              onClick={handleRecalculateSettlement}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Recalcul...
                </>
              ) : (
                'Recalculer'
              )}
            </button>
          )}
        </div>
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
                    {tx.type === 'pot_withdrawal' ? (
                      // Pot withdrawal transaction
                      <>
                        <span className="font-semibold text-green-600">{tx.toPlayerName}</span> reçoit
                        <span className="font-bold mx-1">{tx.amount.toFixed(2)} €</span>
                        <span className="font-semibold text-blue-600">du pot</span>
                      </>
                    ) : (
                      // Traditional player debt transaction
                      <>
                        <span className="font-semibold text-red-600">{tx.fromPlayerName}</span> doit
                        <span className="font-bold mx-1">{tx.amount.toFixed(2)} €</span> à
                        <span className="font-semibold text-green-600"> {tx.toPlayerName}</span>
                      </>
                    )}
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
