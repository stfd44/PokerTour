import { useState } from 'react';
import { app } from '../../lib/firebase';
import { useTeamStore, type Team } from '../../store/useTeamStore';

type Member = { kind: 'account' | 'pending'; id: string; name: string };
type Preview = { revision: string; tournamentCount: number; targetName: string };

export function MemberManager({ team, source, names, onClose }: {
  team: Team; source: Member; names: Record<string, { name: string }>; onClose: () => void;
}) {
  const [action, setAction] = useState<'rename' | 'remove' | 'merge'>('rename');
  const [name, setName] = useState(source.name);
  const [targetId, setTargetId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isCreator = source.kind === 'account' && source.id === team.creatorId;
  const targetName = preview?.targetName || team.memberNames?.[targetId] || names[targetId]?.name || targetId;
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const call = httpsCallable<Record<string, unknown>, Preview>(getFunctions(app), 'manageTeamMember');
      const result = await call({ teamId: team.id, source: { kind: source.kind, id: source.id }, action, name, targetId,
        preview: !preview, ...(preview ? { revision: preview.revision } : {}) });
      if (!preview) setPreview(result.data);
      else {
        await useTeamStore.getState().fetchTeams();
        onClose();
      }
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : '';
      setError(code === 'functions/internal' || code === 'functions/unavailable' || code === 'functions/not-found'
        ? 'Le service de gestion des membres est indisponible. Réessayez dans quelques instants. Si le problème persiste, contactez l’administrateur du groupe.'
        : err instanceof Error ? err.message : 'Impossible de modifier ce membre.');
      setPreview(null);
    } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="member-title" className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
      <h3 id="member-title" className="text-lg font-bold text-white">Gérer {source.name}</h3>
      <p className="text-sm text-gray-300">Modifications limitées au groupe « {team.name} ».</p>
      {!preview ? <>
        <label className="block text-gray-200">Action
          <select className="glass-input w-full mt-1" value={action} disabled={busy} onChange={e => { setAction(e.target.value as typeof action); setError(''); }}>
            <option value="rename">Renommer dans ce groupe</option>
            {!isCreator && <option value="remove">Supprimer du groupe</option>}
            {!isCreator && <option value="merge">Fusionner vers un autre compte</option>}
          </select>
        </label>
        {action === 'rename' && <label className="block text-gray-200">Nom affiché dans le groupe
          <input autoFocus className="glass-input w-full mt-1" maxLength={60} value={name} disabled={busy} onChange={e => setName(e.target.value)} />
          <span className="block text-xs text-gray-400 mt-2">Met à jour les inscriptions et l’historique de ce groupe. Le profil du compte reste inchangé.</span>
        </label>}
        {action === 'merge' && <>
          <div className="rounded border border-orange-400/40 p-3 text-orange-200">Membre source — sera retiré : <strong>{source.name}</strong><span className="block text-xs break-all">{source.id}</span></div>
          <label className="block text-gray-200">Compte destinataire — sera conservé et recevra les données
            <select className="glass-input w-full mt-1" value={targetId} disabled={busy} onChange={e => setTargetId(e.target.value)}>
              <option value="">Choisir le compte à conserver</option>
              {team.members.filter(id => source.kind !== 'account' || id !== source.id).map(id => <option key={id} value={id}>{team.memberNames?.[id] || names[id]?.name || id} — {id}</option>)}
            </select>
          </label>
          <p className="text-sm text-gray-300">Ajoutez d’abord le nouveau compte au groupe. Les anciens membres peuvent aussi servir de source. Les participations communes à une même partie empêchent la fusion.</p>
        </>}
      </> : <div className="space-y-3 text-gray-200">
        {action === 'merge' ? <>
          <p className="font-semibold">{source.name} → {targetName}</p>
          <p className="text-xs break-all">Source retirée : {source.id}<br />Compte conservé : {targetId}</p>
          <p>Les inscriptions, parties, résultats et règlements de la source seront transférés au compte conservé. Ses données existantes seront conservées.</p>
          <p className="text-orange-300">La fusion ne peut pas être annulée depuis l’application. Aucun compte utilisateur ne sera supprimé.</p>
        </> : action === 'rename' ? <p>Renommer « {source.name} » en « {name.trim()} » dans ce groupe et son historique.</p> : null}
        {action !== 'remove' && <p>{preview.tournamentCount} tournoi(s) seront mis à jour.</p>}
      </div>}
      {action === 'remove' && <p className="text-gray-200">Supprimer « {source.name} » du groupe ? Son historique et ses résultats seront conservés. Son compte utilisateur ne sera pas supprimé.</p>}
      {error && <p role="alert" className="text-red-300">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button disabled={busy} onClick={onClose} className="btn btn-ghost">Annuler</button>
        {preview && <button disabled={busy} onClick={() => setPreview(null)} className="btn btn-ghost">Modifier</button>}
        <button disabled={busy || (action === 'rename' && !name.trim()) || (action === 'merge' && !targetId)} onClick={submit} className={`btn ${preview && action !== 'rename' ? 'btn-red' : 'btn-blue'}`}>
          {busy ? 'Traitement…' : !preview ? 'Vérifier les changements' : action === 'merge' ? `Confirmer le transfert vers ${targetName}` : action === 'remove' ? 'Confirmer la suppression' : 'Confirmer le renommage'}
        </button>
      </div>
    </section>
  </div>;
}
