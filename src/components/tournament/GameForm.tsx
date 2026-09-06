import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { useTeamStore } from '../../store/useTeamStore';
import { UserCheck, Minus, Plus, ArrowLeft, ArrowRight, Check, Pencil } from 'lucide-react';
import type { Game, Player, Tournament, PotContribution, BlindLevel, RebuyLimitMode } from '../../store/types/tournamentTypes';
import { DEFAULT_LEVEL_COUNT, createDefaultLevels } from '../../lib/blindPresets';
import { calculatePrizePool, calculateWinnings } from '../../lib/utils';

interface GameFormProps {
  tournament: Tournament;
  editingGame: Game | null;
  tournamentId: string;
  onClose: () => void; // Added onClose prop
}

type Step = 'players' | 'payment' | 'paidPlayers' | 'prizes' | 'structure' | 'customStructure' | 'review';

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
  const [step, setStep] = useState<Step>('players');
  const [transition, setTransition] = useState<'idle' | 'out' | 'in'>('idle');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const nextStep = useRef<Step>('players');
  const navigationLocked = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [returnToReview, setReturnToReview] = useState(false);
  const [paymentAnswer, setPaymentAnswer] = useState<boolean | null>(null);
  const [useSavedStructure, setUseSavedStructure] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Track collected buy-ins separately from the prize pool.
  const [usePotSystem, setUsePotSystem] = useState<boolean>(false); // Toggle for pot system
  const [playersWhoPaidPot, setPlayersWhoPaidPot] = useState<Set<string>>(new Set()); // Players who paid to pot

  const currentTeam = useMemo(
    () => teams.find((team) => team.id === tournament.teamId),
    [teams, tournament.teamId]
  );
  const blindPresets = useMemo(() => currentTeam?.blindPresets || [], [currentTeam]);

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

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 'review' || navigationLocked.current || submittingRef.current || !canCreate) return;
    if (editingGame) {
      setSubmitError('La modification de parties existantes n’est pas encore disponible.');
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
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

      await addGame(
        tournamentId,
        gameData,
        gameForm.levels.map((level) => level.blinds),
        gameForm.levels.map((level) => level.duration),
        rebuyLimitMode === 'until_level' ? rebuyLevel : 999
      );
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'La partie n’a pas pu être créée. Réessayez.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const togglePlayer = (playerId: string) => {
    if (selectedPlayers.has(playerId)) {
      setPlayersWhoPaidPot(prev => new Set([...prev].filter(id => id !== playerId)));
    }
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
    return calculateWinnings(prizePool, distributionPercentages);
  }, [prizePool, distributionPercentages]);

  const hasInvalidLevels = useMemo(
    () => gameForm.levels.some((level) => !Number.isFinite(level.blinds.small) || !Number.isFinite(level.blinds.big) || !Number.isFinite(level.duration) || level.blinds.small <= 0 || level.blinds.big <= level.blinds.small || level.duration <= 0),
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

  const structureValid = !hasInvalidLevels && gameForm.levels.length >= DEFAULT_LEVEL_COUNT
    && Number.isFinite(gameForm.startingStack) && gameForm.startingStack >= 1000;
  const canCreate = selectedPlayers.size >= 2 && structureValid
    && paymentAnswer !== null && (paymentAnswer === false || playersWhoPaidPot.size > 0)
    && useSavedStructure !== null && (!useSavedStructure || !!selectedPresetId);
  const selectedPlayersList = tournament.registrations.filter(player => selectedPlayers.has(player.id));
  const titles: Record<Step, string> = {
    players: 'Quels joueurs sont présents à la table ?',
    payment: 'Des joueurs ont-ils déjà payé le buy-in ?',
    paidPlayers: 'Quels joueurs ont déjà payé ?',
    prizes: 'Valider ou ajuster la répartition des gains',
    structure: 'Voulez-vous utiliser une structure enregistrée ?',
    customStructure: 'Ajuster la structure de la partie',
    review: 'Tout est prêt pour votre partie ?',
  };
  const progress = step === 'players' ? 1 : ['payment', 'paidPlayers'].includes(step) ? 2
    : step === 'prizes' ? 3 : step === 'review' ? 5 : 4;

  const navigate = (target: Step, backwards = false) => {
    if (navigationLocked.current || submittingRef.current) return;
    navigationLocked.current = true;
    nextStep.current = target;
    setDirection(backwards ? 'backward' : 'forward');
    setTransition('out');
  };
  const finishStep = (target: Step) => {
    navigate(returnToReview ? 'review' : target);
    setReturnToReview(false);
  };
  const editStep = (target: Step) => {
    setReturnToReview(true);
    navigate(target, true);
  };
  const goBack = () => {
    if (returnToReview) {
      setReturnToReview(false);
      navigate('review');
      return;
    }
    const previous: Record<Step, Step> = {
      players: 'players', payment: 'players', paidPlayers: 'payment',
      prizes: paymentAnswer ? 'paidPlayers' : 'payment', structure: 'prizes',
      customStructure: 'structure', review: 'structure',
    };
    navigate(previous[step], true);
  };
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [step]);

  const playerChoices = (paid: boolean) => (
    <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
      {(paid ? selectedPlayersList : tournament.registrations).map(player => {
        const checked = (paid ? playersWhoPaidPot : selectedPlayers).has(player.id);
        return (
          <label key={player.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-poker-gold ${checked ? 'bg-poker-gold/10 border-poker-gold' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <input type="checkbox" className="sr-only" checked={checked} onChange={() => paid ? togglePlayerPotPayment(player.id) : togglePlayer(player.id)} />
            <UserCheck className={`w-5 h-5 shrink-0 ${checked ? 'text-poker-gold' : 'text-gray-400'}`} aria-hidden="true" />
            <span className="text-sm break-words min-w-0 flex-1">{player.nickname || player.name}</span>
            {checked && <Check className="w-4 h-4 text-poker-gold shrink-0" aria-hidden="true" />}
          </label>
        );
      })}
    </div>
  );
  const primary = (label: string, action: () => void, disabled = false) => (
    <button type="button" className="btn btn-gold gap-2" onClick={action} disabled={disabled || transition !== 'idle'}>
      {label}<ArrowRight size={16} aria-hidden="true" />
    </button>
  );
  const reviewCard = (label: string, target: Step, content: React.ReactNode) => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-medium text-poker-gold">{label}</h3>
        <button type="button" onClick={() => editStep(target)} className="text-sm text-gray-300 hover:text-white flex items-center gap-1" aria-label={`Modifier : ${label}`}>
          <Pencil size={13} aria-hidden="true" />Modifier
        </button>
      </div>
      <div className="text-sm text-gray-200 space-y-1">{content}</div>
    </div>
  );

  return (
    <form ref={formRef} onSubmit={handleCreateGame} className="flex flex-col min-h-0 flex-1" aria-busy={isSubmitting}
      onKeyDown={event => {
        if (event.key === 'Escape' && !isSubmitting) { event.stopPropagation(); onClose(); }
        if (event.key === 'Tab') {
          const elements = formRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, summary, [tabindex="0"]');
          const visible = [...(elements || [])].filter(element => element.getClientRects().length > 0);
          const first = visible[0];
          const last = visible[visible.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <div className="pb-4 shrink-0">
        <div className="flex justify-between text-xs text-gray-400 mb-2"><span>Joueurs · Paiements · Gains · Structure</span><span>{progress} / 5</span></div>
        <div className="flex gap-1.5" aria-label={`Étape ${progress} sur 5`}>
          {[1, 2, 3, 4, 5].map(index => <div key={index} className={`h-1 flex-1 rounded-full transition-colors ${index <= progress ? 'bg-poker-gold' : 'bg-white/10'}`} />)}
        </div>
      </div>
      <div className="overflow-hidden min-h-0 flex flex-col flex-1">
        <fieldset disabled={isSubmitting || transition === 'out'} className={`min-w-0 min-h-0 flex flex-col flex-1 game-wizard-${transition}-${direction}`}
          onAnimationEnd={event => {
            if (event.target !== event.currentTarget) return;
            if (transition === 'out') { setStep(nextStep.current); setTransition('in'); }
            else if (transition === 'in') { navigationLocked.current = false; setTransition('idle'); }
          }}>
          <div ref={bodyRef} className="overflow-y-auto min-h-0 space-y-5 pb-5 px-1" style={{ overscrollBehavior: 'contain' }}>
            <h2 ref={headingRef} tabIndex={-1} className="text-xl sm:text-2xl font-semibold text-white outline-none">{titles[step]}</h2>
            {step === 'players' && <>
              <p className="text-sm text-gray-400">Sélectionnez au moins 2 joueurs. Buy-in : {tournament.buyin} € par personne.</p>
              {playerChoices(false)}
              {tournament.registrations.length < 2 && <p className="text-sm text-amber-200">Invitez au moins deux joueurs au tournoi avant de créer une partie.</p>}
              <p className="text-sm text-poker-gold" role="status">{selectedPlayers.size} joueur{selectedPlayers.size > 1 ? 's' : ''} sélectionné{selectedPlayers.size > 1 ? 's' : ''}</p>
            </>}
            {step === 'payment' && <>
              <p className="text-sm text-gray-400">Indiquez les buy-ins déjà encaissés pour préparer les règlements.</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="btn btn-gold py-6" onClick={() => { setPaymentAnswer(true); setUsePotSystem(true); navigate('paidPlayers'); }}>Oui</button>
                <button type="button" className="btn btn-ghost border border-white/15 py-6" onClick={() => { setPaymentAnswer(false); setUsePotSystem(false); setPlayersWhoPaidPot(new Set()); finishStep('prizes'); }}>Non</button>
              </div>
            </>}
            {step === 'paidPlayers' && <>
              <p className="text-sm text-gray-400">Sélectionnez les joueurs ayant versé leur buy-in de {tournament.buyin} €.</p>
              {playerChoices(true)}
              <p className="text-poker-gold font-medium" role="status">{playersWhoPaidPot.size} / {selectedPlayers.size} payés · {totalPotAmount} € encaissés</p>
            </>}
            {step === 'prizes' && <>
              <div className="glass-inset p-4 flex justify-between items-center"><span>Gains à répartir</span><strong className="text-xl text-poker-gold">{prizePool} €</strong></div>
              <p className="text-sm text-gray-400">Ajustez les parts par pas de 5 %. Le total reste à 100 %.</p>
              {(['first', 'second', 'third'] as const).map((place, index) => (
                <div key={place} className="rounded-xl bg-white/5 p-3 flex flex-wrap items-center justify-between gap-2">
                  <span>{index + 1}{index === 0 ? 're' : 'e'} place</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => adjustPercentage(place, -5)} aria-label={`Réduire la part de la place ${index + 1}`} className="p-2 rounded bg-white/10 disabled:opacity-40" disabled={distributionPercentages[place] < 5}><Minus size={16} /></button>
                    <span className="w-10 text-center font-semibold">{distributionPercentages[place]} %</span>
                    <button type="button" onClick={() => adjustPercentage(place, 5)} aria-label={`Augmenter la part de la place ${index + 1}`} className="p-2 rounded bg-white/10 disabled:opacity-40" disabled={distributionPercentages[place] > 95}><Plus size={16} /></button>
                  </div>
                  <span className="w-16 text-right text-poker-gold">{estimatedWinnings[place]} €</span>
                </div>
              ))}
              <details className="text-sm"><summary className="cursor-pointer text-gray-300">Répartition des recaves</summary><div className="pt-3">        <div>
          <label htmlFor="rebuyDistributionRule" className="block text-sm font-medium text-gray-200 mb-1">
            Règle de distribution des rebuy
          </label>
          <select
            id="rebuyDistributionRule"
            value={rebuyDistributionRule}
            onChange={(e) => setRebuyDistributionRule(e.target.value as 'winner_takes_all' | 'cyclic_distribution')}
            className="glass-input w-full"
          >
            <option value="winner_takes_all">Tous les rebuy au vainqueur</option>
            <option value="cyclic_distribution">Distribution cyclique (1er, 2ème, 3ème)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            {rebuyDistributionRule === 'winner_takes_all'
              ? 'Tous les rebuy iront au 1er place (règle actuelle).'
              : 'Les rebuy seront distribués en cycle : 1er rebuy → 1er place, 2ème rebuy → 2ème place, 3ème rebuy → 3ème place, puis recommence.'}
          </p>
        </div>

</div></details>
            </>}
            {step === 'structure' && <>
              <p className="text-sm text-gray-400">Retrouvez les structures de votre groupe ou utilisez la configuration par défaut.</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" aria-pressed={useSavedStructure === true} disabled={blindPresets.length === 0} className={`btn border ${useSavedStructure === true ? 'btn-gold' : 'btn-ghost border-white/15'}`} onClick={() => setUseSavedStructure(true)}>Oui</button>
                <button type="button" aria-pressed={useSavedStructure === false} className={`btn border ${useSavedStructure === false ? 'btn-gold' : 'btn-ghost border-white/15'}`} onClick={() => {
                  setUseSavedStructure(false);
                  if (selectedPresetId) {
                    setGameForm(prev => ({ ...prev, startingStack: initialGameForm.startingStack, levels: createDefaultLevels() }));
                    setRebuyLimitMode('max_per_player'); setMaxRebuysPerPlayer(2); setRebuyLevel(4);
                  }
                  setSelectedPresetId(''); setPresetFeedback(null);
                }}>Non</button>
              </div>
              {blindPresets.length === 0 && <p className="text-sm text-gray-400">Aucune structure enregistrée dans ce groupe pour le moment.</p>}
              {useSavedStructure === true && <div className="space-y-2">
                <label htmlFor="blindPreset" className="text-sm">Choisissez votre structure</label>
                <select id="blindPreset" value={selectedPresetId} onChange={event => applyPreset(event.target.value)} className="glass-input w-full">
                  <option value="">Choisir une structure</option>
                  {blindPresets.map(preset => <option key={preset.id} value={preset.id}>{preset.name} · {preset.levels.length} niveaux</option>)}
                </select>
              </div>}
              {useSavedStructure !== null && (useSavedStructure === false || selectedPresetId) && <div className="rounded-xl bg-white/5 p-4 space-y-3">
                <p className="font-medium">{selectedPresetId ? blindPresets.find(preset => preset.id === selectedPresetId)?.name : 'Structure de la partie'}</p>
                <p className="text-sm text-gray-300">{gameForm.startingStack.toLocaleString('fr-FR')} jetons · {gameForm.levels.length} niveaux · départ {gameForm.levels[0]?.blinds.small}/{gameForm.levels[0]?.blinds.big}</p>
                <p className="text-sm text-gray-400">{rebuyLimitMode === 'max_per_player' ? `${maxRebuysPerPlayer} recave(s) maximum par joueur` : `Recaves jusqu’au niveau ${rebuyLevel}`}</p>
                <button type="button" className="btn btn-ghost text-sm" onClick={() => { setSelectedPresetId(''); setUseSavedStructure(false); navigate('customStructure'); }}>Personnaliser la structure</button>
              </div>}
            </>}
            {step === 'customStructure' && <>
                      <div>
          <label htmlFor="startingStack" className="block text-sm font-medium text-gray-200 mb-1">
            Stack de départ
          </label>
          <input
            type="number"
            id="startingStack"
            value={gameForm.startingStack}
            onChange={(e) => setGameForm(prev => ({
              ...prev,
              startingStack: parseInt(e.target.value, 10) || 0
            }))}
            className="glass-input w-full"
            min="1000"
            step="1000"
            required
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Structure complète des blindes
              </label>
              <p className="text-xs text-gray-400">
                Définissez au moins 10 niveaux à l'avance pour gérer une progression non linéaire.
              </p>
            </div>
            <button
              type="button"
              onClick={addLevelRow}
              className="btn btn-ghost text-sm"
            >
              Ajouter un niveau
            </button>
          </div>

          <div className="overflow-x-auto border border-white/10 rounded-lg">
            <table className="min-w-[480px] w-full text-sm">
              <thead className="bg-white/5 text-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left">Niveau</th>
                  <th className="px-3 py-2 text-left">Petite blinde</th>
                  <th className="px-3 py-2 text-left">Grosse blinde</th>
                  <th className="px-3 py-2 text-left">Durée</th>
                </tr>
              </thead>
              <tbody>
                {gameForm.levels.map((level, index) => (
                  <tr key={index} className="border-t border-white/10">
                    <td className="px-3 py-2 font-medium text-gray-200">{index + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        aria-label={`Petite blinde, niveau ${index + 1}`}
                        value={level.blinds.small}
                        onChange={(e) => updateLevelField(index, 'small', parseInt(e.target.value, 10) || 0)}
                        className="glass-input w-full"
                        min="1"
                        step="1"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        aria-label={`Grosse blinde, niveau ${index + 1}`}
                        value={level.blinds.big}
                        onChange={(e) => updateLevelField(index, 'big', parseInt(e.target.value, 10) || 0)}
                        className="glass-input w-full"
                        min="2"
                        step="1"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        aria-label={`Durée en minutes, niveau ${index + 1}`}
                        value={level.duration}
                        onChange={(e) => updateLevelField(index, 'duration', parseInt(e.target.value, 10) || 0)}
                        className="glass-input w-full"
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
            <p className="text-xs text-amber-300">
              Il manque encore {DEFAULT_LEVEL_COUNT - gameForm.levels.length} niveau(x) pour atteindre le minimum recommandé de 10.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="rebuyLimitMode" className="block text-sm font-medium text-gray-200 mb-1">
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
              className="glass-input w-full"
            >
              <option value="max_per_player">Nombre max de recaves par joueur</option>
              <option value="until_level">Jusqu'au niveau</option>
            </select>
          </div>

          {rebuyLimitMode === 'max_per_player' ? (
            <div>
              <label htmlFor="maxRebuysPerPlayer" className="block text-sm font-medium text-gray-200 mb-1">
                Nombre max de recaves par joueur
              </label>
              <input
                type="number"
                id="maxRebuysPerPlayer"
                value={maxRebuysPerPlayer}
                onChange={(e) => setMaxRebuysPerPlayer(Math.max(0, parseInt(e.target.value) || 0))}
                className="glass-input w-full"
                min="0"
                step="1"
                required
              />
              <p className="text-xs text-gray-400 mt-1">0 = aucune recave. 1 = une seule recave maximum par joueur.</p>
            </div>
          ) : (
            <div>
              <label htmlFor="rebuyLevel" className="block text-sm font-medium text-gray-200 mb-1">
                Recave autorisée jusqu'au niveau (inclus)
              </label>
              <input
                type="number"
                id="rebuyLevel"
                value={rebuyLevel}
                onChange={(e) => setRebuyLevel(Math.max(0, parseInt(e.target.value) || 0))}
                className="glass-input w-full"
                min="0"
                step="1"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Niveau 0 = pas de recave après le début. Niveau 2 = recave possible pendant les niveaux 1 et 2.</p>
            </div>
          )}
        </div>


              <details><summary className="text-sm text-gray-300 cursor-pointer">Enregistrer cette structure pour une prochaine partie</summary><div className="pt-3">        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <label htmlFor="presetName" className="block text-sm font-medium text-gray-200">
            Enregistrer la configuration actuelle comme structure du groupe
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              id="presetName"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Ex: Standard 25/50 - 20 min"
              className="glass-input flex-1"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              disabled={!newPresetName.trim() || !structureValid}
              className="btn btn-gold"
            >
              Enregistrer
            </button>
          </div>
          {presetFeedback && <p className="text-xs text-gray-300">{presetFeedback}</p>}
        </div>

</div></details>
            </>}
            {step === 'review' && <>
              <p className="text-sm text-gray-400">Vérifiez vos choix, puis validez la création.</p>
              {reviewCard('Joueurs', 'players', <><p>{selectedPlayers.size} joueurs · Buy-in {tournament.buyin} €</p><p className="text-gray-400">{selectedPlayersList.map(player => player.nickname || player.name).join(', ')}</p></>)}
              {reviewCard('Buy-ins', 'payment', <><p>{playersWhoPaidPot.size} / {selectedPlayers.size} payés · {totalPotAmount} € encaissés</p>{playersWhoPaidPot.size > 0 && <p className="text-gray-400">{selectedPlayersList.filter(player => playersWhoPaidPot.has(player.id)).map(player => player.nickname || player.name).join(', ')}</p>}<p className="text-gray-400">{prizePool - totalPotAmount} € restent à régler</p></>)}
              {reviewCard('Répartition des gains', 'prizes', <><p>Total : {prizePool} €</p><p>1re : {estimatedWinnings.first} € ({distributionPercentages.first} %) · 2e : {estimatedWinnings.second} € ({distributionPercentages.second} %) · 3e : {estimatedWinnings.third} € ({distributionPercentages.third} %)</p><p className="text-gray-400">Recaves : {rebuyDistributionRule === 'winner_takes_all' ? 'tout au vainqueur' : 'distribution cyclique'}</p></>)}
              {reviewCard('Structure', 'structure', <><p>{selectedPresetId ? blindPresets.find(preset => preset.id === selectedPresetId)?.name : 'Configuration personnalisable'}</p><p>{gameForm.startingStack.toLocaleString('fr-FR')} jetons · {gameForm.levels.length} niveaux</p><p>Départ : {gameForm.levels[0]?.blinds.small}/{gameForm.levels[0]?.blinds.big} · {gameForm.levels[0]?.duration} min</p><p className="text-gray-400">{rebuyLimitMode === 'max_per_player' ? `${maxRebuysPerPlayer} recave(s) maximum par joueur` : `Recaves jusqu’au niveau ${rebuyLevel}`}</p></>)}
              {!canCreate && <p className="text-amber-200 text-sm">Complétez les choix avant de créer la partie : au moins 2 joueurs, les paiements et une structure valide.</p>}
            </>}
          </div>
          <div className="shrink-0 border-t border-white/10 pt-4 flex items-center justify-between gap-2">
            <button type="button" onClick={step === 'players' && !returnToReview ? onClose : goBack} className="btn btn-ghost gap-1" disabled={transition !== 'idle'}>
              {step !== 'players' && <ArrowLeft size={16} aria-hidden="true" />}{step === 'players' && !returnToReview ? 'Annuler' : 'Retour'}
            </button>
            {step === 'players' && primary('OK', () => finishStep('payment'), selectedPlayers.size < 2)}
            {step === 'paidPlayers' && primary('OK', () => finishStep('prizes'), playersWhoPaidPot.size === 0)}
            {step === 'prizes' && primary('Valider les gains', () => finishStep('structure'))}
            {step === 'structure' && primary('Voir le récapitulatif', () => finishStep('review'), useSavedStructure === null || (useSavedStructure && !selectedPresetId) || !structureValid)}
            {step === 'customStructure' && primary('Valider la structure', () => { setSelectedPresetId(''); setUseSavedStructure(false); navigate('structure', true); }, !structureValid)}
            {step === 'review' && <button type="submit" className="btn btn-gold" disabled={!canCreate || isSubmitting || transition !== 'idle'}>{isSubmitting ? 'Création…' : 'Créer la partie'}</button>}
          </div>
        </fieldset>
      </div>
      {submitError && <p role="alert" className="text-sm text-red-300 pt-3">{submitError}</p>}
    </form>
  );
}
