import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { BookOpen, CalendarDays, RefreshCw } from 'lucide-react';
import { medicalPost } from './cbaApi';

const EMPTY_LIST = [];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const NAVY = [15, 23, 42];
const INDIGO = [67, 56, 202];
const num = value => Number(value || 0);
const points = stats => num(stats?.pts2) * 2 + num(stats?.pts3) * 3;
const fmtDate = value => value ? String(value).slice(0, 10).split('-').reverse().join('/') : '—';
const filenamePart = value => String(value || '').replace(/[^a-zA-Z0-9_-]+/g, '_');
const validStatus = status => Boolean(status) && status !== 'N/A';
const isFault = status => ['NÃO JUSTIFICOU', 'NAO JUSTIFICOU'].includes(String(status || '').trim().toUpperCase());

export function deriveReport(players, dates, year) {
  const playedDates = [...new Set(dates || [])]
    .filter(date => date.startsWith(year) && players.some(player => player.attendance?.[date]?.includes('✅'))).sort();
  const reportData = players.map(player => {
    let validGames = 0; let presences = 0; let faults = 0;
    playedDates.forEach(date => {
      const status = player.attendance?.[date]?.trim() || '';
      if (!validStatus(status)) return;
      validGames += 1;
      if (status.includes('✅')) presences += 1;
      if (isFault(status)) faults += 1;
    });
    const statEntries = Object.entries(player.dailyStats || {})
      .filter(([date]) => date.startsWith(year)).sort(([a], [b]) => a.localeCompare(b));
    const totals = statEntries.reduce((sum, [, stats]) => ({
      pts: sum.pts + points(stats), reb: sum.reb + num(stats?.reb),
      ast: sum.ast + num(stats?.ast), blk: sum.blk + num(stats?.blk)
    }), { pts: 0, reb: 0, ast: 0, blk: 0 });
    const gamesWithStats = statEntries.length;
    return { ...player, validGames, presences, faults, statEntries, gamesWithStats,
      percentage: validGames ? presences / validGames * 100 : 0,
      yearlyPoints: totals.pts, yearlyReb: totals.reb, yearlyAst: totals.ast, yearlyBlk: totals.blk,
      ppjYear: gamesWithStats ? totals.pts / gamesWithStats : 0,
      rpjYear: gamesWithStats ? totals.reb / gamesWithStats : 0,
      apjYear: gamesWithStats ? totals.ast / gamesWithStats : 0,
      tpjYear: gamesWithStats ? totals.blk / gamesWithStats : 0 };
  });
  const validPlayerGames = reportData.reduce((sum, player) => sum + player.validGames, 0);
  const totalPresences = reportData.reduce((sum, player) => sum + player.presences, 0);
  const statDates = new Set(reportData.flatMap(player => player.statEntries.map(([date]) => date)));
  const statGameDates = [...statDates].filter(date => playedDates.includes(date));
  return { playedDates, reportData, activePlayers: reportData.filter(player => player.validGames > 0).length,
    averageAttendance: validPlayerGames ? totalPresences / validPlayerGames * 100 : 0,
    statGameDates, coveragePct: playedDates.length ? statGameDates.length / playedDates.length * 100 : 0 };
}

function header(doc, title, subtitle, year) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, 29, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text(title, 13, 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`${subtitle}  |  Temporada ${year}`, 13, 22);
  doc.setTextColor(...NAVY);
  return 37;
}

function section(doc, title, y) {
  if (y > doc.internal.pageSize.getHeight() - 28) {
    doc.addPage();
    y = 17;
  }
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(13, y - 5, doc.internal.pageSize.getWidth() - 26, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INDIGO);
  doc.text(title, 17, y + 1.5);
  doc.setTextColor(...NAVY);
  return y + 12;
}

function summary(doc, items, y) {
  const width = doc.internal.pageSize.getWidth();
  const gap = 3;
  const card = (width - 26 - (items.length - 1) * gap) / items.length;
  items.forEach(([label, value], index) => {
    const x = 13 + index * (card + gap);
    doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, card, 21, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
    doc.text(label, x + 3, y + 7);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...NAVY);
    doc.text(String(value), x + 3, y + 16);
  });
  return y + 27;
}

