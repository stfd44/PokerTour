import React, { useState } from 'react'; // Added useState for handling loading/errors on rebuy
import { useTournamentStore } from '../../store/tournamentStore';
import { StopCircle, UserCheck, UserX, UserMinus, RefreshCcw } from 'lucide-react'; // Added RefreshCcw for rebuy icon
// Removed unused Game type import
import { GameTimer } from './GameTimer';
import { GameSummary } from './GameSummary'; // Import GameSummary

interface GameViewProps {
  gameId: string; // Changed from game object to ID
  tournamentId: string;
  onClose: () => void; // Changed from setViewingGame
}

export function GameView({ gameId, tournamentId, onClose }: GameViewProps) {
  // Select the specific game from the store using the IDs
  const game = useTournamentStore(state =>
    state.tournaments.find(t => t.id === tournamentId)?.games.find(g => g.id === gameId)
  );

  // Use new store actions
  const eliminatePlayer = useTournamentStore(state => state.eliminatePlayer);
  const reinstatePlayer = useTournamentStore(state => state.reinstatePlayer);
  const rebuyPlayer = useTournamentStore(state => state.rebuyPlayer); // Add rebuyPlayer action
  const endGame = useTournamentStore(state => state.endGame);
  const [rebuyLoading, setRebuyLoading] = useState<string | null>(null); // Track loading state per player for rebuy
  const [rebuyError, setRebuyError] = useState<string | null>(null); // Track error state for rebuy

  const handlePlayerElimination = async (playerId: string, isCurrentlyEliminated: boolean | undefined) => {
    // Ensure game exists before proceeding
    if (!game) return;
    try {
      if (isCurrentlyEliminated) {
        await reinstatePlayer(tournamentId, gameId, playerId);
      } else {
        await eliminatePlayer(tournamentId, gameId, playerId);
        // Check if game should end *after* elimination is processed
        // The component will re-render with the updated game state from the store selector
        // We can check the updated state directly here after await
        const updatedGameFromStore = useTournamentStore.getState().tournaments.find(t => t.id === tournamentId)?.games.find(g => g.id === gameId);

        if (updatedGameFromStore) {
            const activePlayers = updatedGameFromStore.players.filter(p => !p.eliminated);
            if (activePlayers.length === 1) {
                // Call handleEndGame only if the game hasn't already been marked as ended
                // (to prevent multiple calls if clicks are rapid)
                if (updatedGameFromStore.status !== 'ended') { // Corrected variable name
                   handleEndGame(`${activePlayers[0].name} remporte la partie !`);
                }
            }
             // Trigger a re-render manually if needed, although Zustand should handle this.
             // Forcing a state update on the parent might be necessary if direct prop update isn't working.
             // Example (if setViewingGame could accept the updated game): setViewingGame({...updatedGame});
        }
      }
      // No need for setViewingGame here if Zustand handles re-render correctly
    } catch (error) {
        console.error("Error handling player elimination/reinstatement:", error);
        // Handle error display if needed
    }
  };

  const handleRebuy = async (playerId: string) => {
    if (!game) return;
    setRebuyLoading(playerId); // Set loading for this specific player
    setRebuyError(null); // Clear previous errors
    try {
      await rebuyPlayer(tournamentId, gameId, playerId);
    } catch (error: unknown) { // Type error as unknown
      console.error("Error handling rebuy:", error);
      // Check if error is an instance of Error before accessing message
      if (error instanceof Error) {
        setRebuyError(error.message);
      } else {
        setRebuyError("Une erreur inconnue est survenue lors du rebuy.");
      }
    } finally {
      setRebuyLoading(null); // Clear loading state regardless of success/failure
    }
  };

  const handleEndGame = (message?: string) => {
    // Ensure game exists before proceeding
    if (!game) return;
    endGame(tournamentId, gameId); // Use gameId
    // Don't call onClose here, let the user click the button
    if (message) {
      alert(message); // Consider a less intrusive notification
    }
  };

  // Handle case where game data is not found (e.g., loading or invalid ID)
  if (!game) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Chargement de la partie...</p>
        <button onClick={onClose} className="mt-4 text-blue-600 hover:underline">Retour</button>
      </div>
    );
  }

  // Conditional Rendering based on game status
  if (game.status === 'ended') {
    return (
      <div>
        {/* Removed the "Retour aux parties" button from here */}
        <GameSummary game={game} /> {/* Pass the fetched game object */}
      </div>
    );
  }

  // Render active game view if status is 'in_progress' or 'pending' (though pending shouldn't really be viewable here)
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Responsive Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-poker-black">Table en cours</h2>
        {/* Responsive Button Group */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {/* Show Stop button only if game is in progress */}
          {game.status === 'in_progress' && (
            <button
              onClick={() => handleEndGame()}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors flex items-center"
            >
              <StopCircle className="w-5 h-5 mr-2" />
              Arrêter la partie
            </button>
          )}
          {/* Removed the second "Retour aux parties" button from here */}
        </div>
      </div>

      {/* Pass the game prop directly to GameTimer */}
      {game.status === 'in_progress' && <GameTimer game={game} />}

      {/* Display Rebuy Info */}
      {game.status === 'in_progress' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
          Rebuy autorisé jusqu'à la fin du niveau {game.rebuyAllowedUntilLevel}.
          Total Rebuys: {game.totalRebuys} ({game.totalRebuys * game.rebuyAmount} €)
        </div>
      )}
       {/* Display Rebuy Error */}
       {rebuyError && (
         <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md text-sm text-red-700">
           Erreur Rebuy: {rebuyError}
         </div>
       )}


      <div className="space-y-4 mt-6">
        <h3 className="text-xl font-semibold text-gray-800">Joueurs</h3>
        <div className="grid gap-3">
          {game.players.map((player) => {
            const canRebuy = player.eliminated && game.status === 'in_progress' && game.currentLevel < game.rebuyAllowedUntilLevel;
            const isLoadingRebuy = rebuyLoading === player.id;

            return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                player.eliminated
                  ? 'bg-red-50 border-red-200 opacity-60' // Added opacity for eliminated
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
              {/* Responsive Player Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {/* Rebuy Button - Show only if player eliminated and rebuys allowed */}
                {canRebuy && (
                  <button
                    onClick={() => handleRebuy(player.id)}
                    disabled={isLoadingRebuy}
                    className={`px-3 py-1 rounded-md text-sm flex items-center transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-wait`}
                  >
                    <RefreshCcw className={`w-4 h-4 mr-1 ${isLoadingRebuy ? 'animate-spin' : ''}`} />
                    {isLoadingRebuy ? '...' : `Rebuy (${game.rebuyAmount}€)`}
                  </button>
                )}
                {/* Eliminate/Reinstate Button */}
                <button
                  onClick={() => handlePlayerElimination(player.id, player.eliminated)}
                  disabled={game.status !== 'in_progress' || isLoadingRebuy} // Disable if rebuy is loading for this player too
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
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}
