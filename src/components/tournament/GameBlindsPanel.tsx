import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, Check, Loader2, Plus } from 'lucide-react';
import { useTournamentStore } from '../../store/tournamentStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTeamStore } from '../../store/useTeamStore';
import type { BlindLevel, Game, RebuyLimitMode } from '../../store/types/tournamentTypes';

interface GameBlindsPanelProps {
  game: Game;
  tournamentId: string;
  gameId: string;
}

const buildLevelsFromGame = (currentGame: Game): BlindLevel[] =>
  currentGame.blindStructure.map((blinds, index) => ({
    blinds: { ...blinds },
    duration: currentGame.levelDurations?.[index] || currentGame.levelDurations?.[0] || 20,
  }));

export function GameBlindsPanel({ game, tournamentId, gameId }: GameBlindsPanelProps) {
  const { user } = useAuthStore();
  const tournaments = useTournamentStore((state) => state.tournaments);
  const updateBlinds = useTournamentStore((state) => state.updateBlinds);
  const updateGameStructure = useTournamentStore((state) => state.updateGameStructure);
  const resetLevelTimer = useTournamentStore((state) => state.resetLevelTimer);
  const updateLevelDuration = useTournamentStore((state) => state.updateLevelDuration);
  const teams = useTeamStore((state) => state.teams);

  const tournament = useMemo(
    () => tournaments.find((entry) => entry.id === tournamentId),
    [tournaments, tournamentId]
  );
  const currentTeam = useMemo(
    () => teams.find((team) => team.id === tournament?.teamId),
    [teams, tournament?.teamId]
  );
  const blindPresets = currentTeam?.blindPresets || [];

  const [newSmallBlind, setNewSmallBlind] = useState('');
  const [newBigBlind, setNewBigBlind] = useState('');
  const [newLevelDuration, setNewLevelDuration] = useState('');
  const [newRebuyLevel, setNewRebuyLevel] = useState(game.rebuyAllowedUntilLevel?.toString() || '4');
  const [rebuyLimitMode, setRebuyLimitMode] = useState<RebuyLimitMode>(game.rebuyLimitMode || 'until_level');
  const [maxRebuysPerPlayer, setMaxRebuysPerPlayer] = useState(game.maxRebuysPerPlayer ?? 2);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [editableLevels, setEditableLevels] = useState<BlindLevel[]>(() => buildLevelsFromGame(game));
  const [structureRebuyLevel, setStructureRebuyLevel] = useState(game.rebuyAllowedUntilLevel ?? 4);
  const [loadingStatus, setLoadingStatus] = useState<'blinds' | 'duration' | 'rebuy' | 'structure' | null>(null);
  const [savedStatus, setSavedStatus] = useState<'blinds' | 'duration' | 'rebuy' | 'structure' | null>(null);

  const showSuccess = (type: 'blinds' | 'duration' | 'rebuy' | 'structure') => {
    setLoadingStatus(null);
    setSavedStatus(type);
    setTimeout(() => setSavedStatus(null), 1200);
  };

  useEffect(() => {
    if (!game) return;

    const nextLevel = game.currentLevel + 1;
    const nextBlinds = game.blindStructure?.[nextLevel];
    const nextDuration = game.levelDurations?.[nextLevel];

    if (nextBlinds) {
      setNewSmallBlind(nextBlinds.small.toString());
      setNewBigBlind(nextBlinds.big.toString());
    } else {
      const currentBlinds = game.blindStructure?.[game.currentLevel];
      if (currentBlinds) {
        setNewSmallBlind((currentBlinds.small * 2).toString());
        setNewBigBlind((currentBlinds.big * 2).toString());
      }
    }

    if (nextDuration) {
      setNewLevelDuration(nextDuration.toString());
    } else {
      const currentDuration = game.levelDurations?.[game.currentLevel];
      if (currentDuration) {
        setNewLevelDuration(currentDuration.toString());
      }
    }

    const nextRebuyMode = game.rebuyLimitMode || 'until_level';
    setNewRebuyLevel((nextRebuyMode === 'max_per_player' ? game.maxRebuysPerPlayer ?? 2 : game.rebuyAllowedUntilLevel ?? 4).toString());
    setRebuyLimitMode(nextRebuyMode);
    setMaxRebuysPerPlayer(game.maxRebuysPerPlayer ?? 2);
    setStructureRebuyLevel(game.rebuyAllowedUntilLevel ?? 4);
    setEditableLevels(buildLevelsFromGame(game));
    setSelectedPresetId('');
  }, [game]);

  const handleUpdateBlinds = async () => {
    if (!user || !game) return;
    const small = parseInt(newSmallBlind, 10);
    const big = parseInt(newBigBlind, 10);
    if (isNaN(small) || isNaN(big) || small <= 0 || big <= small) {
      alert("Veuillez entrer des blinds valides (la grosse blind doit être supérieure à la petite).");
      return;
    }
    setLoadingStatus('blinds');
    await updateBlinds(tournamentId, gameId, { small, big }, user.uid);
    showSuccess('blinds');
  };

  const handleUpdateDuration = async () => {
    if (!user || !game) return;
    const duration = parseInt(newLevelDuration, 10);
    if (isNaN(duration) || duration <= 0) {
      alert('Veuillez entrer une durée valide en minutes.');
      return;
    }
    setLoadingStatus('duration');
    await updateLevelDuration(tournamentId, gameId, duration, user.uid);
    showSuccess('duration');
  };

  const handleUpdateRebuyLevel = async () => {
    if (!user || !game) return;
    const value = parseInt(newRebuyLevel, 10);
    if (isNaN(value) || value < 0) {
      alert(rebuyLimitMode === 'max_per_player'
        ? 'Veuillez entrer un nombre max de recaves valide.'
        : 'Veuillez entrer un niveau de rebuy valide.');
      return;
    }
    setLoadingStatus('rebuy');
    await updateGameStructure(
      tournamentId,
      gameId,
      game.blindStructure,
      game.levelDurations,
      user.uid,
      rebuyLimitMode === 'until_level' ? value : 999,
      rebuyLimitMode,
      rebuyLimitMode === 'max_per_player' ? value : maxRebuysPerPlayer
    );
    showSuccess('rebuy');
  };

  const updateEditableLevel = useCallback((index: number, field: 'small' | 'big' | 'duration', value: number) => {
    setEditableLevels((prev) =>
      prev.map((level, levelIndex) => {
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
      })
    );
  }, []);

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = blindPresets.find((entry) => entry.id === presetId);
    if (!preset) {
      setEditableLevels(buildLevelsFromGame(game));
      setStructureRebuyLevel(game.rebuyAllowedUntilLevel ?? 4);
      return;
    }

    setEditableLevels(
      preset.levels.map((level) => ({
        blinds: { ...level.blinds },
        duration: level.duration,
      }))
    );
    setRebuyLimitMode(preset.rebuyLimitMode || 'max_per_player');
    setMaxRebuysPerPlayer(preset.maxRebuysPerPlayer ?? 2);
    setStructureRebuyLevel(preset.rebuyAllowedUntilLevel || 4);
    setNewRebuyLevel(((preset.rebuyLimitMode || 'max_per_player') === 'max_per_player' ? preset.maxRebuysPerPlayer ?? 2 : preset.rebuyAllowedUntilLevel || 4).toString());
  };

  const handleAddLevel = () => {
    setEditableLevels((prev) => {
      const lastLevel = prev[prev.length - 1] || { blinds: { small: 25, big: 50 }, duration: 20 };
      return [
        ...prev,
        {
          blinds: {
            small: lastLevel.blinds.small * 2,
            big: lastLevel.blinds.big * 2,
          },
          duration: lastLevel.duration,
        },
      ];
    });
  };

  const handleSaveStructure = async () => {
    if (!user || !game) return;

    const sanitizedLevels = editableLevels
      .map((level) => ({
        blinds: {
          small: Math.max(1, Math.trunc(level.blinds.small)),
          big: Math.max(Math.trunc(level.blinds.small) + 1, Math.trunc(level.blinds.big)),
        },
        duration: Math.max(1, Math.trunc(level.duration)),
      }))
      .filter((level) => level.blinds.big > level.blinds.small);

    if (sanitizedLevels.length === 0) {
      alert('Veuillez définir au moins un niveau valide.');
      return;
    }

    if (sanitizedLevels.length !== editableLevels.length) {
      alert('Corrigez les niveaux invalides avant d’enregistrer la structure.');
      return;
    }

    setLoadingStatus('structure');
    await updateGameStructure(
      tournamentId,
      gameId,
      sanitizedLevels.map((level) => level.blinds),
      sanitizedLevels.map((level) => level.duration),
      user.uid,
      rebuyLimitMode === 'until_level' ? Math.max(0, structureRebuyLevel) : 999,
      rebuyLimitMode,
      maxRebuysPerPlayer
    );
    showSuccess('structure');
  };

  const getButtonProps = (
    type: 'blinds' | 'duration' | 'rebuy' | 'structure',
    disabledCondition: boolean,
    defaultLabel = 'Définir'
  ) => {
    const isSaved = savedStatus === type;
    const isLoading = loadingStatus === type;

    let children: React.ReactNode = defaultLabel;
    let bgClass = 'bg-indigo-600 hover:bg-indigo-700';

    if (isLoading) {
      children = <><Loader2 className="w-4 h-4 mr-1 animate-spin" />...</>;
    } else if (isSaved) {
      children = <><Check className="w-4 h-4 mr-1" />OK</>;
      bgClass = 'bg-green-500 hover:bg-green-600';
    }

    return {
      className: `px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 flex items-center justify-center min-w-[90px] ${bgClass}`,
      disabled: disabledCondition || isSaved || isLoading,
      children
    };
  };

  const handleResetTimer = () => {
    if (!user || !game) return;
    resetLevelTimer(tournamentId, gameId, user.uid);
  };

  if (!user || !game.players.some((p) => p.id === user.uid) || !game.blindStructure || game.blindStructure.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 flex items-center">
        <Edit className="w-5 h-5 mr-2" />
        Réglages de la partie
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Blinds du niveau {game.currentLevel + 2}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={`SB: ${game.blindStructure[game.currentLevel]?.small * 2}`}
              value={newSmallBlind}
              onChange={(e) => setNewSmallBlind(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="1"
              step="1"
            />
            <input
              type="number"
              placeholder={`BB: ${game.blindStructure[game.currentLevel]?.big * 2}`}
              value={newBigBlind}
              onChange={(e) => setNewBigBlind(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="2"
              step="1"
            />
            <button
              onClick={handleUpdateBlinds}
              {...getButtonProps('blinds', !newSmallBlind || !newBigBlind)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Durée du niveau {game.currentLevel + 2}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={`${game.levelDurations?.[game.currentLevel]} min`}
              value={newLevelDuration}
              onChange={(e) => setNewLevelDuration(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="1"
              step="1"
            />
            <button
              onClick={handleUpdateDuration}
              {...getButtonProps('duration', !newLevelDuration)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {rebuyLimitMode === 'max_per_player'
              ? 'Recaves max par joueur pour cette partie'
              : `Recaves autorisees jusqu'au niveau pour cette partie`}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={rebuyLimitMode === 'max_per_player' ? `${game.maxRebuysPerPlayer ?? 2}` : `${game.rebuyAllowedUntilLevel}`}
              value={newRebuyLevel}
              onChange={(e) => setNewRebuyLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="0"
              step="1"
            />
            <button
              onClick={handleUpdateRebuyLevel}
              {...getButtonProps('rebuy', !newRebuyLevel)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div className="flex-1">
            <label htmlFor="activeBlindPreset" className="block text-sm font-medium text-gray-700 mb-1">
              Changer de structure
            </label>
            <select
              id="activeBlindPreset"
              value={selectedPresetId}
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">Structure actuelle</option>
              {blindPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} - {preset.levels.length} niveaux
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Sélectionne une structure du groupe, puis enregistre pour l’appliquer à la partie en cours.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddLevel}
            className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un niveau
          </button>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
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
              {editableLevels.map((level, index) => (
                <tr key={index} className={index === game.currentLevel ? 'bg-amber-50' : 'border-t border-gray-100'}>
                  <td className="px-3 py-2 font-medium text-gray-700">
                    {index + 1}
                    {index === game.currentLevel ? ' (en cours)' : ''}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={level.blinds.small}
                      onChange={(e) => updateEditableLevel(index, 'small', parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      min="1"
                      step="1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={level.blinds.big}
                      onChange={(e) => updateEditableLevel(index, 'big', parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      min="2"
                      step="1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={level.duration}
                      onChange={(e) => updateEditableLevel(index, 'duration', parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      min="1"
                      step="1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="w-full md:max-w-xs">
            <label htmlFor="panelRebuyMode" className="block text-sm font-medium text-gray-700 mb-1">
              Mode de recave
            </label>
            <select
              id="panelRebuyMode"
              value={rebuyLimitMode}
              onChange={(e) => {
                const nextMode = e.target.value as RebuyLimitMode;
                setRebuyLimitMode(nextMode);
                if (nextMode === 'until_level') {
                  const nextLevelValue = structureRebuyLevel && structureRebuyLevel < 999 ? structureRebuyLevel : 4;
                  setStructureRebuyLevel(nextLevelValue);
                  setNewRebuyLevel(nextLevelValue.toString());
                } else {
                  const nextMaxValue = maxRebuysPerPlayer || 2;
                  setMaxRebuysPerPlayer(nextMaxValue);
                  setNewRebuyLevel(nextMaxValue.toString());
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="max_per_player">Nombre max par joueur</option>
              <option value="until_level">Jusqu'au niveau</option>
            </select>
          </div>

          <div className="w-full md:max-w-xs">
            {rebuyLimitMode === 'max_per_player' ? (
              <>
                <label htmlFor="maxRebuysPerPlayer" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre max de recaves
                </label>
                <input
                  id="maxRebuysPerPlayer"
                  type="number"
                  value={maxRebuysPerPlayer}
                  onChange={(e) => setMaxRebuysPerPlayer(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                  step="1"
                />
              </>
            ) : (
              <>
                <label htmlFor="structureRebuyLevel" className="block text-sm font-medium text-gray-700 mb-1">
                  Recave jusqu'au niveau
                </label>
                <input
                  id="structureRebuyLevel"
                  type="number"
                  value={structureRebuyLevel}
                  onChange={(e) => setStructureRebuyLevel(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                  step="1"
                />
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveStructure}
            {...getButtonProps('structure', editableLevels.length === 0, 'Enregistrer la structure')}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleResetTimer}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Réinit. timer du niveau en cours
        </button>
      </div>
    </div>
  );
}
