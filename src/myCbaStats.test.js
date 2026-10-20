import { buildMyRounds, myRoundCaption } from './myCbaStats';

const row = (date, values = {}) => ({ stat_date: date, pts2: 0, pts3: 0, reb: 0, ast: 0, blk: 0, ...values });

test('consolida por data, calcula cestas e ordena a temporada da mais recente para a mais antiga', () => {
  const stats = [row('2025-10-18', { pts2: 3, pts3: 3, reb: 4 }), row('2025-10-11'),
    row('2026-10-18', { pts2: 99 }), row('2025-10-18', { reb: 2, ast: 5, blk: 1 })];
  const original = JSON.stringify(stats);
  expect(buildMyRounds({ stats }, '2025')).toEqual([
    { date: '2025-10-18', pts: 15, pts2: 3, pts3: 3, reb: 6, ast: 5, blk: 1 },
    { date: '2025-10-11', pts: 0, pts2: 0, pts3: 0, reb: 0, ast: 0, blk: 0 }
  ]);
  expect(JSON.stringify(stats)).toBe(original);
});

test('ausência de súmula não vira desempenho zero; presença e datas inválidas não geram card', () => {
  expect(buildMyRounds({ attendance: [{ attendance_date: '2025-10-18', status: 'present' }] }, 2025)).toEqual([]);
  expect(buildMyRounds({ stats: [null, { stat_date: '2025-10-18' }, row('2025-02-30'), row('invalid')] }, 2025)).toEqual([]);
  expect(buildMyRounds({ stats: [row('2025-10-18')] }, 2025)[0].pts).toBe(0);
});

test('não inventa estatísticas ausentes nem pontuação quando uma cesta não foi registrada', () => {
  const [round] = buildMyRounds({ stats: [{ stat_date: '2025-10-18', pts2: 2, reb: 0 }] }, 2025);
  expect(round).toMatchObject({ pts: null, reb: 0, ast: null, blk: null });
  expect(myRoundCaption(round)).not.toContain('pontos');
});

test('legenda usa os totais reais e a data da rodada, inclusive zero', () => {
  expect(myRoundCaption({ date: '2025-10-18', pts: 15 })).toBe('Minha rodada no CBA em 18/10/2025: 15 pontos! 🏀 #CBA');
  expect(myRoundCaption({ date: '2025-10-18', pts: 0 })).toContain('0 pontos!');
});
