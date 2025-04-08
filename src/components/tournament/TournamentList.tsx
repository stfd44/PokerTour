import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Import Link
import { useTournamentStore, Tournament } from '../../store/tournamentStore'; // Import Tournament type
import { Calendar, Users, MapPin, Check, X, ChevronDown, ChevronUp, PlayCircle, Trash2, Edit, User, Info, Calculator } from 'lucide-react'; // Added Edit, User, Info, Calculator icons
import { useAuthStore } from '../../store/useAuthStore';

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
  const { tournaments, registerToTournament, unregisterFromTournament, startTournament, fetchTournaments, deleteTournament } = useTournamentStore();
  const [registrationStates, setRegistrationStates] = useState<{[key: string]: 'pending' | 'confirmed' | 'none'}>({});
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
        fetchTournaments(user.uid); // Pass userId to fetchTournaments
    }
}, [fetchTournaments, user]);

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

  const handleStartTournament = (tournamentId: string) => {
    if (user) {
        startTournament(tournamentId, user.uid);
        // Corrected path: remove '/app' prefix
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

  const handleDeleteTournament = async (tournamentId: string) => {
    if (user && window.confirm("Êtes-vous sûr de vouloir supprimer ce tournoi ?")) {
      try {
        await deleteTournament(tournamentId, user.uid);
      } catch (error) {
        console.error('Error deleting tournament:', error);
        alert((error as Error).message);
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

  return (
    <div className="grid gap-6">
      {tournaments.map((tournament) => {
        const isRegistered = user ? tournament.registrations.some(p => p.id === user.uid) : false;
        const registrationState = registrationStates[tournament.id];
        const isFull = tournament.registrations.length >= tournament.maxPlayers;
        const isExpanded = expandedTournaments.has(tournament.id);
        const canStart = tournament.status === 'scheduled' && tournament.registrations.length >= 2;
        const isStarted = tournament.status === 'in_progress';
        const isEnded = tournament.status === 'ended'; // Added isEnded
        const isCreator = user?.uid === tournament.creatorId;
        const statusInfo = getStatusInfo(tournament.status); // Get status info

        return (
          <div key={tournament.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-poker-black mb-1">{tournament.name}</h3>
                {/* Status Badge */}
                <span className={`inline-flex items-center text-white px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {statusInfo.text}
                </span>
              </div>
              <span className="bg-poker-red text-white px-3 py-1 rounded-full text-sm">
                {tournament.buyin}€
              </span>
            </div>
            
            <div className="space-y-2 text-gray-600">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-poker-gold" />
                <span>{new Date(tournament.date).toLocaleString('fr-FR', {
                  dateStyle: 'long',
                  timeStyle: 'short'
                })}</span>
              </div>
              
              <div 
                className="flex items-center cursor-pointer hover:text-poker-gold transition-colors"
                onClick={() => toggleTournamentExpansion(tournament.id)}
              >
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 mr-2 text-poker-gold" />
                ) : (
                  <ChevronDown className="w-5 h-5 mr-2 text-poker-gold" />
                )}
                <Users className="w-5 h-5 mr-2 text-poker-gold" />
                <span>{tournament.registrations.length} / {tournament.maxPlayers} joueurs</span>
              </div>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-h-48' : 'max-h-0'
              }`}>
                <div className="pl-9 pt-2 space-y-1">
                  {tournament.registrations.length > 0 ? (
                    tournament.registrations.map((player, index) => (
                      <div 
                        key={player.id}
                        className="flex items-center text-sm py-1"
                      >
                        <span className="w-6 text-poker-gold">{index + 1}.</span>
                <span>{player.nickname || player.name}</span>
                        {user && player.id === user.uid && (
                          <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                            Vous
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Aucun joueur inscrit
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-poker-gold" />
                <span>{tournament.location}</span>
              </div>
              {/* Display Organizer Nickname */}
              {tournament.creatorNickname && (
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <User className="w-4 h-4 mr-2 text-poker-gold" />
                  <span>Organisé par : {tournament.creatorNickname}</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div className="flex space-x-2"> {/* Wrap buttons in a div for spacing */}
                {/* Show "Accéder/Voir Résumé" button if started OR ended */}
                {(isStarted || isEnded) ? (
                  <button
                    onClick={() => navigate(`/tournament/${tournament.id}`)}
                    className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    {isEnded ? 'Voir le résumé' : 'Accéder au tournoi'}
                  </button>
                ) : null}
                {/* Show "Faire les comptes" button only if ended */}
                {isEnded && (
                  <Link
                    to={`/tournament/${tournament.id}/settle`}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Calculator className="w-5 h-5 mr-2" />
                    Faire les comptes
                  </Link>
                )}
                 {/* Show "Débuter" button only if creator and canStart and NOT started/ended */}
                 {!isStarted && !isEnded && isCreator && canStart && (
                  <button
                    onClick={() => handleStartTournament(tournament.id)}
                    className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Débuter le tournoi
                  </button>
                 )}
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Only show registration buttons if tournament is scheduled */}
                {tournament.status === 'scheduled' && (
                  <>
                    {isRegistered ? (
                      <>
                        <span className="flex items-center text-green-600">
                          <Check className="w-5 h-5 mr-1" />
                          Inscrit
                        </span>
                        {/* Hide unregister button if user is the creator */}
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
                        // Disable only if full (status check is handled by outer condition)
                        disabled={isFull}
                        className={`bg-poker-gold text-white px-4 py-2 rounded transition-colors ${
                          isFull
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-yellow-600'
                        }`}
                      >
                        {isFull ? 'Complet' : 'Rejoindre'}
                      </button>
                    )}
                  </>
                )}
                {/* Delete button: Show only if creator and scheduled */}
                {isCreator && tournament.status === 'scheduled' && (
                  <button
                    onClick={() => handleDeleteTournament(tournament.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-2 rounded flex items-center" // Adjusted padding
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {/* Edit Button - Show if creator and status is scheduled OR in_progress */}
                {isCreator && (tournament.status === 'scheduled' || tournament.status === 'in_progress') && (
                  <button
                    onClick={() => navigate(`/tournament/${tournament.id}/edit`)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-2 rounded flex items-center"
                    title="Modifier le tournoi / Gérer les invités" // Add title for clarity
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
