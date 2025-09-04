import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import { useTournamentStore } from '../../store/tournamentStore';
import { StopCircle, UserCheck, UserX, UserMinus, RefreshCcw, Edit } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore'; // Import auth store
import { GameTimer } from './GameTimer';
import { GameSummary } from './GameSummary';

interface GameViewProps {
  gameId: string;
  tournamentId: string;
  onClose: () => void;
}

export function GameView({ gameId, tournamentId, onClose }: GameViewProps) {
  const tournament = useTournamentStore(state =>
    state.tournaments.find(t => t.id === tournamentId)
  );
  const game = tournament?.games.find(g => g.id === gameId);
  const { user } = useAuthStore(); // Get current user

  // Use store actions
  const eliminatePlayer = useTournamentStore(state => state.eliminatePlayer);
  const reinstatePlayer = useTournamentStore(state => state.reinstatePlayer);
  const rebuyPlayer = useTournamentStore(state => state.rebuyPlayer);
  const endGame = useTournamentStore(state => state.endGame);
  const updateBlinds = useTournamentStore(state => state.updateBlinds);
  const resetLevelTimer = useTournamentStore(state => state.resetLevelTimer);
  const updateLevelDuration = useTournamentStore(state => state.updateLevelDuration);
  
  // Local state
  const [rebuyLoading, setRebuyLoading] = useState<string | null>(null);
  const [rebuyError, setRebuyError] = useState<string | null>(null);
  const [newSmallBlind, setNewSmallBlind] = useState('');
  const [newBigBlind, setNewBigBlind] = useState('');
  const [newLevelDuration, setNewLevelDuration] = useState('');
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [animationEndTime, setAnimationEndTime] = useState<number | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Effect to get container dimensions for confetti
  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      });
    }

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effect to check if animation should end
  useEffect(() => {
    if (!animationEndTime) return;

    // Set a timer to start fading out 500ms before the end
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 4500); // 5000ms - 500ms = 4500ms

    // Set a timer to completely remove the animation
    const endTimer = setTimeout(() => {
      setWinnerName(null);
      setAnimationEndTime(null);
      setIsFadingOut(false);
    }, 5000);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(endTimer);
    };
  }, [animationEndTime]);

  // Effect to pre-fill next level's settings in the input fields
  useEffect(() => {
    if (!game) return;

    const nextLevel = game.currentLevel + 1;
    const nextBlinds = game.blindStructure?.[nextLevel];
    const nextDuration = game.levelDurations?.[nextLevel];

    if (nextBlinds) {
      setNewSmallBlind(nextBlinds.small.toString());
      setNewBigBlind(nextBlinds.big.toString());
    } else {
      // Propose doubling the current blinds if next level isn't set
      const currentBlinds = game.blindStructure?.[game.currentLevel];
      if (currentBlinds) {
        setNewSmallBlind((currentBlinds.small * 2).toString());
        setNewBigBlind((currentBlinds.big * 2).toString());
      }
    }

    if (nextDuration) {
      setNewLevelDuration(nextDuration.toString());
    } else {
      // Propose using the current duration if next level's isn't set
      const currentDuration = game.levelDurations?.[game.currentLevel];
      if (currentDuration) {
        setNewLevelDuration(currentDuration.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.currentLevel]);


  const startVictoryAnimation = (winner: string) => {
    // Set winner name
    setWinnerName(winner);
    // Set animation end time to 5 seconds from now
    setAnimationEndTime(Date.now() + 5000);
  };

  const handlePlayerElimination = async (playerId: string, isCurrentlyEliminated: boolean | undefined) => {
    if (!game) return;
    
    try {
      if (isCurrentlyEliminated) {
        await reinstatePlayer(tournamentId, gameId, playerId);
      } else {
        await eliminatePlayer(tournamentId, gameId, playerId);
        
        // Check if game should end after elimination
        const updatedGame = useTournamentStore.getState()
          .tournaments.find(t => t.id === tournamentId)
          ?.games.find(g => g.id === gameId);
        
        if (updatedGame) {
          const activePlayers = updatedGame.players.filter(p => !p.eliminated);
          
          if (activePlayers.length === 1 && updatedGame.status !== 'ended') {
            const winner = activePlayers[0];
            const winnerDisplayName = winner.nickname || winner.name;
            
            // Start victory animation
            startVictoryAnimation(winnerDisplayName);
            
            // End the game in the store
            endGame(tournamentId, gameId);
          }
        }
      }
    } catch (error) {
      console.error("Error handling player elimination/reinstatement:", error);
    }
  };

  const handleRebuy = async (playerId: string) => {
    if (!game) return;
    
    setRebuyLoading(playerId);
    setRebuyError(null);
    
    try {
      await rebuyPlayer(tournamentId, gameId, playerId);
    } catch (error: unknown) {
      console.error("Error handling rebuy:", error);
      
      if (error instanceof Error) {
        setRebuyError(error.message);
      } else {
        setRebuyError("Une erreur inconnue est survenue lors du rebuy.");
      }
    } finally {
      setRebuyLoading(null);
    }
  };

  const handleEndGame = () => {
    if (!game || game.status === 'ended') return;
    endGame(tournamentId, gameId);
  };

  const handleUpdateBlinds = () => {
    if (!user || !game) return;
    const small = parseInt(newSmallBlind, 10);
    const big = parseInt(newBigBlind, 10);
    if (isNaN(small) || isNaN(big) || small <= 0 || big <= small) {
        alert("Veuillez entrer des blinds valides (la grosse blind doit être supérieure à la petite).");
        return;
    }
    updateBlinds(tournamentId, gameId, { small, big }, user.uid);
    updateBlinds(tournamentId, gameId, { small, big }, user.uid);
  };

  const handleUpdateDuration = () => {
    if (!user || !game) return;
    const duration = parseInt(newLevelDuration, 10);
    if (isNaN(duration) || duration <= 0) {
        alert("Veuillez entrer une durée valide en minutes.");
        return;
    }
    updateLevelDuration(tournamentId, gameId, duration, user.uid);
    updateLevelDuration(tournamentId, gameId, duration, user.uid);
  };

  const handleResetTimer = () => {
    if (!user || !game) return;
    resetLevelTimer(tournamentId, gameId, user.uid);
  };

  // Handle loading state
  if (!game || !tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Chargement de la partie...</p>
        <button onClick={onClose} className="mt-4 text-blue-600 hover:underline">Retour</button>
      </div>
    );
  }

  // Show game summary if game is ended
  if (game.status === 'ended' && !winnerName) {
    return (
      <div>
        <GameSummary game={game} />
      </div>
    );
  }

  // Render active game view
  return (
    <div ref={containerRef} className="bg-white rounded-lg shadow-md p-6 relative">
      {/* Victory Animation */}
      {winnerName && (
        <>
          <Confetti
            width={dimensions.width || 500}
            height={dimensions.height || 500}
            recycle={true}
            numberOfPieces={500}
            gravity={0.2}
            colors={['#FFD700', '#FFA500', '#FF4500', '#FF6347', '#00BFFF', '#1E90FF', '#9370DB', '#32CD32']}
            opacity={isFadingOut ? 0 : 1}
            tweenDuration={500}
          />
          <div className={`absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-10 rounded-lg transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className="animate-bounce mb-4">
              <p className="text-white text-xl font-bold mb-2">🏆 FÉLICITATIONS 🏆</p>
            </div>
            <div className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 p-6 rounded-lg shadow-lg transform transition-transform duration-500 animate-wiggle scale-110">
              <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-red-500">
                {winnerName}
              </p>
            </div>
            <p className="text-white text-lg mt-4 animate-pulse">a remporté la partie !</p>
          </div>
        </>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-poker-black">Table en cours</h2>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {/* Only show End Game button if user is a participant */}
          {game.status === 'in_progress' && user && game.players.some(p => p.id === user.uid) && (
            <button
              onClick={handleEndGame}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors flex items-center"
            >
              <StopCircle className="w-5 h-5 mr-2" />
              Arrêter la partie
            </button>
          )}
        </div>
      </div>

      {/* Game Timer - Pass participation status */}
      {game.status === 'in_progress' && (
        <GameTimer
          game={game}
          isCurrentUserParticipant={user ? game.players.some(p => p.id === user.uid) : false}
        />
      )}

      {/* Admin Controls - Only for players in the game */}
      {game.status === 'in_progress' && user && game.players.some(p => p.id === user.uid) && game.blindStructure && game.blindStructure.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Edit className="w-5 h-5 mr-2" />
            Contrôles de la partie
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Blinds Control for NEXT level */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Blinds (Niveau {game.currentLevel + 2})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={`SB: ${game.blindStructure[game.currentLevel]?.small * 2}`}
                  value={newSmallBlind}
                  onChange={(e) => setNewSmallBlind(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <input
                  type="number"
                  placeholder={`BB: ${game.blindStructure[game.currentLevel]?.big * 2}`}
                  value={newBigBlind}
                  onChange={(e) => setNewBigBlind(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <button
                  onClick={handleUpdateBlinds}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  disabled={!newSmallBlind || !newBigBlind}
                >
                  Définir
                </button>
              </div>
            </div>

            {/* Level Duration Control for NEXT level */}
            <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-700">
                Durée (Niveau {game.currentLevel + 2})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={`${game.levelDurations?.[game.currentLevel]} min`}
                  value={newLevelDuration}
                  onChange={(e) => setNewLevelDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <button
                  onClick={handleUpdateDuration}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  disabled={!newLevelDuration}
                >
                  Définir
                </button>
              </div>
            </div>
          </div>
            
          <div className="mt-4 flex flex-wrap gap-2">
             <button onClick={handleResetTimer} className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300">Réinit. Timer</button>
          </div>
        </div>
      )}

      {/* Rebuy Info */}
      {game.status === 'in_progress' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
          Rebuy autorisé jusqu'à la fin du niveau {game.rebuyAllowedUntilLevel}.
          Total Rebuys: {game.totalRebuys} ({game.totalRebuys * game.rebuyAmount} €)
        </div>
      )}
      
      {/* Rebuy Error */}
      {rebuyError && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md text-sm text-red-700">
          Erreur Rebuy: {rebuyError}
        </div>
      )}

      {/* Players List */}
      <div className="space-y-4 mt-6">
        <h3 className="text-xl font-semibold text-gray-800">Joueurs</h3>
        <div className="grid gap-3">
          {game.players.map((player) => {
            const canRebuy = player.eliminated && 
                            game.status === 'in_progress' && 
                            game.currentLevel < game.rebuyAllowedUntilLevel;
            const isLoadingRebuy = rebuyLoading === player.id;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  player.eliminated
                    ? 'bg-red-50 border-red-200 opacity-60'
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

                {/* Player Actions - Only show if current user is a participant */}
                {user && game.players.some(p => p.id === user.uid) && (
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    {/* Rebuy Button */}
                    {canRebuy && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRebuy(player.id)}
                          disabled={isLoadingRebuy}
                          className={`px-3 py-1 rounded-md text-sm flex items-center transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-wait`}
                        >
                          <RefreshCcw className={`w-4 h-4 mr-1 ${isLoadingRebuy ? 'animate-spin' : ''}`} />
                          {isLoadingRebuy ? '...' : `Rebuy (${game.rebuyAmount}€)`}
                        </button>
                      </div>
                    )}

                    {/* Eliminate/Reinstate Button */}
                    <button
                      onClick={() => handlePlayerElimination(player.id, player.eliminated)}
                      disabled={game.status !== 'in_progress' || isLoadingRebuy}
                      className={`px-3 py-1 rounded-md text-sm flex items-center transition-colors ${
                        player.eliminated
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      } ${game.status !== 'in_progress' || isLoadingRebuy ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
