const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const source = readFileSync('src/store/helpers/gamePayments.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const helpers = { exports: {} };
new Function('exports', compiled)(helpers.exports);
const { syncGamePayments, isBuyInPaid } = helpers.exports;
const game = {
  players: [{ id: 'alice', name: 'Alice', rebuysMade: 2, rebuyPayments: [true, false] }],
  rebuyAmount: 20,
  potContributions: [{ playerId: 'alice', playerName: 'Alice', amount: 20 }],
};

test('legacy buy-in plus paid recave are collected once, even after repeated sync', () => {
  const synced = syncGamePayments(game, 20);
  assert.equal(synced.totalPotAmount, 40);
  assert.equal(synced.players[0].buyInPaid, true);
  assert.deepEqual(syncGamePayments(synced, 20), synced);
});

test('unchecking a recave removes only its collected amount', () => {
  const synced = syncGamePayments(game, 20);
  synced.players[0].rebuyPayments = [false, false];
  assert.equal(syncGamePayments(synced, 20).totalPotAmount, 20);
});

test('a paid recave does not mark an unpaid buy-in as paid', () => {
  const synced = syncGamePayments({ ...game, potContributions: undefined }, 20);
  assert.equal(synced.totalPotAmount, 20);
  assert.equal(isBuyInPaid(synced, synced.players[0]), false);
  assert.equal(syncGamePayments(synced, 20).totalPotAmount, 20);
});

test('unpaid recaves count toward costs but do not increase collected money', () => {
  const synced = syncGamePayments({ ...game, players: [{ ...game.players[0], rebuyPayments: [false, false] }] }, 20);
  assert.equal(synced.totalPotAmount, 20);
  assert.equal(synced.players[0].rebuysMade, 2);
});
