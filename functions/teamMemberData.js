// Identity changes are scoped to a team's tournaments; account ownership never changes.
const guestId = (name) => `guest_${name.replace(/\s+/g, '_')}`;

function rewriteTournament(data, sourceId, targetId, name) {
  const merging = sourceId !== targetId;
  const containsSource = (value) => {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(containsSource);
    return Object.entries(value).some(([key, entry]) =>
      ['id', 'playerId', 'fromPlayerId', 'toPlayerId', 'relatedPlayerId'].includes(key)
        ? entry === sourceId : containsSource(entry));
  };
  if (![data.registrations, data.games, data.settlementTransactions, data.detailedSettlement].some(containsSource)) return { ...data };
  if (merging && (data.games || []).some(game => {
    const ids = new Set([...(game.players || []).map(p => p.id), ...(game.results || []).map(p => p.playerId)]);
    return ids.has(sourceId) && ids.has(targetId);
  })) {
    throw new Error(`Fusion impossible : les deux membres figurent dans une même partie de « ${data.name} ».`);
  }
  const player = p => p.id === sourceId ? { ...p, id: targetId, name, nickname: name } : p;
  const reference = p => p.playerId === sourceId ? { ...p, playerId: targetId, ...(Object.hasOwn(p, 'name') ? { name } : { playerName: name }) } : p;
  const registrations = (data.registrations || []).map(player);
  const deduped = [];
  for (const p of registrations) {
    const existing = deduped.find(entry => entry.id === p.id);
    if (!existing) deduped.push({ ...p });
    else if (p.status === 'confirmed') existing.status = 'confirmed';
  }
  const result = { ...data, registrations: deduped, games: (data.games || []).map(game => ({
    ...game, players: (game.players || []).map(player),
    ...(game.results ? { results: game.results.map(reference) } : {}),
    ...(game.potContributions ? { potContributions: game.potContributions.map(reference) } : {}),
  })) };
  if (data.settlementTransactions) result.settlementTransactions = data.settlementTransactions.map(t => ({
    ...t,
    ...(t.fromPlayerId === sourceId ? { fromPlayerId: targetId, fromPlayerName: name } : {}),
    ...(t.toPlayerId === sourceId ? { toPlayerId: targetId, toPlayerName: name } : {}),
  })).filter((t, index) => !merging || t.fromPlayerId !== t.toPlayerId ||
    ![data.settlementTransactions[index].fromPlayerId, data.settlementTransactions[index].toPlayerId].includes(sourceId));
  if (data.detailedSettlement) {
    const summaries = [];
    for (const entry of data.detailedSettlement.playerSummaries || []) {
      const summary = { ...reference(entry), ledger: (entry.ledger || []).map(item => ({ ...item,
        ...(item.relatedPlayerId === sourceId ? { relatedPlayerId: targetId } : {}),
      })) };
      const existing = summaries.find(p => p.playerId === summary.playerId);
      if (!existing) summaries.push(summary);
      else {
        for (const key of ['totalBuyIn', 'totalWinnings', 'netResult']) existing[key] += summary[key];
        existing.gamesSummary = [...existing.gamesSummary, ...summary.gamesSummary];
        existing.ledger = [...existing.ledger, ...summary.ledger];
      }
    }
    result.detailedSettlement = { ...data.detailedSettlement, playerSummaries: summaries };
  }
  return result;
}
module.exports = { guestId, rewriteTournament };
