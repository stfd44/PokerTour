import React from 'react';
import { UserCheck, UserX, UserMinus, RefreshCcw } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import type { Game } from '../../store/types/tournamentTypes';

interface GamePlayersPanelProps {
  game: Game;
  tournamentId: string;
  gameId: string;
  onEliminate: (playerId: string, isCurrentlyEliminated: boolean | undefined) => void;
  onRebuy: (playerId: string) => void;
  rebuyLoading: string | null;
  rebuyError: string | null;
}

export function GamePlayersPanel({
  game,
  onEliminate,
  onRebuy,
  rebuyLoading,
  rebuyError,
}: GamePlayersPanelProps) {
  const { user } = useAuthStore();
  const rebuyLimitMode = game.rebuyLimitMode || 'until_level';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Gestion des joueurs</h3>
      </div>

      {game.status === 'in_progress' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800 mb-4">
          {rebuyLimitMode === 'max_per_player'
            ? `Recave limitee a ${game.maxRebuysPerPlayer ?? 0} fois par joueur.`
            : `Recave autorisee jusqu'a la fin du niveau ${game.rebuyAllowedUntilLevel}.`}
          <br />Total rebuys actuels : {game.totalRebuys} ({game.totalRebuys * game.rebuyAmount} EUR ajoutes)
        </div>
      )}

      {rebuyError && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-md text-sm text-red-700 mb-4">
          Erreur : {rebuyError}
        </div>
      )}

      <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-2 pb-4">
        {game.players.map((player) => {
          const canRebuy =
            player.eliminated &&
            game.status === 'in_progress' &&
            (rebuyLimitMode === 'max_per_player'
              ? (player.rebuysMade || 0) < (game.maxRebuysPerPlayer ?? 0)
              : game.currentLevel < game.rebuyAllowedUntilLevel);

          const isLoadingRebuy = rebuyLoading === player.id;

          return (
            <div
              key={player.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-3 ${
                player.eliminated
                  ? 'bg-red-50 border-red-200 opacity-80'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center">
                {player.eliminated ? (
                  <UserX className="w-5 h-5 text-red-500 mr-2" />
                ) : (
                  <UserCheck className="w-5 h-5 text-green-500 mr-2" />
                )}
                <span className={player.eliminated ? 'line-through text-gray-500' : 'font-medium'}>
                  {player.nickname || player.name}
                  {rebuyLimitMode === 'max_per_player' && ` (${player.rebuysMade || 0}/${game.maxRebuysPerPlayer ?? 0} recaves)`}
                </span>
              </div>

              {user && game.players.some((p) => p.id === user.uid) && (
                <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
                  {canRebuy && (
                    <button
                      onClick={() => onRebuy(player.id)}
                      disabled={isLoadingRebuy}
                      className="px-3 py-1.5 rounded-md text-sm flex items-center transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-wait"
                    >
                      <RefreshCcw className={`w-4 h-4 mr-1.5 ${isLoadingRebuy ? 'animate-spin' : ''}`} />
                      {isLoadingRebuy ? '...' : `Rebuy (${game.rebuyAmount}EUR)`}
                    </button>
                  )}

                  <button
                    onClick={() => onEliminate(player.id, player.eliminated)}
                    disabled={game.status !== 'in_progress' || isLoadingRebuy}
                    className={`px-3 py-1.5 rounded-md text-sm flex items-center transition-colors ${
                      player.eliminated
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    } ${game.status !== 'in_progress' || isLoadingRebuy ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {player.eliminated ? (
                      <>
                        <UserCheck className="w-4 h-4 mr-1.5" />
                        Reintegrer
                      </>
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4 mr-1.5" />
                        Eliminer
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
