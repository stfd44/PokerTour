import React from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { Users, Timer, Coins, PlayCircle, Edit2, Eye, StopCircle, Trash2, CheckCircle } from 'lucide-react'; // Added CheckCircle
import type { Game, Tournament, Player } from '../../store/types/tournamentTypes'; // Corrected import path and added Player

interface GameListProps {
  tournament: Tournament;
  onViewGame: (gameId: string) => void;
  onEditGame: (game: Game) => void;
  userId: string | undefined;
}

export function GameList({ tournament, onViewGame, onEditGame, userId }: GameListProps) {
  const startGame = useTournamentStore(state => state.startGame);
  const endGame = useTournamentStore(state => state.endGame);
  const deleteGame = useTournamentStore(state => state.deleteGame);

  const handleEditGame = (game: Game) => {
    onEditGame(game);
  };

  const handleEndGame = (gameId: string) => {
    endGame(tournament.id, gameId);
  };

  const handleDeleteGame = (gameId: string) => {
    if (userId && window.confirm("Êtes-vous sûr de vouloir supprimer cette partie ?")) {
      deleteGame(tournament.id, gameId, userId);
    }
  };

  return (
    <div className="grid gap-6">
      {tournament.games.map((game: Game) => ( // Added Game type
        <div key={game.id} className="bg-white rounded-lg shadow-md p-6">
          {/* Use flex-col on small screens, flex-row on larger screens */}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4 sm:gap-0">
            {/* Info Section */}
            <div className="space-y-2 w-full sm:w-auto"> {/* Take full width on small screens */}
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  game.status === 'pending' ? 'bg-gray-100 text-gray-600' :
                  game.status === 'in_progress' ? 'bg-green-100 text-green-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {game.status === 'pending' ? 'En attente' :
                   game.status === 'in_progress' ? 'En cours' :
                   'Terminée'}
                </span>
                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 mr-1" />
                  {/* Added Player type */}
                  <span>{game.players.filter((p: Player) => !p.eliminated).length} en jeu / {game.players.length} total</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-6 text-gray-600"> {/* Stack info vertically on small screens */}
                <div className="flex items-center">
                  <Coins className="w-5 h-5 mr-2 text-poker-gold" />
                  <span>Stack: {game.startingStack.toLocaleString()}</span>
                </div>
                <div className="flex items-center">
                  <Timer className="w-5 h-5 mr-2 text-poker-gold" />
                  {/* Support for both new and old data structures */}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <span>Niveaux: {game.levelDurations?.[0] || (game as any).levelDuration || (game as any).blindLevels}min</span>
                </div>
              </div>

              <div className="text-gray-600">
                {/* Support for both new and old data structures */}
                Blinds de départ:
                {game.blindStructure && game.blindStructure[0]
                  ? ` ${game.blindStructure[0].small}/${game.blindStructure[0].big}`
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  : ` ${(game as any).blinds?.small ?? 'N/A'}/${(game as any).blinds?.big ?? 'N/A'}`
                }
              </div>
            </div>

            {/* Responsive button container: stacks vertically, aligns end on larger screens */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 w-full sm:w-auto sm:justify-end">
              {game.status === 'pending' && (
                <>
                  {/* Add check: Only show Edit/Start if user is a player in this game */}
                  {userId && game.players.some(p => p.id === userId) && (
                    <>
                      <button
                        onClick={() => handleEditGame(game)}
                        className="w-full sm:w-auto bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200 transition-colors flex items-center justify-center sm:justify-start"
                      >
                        <Edit2 className="w-5 h-5 mr-2" />
                        Modifier
                      </button>
                      <button
                        onClick={() => {
                          if (userId) {
                            startGame(tournament.id, game.id, userId);
                          }
                          onViewGame(game.id);
                        }}
                        className="w-full sm:w-auto bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center justify-center sm:justify-start"
                        disabled={tournament.registrations.length < 2}
                      >
                        <PlayCircle className="w-5 h-5 mr-2" />
                        Démarrer
                      </button>
                    </>
                  )}
                </>
              )}

              {game.status === 'in_progress' && (
                <>
                  <button
                    onClick={() => onViewGame(game.id)}
                    className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors flex items-center justify-center sm:justify-start"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Voir la table
                  </button>
                  <button
                    onClick={() => handleEndGame(game.id)}
                    className="w-full sm:w-auto bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors flex items-center justify-center sm:justify-start"
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    Arrêter
                  </button>
                </>
              )}

              {game.status === 'ended' && (
                <button
                  onClick={() => onViewGame(game.id)}
                  className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center justify-center sm:justify-start"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Voir Résumé
                </button>
              )}
              {/* Delete Button */}
              {userId === tournament.creatorId && (
                 <button
                   onClick={() => handleDeleteGame(game.id)}
                   className="w-full sm:w-auto bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 transition-colors flex items-center text-sm justify-center sm:justify-start" // Adjusted padding/alignment
                 >
                   <Trash2 className="w-4 h-4 mr-1" />
                   Supprimer
                 </button>
               )}
            </div>
          </div>
        </div>
      ))}

      {tournament.games.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          Aucune partie n'a encore été créée pour ce tournoi.
        </div>
      )}
    </div>
  );
}
