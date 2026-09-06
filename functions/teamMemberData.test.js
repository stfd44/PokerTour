const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rewriteTournament, guestId } = require('./teamMemberData');

const fixture = () => ({
  name: 'Championnat', creatorId: 'old', guests: ['Invité'],
  registrations: [{ id: 'old', name: 'Ancien', status: 'confirmed' }, { id: 'new', name: 'Nouveau', status: 'invited' }],
  games: [{ id: 'g1', players: [{ id: 'old', name: 'Ancien', rebuysMade: 2, rebuyPayments: [true, false], buyInPaid: true }], results: [{ playerId: 'old', name: 'Ancien', rank: 1, points: 10, winnings: 60 }], potContributions: [{ playerId: 'old', playerName: 'Ancien', amount: 20 }] },
    { id: 'g2', players: [{ id: 'new', name: 'Nouveau' }] }],
  settlementTransactions: [{ fromPlayerId: 'old', fromPlayerName: 'Ancien', toPlayerId: 'third', toPlayerName: 'Tiers', amount: 30, completed: true }, { fromPlayerId: 'new', toPlayerId: 'old', amount: 5, completed: false }],
  detailedSettlement: { playerSummaries: [
    { playerId: 'old', playerName: 'Ancien', totalBuyIn: 20, totalWinnings: 60, netResult: 40, gamesSummary: [{ gameId: 'g1' }], ledger: [{ relatedPlayerId: 'old', amount: 60 }] },
    { playerId: 'new', playerName: 'Nouveau', totalBuyIn: 10, totalWinnings: 0, netResult: -10, gamesSummary: [{ gameId: 'g2' }], ledger: [] },
  ] },
});

test('merge transfers all player references and preserves financial history and ownership', () => {
  const input = fixture();
  const before = structuredClone(input);
  const result = rewriteTournament(input, 'old', 'new', 'Nouveau');
  assert.deepEqual(input, before);
  assert.equal(result.creatorId, 'old');
  assert.equal(result.registrations.length, 1);
  assert.equal(result.registrations[0].status, 'confirmed');
  assert.equal(result.games[0].players[0].id, 'new');
  assert.deepEqual(result.games[0].players[0].rebuyPayments, [true, false]);
  assert.equal(result.games[0].results[0].winnings, 60);
  assert.equal(result.games[0].results[0].playerId, 'new');
  assert.equal(result.games[0].potContributions[0].playerId, 'new');
  assert.equal(result.settlementTransactions.length, 1);
  assert.equal(result.settlementTransactions[0].fromPlayerId, 'new');
  assert.equal(result.settlementTransactions[0].completed, true);
  const summary = result.detailedSettlement.playerSummaries[0];
  assert.equal(summary.netResult, 30);
  assert.equal(summary.totalBuyIn, 30);
  assert.equal(summary.totalWinnings, 60);
  assert.equal(summary.gamesSummary.length, 2);
  assert.equal(summary.ledger[0].relatedPlayerId, 'new');
});

test('reversing the merge keeps the selected destination', () => {
  const result = rewriteTournament(fixture(), 'new', 'old', 'Ancien');
  assert.equal(result.registrations[0].id, 'old');
  assert.equal(result.games[1].players[0].id, 'old');
  assert.equal(result.detailedSettlement.playerSummaries[0].playerId, 'old');
});

test('same-game identities are rejected even when only results remain', () => {
  const input = fixture();
  input.games[0].results.push({ playerId: 'new', rank: 2 });
  assert.throws(() => rewriteTournament(input, 'old', 'new', 'Nouveau'), /même partie/);
});

test('rename preserves identity and updates all display names', () => {
  const result = rewriteTournament(fixture(), 'old', 'old', 'Alias');
  assert.equal(result.registrations[0].id, 'old');
  assert.equal(result.registrations[0].nickname, 'Alias');
  assert.equal(result.games[0].results[0].name, 'Alias');
  assert.equal(result.settlementTransactions[0].fromPlayerName, 'Alias');
  assert.equal(result.detailedSettlement.playerSummaries[0].playerName, 'Alias');
  assert.equal(result.detailedSettlement.playerSummaries.length, 2);
});

test('pending guest identity migrates to a registered account', () => {
  const input = { registrations: [{ id: guestId('Jean Paul'), name: 'Jean Paul' }], games: [] };
  const result = rewriteTournament(input, guestId('Jean Paul'), 'account', 'Jean');
  assert.equal(result.registrations[0].id, 'account');
  assert.equal(result.registrations[0].name, 'Jean');
});
