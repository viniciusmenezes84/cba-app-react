import { buildIdealTeam, idealTeamCaption, idealTeamNotes, latestIdealTeamDate } from './idealTeamData';

const today = '2026-11-18';
const date = '2026-11-15';
const stats = (pts2 = 0, reb = 0, ast = 0, blk = 0, pts3 = 0) => ({ pts2, pts3, reb, ast, blk });
const player = (id, name, values, day = date) => ({ id, name, dailyStats: { [day]: values } });
const roster = () => [player('a', 'Ana', stats(10, 20, 20, 20)), player('b', 'Bia', stats(5, 15, 15, 15)),
  player('c', 'Cris', stats(3, 10, 10, 10)), player('d', 'Dani', stats(2, 5, 5, 5))];

test('última data exige súmula real, ignora ausências zeradas e aceita zero com presença', () => {
  const players = [player('a', 'Ana', stats(1), '2025-10-18'),
    { name: 'Bia', attendance: { '2026-11-18': '✅' }, dailyStats: {
      '2026-02-30': stats(90), '2026-11-17': {}, '2026-11-16': { reb: null },
      '2026-11-19': stats(90), invalid: stats(90)
    } }];
  expect(latestIdealTeamDate(players, null, today)).toBe('2025-10-18');
  expect(buildIdealTeam(players, '2026', today)).toBeNull();
  players.push(player('c', 'Cris', stats(), date));
  expect(latestIdealTeamDate(players, null, today)).toBe('2025-10-18');
  players[2].attendance = { [date]: '✅' };
  expect(latestIdealTeamDate(players, null, today)).toBe(date);
});

test('mantém a última rodada da temporada, sem misturar datas e anos', () => {
  const players = [...roster(), player('e', 'Eva', stats(100), '2025-10-18')];
  expect(buildIdealTeam(players, '2025', today)).toMatchObject({ date: '2025-10-18', year: '2025' });
  expect(buildIdealTeam(players, '2026', today).slots[0].athlete.name).toBe('Ana');
  expect(buildIdealTeam(players, '2024', today)).toBeNull();
});

test('processa PTS, REB, AST e TOC sem repetir e mantém segunda, terceira e quarta colocações originais', () => {
  const players = roster();
  const original = JSON.stringify(players);
  const team = buildIdealTeam(players, null, today);
  expect(team.slots.map(slot => slot.key)).toEqual(['pts', 'reb', 'ast', 'blk']);
  expect(team.slots.map(slot => [slot.athlete.id, slot.place])).toEqual([['id:a', 1], ['id:b', 2], ['id:c', 3], ['id:d', 4]]);
  expect(team.slots.map(slot => slot.value)).toEqual([20, 15, 10, 5]);
  expect(idealTeamNotes(team.slots[1])).toEqual(['2ª maior marca em rebotes', 'Selecionado para evitar repetição']);
  expect(idealTeamNotes(team.slots[2])[0]).toBe('3ª maior marca em assistências');
  expect(JSON.stringify(players)).toBe(original);
});

test('pontos são pts2 × 2 + pts3 × 3, sem usar um total fornecido ou presumir campo ausente', () => {
  const team = buildIdealTeam([player('a', 'Ana', { ...stats(3, 0, 0, 0, 3), pts: 999 })], null, today);
  expect(team.slots[0].value).toBe(15);
  const incomplete = buildIdealTeam([player('a', 'Ana', { pts3: 3, reb: 2 })], null, today);
  expect(incomplete.slots[0]).toMatchObject({ athlete: null, status: 'missing' });
  expect(incomplete.slots[1].value).toBe(2);
});

test('empates compartilham colocação real, com nome e identidade como desempate estável', () => {
  const players = [player('b', 'Bia', stats(10, 7, 8, 2)), player('a', 'Ana', stats(10, 7, 8, 2)),
    player('d', 'Dani', stats(1, 1, 4, 1)), player('c', 'Cris', stats(1, 1, 4, 1))];
  const team = buildIdealTeam(players, null, today);
  expect(team.slots.map(slot => slot.athlete.name)).toEqual(['Ana', 'Bia', 'Cris', 'Dani']);
  expect(team.slots.map(slot => slot.place)).toEqual([1, 1, 3, 3]);
  expect(team.slots.every(slot => slot.tied)).toBe(true);
  expect(idealTeamNotes(team.slots[0])).toEqual(['Liderança empatada']);
  expect(idealTeamNotes(team.slots[2])).toEqual(['3ª maior marca em assistências', 'Empate nesta colocação', 'Selecionado para evitar repetição']);
  expect(buildIdealTeam([...players].reverse(), null, today)).toEqual(team);
  const namesakes = [player('z', 'Alex', stats(1, 1)), player('a', 'Alex', stats(1, 1))];
  expect(buildIdealTeam(namesakes, null, today).slots.slice(0, 2).map(slot => slot.athlete.id)).toEqual(['id:a', 'id:z']);
});

test('identidade estável evita aliases do mesmo atleta e normaliza o nome legado sem id', () => {
  const players = [...roster(), { ...roster()[0], nickname: 'A campeã' }];
  const selected = buildIdealTeam(players, null, today).slots.map(slot => slot.athlete.id);
  expect(new Set(selected).size).toBe(4);
  const legacy = [player(undefined, 'Ána', stats(4, 9)), player(undefined, 'ana ', stats(4, 9))];
  expect(buildIdealTeam(legacy, null, today).slots.filter(slot => slot.athlete)).toHaveLength(1);
});

test('diferencia ausência, zero registrado e falta de atletas distintos disponíveis', () => {
  const team = buildIdealTeam([player('a', 'Ana', { pts2: 1, pts3: 0, reb: 3, ast: 0 })], null, today);
  expect(team.slots.slice(1).map(slot => slot.status)).toEqual(['unavailable', 'zero', 'missing']);
  expect(team.slots.slice(1).every(slot => slot.athlete === null && slot.value === null)).toBe(true);
  const absent = player('a', 'Ana', stats());
  absent.attendance = { [date]: '❌' };
  expect(buildIdealTeam([absent], null, today)).toBeNull();
  const present = player('a', 'Ana', stats());
  present.attendance = { [date]: '✅' };
  const zeros = buildIdealTeam([present], null, today);
  expect(zeros.date).toBe(date);
  expect(zeros.slots.every(slot => slot.status === 'zero')).toBe(true);
  expect(latestIdealTeamDate([player('a', 'Ana', { pts2: '', reb: NaN, ast: Infinity, blk: -1 })], null, today)).toBeNull();
});

test('legenda preserva data, marcas, colocação, empates, substituições e espaços vazios', () => {
  const team = buildIdealTeam(roster(), null, today);
  const caption = idealTeamCaption(team);
  expect(caption).toContain('15/11/2026');
  expect(caption).toContain('AST: Cris · 10 · 3ª maior marca em assistências');
  expect(caption).toContain('Selecionado para evitar repetição');
  const present = player('a', 'Ana', stats());
  present.attendance = { [date]: '✅' };
  expect(idealTeamCaption(buildIdealTeam([present], null, today))).toContain('Marcas registradas zeradas');
});
