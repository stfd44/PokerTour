import React, { useEffect, useState } from 'react';
import { useTeamStore } from '../../store/useTeamStore';
import { useAuthStore } from '../../store/useAuthStore';
import { User } from 'firebase/auth';

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
    if (user) {
      await deleteTeam(teamId);
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
          {teams.map((team) => (
            <li key={team.id} className="border border-gray-300 p-3 mb-2 rounded-md">
              <div className="flex justify-between items-center">
                <span className="font-medium">{team.name}</span>
                <div>
                  {team.creatorId === user?.uid && (
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded mr-2"
                    >
                      Delete
                    </button>
                  )}
                  {team.members.includes(user?.uid || '') ? (
                    <button
                      onClick={() => handleLeaveTeam(team.id)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded mr-2"
                    >
                      Leave
                    </button>
                  ) : team.pastMembers.includes(user?.uid || '') ? (
                    <button
                      onClick={() => handleJoinTeam(team.id)}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
                    >
                      Join
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Members: {team.members.length}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>You are not a member of any team yet.</p>
      )}
    </div>
  );
};

export default Teams;
