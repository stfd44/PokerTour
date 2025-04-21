import React, { useState, useEffect } from 'react'; // Import useEffect
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'; // Import useLocation, useNavigate, Link
import { useTournamentStore } from '../../store/tournamentStore';
import { GameForm } from './GameForm';
import { GameView } from './GameView';
import { GameList } from './GameList';
import { useAuthStore } from '../../store/useAuthStore';
import type { Game, Tournament } from '../../store/types/tournamentTypes'; // Correct import path for Game type, Add Tournament type
import { FlagOff, Calendar, User, Users, MapPin, Award, Check, X, ChevronDown, ChevronUp, Edit } from 'lucide-react'; // Import icons

// Helper function to get status text and color (copied from TournamentList for consistency)
const getStatusInfo = (status: Tournament['status']) => {
  switch (status) {
    case 'scheduled':
      return { text: 'Prévu', color: 'bg-blue-500' };
    case 'in_progress':
      return { text: 'En cours', color: 'bg-green-500' };
    case 'ended':
      return { text: 'Terminé', color: 'bg-gray-500' };
    default:
      return { text: 'Inconnu', color: 'bg-gray-400' };
  }
};

export function TournamentGames() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const {
    tournaments,
    endTournament: endTournamentAction,
    registerToTournament,
    unregisterFromTournament
  } = useTournamentStore(state => ({
    tournaments: state.tournaments,
    endTournament: state.endTournament,
    registerToTournament: state.registerToTournament,
    unregisterFromTournament: state.unregisterFromTournament,
  }));
  const tournament = tournaments.find(t => t.id === tournamentId);
  const { user } = useAuthStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [viewingGameId, setViewingGameId] = useState<string | null>(null);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false); // State for participant list expansion
  const [registrationStates, setRegistrationStates] = useState<{[key: string]: 'pending' | 'confirmed' | 'none'}>({}); // State for reg buttons
  const location = useLocation();
  const navigate = useNavigate();

  // Effect to reset view state when navigating back via breadcrumb with state
  useEffect(() => {
    // Check if navigation state contains the resetView flag
    if (location.state?.resetView) {
      console.log("Resetting view state due to navigation state..."); // Debug log
      setViewingGameId(null);
      setIsCreating(false);
      setEditingGame(null);
      // Clear the state from history to prevent reset on refresh/re-render
      navigate('.', { replace: true, state: {} });
    }
    // Dependency array includes location.state
  }, [location.state, navigate]); // Add navigate to dependency array

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

  // --- Registration Handlers (similar to TournamentList) ---
  const handleRegistration = async () => {
      if (user && tournamentId) {
          setRegistrationStates(prev => ({ ...prev, [tournamentId]: 'pending' }));
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
          // Fix: Pass nickname as string | undefined
          await registerToTournament(tournamentId, user.uid, { id: user.uid, name: user.displayName ?? "User" }, user.nickname || undefined);
          setRegistrationStates(prev => ({ ...prev, [tournamentId]: 'confirmed' }));
      }
  };

  const handleUnregistration = async () => {
      if (user && tournamentId) {
          await unregisterFromTournament(tournamentId, user.uid);
          setRegistrationStates(prev => ({ ...prev, [tournamentId]: 'none' }));
      }
  };
  // --- End Registration Handlers ---

  // Add checks for undefined tournamentId or tournament
  if (!tournamentId) {
      return <div className="text-center py-12"><p className="text-red-600">ID de tournoi manquant dans l'URL.</p></div>;
  }
  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Tournoi introuvable ou chargement...</p>
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
          {/* --- Tournament Header --- */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 space-y-4 sm:space-y-0">
            <h1 className="text-3xl font-bold text-poker-black">
              {tournament.name}
            </h1>
            {/* Game/Tournament Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-end">
              {!isCreating && !viewingGameId && tournament.status !== 'ended' && user?.uid === tournament.creatorId && (
                <button
                  onClick={handleCreateGameClick}
                  className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
                >
                  Nouvelle partie
                </button>
              )}
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

          {/* --- Tournament Details Section --- */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              {/* Left Column */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-poker-gold shrink-0" />
                  <span>{new Date(tournament.date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-poker-gold shrink-0" />
                  <span>{tournament.location}</span>
                </div>
                {tournament.creatorNickname && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-poker-gold shrink-0" />
                    <span>Organisé par : {tournament.creatorNickname}</span>
                  </div>
                )}
                 <div className={`inline-flex items-center text-white px-2 py-0.5 rounded text-xs font-medium ${getStatusInfo(tournament.status).color}`}>
                    {getStatusInfo(tournament.status).text}
                 </div>
              </div>
              {/* Right Column */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold mr-2">Buy-in:</span> {tournament.buyin}€
                </div>
                <div className="flex items-center">
                  <Award className="w-4 h-4 mr-2 text-poker-gold shrink-0" />
                  <span className="font-semibold mr-1">Prize min:</span> {tournament.buyin * tournament.registrations.length}€
                </div>
                <div
                  className="flex items-center cursor-pointer hover:text-poker-gold transition-colors"
                  onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}
                >
                  {isParticipantsExpanded ? <ChevronUp className="w-4 h-4 mr-2 text-poker-gold shrink-0" /> : <ChevronDown className="w-4 h-4 mr-2 text-poker-gold shrink-0" />}
                  <Users className="w-4 h-4 mr-2 text-poker-gold shrink-0" />
                  <span>{tournament.registrations.length} / {tournament.maxPlayers} joueurs</span>
                </div>
              </div>
            </div>
            {/* Collapsible Participant List */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isParticipantsExpanded ? 'max-h-60 mt-4' : 'max-h-0'}`}>
              <div className="border-t pt-3 mt-3 space-y-1 max-h-52 overflow-y-auto">
                {tournament.registrations.length > 0 ? (
                  tournament.registrations.map((player, index) => (
                    <div key={player.id} className="flex items-center text-sm py-1 px-2">
                      <span className="w-6 text-poker-gold">{index + 1}.</span>
                      <span>{player.nickname || player.name}</span>
                      {user && player.id === user.uid && (
                        <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Vous</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic px-2">Aucun joueur inscrit</p>
                )}
              </div>
            </div>
            {/* --- Action Buttons Container --- */}
            <div className="border-t mt-4 pt-4 flex flex-wrap items-center justify-end gap-4">
                {/* Edit Button (Visible only to creator, regardless of status) */}
                {user?.uid === tournament.creatorId && (
                    <Link
                        to={`/tournament/${tournament.id}/edit`}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
                        title="Modifier le tournoi / Gérer les invités"
                    >
                        <Edit className="h-4 w-4 mr-2" /> Modifier
                    </Link>
                )}

                {/* Registration Buttons (Visible if tournament not ended and user is not creator) */}
                {tournament.status !== 'ended' && user?.uid !== tournament.creatorId && (
                    <>
                        {tournament.registrations.some(p => p.id === user?.uid) ? (
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center text-green-600">
                                        <Check className="w-5 h-5 mr-1" />
                                        Inscrit
                                    </span>
                                    <button
                                        onClick={handleUnregistration}
                                        className="flex items-center text-red-600 hover:text-red-700"
                                    >
                                        <X className="w-5 h-5 mr-1" />
                                        Se désinscrire
                                    </button>
                                </div>
                            ) : registrationStates[tournamentId] === 'pending' ? (
                                <div className="flex items-center text-gray-600">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-poker-gold mr-2"></div>
                                    Inscription en cours...
                                </div>
                            ) : (
                                <button
                                    onClick={handleRegistration}
                                    disabled={tournament.registrations.length >= tournament.maxPlayers}
                                    className={`bg-poker-gold text-white px-4 py-2 rounded transition-colors flex items-center ${tournament.registrations.length >= tournament.maxPlayers ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-600'}`}
                                >
                                    {tournament.registrations.length >= tournament.maxPlayers ? 'Complet' : 'S\'inscrire'}
                                </button>
                            )}
                        </>
                )}
            </div>
            {/* --- End Action Buttons Container --- */}
          </div>
          {/* --- End Tournament Details Section --- */}


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
