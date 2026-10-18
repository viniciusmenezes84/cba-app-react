import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { buildRankHistory, efficiencyIndex, roundDateLabel, STAT_KEYS, STAT_LABELS } from './homeHighlightsData';

const NAVY = [15, 23, 42];
const SLATE = [100, 116, 139];
const EMERALD = [16, 135, 106];
const INDIGO = [67, 56, 202];
const LIGHT = [248, 250, 252];
const AMBER = [217, 119, 6];
const pad = 13;
const display = value => value == null ? '—' : Number(value).toLocaleString('pt-BR');
const rowName = player => player?.name || 'Sem registro';
const fmtDate = date => date ? roundDateLabel(date) : '—';

function pageHeader(doc, title, subtitle, year) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text(title, pad, 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(subtitle + '  |  Temporada ' + year, pad, 23);
  doc.setTextColor(...NAVY);
  return 40;
}
function section(doc, title, y) {
  if (y > 267) { doc.addPage(); y = 18; }
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(pad, y - 5, width - pad * 2, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INDIGO);
  doc.text(title, pad + 4, y + 1.5);
  doc.setTextColor(...NAVY);
  return y + 12;
}
function table(doc, columns, rows, y, options = {}) {
  autoTable(doc, {
    startY: y, margin: {left:pad,right:pad,top:16,bottom:20},
    head: [columns],
    body: rows.length ? rows : [columns.map((_, i) => i ? '' : 'Sem dados nesta temporada.')],
    theme: 'striped', showHead: 'everyPage',
    headStyles: {fillColor:NAVY,textColor:[255,255,255],fontSize:8,cellPadding:2.5},
    bodyStyles: {textColor:NAVY,fontSize:8,cellPadding:2.5,overflow:'linebreak'},
    alternateRowStyles: {fillColor:LIGHT},
    styles: {valign:'middle'},
    ...options
  });
  return doc.lastAutoTable.finalY + 8;
}
function cards(doc, entries, y) {
  const width = doc.internal.pageSize.getWidth();
  const gap = 3;
  const cw = (width - pad * 2 - gap * (entries.length - 1)) / entries.length;
  entries.forEach(([label,value],i) => {
    const x = pad + i * (cw + gap);
    doc.setFillColor(...LIGHT);doc.setDrawColor(226,232,240);
    doc.roundedRect(x,y,cw,22,2,2,'FD');
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...SLATE);
    doc.text(label,x + 3,y + 7);
    doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(...NAVY);
    doc.text(String(value),x + 3,y + 17);
  });
  return y + 29;
}
function note(doc, text, y) {
  if (y > 265) { doc.addPage(); y = 18; }
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...SLATE);
  const lines=doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - pad * 2);
  doc.text(lines,pad,y);
  doc.setTextColor(...NAVY);
  return y + lines.length * 4.5 + 5;
}
function footers(doc, createdAt) {
  const total=doc.getNumberOfPages();
  for(let page=1;page<=total;page+=1){
    doc.setPage(page);
    const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();
    if(page !== 1) doc.setDrawColor(226,232,240);
    if(page !== 1) doc.line(pad,h - 13,w - pad,h - 13);
    doc.setFont('helvetica','normal');doc.setFontSize(8);
    doc.setTextColor(...(page===1 ? [203,213,225] : SLATE));
    doc.text('Portal CBA  |  Relatório executivo esportivo  |  ' + createdAt, pad, h - 8);
    doc.text(String(page) + '/' + String(total), w - pad, h - 8,{align:'right'});
  }
}
function label(key) {
  return STAT_LABELS[key] || key;
}
export function buildSportsExecutivePdf(summary, generatedAt = new Date()) {
  if (!summary || !summary.year) throw new Error('Temporada não informada.');
  const doc=new jsPDF({unit:'mm',format:'a4',compress:true});
  const year=String(summary.year);
  const createdAt=generatedAt.toLocaleDateString('pt-BR',{timeZone:'America/Bahia'});
  const latest=fmtDate(summary.latestDate);
  const scored=summary.athletes.filter(a => a.roundCount>0);

  // Cover: same A4 portrait, institutional dark cover pattern as the CBA annual report.
  doc.setFillColor(...NAVY);doc.rect(0,0,210,297,'F');
  doc.setFillColor(...EMERALD);doc.rect(18,49,37,2,'F');
  doc.setTextColor(167,243,208);doc.setFont('helvetica','bold');doc.setFontSize(11);
  doc.text('BASQUETE DOS APOSENTADOS  /  PORTAL CBA',18,68);
  doc.setTextColor(255,255,255);doc.setFontSize(29);
  doc.text('RELATÓRIO',18,96);
  doc.text('EXECUTIVO',18,108);
  doc.text('ESPORTIVO',18,120);
  doc.setTextColor(167,243,208);doc.setFontSize(19);
  doc.text('Temporada ' + year,18,143);
  doc.setDrawColor(...AMBER);doc.setLineWidth(1.4);doc.line(18,151,69,151);
  doc.setFont('helvetica','normal');doc.setFontSize(11);doc.setTextColor(203,213,225);
  doc.text('Destaques, líderes, evolução e recordes da temporada',18,165);
  doc.setFontSize(11);
  doc.text('Última rodada com súmula: ' + latest,18,188);
  doc.text(String(summary.rounds.length) + ' rodadas com súmula  |  ' + String(scored.length) + ' atletas com estatísticas',18,200);
  doc.text('Relatório gerado em ' + createdAt,18,212);

  doc.addPage();
  let y=pageHeader(doc,'RESUMO ESPORTIVO','Destaques da última rodada registrada',year);
  y=section(doc,'1. VISÃO GERAL',y);
  y=cards(doc,[
    ['Rodadas', summary.rounds.length],
    ['Atletas c/ súmula', scored.length],
    ['Presenças', summary.presenceDates.reduce((sum,r)=>sum+r.count,0)],
    ['Partidas detalhadas', (summary.gameRecords.some(r=>r.value!==null) ? (summary.latestGames || []).length : 0)]
  ],y);
  y=note(doc,'Os indicadores de rodada são consolidados por data. Partidas individuais só são consideradas quando registradas no Mesário.',y);
  y=section(doc,'2. DESTAQUES DA RODADA  •  ' + latest,y);
  const metricNames=[['pts','Cestinha'],['reb','Rebotes'],['ast','Assistências'],['blk','Destaque defensivo']];
  const dayRows=metricNames.map(([key,title])=>{
    const p=summary.roundLeaders[key];
    return [title,rowName(p),p ? display(p.stats[key]) : '—'];
  });
  const standout=summary.standout;
  dayRows.push(['Índice de destaque',rowName(standout),standout ? display(efficiencyIndex(standout.stats)) : '—']);
  y=table(doc,['Categoria','Atleta','Marca'],dayRows,y,{columnStyles:{1:{cellWidth:96}}});
  y=note(doc,'Índice informativo de destaque = pontos + rebotes + assistências + tocos. Não representa MVP oficial nem eficiência técnica completa.',y);
  y=section(doc,'3. LÍDERES DA TEMPORADA',y);
  const seasonRows=STAT_KEYS.map(key => {
    const p=summary.seasonLeaders[key];
    return [label(key),rowName(p),p ? display(p.totals[key]) : '—'];
  });
  const attendance=summary.presenceTop[0];
  seasonRows.push(['Presenças',rowName(attendance),attendance ? String(attendance.presences) : '—']);
  if(summary.bestStreakLeader)seasonRows.push([
    'Melhor sequência',rowName(summary.bestStreakLeader),String(summary.bestStreakLeader.bestStreak) + ' seguidas'
  ]);
  y=table(doc,['Indicador','Atleta','Temporada'],seasonRows,y,{columnStyles:{1:{cellWidth:93}}});

  doc.addPage();
  y=pageHeader(doc,'RANKINGS DA TEMPORADA','Classificações acumuladas de todos os atletas',year);
  y=section(doc,'4. TOP 5 POR INDICADOR',y);
  for(const key of STAT_KEYS){
    const list=(summary.rankings[key] || []).slice(0,5);
    y=section(doc,label(key).toUpperCase(),y);
    y=table(doc,['#','Atleta','Total'],list.map((athlete,i)=>[
      i+1,athlete.name,display(athlete.totals[key])
    ]),y,{columnStyles:{0:{cellWidth:20},2:{cellWidth:30}}});
  }

  doc.addPage();
  y=pageHeader(doc,'EVOLUÇÃO E RECORDES','Marcas históricas dentro da temporada',year);
  y=section(doc,'5. RECORDES POR RODADA',y);
  const recordRows=summary.roundRecords.map(r=>[
    label(r.key),r.name || 'Sem registro',display(r.value),fmtDate(r.date)
  ]);
  y=table(doc,['Estatística','Atleta','Marca','Data'],recordRows,y);
  y=section(doc,'6. RECORDES POR PARTIDA INDIVIDUAL',y);
  const gameRecords=summary.gameRecords.filter(r=>r.value!==null);
  y=table(doc,['Estatística','Atleta','Marca','Jogo'],gameRecords.map(r=>[
    label(r.key),r.name || '—',display(r.value),
    fmtDate(r.date) + ' / Jogo ' + String(r.gameNumber || '—')
  ]),y);
  if(!gameRecords.length) y=note(doc,'Ainda não há recordes de partidas individualizadas nesta temporada.',y);
  y=section(doc,'7. ÚLTIMAS RODADAS  •  PRESENÇAS',y);
  y=table(doc,['Data','Presentes'],summary.presenceDates.slice(-8).map(r=>[
    fmtDate(r.date),display(r.count)
  ]),y);
  const scorer=summary.seasonLeaders.pts;
  if(scorer){
    y=section(doc,'8. EVOLUÇÃO DO CESTINHA DA TEMPORADA',y);
    const history=buildRankHistory(summary,scorer.name,'pts');
    const histByDate=new Map(history.map(entry=>[entry.date,entry.position]));
    y=table(doc,['Rodada','Pontos','Ranking acumulado'],scorer.entries.slice(-8).map(entry=>[
      fmtDate(entry.date),display(entry.pts),
      histByDate.get(entry.date) ? String(histByDate.get(entry.date)) + 'º' : '—'
    ]),y);
  }
  y=note(doc,'Fonte: estatísticas persistidas no CBA. Rodadas antigas são totais por data. Sem tentativas de arremesso, não há cálculo de aproveitamento de quadra. As métricas seguem os cards da aba Início.',y);
  footers(doc,createdAt);
  return doc;
}
