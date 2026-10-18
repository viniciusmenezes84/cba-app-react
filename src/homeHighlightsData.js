import { points } from './athleteDashboardData';

const number = value => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};
export const STAT_LABELS = { pts: 'Pontos', reb: 'Rebotes', ast: 'Assistências', blk: 'Tocos', pts3: 'Cestas de 3' };
export const STAT_KEYS = Object.keys(STAT_LABELS);
export const roundDateLabel = date => /^(\d{4})-(\d{2})-(\d{2})$/.test(date || '')
  ? date.slice(8, 10) + '/' + date.slice(5, 7) + '/' + date.slice(0, 4) : '—';
const isDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date || '');
const isPresent = status => String(status || '').includes('✅');
const validStatus = status => !!String(status || '').trim() && !['N/A', 'na'].includes(String(status || '').trim());
const metrics = stats => ({
  pts: points(stats), reb: number(stats?.reb), ast: number(stats?.ast),
  blk: number(stats?.blk), pts3: number(stats?.pts3)
});
const empty = () => ({ pts: 0, reb: 0, ast: 0, blk: 0, pts3: 0 });
const sumMetrics = (a, b) => Object.fromEntries(STAT_KEYS.map(key => [key, a[key] + b[key]]));
const rank = (athletes, key, valueOf = player => player.totals?.[key] ?? 0) =>
  athletes.filter(p => number(valueOf(p)) > 0)
    .sort((a, b) => number(valueOf(b)) - number(valueOf(a)) ||
      a.name.localeCompare(b.name, 'pt-BR'));

export const efficiencyIndex = stats => stats.pts + stats.reb + stats.ast + stats.blk;
// Descriptive editorial index only: not the official basketball efficiency rating.

export function availableHighlightYears(players = [], today = '9999-12-31') {
  const years = new Set();
  players.forEach(player => {
    [...Object.keys(player?.dailyStats || {}), ...Object.keys(player?.attendance || {})].forEach(date => {
      if (isDate(date) && date <= today) years.add(date.slice(0, 4));
    });
  });
  const current = isDate(today) ? today.slice(0, 4) : String(new Date().getFullYear());
  years.add(current);
  return [...years].sort((a, b) => b.localeCompare(a));
}

