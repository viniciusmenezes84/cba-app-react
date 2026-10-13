// The profile API supplies only the linked athlete's records for the selected year.
// Calculate from the current season snapshot: corrections also remove stale awards.
const RULES = [
  { id: 'first-presence', title: 'De volta à quadra', metric: 'presences', target: 1, unit: 'presença', plural: 'presenças', description: 'Registrar a primeira presença na temporada.' },
  { id: 'points-100', title: 'Clube dos 100', metric: 'pts', target: 100, unit: 'ponto', plural: 'pontos', description: 'Somar 100 pontos na temporada.' },
  { id: 'rebounds-50', title: 'Dono do rebote', metric: 'reb', target: 50, unit: 'rebote', plural: 'rebotes', description: 'Somar 50 rebotes na temporada.' },
  { id: 'assists-50', title: 'Jogo coletivo', metric: 'ast', target: 50, unit: 'assistência', plural: 'assistências', description: 'Somar 50 assistências na temporada.' },
  { id: 'presence-20', title: 'Presença de respeito', metric: 'presences', target: 20, unit: 'presença', plural: 'presenças', description: 'Completar 20 presenças na temporada.' },
  { id: 'presence-25', title: 'Parte da casa', metric: 'presences', target: 25, unit: 'presença', plural: 'presenças', description: 'Completar 25 presenças na temporada.' },
];

export function buildSeasonAchievements(athlete) {
  const items = RULES.map(rule => {
    const hasRecords = (rule.metric === 'presences' ? athlete?.validDates : athlete?.statDates) > 0;
    const raw = Number(rule.metric === 'presences' ? athlete?.presences : athlete?.totals?.[rule.metric]);
    const value = hasRecords && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    const remaining = Math.max(0, rule.target - value);
    return { ...rule, value, remaining, hasRecords, earned: hasRecords && remaining === 0, progress: Math.min(100, value / rule.target * 100) };
  });
  const earned = items.filter(item => item.earned);
  const next = items.filter(item => !item.earned).sort((a, b) => b.progress - a.progress)[0] || null;
  return { items, earned, next, featured: earned.at(-1) || null };
}

export function achievementRemaining(item) {
  return `${item.remaining === 1 ? 'Falta' : 'Faltam'} ${item.remaining} ${item.remaining === 1 ? item.unit : item.plural}`;
}
