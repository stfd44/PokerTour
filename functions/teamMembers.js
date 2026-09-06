const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { createHash } = require('node:crypto');
const { guestId, rewriteTournament } = require('./teamMemberData');

exports.manageTeamMember = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour gérer les membres.');
  const { teamId, action, source, targetId, name, preview = false, revision } = request.data || {};
  if (typeof teamId !== 'string' || !teamId || teamId.includes('/') ||
      !['remove', 'rename', 'merge'].includes(action) || !source ||
      !['account', 'pending'].includes(source.kind) || typeof source.id !== 'string' || !source.id) {
    throw new HttpsError('invalid-argument', 'Action ou membre invalide.');
  }
  if (action === 'rename' && (typeof name !== 'string' || !name.trim() || name.trim().length > 60)) {
    throw new HttpsError('invalid-argument', 'Le nom doit contenir entre 1 et 60 caractères.');
  }
  const db = getFirestore();
  return db.runTransaction(async tx => {
    const teamRef = db.collection('teams').doc(teamId);
    const teamSnap = await tx.get(teamRef);
    const team = teamSnap.data();
    if (!team) throw new HttpsError('not-found', 'Groupe introuvable.');
    if (team.creatorId !== request.auth.uid) throw new HttpsError('permission-denied', 'Seul le créateur peut gérer les membres.');
    const pending = source.kind === 'pending';
    const members = team.members || [];
    const past = team.pastMembers || [];
    const pendingMembers = team.pendingMembers || [];
    if (pending ? !pendingMembers.some(p => p.name === source.id) : ![...members, ...past].includes(source.id)) {
      throw new HttpsError('not-found', 'Ce membre ne fait plus partie du groupe.');
    }
    if (!pending && source.id === team.creatorId && action !== 'rename') {
      throw new HttpsError('failed-precondition', 'Le créateur doit rester membre du groupe.');
    }
    const fromId = pending ? guestId(source.id) : source.id;
    let toId = fromId;
    let resolvedName = action === 'rename' ? name.trim() : '';
    if (action === 'merge') {
      if (typeof targetId !== 'string' || !members.includes(targetId) || targetId === fromId) {
        throw new HttpsError('invalid-argument', 'Choisissez un autre compte actif à conserver.');
      }
      const target = await tx.get(db.collection('users').doc(targetId));
      if (!target.exists) throw new HttpsError('not-found', 'Le compte à conserver est introuvable.');
      toId = targetId;
      resolvedName = team.memberNames?.[targetId] || target.data().nickname || target.data().displayName || targetId;
    }
    if (pending && action === 'rename') {
      toId = guestId(resolvedName);
      if (pendingMembers.some(p => p.name !== source.id && (p.name.toLowerCase() === resolvedName.toLowerCase() || guestId(p.name) === toId))) {
        throw new HttpsError('already-exists', 'Un membre porte déjà ce nom.');
      }
    }
    const updates = [];
    let snapshots = [];
    if (action !== 'remove') {
      const tournaments = await tx.get(db.collection('tournaments').where('teamId', '==', teamId));
      snapshots = tournaments.docs;
      for (const snapshot of snapshots) {
        const original = snapshot.data();
        let updated;
        try { updated = rewriteTournament(original, fromId, toId, resolvedName); }
        catch (error) { throw new HttpsError('failed-precondition', error.message); }
        if (pending && original.guests) updated.guests = [...new Set(original.guests.flatMap(n => n !== source.id ? [n] : action === 'rename' ? [resolvedName] : []))];
        if (JSON.stringify(original) !== JSON.stringify(updated)) updates.push({ ref: snapshot.ref, data: updated });
      }
    }
    if (updates.length > 400) throw new HttpsError('resource-exhausted', 'Trop de tournois à modifier en une opération. Contactez un administrateur.');
    const version = createHash('sha256').update(JSON.stringify({ team, action, source, toId, resolvedName, tournaments: snapshots.map(s => [s.id, s.updateTime]) })).digest('hex');
    if (preview) return { revision: version, tournamentCount: updates.length, targetName: resolvedName };
    if (revision !== version) throw new HttpsError('failed-precondition', 'Les données ont changé. Fermez cette fenêtre puis vérifiez à nouveau le bilan.');
    const patch = {};
    if (action === 'remove' || action === 'merge') {
      if (pending) patch.pendingMembers = pendingMembers.filter(p => p.name !== source.id);
      else {
        patch.members = members.filter(id => id !== source.id);
        patch.pastMembers = action === 'merge' ? past.filter(id => id !== source.id) : [...new Set([...past, source.id])];
      }
    } else if (pending) {
      patch.pendingMembers = pendingMembers.map(p => p.name === source.id ? { ...p, name: resolvedName } : p);
    } else patch.memberNames = { ...(team.memberNames || {}), [source.id]: resolvedName };
    if (action === 'merge' && !pending) {
      patch.memberNames = { ...(team.memberNames || {}) };
      delete patch.memberNames[source.id];
    }
    for (const update of updates) tx.set(update.ref, update.data);
    tx.update(teamRef, patch);
    return { tournamentCount: updates.length };
  });
});
