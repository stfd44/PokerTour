import React from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { Users, Timer, Coins, PlayCircle, Edit2, Eye, StopCircle, Trash2, CheckCircle } from 'lucide-react'; // Added CheckCircle
import type { Game, Tournament, Player } from '../../store/tournamentStore'; // Added Player

interface GameListProps {
  tournament: Tournament;
  onViewGame: (gameId: string) => void; // Changed prop
  onEditGame: (game: Game) => void; // Changed prop
  userId: string | undefined;
}

export function GameList({ tournament, onViewGame, onEditGame, userId }: GameListProps) {
  const startGame = useTournamentStore(state => state.startGame);
  const endGame = useTournamentStore(state => state.endGame);
  const deleteGame = useTournamentStore(state => state.deleteGame);

  // Use the passed-in onEditGame handler
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
      {tournament.games.map((game) => (
        <div key={game.id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-2">
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
                  <span>{game.players.filter(p => !p.eliminated).length} en jeu / {game.players.length} total</span>
                </div>
              </div>

              <div className="flex space-x-6 text-gray-600">
                <div className="flex items-center">
                  <Coins className="w-5 h-5 mr-2 text-poker-gold" />
                  <span>Stack: {game.startingStack.toLocaleString()}</span>
                </div>
                <div className="flex items-center">
                  <Timer className="w-5 h-5 mr-2 text-poker-gold" />
                  <span>Niveaux: {game.blindLevels}min</span>
                </div>
              </div>

              <div className="text-gray-600">
                Blinds: {game.blinds.small}/{game.blinds.big}
              </div>
            </div>

            <div className="flex space-x-2">
              {game.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleEditGame(game)}
                    className="bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200 transition-colors flex items-center"
                  >
                    <Edit2 className="w-5 h-5 mr-2" />
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      // Ensure players have eliminated=false when starting
                      const startingPlayers: Player[] = tournament.registrations.map(p => ({
                        id: p.id,
                        name: p.name,
                        nickname: p.nickname,
                        eliminated: false, // Explicitly set eliminated to false
                        eliminationTime: null // Explicitly set eliminationTime to null
                      }));
                      startGame(tournament.id, game.id, startingPlayers);
                      onViewGame(game.id); // View game after starting
                    }}
                    className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
                    disabled={tournament.registrations.length < 2} // Check registrations length
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Démarrer
                  </button>
                  {userId && (
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors flex items-center"
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      Supprimer
                    </button>
                  )}
                </>
              )}

              {game.status === 'in_progress' && (
                <>
                  <button
                    onClick={() => onViewGame(game.id)} // Use onViewGame with ID
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors flex items-center"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Voir la table
                  </button>
                  <button
                    onClick={() => handleEndGame(game.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors flex items-center"
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    Arrêter
                  </button>
                </>
              )}

              {/* Added button for viewing ended game summary */}
              {game.status === 'ended' && (
                <button
                  onClick={() => onViewGame(game.id)} // Use onViewGame with ID
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Voir Résumé
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
