import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTournamentStore } from '../../store/tournamentStore';
import { GameForm } from './GameForm';
import { GameView } from './GameView';
import { GameList } from './GameList';
import { useAuthStore } from '../../store/useAuthStore';
import type { Game } from '../../store/tournamentStore'; // Keep for GameForm prop type
import { FlagOff } from 'lucide-react'; // Import icon for end tournament button

export function TournamentGames() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const tournament = useTournamentStore(state =>
   state.tournaments.find(t => t.id === tournamentId)
  );
  const endTournamentAction = useTournamentStore(state => state.endTournament); // Get endTournament action
  const { user } = useAuthStore(); // Keep only one declaration

  const [isCreating, setIsCreating] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null); // Keep editingGame as object for form population
  const [viewingGameId, setViewingGameId] = useState<string | null>(null); // Store only the ID

  const handleCreateGameClick = () => {
    setIsCreating(true);
    setEditingGame(null); // Clear any potential game being edited
    setViewingGameId(null); // Ensure not viewing a game while creating
  };

  // Function to handle setting the game to view
  const handleViewGame = (gameId: string) => {
    setViewingGameId(gameId);
    setIsCreating(false); // Ensure not creating while viewing
    setEditingGame(null); // Ensure not editing while viewing
  };

  // Function to handle setting the game to edit
  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setIsCreating(true); // Show the form for editing
    setViewingGameId(null); // Ensure not viewing while editing
  };

  // Function to close form/view
  const handleCloseFormOrView = () => {
    setIsCreating(false);
    setEditingGame(null);
    setViewingGameId(null);
  };

  // Handler for ending the tournament
  const handleEndTournament = async () => {
    if (!tournamentId || !user?.uid) return;
    if (window.confirm(`Êtes-vous sûr de vouloir terminer le tournoi "${tournament?.name}" ? Cette action est irréversible.`)) {
      try {
        await endTournamentAction(tournamentId, user.uid);
        // Optionally navigate away or show a success message
        alert('Tournoi terminé avec succès.');
      } catch (error) {
        // Error handling is done within the store action, but you could add specific UI feedback here
        console.error("Error ending tournament from component:", error);
      }
    }
  };

  // Add checks for undefined tournamentId or tournament
  if (!tournamentId) {
      return <div className="text-center py-12"><p className="text-red-600">ID de tournoi manquant dans l'URL.</p></div>;
  }
  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Tournoi introuvable ou chargement...</p> {/* Adjusted message */}
      </div>
    );
  }

  // Determine the current game being viewed using the ID and the live tournament data from the store
  const gameToView = viewingGameId ? tournament.games.find(g => g.id === viewingGameId) : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Conditionally render GameView if a game ID is set and the game exists */}
      {viewingGameId && gameToView ? (
        // Pass gameId and a function to clear the viewingGameId
        <GameView
          gameId={viewingGameId}
          tournamentId={tournamentId}
          onClose={() => setViewingGameId(null)} // Provide a way to close the view
        />
      ) : (
        // Otherwise, show the list and potentially the creation form
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-poker-black">
              {tournament.name} - Parties
            </h1>
            <div className="flex space-x-2"> {/* Container for buttons */}
              {/* Show create button only if not already creating/editing and tournament is not ended */}
              {!isCreating && tournament.status !== 'ended' && (
                <button
                  onClick={handleCreateGameClick}
                  className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
                >
                  Nouvelle partie
                </button>
              )}
              {/* Show End Tournament button only if user is creator and tournament is in_progress */}
              {user?.uid === tournament.creatorId && tournament.status === 'in_progress' && !isCreating && !viewingGameId && (
                <button
                  onClick={handleEndTournament}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors flex items-center"
                  title="Terminer le tournoi (irréversible)"
                >
                  <FlagOff className="w-4 h-4 mr-2" />
                  Terminer Tournoi
                </button>
              )}
            </div>
          </div>

          {/* Show GameForm if creating or editing */}
          {isCreating && (
            <GameForm
              tournament={tournament}
              // setIsCreating={setIsCreating} // Removed
              editingGame={editingGame}
              // setEditingGame={setEditingGame} // Removed
              tournamentId={tournamentId}
              // userId prop removed from GameForm
              onClose={handleCloseFormOrView} // Pass close handler
            />
          )}

          {/* Pass handlers for viewing and editing to GameList */}
          <GameList
            tournament={tournament}
            onViewGame={handleViewGame}
            onEditGame={handleEditGame} // Pass edit handler
            userId={user?.uid} // Pass potentially undefined userId
          />
        </>
      )}
    </div>
  );
}
