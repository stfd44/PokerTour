const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('exports', 'require', compiled)(exports, name => name.startsWith('.') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name));
  return exports;
}

const { calculateTournamentSettlement: calculate } = load('src/store/helpers/settlement.ts');
const game = (rule, mask = 0, tied = false) => ({
  id: 'g', status: 'ended', winnings: { first: 15, second: 10, third: 5 },
  rebuyAmount: 10, rebuyDistributionRule: rule, totalRebuys: 3,
  players: ['a', 'b', 'c'].map((id, index) => ({ id, name: id,
    eliminated: !tied && index > 0, eliminationTime: 3 - index,
    rebuysMade: 1, buyInPaid: !!(mask & (1 << index)), rebuyPayments: [!!(mask & (1 << (index + 3)))],
  })),
});
const tournament = games => ({ id: 't', status: 'ended', buyin: 10, games, registrations: games[0]?.players ?? [] });
function verify(t, result) {
  const balances = new Map();
  let collected = 0;
  for (const g of result.games.filter(g => g.status === 'ended')) {
    for (const p of g.players) {
      const paid = (p.buyInPaid ? 10 : 0) + p.rebuyPayments.filter(Boolean).length * 10;
      collected += paid;
      const award = g.results.find(r => r.playerId === p.id).winnings;
      balances.set(p.id, (balances.get(p.id) ?? 0) + Math.round((award - 10 - p.rebuysMade * 10 + paid) * 100));
    }
  }
  balances.set('POT', -collected * 100);
  for (const tx of result.settlementTransactions) {
    assert.ok(tx.amount > 0);
    balances.set(tx.fromPlayerId, balances.get(tx.fromPlayerId) + Math.round(tx.amount * 100));
    balances.set(tx.toPlayerId, balances.get(tx.toPlayerId) - Math.round(tx.amount * 100));
  }
  assert.ok([...balances.values()].every(value => value === 0), JSON.stringify([...balances]));
  for (const summary of result.detailedSettlement.playerSummaries) {
    assert.equal(Math.round(summary.ledger.reduce((sum, entry) => sum + entry.amount, 0) * 100), Math.round(summary.netResult * 100));
  }
}
for (const rule of ['winner_takes_all', 'cyclic_distribution', 'cyclic_top_two']) {
  test(`${rule}: all 64 buy-in/recave payment combinations balance`, () => {
    for (let mask = 0; mask < 64; mask++) {
      const t = tournament([game(rule, mask)]);
      verify(t, calculate(t));
    }
  });
  test(`${rule}: tied players and rounding preserve all money`, () => {
    const t = tournament([game(rule, 21, true)]);
    verify(t, calculate(t));
  });
}
test('multiple games and removed registrations are included', () => {
  const t = { ...tournament([game('cyclic_top_two', 19), { ...game('winner_takes_all', 42), id: 'g2' }]), registrations: [] };
  verify(t, calculate(t));
});
test('recalculation keeps completed transfers and rebuilds outdated ledger', () => {
  const t = tournament([game('cyclic_top_two', 7)]);
  const first = calculate(t);
  const previous = first.settlementTransactions.map((tx, index) => ({ ...tx, completed: index === 0 }));
  const next = calculate({ ...t, settlementTransactions: previous, detailedSettlement: { playerSummaries: [] } });
  assert.deepEqual(next.settlementTransactions[0], previous[0]);
  assert.equal(next.detailedSettlement.playerSummaries.length, 3);
  verify(t, next);
  const done = calculate({ ...t, settlementTransactions: next.settlementTransactions.map(tx => ({ ...tx, completed: true })) });
  assert.ok(done.settlementTransactions.every(tx => tx.completed));
  verify(t, done);
});
test('one-cent transfers and more than ten debtors are not omitted', () => {
  const players = Array.from({ length: 15 }, (_, index) => ({ id: String(index), name: String(index), eliminated: index > 0, eliminationTime: 15 - index, rebuysMade: 0, rebuyPayments: [] }));
  const t = { ...tournament([]), buyin: 0.01, games: [{ ...game('winner_takes_all'), totalRebuys: 0, players, winnings: { first: 0.15, second: 0, third: 0 } }] };
  const result = calculate(t);
  assert.equal(result.settlementTransactions.length, 14);
  assert.ok(result.settlementTransactions.every(tx => tx.amount === 0.01));
});
test('in-progress games and inconsistent prize pools cannot create incomplete settlements', () => {
  assert.throws(() => calculate(tournament([{ ...game('winner_takes_all'), status: 'in_progress' }])), /Terminez/);
  assert.throws(() => calculate(tournament([{ ...game('winner_takes_all'), winnings: { first: 100, second: 0, third: 0 } }])), /ne correspondent pas/);
});
test('fractional tied awards conserve cents', () => {
  const g = game('cyclic_top_two', 63, true);
  g.players.push({ id: 'd', name: 'd', eliminated: false, rebuysMade: 0, rebuyPayments: [], buyInPaid: false });
  g.winnings = { first: 20, second: 15, third: 5 };
  const t = tournament([g]);
  verify(t, calculate(t));
});
test('legacy contribution amounts and stale pot totals are normalized', () => {
  const g = game('cyclic_distribution');
  g.players.forEach(player => delete player.buyInPaid);
  g.potContributions = [{ playerId: 'a', playerName: 'a', amount: 10 }];
  g.totalPotAmount = 999;
  const t = tournament([g]);
  const result = calculate(t);
  assert.equal(result.games[0].totalPotAmount, 10);
  verify(t, result);
});
