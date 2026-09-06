import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useTeamStore, type BlindPreset } from '../../store/useTeamStore';
import { createDefaultLevels, DEFAULT_LEVEL_COUNT, type BlindPresetInput } from '../../lib/blindPresets';

interface Props {
  teamId: string;
  teamName: string;
  preset?: BlindPreset;
  onClose: () => void;
}

export function BlindPresetForm({ teamId, teamName, preset, onClose }: Props) {
  const [form, setForm] = useState<BlindPresetInput>(() => ({
    name: preset?.name ?? '',
    startingStack: preset?.startingStack ?? 10000,
    levels: preset?.levels.map((level) => ({ ...level, blinds: { ...level.blinds } })) ?? createDefaultLevels(),
    rebuyLimitMode: preset ? preset.rebuyLimitMode ?? 'until_level' : 'max_per_player',
    rebuyAllowedUntilLevel: preset?.rebuyAllowedUntilLevel ?? 4,
    maxRebuysPerPlayer: preset?.maxRebuysPerPlayer ?? 2,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const store = useTeamStore.getState();
      if (preset) await store.updateBlindPreset(teamId, preset.id, form);
      else await store.addBlindPreset(teamId, form);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Impossible d’enregistrer la structure.");
    } finally {
      setSaving(false);
    }
  };

  const updateLevel = (index: number, field: 'small' | 'big' | 'duration', value: number) => {
    setForm((previous) => ({
      ...previous,
      levels: previous.levels.map((level, i) => i !== index ? level : field === 'duration'
        ? { ...level, duration: value }
        : { ...level, blinds: { ...level.blinds, [field]: value } }),
    }));
  };

  return (
    <Modal isOpen onClose={() => { if (!saving) onClose(); }} title={preset ? 'Modifier la structure' : 'Créer une structure de blindes'} className="sm:max-w-3xl" showCloseButton={false}>
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-gray-300">Groupe : {teamName}. Chaque membre peut créer et modifier les structures.</p>
        <fieldset disabled={saving} className="space-y-4">
          <label className="block text-sm text-gray-200">
            Nom de la structure
            <input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="glass-input w-full mt-1" placeholder="Ex : Structure du vendredi" />
          </label>
          <label className="block text-sm text-gray-200">
            Stack de départ
            <input type="text" inputMode="numeric" pattern="[0-9]+" required value={form.startingStack} onChange={(e) => setForm({ ...form, startingStack: Number(e.target.value) })} className="glass-input w-full mt-1" />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-200">Niveaux ({form.levels.length}) — minimum {DEFAULT_LEVEL_COUNT}</p>
            <button type="button" className="btn btn-ghost text-sm" onClick={() => setForm((previous) => {
              const last = previous.levels[previous.levels.length - 1];
              return { ...previous, levels: [...previous.levels, { blinds: { small: last.blinds.small * 2, big: last.blinds.big * 2 }, duration: last.duration }] };
            })}><Plus className="w-4 h-4" />Ajouter un niveau</button>
          </div>
          <div className="space-y-2">
            {form.levels.map((level, index) => (
              <div key={index} className="glass-inset p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-200">Niveau {index + 1}</span>
                  <button type="button" disabled={form.levels.length <= DEFAULT_LEVEL_COUNT} aria-label={`Supprimer le niveau ${index + 1}`} className="text-gray-400 hover:text-red-400 disabled:opacity-30 p-1" onClick={() => setForm({ ...form, levels: form.levels.filter((_, i) => i !== index) })}><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'big', 'duration'] as const).map((field) => (
                    <label key={field} className="text-xs text-gray-300 min-w-0">
                      {field === 'small' ? 'Petite blinde' : field === 'big' ? 'Grosse blinde' : 'Durée (min)'}
                      <input aria-label={`${field === 'small' ? 'Petite blinde' : field === 'big' ? 'Grosse blinde' : 'Durée en minutes'}, niveau ${index + 1}`} type="text" inputMode="numeric" pattern="[0-9]+" required value={field === 'duration' ? level.duration : level.blinds[field]} onChange={(e) => updateLevel(index, field, Number(e.target.value))} className="glass-input w-full mt-1" />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <label className="block text-sm text-gray-200">
            Mode de limitation des recaves
            <select value={form.rebuyLimitMode} onChange={(e) => setForm({ ...form, rebuyLimitMode: e.target.value as BlindPresetInput['rebuyLimitMode'] })} className="glass-input w-full mt-1">
              <option value="max_per_player">Nombre max de recaves par joueur</option>
              <option value="until_level">Jusqu'au niveau</option>
            </select>
          </label>
          <label className="block text-sm text-gray-200">
            {form.rebuyLimitMode === 'max_per_player' ? 'Nombre max de recaves par joueur' : "Recave autorisée jusqu’au niveau (inclus)"}
            <input type="text" inputMode="numeric" pattern="[0-9]+" required value={form.rebuyLimitMode === 'max_per_player' ? form.maxRebuysPerPlayer : form.rebuyAllowedUntilLevel} onChange={(e) => setForm({ ...form, [form.rebuyLimitMode === 'max_per_player' ? 'maxRebuysPerPlayer' : 'rebuyAllowedUntilLevel']: Number(e.target.value) })} className="glass-input w-full mt-1" />
            <span className="block mt-1 text-xs text-gray-400">0 = aucune recave après le début.</span>
          </label>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-white/10">
          <button type="button" onClick={onClose} disabled={saving} className="btn btn-ghost">Annuler</button>
          <button type="submit" disabled={saving || !form.name.trim()} className="btn btn-gold">{saving ? 'Enregistrement…' : preset ? 'Enregistrer les modifications' : 'Créer la structure'}</button>
        </div>
      </form>
    </Modal>
  );
}
