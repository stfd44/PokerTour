import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { useTeamStore } from '../../store/useTeamStore';
import { UserCheck, Minus, Plus } from 'lucide-react';
import type { Game, Player, Tournament, PotContribution, BlindLevel, RebuyLimitMode } from '../../store/types/tournamentTypes';
import { calculatePrizePool, calculateWinnings } from '../../lib/utils';

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
  levels: BlindLevel[];
  players: Player[]; // Use Player type
}

const DEFAULT_LEVEL_COUNT = 10;

const createDefaultLevels = (): BlindLevel[] => ([
  { blinds: { small: 25, big: 50 }, duration: 20 },
  { blinds: { small: 50, big: 100 }, duration: 20 },
  { blinds: { small: 75, big: 150 }, duration: 20 },
  { blinds: { small: 100, big: 200 }, duration: 20 },
  { blinds: { small: 150, big: 300 }, duration: 20 },
  { blinds: { small: 200, big: 400 }, duration: 20 },
  { blinds: { small: 300, big: 600 }, duration: 20 },
  { blinds: { small: 400, big: 800 }, duration: 20 },
  { blinds: { small: 600, big: 1200 }, duration: 20 },
  { blinds: { small: 800, big: 1600 }, duration: 20 },
]);

const initialGameForm: GameFormType = {
  startingStack: 10000,
  levels: createDefaultLevels(),
  players: []
};

const initialPercentages: DistributionPercentages = {
  first: 60,
  second: 25,
  third: 15,
};

