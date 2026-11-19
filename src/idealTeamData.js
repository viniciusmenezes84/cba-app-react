import { formatDate, points } from './athleteDashboardData';

export const IDEAL_TEAM_CATEGORIES = [
  { key: 'pts', label: 'Pontos', short: 'PTS' },
  { key: 'reb', label: 'Rebotes', short: 'REB' },
  { key: 'ast', label: 'Assistências', short: 'AST' },
  { key: 'blk', label: 'Tocos', short: 'TOC' },
  { key: 'ie', label: 'Destaque geral', short: 'IE-CBA' }
];
const fields = ['pts2', 'pts3', 'reb', 'ast', 'blk'];
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const recorded = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
  && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
export const todayCba = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function validDate(date, today) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today
    && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
    && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
}

const hasRecord = stats => stats && fields.some(key => recorded(stats[key]) !== null);
const hasProduction = stats => fields.some(key => recorded(stats?.[key]) > 0);
const isPresent = value => String(value || '').includes('✅') || String(value || '').toLowerCase() === 'present';
const isValidRoundRecord = (player, date, stats) =>
  hasRecord(stats) && (hasProduction(stats) || isPresent(player.attendance?.[date]));
// Ausência com linha zerada é um placeholder técnico, não uma nova rodada disputada.

const identity = player => {
  const id = player.id ?? player.athleteId ?? player.athlete_id;
  return id !== undefined && id !== null && String(id).trim() ? `id:${id}` : `name:${normalize(player.name || player.nickname || player.apelido)}`;
};
const nameOf = player => String(player.nickname || player.apelido || player.name || '').trim();
const compare = (a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id, 'en');

// A zero is a real record. Attendance, empty objects and null fields are not.
export function latestIdealTeamDate(players = [], year = null, today = todayCba()) {
  const dates = players.filter(player => player && nameOf(player)).flatMap(player =>
    Object.entries(player.dailyStats || {}).filter(([date, stats]) => validDate(date, today)
      && (year === null || date.startsWith(`${year}-`)) && isValidRoundRecord(player, date, stats)).map(([date]) => date));
  return dates.sort().at(-1) || null;
}

export function idealTeamNotes(slot) {
  if (!slot.athlete) return [slot.reason];
  if (slot.replacementFor) return [
    `Vaga de ${slot.replacementFor} preenchida pelo índice de eficiência`,
    slot.value === 0 ? 'Participação confirmada; índice zerado' : `${slot.place}ª colocação em eficiência`
  ];
  if (slot.key === 'ie') return slot.value === 0
    ? ['Participação confirmada; índice zerado']
    : [slot.place === 1 ? 'Maior índice de eficiência da rodada' : `${slot.place}ª colocação em eficiência`,
      ...(slot.tied ? ['Empate nesta colocação'] : []),
      ...(slot.place > 1 ? ['Melhor atleta ainda não selecionado'] : [])];
  if (slot.place === 1) return [slot.tied ? 'Liderança empatada' : `Maior marca em ${slot.label.toLowerCase()}`];
  return [`${slot.place}ª maior marca em ${slot.label.toLowerCase()}`,
    ...(slot.tied ? ['Empate nesta colocação'] : []), 'Selecionado para evitar repetição'];
}

export function buildIdealTeam(players = [], year = null, today = todayCba()) {
  const date = latestIdealTeamDate(players, year, today);
  if (!date) return null;

  const byId = new Map();
  players.filter(player => player && nameOf(player) && isValidRoundRecord(player, date, player.dailyStats?.[date]))
    .map(player => {
      const stats = player.dailyStats[date];
      const values = Object.fromEntries(fields.map(key => [key, recorded(stats[key])]));
      const complete = fields.every(key => values[key] !== null);
      const pts = values.pts2 === null || values.pts3 === null ? null : points(values);
      return { id: identity(player), name: nameOf(player), photoUrl: player.fotoUrl || player.photoUrl || '',
        values: { ...values, pts, ie: complete ? pts + values.reb + values.ast + values.blk : null } };
    }).sort(compare).forEach(player => { if (!byId.has(player.id)) byId.set(player.id, player); });

  const entries = [...byId.values()];
  const chosen = new Set();
  const ranking = key => entries.filter(player => player.values[key] !== null && player.values[key] > 0)
    .sort((a, b) => b.values[key] - a.values[key] || compare(a, b));
  const efficiencyRanking = entries.filter(player => player.values.ie !== null)
    .sort((a, b) => b.values.ie - a.values.ie || compare(a, b));

  const makeSlot = (category, athlete, ranked, extras = {}) => {
    const value = athlete.values[extras.metric || category.key];
    const place = 1 + ranked.filter(player => player.values[extras.metric || category.key] > value).length;
    return { ...category, ...extras,
      athlete: { id: athlete.id, name: athlete.name, photoUrl: athlete.photoUrl },
      value, place,
      tied: ranked.filter(player => player.values[extras.metric || category.key] === value).length > 1,
      substituted: place > 1 };
  };

  // Mantém os quatro critérios tradicionais antes de preencher vagas faltantes.
  const slots = IDEAL_TEAM_CATEGORIES.slice(0, 4).map(category => {
    const recordedEntries = entries.filter(player => player.values[category.key] !== null);
    const ranked = ranking(category.key);
    const athlete = ranked.find(player => !chosen.has(player.id));
    if (!athlete) return { ...category, athlete: null, value: null,
      status: ranked.length ? 'unavailable' : recordedEntries.length ? 'zero' : 'missing',
      reason: ranked.length ? 'Sem outro atleta com marca positiva disponível.' : recordedEntries.length
        ? 'Marcas registradas zeradas nesta categoria.' : 'Sem marca registrada nesta categoria.' };
    chosen.add(athlete.id);
    return makeSlot(category, athlete, ranked);
  });

  // Sem tocos (ou outra categoria positiva), a vaga não desaparece: entra o
  // atleta restante de maior IE-CBA, claramente identificado como substituto.
  slots.forEach((slot, index) => {
    if (slot.athlete) return;
    const athlete = efficiencyRanking.find(player => !chosen.has(player.id));
    if (!athlete) return;
    chosen.add(athlete.id);
    slots[index] = makeSlot({ key: slot.key, label: 'Destaque por eficiência', short: 'IE-CBA' },
      athlete, efficiencyRanking, { metric: 'ie', replacementFor: slot.short });
  });

  const overall = IDEAL_TEAM_CATEGORIES[4];
  const fifth = efficiencyRanking.find(player => !chosen.has(player.id));
  if (fifth) {
    chosen.add(fifth.id);
    slots.push(makeSlot(overall, fifth, efficiencyRanking));
  } else {
    slots.push({ ...overall, athlete: null, value: null, status: 'unavailable',
      reason: 'Sem quinto atleta com estatísticas completas para calcular a eficiência.' });
  }

  return { date, year: date.slice(0, 4), slots };
}

export function idealTeamCaption(team) {
  return `Time ideal da rodada do CBA em ${formatDate(team.date)} 🏀\n` + team.slots.map(slot =>
    `${slot.short}: ${slot.athlete ? `${slot.athlete.name} · ${slot.value} · ${idealTeamNotes(slot).join(' · ')}` : slot.reason}`).join('\n')
    + '\nTotais consolidados por data; podem reunir várias partidas. #CBA';
}
