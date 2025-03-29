import React, { useState, useEffect } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { StopCircle, UserCheck, UserX, UserMinus } from 'lucide-react';
import type { Game } from '../../store/tournamentStore';
import { GameTimer } from './GameTimer';

interface GameViewProps {
  game: Game;
  setViewingGame: (game: Game | null) => void;
  tournamentId: string;
}

export function GameView({ game, setViewingGame, tournamentId }: GameViewProps) {
  const updateGame = useTournamentStore(state => state.updateGame);
  const endGame = useTournamentStore(state => state.endGame);
  const [gameTimer, setGameTimer] = useState<Game | null>(null);

  const handlePlayerElimination = (playerId: string) => {
    const updatedPlayers = game.players.map(player =>
      player.id === playerId
        ? { ...player, eliminated: !player.eliminated }
        : player
    );

    updateGame(tournamentId, game.id, { players: updatedPlayers });

    setViewingGame({
      ...game,
      players: updatedPlayers
    });

    const activePlayers = updatedPlayers.filter(p => !p.eliminated);
    if (activePlayers.length === 1) {
      handleEndGame(`${activePlayers[0].name} remporte la partie !`);
    }
  };

  const handleEndGame = (message?: string) => {
    endGame(tournamentId, game.id);
    setViewingGame(null);
    if (message) {
      alert(message);
    }
  };

  useEffect(() => {
    setGameTimer(game);
  }, [game]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-poker-black">Table en cours</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleEndGame()}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors flex items-center"
          >
            <StopCircle className="w-5 h-5 mr-2" />
            Arrêter la partie
          </button>
          <button
            onClick={() => setViewingGame(null)}
            className="text-gray-600 hover:text-gray-800"
          >
            Retour aux parties
          </button>
        </div>
      </div>

      {gameTimer && (
        <GameTimer game={gameTimer} />
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Joueurs</h3>
        <div className="grid gap-3">
          {game.players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                player.eliminated
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center">
                {player.eliminated ? (
                  <UserX className="w-5 h-5 text-red-500 mr-2" />
                ) : (
                  <UserCheck className="w-5 h-5 text-green-500 mr-2" />
                )}
                <span className={player.eliminated ? 'line-through text-gray-500' : ''}>
                  {player.nickname || player.name}
                </span>
              </div>
              <button
                onClick={() => handlePlayerElimination(player.id)}
                className={`px-3 py-1 rounded-md text-sm flex items-center ${
                  player.eliminated
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {player.eliminated ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-1" />
                    Réintégrer
                  </>
                ) : (
                  <>
                    <UserMinus className="w-4 h-4 mr-1" />
                    Éliminer
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
