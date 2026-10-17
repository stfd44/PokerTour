import type { Tournament, PlayerSettlementSummary, Transaction } from '../types/tournamentTypes';
import { syncGamePayments } from './gamePayments';
import { calculateResultsForGame } from './tournamentHelpers';

const cents = (amount: number) => Math.round(amount * 100);

/** Rebuild the ledger and settle only what remains after recorded transfers. */
export function calculateTournamentSettlement(tournament: Tournament) {
  if (tournament.games.some(game => game.status === 'in_progress')) {
    throw new Error('Terminez les parties en cours avant de calculer le bilan.');
  }
  const summaries = new Map<string, PlayerSettlementSummary>();
  const balances = new Map<string, number>();
  const ensurePlayer = (id: string, name: string) => {
    if (!summaries.has(id)) summaries.set(id, {
      playerId: id, playerName: name, totalBuyIn: 0, totalWinnings: 0,
      netResult: 0, gamesSummary: [], ledger: [],
    });
    if (!balances.has(id)) balances.set(id, 0);
    return summaries.get(id)!;
  };
  tournament.registrations.forEach(player => ensurePlayer(player.id, player.nickname || player.name));
  let pot = 0;
  const games = tournament.games.map((original, gameIndex) => {
    if (original.status !== 'ended') return original;
    const game = syncGamePayments({ ...original, rebuyAmount: original.rebuyAmount ?? tournament.buyin }, tournament.buyin);
    const calculation = calculateResultsForGame(game);
    const results = calculation?.results ?? [];
    const contributions = new Map(game.potContributions!.map(entry => [entry.playerId, cents(entry.amount)]));
    const costs = game.players.reduce((sum, player) => sum + cents(tournament.buyin) + (player.rebuysMade ?? 0) * cents(game.rebuyAmount), 0);
    const awards = results.reduce((sum, result) => sum + cents(result.winnings), 0);
    if (costs !== awards) {
      throw new Error(`Partie ${gameIndex + 1} : les gains (${(awards / 100).toFixed(2)} €) ne correspondent pas aux buy-ins et recaves (${(costs / 100).toFixed(2)} €). Vérifiez le prize pool avant de calculer le bilan.`);
    }
    game.players.forEach(player => {
      const summary = ensurePlayer(player.id, player.nickname || player.name);
      const paid = contributions.get(player.id) ?? 0;
      pot += paid;
      const ledger = summary.ledger;
      if (!player.buyInPaid) ledger.push({ gameId: game.id, type: 'buy_in_cost', amount: -tournament.buyin, description: `Buy-in restant dû (Partie ${gameIndex + 1})` });
      for (let index = 0; index < (player.rebuysMade ?? 0); index++) {
        if (!player.rebuyPayments?.[index]) ledger.push({ gameId: game.id, type: 'rebuy_cost', amount: -game.rebuyAmount, description: `Recave ${index + 1} restant due (Partie ${gameIndex + 1})` });
      }
      const winnings = results.find(result => result.playerId === player.id)?.winnings ?? 0;
      if (winnings) ledger.push({ gameId: game.id, type: 'winnings', amount: winnings, description: `Gains, recaves incluses (Partie ${gameIndex + 1})` });
      const cost = cents(tournament.buyin) + (player.rebuysMade ?? 0) * cents(game.rebuyAmount);
      balances.set(player.id, balances.get(player.id)! + cents(winnings) - cost + paid);
      summary.gamesSummary.push({ gameId: game.id, rebuys: player.rebuysMade ?? 0, winnings, netResult: (cents(winnings) - cost + paid) / 100 });
    });
    return { ...game, results, winnings: calculation?.finalWinnings ?? game.winnings };
  });
  summaries.forEach(summary => {
    summary.totalBuyIn = summary.ledger.filter(entry => entry.amount < 0).reduce((sum, entry) => sum - cents(entry.amount), 0) / 100;
    summary.totalWinnings = summary.ledger.filter(entry => entry.type === 'winnings').reduce((sum, entry) => sum + cents(entry.amount), 0) / 100;
    summary.netResult = balances.get(summary.playerId)! / 100;
  });

  // Preserve actual payments on recalculation and subtract them from remaining obligations.
  const transactions: Transaction[] = (tournament.settlementTransactions ?? []).filter(tx => tx.completed).map(tx => ({ ...tx }));
  for (const tx of transactions) {
    const amount = cents(tx.amount);
    if (tx.fromPlayerId === 'POT') pot -= amount;
    else {
      ensurePlayer(tx.fromPlayerId, tx.fromPlayerName);
      balances.set(tx.fromPlayerId, balances.get(tx.fromPlayerId)! + amount);
    }
    ensurePlayer(tx.toPlayerId, tx.toPlayerName);
    balances.set(tx.toPlayerId, balances.get(tx.toPlayerId)! - amount);
  }
  if (pot < 0) throw new Error('Les versements déjà effectués depuis le pot dépassent les encaissements enregistrés.');
  if ([...balances.values()].reduce((sum, value) => sum + value, 0) !== pot) throw new Error('Le bilan est déséquilibré. Vérifiez les paiements et les gains.');
  const transfer = (from: string, to: string, amount: number) => {
    transactions.push({ fromPlayerId: from, fromPlayerName: from === 'POT' ? 'POT' : summaries.get(from)!.playerName,
      toPlayerId: to, toPlayerName: summaries.get(to)!.playerName, amount: amount / 100,
      completed: false, type: from === 'POT' ? 'pot_withdrawal' : 'player_debt' });
    balances.set(to, balances.get(to)! - amount);
    if (from === 'POT') pot -= amount;
    else balances.set(from, balances.get(from)! + amount);
  };
  for (const [id, balance] of balances) {
    if (balance > 0 && pot > 0) transfer('POT', id, Math.min(balance, pot));
  }
  const creditors = [...balances.keys()].filter(id => balances.get(id)! > 0);
  let creditorIndex = 0;
  for (const id of balances.keys()) {
    while (balances.get(id)! < 0 && creditorIndex < creditors.length) {
      const creditor = creditors[creditorIndex];
      transfer(id, creditor, Math.min(-balances.get(id)!, balances.get(creditor)!));
      if (balances.get(creditor) === 0) creditorIndex++;
    }
  }
  return { games, settlementTransactions: transactions, detailedSettlement: { playerSummaries: [...summaries.values()] } };
}
