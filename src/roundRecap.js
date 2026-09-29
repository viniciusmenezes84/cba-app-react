const count = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

// A súmula disponível no portal é consolidada por data, inclusive quando há
// várias partidas na mesma rodada. Nunca atribuir estes números a um placar.
export function buildRoundRecap(players = [], date, matches = []) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const entries = players.filter(player => player.dailyStats?.[date] != null).map(player => {
    const stats = player.dailyStats[date];
    return {
      name: String(player.name || 'Atleta'),
      pts: count(stats.pts2) * 2 + count(stats.pts3) * 3,
      reb: count(stats.reb), ast: count(stats.ast), blk: count(stats.blk),
      pts3: count(stats.pts3)
    };
  });
  if (!entries.length) return null;
  const totals = entries.reduce((result, entry) => {
    for (const key of ['pts', 'reb', 'ast', 'blk', 'pts3']) result[key] += entry[key];
    return result;
  }, { pts: 0, reb: 0, ast: 0, blk: 0, pts3: 0 });
  const leader = key => entries.slice().sort((a, b) => b[key] - a[key] || a.name.localeCompare(b.name, 'pt-BR'))[0];
  return { date, players: entries.length, totals, matches: matches
    .filter(match => match.date === date)
    .sort((a, b) => String(a.sessionKey).localeCompare(String(b.sessionKey)) || a.number - b.number), leaders: {
    pts: leader('pts'), reb: leader('reb'), ast: leader('ast')
  } };
}
