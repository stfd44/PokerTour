import React, { useEffect } from 'react';
import { User } from 'firebase/auth';
import { useTournamentStore, Tournament } from '../store/tournamentStore';
import { TournamentList } from '../components/tournament/TournamentList';

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
      <TournamentList user={user} />
    </div>
  );
};

export default Tournaments;
