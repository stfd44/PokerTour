import React from 'react'; // Removed useState and useEffect
import { useTournamentStore } from '../../store/tournamentStore';
import { StopCircle, UserCheck, UserX, UserMinus } from 'lucide-react';
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
  const endGame = useTournamentStore(state => state.endGame);
  // Removed local gameTimer state, GameTimer will use the game prop directly

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
        <div className="flex justify-end mb-4">
           <button
             onClick={onClose} // Use onClose prop
             className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
           >
             Retour aux parties
           </button>
         </div>
        <GameSummary game={game} /> {/* Pass the fetched game object */}
      </div>
    );
  }

  // Render active game view if status is 'in_progress' or 'pending' (though pending shouldn't really be viewable here)
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-poker-black">Table en cours</h2>
        <div className="flex items-center space-x-4">
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
          <button
            onClick={onClose} // Use onClose prop
            className="text-gray-600 hover:text-gray-800"
          >
            Retour aux parties
          </button>
        </div>
      </div>

      {/* Pass the game prop directly to GameTimer */}
      {game.status === 'in_progress' && <GameTimer game={game} />}

      <div className="space-y-4 mt-6">
        <h3 className="text-xl font-semibold text-gray-800">Joueurs</h3>
        <div className="grid gap-3">
          {game.players.map((player) => (
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
              {/* Disable button if game is not in progress */}
              <button
                onClick={() => handlePlayerElimination(player.id, player.eliminated)}
                disabled={game.status !== 'in_progress'}
                className={`px-3 py-1 rounded-md text-sm flex items-center transition-colors ${
                  player.eliminated
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                } ${game.status !== 'in_progress' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
