import type { Game, Player } from '../types/tournamentTypes';

export function isBuyInPaid(game: Game, player: Player): boolean {
  return player.buyInPaid ?? (game.potContributions?.some(entry => entry.playerId === player.id && entry.amount > 0) ?? false);
}

export function paidRebuyAmount(game: Game, player: Player): number {
  return Array.from({ length: player.rebuysMade ?? 0 }, (_, index) => player.rebuyPayments?.[index] ?? false)
    .filter(Boolean).length * game.rebuyAmount;
}

// Materialize legacy buy-in statuses before contributions also include recaves.
export function syncGamePayments(game: Game, buyIn: number): Game {
  const players = game.players.map(player => ({ ...player, buyInPaid: isBuyInPaid(game, player) }));
  const potContributions = players.map(player => ({
    playerId: player.id,
    playerName: player.nickname || player.name,
    amount: (player.buyInPaid ? buyIn : 0) + paidRebuyAmount(game, player),
  }));
  return { ...game, players, potContributions, totalPotAmount: potContributions.reduce((total, entry) => total + entry.amount, 0) };
}
