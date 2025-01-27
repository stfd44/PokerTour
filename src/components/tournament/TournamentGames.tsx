import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTournamentStore } from '../../store/tournamentStore';
import { Plus, Users, Timer, Coins, PlayCircle, CheckCircle, UserCheck, UserX, Edit2, Eye, Clock, UserMinus, StopCircle } from 'lucide-react';
import type { Game, Player } from '../../store/tournamentStore';

interface GameTimer {
  timeLeft: string;
  currentBlinds: { small: number; big: number };
  nextBlinds: { small: number; big: number };
}

interface GameForm {
  startingStack: number;
  blinds: {
    small: number;
    big: number;
  };
  blindLevels: number;
  players: Player[];
}

const initialGameForm: GameForm = {
  startingStack: 10000,
  blinds: {
    small: 25,
    big: 50
  },
  blindLevels: 20,
  players: []
};

export function TournamentGames() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const tournament = useTournamentStore(state => 
    state.tournaments.find(t => t.id === tournamentId)
  );
  const addGame = useTournamentStore(state => state.addGame);
  const startGame = useTournamentStore(state => state.startGame);
  const updateGame = useTournamentStore(state => state.updateGame);
  const endGame = useTournamentStore(state => state.endGame);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameForm, setGameForm] = useState<GameForm>(initialGameForm);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [viewingGame, setViewingGame] = useState<Game | null>(null);
  const [gameTimers, setGameTimers] = useState<Record<string, GameTimer>>({});

  const resetForm = () => {
    setGameForm(initialGameForm);
    setSelectedPlayers(new Set());
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setGameForm({
      startingStack: game.startingStack,
      blinds: { ...game.blinds },
      blindLevels: game.blindLevels,
      players: [...game.players]
    });
    setSelectedPlayers(new Set(game.players.map(p => p.id)));
    setIsCreating(true);
  };

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlayersList = tournament!.registrations.filter(
      player => selectedPlayers.has(player.id)
    );

    if (editingGame) {
      updateGame(tournamentId!, editingGame.id, {
        ...gameForm,
        players: selectedPlayersList
      });
    } else {
      addGame(tournamentId!, {
        ...gameForm,
        players: selectedPlayersList
      });
    }

    setIsCreating(false);
    resetForm();
    setEditingGame(null);
  };

  const handlePlayerElimination = (gameId: string, playerId: string) => {
    const game = tournament!.games.find(g => g.id === gameId);
    if (!game) return;

    const updatedPlayers = game.players.map(player =>
      player.id === playerId
        ? { ...player, eliminated: !player.eliminated }
        : player
    );

    // Mettre à jour le store
    updateGame(tournamentId!, gameId, { players: updatedPlayers });

    // Mettre à jour l'état local du jeu en cours de visualisation
    if (viewingGame && viewingGame.id === gameId) {
      setViewingGame({
        ...viewingGame,
        players: updatedPlayers
      });
    }

    // Vérifier s'il ne reste qu'un seul joueur actif
    const activePlayers = updatedPlayers.filter(p => !p.eliminated);
    if (activePlayers.length === 1) {
      handleEndGame(gameId, `${activePlayers[0].name} remporte la partie !`);
    }
  };

  const handleEndGame = (gameId: string, message?: string) => {
    endGame(tournamentId!, gameId);
    
    // Mettre à jour l'état local
    if (viewingGame && viewingGame.id === gameId) {
      setViewingGame(null);
    }

    // Afficher un message de fin si fourni
    if (message) {
      alert(message);
    }
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  // Fonction pour calculer les blindes du niveau suivant
  const calculateNextBlinds = (currentSmall: number, currentBig: number): { small: number; big: number } => {
    return {
      small: currentSmall * 2,
      big: currentBig * 2
    };
  };

  // Effet pour gérer les timers de toutes les parties en cours
  useEffect(() => {
    if (!tournament) return;

    const activeGames = tournament.games.filter(game => game.status === 'in_progress');
    const intervals: NodeJS.Timeout[] = [];

    activeGames.forEach(game => {
      const interval = setInterval(() => {
        if (!game.startedAt) return;

        const startTime = new Date(game.startedAt).getTime();
        const now = new Date().getTime();
        const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
        const currentLevel = Math.floor(elapsedMinutes / game.blindLevels);
        const nextLevelTime = (currentLevel + 1) * game.blindLevels * 60 * 1000;
        const timeToNextLevel = nextLevelTime - (now - startTime);
        
        const minutes = Math.floor(timeToNextLevel / (1000 * 60));
        const seconds = Math.floor((timeToNextLevel % (1000 * 60)) / 1000);
        
        const currentBlinds = {
          small: game.blinds.small * Math.pow(2, currentLevel),
          big: game.blinds.big * Math.pow(2, currentLevel)
        };

        const nextBlinds = calculateNextBlinds(currentBlinds.small, currentBlinds.big);

        setGameTimers(prev => ({
          ...prev,
          [game.id]: {
            timeLeft: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            currentBlinds,
            nextBlinds
          }
        }));
      }, 1000);

      intervals.push(interval);
    });

    return () => intervals.forEach(clearInterval);
  }, [tournament]);

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Tournoi introuvable</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {viewingGame ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-poker-black">Table en cours</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleEndGame(viewingGame.id)}
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

          {gameTimers[viewingGame.id] && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-6 h-6 text-poker-gold mr-2" />
                  <div>
                    <div className="text-sm text-gray-600">Temps restant niveau</div>
                    <div className="text-2xl font-bold">{gameTimers[viewingGame.id].timeLeft}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Blindes actuelles</div>
                  <div className="text-xl font-semibold">
                    {gameTimers[viewingGame.id].currentBlinds.small}/
                    {gameTimers[viewingGame.id].currentBlinds.big}
                  </div>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="text-sm text-gray-600">Prochaines blindes</div>
                <div className="text-lg text-poker-gold">
                  {gameTimers[viewingGame.id].nextBlinds.small}/
                  {gameTimers[viewingGame.id].nextBlinds.big}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Joueurs</h3>
            <div className="grid gap-3">
              {viewingGame.players.map((player) => (
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
                      {player.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handlePlayerElimination(viewingGame.id, player.id)}
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
      ) : (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-poker-black">
              {tournament.name} - Parties
            </h1>
            <button
              onClick={() => {
                setIsCreating(true);
                setEditingGame(null);
                resetForm();
              }}
              className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouvelle partie
            </button>
          </div>

          {isCreating && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-poker-black mb-4">
                {editingGame ? 'Modifier la partie' : 'Créer une nouvelle partie'}
              </h2>
              <form onSubmit={handleCreateGame} className="space-y-6">
                <div>
                  <label htmlFor="startingStack" className="block text-sm font-medium text-gray-700 mb-1">
                    Stack de départ
                  </label>
                  <input
                    type="number"
                    id="startingStack"
                    value={gameForm.startingStack}
                    onChange={(e) => setGameForm(prev => ({
                      ...prev,
                      startingStack: parseInt(e.target.value)
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                    min="1000"
                    step="1000"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="smallBlind" className="block text-sm font-medium text-gray-700 mb-1">
                      Petite blind
                    </label>
                    <input
                      type="number"
                      id="smallBlind"
                      value={gameForm.blinds.small}
                      onChange={(e) => setGameForm(prev => ({
                        ...prev,
                        blinds: {
                          ...prev.blinds,
                          small: parseInt(e.target.value)
                        }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                      min="5"
                      step="5"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="bigBlind" className="block text-sm font-medium text-gray-700 mb-1">
                      Grosse blind
                    </label>
                    <input
                      type="number"
                      id="bigBlind"
                      value={gameForm.blinds.big}
                      onChange={(e) => setGameForm(prev => ({
                        ...prev,
                        blinds: {
                          ...prev.blinds,
                          big: parseInt(e.target.value)
                        }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                      min="10"
                      step="10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="blindLevels" className="block text-sm font-medium text-gray-700 mb-1">
                    Durée des niveaux (minutes)
                  </label>
                  <input
                    type="number"
                    id="blindLevels"
                    value={gameForm.blindLevels}
                    onChange={(e) => setGameForm(prev => ({
                      ...prev,
                      blindLevels: parseInt(e.target.value)
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                    min="5"
                    step="5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Joueurs à la table
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {tournament.registrations.map((player) => (
                      <label
                        key={player.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPlayers.has(player.id)
                            ? 'bg-poker-gold/10 border-poker-gold'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlayers.has(player.id)}
                          onChange={() => togglePlayer(player.id)}
                          className="sr-only"
                        />
                        <UserCheck className={`w-5 h-5 mr-2 ${
                          selectedPlayers.has(player.id) ? 'text-poker-gold' : 'text-gray-400'
                        }`} />
                        <span className="text-sm">{player.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      resetForm();
                      setEditingGame(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-poker-gold text-white px-6 py-2 rounded hover:bg-yellow-600 transition-colors"
                  >
                    {editingGame ? 'Mettre à jour' : 'Créer la partie'}
                  </button>
                </div>
              </form>
            </div>
          )}

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
                          onClick={() => startGame(tournamentId!, game.id, game.players)}
                          className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
                          disabled={game.players.length < 2}
                        >
                          <PlayCircle className="w-5 h-5 mr-2" />
                          Démarrer
                        </button>
                      </>
                    )}

                    {game.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => setViewingGame(game)}
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
        </>
      )}
    </div>
  );
}