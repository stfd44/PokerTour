import React, { useEffect, useState, useCallback } from 'react';
import { useTeamStore, Team } from '../../store/useTeamStore';
// Import useAuthStore from the auth store (AppUser removed)
import { useAuthStore } from '../../store/useAuthStore';
import { Trash2, UserPlus, UserMinus, LogIn, Users } from 'lucide-react'; // Import LogIn and Users icons
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Remove TeamsProps interface and user prop
const Teams: React.FC = () => {
  // Get user directly from the store
  const { user } = useAuthStore();
  const { teams, createTeam, fetchTeams, leaveTeam, joinTeam, deleteTeam, joinTeamByTag } = useTeamStore();
  const [newTeamName, setNewTeamName] = useState('');
  const [joinTag, setJoinTag] = useState('');
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [memberDetails, setMemberDetails] = useState<{ [userId: string]: { name: string } }>({});
  const [loadingMemberDetails, setLoadingMemberDetails] = useState<boolean>(false);

  const fetchMemberDetails = useCallback(async (memberIds: string[]) => {
    setLoadingMemberDetails(true);
    const detailsToFetch = memberIds.filter(id => !memberDetails[id]);
    if (detailsToFetch.length === 0) {
      setLoadingMemberDetails(false);
      return;
    }

    const fetchedDetails: { [userId: string]: { name: string } } = {};
    try {
      const promises = detailsToFetch.map(async (id) => {
        const userDocRef = doc(db, 'users', id); // Assuming 'users' collection
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          // Assuming user doc has a 'displayName' field
          fetchedDetails[id] = { name: userDocSnap.data().nickname || userDocSnap.data().displayName || 'Utilisateur inconnu' };
        } else {
          fetchedDetails[id] = { name: 'Utilisateur inconnu' };
        }
      });
      await Promise.all(promises);
      setMemberDetails(prev => ({ ...prev, ...fetchedDetails }));
    } catch (error) {
      console.error("Error fetching member details:", error);
      // Set fallback names for failed fetches
      detailsToFetch.forEach(id => {
        if (!fetchedDetails[id]) {
          fetchedDetails[id] = { name: 'Erreur chargement' };
        }
      });
       setMemberDetails(prev => ({ ...prev, ...fetchedDetails }));
    } finally {
      setLoadingMemberDetails(false);
    }
  }, [memberDetails]); // Dependency on memberDetails to avoid refetching known users

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    const allMemberIds = teams.reduce((acc, team) => {
      team.members.forEach(id => acc.add(id));
      return acc;
    }, new Set<string>());

    if (allMemberIds.size > 0) {
      fetchMemberDetails(Array.from(allMemberIds));
    }
  }, [teams, fetchMemberDetails]); // Trigger fetch when teams change

  const handleCreateTeam = async () => {
    if (!user) {
      setJoinMessage({ type: 'error', text: 'Vous devez être connecté pour créer une équipe' });
      return;
    }
    
    if (newTeamName.trim() === '') {
      setJoinMessage({ type: 'error', text: 'Veuillez entrer un nom pour votre équipe' });
      return;
    }

    try {
      // Pass the user object to createTeam if needed by the store function
      // Assuming createTeam in the store now correctly uses useAuthStore.getState().user
      await createTeam(newTeamName); 
      setNewTeamName('');
      setJoinMessage({ type: 'success', text: 'Équipe créée avec succès!' });
      setTimeout(() => setJoinMessage(null), 3000);
    } catch (error) {
      setJoinMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erreur lors de la création de l\'équipe'
      });
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (user) {
      await leaveTeam(teamId, user.uid);
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    if (user) {
      await joinTeam(teamId, user.uid);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (user && window.confirm("Êtes-vous sûr de vouloir supprimer cette équipe ?")) {
      try {
        await deleteTeam(teamId, user.uid);
      } catch (error) {
        console.error('Error deleting team:', error);
        alert((error as Error).message);
      }
    }
  };

  const handleJoinByTag = async () => {
    if (joinTag.trim() === '') {
      setJoinMessage({ type: 'error', text: 'Veuillez entrer un tag d\'équipe.' });
      return;
    }
    setJoinMessage(null); // Clear previous messages
    try {
      // Pass the user object if needed by the store function
      // Assuming joinTeamByTag in the store now correctly uses useAuthStore.getState().user
      await joinTeamByTag(joinTag.trim()); 
      setJoinMessage({ type: 'success', text: 'Équipe rejointe avec succès !' });
      setJoinTag(''); // Clear input on success
      setTimeout(() => setJoinMessage(null), 3000); // Clear message after 3 seconds
    } catch (error) {
      if (error instanceof Error) {
        setJoinMessage({ type: 'error', text: error.message });
      } else {
        setJoinMessage({ type: 'error', text: 'Une erreur inconnue est survenue.' });
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gestion des Équipes</h1>

      {/* Create Team Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Créer une nouvelle équipe</h2>
        {/* Responsive Create Team Input/Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            placeholder="Nom de l'équipe"
            className="border border-gray-300 px-3 py-2 rounded-md flex-grow focus:ring-2 focus:ring-blue-500 focus:border-transparent" // Removed mr-2
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
          />
          <button
            onClick={handleCreateTeam}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center sm:justify-start" // Added w-full sm:w-auto, justify-center
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Créer
          </button>
        </div>
        {/* Display error message specifically for the create team action */}
        {joinMessage && joinMessage.type === 'error' && (
          <p className="text-sm mt-2 text-red-600">
            {joinMessage.text}
          </p>
        )}
      </div>

      {/* Join Team by Tag Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Rejoindre une équipe par Tag</h2>
        {/* Responsive Join Team Input/Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
          <input
            type="text"
            placeholder="Tag de l'équipe (ex: nom_equipe_1234)"
            className="border border-gray-300 px-3 py-2 rounded-md flex-grow focus:ring-2 focus:ring-green-500 focus:border-transparent" // Removed mr-2
            value={joinTag}
            onChange={(e) => setJoinTag(e.target.value)}
          />
          <button
            onClick={handleJoinByTag}
            className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center sm:justify-start" // Added w-full sm:w-auto, justify-center
          >
            <LogIn className="w-4 h-4 mr-2" />
            Rejoindre
          </button>
        </div>
        {/* Display message specifically for the join by tag action */}
        {joinMessage && (
          <p className={`text-sm mt-2 ${joinMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {joinMessage.text}
          </p>
        )}
      </div>


      {/* Team List */}
      <h2 className="text-xl font-semibold mb-4">Mes Équipes</h2>
      {teams.length > 0 ? (
        <ul className="space-y-4">
          {teams.map((team: Team) => (
            <li key={team.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              {/* Responsive Team Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2"> {/* Added gap */}
                {/* Team Info */}
                <div className="mb-2 sm:mb-0">
                  <span className="font-semibold text-lg">{team.name}</span>
                  <span className="text-sm text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded">#{team.tag}</span>
                  <p className="text-xs text-gray-500">Créée le: {team.createdAt.toLocaleDateString()}</p>
                </div>
                {/* Team Action Buttons - Allow wrapping */}
                <div className='flex flex-wrap items-center gap-2 flex-shrink-0 justify-start sm:justify-end'> {/* Added flex-wrap, gap, justify */}
                  {user && team.creatorId === user.uid && (
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      title="Supprimer l'équipe"
                      className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-1 px-2 rounded flex items-center text-sm transition-colors"
                    >
                      <Trash2 className='w-4 h-4'/>
                    </button>
                  )}
                  {team.members.includes(user?.uid || '') ? (
                    <button
                      onClick={() => handleLeaveTeam(team.id)}
                      title="Quitter l'équipe"
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold py-1 px-2 rounded flex items-center text-sm transition-colors"
                    >
                      <UserMinus className='w-4 h-4'/>
                    </button>
                  ) : team.pastMembers.includes(user?.uid || '') ? (
                    <button
                      onClick={() => handleJoinTeam(team.id)}
                      title="Rejoindre l'équipe"
                      className="bg-green-100 hover:bg-green-200 text-green-700 font-bold py-1 px-2 rounded flex items-center text-sm transition-colors"
                    >
                      <UserPlus className='w-4 h-4'/>
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <h4 className="text-sm font-semibold mb-2 flex items-center text-gray-700">
                  <Users className="w-4 h-4 mr-1.5 text-gray-500" />
                  Membres ({team.members.length})
                </h4>
                {loadingMemberDetails && team.members.some(id => !memberDetails[id]) ? (
                  <p className="text-xs text-gray-500 italic">Chargement des membres...</p>
                ) : (
                  <ul className="space-y-1 pl-2">
                    {team.members.map(memberId => (
                      <li key={memberId} className="text-sm text-gray-600 flex items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                        {memberDetails[memberId]?.name || memberId}
                        {memberId === user?.uid && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Vous</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600 italic">Vous n'êtes membre d'aucune équipe pour le moment.</p>
      )}
    </div>
  );
};

export default Teams;
