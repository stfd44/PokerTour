import React, { useState } from 'react';
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
  
  const [confirmEndGameId, setConfirmEndGameId] = useState<string | null>(null);

  const handleEditGame = (game: Game) => {
    onEditGame(game);
  };

  const handleEndGame = (gameId: string) => {
    setConfirmEndGameId(gameId);
  };

  const handleDeleteGame = (gameId: string) => {
    if (userId && window.confirm("Êtes-vous sûr de vouloir supprimer cette partie ?")) {
      deleteGame(tournament.id, gameId, userId);
    }
  };

  return (
    <>
      <div className="grid gap-6">
        {[...tournament.games].reverse().map((game: Game) => ( // Added Game type and reversed array
          <div key={game.id} className="glass-card p-6">
            {/* Use flex-col on small screens, flex-row on larger screens */}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4 sm:gap-0">
            {/* Info Section */}
            <div className="space-y-2 w-full sm:w-auto"> {/* Take full width on small screens */}
              <div className="flex items-center space-x-4">
                <span className={`badge text-sm px-3 py-1 ${
                  game.status === 'pending' ? 'badge-gray' :
                  game.status === 'in_progress' ? 'badge-green' :
                  'badge-blue'
                }`}>
                  {game.status === 'pending' ? 'En attente' :
                   game.status === 'in_progress' ? 'En cours' :
                   'Terminée'}
                </span>
                <div className="flex items-center text-gray-300">
                  <Users className="w-5 h-5 mr-1" />
                  {/* Added Player type */}
                  <span>{game.players.filter((p: Player) => !p.eliminated).length} en jeu / {game.players.length} total</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-6 text-gray-300"> {/* Stack info vertically on small screens */}
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

              <div className="text-gray-300">
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
                        className="btn btn-ghost w-full sm:w-auto"
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
                        className="btn btn-gold w-full sm:w-auto"
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
                    className="btn btn-green w-full sm:w-auto"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Voir la table
                  </button>
                  <button
                    onClick={() => handleEndGame(game.id)}
                    className="btn btn-red w-full sm:w-auto"
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    Arrêter
                  </button>
                </>
              )}

              {game.status === 'ended' && (
                <button
                  onClick={() => onViewGame(game.id)}
                  className="btn btn-blue w-full sm:w-auto"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Voir Résumé
                </button>
              )}
              {/* Delete Button */}
              {userId === tournament.creatorId && (
                 <button
                   onClick={() => handleDeleteGame(game.id)}
                   className="btn btn-red w-full sm:w-auto"
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
        <div className="text-center py-8 text-gray-300">
          Aucune partie n'a encore été créée pour ce tournoi.
        </div>
      )}
    </div>

    {confirmEndGameId && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
        <div className="glass-card p-6 max-w-sm w-full mx-auto">
          <h3 className="text-lg font-bold text-white mb-2">Arrêter la partie ?</h3>
          <p className="text-gray-300 mb-6 flex flex-col gap-2">
            <span>Voulez-vous vraiment arrêter cette partie en cours ?</span>
            <span className="bg-orange-500/15 text-orange-300 p-2 rounded text-sm">⚠️ Les joueurs restants seront classés à égalité et se partageront les gains restants.</span>
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConfirmEndGameId(null)}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                endGame(tournament.id, confirmEndGameId);
                setConfirmEndGameId(null);
              }}
              className="btn btn-red"
            >
              Oui, l'arrêter
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
