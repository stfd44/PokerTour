const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('exports', 'require', compiled)(exports, name => name.startsWith('.') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name));
  return exports;
}
const { getGamePrizeSummary, getRebuyGains } = load('src/store/helpers/prizePoolSummary.ts');
const game = {
  status: 'in_progress', winnings: { first: 30, second: 20, third: 10 },
  rebuyAmount: 10, rebuyDistributionRule: 'cyclic_top_two',
  players: [{ id: 'a', name: 'Alice', nickname: 'Ace', rebuysMade: 3, rebuyPayments: [false, false, false] }, { id: 'b', name: 'Bob' }, { id: 'c', name: 'Cam' }],
};
test('ongoing game shows ranks and includes unpaid recaves', () => {
  const rows = getGamePrizeSummary(game, 10);
  assert.deepEqual(rows.map(row => row.amount), [50, 30, 10]);
  assert.ok(rows.every(row => row.name === null));
});
test('completed game uses saved awards and player names without adding recaves twice', () => {
  const rows = getGamePrizeSummary({ ...game, status: 'ended', results: [{ playerId: 'a', name: 'Alice', rank: 1, winnings: 50 }, { playerId: 'b', name: 'Bob', rank: 2, winnings: 30 }] }, 10);
  assert.deepEqual(rows.map(row => [row.name, row.amount]), [['Ace', 50], ['Bob', 30]]);
});
test('all rebuy rules preserve the total amount', () => {
  for (const rule of ['winner_takes_all', 'cyclic_top_two', 'cyclic_distribution']) {
    for (let count = 0; count < 10; count++) {
      assert.equal(Object.values(getRebuyGains(count, 10, rule)).reduce((a, b) => a + b, 0), count * 10);
    }
  }
});
