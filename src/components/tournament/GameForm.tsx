import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Added useMemo, useCallback
import { useTournamentStore } from '../../store/tournamentStore';
import { UserCheck, X, Minus, Plus } from 'lucide-react'; // Added Minus, Plus icons (Removed Percent)
import type { Game, Player, Tournament } from '../../store/types/tournamentTypes'; // Corrected import path for types
import { calculatePrizePool, calculateWinnings } from '../../lib/utils'; // Import calculation functions

interface GameFormProps {
  tournament: Tournament;
  editingGame: Game | null;
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
  players: Player[]; // Use Player type
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

export function GameForm({ tournament, editingGame, tournamentId, onClose }: GameFormProps) {
  const addGame = useTournamentStore(state => state.addGame);
  const updateGame = useTournamentStore(state => state.updateGame);
  const [gameForm, setGameForm] = useState<GameFormType>(initialGameForm);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [distributionPercentages, setDistributionPercentages] = useState<DistributionPercentages>(initialPercentages);
  const [rebuyLevel, setRebuyLevel] = useState<number>(2); // State for rebuy level

  useEffect(() => {
    if (editingGame) {
      setGameForm({
        startingStack: editingGame.startingStack,
        blinds: { ...editingGame.blinds },
        blindLevels: editingGame.blindLevels,
        players: [...editingGame.players],
      });
      setSelectedPlayers(new Set(editingGame.players.map((p: Player) => p.id))); // Added Player type
      setDistributionPercentages(editingGame.distributionPercentages || initialPercentages);
      setRebuyLevel(editingGame.rebuyAllowedUntilLevel ?? 2);
    } else {
      setGameForm(initialGameForm);
      setSelectedPlayers(new Set());
      setDistributionPercentages(initialPercentages);
      setRebuyLevel(2);
    }
  }, [editingGame]);

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlayersList = tournament!.registrations.filter(
      (player: Player) => selectedPlayers.has(player.id) // Added Player type
    );

    const prizePool = calculatePrizePool(tournament.buyin, selectedPlayersList.length);
    const winnings = calculateWinnings(prizePool, distributionPercentages);

    const gameData = {
      ...gameForm,
      players: selectedPlayersList,
      tournamentId: tournamentId!,
      prizePool: prizePool,
      distributionPercentages: distributionPercentages,
      winnings: winnings,
      rebuyAllowedUntilLevel: rebuyLevel,
    };

    if (editingGame) {
      updateGame(tournamentId!, editingGame.id, gameData);
    } else {
      addGame(tournamentId!, gameData, rebuyLevel);
    }
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

  const prizePool = useMemo(() => {
    return calculatePrizePool(tournament.buyin, selectedPlayers.size);
  }, [tournament.buyin, selectedPlayers.size]);

  const estimatedWinnings = useMemo(() => {
    if (selectedPlayers.size < 3) {
        return { first: 0, second: 0, third: 0 };
    }
    return calculateWinnings(prizePool, distributionPercentages);
  }, [prizePool, distributionPercentages, selectedPlayers.size]);

  const adjustPercentage = useCallback((place: keyof DistributionPercentages, adjustment: number) => {
    setDistributionPercentages(prev => {
        const currentPercentages = { ...prev };
        const currentValue = currentPercentages[place];
        const newValue = currentValue + adjustment;

        if (newValue < 0 || newValue > 100) return currentPercentages;

        let adjustmentApplied = false;
        if (adjustment > 0) {
            if (place === 'first') {
                if (currentPercentages.second >= adjustment) { currentPercentages.second -= adjustment; adjustmentApplied = true; }
                else if (currentPercentages.third >= adjustment) { currentPercentages.third -= adjustment; adjustmentApplied = true; }
            } else if (place === 'second') {
                if (currentPercentages.third >= adjustment) { currentPercentages.third -= adjustment; adjustmentApplied = true; }
                else if (currentPercentages.first >= adjustment) { currentPercentages.first -= adjustment; adjustmentApplied = true; }
            } else {
                if (currentPercentages.first >= adjustment) { currentPercentages.first -= adjustment; adjustmentApplied = true; }
                else if (currentPercentages.second >= adjustment) { currentPercentages.second -= adjustment; adjustmentApplied = true; }
            }
        } else {
             const increase = -adjustment;
             if (place === 'first') {
                 currentPercentages.second += increase; adjustmentApplied = true;
             } else if (place === 'second') {
                 currentPercentages.third += increase; adjustmentApplied = true;
             } else {
                 currentPercentages.first += increase; adjustmentApplied = true;
             }
        }

        if (adjustmentApplied) {
            currentPercentages[place] = newValue;
            const sum = currentPercentages.first + currentPercentages.second + currentPercentages.third;
            if (sum !== 100) {
                 if (adjustment > 0) {
                    if (place === 'first') currentPercentages.second += (100 - sum);
                    else if (place === 'second') currentPercentages.third += (100 - sum);
                    else currentPercentages.first += (100 - sum);
                 } else {
                    if (place === 'first') currentPercentages.second += (100 - sum);
                    else if (place === 'second') currentPercentages.third += (100 - sum);
                    else currentPercentages.first += (100 - sum);
                 }
            }
            return currentPercentages;
        }
        return prev;
    });
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-poker-black">
          {editingGame ? 'Modifier la partie' : 'Créer une nouvelle partie'}
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
        </button>
      </div>
      <form onSubmit={handleCreateGame} className="space-y-6">
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
          <label htmlFor="rebuyLevel" className="block text-sm font-medium text-gray-700 mb-1">
            Rebuy autorisé jusqu'au niveau (inclus)
          </label>
          <input
            type="number"
            id="rebuyLevel"
            value={rebuyLevel}
            onChange={(e) => setRebuyLevel(Math.max(0, parseInt(e.target.value)))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
            min="0"
            step="1"
            required
          />
           <p className="text-xs text-gray-500 mt-1">Niveau 0 = pas de rebuy après le début. Niveau 2 (défaut) = rebuy possible pendant niveaux 1 et 2.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Joueurs à la table ({selectedPlayers.size} / {tournament.registrations.length})
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
            {tournament.registrations.map((player: Player) => ( // Added Player type
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

        <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold text-poker-black">Prize Pool & Répartition</h3>
            <div className="flex justify-between items-center bg-gray-100 p-3 rounded-md">
                <span className="font-medium text-gray-800">Prize Pool Total:</span>
                <span className="font-bold text-xl text-poker-red">{prizePool} €</span>
            </div>

             {selectedPlayers.size >= 3 ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-600">Ajuster la répartition (total doit faire 100%):</p>
                    <div className="flex flex-wrap items-center justify-between gap-y-1">
                        <span className="w-16 shrink-0">1ère Place:</span>
                        <div className="flex items-center space-x-2">
                            <button type="button" onClick={() => adjustPercentage('first', -5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.first <= 0}><Minus size={16} /></button>
                            <span className="font-semibold w-10 text-center">{distributionPercentages.first}%</span>
                            <button type="button" onClick={() => adjustPercentage('first', 5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.first >= 100}><Plus size={16} /></button>
                        </div>
                        <span className="text-gray-700 w-20 text-right">{estimatedWinnings.first} €</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-y-1">
                        <span className="w-16 shrink-0">2ème Place:</span>
                         <div className="flex items-center space-x-2">
                            <button type="button" onClick={() => adjustPercentage('second', -5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.second <= 0}><Minus size={16} /></button>
                            <span className="font-semibold w-10 text-center">{distributionPercentages.second}%</span>
                            <button type="button" onClick={() => adjustPercentage('second', 5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.second >= 100}><Plus size={16} /></button>
                        </div>
                        <span className="text-gray-700 w-20 text-right">{estimatedWinnings.second} €</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-y-1">
                        <span className="w-16 shrink-0">3ème Place:</span>
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

        {/* Responsive Form Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-poker-red"
          >
             Annuler
          </button>
          <button
            type="submit"
            disabled={selectedPlayers.size < 2}
            className="w-full sm:w-auto bg-poker-red text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingGame ? 'Mettre à jour' : 'Créer la partie'}
          </button>
        </div>
      </form>
    </div>
  );
}
