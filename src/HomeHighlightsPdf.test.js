import { buildHomeHighlights } from './homeHighlightsData';
import { buildSportsExecutivePdf } from './HomeHighlightsPdf';

test('relatório institucional em A4 usa a mesma seleção de temporada e cards do Início', () => {
  const players = [
    {name:'Ana',dailyStats:{
      '2026-10-11':{pts2:2,pts3:1,reb:3,ast:2,blk:1},
      '2026-10-18':{pts2:5,pts3:0,reb:5,ast:1,blk:0},
      '2025-10-18':{pts2:200,pts3:0,reb:0,ast:0,blk:0}},
      attendance:{'2026-10-11':'✅','2026-10-18':'✅'}},
    {name:'Bia',dailyStats:{'2026-10-18':{pts2:3,pts3:1,reb:6,ast:4,blk:2}},
      attendance:{'2026-10-11':'✅','2026-10-18':'✅'}}
  ];
  const matches=[{date:'2026-10-18',number:1,sessionKey:'1111111111111',
    playerStats:{Ana:{pts2:5,pts3:0,reb:5,ast:1,blk:0},Bia:{pts2:3,pts3:1,reb:6,ast:4,blk:2}}}];
  const stats=buildHomeHighlights(players,'2026',matches,'2026-10-18');
  expect(stats.roundLeaders.pts?.name).toBe('Ana');
  expect(stats.recordedGames).toBe(1);
  expect(stats.athletes.find(a=>a.name==='Ana').totals.pts).toBe(17);
  const pdf=buildSportsExecutivePdf(stats,new Date('2026-10-18T14:00:00-03:00'));
  expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(210,0);
  expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(297,0);
  expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(4);
  const bytes=new Uint8Array(pdf.output('arraybuffer'));
  expect(bytes.length).toBeGreaterThan(4000);
  expect(String.fromCharCode(...bytes.slice(0,5))).toBe('%PDF-');
});

test('relatório suporta temporada sem partidas detalhadas sem inventar recordes',()=>{
  const stats=buildHomeHighlights([{name:'Teste',dailyStats:{'2026-10-11':{pts2:2}},attendance:{'2026-10-11':'✅'}}],
    '2026',[], '2026-10-18');
  expect(stats.recordedGames).toBe(0);
  expect(stats.gameRecords.every(row=>row.value===null)).toBe(true);
  expect(()=>buildSportsExecutivePdf(stats)).not.toThrow();
});
