import { formatDate } from './athleteDashboardData';

const statKeys = ['pts2', 'pts3', 'reb', 'ast', 'blk'];
const recordedValue = value => value !== null && value !== undefined && value !== ''
  && Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : null;

// Recebe exclusivamente a resposta autorizada de getMyProfile, nunca o dashboard coletivo.
export function buildMyRounds({ stats = [] }, year) {
  const rounds = new Map();
  for (const row of stats) {
    const date = row?.stat_date;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || !date.startsWith(`${year}-`) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))
      || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) continue;
    const values = Object.fromEntries(statKeys.map(key => [key, recordedValue(row[key])]));
    if (statKeys.every(key => values[key] === null)) continue;
    if (!rounds.has(date)) rounds.set(date, { date, ...values });
    else {
      const round = rounds.get(date);
      for (const key of statKeys) round[key] = round[key] === null || values[key] === null
        ? null : round[key] + values[key];
    }
  }
  return [...rounds.values()].sort((a, b) => b.date.localeCompare(a.date)).map(round => ({
    ...round, pts: round.pts2 === null || round.pts3 === null ? null : round.pts2 * 2 + round.pts3 * 3
  }));
}

export function myRoundCaption(round) {
  return round.pts === null
    ? `Meu desempenho na rodada do CBA em ${formatDate(round.date)}. 🏀 #CBA`
    : `Minha rodada no CBA em ${formatDate(round.date)}: ${round.pts} pontos! 🏀 #CBA`;
}

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
