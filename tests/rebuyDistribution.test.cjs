const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const compiled = ts.transpileModule(readFileSync('src/store/helpers/tournamentHelpers.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const helpers = {};
new Function('exports', compiled)(helpers);

for (const [rule, count, expected] of [
  ['cyclic_top_two', 1, [40, 20, 10]],
  ['cyclic_top_two', 4, [50, 40, 10]],
  ['cyclic_top_two', 5, [60, 40, 10]],
  ['cyclic_distribution', 5, [50, 40, 20]],
  ['winner_takes_all', 5, [80, 20, 10]],
]) {
  test(`${rule}: ${count} unpaid recaves distributed correctly`, () => {
    const game = {
      id: 'test', winnings: { first: 30, second: 20, third: 10 },
      totalRebuys: count, rebuyAmount: 10, rebuyDistributionRule: rule,
      players: [
        { id: 'a', name: 'A', rebuysMade: count, rebuyPayments: Array(count).fill(false) },
        { id: 'b', name: 'B', eliminated: true, eliminationTime: 2 },
        { id: 'c', name: 'C', eliminated: true, eliminationTime: 1 },
      ],
    };
    assert.deepEqual(helpers.calculateResultsForGame(game).results.map(result => result.winnings), expected);
  });
}
