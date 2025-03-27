import React, { useEffect, useState } from 'react';
import { useTeamStore, Team } from '../../store/useTeamStore';
import { User } from 'firebase/auth';
import { Trash2, UserPlus, UserMinus } from 'lucide-react';

interface TeamsProps {
  user: User | null;
}

const Teams: React.FC<TeamsProps> = ({ user }) => {
  const { teams, createTeam, fetchTeams, leaveTeam, joinTeam, deleteTeam } = useTeamStore();
  const [newTeamName, setNewTeamName] = useState('');

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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Teams</h1>

      {/* Create Team Form */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Team Name"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded-md mr-2"
        />
        <button
          onClick={handleCreateTeam}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Create Team
        </button>
      </div>

      {/* Team List */}
      {teams.length > 0 ? (
        <ul>
          {teams.map((team: Team) => (
            <li key={team.id} className="border border-gray-300 p-3 mb-2 rounded-md">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{team.name}</span>
                  <span className="text-sm text-gray-600 ml-2">({team.tag})</span>
                </div>
                <div className='flex items-center'>
                  {user && team.creatorId === user.uid && (
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded mr-2 flex items-center"
                    >
                      <Trash2 className='w-4 h-4 mr-1'/>
                      Supprimer
                    </button>
                  )}
                  {team.members.includes(user?.uid || '') ? (
                    <button
                      onClick={() => handleLeaveTeam(team.id)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded mr-2 flex items-center"
                    >
                      <UserMinus className='w-4 h-4 mr-1'/>
                      Quitter
                    </button>
                  ) : team.pastMembers.includes(user?.uid || '') ? (
                    <button
                      onClick={() => handleJoinTeam(team.id)}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded flex items-center"
                    >
                      <UserPlus className='w-4 h-4 mr-1'/>
                      Rejoindre
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Membres: {team.members.length}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>Vous n'êtes membre d'aucune équipe pour le moment.</p>
      )}
    </div>
  );
};

export default Teams;
