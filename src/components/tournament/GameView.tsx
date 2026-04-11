import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import { useTournamentStore } from '../../store/tournamentStore';
import { StopCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore'; // Import auth store
import { GameTimer } from './GameTimer';
import { GameSummary } from './GameSummary';
import { GamePlayersPanel } from './GamePlayersPanel';
import { GameBlindsPanel } from './GameBlindsPanel';
import { GamePrizePoolPanel } from './GamePrizePoolPanel';
import { Users, DollarSign, Settings2, X } from 'lucide-react';

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
  
  // Local state
  const [rebuyLoading, setRebuyLoading] = useState<string | null>(null);
  const [rebuyError, setRebuyError] = useState<string | null>(null);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [animationEndTime, setAnimationEndTime] = useState<number | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showConfirmEndGame, setShowConfirmEndGame] = useState(false);
  const [playerToEliminateFinal, setPlayerToEliminateFinal] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'players' | 'blinds' | 'prizePool' | null>(null);

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

  useEffect(() => {
    const shouldLockScroll = !!activePanel || showConfirmEndGame || !!playerToEliminateFinal;
    if (!shouldLockScroll) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [activePanel, showConfirmEndGame, playerToEliminateFinal]);

  const startVictoryAnimation = (winner: string) => {
    // Set winner name
    setWinnerName(winner);
    // Set animation end time to 5 seconds from now
    setAnimationEndTime(Date.now() + 5000);
    // Ensure all panels are closed
    setActivePanel(null);
  };

  const performElimination = async (playerId: string) => {
    if (!game) return;
    try {
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
    } catch (error) {
      console.error("Error performing player elimination:", error);
    }
  };

  const handlePlayerElimination = async (playerId: string, isCurrentlyEliminated: boolean | undefined) => {
    if (!game) return;
    
    try {
      if (isCurrentlyEliminated) {
        await reinstatePlayer(tournamentId, gameId, playerId);
      } else {
        const activePlayers = game.players.filter(p => !p.eliminated);
        // If 2 active players remaining, eliminating one means the game ends
        if (activePlayers.length === 2 && !isCurrentlyEliminated) {
          setPlayerToEliminateFinal(playerId);
          return;
        }
        
        await performElimination(playerId);
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
    setShowConfirmEndGame(true);
  };

  const canManageGame = !!user && (
    game?.players.some((p) => p.id === user.uid) ||
    tournament?.creatorId === user.uid
  );

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
    <div className="bg-white rounded-lg shadow-md p-6 relative">
      {/* Victory Animation */}
      {winnerName && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={true}
            numberOfPieces={500}
            gravity={0.2}
            colors={['#FFD700', '#FFA500', '#FF4500', '#FF6347', '#00BFFF', '#1E90FF', '#9370DB', '#32CD32']}
            opacity={isFadingOut ? 0 : 1}
            tweenDuration={500}
          />
          <div className={`absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className="animate-bounce mb-4">
              <p className="text-white text-3xl font-bold mb-2">🏆 FÉLICITATIONS 🏆</p>
            </div>
            <div className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 p-8 rounded-lg shadow-2xl transform transition-transform duration-500 animate-wiggle scale-110">
              <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 shadow-sm">
                {winnerName}
              </p>
            </div>
            <p className="text-white text-2xl mt-8 animate-pulse font-medium">a remporté la partie !</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-poker-black">Table en cours</h2>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {/* Only show End Game button if user is a participant */}
          {game.status === 'in_progress' && canManageGame && (
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

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        <button
          onClick={() => setActivePanel('players')}
          className="flex flex-col items-center justify-center p-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
        >
          <Users className="w-6 h-6 mb-1" />
          <span className="text-sm font-medium">Joueurs</span>
        </button>
        <button
          onClick={() => setActivePanel('prizePool')}
          className="flex flex-col items-center justify-center p-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
        >
          <DollarSign className="w-6 h-6 mb-1" />
          <span className="text-sm font-medium">Prize Pool</span>
        </button>
        <button
          onClick={() => setActivePanel('blinds')}
          className="flex flex-col items-center justify-center p-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors border border-amber-200"
        >
          <Settings2 className="w-6 h-6 mb-1" />
          <span className="text-sm font-medium">Réglages</span>
        </button>
      </div>

      {/* activePanel modal */}
      {activePanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-end sm:items-center z-50 p-0 sm:p-4 pb-20 sm:pb-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up sm:animate-fade-in relative z-50">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                {activePanel === 'players' && 'Gestion des Joueurs'}
                {activePanel === 'blinds' && 'Réglages de la partie'}
                {activePanel === 'prizePool' && 'Prize Pool'}
              </h2>
              <button
                onClick={() => setActivePanel(null)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              {activePanel === 'players' && (
                <GamePlayersPanel 
                  game={game} 
                  tournamentId={tournamentId} 
                  gameId={gameId} 
                  canManageGame={canManageGame}
                  onEliminate={handlePlayerElimination}
                  onRebuy={handleRebuy}
                  rebuyLoading={rebuyLoading}
                  rebuyError={rebuyError}
                />
              )}
              {activePanel === 'blinds' && (
                <GameBlindsPanel
                  game={game}
                  tournamentId={tournamentId}
                  gameId={gameId}
                  canManageGame={canManageGame}
                />
              )}
              {activePanel === 'prizePool' && tournament && (
                <GamePrizePoolPanel
                  game={game}
                  tournament={tournament}
                  canManageGame={canManageGame}
                  onClose={() => setActivePanel(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showConfirmEndGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-auto shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Arrêter la partie ?</h3>
            <p className="text-gray-600 mb-6 flex flex-col gap-2">
              <span>Voulez-vous vraiment arrêter cette partie en cours ?</span>
              <span className="bg-orange-50 text-orange-800 p-2 rounded text-sm">⚠️ Les joueurs restants seront classés à égalité et se partageront les gains restants.</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmEndGame(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowConfirmEndGame(false);
                  endGame(tournamentId, gameId);
                }}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors font-medium"
              >
                Oui, l'arrêter
              </button>
            </div>
          </div>
        </div>
      )}

      {playerToEliminateFinal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-auto shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Dernière élimination ?</h3>
            <p className="text-gray-600 mb-6 flex flex-col gap-2">
              <span>Êtes-vous sûr de vouloir éliminer ce joueur ?</span>
              <span className="bg-red-50 text-red-800 p-2 rounded text-sm font-medium">⚠️ Cela mettra immédiatement fin à la partie.</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPlayerToEliminateFinal(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const playerId = playerToEliminateFinal;
                  setPlayerToEliminateFinal(null);
                  performElimination(playerId);
                }}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors font-medium"
              >
                Oui, l'éliminer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
