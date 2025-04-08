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
  totalWagers: number; // ADDED: Track total amount wagered (buyins + rebuys)
  gamesPlayed: number;
}

// Define the structure for the memoized statistics object
interface CalculatedStats {
  // These represent totals for the selected scope (year/team), not user-specific yet
  tournamentsInScope: number;
  gamesInScope: number;
  // User specific counts
  userTournamentsParticipated: number;
  userGamesParticipated: number;
  playerStats: PlayerStats[];
  mostProfitableTournament: { name: string; organizer: string; totalPrize: number } | null;
  endedTournamentsCount: number;
}

const Stats: React.FC = () => {
  const { user } = useAuthStore(); // Get the logged-in user
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

    if (!filteredTournaments || filteredTournaments.length === 0 || !user) { // Ensure user exists
      console.log("[Stats Calculation] No relevant tournaments found or user not logged in.");
      return {
        tournamentsInScope: 0,
        gamesInScope: 0,
        userTournamentsParticipated: 0,
        userGamesParticipated: 0,
        playerStats: [],
        mostProfitableTournament: null,
        endedTournamentsCount: 0,
      };
    }

    // Filter by selected year *first*
    const tournamentsInYear = filteredTournaments.filter(t => {
      try {
        return new Date(t.date).getFullYear() === selectedYear;
      } catch (e) {
        console.error("Error parsing tournament date:", t.date, e);
        return false;
      }
    });

    const tournamentsInScope = tournamentsInYear.length;
    const gamesInScope = tournamentsInYear.reduce((sum, t) => sum + (t.games?.length || 0), 0);

    // --- Player Aggregates (Points, Winnings, Wagers, Games Played) ---
    const playerAggregates: Record<string, PlayerStats> = {};
    const userParticipatedTournamentIds = new Set<string>();
    let userGamesParticipatedCount = 0;

    // Iterate through tournaments in the selected year and team scope
    tournamentsInYear.forEach(tournament => {
      console.log(`[Stats Calculation] Processing tournament: ${tournament.name} (${tournament.id})`);
      (tournament.games || []).forEach((game: Game) => {
        console.log(`[Stats Calculation]   Processing game: ${game.id}, Status: ${game.status}`);

        // Iterate through players *in this game* to calculate wagers and participation
        game.players.forEach(playerInGame => {
          const playerId = playerInGame.id;

          // Initialize aggregate if player not seen before
          if (!playerAggregates[playerId]) {
            playerAggregates[playerId] = {
              id: playerId,
              name: playerInGame.nickname || playerInGame.name, // Use nickname first
              totalPoints: 0,
              totalWinnings: 0,
              totalWagers: 0,
              gamesPlayed: 0,
            };
          }

          // Calculate wager for this game (buy-in + rebuys for this player)
          const rebuyCost = (playerInGame.rebuysMade || 0) * (game.rebuyAmount || tournament.buyin);
          const wagerForGame = tournament.buyin + rebuyCost;
          playerAggregates[playerId].totalWagers += wagerForGame;
          playerAggregates[playerId].gamesPlayed += 1; // Increment games played for this player

          // Update name if a nickname appears later (simple approach)
          if (playerInGame.nickname && playerAggregates[playerId].name !== playerInGame.nickname) {
              playerAggregates[playerId].name = playerInGame.nickname;
          }

          // Track participation for the logged-in user
          if (playerId === user.uid) {
            userGamesParticipatedCount += 1;
            userParticipatedTournamentIds.add(tournament.id);
          }
        });

        // Add points and winnings from game results (only for ended games)
        if (game.status === 'ended' && game.results) {
          console.log(`[Stats Calculation]     Adding results for ended game:`, game.results);
          game.results.forEach((result: PlayerResult) => {
            if (playerAggregates[result.playerId]) {
              playerAggregates[result.playerId].totalPoints += result.points || 0;
              playerAggregates[result.playerId].totalWinnings += result.winnings || 0;
              // Ensure name consistency if result name is different (e.g., nickname added later)
              if (playerAggregates[result.playerId].name !== result.name) {
                  // Maybe prioritize nickname from Player object if available?
                  // For now, let's stick with the name from the result as it's from game end.
                  // playerAggregates[result.playerId].name = result.name;
              }
            } else {
              // This case (player in results but not in game.players) should be rare/impossible if data is consistent
              console.warn(`[Stats Calculation] Player ${result.playerId} found in results but not in game.players for game ${game.id}`);
            }
          });
        }
      });
    });

    const playerStats = Object.values(playerAggregates);
    const userTournamentsParticipated = userParticipatedTournamentIds.size;
    console.log("[Stats Calculation] Aggregated player stats:", playerStats);
    console.log("[Stats Calculation] User participation:", { userTournamentsParticipated, userGamesParticipated: userGamesParticipatedCount });

    // --- Most Profitable Tournament (Based on ended tournaments in scope) ---
    const endedTournamentsInYear = tournamentsInYear.filter(t => t.status === 'ended');
    const endedTournamentsCount = endedTournamentsInYear.length; // Count based on year/team filter
    let mostProfitableTournament: { name: string; organizer: string; totalPrize: number } | null = null;
    let maxPrize = -1;

    endedTournamentsInYear.forEach(tournament => {
      // Calculate total prize pool based on game prize pools *or* sum of winnings if prize pool isn't stored reliably
      // Let's assume game.winnings accurately reflects distributed prizes for ended games
       const totalPrize = (tournament.games || []).reduce((sum, game) => {
           if (game.status === 'ended' && game.winnings) {
               return sum + (game.winnings.first || 0) + (game.winnings.second || 0) + (game.winnings.third || 0);
           }
           return sum;
       }, 0);

      if (totalPrize > 0 && totalPrize > maxPrize) {
        maxPrize = totalPrize;
        mostProfitableTournament = {
          name: tournament.name,
          organizer: tournament.creatorNickname || `ID: ${tournament.creatorId.substring(0, 6)}`, // Fallback
          totalPrize: totalPrize,
        };
      }
    });
    console.log("[Stats Calculation] Most profitable tournament found:", mostProfitableTournament);

    const finalStats = {
      tournamentsInScope,
      gamesInScope,
      userTournamentsParticipated,
      userGamesParticipated: userGamesParticipatedCount, // Use the calculated count
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
  const currentUserStats = statistics.playerStats.find(p => p.id === user?.uid);

  return (
    <div className="space-y-8">
      {/* Personal Balance Summary */}
      {currentUserStats && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 text-center">
          <h2 className="text-xl font-semibold text-poker-black mb-2">Votre Bilan Personnel ({selectedYear})</h2>
          <p className="text-4xl font-bold text-green-600">
            {(currentUserStats.totalWinnings - currentUserStats.totalWagers).toFixed(2)} €
          </p>
          <p className="text-sm text-gray-500 mt-1">
            (Total Gains: {currentUserStats.totalWinnings.toFixed(2)} € - Total Mises: {currentUserStats.totalWagers.toFixed(2)} €)
          </p>
           <div className="mt-3 text-sm text-gray-600">
             Tournois Joués: {statistics.userTournamentsParticipated} | Parties Jouées: {statistics.userGamesParticipated}
           </div>
        </div>
      )}

      {/* Filters and Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-poker-black">Statistiques Globales ({selectedYear})</h1>
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


      {/* Removed the old summary boxes as info is now in the personal balance section */}

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
