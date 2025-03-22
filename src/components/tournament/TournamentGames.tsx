import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTournamentStore } from '../../store/tournamentStore';
import { GameForm } from './GameForm';
import { GameView } from './GameView';
import { GameList } from './GameList';
import type { Game } from '../../store/tournamentStore';
import { useAuthStore } from '../../store/useAuthStore';

export function TournamentGames() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const tournament = useTournamentStore(state =>
    state.tournaments.find(t => t.id === tournamentId)
  );
  const { user } = useAuthStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [viewingGame, setViewingGame] = useState<Game | null>(null);

  const handleCreateGameClick = () => {
    setIsCreating(true);
    setEditingGame(null);
  };

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Tournoi introuvable</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {viewingGame ? (
        <GameView game={viewingGame} setViewingGame={setViewingGame} tournamentId={tournamentId} />
      ) : (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-poker-black">
              {tournament.name} - Parties
            </h1>
            <button
              onClick={handleCreateGameClick}
              className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center"
            >
              Nouvelle partie
            </button>
          </div>

          {isCreating && (
            <GameForm
              tournament={tournament}
              setIsCreating={setIsCreating}
              editingGame={editingGame}
              setEditingGame={setEditingGame}
              tournamentId={tournamentId}
              userId={user?.uid}
            />
          )}
          <GameList tournament={tournament} setViewingGame={setViewingGame} setIsCreating={setIsCreating} setEditingGame={setEditingGame} userId={user?.uid} />
        </>
      )}
    </div>
  );
}
