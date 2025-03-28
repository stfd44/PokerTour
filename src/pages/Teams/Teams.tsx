import React, { useEffect, useState } from 'react';
import { useTeamStore, Team } from '../../store/useTeamStore';
import { User } from 'firebase/auth';
import { Trash2, UserPlus, UserMinus, LogIn } from 'lucide-react'; // Import LogIn icon

interface TeamsProps {
  user: User | null;
}

const Teams: React.FC<TeamsProps> = ({ user }) => {
  const { teams, createTeam, fetchTeams, leaveTeam, joinTeam, deleteTeam, joinTeamByTag } = useTeamStore();
  const [newTeamName, setNewTeamName] = useState('');
  const [joinTag, setJoinTag] = useState(''); // State for join tag input
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null); // State for feedback messages

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleCreateTeam = async () => {
    if (newTeamName.trim() !== '') {
      if (user) {
        await createTeam(newTeamName);
        setNewTeamName('');
      } else {
        console.error('User not logged in.');
      }
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
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Nom de l'équipe"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-md mr-2 flex-grow focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleCreateTeam}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors flex items-center"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Créer
          </button>
        </div>
      </div>

      {/* Join Team by Tag Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Rejoindre une équipe par Tag</h2>
        <div className="flex items-center mb-2">
          <input
            type="text"
            placeholder="Tag de l'équipe (ex: nom_equipe_1234)"
            value={joinTag}
            onChange={(e) => setJoinTag(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-md mr-2 flex-grow focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            onClick={handleJoinByTag}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors flex items-center"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Rejoindre
          </button>
        </div>
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="mb-2 sm:mb-0">
                  <span className="font-semibold text-lg">{team.name}</span>
                  <span className="text-sm text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded">#{team.tag}</span>
                  <p className="text-xs text-gray-500">Créée le: {team.createdAt.toLocaleDateString()}</p>
                </div>
                <div className='flex items-center space-x-2 flex-shrink-0'>
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
              <p className="text-sm text-gray-600 mt-2">
                Membres: {team.members.length}
              </p>
              {/* Optional: Display member list */}
              {/* <ul className="text-xs text-gray-500 mt-1 pl-4 list-disc">
                {team.members.map(memberId => <li key={memberId}>{memberId}</li>)} // Replace with actual member names if available
              </ul> */}
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
