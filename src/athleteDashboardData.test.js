import { availableAthleteYears, buildAthleteSeason, formatDate, points } from './athleteDashboardData';

const players = [
  {
    name: 'Ana',
    attendance: {
      '2026-09-06': '✅', '2026-09-13': 'NÃO JUSTIFICOU', '2026-09-20': 'N/A'
    },
    dailyStats: {
      '2026-09-06': { pts2: 2, pts3: 1, reb: 4, ast: 2, blk: 1 },
      '2026-09-13': { pts2: 0, pts3: 2, reb: 6, ast: 3, blk: 0 },
      '2025-09-07': { pts2: 10, pts3: 0, reb: 0, ast: 0, blk: 0 }
    }
  },
  {
    name: 'Beto',
    attendance: { '2026-09-06': '✅', '2026-09-13': '✅', '2026-09-20': '✅' },
    dailyStats: { '2026-09-06': { pts2: 1, pts3: 0, reb: 1, ast: 0, blk: 0 } }
  }
];

test('calcula a temporada por data sem misturar anos nem contar N/A como falta', () => {
  const dates = ['2026-09-06', '2026-09-13', '2026-09-20'];
  const season = buildAthleteSeason(players, dates, '2026');
  const ana = season.athletes[0];

  expect(ana.statDates).toBe(2);
  expect(ana.totals).toMatchObject({ pts: 13, pts2: 2, pts3: 3, reb: 10, ast: 5, blk: 1 });
  expect(ana.averages.pts).toBe(6.5);
  expect(ana.validDates).toBe(2);
  expect(ana.presences).toBe(1);
  expect(ana.attendanceRate).toBe(50);
  expect(ana.monthly[8]).toMatchObject({ valid: 2, present: 1 });
  expect(ana.records.pts).toEqual({ value: 7, date: '2026-09-06' });
  expect(season.rankingFor(ana, 'pts')).toEqual({ place: 1, field: 2 });
  expect(availableAthleteYears(players, dates)).toEqual(['2026', '2025']);
});

test('mantém indicadores ausentes quando ainda não há súmula ou presença', () => {
  const season = buildAthleteSeason([{ name: 'Cris', attendance: {}, dailyStats: {} }], [], '2026');
  const cris = season.athletes[0];
  expect(cris.statDates).toBe(0);
  expect(cris.attendanceRate).toBeNull();
  expect(season.rankingFor(cris, 'pts')).toBeNull();
  expect(points({ pts2: '2', pts3: '1' })).toBe(7);
  expect(formatDate('2026-09-06')).toBe('06/09/2026');
});
