import { getRebuyGains } from '../../store/helpers/prizePoolSummary';
import { isBuyInPaid, paidRebuyAmount } from '../../store/helpers/gamePayments';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Game, Tournament, PotContribution } from '../../store/types/tournamentTypes';
import { calculateWinnings } from '../../lib/utils';

import { useTournamentStore } from '../../store/tournamentStore';

interface GamePrizePoolPanelProps {
  game: Game;
  tournament: Tournament;
  canManageGame: boolean;
  onClose: () => void;
}

function normalizeDistributionPercentages(percentages?: { first?: number; second?: number; third?: number }) {
  const rawFirst = Math.max(0, Math.trunc(percentages?.first ?? 60));
  const rawSecond = Math.max(0, Math.trunc(percentages?.second ?? 25));
  const rawThird = Math.max(0, Math.trunc(percentages?.third ?? 15));

  const first = Math.min(rawFirst, 100);
  const remainingAfterFirst = 100 - first;
  const second = Math.min(rawSecond, remainingAfterFirst);
  const remainingAfterSecond = remainingAfterFirst - second;
  const third = Math.min(rawThird, remainingAfterSecond);
  const remainder = 100 - (first + second + third);

  return {
    first,
    second,
    third: third + remainder,
  };
}

export function GamePrizePoolPanel({ game, tournament, canManageGame, onClose }: GamePrizePoolPanelProps) {
  const updateGamePrizeSettings = useTournamentStore(state => state.updateGamePrizeSettings);
  // We can add actual updating logic here later. For now, it displays current settings
  // and allows local edits in the form.
  const [prizePool, setPrizePool] = useState(game.prizePool?.toString() || '0');
  const [distributionPercentages, setDistributionPercentages] = useState<{first: number, second: number, third: number}>(
    normalizeDistributionPercentages(game.distributionPercentages)
  );
  const [rebuyRule, setRebuyRule] = useState<'winner_takes_all' | 'cyclic_distribution' | 'cyclic_top_two'>(game.rebuyDistributionRule || 'winner_takes_all');

  const [usePotSystem, setUsePotSystem] = useState<boolean>(game.potContributions !== undefined);
  const [playersWhoPaidPot, setPlayersWhoPaidPot] = useState<Set<string>>(
    new Set(game.players.filter(player => isBuyInPaid(game, player)).map(player => player.id))
  );

  useEffect(() => {
    setPrizePool(game.prizePool?.toString() || '0');
    setDistributionPercentages(normalizeDistributionPercentages(game.distributionPercentages));
    setRebuyRule(game.rebuyDistributionRule || 'winner_takes_all');
    setUsePotSystem(game.potContributions !== undefined);
    setPlayersWhoPaidPot(new Set(game.players.filter(player => isBuyInPaid(game, player)).map(player => player.id)));
  }, [game]);

  const collectedRebuys = game.players.reduce((sum, player) => sum + paidRebuyAmount(game, player), 0);
  const totalPotAmount = useMemo(() => {
    if (!usePotSystem) return collectedRebuys;
    return playersWhoPaidPot.size * tournament.buyin + collectedRebuys;
  }, [playersWhoPaidPot.size, usePotSystem, tournament.buyin, collectedRebuys]);

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

  const totalRebuys = game.players.reduce((total, player) => total + (player.rebuysMade ?? 0), 0);
  const rebuyGains = getRebuyGains(totalRebuys, game.rebuyAmount, rebuyRule);

  const adjustPercentage = useCallback((place: 'first' | 'second' | 'third', adjustment: number) => {
    setDistributionPercentages(prev => {
      const next = { ...prev };
      const otherPlaces = (['first', 'second', 'third'] as const).filter((entry) => entry !== place);
      const proposed = next[place] + adjustment;

      if (proposed < 0 || proposed > 100) {
        return prev;
      }

      if (adjustment > 0) {
        let remainingToRemove = adjustment;

        for (const otherPlace of otherPlaces) {
          if (remainingToRemove <= 0) break;
          const removable = Math.min(next[otherPlace], remainingToRemove);
          next[otherPlace] -= removable;
          remainingToRemove -= removable;
        }

        if (remainingToRemove > 0) {
          return prev;
        }
      } else if (adjustment < 0) {
        const increase = Math.abs(adjustment);
        const baseShare = Math.floor(increase / otherPlaces.length);
        let remainder = increase % otherPlaces.length;

        otherPlaces.forEach((otherPlace) => {
          next[otherPlace] += baseShare + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder -= 1;
        });
      }

      next[place] = proposed;
      return next;
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
        : game.players.map(player => ({ playerId: player.id, playerName: player.name, amount: 0 }));

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
    <div className="min-w-0 space-y-3">
      {!canManageGame && (
        <div className="rounded-md border border-blue-400/30 bg-blue-500/15 px-3 py-2 text-sm text-blue-200">
          Mode visiteur : consultation uniquement.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-200">Base (€)</label>
            <input
              type="number"
              value={prizePool}
              onChange={(e) => setPrizePool(e.target.value)}
              disabled={!canManageGame}
              className="glass-input mt-1 w-full min-w-0 text-sm"
            />
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-200">Recaves</label>
             <select
                value={rebuyRule}
                onChange={(e) => setRebuyRule(e.target.value as any)}
                disabled={!canManageGame}
                className="glass-input mt-1 w-full min-w-0 text-sm"
             >
                <option value="winner_takes_all">Tout au 1er</option>
                <option value="cyclic_top_two">Cyclique : 1er, 2e</option>
                <option value="cyclic_distribution">Cyclique : 1er, 2e, 3e</option>
             </select>
          </div>

          </div>

        </div>

        <div className="min-w-0 space-y-3">
          <div className="text-xs sm:text-sm">
            <div className="grid grid-cols-[1.5rem_6rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1 pb-2 text-[11px] sm:text-xs text-gray-400" aria-hidden="true">
              <span>Rang</span><span className="text-center">Part</span><span className="text-right">Hors recaves</span><span className="text-right text-poker-gold">Avec recaves</span>
            </div>
            {(['first', 'second', 'third'] as const).map((place, index) => (
              <div key={place} aria-label={`Gains du rang ${index + 1}`} className="grid grid-cols-[1.5rem_6rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1 border-t border-white/10 py-1.5">
                <span className="text-gray-200">{index + 1}{index === 0 ? 'er' : 'e'}</span>
                <div className="flex items-center justify-between">
                  <button type="button" aria-label={`Réduire la part du rang ${index + 1}`} onClick={() => adjustPercentage(place, -5)} className="w-8 h-9 flex shrink-0 items-center justify-center rounded bg-white/10 disabled:opacity-40" disabled={!canManageGame || distributionPercentages[place] <= 0}><Minus size={14} /></button>
                  <span className="font-semibold tabular-nums">{distributionPercentages[place]}%</span>
                  <button type="button" aria-label={`Augmenter la part du rang ${index + 1}`} onClick={() => adjustPercentage(place, 5)} className="w-8 h-9 flex shrink-0 items-center justify-center rounded bg-white/10 disabled:opacity-40" disabled={!canManageGame || distributionPercentages[place] >= 100}><Plus size={14} /></button>
                </div>
                <span className="min-w-0 text-right tabular-nums break-words text-gray-300"><span className="sr-only">Hors recaves : </span>{estimatedWinnings[place]} €</span>
                <span className="min-w-0 text-right font-semibold tabular-nums break-words text-poker-gold"><span className="sr-only">Avec recaves : </span>{estimatedWinnings[place] + rebuyGains[place]} €</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">{totalRebuys} recave{totalRebuys !== 1 ? 's' : ''} incluse{totalRebuys !== 1 ? 's' : ''}, payées ou non.</p>
          {totalDist !== 100 && (
            <p className="text-xs text-red-500">Le total doit faire 100% (actuel: {totalDist}%)</p>
          )}
        </div>
      </div>

          {/* Section Pot Commun */}
          <details className="border-t border-white/10 pt-3 space-y-3">
            <summary className="cursor-pointer text-sm text-gray-300">Encaissements · {totalPotAmount} €</summary>
            <p className="text-xs text-gray-400">Recaves payées : {collectedRebuys} € / {totalRebuys * game.rebuyAmount} €</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-white">Gestion du Pot</h4>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={usePotSystem}
                  onChange={(e) => setUsePotSystem(e.target.checked)}
                  disabled={!canManageGame}
                  className="w-4 h-4 text-poker-red border-gray-300 rounded focus:ring-poker-red"
                />
                <span className="text-sm text-gray-200">Utiliser un pot centralisé</span>
              </label>
            </div>

            {usePotSystem && game.players.length > 0 && (
             <div className="bg-white/5 p-4 rounded-lg space-y-3">
               <p className="text-sm text-gray-300">
                 Qui a payé son buy-in ({tournament.buyin}€) au pot :
               </p>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                 {game.players.map(player => {
                   const hasPaidToPot = playersWhoPaidPot.has(player.id);
                   return (
                     <label
                       key={player.id}
                       className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                         hasPaidToPot ? 'bg-poker-gold/10 border-poker-gold' : 'bg-white/5 border-white/10'
                       } border`}
                     >
                       <span className="font-medium text-white text-sm truncate pr-2">
                         {player.name}
                       </span>
                       <div className="flex items-center space-x-2 shrink-0">
                         <input
                           type="checkbox"
                           checked={hasPaidToPot}
                           onChange={() => togglePlayerPotPayment(player.id)}
                           disabled={!canManageGame}
                           className="w-4 h-4 text-poker-red border-gray-300 rounded focus:ring-poker-red"
                         />
                         <span className="text-sm text-gray-300">
                           {hasPaidToPot ? `${tournament.buyin}€` : '0€'}
                         </span>
                       </div>
                     </label>
                   );
                 })}
               </div>

               <div className="flex justify-between items-center bg-poker-red/10 p-3 rounded border-l-4 border-poker-red mt-2">
                 <span className="font-semibold text-white">Total du Pot :</span>
                 <span className="font-bold text-xl text-poker-red">{totalPotAmount} €</span>
               </div>
             </div>
            )}
          </details>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!canManageGame || totalDist !== 100}
          className="btn btn-gold w-full sm:w-auto whitespace-normal text-center"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