function table(doc, columns, rows, y, options = {}) {
  autoTable(doc, {
    startY: y, margin: { left: 13, right: 13, top: 17, bottom: 17 },
    head: [columns], body: rows.length ? rows : [columns.map((_, index) => index ? '' : 'Sem registros.')],
    theme: 'striped', showHead: 'everyPage',
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: options.fontSize || 8, cellPadding: 2 },
    bodyStyles: { textColor: NAVY, fontSize: options.fontSize || 8, cellPadding: 2, overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { valign: 'middle' },
    ...options
  });
  return doc.lastAutoTable.finalY + 8;
}

function footer(doc, label) {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240); doc.line(13, height - 13, width - 13, height - 13);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text(`${label}  •  ${new Date().toLocaleDateString('pt-BR')}`, 13, height - 8);
    doc.text(`${page}/${total}`, width - 13, height - 8, { align: 'right' });
  }
}

function medicalRows(medical) {
  return (medical?.records || [])
    .filter(record => !record?.dischargedAt && String(record?.status || '').toLowerCase() !== 'alta')
    .sort((a, b) => String(a?.expectedReturn || '9999-12-31').localeCompare(String(b?.expectedReturn || '9999-12-31'))
      || String(a?.playerName || '').localeCompare(String(b?.playerName || '')))
    .map(record => [record.playerName || 'Atleta', record.status || 'Em acompanhamento', fmtDate(record.expectedReturn)]);
}

export function buildAnnualGeneral(year, derived, medical) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const { reportData, playedDates, activePlayers, averageAttendance, statGameDates, coveragePct } = derived;
  const attendance = [...reportData].filter(player => player.validGames > 0)
    .sort((a, b) => b.percentage - a.percentage || b.presences - a.presences);
  doc.setFillColor(...NAVY); doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(165, 180, 252); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('BASQUETE DOS APOSENTADOS  /  PORTAL CBA', 18, 75);
  doc.setTextColor(255, 255, 255); doc.setFontSize(31); doc.text('RELATÓRIO', 18, 96); doc.text('EXECUTIVO ANUAL', 18, 109);
  doc.setTextColor(165, 180, 252); doc.setFontSize(19); doc.text(`Temporada ${year}`, 18, 128);
  doc.setDrawColor(99, 102, 241); doc.setLineWidth(1.5); doc.line(18, 139, 68, 139);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(203, 213, 225);
  doc.text('Assiduidade, desempenho e cobertura das súmulas', 18, 151);
  doc.text(`${playedDates.length} jogos  •  ${activePlayers} participantes  •  ${coveragePct.toFixed(0)}% de cobertura`, 18, 172);
  doc.addPage();
  let y = header(doc, 'RELATÓRIO EXECUTIVO ANUAL', 'Visão consolidada do elenco', year);
  y = section(doc, '1. RESUMO EXECUTIVO', y);
  y = summary(doc, [['Jogos', playedDates.length], ['Participantes', activePlayers], ['Assiduidade', `${averageAttendance.toFixed(0)}%`], ['Súmulas', `${statGameDates.length}/${playedDates.length}`]], y);
  y = section(doc, '2. DESTAQUES DE ASSIDUIDADE', y);
  y = table(doc, ['#', 'Atleta', 'Presenças', 'Assiduidade'], attendance.slice(0, 10)
    .map((player, index) => [index + 1, player.name, `${player.presences}/${player.validGames}`, `${player.percentage.toFixed(0)}%`]), y);
  y = section(doc, '3. DEPARTAMENTO MÉDICO', y);
  if (medical?.error) {
    doc.setFontSize(9); doc.setTextColor(185, 28, 28);
    doc.text('Dados médicos indisponíveis nesta geração.', 17, y); y += 9;
  } else {
    const rows = medicalRows(medical);
    y = table(doc, ['Atleta', 'Situação', 'Retorno previsto'], rows, y);
    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    if (y > 274) { doc.addPage(); y = 17; }
    doc.text(rows.length ? 'Situação operacional na data de geração.' : 'Nenhum atleta em acompanhamento no momento.', 17, y);
  }
  doc.addPage();
  y = header(doc, 'DESEMPENHO GERAL DO ELENCO', 'Dados da temporada', year);
  y = table(doc, ['Atleta', 'Pres.', 'Assid.', 'Súm.', 'PTS/J', 'REB/J', 'AST/J', 'TOC/J'], attendance.map(player => [
    player.name, `${player.presences}/${player.validGames}`, `${player.percentage.toFixed(0)}%`, player.gamesWithStats,
    player.ppjYear.toFixed(1), player.rpjYear.toFixed(1), player.apjYear.toFixed(1), player.tpjYear.toFixed(1)
  ]), y, { fontSize: 7, columnStyles: { 0: { cellWidth: 48 } } });
  if (y > 268) { doc.addPage(); y = 17; }
  doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  doc.text('Assiduidade: presenças / jogos válidos. Médias técnicas: somente jogos com súmula.', 13, y);
  footer(doc, 'Portal CBA  |  Relatório anual');
  return doc;
}

