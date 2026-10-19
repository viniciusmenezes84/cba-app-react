import { jsPDF } from 'jspdf';
import { buildRankHistory, efficiencyIndex, roundDateLabel, STAT_KEYS, STAT_LABELS } from './homeHighlightsData';

// CBA institutional palette, consistent with ReportsPdf and the Sports Center.
const NAVY = [15, 23, 42];
const NAVY_SOFT = [30, 41, 59];
const EMERALD = [5, 150, 105];
const EMERALD_LIGHT = [209, 250, 229];
const GOLD = [217, 119, 6];
const INDIGO = [67, 56, 202];
const INK = [30, 41, 59];
const MUTED = [100, 116, 139];
const BORDER = [226, 232, 240];
const PAPER = [248, 250, 252];
const WHITE = [255, 255, 255];
const LEFT = 13;
const WIDTH = 210;
const RIGHT = 197;
const CONTENT = RIGHT - LEFT;

const numberText = n => n == null ? '-' : Number(n).toLocaleString('pt-BR');
const textOrFallback = (value, fallback = 'Sem registro') =>
  typeof value === 'string' && value.trim() ? value : fallback;
const dateText = date => date ? roundDateLabel(date) : '-';
const metricName = metric => STAT_LABELS[metric] || metric;

function write(doc, value, x, y, size = 9, color = INK, bold = false, align = 'left') {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(String(value), x, y, { align });
}
function clipped(doc, value, maxWidth) {
  const original = String(value ?? '');
  if (doc.getTextWidth(original) <= maxWidth) return original;
  let out = original;
  while (out.length && doc.getTextWidth(out + '...') > maxWidth) out = out.slice(0, -1);
  return out + '...';
}
function surface(doc, x, y, w, h, fill = WHITE, border = BORDER, radius = 3) {
  doc.setFillColor(...fill);
  doc.setDrawColor(...border);
  doc.roundedRect(x, y, w, h, radius, radius, 'FD');
}
function bar(doc, x, y, w, h, value, max, color = EMERALD) {
  doc.setFillColor(...BORDER);
  doc.roundedRect(x, y, w, h, 0.7, 0.7, 'F');
  if (value > 0 && max > 0) {
    doc.setFillColor(...color);
    const filled = Math.min(w, Math.max(1.2, (value / max) * w));
    doc.roundedRect(x, y, filled, h, 0.7, 0.7, 'F');
  }
}
function page(doc, title, subtitle, year) {
  doc.addPage();
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, WIDTH, 297, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, WIDTH, 30, 'F');
  doc.setFillColor(...EMERALD);
  doc.rect(0, 29, WIDTH, 1.2, 'F');
  write(doc, title, LEFT, 13, 15, WHITE, true);
  write(doc, subtitle, LEFT, 21.5, 8.5, [203, 213, 225]);
  write(doc, 'TEMPORADA ' + year, RIGHT, 21.5, 8, [167, 243, 208], true, 'right');
}
function chapter(doc, title, description, y) {
  write(doc, title, LEFT, y, 12, NAVY, true);
  if (description) write(doc, description, LEFT, y + 6, 8, MUTED);
}
function kicker(doc, text, x, y, color = EMERALD) {
  write(doc, text.toUpperCase(), x, y, 7.5, color, true);
}
function kpi(doc, x, y, w, label, value, color = EMERALD) {
  surface(doc, x, y, w, 26, WHITE);
  doc.setFillColor(...color);
  doc.roundedRect(x + 3.4, y + 5.2, 1.3, 15, 0.6, 0.6, 'F');
  write(doc, label, x + 8, y + 9.5, 7.2, MUTED, true);
  write(doc, numberText(value), x + 8, y + 20.5, 16, NAVY, true);
}
function avatar(doc, name, x, y, diameter = 15, color = EMERALD) {
  doc.setFillColor(...color);
  doc.circle(x + diameter / 2, y + diameter / 2, diameter / 2, 'F');
  const initials = textOrFallback(name, '?').split(/\s+/).slice(0, 2).map(v => v[0] || '').join('').toUpperCase();
  write(doc, initials || '?', x + diameter / 2, y + diameter / 2 + 1.9,
    diameter * 0.42, WHITE, true, 'center');
}
function heroCard(doc, x, y, w, title, player, value, unit, help, color = EMERALD) {
  surface(doc, x, y, w, 52, WHITE);
  doc.setFillColor(...color);
  doc.roundedRect(x, y, 2, 52, 1, 1, 'F');
  kicker(doc, title, x + 7, y + 9, color);
  avatar(doc, player?.name, x + 7, y + 14, 14, color);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  write(doc, clipped(doc, player?.name || 'Aguardando súmula', w - 36), x + 25, y + 23, 10.5, NAVY, true);
  write(doc, value == null ? '-' : numberText(value), x + 7, y + 41, 20, NAVY, true);
  write(doc, unit, x + 28, y + 41, 8.5, color, true);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4);
  write(doc, clipped(doc, help, w - 9), x + 7, y + 48, 7.4, MUTED);
}
function smallLeader(doc, x, y, w, label, athlete, value, unit, color = EMERALD) {
  surface(doc, x, y, w, 38, WHITE);
  kicker(doc, label, x + 5, y + 8, color);
  avatar(doc, athlete?.name, x + 5, y + 12, 12, color);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  write(doc, clipped(doc, athlete?.name || 'Sem registro', w - 27), x + 20, y + 21, 8.6, NAVY, true);
  write(doc, value == null ? '-' : numberText(value), x + 5, y + 32, 13, NAVY, true);
  write(doc, unit, x + 24, y + 32, 7, MUTED, true);
}
function seasonCard(doc, x, y, title, player, value, unit, color = EMERALD, info = '') {
  const w = 89;
  surface(doc, x, y, w, 51, WHITE);
  doc.setFillColor(...color);
  doc.roundedRect(x + 5, y + 6, 1.5, 10, 0.7, 0.7, 'F');
  kicker(doc, title, x + 10, y + 12, color);
  avatar(doc, player?.name, x + 5, y + 19, 15, color);
  doc.setFont('helvetica', 'bold');doc.setFontSize(10);
  write(doc, clipped(doc, player?.name || 'Sem registro', 63), x + 24, y + 25.5, 9.8, NAVY, true);
  write(doc, value == null ? '-' : numberText(value), x + 6, y + 41, 17.5, NAVY, true);
  write(doc, unit, x + 31, y + 41, 7.5, MUTED, true);
  if (info) write(doc, clipped(doc, info, w - 12), x + 6, y + 47, 7, MUTED);
}
function rankCard(doc, x, y, w, title, list, key, color = EMERALD) {
  const h = 66;
  surface(doc, x, y, w, h);
  kicker(doc, title, x + 5, y + 9, color);
  const best = Math.max(1, Number(list[0]?.totals?.[key] || 0));
  if (!list.length) {
    write(doc, 'Sem estatísticas registradas', x + 5, y + 32, 8, MUTED);
    return;
  }
  list.slice(0, 5).forEach((a, index) => {
    const rY = y + 17 + index * 9.2;
    write(doc, String(index + 1) + '.', x + 5, rY, 8, color, true);
    doc.setFont('helvetica','normal');doc.setFontSize(8);
    write(doc, clipped(doc, a.name, w - 30), x + 14, rY, 8.2, NAVY, index === 0);
    write(doc, numberText(a.totals?.[key] || 0), x + w - 5, rY, 8.6, NAVY, true, 'right');
    bar(doc, x + 14, rY + 1.4, w - 19, 1.4, a.totals?.[key], best, color);
  });
}
function recordCard(doc, x, y, w, label, rec, isGame, color) {
  surface(doc, x, y, w, 34, WHITE);
  kicker(doc, label, x + 5, y + 7, color);
  write(doc, rec?.value == null ? '-' : numberText(rec.value), x + 5, y + 21, 17, NAVY, true);
  doc.setFont('helvetica','bold');doc.setFontSize(8.5);
  write(doc, clipped(doc, rec?.name || 'Sem registro', w - 34), x + 29, y + 20.5, 8.4, NAVY, true);
  const when = isGame
    ? (rec?.date ? dateText(rec.date) + '  /  Jogo ' + String(rec.gameNumber || '-') : 'Ainda sem partidas')
    : (rec?.date ? dateText(rec.date) : 'Sem súmula');
  write(doc, clipped(doc, when, w - 34), x + 29, y + 28, 7.5, MUTED);
}
function miniChart(doc, x, y, w, h, rows, getValue, color, lastLabel = '') {
  const values = rows.slice(-8);
  if (!values.length) {
    write(doc, 'Ainda sem rodadas para representar.', x + 3, y + 17, 8, MUTED);
    return;
  }
  const max = Math.max(1, ...values.map(r => Number(getValue(r) || 0)));
  const gap = 4;
  const chartH = h - 14;
  const barW = Math.min(15, (w - 10 - gap * (values.length - 1)) / values.length);
  const used = values.length * barW + (values.length - 1) * gap;
  const start = x + (w - used) / 2;
  values.forEach((r, i) => {
    const n = Number(getValue(r) || 0);
    const bx = start + i * (barW + gap);
    const amount = n > 0 ? Math.max(2, chartH * n / max) : 0.6;
    doc.setFillColor(...color);
    doc.roundedRect(bx, y + chartH - amount + 3, barW, amount, 0.8, 0.8, 'F');
    write(doc, numberText(n), bx + barW / 2, y + chartH - amount, 7.5, NAVY, true, 'center');
    write(doc, (r.date || '').slice(5).replace('-', '/'), bx + barW / 2, y + h - 3, 6.4, MUTED, false, 'center');
  });
  if (lastLabel) write(doc, lastLabel, x + w - 2, y + h + 5, 7, MUTED, false, 'right');
}
function explanation(doc, text, y, color = INDIGO) {
  const lines = doc.splitTextToSize(text, CONTENT - 13);
  const h = Math.max(19, lines.length * 4.3 + 10);
  surface(doc, LEFT, y, CONTENT, h, [238, 242, 255], [224, 231, 255], 2.5);
  doc.setFillColor(...color);
  doc.roundedRect(LEFT + 4, y + 4, 1.4, h - 8, 0.7, 0.7, 'F');
  doc.setFont('helvetica','normal');doc.setFontSize(8.2);doc.setTextColor(...INK);
  doc.text(lines, LEFT + 10, y + 9);
  return y + h;
}
function cover(doc, summary, generatedAt) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, WIDTH, 297, 'F');
  doc.setFillColor(...NAVY_SOFT);
  doc.circle(195, 74, 66, 'F');
  doc.circle(198, 225, 52, 'F');
  doc.setFillColor(...EMERALD);
  doc.rect(18, 42, 38, 2, 'F');
  write(doc, 'CBA  /  BASQUETE DOS APOSENTADOS', 18, 35, 10, [167, 243, 208], true);
  write(doc, 'RELATÓRIO', 18, 79, 29, WHITE, true);
  write(doc, 'EXECUTIVO', 18, 92, 29, WHITE, true);
  write(doc, 'ESPORTIVO', 18, 105, 29, WHITE, true);
  write(doc, 'TEMPORADA ' + summary.year, 18, 128, 16, [167, 243, 208], true);
  write(doc, 'Destaques da rodada, líderes e evolução do elenco', 18, 143, 10, [203, 213, 225]);
  const kpis = [
    ['RODADAS', summary.rounds.length],
    ['ATLETAS COM SÚMULA', summary.athletes.filter(a => a.roundCount > 0).length],
    ['PARTIDAS DETALHADAS', summary.recordedGames || 0],
    ['PRESENÇAS REGISTRADAS', summary.presenceDates.reduce((s, row) => s + row.count, 0)]
  ];
  kpis.forEach(([label, value], i) => {
    const x = 18 + (i % 2) * 89;
    const y = 167 + Math.floor(i / 2) * 32;
    doc.setFillColor(...NAVY_SOFT);
    doc.roundedRect(x, y, 82, 27, 3, 3, 'F');
    write(doc, label, x + 7, y + 10, 7, [203, 213, 225], true);
    write(doc, numberText(value), x + 7, y + 22, 16, WHITE, true);
  });
  const stamp = generatedAt.toLocaleDateString('pt-BR', {timeZone:'America/Bahia'});
  write(doc, 'ÚLTIMA RODADA COM SÚMULA  /  ' + dateText(summary.latestDate), 18, 249, 9, [167, 243, 208], true);
  write(doc, 'Emitido em ' + stamp, 18, 259, 9, [203, 213, 225]);
}
function footer(doc, date) {
  const count = doc.getNumberOfPages();
  for (let pageIndex = 1; pageIndex <= count; pageIndex += 1) {
    doc.setPage(pageIndex);
    const h = doc.internal.pageSize.getHeight();
    if (pageIndex > 1) {
      doc.setDrawColor(...BORDER);
      doc.line(LEFT, h - 14, RIGHT, h - 14);
    }
    write(doc, 'CBA  /  Relatório executivo esportivo  /  ' + date,
      LEFT, h - 8, 7.5, pageIndex === 1 ? [203, 213, 225] : MUTED);
    write(doc, pageIndex + '/' + count, RIGHT, h - 8, 7.5,
      pageIndex === 1 ? [203, 213, 225] : MUTED, false, 'right');
  }
}

