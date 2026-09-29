import { buildRoundRecap } from './roundRecap';

test('resume apenas a súmula da data e calcula pontos a partir de cestas', () => {
  const result = buildRoundRecap([
    { name: 'Ana', dailyStats: { '2026-09-01': { pts2: 3, pts3: 2, reb: 4, ast: 1 }, '2026-08-01': { pts2: 30 } } },
    { name: 'Bia', dailyStats: { '2026-09-01': { pts2: 2, pts3: 0, reb: 6, ast: 3 } } },
    { name: 'Carla', dailyStats: { '2026-09-02': { pts2: 20 } } }
  ], '2026-09-01');
  expect(result.players).toBe(2);
  expect(result.totals).toEqual({ pts: 16, reb: 10, ast: 4, blk: 0, pts3: 2 });
  expect(result.leaders.pts.name).toBe('Ana');
  expect(result.leaders.reb.name).toBe('Bia');
  expect(result.leaders.ast.name).toBe('Bia');
  expect(result.matches).toEqual([]);
});

test('mostra placares persistidos apenas para a data correspondente sem inferir vencedor por totais diários', () => {
  const recap = buildRoundRecap([{ name: 'Ana', dailyStats: { '2026-09-01': { pts2: 3 } } }], '2026-09-01', [
    { date: '2026-09-02', number: 1, blackScore: 50, greenScore: 32 },
    { date: '2026-09-01', sessionKey: '1', number: 2, blackScore: 15, greenScore: 20 },
    { date: '2026-09-01', sessionKey: '1', number: 1, blackScore: 21, greenScore: 18 }
  ]);
  expect(recap.matches.map(match => [match.blackScore, match.greenScore])).toEqual([[21, 18], [15, 20]]);
  expect(recap.totals.pts).toBe(6);
});

test('não inventa uma súmula quando não há estatísticas para o dia', () => {
  expect(buildRoundRecap([{ name: 'Ana', dailyStats: {} }], '2026-09-01')).toBeNull();
  expect(buildRoundRecap([], '2026-09-01')).toBeNull();
  expect(buildRoundRecap([], 'data-inválida')).toBeNull();
});
