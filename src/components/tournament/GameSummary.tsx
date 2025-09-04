import React from 'react';
import type { Game, Player } from '../../store/types/tournamentTypes';
import { format } from 'date-fns'; // Using date-fns for formatting, will need installation

interface GameSummaryProps {
  game: Game;
}

// Helper function to format timestamp to a readable string
const formatTimestamp = (timestamp: number | null | undefined): string => {
  if (!timestamp) return 'N/A';
  try {
    return format(new Date(timestamp), 'dd/MM/yyyy HH:mm:ss');
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return 'Invalid Date';
  }
};

// Helper function to calculate duration
const calculateDuration = (start: number | undefined, end: number | null | undefined): string => {
  if (start == null || end == null) return 'N/A';
  const durationMs = end - start;
  if (durationMs < 0) return 'N/A';

  const seconds = Math.floor((durationMs / 1000) % 60);
  const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
  const hours = Math.floor((durationMs / (1000 * 60 * 60)) % 24);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`); // Show seconds if duration is less than a minute

  return parts.join(' ');
};

export function GameSummary({ game }: GameSummaryProps) {
  // Create a unified ranking list
  const rankedPlayers = [
    // Add winner(s) first
    ...game.players.filter((p: Player) => !p.eliminated),
    // Then add eliminated players, sorted by elimination time descending
    ...game.players
      .filter((p: Player) => p.eliminated && p.eliminationTime)
      .sort((a: Player, b: Player) => (b.eliminationTime ?? 0) - (a.eliminationTime ?? 0)),
  ];

  // Calculate rebuy amount for each player individually (for cyclic distribution)
  const calculatePlayerRebuyWinnings = (playerId: string): number => {
    const playerResult = game.results?.find(r => r.playerId === playerId);
    if (!playerResult) return 0;
    
    // Calculate main pot winnings based on rank
    const gameWinnings = game.winnings || { first: 0, second: 0, third: 0 };
    let baseWinnings = 0;
    if (playerResult.rank === 1) baseWinnings = gameWinnings.first;
    else if (playerResult.rank === 2) baseWinnings = gameWinnings.second;
    else if (playerResult.rank === 3) baseWinnings = gameWinnings.third;
    
    // Rebuy winnings = total winnings - base winnings
    return Math.max(0, playerResult.winnings - baseWinnings);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h2 className="text-2xl font-bold text-poker-black mb-6 text-center">Résumé de la partie</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
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
          <p className="text-lg font-semibold text-gray-800">{calculateDuration(game.startedAt, game.endedAt ?? undefined)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Classement</h3>
        <div className="space-y-3">
          {rankedPlayers.map((player: Player, index: number) => {
            const rank = index + 1;
            let winningsDisplay = null;
            const playerResult = game.results?.find(r => r.playerId === player.id);
            const mainPotWinnings = playerResult?.winnings || 0;

            const playerRebuyWinnings = calculatePlayerRebuyWinnings(player.id);
            
            if (mainPotWinnings > 0 || playerRebuyWinnings > 0) {
              const displayWinnings = mainPotWinnings;

              const colorClass =
                playerResult?.rank === 1 ? 'text-green-600 bg-green-100' :
                playerResult?.rank === 2 ? 'text-blue-600 bg-blue-100' :
                playerResult?.rank === 3 ? 'text-orange-600 bg-orange-100' :
                'text-gray-600 bg-gray-100';

              winningsDisplay = (
                <span className={`text-sm font-semibold px-2 py-1 rounded ${colorClass}`}>
                  {displayWinnings.toFixed(2)} €
                  {playerRebuyWinnings > 0 && (
                    <span className="text-xs text-gray-500 ml-1">(dont {playerRebuyWinnings.toFixed(2)}€ de rebuy)</span>
                  )}
                </span>
              );
            }
            
            const isWinner = !player.eliminated;
            const rankText = isWinner ? `🏆 ${rank}er` : `${rank}e`;
            const bgColor = isWinner ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200';
            const rankColor = isWinner ? 'text-yellow-600' : 'text-gray-600';
            
            return (
              <div key={player.id} className={`flex items-center justify-between p-3 rounded-lg border ${bgColor}`}>
                <div className="flex items-center">
                  <span className={`text-md font-semibold ${rankColor} mr-3 w-12 text-center`}>{rankText}</span>
                  <span className="text-gray-700 flex-grow">{player.nickname || player.name}</span>
                </div>

                <div className="flex flex-col items-end">
                  {winningsDisplay}
                  {!isWinner && (
                    <span className="text-xs text-gray-500 mt-1">
                      Éliminé à: {formatTimestamp(player.eliminationTime)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