export function buildSportsExecutivePdf(summary, generatedAt = new Date()) {
  if (!summary || !summary.year) throw new Error('Temporada não informada.');
  const doc = new jsPDF({unit:'mm',format:'a4',compress:true});
  const year = String(summary.year);
  const stamp = generatedAt.toLocaleDateString('pt-BR', {timeZone:'America/Bahia'});
  const latest = dateText(summary.latestDate);

  // 1. Editorial cover: the same source figures shown on the dashboard.
  cover(doc, summary, generatedAt);

  // 2. Round dashboard: short athlete cards rather than a wall of table rows.
  page(doc, 'RADAR DA RODADA', 'Destaques da última data com súmula: ' + latest, year);
  chapter(doc, 'Visão geral', 'Os mesmos indicadores do CBA Sports Center.', 43);
  const blocks = [
    ['Rodadas', summary.rounds.length],
    ['Atletas c/ súmula', summary.athletes.filter(a => a.roundCount > 0).length],
    ['Presenças', summary.presenceDates.reduce((s, r) => s + r.count, 0)],
    ['Partidas', summary.recordedGames || 0]
  ];
  const kw = (CONTENT - 3 * 4) / 4;
  blocks.forEach(([label, value], i) => kpi(doc, LEFT + i * (kw + 4), 59, kw, label, value, i === 3 ? INDIGO : EMERALD));
  chapter(doc, 'Os protagonistas do domingo', 'Estatísticas totais da rodada, não médias por partida.', 99);
  const scorer = summary.roundLeaders?.pts;
  const standout = summary.standout;
  heroCard(doc, LEFT, 115, 89, 'CESTINHA DA RODADA', scorer, scorer?.stats?.pts,
    'PTS', 'Maior pontuação do dia', GOLD);
  heroCard(doc, LEFT + 95, 115, 89, 'DESTAQUE GERAL', standout,
    standout ? efficiencyIndex(standout.stats) : null,
    'ÍNDICE', 'PTS + REB + AST + TOC', EMERALD);
  const entries = [
    ['LÍDER EM REBOTES','reb','REB',EMERALD],
    ['LÍDER EM ASSISTÊNCIAS','ast','AST',INDIGO],
    ['DESTAQUE DEFENSIVO','blk','TOC',GOLD]
  ];
  const sw = (CONTENT - 10) / 3;
  entries.forEach(([title,key,unit,color],i) => {
    const p = summary.roundLeaders?.[key];
    smallLeader(doc, LEFT + i * (sw + 5), 173, sw, title, p, p?.stats?.[key], unit, color);
  });
  explanation(doc, 'COMO LER: “rodada” representa a soma das partidas disputadas na mesma data. O índice de destaque é informativo (PTS + REB + AST + TOC) e não constitui um prêmio MVP oficial.', 221);
  write(doc, 'Indicadores elaborados a partir das súmulas registradas. Sem súmula, o card apresenta “Sem registro”.',
    LEFT, 265, 7.8, MUTED);

  // 3. Season dashboard: six recognizable sports cards.
  page(doc, 'LÍDERES DA TEMPORADA', 'Principais marcas acumuladas em ' + year, year);
  chapter(doc, 'Quem lidera o CBA?', 'Totais acumulados nas rodadas da temporada selecionada.', 43);
  const seasonCards = [
    ['CESTINHA DO ANO','pts','PTS',GOLD],
    ['REBOTES','reb','REB',EMERALD],
    ['ASSISTÊNCIAS','ast','AST',INDIGO],
    ['TOCOS','blk','TOC',EMERALD],
    ['BOLAS DE TRÊS','pts3','3PT',GOLD]
  ];
  seasonCards.forEach(([label,key,unit,color],i) => {
    const p = summary.seasonLeaders?.[key];
    const x = LEFT + (i % 2) * 95;
    const y = 61 + Math.floor(i / 2) * 59;
    seasonCard(doc,x,y,label,p,p?.totals?.[key],unit,color);
  });
  const attendanceLeader = summary.presenceTop?.[0];
  seasonCard(doc,LEFT+95,179,'ASSIDUIDADE',attendanceLeader,
    attendanceLeader?.presences,'PRESENÇAS',INDIGO,
    attendanceLeader?.attendanceRate == null ? '' : attendanceLeader.attendanceRate.toFixed(0) + '% nas datas válidas');
  const streak = summary.bestStreakLeader;
  surface(doc,LEFT,246,CONTENT,23,WHITE);
  kicker(doc,'MELHOR SEQUÊNCIA DE PRESENÇAS',LEFT+6,255,EMERALD);
  write(doc, clipped(doc, streak?.name || 'Sem registro', 88), LEFT+6,264, 9.5, NAVY, true);
  write(doc, streak ? numberText(streak.bestStreak) + ' seguidas' : '-', RIGHT-7,262,
    13,NAVY,true,'right');

  // 4. Top-five leaderboard, grouped into balanced two-column cards.
  page(doc,'RANKINGS DA TEMPORADA','Top 5 de cada categoria estatística',year);
  chapter(doc,'Classificação acumulada', 'Compare os atletas e seus totais na temporada.',43);
  const rankSet=[
    ['PONTOS','pts',GOLD],['REBOTES','reb',EMERALD],
    ['ASSISTÊNCIAS','ast',INDIGO],['TOCOS','blk',EMERALD],
    ['BOLAS DE TRÊS','pts3',GOLD]
  ];
  rankSet.forEach(([title,key,color],i)=>{
    const x=LEFT+(i%2)*95;
    const y=60+Math.floor(i/2)*72;
    rankCard(doc,x,y,89,title,summary.rankings?.[key] || [],key,color);
  });
  surface(doc,LEFT+95,204,89,66,[238,242,255],[224,231,255]);
  kicker(doc,'LEITURA DO RANKING',LEFT+100,213,INDIGO);
  const text=[
    'As barras comparam totais',
    'dentro de cada categoria.',
    'Rodadas são datas com súmula.',
    'A página não indica porcentual',
    'de acertos nos arremessos.'
  ];
  text.forEach((line,i)=>write(doc,line,LEFT+100,226+i*7,8,INK));

  // 5. Record cards, with honest historic/game split.
  page(doc,'RECORDES E MARCAS','Melhores resultados dentro da temporada',year);
  chapter(doc,'Por rodada', 'Uma rodada agrupa todas as partidas da mesma data.',43);
  chapter(doc,'Por partida', 'Disponível somente para jogos registrados individualmente.',55);
  const order=['pts','reb','ast','blk','pts3'];
  const byRound = new Map((summary.roundRecords || []).map(r => [r.key,r]));
  const byGame = new Map((summary.gameRecords || []).map(r => [r.key,r]));
  order.forEach((key,i)=>{
    const y=67+i*39;
    recordCard(doc,LEFT,y,89,metricName(key).toUpperCase(),byRound.get(key),false,i%2?EMERALD:GOLD);
    recordCard(doc,LEFT+95,y,89,metricName(key).toUpperCase(),byGame.get(key),true,i%2?INDIGO:EMERALD);
  });
  explanation(doc,'ATENÇÃO AO HISTÓRICO: súmulas anteriores à individualização das partidas representam a rodada (data). A coluna “Por partida” não transforma esses totais em jogos fictícios.',264);

  // 6. Attendance and scorer evolution, with compact charts explained in-place.
  page(doc,'EVOLUÇÃO DO CBA','Presenças e desempenho ao longo das rodadas',year);
  chapter(doc,'Presenças por rodada','Quantidade de atletas presentes nas últimas oito datas registradas.',43);
  surface(doc,LEFT,60,CONTENT,77,WHITE);
  miniChart(doc,LEFT+5,69,CONTENT-10,60,summary.presenceDates || [],r=>r.count,EMERALD);
  chapter(doc,'Evolução do cestinha da temporada',
    'Pontos por rodada, com a colocação acumulada anotada abaixo.',155);
  const seasonScorer = summary.seasonLeaders?.pts;
  surface(doc,LEFT,175,CONTENT,75,WHITE);
  if (seasonScorer) {
    const rows=seasonScorer.entries || [];
    miniChart(doc,LEFT+5,183,CONTENT-10,52,rows,r=>r.pts,GOLD);
    const rank=buildRankHistory(summary,seasonScorer.name,'pts');
    const recent=rank.slice(-8);
    write(doc,clipped(doc,seasonScorer.name,105),LEFT+6,245,9,NAVY,true);
    write(doc,'Colocações acumuladas: '+recent.map(r=>r.position ? r.position+'º' : '-').join('  /  '),
      RIGHT-6,245,7,MUTED,false,'right');
  } else {
    write(doc,'Sem pontuação registrada nesta temporada.',LEFT+6,203,9,MUTED);
  }
  const note='METODOLOGIA: totais por rodada são derivados das estatísticas persistidas no CBA. Recordes por partida só incluem partidas identificadas. Sem tentativas de arremesso, não há taxa de aproveitamento. Última rodada registrada: '+latest+'.';
  explanation(doc,note,259);

  footer(doc,stamp);
  return doc;
}
