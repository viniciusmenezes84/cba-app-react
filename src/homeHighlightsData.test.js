import { availableHighlightYears, buildHomeHighlights, efficiencyIndex } from './homeHighlightsData';

const players = [
  { name: 'Ana', dailyStats: {
      '2025-09-01': {pts2:20,pts3:0,reb:3},
      '2026-09-06': {pts2:3,pts3:1,reb:4,ast:2,blk:1},
      '2026-09-13': {pts2:7,pts3:0,reb:3,ast:4,blk:2}
    }, attendance: {'2026-09-06':'✅','2026-09-13':'✅','2025-09-01':'✅'} },
  { name: 'Bia', dailyStats: {
      '2026-09-06': {pts2:1,pts3:2,reb:6,ast:3,blk:1},
      '2026-09-13': {pts2:4,pts3:1,reb:8,ast:1,blk:0}
    }, attendance: {'2026-09-06':'✅','2026-09-13':'❌'} },
  { name: 'Cris', dailyStats: {}, attendance: {'2026-09-06':'✅','2026-09-13':'✅'} }
];
const matches = [
  {date:'2026-09-13',sessionKey:'1',number:1,playerStats:{Ana:{pts2:2,pts3:0,reb:1,ast:1,blk:0}}},
  {date:'2026-09-13',sessionKey:'1',number:2,playerStats:{Ana:{pts2:5,pts3:0,reb:2,ast:3,blk:2},Bia:{pts2:4,pts3:1,reb:8,ast:1,blk:0}}},
  {date:'2025-09-01',sessionKey:'1',number:1,playerStats:{Ana:{pts2:20}}}
];
test('categoriza atletas por rodada, temporada e partida sem misturar anos', () => {
  const h=buildHomeHighlights(players,'2026',matches,'2026-10-16');
  expect(h.rounds).toEqual(['2026-09-06','2026-09-13']);
  expect(h.latestDate).toBe('2026-09-13');
  expect(h.roundLeaders.pts.name).toBe('Ana');
  expect(h.roundLeaders.reb.name).toBe('Bia');
  expect(h.roundLeaders.ast.name).toBe('Ana');
  expect(h.roundLeaders.blk.name).toBe('Ana');
  expect(h.athletes.find(p=>p.name==='Ana').totals.pts).toBe(23);
  expect(h.athletes.find(p=>p.name==='Ana').presences).toBe(2);
  expect(h.athletes.find(p=>p.name==='Bia').presences).toBe(1);
  expect(h.athletes.find(p=>p.name==='Bia').attendanceRate).toBe(50);
  expect(h.seasonLeaders.pts.name).toBe('Ana');
  expect(h.seasonLeaders.pts3.name).toBe('Bia');
  expect(h.gameRecords.find(r=>r.key==='pts').value).toBe(11);
  expect(h.roundRecords.find(r=>r.key==='pts').value).toBe(14);
  expect(h.standout.name).toBe('Ana');
  expect(efficiencyIndex(h.standout.stats)).toBe(23);
  expect(h.presenceDates.map(r=>r.count)).toEqual([3,2]);
});
test('conserva resultados históricos, elimina datas futuras e não cria partidas inexistentes',()=>{
  const h=buildHomeHighlights(players,'2025',matches,'2026-10-16');
  expect(h.latestDate).toBe('2025-09-01');
  expect(h.roundLeaders.pts.stats.pts).toBe(40);
  expect(h.seasonLeaders.pts.name).toBe('Ana');
  expect(h.gameRecords.find(r=>r.key==='pts').value).toBe(40);
  expect(availableHighlightYears(players,'2026-10-16')).toEqual(['2026','2025']);
  const future=buildHomeHighlights(players,'2026',matches,'2026-09-06');
  expect(future.rounds).toEqual(['2026-09-06']);
  expect(future.gameRecords.find(r=>r.key==='pts').value).toBeNull();
});
test('preserva estado vazio sem atribuir líderes fictícios a súmulas zeradas',()=>{
  const h=buildHomeHighlights([{name:'Atleta',dailyStats:{'2026-10-10':{pts2:0,pts3:0,reb:0,ast:0,blk:0}},attendance:{'2026-10-10':'✅'}}],'2026',[], '2026-10-16');
  expect(h.latestDate).toBe('2026-10-10');
  expect(h.hasStats).toBe(false);
  expect(h.roundLeaders.pts).toBeNull();
  expect(h.seasonLeaders.pts).toBeNull();
  expect(h.gameRecords.every(r=>r.value===null)).toBe(true);
  expect(h.presenceTop).toHaveLength(1);
});
