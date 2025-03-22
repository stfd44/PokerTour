import React, { useState, useEffect } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { UserCheck, UserX } from 'lucide-react';
import type { Game, Player, Tournament } from '../../store/tournamentStore';

interface GameFormProps {
  tournament: Tournament;
  setIsCreating: (isCreating: boolean) => void;
  editingGame: Game | null;
  setEditingGame: (game: Game | null) => void;
  tournamentId: string;
}

interface GameFormType {
  startingStack: number;
  blinds: {
    small: number;
    big: number;
  };
  blindLevels: number;
  players: Player[];
}

const initialGameForm: GameFormType = {
  startingStack: 10000,
  blinds: {
    small: 25,
    big: 50
  },
  blindLevels: 20,
  players: []
};

export function GameForm({ tournament, setIsCreating, editingGame, setEditingGame, tournamentId }: GameFormProps) {
  const addGame = useTournamentStore(state => state.addGame);
  const updateGame = useTournamentStore(state => state.updateGame);
  const [gameForm, setGameForm] = useState<GameFormType>(initialGameForm);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (editingGame) {
      setGameForm({
        startingStack: editingGame.startingStack,
        blinds: { ...editingGame.blinds },
        blindLevels: editingGame.blindLevels,
        players: [...editingGame.players]
      });
      setSelectedPlayers(new Set(editingGame.players.map(p => p.id)));
    } else {
      setGameForm(initialGameForm);
      setSelectedPlayers(new Set());
    }
  }, [editingGame]);

  const resetForm = () => {
    setGameForm(initialGameForm);
    setSelectedPlayers(new Set());
  };

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlayersList = tournament!.registrations.filter(
      player => selectedPlayers.has(player.id)
    );

    if (editingGame) {
      updateGame(tournamentId!, editingGame.id, {
        ...gameForm,
        players: selectedPlayersList
      });
    } else {
      addGame(tournamentId!, {
        ...gameForm,
        players: selectedPlayersList
      });
    }

    setIsCreating(false);
    resetForm();
    setEditingGame(null);
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-poker-black mb-4">
        {editingGame ? 'Modifier la partie' : 'Créer une nouvelle partie'}
      </h2>
      <form onSubmit={handleCreateGame} className="space-y-6">
        {/* ... (Form fields - startingStack, blinds, blindLevels) ... */}
        <div>
          <label htmlFor="startingStack" className="block text-sm font-medium text-gray-700 mb-1">
            Stack de départ
          </label>
          <input
            type="number"
            id="startingStack"
            value={gameForm.startingStack}
            onChange={(e) => setGameForm(prev => ({
              ...prev,
              startingStack: parseInt(e.target.value)
            }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
            min="1000"
            step="1000"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="smallBlind" className="block text-sm font-medium text-gray-700 mb-1">
              Petite blind
            </label>
            <input
              type="number"
              id="smallBlind"
              value={gameForm.blinds.small}
              onChange={(e) => setGameForm(prev => ({
                ...prev,
                blinds: {
                  ...prev.blinds,
                  small: parseInt(e.target.value)
                }
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
              min="5"
              step="5"
              required
            />
          </div>

          <div>
            <label htmlFor="bigBlind" className="block text-sm font-medium text-gray-700 mb-1">
              Grosse blind
            </label>
            <input
              type="number"
              id="bigBlind"
              value={gameForm.blinds.big}
              onChange={(e) => setGameForm(prev => ({
                ...prev,
                blinds: {
                  ...prev.blinds,
                  big: parseInt(e.target.value)
                }
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
              min="10"
              step="10"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="blindLevels" className="block text-sm font-medium text-gray-700 mb-1">
            Durée des niveaux (minutes)
          </label>
          <input
            type="number"
            id="blindLevels"
            value={gameForm.blindLevels}
            onChange={(e) => setGameForm(prev => ({
              ...prev,
              blindLevels: parseInt(e.target.value)
            }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
            min="5"
            step="5"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Joueurs à la table
          </label>
          <div className="grid grid-cols-2 gap-2">
            {tournament.registrations.map((player) => (
              <label
                key={player.id}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPlayers.has(player.id)
                    ? 'bg-poker-gold/10 border-poker-gold'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPlayers.has(player.id)}
                  onChange={() => togglePlayer(player.id)}
                  className="sr-only"
                />
                <UserCheck className={`w-5 h-5 mr-2 ${
                  selectedPlayers.has(player.id) ? 'text-poker-gold' : 'text-gray-400'
                }`} />
                <span className="text-sm">{player.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              resetForm();
              setEditingGame(null);
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="bg-poker-gold text-white px-6 py-2 rounded hover:bg-yellow-600 transition-colors"
          >
            {editingGame ? 'Mettre à jour' : 'Créer la partie'}
          </button>
        </div>
      </form>
    </div>
  );
}