function highs(entries) {
  const best = { pts: 0, reb: 0, ast: 0, blk: 0 };
  entries.forEach(([, stats]) => {
    best.pts = Math.max(best.pts, points(stats));
    best.reb = Math.max(best.reb, num(stats?.reb));
    best.ast = Math.max(best.ast, num(stats?.ast));
    best.blk = Math.max(best.blk, num(stats?.blk));
  });
  return best;
}

export function buildAnnualPlayer(year, player) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  let y = header(doc, 'RELATÓRIO INDIVIDUAL', player.name, year);
  y = section(doc, '1. PERFIL DA TEMPORADA', y);
  y = summary(doc, [['Presenças', `${player.presences}/${player.validGames}`], ['Assiduidade', `${player.percentage.toFixed(0)}%`], ['Súmulas', player.gamesWithStats], ['Faltas NJ', player.faults]], y);
  y = section(doc, '2. MÉDIAS TÉCNICAS', y);
  y = summary(doc, [['PTS/J', player.ppjYear.toFixed(1)], ['REB/J', player.rpjYear.toFixed(1)], ['AST/J', player.apjYear.toFixed(1)], ['TOC/J', player.tpjYear.toFixed(1)]], y);
  y = section(doc, '3. RECORDES', y);
  const season = highs(player.statEntries);
  const career = highs(Object.entries(player.dailyStats || {}));
  y = table(doc, ['Período', 'PTS', 'REB', 'AST', 'TOC'], [
    ['Temporada', season.pts, season.reb, season.ast, season.blk],
    ['Carreira', career.pts, career.reb, career.ast, career.blk]
  ], y);
  y = section(doc, '4. ÚLTIMAS 5 SÚMULAS', y);
  y = table(doc, ['Data', 'PTS', 'REB', 'AST', 'TOC'], player.statEntries.slice(-5).reverse().map(([date, stats]) =>
    [fmtDate(date), points(stats), num(stats?.reb), num(stats?.ast), num(stats?.blk)]), y);
  y = section(doc, '5. DETALHAMENTO DAS SÚMULAS', y);
  table(doc, ['Data', 'PTS', 'REB', 'AST', 'TOC'], player.statEntries.map(([date, stats]) =>
    [fmtDate(date), points(stats), num(stats?.reb), num(stats?.ast), num(stats?.blk)]), y);
  footer(doc, 'Portal CBA  |  Relatório individual');
  return doc;
}

