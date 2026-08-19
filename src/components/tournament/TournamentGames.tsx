import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'; // Import useLocation, useNavigate, Link
import { useTournamentStore } from '../../store/tournamentStore';
import { GameForm } from './GameForm';
import { GameView } from './GameView';
import { GameList } from './GameList';
import { useAuthStore } from '../../store/useAuthStore';
import type { Game, Tournament } from '../../store/types/tournamentTypes';
import { FlagOff, Calendar, User, Users, MapPin, Award, Check, X, ChevronDown, ChevronUp, Edit, Calculator } from 'lucide-react';
import { Modal } from '../common/Modal';

// Helper function to get status text and color (copied from TournamentList for consistency)
const getStatusInfo = (status: Tournament['status']) => {
  switch (status) {
    case 'scheduled':
      return { text: 'Prévu', color: 'badge-blue' };
    case 'in_progress':
      return { text: 'En cours', color: 'badge-green' };
    case 'ended':
      return { text: 'Terminé', color: 'badge-gray' };
    default:
      return { text: 'Inconnu', color: 'badge-gray' };
  }
};

export function TournamentGames() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  // Get necessary state and actions from the store
  const {
    tournaments,
    fetchTournamentById, // Added action
    subscribeToTournament, // Added action
    isLoadingTournament, // Added loading state
    endTournament: endTournamentAction,
    registerToTournament,
    unregisterFromTournament,
    validateTournamentInvitation
  } = useTournamentStore(state => ({
    tournaments: state.tournaments,
    fetchTournamentById: state.fetchTournamentById, // Get the action
    subscribeToTournament: state.subscribeToTournament, // Get the action
    isLoadingTournament: state.isLoadingTournament, // Get the loading state
    endTournament: state.endTournament,
    registerToTournament: state.registerToTournament,
    unregisterFromTournament: state.unregisterFromTournament,
    validateTournamentInvitation: state.validateTournamentInvitation,
  }));
  // Find the tournament in the current state
  const tournament = tournaments.find(t => t.id === tournamentId);
  const { user } = useAuthStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [viewingGameId, setViewingGameId] = useState<string | null>(null);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false); // State for participant list expansion
  const [registrationStates, setRegistrationStates] = useState<{[key: string]: 'pending' | 'confirmed' | 'none'}>({}); // State for reg buttons
  const location = useLocation();
  const navigate = useNavigate();
  const [showConfirmEndTournament, setShowConfirmEndTournament] = useState(false);

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

  // Effect to subscribe to tournament data for real-time updates
  useEffect(() => {
    if (!tournamentId) return;

    console.log(`Subscribing to tournament ${tournamentId} for real-time updates...`);
    const unsubscribe = subscribeToTournament(tournamentId);

    // Initial fetch if not in store (optional as onSnapshot will fire immediately)
    if (!tournament && !isLoadingTournament) {
      fetchTournamentById(tournamentId);
    }

    return () => {
      console.log(`Unsubscribing from tournament ${tournamentId}.`);
      unsubscribe();
    };
  }, [tournamentId, subscribeToTournament, fetchTournamentById, !!tournament, isLoadingTournament]);

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
  const handleEndTournament = () => {
    if (!tournamentId || !user?.uid) return;
    setShowConfirmEndTournament(true);
  };

  const confirmEndTournament = async () => {
    if (!tournamentId || !user?.uid) return;
    setShowConfirmEndTournament(false);
    try {
      await endTournamentAction(tournamentId, user.uid);
    } catch (error) {
      console.error("Error ending tournament from component:", error);
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

  const handleValidateInvitation = async () => {
      if (user && tournamentId) {
          await validateTournamentInvitation(tournamentId, user.uid);
      }
  };
  // --- End Registration Handlers ---

  // Add checks for undefined tournamentId or tournament
  // --- Loading and Not Found States ---
  if (!tournamentId) {
      return <div className="text-center py-12"><p className="text-red-600">ID de tournoi manquant dans l'URL.</p></div>;
  }

  // Show loading indicator if actively fetching
  if (isLoadingTournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-300">Chargement du tournoi...</p>
      </div>
    );
  }

  // Show not found if loading is finished but tournament is still not found
  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-300">Tournoi introuvable.</p>
        {/* Optional: Add a link back to the tournaments list */}
        <Link to="/tournaments" className="text-poker-gold hover:underline mt-4 inline-block">Retour à la liste</Link>
      </div>
    );
  }
  // --- End Loading and Not Found States ---

  // Determine the current game being viewed using the ID and the live tournament data from the store
  const gameToView = viewingGameId ? tournament.games.find(g => g.id === viewingGameId) : null;

  const userRegistration = user ? tournament.registrations.find(p => p.id === user.uid) : null;
  const isRegistered = !!userRegistration;
  const isInvited = userRegistration?.status === 'invited';

  return (
    <div className="max-w-4xl mx-auto">
        <>
          {/* --- Tournament Header --- */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 space-y-4 sm:space-y-0">
            <h1 className="text-3xl font-bold text-white drop-shadow-sm">
              {tournament.name}
            </h1>
            {/* The action buttons have been moved to the details card */}
          </div>

          {/* --- Tournament Details Section --- */}
          <div className="glass-card p-4 mb-6 relative">
            {/* Edit Icon Button - Top Right */}
            {user?.uid === tournament.creatorId && (tournament.status === 'scheduled' || tournament.status === 'in_progress') && (
                <Link
                    to={`/tournament/${tournament.id}/edit`}
                    className="absolute top-4 right-4 text-gray-400 hover:text-poker-gold transition-colors"
                    title="Modifier le tournoi / Gérer les invités"
                >
                    <Edit className="h-6 w-6" />
                </Link>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-200">
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
                 <div className={`badge ${getStatusInfo(tournament.status).color}`}>
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
              <div className="border-t border-white/10 pt-3 mt-3 space-y-1 max-h-52 overflow-y-auto">
                {tournament.registrations.length > 0 ? (
                  tournament.registrations.map((player, index) => (
                    <div key={player.id} className={`flex items-center text-sm py-1 px-2 ${player.status === 'invited' ? 'text-orange-400' : 'text-gray-200'}`}>
                      <span className="w-6 text-poker-gold shrink-0">{index + 1}.</span>
                      <span className="truncate">{player.nickname || player.name}</span>
                      {player.status === 'invited' && (
                        <span className="ml-2 text-xs italic opacity-80">(En attente)</span>
                      )}
                      {user && player.id === user.uid && (
                        <span className="badge badge-green ml-2 shrink-0">Vous</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic px-2">Aucun joueur inscrit</p>
                )}
              </div>
            </div>
            {/* --- Action Buttons Container --- */}
            <div className="border-t border-white/10 mt-4 pt-4 flex flex-wrap items-center justify-end gap-4">
                {/* Bilan Button - visible to team members if tournament is settled */}
                {tournament.status === 'ended' && (
                  <Link
                    to={`/tournament/${tournament.id}/settle`}
                    className="btn btn-blue"
                    title="Faire le bilan"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Faire le bilan
                  </Link>
                )}

                {/* Registration Buttons (Visible if tournament not ended and user is not creator) */}
                {tournament.status !== 'ended' && user?.uid !== tournament.creatorId && (
                    <>
                        {isRegistered ? (
                             <>
                               {isInvited ? (
                                 <button
                                   onClick={handleValidateInvitation}
                                   className="btn btn-orange"
                                 >
                                   <Check className="w-5 h-5 mr-1" />
                                   Valider l'invitation
                                 </button>
                               ) : (
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center text-green-400">
                                        <Check className="w-5 h-5 mr-1" />
                                        Inscrit
                                    </span>
                                    <button
                                        onClick={handleUnregistration}
                                        className="btn btn-red"
                                    >
                                        <X className="w-5 h-5 mr-1" />
                                        Se désinscrire
                                    </button>
                                </div>
                               )}
                             </>
                            ) : registrationStates[tournamentId] === 'pending' ? (
                                <div className="flex items-center text-gray-300">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-poker-gold mr-2"></div>
                                    Inscription en cours...
                                </div>
                            ) : (
                                <button
                                    onClick={handleRegistration}
                                    disabled={tournament.registrations.length >= tournament.maxPlayers}
                                    className="btn btn-gold"
                                >
                                    {tournament.registrations.length >= tournament.maxPlayers ? 'Complet' : 'S\'inscrire'}
                                </button>
                            )}
                        </>
                )}

                {/* Game/Tournament Action Buttons for registered players */}
                {!isCreating && !viewingGameId && tournament.status !== 'ended' && tournament.registrations.some(p => p.id === user?.uid) && (
                  <button
                    onClick={handleCreateGameClick}
                    className="btn btn-gold"
                  >
                    Nouvelle partie
                  </button>
                )}
                {tournament.registrations.some(p => p.id === user?.uid) && tournament.status === 'in_progress' && !isCreating && !viewingGameId && (
                  <button
                    onClick={handleEndTournament}
                    className="btn btn-red"
                    title="Terminer le tournoi (irréversible)"
                  >
                    <FlagOff className="w-4 h-4 mr-2" />
                    Terminer Tournoi
                  </button>
                )}
            </div>
            {/* --- End Action Buttons Container --- */}
          </div>
          {/* --- End Tournament Details Section --- */}


          {/* Show GameForm in a Modal if creating or editing */}
          <Modal
            isOpen={isCreating}
            onClose={handleCloseFormOrView}
            title={editingGame ? 'Modifier la partie' : 'Nouvelle partie'}
          >
            <GameForm
              tournament={tournament}
              editingGame={editingGame}
              tournamentId={tournamentId}
              onClose={handleCloseFormOrView}
            />
          </Modal>

          <GameList
            tournament={tournament}
            onViewGame={handleViewGame}
            onEditGame={handleEditGame} // Pass edit handler
            userId={user?.uid} // Pass potentially undefined userId
          />
        </>

      {viewingGameId && gameToView && createPortal(
        <div className="fixed inset-0 z-[180] flex items-start sm:items-center justify-center p-3 sm:p-6">
          <div className="modal-backdrop" onClick={() => setViewingGameId(null)} />
          <div className="modal-gold-wash" aria-hidden="true" />
          <div className="modal-sheet w-full max-w-4xl max-h-[min(92vh,calc(100dvh-1.5rem))] overflow-y-auto">
            <GameView
              gameId={viewingGameId}
              tournamentId={tournamentId}
              onClose={() => setViewingGameId(null)}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal for Ending Tournament */}
      {showConfirmEndTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="glass-card p-6 max-w-md w-full mx-auto">
            <h3 className="text-lg font-bold text-white mb-2">Terminer le tournoi ?</h3>
            <p className="text-gray-300 mb-6">
              Êtes-vous sûr de vouloir terminer le tournoi "{tournament?.name}" ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmEndTournament(false)}
                className="btn btn-ghost"
              >
                Annuler
              </button>
              <button
                onClick={confirmEndTournament}
                className="btn btn-red"
              >
                Oui, terminer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
