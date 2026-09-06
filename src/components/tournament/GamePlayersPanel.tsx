import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, UserCheck, UserX, UserMinus, RefreshCcw } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useTournamentStore } from '../../store/tournamentStore';
import type { Game } from '../../store/types/tournamentTypes';

interface GamePlayersPanelProps {
  game: Game;
  tournamentId: string;
  gameId: string;
  buyIn: number;
  canManageGame: boolean;
  onEliminate: (playerId: string, isCurrentlyEliminated: boolean | undefined) => Promise<void>;
  onRebuy: (playerId: string) => Promise<void>;
  rebuyLoading: string | null;
  rebuyError: string | null;
}

export function GamePlayersPanel({
  game, tournamentId, gameId, buyIn, canManageGame,
  onEliminate, onRebuy, rebuyLoading, rebuyError,
}: GamePlayersPanelProps) {
  const { user } = useAuthStore();
  const updatePlayerPayment = useTournamentStore((state) => state.updatePlayerPayment);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerCards = useRef(new Map<string, HTMLDivElement>());
  const previousPositions = useRef(new Map<string, number>());
  const previousOrder = useRef<string[]>([]);
  const animations = useRef(new Map<string, Animation>());
  const rebuyLimitMode = game.rebuyLimitMode || 'until_level';
  const canEdit = !!user && canManageGame;
  const busy = saving || rebuyLoading !== null;
  const rankedPlayers = [...game.players].sort((a, b) => {
    if (!!a.eliminated !== !!b.eliminated) return a.eliminated ? 1 : -1;
    if (!a.eliminated) return 0;
    return (b.eliminationTime ?? 0) - (a.eliminationTime ?? 0);
  });

  // Measure layout positions before paint, then animate from the previous places.
  // Offsets within the list keep scrolling from being mistaken for player movement.
  useLayoutEffect(() => {
    const order = rankedPlayers.map((player) => player.id);
    const reordered = previousOrder.current.length === order.length &&
      order.some((id, index) => id !== previousOrder.current[index]);
    const positions = new Map<string, number>();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    playerCards.current.forEach((card, id) => {
      const top = card.offsetTop;
      positions.set(id, top);
      if (!reordered) return;

      const previousTop = previousPositions.current.get(id);
      const running = animations.current.get(id);
      const transform = getComputedStyle(card).transform;
      const currentOffset = running && transform !== 'none' ? new DOMMatrixReadOnly(transform).m42 : 0;
      running?.cancel();
      animations.current.delete(id);
      if (reduceMotion || previousTop === undefined || !card.animate) return;

      const distance = previousTop + currentOffset - top;
      if (Math.abs(distance) < 1) return;
      const animation = card.animate(
        [{ transform: `translateY(${distance}px)` }, { transform: 'translateY(0)' }],
        { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
      animations.current.set(id, animation);
      animation.onfinish = () => {
        if (animations.current.get(id) === animation) animations.current.delete(id);
      };
    });
    previousPositions.current = positions;
    previousOrder.current = order;
  });

  useEffect(() => {
    const activeAnimations = animations.current;
    return () => {
      activeAnimations.forEach((animation) => animation.cancel());
      activeAnimations.clear();
    };
  }, []);

  const runAction = async (action: () => Promise<void>) => {
    if (busy) return;
    setSaving(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer la modification.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {!canEdit && (
        <p className="p-3 bg-blue-500/15 border border-blue-400/30 rounded-md text-sm text-blue-200">
          Mode visiteur : suivi des joueurs sans interaction.
        </p>
      )}
      {game.status === 'in_progress' && (
        <div className="p-3 bg-blue-500/15 border border-blue-400/30 rounded-md text-sm text-blue-200">
          {rebuyLimitMode === 'max_per_player'
            ? `Recave limitée à ${game.maxRebuysPerPlayer ?? 0} fois par joueur.`
            : `Recave autorisée jusqu’à la fin du niveau ${game.rebuyAllowedUntilLevel}.`}
          <br />Total des recaves : {game.totalRebuys ?? 0} ({(game.totalRebuys ?? 0) * game.rebuyAmount} €)
        </div>
      )}
      {canEdit && <p className="text-sm text-gray-400">Cliquez sur un joueur pour gérer ses paiements et sa participation.</p>}
      {(error || rebuyError) && (
        <p role="alert" className="p-3 bg-red-500/15 border border-red-400/30 rounded-md text-sm text-red-300">
          {error || rebuyError}
        </p>
      )}
      <div className="relative space-y-3 pb-2">
        {game.players.length === 0 && <p className="text-sm text-gray-400">Aucun joueur dans cette partie.</p>}
        {rankedPlayers.map((player, index) => {
          const rebuys = player.rebuysMade ?? 0;
          const paidRebuys = Array.from({ length: rebuys }, (_, index) => player.rebuyPayments?.[index] ?? false).filter(Boolean).length;
          const expanded = selectedPlayerId === player.id;
          const canRebuy = player.eliminated && game.status === 'in_progress' && (
            rebuyLimitMode === 'max_per_player'
              ? rebuys < (game.maxRebuysPerPlayer ?? 0)
              : game.currentLevel < game.rebuyAllowedUntilLevel
          );
          const paymentToggle = (label: string, paid: boolean, rebuyIndex: number | null) => (
            <label className="flex items-center justify-between gap-3 py-2">
              <span>{label}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className={paid ? 'text-green-300' : 'text-amber-200'}>{paid ? 'Payé' : 'Non payé'}</span>
                <input
                  type="checkbox"
                  checked={paid}
                  disabled={busy}
                  aria-label={`${label} payé`}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    void runAction(() => updatePlayerPayment(tournamentId, gameId, player.id, rebuyIndex, checked));
                  }}
                  className="w-5 h-5 accent-green-500"
                />
              </span>
            </label>
          );
          return (
            <div
              key={player.id}
              ref={(node) => {
                if (node) playerCards.current.set(player.id, node);
                else playerCards.current.delete(player.id);
              }}
              className={`rounded-lg border ${player.eliminated ? 'bg-red-500/10 border-red-400/30' : 'bg-green-500/10 border-green-400/30'}`}
            >
              <button
                type="button"
                disabled={!canEdit}
                aria-expanded={expanded}
                aria-controls={`player-details-${player.id}`}
                onClick={() => setSelectedPlayerId(expanded ? null : player.id)}
                className="w-full flex items-center gap-3 p-3 text-left rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
              >
                {player.eliminated ? <UserX aria-hidden="true" className="w-5 h-5 shrink-0 text-red-400" /> : <UserCheck aria-hidden="true" className="w-5 h-5 shrink-0 text-green-400" />}
                <span className="flex-1 min-w-0">
                  <span className={`block font-semibold break-words ${player.eliminated ? 'text-red-300' : 'text-green-300'}`}>
                    {player.nickname || player.name}
                    {player.eliminated && (
                      <span className="ml-2 text-xs font-medium text-red-200">
                        {index + 1}{index === 0 ? 'er' : 'e'} place
                      </span>
                    )}
                  </span>
                  <span className="sr-only">{player.eliminated ? 'Éliminé' : 'En jeu'}</span>
                  <span className="block text-sm text-gray-200 mt-1">Buy-in : {player.buyInPaid ? 'payé' : 'non payé'}</span>
                  <span className="block text-sm text-gray-300">
                    {rebuys} recave{rebuys !== 1 ? 's' : ''}{rebuys > 0 && ` · ${paidRebuys} payée${paidRebuys !== 1 ? 's' : ''} · ${rebuys - paidRebuys} non payée${rebuys - paidRebuys !== 1 ? 's' : ''}`}
                  </span>
                </span>
                {canEdit && <ChevronDown aria-hidden="true" className={`w-5 h-5 text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`} />}
              </button>
              {expanded && canEdit && (
                <div id={`player-details-${player.id}`} className="border-t border-white/10 px-3 pb-3 text-sm text-white">
                  <fieldset disabled={busy} className="py-2">
                    <legend className="sr-only">Paiements de {player.nickname || player.name}</legend>
                    {paymentToggle(`Buy-in (${buyIn} €)`, player.buyInPaid ?? false, null)}
                    {Array.from({ length: rebuys }, (_, index) => (
                      <div key={index}>{paymentToggle(`Recave ${index + 1} (${game.rebuyAmount} €)`, player.rebuyPayments?.[index] ?? false, index)}</div>
                    ))}
                  </fieldset>
                  {game.status === 'in_progress' && (
                    <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                      {player.eliminated ? (
                        <>
                          <button disabled={busy || !canRebuy} onClick={() => void runAction(() => onRebuy(player.id))} className="btn btn-blue text-sm">
                            <RefreshCcw className="w-4 h-4 mr-2" />Remettre en jeu par recave ({game.rebuyAmount} €)
                          </button>
                          <button disabled={busy} onClick={() => void runAction(() => onEliminate(player.id, true))} className="btn btn-green text-sm">
                            <UserCheck className="w-4 h-4 mr-2" />Annuler l’élimination (sans recave)
                          </button>
                          {!canRebuy && <p className="w-full text-gray-400">La limite de recave est atteinte.</p>}
                        </>
                      ) : (
                        <button disabled={busy} onClick={() => void runAction(() => onEliminate(player.id, false))} className="btn btn-red text-sm">
                          <UserMinus className="w-4 h-4 mr-2" />Éliminer le joueur
                        </button>
                      )}
                    </div>
                  )}
                  {saving && <p role="status" className="mt-2 text-gray-300">Enregistrement…</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
