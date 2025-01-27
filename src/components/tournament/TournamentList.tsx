import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentStore } from '../../store/tournamentStore';
import { Calendar, Users, MapPin, Check, X, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';

// Simuler un joueur connecté (à remplacer par l'authentification réelle plus tard)
const CURRENT_USER = { id: 'user-1', name: 'Thomas Martin' };

export function TournamentList() {
  const navigate = useNavigate();
  const { tournaments, registerToTournament, unregisterFromTournament, startTournament } = useTournamentStore();
  const [registrationStates, setRegistrationStates] = useState<{[key: string]: 'pending' | 'confirmed' | 'none'}>({});
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set());

  const handleRegistration = async (tournamentId: string) => {
    setRegistrationStates(prev => ({ ...prev, [tournamentId]: 'pending' }));
    await new Promise(resolve => setTimeout(resolve, 1000));
    registerToTournament(tournamentId, CURRENT_USER);
    setRegistrationStates(prev => ({ ...prev, [tournamentId]: 'confirmed' }));
  };

  const handleUnregistration = (tournamentId: string) => {
    unregisterFromTournament(tournamentId, CURRENT_USER.id);
    setRegistrationStates(prev => ({ ...prev, [tournamentId]: 'none' }));
  };

  const handleStartTournament = (tournamentId: string) => {
    startTournament(tournamentId);
    navigate(`/tournament/${tournamentId}`);
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
        const isRegistered = tournament.registrations.some(p => p.id === CURRENT_USER.id);
        const registrationState = registrationStates[tournament.id];
        const isFull = tournament.registrations.length >= tournament.maxPlayers;
        const isExpanded = expandedTournaments.has(tournament.id);
        const canStart = tournament.status === 'scheduled' && tournament.registrations.length >= 2;
        const isStarted = tournament.status === 'in_progress';

        return (
          <div key={tournament.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-poker-black">{tournament.name}</h3>
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
                        <span>{player.name}</span>
                        {player.id === CURRENT_USER.id && (
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
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div>
                {isStarted ? (
                  <button
                    onClick={() => navigate(`/tournament/${tournament.id}`)}
                    className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Accéder au tournoi
                  </button>
                ) : canStart ? (
                  <button
                    onClick={() => handleStartTournament(tournament.id)}
                    className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Débuter le tournoi
                  </button>
                ) : null}
              </div>
              
              <div className="flex items-center space-x-4">
                {isRegistered ? (
                  <>
                    <span className="flex items-center text-green-600">
                      <Check className="w-5 h-5 mr-1" />
                      Inscrit
                    </span>
                    <button
                      onClick={() => handleUnregistration(tournament.id)}
                      className="flex items-center text-red-600 hover:text-red-700"
                    >
                      <X className="w-5 h-5 mr-1" />
                      Se désinscrire
                    </button>
                  </>
                ) : registrationState === 'pending' ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-poker-gold mr-2"></div>
                    Inscription en cours...
                  </div>
                ) : (
                  <button
                    onClick={() => handleRegistration(tournament.id)}
                    disabled={isFull || isStarted}
                    className={`bg-poker-gold text-white px-4 py-2 rounded transition-colors ${
                      isFull || isStarted
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-yellow-600'
                    }`}
                  >
                    {isFull ? 'Complet' : isStarted ? 'En cours' : 'Rejoindre'}
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