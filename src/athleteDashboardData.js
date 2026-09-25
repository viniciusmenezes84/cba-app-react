const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const number = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export const points = stats => (number(stats?.pts2) * 2) + (number(stats?.pts3) * 3);

export const formatDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value || '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

export function availableAthleteYears(players = [], dates = []) {
  const years = new Set();
  const addYear = date => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date || '')) years.add(date.slice(0, 4));
  };
  dates.forEach(addYear);
  players.forEach(player => {
    Object.keys(player.attendance || {}).forEach(addYear);
    Object.keys(player.dailyStats || {}).forEach(addYear);
  });
  return [...years].sort((a, b) => b.localeCompare(a));
}

export function buildAthleteSeason(players = [], dates = [], year) {
  const season = String(year);
  const playedDates = [...new Set(dates)]
    .filter(date => typeof date === 'string' && date.startsWith(`${season}-`))
    .filter(date => players.some(player => String(player.attendance?.[date] || '').includes('✅')))
    .sort();

  const athletes = players.map(player => {
    const entries = Object.entries(player.dailyStats || {})
      .filter(([date]) => date.startsWith(`${season}-`))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        pts: points(stats),
        pts2: number(stats?.pts2),
        pts3: number(stats?.pts3),
        reb: number(stats?.reb),
        ast: number(stats?.ast),
        blk: number(stats?.blk)
      }));

    const totals = entries.reduce((sum, entry) => ({
      pts: sum.pts + entry.pts,
      pts2: sum.pts2 + entry.pts2,
      pts3: sum.pts3 + entry.pts3,
      reb: sum.reb + entry.reb,
      ast: sum.ast + entry.ast,
      blk: sum.blk + entry.blk
    }), { pts: 0, pts2: 0, pts3: 0, reb: 0, ast: 0, blk: 0 });

    const attendanceDates = playedDates.filter(date => {
      const status = String(player.attendance?.[date] || '').trim();
      return status && status !== 'N/A';
    });
    const presences = attendanceDates.filter(date => String(player.attendance[date]).includes('✅')).length;
    const monthly = MONTHS.map((label, monthIndex) => {
      const monthDates = attendanceDates.filter(date => Number(date.slice(5, 7)) === monthIndex + 1);
      return {
        label,
        valid: monthDates.length,
        present: monthDates.filter(date => String(player.attendance[date]).includes('✅')).length
      };
    });
    const streak = attendanceDates.slice().reverse().findIndex(date => !String(player.attendance[date]).includes('✅'));
    const averages = Object.fromEntries(['pts', 'reb', 'ast', 'blk'].map(key => [
      key, entries.length ? totals[key] / entries.length : 0
    ]));
    const records = Object.fromEntries(['pts', 'reb', 'ast', 'blk'].map(key => [
      key, entries.reduce((best, entry) => entry[key] > (best?.value || 0)
        ? { value: entry[key], date: entry.date } : best, null)
    ]));

    return {
      ...player,
      entries,
      totals,
      averages,
      records,
      monthly,
      statDates: entries.length,
      validDates: attendanceDates.length,
      presences,
      attendanceRate: attendanceDates.length ? (presences / attendanceDates.length) * 100 : null,
      presenceStreak: streak === -1 ? attendanceDates.length : streak
    };
  });

  const ranked = athletes.filter(athlete => athlete.statDates > 0);
  const rosterAverages = Object.fromEntries(['pts', 'reb', 'ast', 'blk'].map(key => [
    key, ranked.length ? ranked.reduce((total, athlete) => total + athlete.averages[key], 0) / ranked.length : 0
  ]));

  const rankingFor = (athlete, key) => {
    if (!athlete || !athlete.statDates) return null;
    return {
      place: ranked.filter(other => other.totals[key] > athlete.totals[key]).length + 1,
      field: ranked.length
    };
  };

  return { athletes, playedDates, rosterAverages, rankingFor };
}
