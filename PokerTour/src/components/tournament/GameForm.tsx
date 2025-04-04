import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Added useMemo, useCallback
import { useTournamentStore } from '../../store/tournamentStore';
import { UserCheck, X, Minus, Plus } from 'lucide-react'; // Added Minus, Plus icons (Removed Percent)
import type { Game, Player, Tournament } from '../../store/tournamentStore';
import { calculatePrizePool, calculateWinnings } from '../../lib/utils'; // Import calculation functions

interface GameFormProps {
  tournament: Tournament;
  // setIsCreating: (isCreating: boolean) => void; // Removed, handled by onClose
  editingGame: Game | null;
  // setEditingGame: (game: Game | null) => void; // Removed, handled by onClose
  tournamentId: string;
  onClose: () => void; // Added onClose prop
}

interface DistributionPercentages {
  first: number;
  second: number;
  third: number;
}

interface GameFormType {
  startingStack: number;
  blinds: {
    small: number;
    big: number;
  };
  blindLevels: number;
  players: Player[];
  // Add prize distribution to the form state if needed for persistence,
  // but for now, we'll manage percentages separately and calculate winnings on submit.
}

const initialGameForm: GameFormType = {
  startingStack: 10000, // Default starting stack
  blinds: {
    small: 25,
    big: 50
  },
  blindLevels: 20, // Default blind level duration
  players: []
};

const initialPercentages: DistributionPercentages = {
  first: 60,
  second: 25,
  third: 15,
};