export function buildMonthly(year, derived) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const { reportData, playedDates, activePlayers, averageAttendance } = derived;
  let y = header(doc, 'RESUMO MENSAL DE ASSIDUIDADE', 'Elenco CBA', year);
  y = summary(doc, [['Jogos no ano', playedDates.length], ['Participantes', activePlayers], ['Assiduidade média', `${averageAttendance.toFixed(0)}%`]], y);
  y = section(doc, 'PRESENÇAS POR MÊS', y);
  const sorted = [...reportData].filter(player => player.validGames > 0)
    .sort((a, b) => b.percentage - a.percentage || b.presences - a.presences);
  const monthDates = MONTHS.map((_, index) => playedDates.filter(date => Number(date.slice(5, 7)) - 1 === index));
  const rows = sorted.map(player => [player.name, ...monthDates.map(dates => {
    if (!dates.length) return '—';
    const valid = dates.filter(date => validStatus(player.attendance?.[date]?.trim()));
    if (!valid.length) return 'N/A';
    const present = valid.filter(date => player.attendance?.[date]?.includes('✅')).length;
    return `${present}/${valid.length}`;
  }), player.presences, player.faults, `${player.percentage.toFixed(0)}%`]);
  table(doc, ['Atleta', ...MONTHS, 'Pres.', 'NJ', '%'], rows, y, {
    fontSize: 7, columnStyles: { 0: { cellWidth: 43 } },
    styles: { halign: 'center', valign: 'middle' },
    didParseCell: data => { if (data.column.index === 0) data.cell.styles.halign = 'left'; }
  });
  footer(doc, 'Portal CBA  |  Resumo mensal');
  return doc;
}

export default function ReportsPdf({ data, year, selectedPlayer }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(null);
  const appData = data?.data || data || {};
  const players = appData?.dashboard?.players || EMPTY_LIST;
  const dates = appData?.dashboard?.dates || EMPTY_LIST;
  const derived = useMemo(() => deriveReport(players, dates, year), [players, dates, year]);
  const selected = derived.reportData.find(player => player.name === selectedPlayer);

  useEffect(() => () => {
    if (ready?.url) URL.revokeObjectURL(ready.url);
  }, [ready?.url]);

  const generate = async type => {
    if (!data || busy) return;
    setError(''); setReady(null); setBusy(type);
    try {
      let doc;
      let filename;
      if (type === 'monthly') {
        doc = buildMonthly(year, derived);
        filename = `Resumo_Mensal_Assiduidade_${year}.pdf`;
      } else if (selectedPlayer !== 'todos') {
        if (!selected) throw new Error('Atleta não encontrado.');
        doc = buildAnnualPlayer(year, selected);
        filename = `Relatorio_CBA_${year}_${filenamePart(selectedPlayer)}.pdf`;
      } else {
        let medical;
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 12000);
          try { medical = await medicalPost('bootstrap', {}, { signal: controller.signal }); }
          finally { clearTimeout(timer); }
        } catch (cause) {
          console.error('Erro ao consultar Departamento Médico:', cause);
          medical = { error: true, records: [] };
        }
        doc = buildAnnualGeneral(year, derived, medical);
        filename = `Relatorio_CBA_${year}_Geral.pdf`;
      }
      const url = URL.createObjectURL(doc.output('blob'));
      setReady({ url, filename });
    } catch (cause) {
      console.error('Erro ao gerar PDF:', cause);
      setError('Não foi possível preparar o PDF. Tente novamente.');
    } finally {
      setBusy('');
    }
  };

  return <>
    <button type="button" onClick={() => generate('monthly')} disabled={Boolean(busy)} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50" title="Resumo Mensal de Assiduidade">{busy === 'monthly' ? <RefreshCw className="animate-spin h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}<span>{busy === 'monthly' ? 'Gerando...' : 'Resumo Mensal'}</span></button>
    <button type="button" onClick={() => generate('annual')} disabled={Boolean(busy) || (selectedPlayer !== 'todos' && !selected)} className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50" title="Relatório Anual">{busy === 'annual' ? <RefreshCw className="animate-spin h-5 w-5" /> : <BookOpen className="h-5 w-5" />}<span>{busy === 'annual' ? 'Gerando...' : 'Relatório Anual'}</span></button>
    {ready && <a href={ready.url} download={ready.filename} target="_blank" rel="noopener noreferrer" className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-black text-white shadow-md">PDF pronto: abrir ou baixar {ready.filename}</a>}
    {error && <p role="alert" className="w-full text-sm font-bold text-rose-500">{error}</p>}
  </>;
}
