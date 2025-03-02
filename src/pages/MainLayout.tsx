// src/pages/MainLayout.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { CreateTournament } from '../components/tournament/CreateTournament';
import { TournamentList } from '../components/tournament/TournamentList';
import { TournamentGames } from '../components/tournament/TournamentGames';
import { User } from 'firebase/auth';
import Home from './Home';

interface MainLayoutProps {
    user: User | null;
}

export function MainLayout({ user }: MainLayoutProps) {
    console.log("MainLayout.tsx - User:", user);
    return (
        <div className="min-h-screen container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <Routes>
                   <Route path="/" element={<Home user={user} />} /> {/* Add Home route here */}
                    <Route path="/app/create-tournament" element={<CreateTournament user={user} />} />
                    <Route path="/app/tournaments" element={<TournamentList user={user} />} />
                    <Route path="/app/tournament/:tournamentId" element={<TournamentGames user={user} />} />
                </Routes>
            </div>
        </div>
    );
}