// Removed setIsCreating, setEditingGame from props destructuring, added onClose
export function GameForm({ tournament, editingGame, tournamentId, onClose }: GameFormProps) {
  const addGame = useTournamentStore(state => state.addGame);
  const updateGame = useTournamentStore(state => state.updateGame);
  const [gameForm, setGameForm] = useState<GameFormType>(initialGameForm);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [distributionPercentages, setDistributionPercentages] = useState<DistributionPercentages>(initialPercentages);

  useEffect(() => {
    if (editingGame) {
      setGameForm({
        startingStack: editingGame.startingStack,
        blinds: { ...editingGame.blinds },
        blindLevels: editingGame.blindLevels,
        players: [...editingGame.players],
        // Load saved percentages if editing game has them, otherwise use initial
        // Assuming editingGame might have these properties in the future
        // distributionPercentages: editingGame.distributionPercentages || initialPercentages,
      });
      setSelectedPlayers(new Set(editingGame.players.map(p => p.id)));
      // Load percentages if they exist on the game being edited
      if (editingGame.distributionPercentages) {
        setDistributionPercentages(editingGame.distributionPercentages);
      } else {
        setDistributionPercentages(initialPercentages);
      }
    } else {
      setGameForm(initialGameForm);
      setSelectedPlayers(new Set());
      setDistributionPercentages(initialPercentages); // Reset percentages for new game
    }
  }, [editingGame]);

  // Removed unused resetForm function

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlayersList = tournament!.registrations.filter(
      player => selectedPlayers.has(player.id)
    );

    const prizePool = calculatePrizePool(tournament.buyin, selectedPlayersList.length);
    const winnings = calculateWinnings(prizePool, distributionPercentages);

    const gameData = {
      ...gameForm,
      players: selectedPlayersList,
      tournamentId: tournamentId!, // Include tournamentId
      prizePool: prizePool, // Add calculated prize pool
      distributionPercentages: distributionPercentages, // Add percentages
      winnings: winnings, // Add calculated winnings
    };

    if (editingGame) {
      updateGame(tournamentId!, editingGame.id, gameData);
    } else {
      addGame(tournamentId!, gameData);
    }

    // Call onClose instead of manipulating state directly
    onClose();
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

  // Calculate prize pool and winnings dynamically
  const prizePool = useMemo(() => {
    return calculatePrizePool(tournament.buyin, selectedPlayers.size);
  }, [tournament.buyin, selectedPlayers.size]);

  const estimatedWinnings = useMemo(() => {
    // Only calculate if there are enough players for payouts (at least 3)
    if (selectedPlayers.size < 3) {
        return { first: 0, second: 0, third: 0 };
    }
    return calculateWinnings(prizePool, distributionPercentages);
  }, [prizePool, distributionPercentages, selectedPlayers.size]);


  // Handlers for adjusting percentages
  const adjustPercentage = useCallback((place: keyof DistributionPercentages, adjustment: number) => {
    setDistributionPercentages(prev => {
        const currentPercentages = { ...prev };
        const currentValue = currentPercentages[place];
        const newValue = currentValue + adjustment;

        // Ensure value stays within 0-100
        if (newValue < 0 || newValue > 100) return currentPercentages;

        // Determine which other place(s) to adjust
        let adjustmentApplied = false;
        if (adjustment > 0) { // Increasing place, decrease others
            if (place === 'first') {
                if (currentPercentages.second >= adjustment) { currentPercentages.second -= adjustment; adjustmentApplied = true; }
                else if (currentPercentages.third >= adjustment) { currentPercentages.third -= adjustment; adjustmentApplied = true; }
            } else if (place === 'second') {
                if (currentPercentages.third >= adjustment) { currentPercentages.third -= adjustment; adjustmentApplied = true; }
                else if (currentPercentages.first >= adjustment) { currentPercentages.first -= adjustment; adjustmentApplied = true; }
            } else { // place === 'third'
                if (currentPercentages.first >= adjustment) { currentPercentages.first -= adjustment; adjustmentApplied = true; }
                else if (currentPercentages.second >= adjustment) { currentPercentages.second -= adjustment; adjustmentApplied = true; }
            }
        } else { // Decreasing place, increase others (adjustment is negative)
             const increase = -adjustment;
             if (place === 'first') {
                 currentPercentages.second += increase; adjustmentApplied = true; // Prioritize increasing second
             } else if (place === 'second') {
                 currentPercentages.third += increase; adjustmentApplied = true; // Prioritize increasing third
             } else { // place === 'third'
                 currentPercentages.first += increase; adjustmentApplied = true; // Prioritize increasing first
             }
        }

        // If adjustment was possible, update the target place
        if (adjustmentApplied) {
            currentPercentages[place] = newValue;
            // Final check to ensure sum is 100 (due to potential rounding issues if logic gets complex)
            const sum = currentPercentages.first + currentPercentages.second + currentPercentages.third;
            if (sum !== 100) {
                // Simple correction: adjust the last modified place's counterparty
                 if (adjustment > 0) { // Increasing place, decreased others
                    if (place === 'first') currentPercentages.second += (100 - sum);
                    else if (place === 'second') currentPercentages.third += (100 - sum);
                    else currentPercentages.first += (100 - sum);
                 } else { // Decreasing place, increased others
                    if (place === 'first') currentPercentages.second += (100 - sum);
                    else if (place === 'second') currentPercentages.third += (100 - sum);
                    else currentPercentages.first += (100 - sum);
                 }
            }
            return currentPercentages;
        }

        return prev; // No change if adjustment wasn't possible
    });
  }, []);


  return (
    // Added overflow-y-auto and max-h-[80vh] for potentially long forms
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-poker-black">
          {editingGame ? 'Modifier la partie' : 'Créer une nouvelle partie'}
        </h2>
        {/* Close button */}
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
        </button>
      </div>
      <form onSubmit={handleCreateGame} className="space-y-6">
        {/* --- Existing Form Fields --- */}
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

        {/* --- Player Selection --- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Joueurs à la table ({selectedPlayers.size} / {tournament.registrations.length})
          </label>
          {/* Added max-h-48 overflow-y-auto for player list */}
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
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

        {/* --- Prize Pool and Distribution --- */}
        <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold text-poker-black">Prize Pool & Répartition</h3>
            {/* Display Prize Pool */}
            <div className="flex justify-between items-center bg-gray-100 p-3 rounded-md">
                <span className="font-medium text-gray-800">Prize Pool Total:</span>
                <span className="font-bold text-xl text-poker-red">{prizePool} €</span>
            </div>

             {/* Distribution Percentages */}
             {selectedPlayers.size >= 3 ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-600">Ajuster la répartition (total doit faire 100%):</p>
                    {/* 1st Place */}
                    <div className="flex items-center justify-between">
                        <span className="w-16">1ère Place:</span>
                        <div className="flex items-center space-x-2">
                            <button type="button" onClick={() => adjustPercentage('first', -5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.first <= 0}><Minus size={16} /></button>
                            <span className="font-semibold w-10 text-center">{distributionPercentages.first}%</span>
                            <button type="button" onClick={() => adjustPercentage('first', 5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.first >= 100}><Plus size={16} /></button>
                        </div>
                        <span className="text-gray-700 w-20 text-right">{estimatedWinnings.first} €</span>
                    </div>
                    {/* 2nd Place */}
                    <div className="flex items-center justify-between">
                        <span className="w-16">2ème Place:</span>
                         <div className="flex items-center space-x-2">
                            <button type="button" onClick={() => adjustPercentage('second', -5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.second <= 0}><Minus size={16} /></button>
                            <span className="font-semibold w-10 text-center">{distributionPercentages.second}%</span>
                            <button type="button" onClick={() => adjustPercentage('second', 5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.second >= 100}><Plus size={16} /></button>
                        </div>
                        <span className="text-gray-700 w-20 text-right">{estimatedWinnings.second} €</span>
                    </div>
                    {/* 3rd Place */}
                    <div className="flex items-center justify-between">
                        <span className="w-16">3ème Place:</span>
                         <div className="flex items-center space-x-2">
                            <button type="button" onClick={() => adjustPercentage('third', -5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.third <= 0}><Minus size={16} /></button>
                            <span className="font-semibold w-10 text-center">{distributionPercentages.third}%</span>
                            <button type="button" onClick={() => adjustPercentage('third', 5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.third >= 100}><Plus size={16} /></button>
                        </div>
                        <span className="text-gray-700 w-20 text-right">{estimatedWinnings.third} €</span>
                    </div>
                </div>
             ) : (
                <p className="text-sm text-gray-500 text-center italic">Sélectionnez au moins 3 joueurs pour définir la répartition des gains.</p>
             )}
        </div>


        {/* --- Form Actions --- */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          {/* Cancel button */}
          <button
            type="button" // Ensure it's not submitting the form
            onClick={onClose} // Use the passed onClose handler
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-poker-red"
          >
             Annuler
          </button>
          <button
            type="submit"
            // Disable button if fewer than 2 players are selected
            disabled={selectedPlayers.size < 2}
            className="bg-poker-red text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingGame ? 'Mettre à jour' : 'Créer la partie'}
          </button>
        </div>
      </form>
    </div>
  );
}
