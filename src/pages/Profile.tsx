import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTournamentStore, Tournament, Game, PlayerResult } from '../store/tournamentStore';
import { useTeamStore } from '../store/useTeamStore'; // Removed unused Team import

interface ProfileStats {
  totalWinnings: number;
  totalBuyIns: number;
  statsByTournament: {
    [tournamentId: string]: {
      name: string;
      winnings: number;
      buyIn: number;
    };
  };
  statsByTeam: {
    [teamId: string]: {
      name: string;
      winnings: number;
      buyIns: number; // Changed from buyIn to buyIns for consistency
    };
  };
}

const Profile: React.FC = () => {
  const { user, setNickname, isLoading: authLoading } = useAuthStore();
  // Removed isLoading properties from tournament and team stores
  const { tournaments, fetchTournaments } = useTournamentStore();
  const { teams, fetchTeams } = useTeamStore();

  const [nicknameInput, setNicknameInput] = useState<string>('');
  const [isSavingNickname, setIsSavingNickname] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Initialize nickname input when user data is available
  useEffect(() => {
    if (user?.nickname) {
      setNicknameInput(user.nickname);
    }
  }, [user?.nickname]);

  // Fetch necessary data
  useEffect(() => {
    if (user?.uid) {
      // Fetch teams first if the array is empty
      if (teams.length === 0) {
        fetchTeams();
      }
      // Fetch tournaments if the array is empty
      if (tournaments.length === 0) {
        fetchTournaments(user.uid);
      }
    }
    // Removed teamsLoading and tournamentsLoading from dependency array
  }, [user?.uid, fetchTeams, fetchTournaments, teams.length, tournaments.length]);

  const handleSaveNickname = async () => {
    if (!user || !nicknameInput.trim() || nicknameInput.trim() === user.nickname) {
      setSaveMessage('Aucun changement détecté ou surnom invalide.');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    setIsSavingNickname(true);
    setSaveMessage(null);
    try {
      await setNickname(nicknameInput.trim());
      setSaveMessage('Surnom mis à jour avec succès !');
    } catch (error) {
      console.error("Error saving nickname:", error);
      setSaveMessage('Erreur lors de la sauvegarde du surnom.');
    } finally {
      setIsSavingNickname(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Calculate statistics
  const statistics = useMemo<ProfileStats | null>(() => {
    if (!user || !tournaments || tournaments.length === 0 || !teams) {
      return null; // Not enough data yet
    }

    const stats: ProfileStats = {
      totalWinnings: 0,
      totalBuyIns: 0,
      statsByTournament: {},
      statsByTeam: {},
    };

    const teamMap = new Map(teams.map(team => [team.id, team.name]));

    tournaments.forEach((tournament: Tournament) => {
      // Check if user is registered for this tournament
      const isRegistered = tournament.registrations?.some(reg => reg.id === user.uid);

      if (isRegistered) {
        stats.totalBuyIns += tournament.buyin || 0;

        // Initialize stats for this tournament if not present
        if (!stats.statsByTournament[tournament.id]) {
          stats.statsByTournament[tournament.id] = {
            name: tournament.name,
            winnings: 0,
            buyIn: tournament.buyin || 0,
          };
        } else {
           // Add buy-in even if already initialized (though this case might be rare)
           stats.statsByTournament[tournament.id].buyIn += tournament.buyin || 0;
        }


        // Initialize stats for this team if not present
        const teamName = teamMap.get(tournament.teamId) || 'Équipe inconnue';
        if (!stats.statsByTeam[tournament.teamId]) {
          stats.statsByTeam[tournament.teamId] = {
            name: teamName,
            winnings: 0,
            buyIns: tournament.buyin || 0,
          };
        } else {
          stats.statsByTeam[tournament.teamId].buyIns += tournament.buyin || 0;
        }

        // Process games within the tournament
        (tournament.games || []).forEach((game: Game) => {
          if (game.status === 'ended' && game.results) {
            const userResult = game.results.find((result: PlayerResult) => result.playerId === user.uid);
            if (userResult) {
              const winnings = userResult.winnings || 0;
              stats.totalWinnings += winnings;
              stats.statsByTournament[tournament.id].winnings += winnings;
              if (stats.statsByTeam[tournament.teamId]) {
                 stats.statsByTeam[tournament.teamId].winnings += winnings;
              }
            }
          }
        });
      }
    });

    return stats;
  }, [user, tournaments, teams]);

  // Adjusted isLoading logic: rely on authLoading and check if data arrays are populated
  const isLoading = authLoading || (user && (tournaments.length === 0 || teams.length === 0));

  if (isLoading) {
    return <div className="text-center py-12">Chargement du profil...</div>;
  }

  if (!user) {
    return <div className="text-center py-12 text-red-600">Utilisateur non trouvé. Veuillez vous reconnecter.</div>;
  }

  const overallBalance = statistics ? statistics.totalWinnings - statistics.totalBuyIns : 0;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-poker-black mb-6">Profil de {user.nickname || user.displayName}</h1>

      {/* Nickname Section */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold text-poker-black mb-4">Changer de Surnom</h2>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            placeholder="Entrez votre nouveau surnom"
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-blue focus:border-poker-blue"
            disabled={isSavingNickname}
          />
          <button
            onClick={handleSaveNickname}
            disabled={isSavingNickname || !nicknameInput.trim() || nicknameInput.trim() === user.nickname}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" // Applied styles similar to Teams.tsx buttons
          >
            {isSavingNickname ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
        {saveMessage && (
          <p className={`mt-2 text-sm ${saveMessage.includes('Erreur') ? 'text-red-600' : 'text-green-600'}`}>
            {saveMessage}
          </p>
        )}
      </div>

      {/* Statistics Section */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold text-poker-black mb-4">Statistiques Personnelles</h2>
        {statistics ? (
          <div className="space-y-6">
            {/* Overall Balance */}
            <div className="text-center border border-gray-200 p-4 rounded-md">
              <p className="text-sm font-medium text-gray-500">Balance Globale</p>
              <p className={`text-3xl font-bold ${overallBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {overallBalance.toFixed(2)} €
              </p>
              <p className="text-xs text-gray-500">
                (Total Gains: {statistics.totalWinnings.toFixed(2)} € - Total Mises: {statistics.totalBuyIns.toFixed(2)} €)
              </p>
            </div>

            {/* Stats per Tournament */}
            <div>
              <h3 className="text-lg font-semibold text-poker-dark mb-3">Par Tournoi</h3>
              {Object.keys(statistics.statsByTournament).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tournoi</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mise (€)</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gains (€)</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance (€)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(statistics.statsByTournament).map(([id, data]) => {
                        const balance = data.winnings - data.buyIn;
                        return (
                          <tr key={id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{data.name}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-700">{data.buyIn.toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-700">{data.winnings.toFixed(2)}</td>
                            <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {balance.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucune donnée de tournoi trouvée.</p>
              )}
            </div>

            {/* Stats per Team */}
            <div>
              <h3 className="text-lg font-semibold text-poker-dark mb-3">Par Équipe</h3>
              {Object.keys(statistics.statsByTeam).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Équipe</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mises (€)</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gains (€)</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance (€)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(statistics.statsByTeam).map(([id, data]) => {
                        const balance = data.winnings - data.buyIns;
                        return (
                          <tr key={id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{data.name}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-700">{data.buyIns.toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-700">{data.winnings.toFixed(2)}</td>
                            <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {balance.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucune donnée d'équipe trouvée.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Calcul des statistiques...</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
