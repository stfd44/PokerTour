import type { BlindLevel } from '../store/types/tournamentTypes';
import type { BlindPreset } from '../store/useTeamStore';

export const DEFAULT_LEVEL_COUNT = 10;

export const createDefaultLevels = (): BlindLevel[] => ([
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

export type BlindPresetInput = Omit<BlindPreset, 'id' | 'createdAt'>;

export function validateBlindPreset(preset: BlindPresetInput): void {
  if (!preset.name.trim()) throw new Error('Le nom de la structure est requis.');
  if (!Number.isInteger(preset.startingStack) || preset.startingStack <= 0) {
    throw new Error('Le stack de départ doit être un entier positif.');
  }
  if (preset.levels.length < DEFAULT_LEVEL_COUNT) {
    throw new Error('La structure doit contenir au moins 10 niveaux.');
  }
  if (preset.levels.some(({ blinds, duration }) =>
    !Number.isInteger(blinds.small) || blinds.small <= 0 ||
    !Number.isInteger(blinds.big) || blinds.big <= blinds.small ||
    !Number.isInteger(duration) || duration <= 0
  )) {
    throw new Error('Chaque niveau doit avoir des blindes entières positives, une grosse blinde supérieure à la petite et une durée entière positive.');
  }
  if (preset.rebuyLimitMode && !['until_level', 'max_per_player'].includes(preset.rebuyLimitMode)) {
    throw new Error('Mode de limitation des recaves invalide.');
  }
  const limit = preset.rebuyLimitMode === 'max_per_player'
    ? preset.maxRebuysPerPlayer : preset.rebuyAllowedUntilLevel;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 0) {
    throw new Error('La limite des recaves doit être un entier positif ou nul.');
  }
}
