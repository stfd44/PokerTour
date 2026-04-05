import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTournamentStore } from '../../store/tournamentStore';
import { useTeamStore } from '../../store/useTeamStore'; 
import type { Tournament } from '../../store/types/tournamentTypes'; 
import { Calendar, Users, MapPin, Check, X, ChevronDown, ChevronUp, PlayCircle, Trash2, Edit, User, Info, Award, PlusCircle } from 'lucide-react'; 
import { useAuthStore } from '../../store/useAuthStore';
import { Modal } from '../common/Modal';
import { CreateTournament } from './CreateTournament';

// Helper function to get status text and color
const getStatusInfo = (status: Tournament['status']) => {
  switch (status) {
    case 'scheduled':
      return { text: 'Prévu', color: 'bg-blue-500', icon: <Calendar className="w-4 h-4 mr-1" /> };
    case 'in_progress':
      return { text: 'En cours', color: 'bg-green-500', icon: <PlayCircle className="w-4 h-4 mr-1" /> };
    case 'ended':
      return { text: 'Terminé', color: 'bg-gray-500', icon: <Check className="w-4 h-4 mr-1" /> };
    default:
      return { text: 'Inconnu', color: 'bg-gray-400', icon: <Info className="w-4 h-4 mr-1" /> };
  }
};


