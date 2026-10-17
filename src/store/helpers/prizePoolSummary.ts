import type { Game } from '../types/tournamentTypes';
import { calculateWinnings } from '../../lib/utils';
import { calculateResultsForGame } from './tournamentHelpers';

export function getRebuyGains(count: number, amount: number, rule: Game['rebuyDistributionRule']) {
  const cycle = rule === 'cyclic_top_two' ? 2 : 3;
  return {
    first: (rule === 'winner_takes_all' ? count : Math.ceil(count / cycle)) * amount,
    second: (rule === 'winner_takes_all' ? 0 : Math.floor((count + cycle - 2) / cycle)) * amount,
    third: (rule === 'cyclic_distribution' ? Math.floor(count / 3) : 0) * amount,
  };
}

export function getGamePrizeSummary(game: Game, buyIn: number) {
  if (game.status === 'ended') {
    const results = game.results?.length ? game.results : calculateResultsForGame(game)?.results ?? [];
    return results.filter(result => result.rank <= 3 || result.winnings > 0)
      .sort((a, b) => a.rank - b.rank)
      .map(result => ({
        key: result.playerId,
        rank: result.rank,
        name: game.players.find(player => player.id === result.playerId)?.nickname || result.name,
        amount: result.winnings,
      }));
  }
  const base = game.winnings ?? calculateWinnings(game.prizePool ?? buyIn * game.players.length,
    game.distributionPercentages ?? { first: 60, second: 25, third: 15 });
  const count = game.players.reduce((sum, player) => sum + (player.rebuysMade ?? 0), 0);
  const rebuys = getRebuyGains(count, game.rebuyAmount ?? buyIn, game.rebuyDistributionRule ?? 'winner_takes_all');
  return (['first', 'second', 'third'] as const).slice(0, Math.min(3, game.players.length))
    .map((place, index) => ({ key: place, rank: index + 1, name: null, amount: base[place] + rebuys[place] }));
}
