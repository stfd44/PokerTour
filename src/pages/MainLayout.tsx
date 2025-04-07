// src/pages/MainLayout.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { CreateTournament } from '../components/tournament/CreateTournament';
import { TournamentList } from '../components/tournament/TournamentList';
import { TournamentGames } from '../components/tournament/TournamentGames';
import { EditTournament } from '../components/tournament/EditTournament'; // Import EditTournament
import Home from './Home';
import Stats from './Stats'; // Import the Stats component
// Import the Teams component
import Teams from './Teams/Teams';

export function MainLayout() {
  return (
    <div className="min-h-screen container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app/create-tournament" element={<CreateTournament />} />
          <Route path="/tournaments" element={<TournamentList />} />
          <Route path="/tournament/:tournamentId" element={<TournamentGames />} />
          <Route path="/tournament/:tournamentId/edit" element={<EditTournament />} /> {/* Add route for editing */}
          {/* Add the route for the Teams page */}
          <Route path="/teams" element={<Teams />} />
          {/* Add the route for the Stats page */}
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </div>
    </div>
  );
}