export function GameForm({ tournament, editingGame, tournamentId, onClose }: GameFormProps) {
  const addGame = useTournamentStore(state => state.addGame);
  const { teams, addBlindPreset } = useTeamStore(state => ({
    teams: state.teams,
    addBlindPreset: state.addBlindPreset,
  }));
  const [gameForm, setGameForm] = useState<GameFormType>(initialGameForm);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [distributionPercentages, setDistributionPercentages] = useState<DistributionPercentages>(initialPercentages);
  const [rebuyLimitMode, setRebuyLimitMode] = useState<RebuyLimitMode>('max_per_player');
  const [rebuyLevel, setRebuyLevel] = useState<number>(4); // State for rebuy level
  const [maxRebuysPerPlayer, setMaxRebuysPerPlayer] = useState<number>(2);
  const [rebuyDistributionRule, setRebuyDistributionRule] = useState<'winner_takes_all' | 'cyclic_distribution'>('cyclic_distribution'); // State for rebuy distribution rule
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);
  // ADDED: State for pot management
  const [usePotSystem, setUsePotSystem] = useState<boolean>(false); // Toggle for pot system
  const [playersWhoPaidPot, setPlayersWhoPaidPot] = useState<Set<string>>(new Set()); // Players who paid to pot

  const currentTeam = useMemo(
    () => teams.find((team) => team.id === tournament.teamId),
    [teams, tournament.teamId]
  );
  const blindPresets = currentTeam?.blindPresets || [];

  useEffect(() => {
    if (editingGame) {
      const existingLevels = editingGame.blindStructure.map((blinds, index) => ({
        blinds,
        duration: editingGame.levelDurations?.[index] || editingGame.levelDurations?.[0] || 20,
      }));

      setGameForm({
        startingStack: editingGame.startingStack,
        levels: existingLevels.length > 0 ? existingLevels : createDefaultLevels(),
        players: [...editingGame.players],
      });
      setSelectedPlayers(new Set(editingGame.players.map((p: Player) => p.id))); // Added Player type
      setDistributionPercentages(editingGame.distributionPercentages || initialPercentages);
      setRebuyLimitMode(editingGame.rebuyLimitMode ?? 'until_level');
      setRebuyLevel(editingGame.rebuyAllowedUntilLevel ?? 4);
      setMaxRebuysPerPlayer(editingGame.maxRebuysPerPlayer ?? 2);
      setRebuyDistributionRule(editingGame.rebuyDistributionRule ?? 'winner_takes_all');
    } else {
      setGameForm(initialGameForm);
      setSelectedPlayers(new Set());
      setDistributionPercentages(initialPercentages);
      setRebuyLimitMode('max_per_player');
      setRebuyLevel(4);
      setMaxRebuysPerPlayer(2);
      setRebuyDistributionRule('cyclic_distribution');
      setSelectedPresetId('');
      setNewPresetName('');
      setPresetFeedback(null);
    }
  }, [editingGame]);

  const applyPreset = useCallback((presetId: string) => {
    const preset = blindPresets.find((entry) => entry.id === presetId);
    if (!preset) {
      setSelectedPresetId('');
      return;
    }

    setGameForm((prev) => ({
      ...prev,
      startingStack: preset.startingStack,
      levels: preset.levels.length > 0 ? preset.levels.map((level) => ({ ...level, blinds: { ...level.blinds } })) : createDefaultLevels(),
    }));
    setRebuyLimitMode(preset.rebuyLimitMode || 'max_per_player');
    setRebuyLevel(preset.rebuyAllowedUntilLevel);
    setMaxRebuysPerPlayer(preset.maxRebuysPerPlayer ?? 2);
    setSelectedPresetId(preset.id);
    setPresetFeedback(`Structure "${preset.name}" appliquée.`);
  }, [blindPresets]);

  const handleSavePreset = async () => {
    if (!tournament.teamId) {
      setPresetFeedback("Aucun groupe n'est associé à ce tournoi.");
      return;
    }

    try {
      await addBlindPreset(tournament.teamId, {
        name: newPresetName,
        startingStack: gameForm.startingStack,
        levels: gameForm.levels.map((level) => ({ ...level, blinds: { ...level.blinds } })),
        rebuyLimitMode,
        rebuyAllowedUntilLevel: rebuyLevel,
        maxRebuysPerPlayer,
      });
      setNewPresetName('');
      setPresetFeedback('Structure enregistrée dans le groupe.');
    } catch (error) {
      setPresetFeedback((error as Error).message);
    }
  };

  // ADDED: Calculate total pot amount (sum of buy-ins for players who paid to pot)
  const totalPotAmount = useMemo(() => {
    if (!usePotSystem) return 0;
    return playersWhoPaidPot.size * tournament.buyin;
  }, [playersWhoPaidPot.size, usePotSystem, tournament.buyin]);

  // ADDED: Toggle player pot payment
  const togglePlayerPotPayment = (playerId: string) => {
    setPlayersWhoPaidPot(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const updateLevelField = (index: number, field: 'small' | 'big' | 'duration', value: number) => {
    setGameForm((prev) => ({
      ...prev,
      levels: prev.levels.map((level, levelIndex) => {
        if (levelIndex !== index) {
          return level;
        }

        if (field === 'duration') {
          return { ...level, duration: value };
        }

        return {
          ...level,
          blinds: {
            ...level.blinds,
            [field]: value,
          },
        };
      }),
    }));
  };

  const addLevelRow = () => {
    setGameForm((prev) => {
      const lastLevel = prev.levels[prev.levels.length - 1] || { blinds: { small: 25, big: 50 }, duration: 20 };
      return {
        ...prev,
        levels: [
          ...prev.levels,
          {
            blinds: {
              small: lastLevel.blinds.small * 2,
              big: lastLevel.blinds.big * 2,
            },
            duration: lastLevel.duration,
          },
        ],
      };
    });
  };

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlayersList = tournament!.registrations.filter(
      (player: Player) => selectedPlayers.has(player.id) // Added Player type
    );

    // Prize pool is ALWAYS based on number of players, not pot amount
    const prizePool = calculatePrizePool(tournament.buyin, selectedPlayersList.length);
    const winnings = calculateWinnings(prizePool, distributionPercentages);

    // Prepare pot contributions if pot system is used
    const potContributionsArray: PotContribution[] = usePotSystem
      ? selectedPlayersList.map(player => ({
          playerId: player.id,
          playerName: player.nickname || player.name,
          amount: playersWhoPaidPot.has(player.id) ? tournament.buyin : 0 // Buy-in amount if paid to pot, 0 otherwise
        }))
      : [];

    const gameData = {
      startingStack: gameForm.startingStack,
      players: selectedPlayersList,
      tournamentId: tournamentId!,
      prizePool: prizePool,
      distributionPercentages: distributionPercentages,
      winnings: winnings,
      rebuyLimitMode,
      maxRebuysPerPlayer,
      rebuyDistributionRule: rebuyDistributionRule, // ADDED: Include rebuy distribution rule
      // ADDED: Include pot data if pot system is used
      ...(usePotSystem && {
        potContributions: potContributionsArray,
        totalPotAmount: totalPotAmount
      })
    };

    if (editingGame) {
      // Fonctionnalité de modification temporairement désactivée
      console.warn('La modification de parties existantes n\'est pas encore implémentée');
      alert('La modification de parties existantes n\'est pas encore disponible');
      return;
    } else {
      const sanitizedLevels = gameForm.levels
        .map((level) => ({
          blinds: {
            small: Math.max(1, level.blinds.small),
            big: Math.max(level.blinds.small + 1, level.blinds.big),
          },
          duration: Math.max(1, level.duration),
        }))
        .filter((level) => level.blinds.big > level.blinds.small);

      if (sanitizedLevels.length < DEFAULT_LEVEL_COUNT) {
        alert(`Veuillez définir au moins ${DEFAULT_LEVEL_COUNT} niveaux de blindes.`);
        return;
      }

      addGame(
        tournamentId!,
        gameData,
        sanitizedLevels.map((level) => level.blinds),
        sanitizedLevels.map((level) => level.duration),
        rebuyLimitMode === 'until_level' ? rebuyLevel : 999
      );
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

  const hasInvalidLevels = useMemo(
    () => gameForm.levels.some((level) => level.blinds.small <= 0 || level.blinds.big <= level.blinds.small || level.duration <= 0),
    [gameForm.levels]
  );

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
    <div className="space-y-6">
      <form onSubmit={handleCreateGame} className="space-y-6 pb-4">
        <div>
          <label htmlFor="blindPreset" className="block text-sm font-medium text-gray-700 mb-1">
            Structure prédéfinie du groupe
          </label>
          <select
            id="blindPreset"
            value={selectedPresetId}
            onChange={(e) => applyPreset(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
          >
            <option value="">Choisir une structure enregistrée</option>
            {blindPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} - {preset.levels.length} niveaux
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            La structure est sélectionnée pour ce tournoi, mais elle est mémorisée au niveau du groupe.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <label htmlFor="presetName" className="block text-sm font-medium text-gray-700">
            Enregistrer la configuration actuelle comme structure du groupe
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              id="presetName"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Ex: Standard 25/50 - 20 min"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              disabled={!newPresetName.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enregistrer
            </button>
          </div>
          {presetFeedback && <p className="text-xs text-gray-600">{presetFeedback}</p>}
        </div>

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

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Structure complète des blindes
              </label>
              <p className="text-xs text-gray-500">
                Définissez au moins 10 niveaux à l'avance pour gérer une progression non linéaire.
              </p>
            </div>
            <button
              type="button"
              onClick={addLevelRow}
              className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Ajouter un niveau
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">Niveau</th>
                  <th className="px-3 py-2 text-left">Petite blind</th>
                  <th className="px-3 py-2 text-left">Grosse blind</th>
                  <th className="px-3 py-2 text-left">Durée</th>
                </tr>
              </thead>
              <tbody>
                {gameForm.levels.map((level, index) => (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-700">{index + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={level.blinds.small}
                        onChange={(e) => updateLevelField(index, 'small', parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                        min="1"
                        step="1"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={level.blinds.big}
                        onChange={(e) => updateLevelField(index, 'big', parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                        min="2"
                        step="1"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={level.duration}
                        onChange={(e) => updateLevelField(index, 'duration', parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                        min="1"
                        step="1"
                        required
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {gameForm.levels.length < DEFAULT_LEVEL_COUNT && (
            <p className="text-xs text-amber-600">
              Il manque encore {DEFAULT_LEVEL_COUNT - gameForm.levels.length} niveau(x) pour atteindre le minimum recommandé de 10.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="rebuyLimitMode" className="block text-sm font-medium text-gray-700 mb-1">
              Mode de limitation des recaves
            </label>
            <select
              id="rebuyLimitMode"
              value={rebuyLimitMode}
              onChange={(e) => {
                const nextMode = e.target.value as RebuyLimitMode;
                setRebuyLimitMode(nextMode);
                if (nextMode === 'until_level' && (!rebuyLevel || rebuyLevel >= 999)) {
                  setRebuyLevel(4);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
            >
              <option value="max_per_player">Nombre max de recaves par joueur</option>
              <option value="until_level">Jusqu'au niveau</option>
            </select>
          </div>

          {rebuyLimitMode === 'max_per_player' ? (
            <div>
              <label htmlFor="maxRebuysPerPlayer" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre max de recaves par joueur
              </label>
              <input
                type="number"
                id="maxRebuysPerPlayer"
                value={maxRebuysPerPlayer}
                onChange={(e) => setMaxRebuysPerPlayer(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                min="0"
                step="1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">0 = aucune recave. 1 = une seule recave maximum par joueur.</p>
            </div>
          ) : (
            <div>
              <label htmlFor="rebuyLevel" className="block text-sm font-medium text-gray-700 mb-1">
                Recave autorisée jusqu'au niveau (inclus)
              </label>
              <input
                type="number"
                id="rebuyLevel"
                value={rebuyLevel}
                onChange={(e) => setRebuyLevel(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                min="0"
                step="1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Niveau 0 = pas de recave après le début. Niveau 2 = recave possible pendant les niveaux 1 et 2.</p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="rebuyDistributionRule" className="block text-sm font-medium text-gray-700 mb-1">
            Règle de distribution des rebuy
          </label>
          <select
            id="rebuyDistributionRule"
            value={rebuyDistributionRule}
            onChange={(e) => setRebuyDistributionRule(e.target.value as 'winner_takes_all' | 'cyclic_distribution')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
          >
            <option value="winner_takes_all">Tous les rebuy au vainqueur</option>
            <option value="cyclic_distribution">Distribution cyclique (1er, 2ème, 3ème)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {rebuyDistributionRule === 'winner_takes_all'
              ? 'Tous les rebuy iront au 1er place (règle actuelle).'
              : 'Les rebuy seront distribués en cycle : 1er rebuy → 1er place, 2ème rebuy → 2ème place, 3ème rebuy → 3ème place, puis recommence.'}
          </p>
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

        {/* ADDED: Pot Management Section */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-poker-black">Gestion du Pot</h3>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={usePotSystem}
                onChange={(e) => setUsePotSystem(e.target.checked)}
                className="w-4 h-4 text-poker-red border-gray-300 rounded focus:ring-poker-red"
              />
              <span className="text-sm text-gray-700">Utiliser un pot centralisé</span>
            </label>
          </div>

          {usePotSystem && selectedPlayers.size > 0 && (
           <div className="bg-gray-50 p-4 rounded-lg space-y-3">
             <p className="text-sm text-gray-600">
               Qui a payé son buy-in ({tournament.buyin}€) au pot :
             </p>
             
             <div className="grid grid-cols-2 gap-2">
               {Array.from(selectedPlayers).map(playerId => {
                 const player = tournament.registrations.find(p => p.id === playerId);
                 if (!player) return null;
                 
                 const hasPaidToPot = playersWhoPaidPot.has(playerId);
                 
                 return (
                   <label
                     key={playerId}
                     className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                       hasPaidToPot ? 'bg-poker-gold/10 border-poker-gold' : 'bg-white border-gray-200'
                     } border`}
                   >
                     <span className="font-medium text-gray-800 text-sm">
                       {player.nickname || player.name}
                     </span>
                     <div className="flex items-center space-x-2">
                       <input
                         type="checkbox"
                         checked={hasPaidToPot}
                         onChange={() => togglePlayerPotPayment(playerId)}
                         className="w-4 h-4 text-poker-red border-gray-300 rounded focus:ring-poker-red"
                       />
                       <span className="text-sm text-gray-600">
                         {hasPaidToPot ? `${tournament.buyin}€` : '0€'}
                       </span>
                     </div>
                   </label>
                 );
               })}
             </div>

             <div className="flex justify-between items-center bg-poker-red/10 p-3 rounded border-l-4 border-poker-red">
               <span className="font-semibold text-gray-800">Total du Pot :</span>
               <span className="font-bold text-xl text-poker-red">{totalPotAmount} €</span>
             </div>

             {totalPotAmount > 0 && (
               <p className="text-xs text-gray-500">
                 Le prize pool sera distribué à partir de ce pot. Les règlements tiendront compte des contributions individuelles.
               </p>
             )}
           </div>
         )}

          {usePotSystem && selectedPlayers.size === 0 && (
            <p className="text-sm text-gray-500 italic">
              Sélectionnez d'abord les joueurs pour configurer le pot.
            </p>
          )}
        </div>

        <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold text-poker-black">Prize Pool & Répartition</h3>
            <div className="flex justify-between items-center bg-gray-100 p-3 rounded-md">
                <span className="font-medium text-gray-800">
                 Prize Pool Total:
               </span>
                <span className="font-bold text-xl text-poker-red">{prizePool} €</span>
            </div>

            {usePotSystem && totalPotAmount < prizePool && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Le pot ({totalPotAmount}€) ne couvre pas entièrement le prize pool ({prizePool}€).
                  Les manquants devront être réglés entre joueurs.
                </p>
              </div>
            )}

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
            disabled={selectedPlayers.size < 2 || gameForm.levels.length < DEFAULT_LEVEL_COUNT || hasInvalidLevels}
            className="w-full sm:w-auto bg-poker-red text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingGame ? 'Mettre à jour' : 'Créer la partie'}
          </button>
        </div>
      </form>
    </div>
  );
}
