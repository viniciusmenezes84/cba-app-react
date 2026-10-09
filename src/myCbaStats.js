// A súmula armazena totais por data, que podem reunir várias partidas.
export function buildMySeason({ profile, stats = [], attendance = [] }) {
  const totals = { pts: 0, pts2: 0, pts3: 0, reb: 0, ast: 0, blk: 0 };
  for (const row of stats) {
    for (const key of ['pts2', 'pts3', 'reb', 'ast', 'blk']) totals[key] += Math.max(0, Number(row[key]) || 0);
  }
  totals.pts = totals.pts2 * 2 + totals.pts3 * 3;
  const eligible = attendance.filter(row => row.status && row.status !== 'na');
  const presences = eligible.filter(row => row.status === 'present').length;
  return {
    name: profile.nickname || profile.name, fotoUrl: profile.photoUrl,
    numero: profile.jerseyNumber, posicao: profile.position,
    totals, statDates: stats.length, validDates: eligible.length, presences,
    attendanceRate: eligible.length ? presences / eligible.length * 100 : null,
    averages: Object.fromEntries(['pts', 'reb', 'ast', 'blk'].map(key => [key, stats.length ? totals[key] / stats.length : 0]))
  };
}
