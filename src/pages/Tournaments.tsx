import React, { useEffect } from 'react';
import { User } from 'firebase/auth';
import { useTournamentStore, Tournament } from '../store/tournamentStore';

interface TournamentsProps {
  user: User | null;
}

const Tournaments: React.FC<TournamentsProps> = ({ user }) => {
  const { tournaments, fetchTournaments } = useTournamentStore();

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tournaments</h1>
      {tournaments.length > 0 ? (
        <ul>
          {tournaments.map((tournament: Tournament) => (
            <li key={tournament.id} className="border border-gray-300 p-3 mb-2 rounded-md">
              <div className="flex justify-between items-center">
                <span className="font-medium">{tournament.name}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No tournaments yet.</p>
      )}
    </div>
  );
};

export default Tournaments;
