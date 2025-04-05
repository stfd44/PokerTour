// src/pages/Tournaments.tsx
import React, { useEffect } from 'react';
// Import AppUser from the auth store instead of Firebase User
import { AppUser } from '../store/useAuthStore';
import { useTournamentStore } from '../store/tournamentStore';
import { TournamentList } from '../components/tournament/TournamentList';

interface TournamentsProps {
    // Expect AppUser type from the auth store
    user: AppUser | null;
}

const Tournaments: React.FC<TournamentsProps> = ({ user }) => {
    const { fetchTournaments } = useTournamentStore();

    useEffect(() => {
        // Pass userId only if user exists
        if (user) {
            fetchTournaments(user.uid);
        }
    }, [fetchTournaments, user]);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Tournaments</h1>
      <TournamentList />
        </div>
    );
};

export default Tournaments;
