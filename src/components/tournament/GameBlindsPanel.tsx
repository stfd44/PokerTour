import React, { useState, useEffect } from 'react';
import { Edit, Check, Loader2 } from 'lucide-react';
import { useTournamentStore } from '../../store/tournamentStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { Game } from '../../store/types/tournamentTypes';

interface GameBlindsPanelProps {
  game: Game;
  tournamentId: string;
  gameId: string;
}

export function GameBlindsPanel({ game, tournamentId, gameId }: GameBlindsPanelProps) {
  const { user } = useAuthStore();
  const updateBlinds = useTournamentStore(state => state.updateBlinds);
  const resetLevelTimer = useTournamentStore(state => state.resetLevelTimer);
  const updateLevelDuration = useTournamentStore(state => state.updateLevelDuration);
  const updateRebuyLevel = useTournamentStore(state => state.updateRebuyLevel);

  const [newSmallBlind, setNewSmallBlind] = useState('');
  const [newBigBlind, setNewBigBlind] = useState('');
  const [newLevelDuration, setNewLevelDuration] = useState('');
  const [newRebuyLevel, setNewRebuyLevel] = useState(game.rebuyAllowedUntilLevel?.toString() || '2');
  const [loadingStatus, setLoadingStatus] = useState<'blinds' | 'duration' | 'rebuy' | null>(null);
  const [savedStatus, setSavedStatus] = useState<'blinds' | 'duration' | 'rebuy' | null>(null);

  const showSuccess = (type: 'blinds' | 'duration' | 'rebuy') => {
    setLoadingStatus(null);
    setSavedStatus(type);
    setTimeout(() => setSavedStatus(null), 1000);
  };

  // Effect to pre-fill next level's settings in the input fields
  useEffect(() => {
    if (!game) return;

    const nextLevel = game.currentLevel + 1;
    const nextBlinds = game.blindStructure?.[nextLevel];
    const nextDuration = game.levelDurations?.[nextLevel];

    if (nextBlinds) {
      setNewSmallBlind(nextBlinds.small.toString());
      setNewBigBlind(nextBlinds.big.toString());
    } else {
      // Propose doubling the current blinds if next level isn't set
      const currentBlinds = game.blindStructure?.[game.currentLevel];
      if (currentBlinds) {
        setNewSmallBlind((currentBlinds.small * 2).toString());
        setNewBigBlind((currentBlinds.big * 2).toString());
      }
    }

    if (nextDuration) {
      setNewLevelDuration(nextDuration.toString());
    } else {
      // Propose using the current duration if next level's isn't set
      const currentDuration = game.levelDurations?.[game.currentLevel];
      if (currentDuration) {
        setNewLevelDuration(currentDuration.toString());
      }
    }
  }, [game?.currentLevel, game]);

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
        alert("Veuillez entrer une durée valide en minutes.");
        return;
    }
    setLoadingStatus('duration');
    await updateLevelDuration(tournamentId, gameId, duration, user.uid);
    showSuccess('duration');
  };

  const handleUpdateRebuyLevel = async () => {
    if (!user || !game) return;
    const level = parseInt(newRebuyLevel, 10);
    if (isNaN(level) || level < 0) {
        alert("Veuillez entrer un niveau de rebuy valide.");
        return;
    }
    setLoadingStatus('rebuy');
    await updateRebuyLevel(tournamentId, gameId, level, user.uid);
    showSuccess('rebuy');
  };

  const getButtonProps = (type: 'blinds' | 'duration' | 'rebuy', disabledCondition: boolean) => {
    const isSaved = savedStatus === type;
    const isLoading = loadingStatus === type;

    let children: React.ReactNode = "Définir";
    let bgClass = "bg-indigo-600 hover:bg-indigo-700";
    
    if (isLoading) {
      children = <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> ...</>;
    } else if (isSaved) {
      children = <><Check className="w-4 h-4 mr-1" /> OK</>;
      bgClass = "bg-green-500 hover:bg-green-600";
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

  if (!user || !game.players.some(p => p.id === user.uid) || !game.blindStructure || game.blindStructure.length === 0) {
      return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <Edit className="w-5 h-5 mr-2" />
        Gestion des Niveaux de Blindes
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blinds Control for NEXT level */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Blinds (Niveau {game.currentLevel + 2})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={`SB: ${game.blindStructure[game.currentLevel]?.small * 2}`}
              value={newSmallBlind}
              onChange={(e) => setNewSmallBlind(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <input
              type="number"
              placeholder={`BB: ${game.blindStructure[game.currentLevel]?.big * 2}`}
              value={newBigBlind}
              onChange={(e) => setNewBigBlind(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button
              onClick={handleUpdateBlinds}
              {...getButtonProps('blinds', !newSmallBlind || !newBigBlind)}
            />
          </div>
        </div>

        {/* Level Duration Control for NEXT level */}
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
            Durée (Niveau {game.currentLevel + 2})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={`${game.levelDurations?.[game.currentLevel]} min`}
              value={newLevelDuration}
              onChange={(e) => setNewLevelDuration(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button
              onClick={handleUpdateDuration}
              {...getButtonProps('duration', !newLevelDuration)}
            />
          </div>
        </div>
        
        {/* Rebuy Level Control */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Niveau Max Recaves
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={`${game.rebuyAllowedUntilLevel}`}
              value={newRebuyLevel}
              onChange={(e) => setNewRebuyLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="0"
            />
            <button
              onClick={handleUpdateRebuyLevel}
              {...getButtonProps('rebuy', !newRebuyLevel)}
            />
          </div>
        </div>
      </div>
        
      <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleResetTimer} className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300">
             Réinit. Timer du niveau en cours
          </button>
      </div>
    </div>
  );
}
