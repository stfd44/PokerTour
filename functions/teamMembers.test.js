const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function harness() {
  const docs = {
    'teams/team': { creatorId: 'owner', members: ['owner', 'old', 'new'], pastMembers: [], pendingMembers: [] },
    'users/new': { nickname: 'Nouveau' },
    'tournaments/one': { teamId: 'team', name: 'Tournoi', registrations: [{ id: 'old', name: 'Ancien' }], games: [] },
    'tournaments/other': { teamId: 'other', registrations: [{ id: 'old', name: 'Ancien' }], games: [] },
  };
  let writes = [];
  const snapshot = path => ({ id: path.split('/')[1], ref: { path }, exists: !!docs[path], data: () => structuredClone(docs[path]), updateTime: JSON.stringify(docs[path]) });
  const db = {
    collection: collection => ({ doc: id => ({ path: `${collection}/${id}` }), where: (field, op, value) => ({ collection, field, value }) }),
    runTransaction: async callback => {
      const pending = [];
      const result = await callback({
        get: async ref => ref.path ? snapshot(ref.path) : ({ docs: Object.keys(docs).filter(path => path.startsWith(ref.collection + '/') && docs[path][ref.field] === ref.value).map(snapshot) }),
        update: (ref, patch) => pending.push([ref.path, { ...docs[ref.path], ...patch }]),
        set: (ref, data) => pending.push([ref.path, data]),
      });
      for (const [path, data] of pending) docs[path] = data;
      writes = pending;
      return result;
    },
  };
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const output = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('./teamMembers'), 'utf8'), {
    exports: output,
    require: name => name === 'firebase-functions/v2/https' ? { onCall: fn => fn, HttpsError }
      : name === 'firebase-admin/firestore' ? { getFirestore: () => db } : require(name),
  });
  const data = { teamId: 'team', action: 'merge', source: { kind: 'account', id: 'old' }, targetId: 'new' };
  const call = (patch = {}, uid = 'owner') => output.manageTeamMember({ auth: uid ? { uid } : null, data: { ...data, ...patch } });
  return { call, docs, writes: () => writes };
}

test('preview writes nothing; confirmed merge is scoped and atomic', async () => {
  const h = harness();
  const other = structuredClone(h.docs['tournaments/other']);
  const preview = await h.call({ preview: true });
  assert.equal(preview.tournamentCount, 1);
  assert.equal(h.writes().length, 0);
  await h.call({ revision: preview.revision });
  assert.equal(h.docs['tournaments/one'].registrations[0].id, 'new');
  assert.deepEqual(h.docs['tournaments/other'], other);
  assert.deepEqual(Array.from(h.docs['teams/team'].members), ['owner', 'new']);
});

test('authentication and creator authorization are enforced', async () => {
  const h = harness();
  await assert.rejects(h.call({ preview: true }, null), { code: 'unauthenticated' });
  await assert.rejects(h.call({ preview: true }, 'new'), { code: 'permission-denied' });
  assert.equal(h.writes().length, 0);
});

test('stale preview aborts without transferring data', async () => {
  const h = harness();
  const preview = await h.call({ preview: true });
  h.docs['tournaments/one'].name = 'Modifié';
  await assert.rejects(h.call({ revision: preview.revision }), { code: 'failed-precondition' });
  assert.equal(h.docs['tournaments/one'].registrations[0].id, 'old');
  assert.equal(h.writes().length, 0);
});

test('creator removal and self-merge are refused', async () => {
  const h = harness();
  await assert.rejects(h.call({ action: 'remove', source: { kind: 'account', id: 'owner' }, preview: true }), { code: 'failed-precondition' });
  await assert.rejects(h.call({ targetId: 'old', preview: true }), { code: 'invalid-argument' });
});

test('removing a member preserves tournaments and archives membership', async () => {
  const h = harness();
  const original = structuredClone(h.docs['tournaments/one']);
  const preview = await h.call({ action: 'remove', preview: true });
  await h.call({ action: 'remove', revision: preview.revision });
  assert.deepEqual(h.docs['tournaments/one'], original);
  assert.deepEqual(Array.from(h.docs['teams/team'].pastMembers), ['old']);
});

test('pending rename updates guest-only tournaments and preserves timestamps', async () => {
  const h = harness();
  h.docs['teams/team'].pendingMembers = [{ name: 'Invité', addedAt: 123 }];
  h.docs['tournaments/one'].guests = ['Invité'];
  const change = { action: 'rename', source: { kind: 'pending', id: 'Invité' }, name: 'Jean' };
  const preview = await h.call({ ...change, preview: true });
  await h.call({ ...change, revision: preview.revision });
  assert.deepEqual(Array.from(h.docs['tournaments/one'].guests), ['Jean']);
  assert.equal(h.docs['teams/team'].pendingMembers[0].addedAt, 123);
  assert.equal(h.docs['teams/team'].pendingMembers[0].name, 'Jean');
});

test('team alias changes history without changing the user profile', async () => {
  const h = harness();
  h.docs['users/old'] = { nickname: 'Profil global' };
  const change = { action: 'rename', name: 'Alias local' };
  const preview = await h.call({ ...change, preview: true });
  await h.call({ ...change, revision: preview.revision });
  assert.equal(h.docs['teams/team'].memberNames.old, 'Alias local');
  assert.equal(h.docs['tournaments/one'].registrations[0].name, 'Alias local');
  assert.equal(h.docs['users/old'].nickname, 'Profil global');
});