export function buildHomeHighlights(players = [], year, roundMatches = [], today = '9999-12-31') {
  const season = String(year);
  const activePlayers = (Array.isArray(players) ? players : []).filter(p => p && p.name);
  const statDates = new Set();
  const attendanceDates = new Set();
  activePlayers.forEach(player => {
    Object.keys(player.dailyStats || {}).forEach(date => {
      if (isDate(date) && date.slice(0, 4) === season && date <= today) statDates.add(date);
    });
    Object.keys(player.attendance || {}).forEach(date => {
      if (isDate(date) && date.slice(0, 4) === season && date <= today &&
        activePlayers.some(p => isPresent(p.attendance?.[date]))) attendanceDates.add(date);
    });
  });
  const rounds = [...statDates].sort();
  const eligibleDates = [...attendanceDates].sort();
  const athletes = activePlayers.map(player => {
    const entries = rounds.filter(date => player.dailyStats?.[date] != null)
      .map(date => ({ date, ...metrics(player.dailyStats[date]) }));
    const totals = entries.reduce((sum, e) => sumMetrics(sum, e), empty());
    const validDates = eligibleDates.filter(date => validStatus(player.attendance?.[date]));
    const presences = validDates.filter(date => isPresent(player.attendance?.[date])).length;
    let currentStreak = 0;
    let bestStreak = 0;
    validDates.forEach(date => {
      currentStreak = isPresent(player.attendance?.[date]) ? currentStreak + 1 : 0;
      bestStreak = Math.max(bestStreak, currentStreak);
    });
    return {
      name: player.name, photoUrl: player.fotoUrl || player.photoUrl || '',
      id: player.id, totals, entries, presences, validDates: validDates.length,
      attendanceRate: validDates.length ? presences / validDates.length * 100 : null,
      bestStreak, roundCount: entries.length
    };
  });
  const latestDate = rounds[rounds.length - 1] || null;
  const latest = latestDate ? athletes.map(athlete => ({
    ...athlete, stats: athlete.entries.find(entry => entry.date === latestDate) || empty()
  })) : [];
  const roundLeader = key => rank(latest, key, athlete => athlete.stats[key])[0] || null;
  const seasonLeader = key => rank(athletes, key)[0] || null;
  const leader = {
    pts: roundLeader('pts'), reb: roundLeader('reb'),
    ast: roundLeader('ast'), blk: roundLeader('blk')
  };
  const mvpCandidates = latest.filter(p => efficiencyIndex(p.stats) > 0)
    .sort((a, b) => efficiencyIndex(b.stats) - efficiencyIndex(a.stats)
      || b.stats.pts - a.stats.pts || a.name.localeCompare(b.name, 'pt-BR'));
  const dateCounts = eligibleDates.map(date => ({
    date, count: activePlayers.filter(player => isPresent(player.attendance?.[date])).length
  }));
  const milestones = STAT_KEYS.map(key => {
    const rows = athletes.flatMap(a => a.entries.map(entry => ({
      name: a.name, photoUrl: a.photoUrl, date: entry.date, value: entry[key], key
    }))).filter(e => e.value > 0)
      .sort((a, b) => b.value - a.value || b.date.localeCompare(a.date) ||
        a.name.localeCompare(b.name, 'pt-BR'));
    return { key, ...rows[0], value: rows[0]?.value ?? null, date: rows[0]?.date ?? null };
  });
  const realMatches = (Array.isArray(roundMatches) ? roundMatches : [])
    .filter(m => isDate(m.date) && m.date.slice(0, 4) === season && m.date <= today);
  const gameRecords = STAT_KEYS.map(key => {
    const rows = realMatches.flatMap(game => Object.entries(game.playerStats || {}).map(([name, stats]) => ({
      key, name, date: game.date, gameNumber: game.number, value: metrics(stats)[key]
    }))).filter(row => row.value > 0).sort((a, b) => b.value - a.value ||
      b.date.localeCompare(a.date) || a.name.localeCompare(b.name, 'pt-BR'));
    return { key, ...(rows[0] || { value: null }) };
  });
  const presenceTop = [...athletes].filter(a => a.presences > 0)
    .sort((a, b) => b.presences - a.presences || (b.attendanceRate || 0) - (a.attendanceRate || 0) ||
      a.name.localeCompare(b.name, 'pt-BR'));
  const bestStreakLeader = [...athletes].filter(a => a.bestStreak > 0)
    .sort((a, b) => b.bestStreak - a.bestStreak || b.presences - a.presences ||
      a.name.localeCompare(b.name, 'pt-BR'))[0] || null;
  const latestGames = realMatches.filter(m => m.date === latestDate);
  return {
    year: season, latestDate, rounds, athletes, latestGames,
    roundLeaders: leader, standout: mvpCandidates[0] || null,
    seasonLeaders: Object.fromEntries(STAT_KEYS.map(k => [k, seasonLeader(k)])),
    rankings: Object.fromEntries(STAT_KEYS.map(k => [k, rank(athletes, k)])),
    presenceTop, bestStreakLeader, presenceDates: dateCounts, roundRecords: milestones, gameRecords,
    recordedGames: realMatches.length,
    hasStats: athletes.some(a => STAT_KEYS.some(k => a.totals[k] > 0))
  };
}


// Position within the season ranking as the recorded rounds accumulate.
// Athletes tied at the same score share their placing; no points = no place.
export function buildRankHistory(summary, athleteName, metric = 'pts') {
  if (!STAT_KEYS.includes(metric)) return [];
  const totals = new Map(summary.athletes.map(a => [a.name, 0]));
  return summary.rounds.map(date => {
    summary.athletes.forEach(a => {
      const entry = a.entries.find(e => e.date === date);
      if (entry) totals.set(a.name, totals.get(a.name) + entry[metric]);
    });
    const score = totals.get(athleteName) || 0;
    const position = score ? 1 + [...totals.values()].filter(v => v > score).length : null;
    return { date, position };
  });
}
