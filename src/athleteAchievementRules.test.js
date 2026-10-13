import { buildSeasonAchievements } from './athleteAchievementRules';
import { buildMySeason } from './myCbaStats';

const season = (presences, pts2, pts3 = 0, reb = 0, ast = 0) => buildMySeason({
  profile: { name: 'Atleta' },
  attendance: [...Array.from({ length: presences }, () => ({ status: 'present' })), { status: 'absent' }, { status: 'na' }, { status: 'justified' }],
  stats: [{ pts2, pts3, reb, ast }],
});

test('presenças não incluem faltas, justificativas nem N/A; pontos somam cestas de 2 e 3', () => {
  const result = buildSeasonAchievements(season(19, 48, 1, 49, 49));
  expect(result.earned.map(item => item.id)).toEqual(['first-presence']);
  expect(result.next).toMatchObject({ id: 'points-100', value: 99, remaining: 1 });
  expect(result.items.find(item => item.id === 'presence-20')).toMatchObject({ value: 19, remaining: 1, earned: false });
  const reached = buildSeasonAchievements(season(20, 47, 2, 50, 50));
  expect(reached.earned).toHaveLength(5);
  expect(reached.featured.id).toBe('presence-20');
  expect(reached.next).toMatchObject({ id: 'presence-25', remaining: 5 });
});

test('atingir todos os objetivos limita barras a 100% e não inventa próximo objetivo', () => {
  const result = buildSeasonAchievements(season(30, 80, 5, 60, 70));
  expect(result.earned).toHaveLength(6);
  expect(result.next).toBeNull();
  expect(result.featured.id).toBe('presence-25');
  expect(result.items.every(item => item.progress === 100 && item.remaining === 0)).toBe(true);
});

test('correções removem conquistas e restauram o progresso; anos vazios não herdam prêmios', () => {
  expect(buildSeasonAchievements(season(20, 50)).earned).toHaveLength(3);
  expect(buildSeasonAchievements(season(19, 49)).earned.map(item => item.id)).toEqual(['first-presence']);
  const empty = buildSeasonAchievements(buildMySeason({ profile: { name: 'Atleta' } }));
  expect(empty.earned).toEqual([]);
  expect(empty.featured).toBeNull();
  expect(empty.items.every(item => item.value === 0 && !item.hasRecords)).toBe(true);
});
