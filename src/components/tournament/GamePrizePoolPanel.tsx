import React, { useState, useMemo, useCallback } from 'react';
import { DollarSign, Minus, Plus } from 'lucide-react';
import type { Game, Tournament, PotContribution } from '../../store/types/tournamentTypes';
import { calculateWinnings } from '../../lib/utils';

import { useTournamentStore } from '../../store/tournamentStore';

interface GamePrizePoolPanelProps {
  game: Game;
  tournament: Tournament;
  onClose: () => void;
}

export function GamePrizePoolPanel({ game, tournament, onClose }: GamePrizePoolPanelProps) {
  const updateGamePrizeSettings = useTournamentStore(state => state.updateGamePrizeSettings);
  // We can add actual updating logic here later. For now, it displays current settings
  // and allows local edits in the form.
  const [prizePool, setPrizePool] = useState(game.prizePool?.toString() || '0');
  const [distributionPercentages, setDistributionPercentages] = useState<{first: number, second: number, third: number}>({
    first: game.distributionPercentages?.first || 60,
    second: game.distributionPercentages?.second || 25,
    third: game.distributionPercentages?.third || 15
  });
  const [rebuyRule, setRebuyRule] = useState<'winner_takes_all' | 'cyclic_distribution'>(game.rebuyDistributionRule || 'winner_takes_all');

  const [usePotSystem, setUsePotSystem] = useState<boolean>(game.potContributions !== undefined);
  const [playersWhoPaidPot, setPlayersWhoPaidPot] = useState<Set<string>>(
    new Set((game.potContributions || []).filter(c => c.amount > 0).map(c => c.playerId))
  );

  const totalPotAmount = useMemo(() => {
    if (!usePotSystem) return 0;
    return playersWhoPaidPot.size * tournament.buyin;
  }, [playersWhoPaidPot.size, usePotSystem, tournament.buyin]);

  const togglePlayerPotPayment = (playerId: string) => {
    setPlayersWhoPaidPot(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) newSet.delete(playerId);
      else newSet.add(playerId);
      return newSet;
    });
  };

  const totalDist = distributionPercentages.first + distributionPercentages.second + distributionPercentages.third;
  
  const currentPrizePool = parseFloat(prizePool) || 0;
  
  const estimatedWinnings = useMemo(() => {
    return calculateWinnings(currentPrizePool, distributionPercentages);
  }, [currentPrizePool, distributionPercentages]);

  const adjustPercentage = useCallback((place: 'first' | 'second' | 'third', adjustment: number) => {
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

  const handleSave = async () => {
    try {
      const updatedPotContributions: PotContribution[] | undefined = usePotSystem 
        ? game.players.map(player => ({
            playerId: player.id,
            playerName: player.name,
            amount: playersWhoPaidPot.has(player.id) ? tournament.buyin : 0
          }))
        : undefined;

      await updateGamePrizeSettings(
        game.tournamentId,
        game.id,
        currentPrizePool,
        distributionPercentages,
        rebuyRule,
        estimatedWinnings,
        updatedPotContributions,
        totalPotAmount
      );
      if (onClose) onClose();
    } catch (error) {
      console.error("Failed to update prize pool:", error);
      alert("Une erreur est survenue lors de la sauvegarde.");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <DollarSign className="w-5 h-5 mr-2" />
        Gestion du Prize Pool
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Prize Pool Total (€)</label>
            <input
              type="number"
              value={prizePool}
              onChange={(e) => setPrizePool(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700">Règle de redistribution des recaves</label>
             <select
                value={rebuyRule}
                onChange={(e) => setRebuyRule(e.target.value as any)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
             >
                <option value="winner_takes_all">Le vainqueur rafle tout (WTA)</option>
                <option value="cyclic_distribution">Répartition cyclique (1er, 2ème, 3ème)</option>
             </select>
          </div>

          {/* Section Pot Commun */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800">Gestion du Pot</h4>
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

            {usePotSystem && game.players.length > 0 && (
             <div className="bg-gray-50 p-4 rounded-lg space-y-3">
               <p className="text-sm text-gray-600">
                 Qui a payé son buy-in ({tournament.buyin}€) au pot :
               </p>
               
               <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                 {game.players.map(player => {
                   const hasPaidToPot = playersWhoPaidPot.has(player.id);
                   return (
                     <label
                       key={player.id}
                       className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                         hasPaidToPot ? 'bg-poker-gold/10 border-poker-gold' : 'bg-white border-gray-200'
                       } border`}
                     >
                       <span className="font-medium text-gray-800 text-sm truncate pr-2">
                         {player.name}
                       </span>
                       <div className="flex items-center space-x-2 shrink-0">
                         <input
                           type="checkbox"
                           checked={hasPaidToPot}
                           onChange={() => togglePlayerPotPayment(player.id)}
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

               <div className="flex justify-between items-center bg-poker-red/10 p-3 rounded border-l-4 border-poker-red mt-2">
                 <span className="font-semibold text-gray-800">Total du Pot :</span>
                 <span className="font-bold text-xl text-poker-red">{totalPotAmount} €</span>
               </div>
             </div>
            )}
          </div>
          
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Répartition du Prize Pool (%)</label>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-y-1">
              <span className="w-16 shrink-0 text-gray-600">1er:</span>
              <div className="flex items-center space-x-2">
                  <button type="button" onClick={() => adjustPercentage('first', -5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.first <= 0}><Minus size={16} /></button>
                  <span className="font-semibold w-10 text-center">{distributionPercentages.first}%</span>
                  <button type="button" onClick={() => adjustPercentage('first', 5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.first >= 100}><Plus size={16} /></button>
              </div>
              <span className="text-gray-700 w-20 text-right">{estimatedWinnings.first} €</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-y-1">
              <span className="w-16 shrink-0 text-gray-600">2ème:</span>
                <div className="flex items-center space-x-2">
                  <button type="button" onClick={() => adjustPercentage('second', -5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.second <= 0}><Minus size={16} /></button>
                  <span className="font-semibold w-10 text-center">{distributionPercentages.second}%</span>
                  <button type="button" onClick={() => adjustPercentage('second', 5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.second >= 100}><Plus size={16} /></button>
              </div>
              <span className="text-gray-700 w-20 text-right">{estimatedWinnings.second} €</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-y-1">
              <span className="w-16 shrink-0 text-gray-600">3ème:</span>
                <div className="flex items-center space-x-2">
                  <button type="button" onClick={() => adjustPercentage('third', -5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.third <= 0}><Minus size={16} /></button>
                  <span className="font-semibold w-10 text-center">{distributionPercentages.third}%</span>
                  <button type="button" onClick={() => adjustPercentage('third', 5)} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" disabled={distributionPercentages.third >= 100}><Plus size={16} /></button>
              </div>
              <span className="text-gray-700 w-20 text-right">{estimatedWinnings.third} €</span>
            </div>
          </div>
          {totalDist !== 100 && (
            <p className="text-xs text-red-500">Le total doit faire 100% (actuel: {totalDist}%)</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={totalDist !== 100}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          Enregistrer les modifications
        </button>
      </div>
    </div>
  );
}
