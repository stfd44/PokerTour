import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { RotateCcw } from 'lucide-react';
import type { Game, Player } from '../../store/types/tournamentTypes';
import { useTournamentStore } from '../../store/tournamentStore';
import { useAuthStore } from '../../store/useAuthStore';

interface GameSummaryProps {
  game: Game;
}

const formatTimestamp = (timestamp: number | null | undefined): string => {
  if (!timestamp) return 'N/A';
  try {
    return format(new Date(timestamp), 'dd/MM/yyyy HH:mm:ss');
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid Date';
  }
};

const calculateDuration = (start: number | null | undefined, end: number | null | undefined): string => {
  if (start == null || end == null) return 'N/A';
  const durationMs = end - start;
  if (durationMs < 0) return 'N/A';

  const seconds = Math.floor((durationMs / 1000) % 60);
  const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
  const hours = Math.floor((durationMs / (1000 * 60 * 60)) % 24);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
};

export function GameSummary({ game }: GameSummaryProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const reopenGameAndReinstateSecond = useTournamentStore(state => state.reopenGameAndReinstateSecond);
  const [showConfirmReopen, setShowConfirmReopen] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const tournament = useTournamentStore(state =>
    state.tournaments.find(t => t.id === game.tournamentId)
  );

  const rankedPlayers = [
    ...game.players.filter((p: Player) => !p.eliminated),
    ...game.players
      .filter((p: Player) => p.eliminated && p.eliminationTime)
      .sort((a: Player, b: Player) => (b.eliminationTime ?? 0) - (a.eliminationTime ?? 0)),
  ];

  const remainingPlayersCount = rankedPlayers.filter(p => !p.eliminated).length;
  const lastEliminated = game.players
    .filter((p: Player) => p.eliminated && p.eliminationTime)
    .sort((a: Player, b: Player) => (b.eliminationTime || 0) - (a.eliminationTime || 0))[0];

  const handleReopenGame = async () => {
    setIsReopening(true);
    try {
      await reopenGameAndReinstateSecond(game.tournamentId, game.id);
    } catch (error) {
      console.error('Error reopening game:', error);
    } finally {
      setIsReopening(false);
      setShowConfirmReopen(false);
    }
  };

  const handleBackToTournament = () => {
    navigate(`/tournament/${game.tournamentId}`, { state: { resetView: true } });
  };

  const calculatePlayerRebuyWinnings = (playerId: string): number => {
    const playerResult = game.results?.find(r => r.playerId === playerId);
    if (!playerResult) return 0;

    const gameWinnings = game.winnings || { first: 0, second: 0, third: 0 };
    let baseWinnings = 0;
    if (playerResult.rank === 1) baseWinnings = gameWinnings.first;
    else if (playerResult.rank === 2) baseWinnings = gameWinnings.second;
    else if (playerResult.rank === 3) baseWinnings = gameWinnings.third;

    return Math.max(0, playerResult.winnings - baseWinnings);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-poker-black">Résumé de la partie</h2>

        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {user && tournament?.status !== 'ended' && (
            <button
              onClick={() => setShowConfirmReopen(true)}
              className="flex items-center rounded-md bg-blue-100 px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-200"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {lastEliminated ? 'Pardonner le 2ème (Réouvrir)' : 'Réouvrir la partie'}
            </button>
          )}

          <button
            onClick={handleBackToTournament}
            className="rounded-md bg-poker-gold px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-yellow-600"
          >
            OK
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 text-center md:grid-cols-3">
        <div>
          <p className="text-sm font-medium text-gray-500">Début</p>
          <p className="text-lg font-semibold text-gray-800">{formatTimestamp(game.startedAt)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Fin</p>
          <p className="text-lg font-semibold text-gray-800">{formatTimestamp(game.endedAt)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Durée</p>
          <p className="text-lg font-semibold text-gray-800">{calculateDuration(game.startedAt, game.endedAt)}</p>
        </div>
      </div>

      {remainingPlayersCount > 1 && (
        <div className="mb-6 flex items-center justify-center rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-800">
          <span className="text-center font-bold">
            ⚠️ Partie arrêtée avec {remainingPlayersCount} joueurs restants. Les gains ont été partagés et aucun point n'est attribué aux vainqueurs.
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-xl font-semibold text-gray-800">Classement</h3>
          {remainingPlayersCount > 1 && (
            <span className="animate-pulse rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              Partie arrêtée
            </span>
          )}
        </div>

        <div className="space-y-3">
          {rankedPlayers.map((player: Player, index: number) => {
            const playerResult = game.results?.find(r => r.playerId === player.id);
            const rank = playerResult?.rank || index + 1;

            let winningsDisplay = null;
            const mainPotWinnings = playerResult?.winnings || 0;
            const playerRebuyWinnings = calculatePlayerRebuyWinnings(player.id);

            if (mainPotWinnings > 0 || playerRebuyWinnings > 0) {
              const colorClass =
                playerResult?.rank === 1 ? 'text-green-600 bg-green-100' :
                playerResult?.rank === 2 ? 'text-blue-600 bg-blue-100' :
                playerResult?.rank === 3 ? 'text-orange-600 bg-orange-100' :
                'text-gray-600 bg-gray-100';

              winningsDisplay = (
                <span className={`rounded px-2 py-1 text-sm font-semibold ${colorClass}`}>
                  {mainPotWinnings.toFixed(2)} €
                  {playerRebuyWinnings > 0 && (
                    <span className="ml-1 text-xs text-gray-500">
                      (dont {playerRebuyWinnings.toFixed(2)}€ de rebuy)
                    </span>
                  )}
                </span>
              );
            }

            const isWinner = !player.eliminated;
            const rankText = isWinner ? `🏆 ${rank}er` : `${rank}e`;
            const bgColor = isWinner ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200';
            const rankColor = isWinner ? 'text-yellow-600' : 'text-gray-600';

            return (
              <div key={player.id} className={`flex items-center justify-between rounded-lg border p-3 ${bgColor}`}>
                <div className="flex items-center">
                  <span className={`mr-3 w-12 text-center text-md font-semibold ${rankColor}`}>{rankText}</span>
                  <span className="flex-grow text-gray-700">{player.nickname || player.name}</span>
                </div>

                <div className="flex flex-col items-end">
                  {winningsDisplay}
                  {!isWinner && (
                    <span className="mt-1 text-xs text-gray-500">
                      Éliminé à : {formatTimestamp(player.eliminationTime)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex justify-center sm:justify-end">
        <button
          onClick={handleBackToTournament}
          className="min-w-32 rounded-md bg-poker-gold px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-yellow-600"
        >
          OK
        </button>
      </div>

      {showConfirmReopen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-gray-900">Réouvrir la partie ?</h3>
            <p className="mb-6 flex flex-col gap-2 text-gray-600">
              {lastEliminated ? (
                <span>
                  Voulez-vous vraiment réouvrir cette partie et réintégrer <strong>{lastEliminated.nickname || lastEliminated.name}</strong> (le dernier éliminé) ?
                </span>
              ) : (
                <span>Voulez-vous vraiment réouvrir cette partie ? Les joueurs classés seront remis en jeu.</span>
              )}
              <span className="rounded bg-orange-50 p-2 text-sm font-medium text-orange-800">
                ⚠️ Cela annulera la fin de partie et supprimera les gains calculés. Le chronomètre reprendra au moment où il a été arrêté.
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmReopen(false)}
                disabled={isReopening}
                className="rounded-md px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                onClick={handleReopenGame}
                disabled={isReopening}
                className="flex items-center rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              >
                {isReopening ? 'Réouverture...' : 'Oui, réouvrir la partie'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
