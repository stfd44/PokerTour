import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
// import { useTeamStore } from '../store/useTeamStore'; // Removed unused import
import { useTournamentStore, Game, PlayerResult } from '../store/tournamentStore'; // Import PlayerResult, Removed unused Tournament import

interface PlayerStats {
  id: string;
  name: string;
  totalPoints: number;
  totalWinnings: number;
  gamesPlayed: number; // Add games played count
}

// Define the structure for the memoized statistics object
interface CalculatedStats {
  tournamentsPlayedThisYear: number;
  gamesPlayedThisYear: number;
  playerStats: PlayerStats[];
  mostProfitableTournament: { name: string; organizer: string; totalPrize: number } | null;
  endedTournamentsCount: number; // Add count of ended tournaments for conditional rendering
}

const Stats: React.FC = () => {
  const { user } = useAuthStore();
  // const { teams } = useTeamStore(); // Removed unused variable
  const { tournaments, fetchTournaments } = useTournamentStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      if (user?.uid) {
        // FetchTournaments already filters by user's teams based on useTeamStore state
        // Ensure teams are loaded before fetching tournaments if needed, though fetchTournaments uses store state
        await fetchTournaments(user.uid);
      }
      setIsLoading(false);
    };
    loadData();
  }, [user, fetchTournaments]); // Depend on user and fetchTournaments

  const currentYear = new Date().getFullYear();

  // Memoize calculations to avoid re-computing on every render
  const statistics: CalculatedStats = useMemo(() => { // Explicitly type the return value
    console.log("[Stats Calculation] Raw tournaments data:", tournaments); // Log raw data
    if (!tournaments || tournaments.length === 0) {
      console.log("[Stats Calculation] No tournaments found or empty array.");
      return {
        tournamentsPlayedThisYear: 0,
        gamesPlayedThisYear: 0,
        playerStats: [],
        mostProfitableTournament: null,
        endedTournamentsCount: 0, // Initialize count
      };
    }

    const relevantTournaments = tournaments.filter(t => t.status === 'ended' || t.status === 'in_progress'); // Consider both for counts

    // --- Current Year Stats ---
    const tournamentsThisYear = relevantTournaments.filter(t => {
        try {
            // Assuming t.date is in 'YYYY-MM-DD' format
            return new Date(t.date).getFullYear() === currentYear;
        } catch (e) {
            console.error("Error parsing tournament date:", t.date, e);
            return false;
        }
    });
    const tournamentsPlayedThisYear = tournamentsThisYear.length;
    const gamesPlayedThisYear = tournamentsThisYear.reduce((sum, t) => sum + (t.games?.length || 0), 0);

    // --- Player Rankings (Points & Winnings) ---
    const playerAggregates: Record<string, PlayerStats> = {};

    // Calculate endedTournaments inside useMemo
    const endedTournaments = tournaments.filter(t => t.status === 'ended');
    const endedTournamentsCount = endedTournaments.length; // Get count
    console.log("[Stats Calculation] Filtered endedTournaments:", endedTournaments); // Log ended tournaments

    endedTournaments.forEach(tournament => {
      console.log(`[Stats Calculation] Processing tournament: ${tournament.name} (${tournament.id})`); // Log tournament being processed
      (tournament.games || []).forEach((game: Game) => {
        console.log(`[Stats Calculation]   Processing game: ${game.id}, Status: ${game.status}, Has Results: ${!!game.results}`); // Log game details
        if (game.status === 'ended' && game.results) {
          console.log(`[Stats Calculation]     Found ended game with results:`, game.results); // Log results if found
          game.results.forEach((result: PlayerResult) => {
            if (!playerAggregates[result.playerId]) {
              playerAggregates[result.playerId] = {
                id: result.playerId,
                name: result.name, // Use name stored in result
                totalPoints: 0,
                totalWinnings: 0,
                gamesPlayed: 0,
              };
            }
            playerAggregates[result.playerId].totalPoints += result.points || 0;
            playerAggregates[result.playerId].totalWinnings += result.winnings || 0;
            playerAggregates[result.playerId].gamesPlayed += 1;
          });
        }
      });
    });

    const playerStats = Object.values(playerAggregates);
    console.log("[Stats Calculation] Aggregated player stats:", playerStats); // Log aggregated stats

    // --- Most Profitable Tournament ---
    let mostProfitableTournament: { name: string; organizer: string; totalPrize: number } | null = null;
    let maxPrize = -1;

    endedTournaments.forEach(tournament => {
      const totalPrize = (tournament.games || []).reduce((sum, game) => sum + (game.prizePool || 0), 0);
      // Only consider tournaments with a positive prize pool
      if (totalPrize > 0 && totalPrize > maxPrize) {
        maxPrize = totalPrize;
        mostProfitableTournament = {
          name: tournament.name,
          organizer: tournament.creatorNickname || tournament.creatorId, // Use nickname if available
          totalPrize: totalPrize,
        };
      }
    });
    console.log("[Stats Calculation] Most profitable tournament found:", mostProfitableTournament); // Log most profitable

    const finalStats = {
      tournamentsPlayedThisYear,
      gamesPlayedThisYear,
      playerStats,
      mostProfitableTournament,
      endedTournamentsCount, // Return the count
    };
    console.log("[Stats Calculation] Final calculated statistics object:", finalStats); // Log final object
    return finalStats;
  }, [tournaments, currentYear]); // Recalculate only when tournaments or year change

  if (isLoading) {
    return <div className="text-center py-12">Chargement des statistiques...</div>;
  }

  if (tournaments.length === 0) {
      return <div className="text-center py-12 text-gray-600">Aucun tournoi trouvé pour vos équipes.</div>;
  }

  // Sort players for display
  const sortedByPoints = [...statistics.playerStats].sort((a, b) => b.totalPoints - a.totalPoints);
  const sortedByWinnings = [...statistics.playerStats].sort((a, b) => b.totalWinnings - a.totalWinnings);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-poker-black mb-6">Statistiques ({currentYear})</h1>

      {/* Current Year Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
          <p className="text-sm font-medium text-gray-500">Tournois Joués ({currentYear})</p>
          <p className="text-3xl font-bold text-poker-blue">{statistics.tournamentsPlayedThisYear}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
          <p className="text-sm font-medium text-gray-500">Parties Jouées ({currentYear})</p>
          <p className="text-3xl font-bold text-poker-blue">{statistics.gamesPlayedThisYear}</p>
        </div>
      </div>

      {/* Player Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ranking by Points */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold text-poker-black mb-4">Classement par Points</h2>
          {sortedByPoints.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rang</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joueur</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Parties</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedByPoints.map((player, index) => (
                    <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{player.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{player.totalPoints}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{player.gamesPlayed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">Aucune donnée de classement par points disponible.</p>
          )}
        </div>

        {/* Ranking by Winnings */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold text-poker-black mb-4">Classement par Gains</h2>
           {sortedByWinnings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rang</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joueur</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gains (€)</th>
                     <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Parties</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedByWinnings.map((player, index) => (
                    <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{player.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{player.totalWinnings.toFixed(2)}</td>
                       <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">{player.gamesPlayed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
             <p className="text-gray-500">Aucune donnée de classement par gains disponible.</p>
          )}
        </div>
      </div>

      {/* Most Profitable Tournament */}
      {statistics.mostProfitableTournament ? ( // Check if it exists before accessing properties
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mt-8">
          <h2 className="text-xl font-semibold text-poker-black mb-3">Tournoi le Plus Rémunérateur ({currentYear})</h2>
          <p><span className="font-medium">Nom:</span> {statistics.mostProfitableTournament.name}</p>
          <p><span className="font-medium">Organisateur:</span> {statistics.mostProfitableTournament.organizer}</p>
          <p><span className="font-medium">Prize Pool Total:</span> {statistics.mostProfitableTournament.totalPrize.toFixed(2)} €</p>
        </div>
      ) : (
         statistics.endedTournamentsCount > 0 && ( // Only show this message if there were ended tournaments but none had prize pools > 0
           <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mt-8">
             <h2 className="text-xl font-semibold text-poker-black mb-3">Tournoi le Plus Rémunérateur ({currentYear})</h2>
             <p className="text-gray-500">Aucun tournoi terminé avec un prize pool défini trouvé pour cette année.</p>
           </div>
         )
      )}
       {/* Removed the potentially duplicated block */}

    </div>
  );
};

export default Stats; // Ensure only one default export
