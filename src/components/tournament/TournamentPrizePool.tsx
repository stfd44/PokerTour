import type { Tournament } from '../../store/types/tournamentTypes';
import { getGamePrizeSummary } from '../../store/helpers/prizePoolSummary';

const money = (amount: number) => amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

export function TournamentPrizePool({ tournament }: { tournament: Tournament }) {
  const summaries = tournament.games.map((game, index) => ({ game, number: index + 1, rows: getGamePrizeSummary(game, tournament.buyin) }));
  const total = summaries.reduce((sum, { rows }) => sum + rows.reduce((subtotal, row) => subtotal + row.amount, 0), 0);
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-poker-gold/10 p-3">
        <span className="text-sm text-gray-200">Gains cumulés</span>
        <strong className="text-lg text-poker-gold">{money(total)}</strong>
      </div>
      <p className="text-xs text-gray-400">Recaves incluses, payées ou non. Les gains des parties non terminées sont prévisionnels.</p>
      {summaries.length === 0 && <p className="text-sm text-gray-300">Aucune partie pour le moment.</p>}
      {summaries.map(({ game, number, rows }) => (
        <section key={game.id} className="min-w-0 rounded-lg border border-white/10 px-3 py-2" aria-label={`Gains de la partie ${number}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2 mb-1">
            <h3 className="text-sm font-semibold text-white">Partie {number}</h3>
            <span className={`text-xs ${game.status === 'in_progress' ? 'text-green-300' : 'text-gray-400'}`}>
              {game.status === 'ended' ? 'Terminée' : game.status === 'in_progress' ? 'En cours' : 'Prévue'}
            </span>
          </div>
          {rows.length === 0 && <p className="py-2 text-sm text-gray-400">Gains indisponibles.</p>}
          <ul className="divide-y divide-white/5">
            {rows.map(row => (
              <li key={row.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 break-words text-gray-200">
                  <span className="text-gray-400">{row.rank}{row.rank === 1 ? 'er' : 'e'}</span>
                  {row.name ? ` · ${row.name}` : ' rang'}
                </span>
                <strong className="shrink-0 text-poker-gold tabular-nums">{money(row.amount)}</strong>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
