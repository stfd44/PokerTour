import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTeamStore } from '../store/useTeamStore'; // Import useTeamStore
import { useTournamentStore, Game, PlayerResult } from '../store/tournamentStore'; // Import PlayerResult
import clsx from 'clsx'; // Import clsx

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
  const { teams, fetchTeams } = useTeamStore(); // Get teams and fetchTeams
  const { tournaments, fetchTournaments } = useTournamentStore();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>('all'); // 'all' or team ID
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear()); // State for selected year

  useEffect(() => {
    // Fetch teams first if not already loaded
    if (user?.uid && teams.length === 0) {
      fetchTeams(); // Fetch teams associated with the user
    }
  }, [user, teams, fetchTeams]);


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

  // Determine available years from tournament data for the selector
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    tournaments.forEach(t => {
      try {
        const year = new Date(t.date).getFullYear();
        if (!isNaN(year)) {
          years.add(year);
        }
      } catch (e) {
        console.error("Error parsing date for year extraction:", t.date, e);
      }
    });
    // Add current year if no tournaments exist yet or if it's not already included
    const currentSystemYear = new Date().getFullYear();
    if (!years.has(currentSystemYear)) {
        years.add(currentSystemYear);
    }
    return Array.from(years).sort((a, b) => b - a); // Sort descending
  }, [tournaments]);

  // Update selectedYear if it becomes invalid (e.g., data changes)
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]); // Default to the latest available year
    }
  }, [availableYears, selectedYear]);


  // Memoize calculations to avoid re-computing on every render
  const statistics: CalculatedStats = useMemo(() => {
    // Filter tournaments based on selected team *before* any calculations
    const filteredTournaments = selectedTeamId === 'all'
      ? tournaments
      : tournaments.filter(t => t.teamId === selectedTeamId);

    console.log(`[Stats Calculation] Selected Team: ${selectedTeamId}, Raw tournaments: ${tournaments.length}, Filtered tournaments: ${filteredTournaments.length}`);

    if (!filteredTournaments || filteredTournaments.length === 0) {
      console.log("[Stats Calculation] No relevant tournaments found after filtering.");
      return {
        tournamentsPlayedThisYear: 0,
        gamesPlayedThisYear: 0,
        playerStats: [],
        mostProfitableTournament: null,
        endedTournamentsCount: 0, // Initialize count
      };
    }

    // Use the already filtered list for further processing
    const relevantTournaments = filteredTournaments.filter(t => t.status === 'ended' || t.status === 'in_progress');

    // --- Selected Year Stats ---
    const tournamentsThisYear = relevantTournaments.filter(t => {
        try {
            // Filter by selectedYear now
            return new Date(t.date).getFullYear() === selectedYear;
        } catch (e) {
            console.error("Error parsing tournament date:", t.date, e);
            return false; // Skip if date is invalid
        }
    });
    const tournamentsPlayedThisYear = tournamentsThisYear.length;
    const gamesPlayedThisYear = tournamentsThisYear.reduce((sum, t) => sum + (t.games?.length || 0), 0);

    // --- Player Rankings (Points & Winnings) ---
    const playerAggregates: Record<string, PlayerStats> = {};

    // Calculate endedTournaments from the filtered list
    const endedTournaments = filteredTournaments.filter(t => t.status === 'ended');
    const endedTournamentsCount = endedTournaments.length;
    console.log("[Stats Calculation] Filtered endedTournaments (for selected team):", endedTournaments);

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
    console.log("[Stats Calculation] Final calculated statistics object:", finalStats);
    return finalStats;
  }, [tournaments, selectedYear, selectedTeamId]); // Update dependency array

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-poker-black">Statistiques ({selectedYear})</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* Year Selector */}
          {availableYears.length > 0 && (
            <div className="w-full sm:w-auto">
              <label htmlFor="year-select" className="block text-sm font-medium text-gray-700">
                Année :
              </label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-poker-blue focus:border-poker-blue sm:text-sm rounded-md shadow-sm"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Team Selector */}
          {teams.length > 1 && (
            <div className="w-full sm:w-auto">
              <label htmlFor="team-select" className="block text-sm font-medium text-gray-700">
                Équipe :
              </label>
              <select
              id="team-select"
              value={selectedTeamId ?? 'all'}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-poker-blue focus:border-poker-blue sm:text-sm rounded-md shadow-sm"
            >
              <option value="all">Toutes les équipes</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          )}
        </div> {/* Closing tag for the flex container of selectors */}
      </div>


      {/* Selected Year Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
          <p className="text-sm font-medium text-gray-500">Tournois Joués ({selectedYear})</p>
          <p className="text-3xl font-bold text-poker-blue">{statistics.tournamentsPlayedThisYear}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
          <p className="text-sm font-medium text-gray-500">Parties Jouées ({selectedYear})</p>
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
                  {sortedByPoints.map((player, index) => {
                    const rank = index + 1;
                    const isCurrentUser = player.id === user?.uid;
                    return (
                      <tr
                        key={player.id}
                        className={clsx(
                          // Apply user highlight first (blue), then rank highlights, then alternating row colors
                          isCurrentUser ? 'bg-blue-100 font-semibold' :
                          rank === 1 ? 'bg-yellow-100' : // Gold-ish
                          rank === 2 ? 'bg-gray-200' :   // Silver-ish
                          rank === 3 ? 'bg-orange-100' : // Bronze-ish
                          (index % 2 === 0 ? 'bg-white' : 'bg-gray-50') // Alternating rows
                        )}
                      >
                        <td className={clsx(
                          "px-4 py-2 whitespace-nowrap text-sm font-medium text-center", // Centered rank
                           // Keep text color consistent unless highlighted
                          isCurrentUser ? 'text-blue-800' : 'text-gray-900'
                        )}>
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                        </td>
                        <td className={clsx("px-4 py-2 whitespace-nowrap text-sm", isCurrentUser ? 'text-blue-800' : 'text-gray-700')}>
                          {player.name}{isCurrentUser && ' (Vous)'}
                        </td>
                        <td className={clsx("px-4 py-2 whitespace-nowrap text-sm text-right", isCurrentUser ? 'text-blue-800' : 'text-gray-700')}>
                          {player.totalPoints}
                        </td>
                        <td className={clsx("px-4 py-2 whitespace-nowrap text-sm text-right", isCurrentUser ? 'text-blue-800' : 'text-gray-700')}>
                          {player.gamesPlayed}
                        </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Aucune donnée de classement par points disponible pour la sélection.</p>
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
                  {sortedByWinnings.map((player, index) => {
                     const rank = index + 1;
                     const isCurrentUser = player.id === user?.uid;
                    return (
                      <tr
                        key={player.id}
                        className={clsx(
                          // Apply user highlight first (blue), then rank highlights, then alternating row colors
                          isCurrentUser ? 'bg-blue-100 font-semibold' :
                          rank === 1 ? 'bg-yellow-100' : // Gold-ish
                          rank === 2 ? 'bg-gray-200' :   // Silver-ish
                          rank === 3 ? 'bg-orange-100' : // Bronze-ish
                          (index % 2 === 0 ? 'bg-white' : 'bg-gray-50') // Alternating rows
                        )}
                      >
                         <td className={clsx(
                          "px-4 py-2 whitespace-nowrap text-sm font-medium text-center", // Centered rank
                           // Keep text color consistent unless highlighted
                          isCurrentUser ? 'text-blue-800' : 'text-gray-900'
                        )}>
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                        </td>
                        <td className={clsx("px-4 py-2 whitespace-nowrap text-sm", isCurrentUser ? 'text-blue-800' : 'text-gray-700')}>
                          {player.name}{isCurrentUser && ' (Vous)'}
                        </td>
                        <td className={clsx("px-4 py-2 whitespace-nowrap text-sm text-right", isCurrentUser ? 'text-blue-800' : 'text-gray-700')}>
                          {player.totalWinnings.toFixed(2)}
                        </td>
                       <td className={clsx("px-4 py-2 whitespace-nowrap text-sm text-right", isCurrentUser ? 'text-blue-800' : 'text-gray-700')}>
                          {player.gamesPlayed}
                        </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
             <p className="text-gray-500 text-center py-4">Aucune donnée de classement par gains disponible pour la sélection.</p>
          )}
        </div>
      </div>

      {/* Most Profitable Tournament */}
      {statistics.mostProfitableTournament ? (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mt-8">
          <h2 className="text-xl font-semibold text-poker-black mb-3">Tournoi le Plus Rémunérateur ({selectedYear})</h2>
          <p><span className="font-medium">Nom:</span> {statistics.mostProfitableTournament.name}</p>
          <p><span className="font-medium">Organisateur:</span> {statistics.mostProfitableTournament.organizer}</p>
          <p><span className="font-medium">Prize Pool Total:</span> {statistics.mostProfitableTournament.totalPrize.toFixed(2)} €</p>
        </div>
      ) : (
         statistics.endedTournamentsCount > 0 && (
           <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mt-8">
             <h2 className="text-xl font-semibold text-poker-black mb-3">Tournoi le Plus Rémunérateur ({selectedYear})</h2>
             <p className="text-gray-500">Aucun tournoi terminé avec un prize pool défini trouvé pour cette sélection et cette année.</p>
           </div>
         )
      )}
       {/* Removed the potentially duplicated block */}

    </div> // Closing tag for the main content div
  );
};

export default Stats; // Ensure only one default export