export function TournamentList() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tournaments, registerToTournament, unregisterFromTournament, startTournament, fetchTournaments, deleteTournament, validateTournamentInvitation } = useTournamentStore();
  const { teams } = useTeamStore(); // Get teams state
  const [registrationStates, setRegistrationStates] = useState<{[key: string]: 'pending' | 'confirmed' | 'none'}>({});
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmDeleteTournamentId, setConfirmDeleteTournamentId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch tournaments if user is logged in.
    // The fetchTournaments action internally checks the team state.
    // Depending on 'teams' ensures this runs again if the user's teams change.
    // Pass user.uid to satisfy the type checker, even if the implementation might ignore it.
    if (user) {
        fetchTournaments(user.uid);
    }
  }, [fetchTournaments, user, teams]); // Depend on user and teams
 
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreateModalOpen(true);
      // Remove the parameter from URL without refreshing
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleRegistration = async (tournamentId: string) => {
      if (user) {
          const isAlreadyRegistered = tournaments.find(t => t.id === tournamentId)?.registrations.some(p => p.id === user.uid);

          if(isAlreadyRegistered){
              setRegistrationStates(prev => {
                const updatedStates = { ...prev };
                delete updatedStates[tournamentId];
                return updatedStates;
              });
          } else {
             setRegistrationStates(prev => ({ ...prev, [tournamentId]: 'pending' }));
            await new Promise(resolve => setTimeout(resolve, 1000));
            registerToTournament(tournamentId, user.uid, { id: user.uid, name: user.displayName ?? "User" });
            setRegistrationStates(prev => ({ ...prev, [tournamentId]: 'confirmed' }));
          }
      }
  };

  const handleUnregistration = async (tournamentId: string) => {
      if (user) {
          await unregisterFromTournament(tournamentId, user.uid);
          setRegistrationStates(prev => ({ ...prev, [tournamentId]: 'none' }));
      }
  };

  const handleValidateInvitation = async (tournamentId: string) => {
      if (user) {
          await validateTournamentInvitation(tournamentId, user.uid);
      }
  };

  const handleStartTournament = (tournamentId: string) => {
    if (user) {
        startTournament(tournamentId, user.uid);
        navigate(`/tournament/${tournamentId}`);
    }
  };

  const toggleTournamentExpansion = (tournamentId: string) => {
    setExpandedTournaments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tournamentId)) {
        newSet.delete(tournamentId);
      } else {
        newSet.add(tournamentId);
      }
      return newSet;
    });
  };

  const handleDeleteTournament = (tournamentId: string) => {
    if (user) {
      setConfirmDeleteTournamentId(tournamentId);
    }
  };

  const confirmDeleteTournament = async () => {
    if (user && confirmDeleteTournamentId) {
      try {
        await deleteTournament(confirmDeleteTournamentId, user.uid);
      } catch (error) {
        console.error('Error deleting tournament:', error);
        alert((error as Error).message);
      } finally {
        setConfirmDeleteTournamentId(null);
      }
    }
  };

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Aucun tournoi n'est programmé pour le moment.</p>
      </div>
    );
  }

  // Sort tournaments with custom logic
  const sortedTournaments = tournaments
    .map(tournament => {
      // Find the last ended game to use as the actual tournament end date
      const lastEndedGame = tournament.games
        .filter(game => game.status === 'ended')
        .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0))[0];
      
      return {
        tournament,
        sortPriority: tournament.status === 'scheduled' ? 3 :
                       tournament.status === 'in_progress' ? 2 :
                       1,
        sortDate: lastEndedGame ? (lastEndedGame.endedAt || 0) : new Date(tournament.date).getTime()
      };
    })
    .sort((a, b) =>
      a.sortPriority !== b.sortPriority
        ? b.sortPriority - a.sortPriority
        : b.sortDate - a.sortDate
    )
    .map(item => item.tournament);

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-poker-black">Tournois</h2>
            <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
            >
                <PlusCircle className="w-5 h-5 mr-2" />
                Créer un tournoi
            </button>
        </div>
        <div className="grid gap-6">
      {sortedTournaments.map((tournament) => {
        const userRegistration = user ? tournament.registrations.find(p => p.id === user.uid) : null;
        const isRegistered = !!userRegistration;
        const isInvited = userRegistration?.status === 'invited';
        const registrationState = registrationStates[tournament.id];
        const isFull = tournament.registrations.length >= tournament.maxPlayers;
        const isExpanded = expandedTournaments.has(tournament.id);
        const canStart = tournament.status === 'scheduled' && tournament.registrations.length >= 2;
        const isStarted = tournament.status === 'in_progress';
        const isEnded = tournament.status === 'ended';
        const isCreator = user?.uid === tournament.creatorId;
        const statusInfo = getStatusInfo(tournament.status);

        return (
          <div key={tournament.id} className="bg-white rounded-lg shadow-md p-6">
            {/* Top Header Section */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-poker-black mb-1">{tournament.name}</h3>
                <span className={`inline-flex items-center text-white px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {statusInfo.text}
                </span>
              </div>
              <span className="bg-poker-red text-white px-3 py-1 rounded-full text-sm shrink-0">
                {tournament.buyin}€
              </span>
            </div>

            {/* Main Content: Details + Buttons (Responsive Layout) */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">

              {/* Details Section */}
              <div className="space-y-2 text-gray-600 flex-grow min-w-0">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-poker-gold shrink-0" />
                  <span>
                    {tournament.date && !isNaN(new Date(tournament.date).getTime()) 
                      ? new Date(tournament.date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
                      : 'Date à définir'
                    }
                  </span>
                </div>
                <div
                  className="flex items-center cursor-pointer hover:text-poker-gold transition-colors"
                  onClick={() => toggleTournamentExpansion(tournament.id)}
                >
                  {isExpanded ? <ChevronUp className="w-5 h-5 mr-2 text-poker-gold shrink-0" /> : <ChevronDown className="w-5 h-5 mr-2 text-poker-gold shrink-0" />}
                  <Users className="w-5 h-5 mr-2 text-poker-gold shrink-0" />
                  <span>{tournament.registrations.length} / {tournament.maxPlayers} joueurs</span>
                </div>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-48' : 'max-h-0'}`}>
                  <div className="pl-9 pt-2 space-y-1">
                    {tournament.registrations.length > 0 ? (
                      tournament.registrations.map((player, index) => (
                        <div key={player.id} className={`flex items-center text-sm py-1 ${player.status === 'invited' ? 'text-orange-500' : 'text-gray-700'}`}>
                          <span className="w-6 text-poker-gold shrink-0">{index + 1}.</span>
                          <span className="truncate">{player.nickname || player.name}</span>
                          {player.status === 'invited' && (
                            <span className="ml-2 text-xs italic opacity-80">(En attente)</span>
                          )}
                          {user && player.id === user.uid && (
                            <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full shrink-0">Vous</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">Aucun joueur inscrit</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-poker-gold shrink-0" />
                  <span>{tournament.location}</span>
                </div>
                <div className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-poker-gold shrink-0" />
                  <span>Prize min: {tournament.buyin * tournament.registrations.length}€</span>
                </div>
                {tournament.creatorNickname && (
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <User className="w-4 h-4 mr-2 text-poker-gold shrink-0" />
                    <span>Organisé par : {tournament.creatorNickname}</span>
                  </div>
                )}
              </div> {/* End Details Section */}

              {/* Button Container Section: Stacks vertically, centers items below sm, aligns end sm+ */}
              <div className="flex flex-col items-center sm:items-end space-y-2 shrink-0 w-full sm:w-auto">

                {/* Top Row Buttons */}
                <div className="flex flex-wrap gap-2 w-full justify-center sm:justify-end">
                  {(isStarted || isEnded) && (
                    <button
                      onClick={() => navigate(`/tournament/${tournament.id}`)}
                      className="w-full sm:w-auto bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center justify-center" // Added w-full sm:w-auto justify-center
                    >
                      <PlayCircle className="w-5 h-5 mr-2" />
                      {isEnded ? 'Voir le résumé' : 'Accéder au tournoi'}
                    </button>
                  )}
                  {!isStarted && !isEnded && isCreator && canStart && (
                    <button
                      onClick={() => handleStartTournament(tournament.id)}
                      className="w-full sm:w-auto bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center justify-center" // Added w-full sm:w-auto justify-center
                    >
                      <PlayCircle className="w-5 h-5 mr-2" />
                      Débuter le tournoi
                    </button>
                  )}
                </div>

                {/* Bottom Row Buttons */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 w-full justify-center sm:justify-end">
                  {tournament.status === 'scheduled' && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2"> {/* Inner wrap */}
                      {isRegistered ? (
                        <>
                          {isInvited ? (
                            <button
                              onClick={() => handleValidateInvitation(tournament.id)}
                              className="w-full sm:w-auto bg-orange-500 text-white px-4 py-2 rounded transition-colors flex items-center justify-center hover:bg-orange-600"
                            >
                              <Check className="w-5 h-5 mr-1" />
                              Valider l'invitation
                            </button>
                          ) : (
                            <span className="flex items-center text-green-600">
                              <Check className="w-5 h-5 mr-1" />
                              Inscrit
                            </span>
                          )}
                          {!isCreator && (
                            <button
                              onClick={() => handleUnregistration(tournament.id)}
                              className="flex items-center text-red-600 hover:text-red-700"
                            >
                              <X className="w-5 h-5 mr-1" />
                              Se désinscrire
                            </button>
                          )}
                        </>
                      ) : registrationState === 'pending' ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-poker-gold mr-2"></div>
                          Inscription en cours...
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRegistration(tournament.id)}
                          disabled={isFull}
                          className={`w-full sm:w-auto bg-poker-gold text-white px-4 py-2 rounded transition-colors flex items-center justify-center ${isFull ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-600'}`} // Added w-full sm:w-auto justify-center
                        >
                          {isFull ? 'Complet' : 'Rejoindre'}
                        </button>
                      )}
                    </div>
                  )}
                  {/* Admin Buttons */}
                  {/* Condition updated: Delete button visible for creator regardless of status */}
                  {isCreator && (
                    <button
                      onClick={() => handleDeleteTournament(tournament.id)}
                      className="w-full sm:w-auto bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-2 rounded flex items-center justify-center" // Added w-full sm:w-auto justify-center
                      title="Supprimer le tournoi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {isCreator && (tournament.status === 'scheduled' || tournament.status === 'in_progress') && (
                    <button
                      onClick={() => navigate(`/tournament/${tournament.id}/edit`)}
                      className="w-full sm:w-auto bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-2 rounded flex items-center justify-center" // Added w-full sm:w-auto justify-center
                      title="Modifier le tournoi / Gérer les invités"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div> {/* End Button Container Section */}

            </div> {/* End Main Content */}
          </div>
        );
      })}
        </div>

        {confirmDeleteTournamentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-auto shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Supprimer le tournoi ?</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer ce tournoi ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteTournamentId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteTournament}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors font-medium"
              >
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}
        <Modal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)}
          title="Nouveau Tournoi"
        >
          <CreateTournament 
            onClose={() => setIsCreateModalOpen(false)} 
            onSuccess={() => setIsCreateModalOpen(false)} 
          />
        </Modal>
    </div>
  );
}
