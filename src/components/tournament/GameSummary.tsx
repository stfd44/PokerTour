import React from 'react';
import type { Game } from '../../store/tournamentStore'; // Removed unused Player import
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
  if (!start || !end) return 'N/A';
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
  const winner = game.players.find(p => !p.eliminated);
  const eliminatedPlayers = game.players
    .filter(p => p.eliminated && p.eliminationTime)
    .sort((a, b) => (b.eliminationTime ?? 0) - (a.eliminationTime ?? 0)); // Sort descending by elimination time

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
          <p className="text-lg font-semibold text-gray-800">{calculateDuration(game.startedAt, game.endedAt)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Classement</h3>
        <div className="space-y-3">
          {/* Winner */}
          {winner && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-300">
              <div className="flex items-center">
                <span className="text-lg font-bold text-yellow-600 mr-3 w-12 text-center">🏆 1er</span>
                <span className="font-medium text-gray-800 flex-grow">{winner.nickname || winner.name}</span>
              </div>
              {/* Display 1st place winnings with rebuy info */}
              {game.winnings && game.winnings.first >= 0 && (() => { // Allow display even if base winnings are 0 but rebuys exist
                const baseWinnings = game.winnings.first || 0;
                const totalRebuyAmount = (game.totalRebuys || 0) * (game.rebuyAmount || 0);
                const displayTotalWinnings = baseWinnings + totalRebuyAmount;

                // Only display if there are base winnings or rebuys
                if (displayTotalWinnings > 0) {
                  return (
                    <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                      {displayTotalWinnings} €
                      {totalRebuyAmount > 0 && (
                        <span className="text-xs text-gray-500 ml-1">(dont {totalRebuyAmount}€ de rebuy)</span>
                      )}
                    </span>
                  );
                }
                return null; // Don't display anything if total is 0
              })()}
            </div>
          )}

          {/* Eliminated Players */}
          {eliminatedPlayers.map((player, index) => {
            const rank = index + 2;
            let winningsDisplay = null;
            if (game.winnings) {
              if (rank === 2 && game.winnings.second > 0) {
                winningsDisplay = (
                  <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    {game.winnings.second} €
                  </span>
                );
              } else if (rank === 3 && game.winnings.third > 0) {
                 winningsDisplay = (
                  <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                    {game.winnings.third} €
                  </span>
                );
              }
            }

            return (
              <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center">
                  <span className="text-md font-semibold text-gray-600 mr-3 w-12 text-center">{rank}e</span>
                  <span className="text-gray-700 flex-grow">{player.nickname || player.name}</span>
                </div>
                {/* Display 2nd/3rd place winnings */}
                {winningsDisplay}
                {/* Optionally show elimination time if no winnings */}
                {!winningsDisplay && (
                   <span className="text-xs text-gray-500">
                     Éliminé à: {formatTimestamp(player.eliminationTime)}
                   </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
