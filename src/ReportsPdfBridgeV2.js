import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, CalendarDays, RefreshCw } from 'lucide-react';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwNXGI4Cc5qGBye-IfWW_qqUcJ04NfArulExPXE4jgX0SZhWAmeWCjjKg2U9FFfHkHE/exec';
const LOGO_URL = 'https://lh3.googleusercontent.com/d/131DvcfgiRLLp9irVnVY8m9qNuM-0y7f8';
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

let html2pdfPromise = null;
const loadHtml2Pdf = () => {
  if (window.html2pdf) return Promise.resolve();
  if (html2pdfPromise) return html2pdfPromise;
  html2pdfPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';
    script.onload = resolve;
    script.onerror = error => {
      html2pdfPromise = null;
      reject(error);
    };
    document.head.appendChild(script);
  });
  return html2pdfPromise;
};

const num = value => Number(value || 0);
const calcPts = stats => (num(stats?.pts2) * 2) + (num(stats?.pts3) * 3);
const fmtDate = date => date ? date.split('-').reverse().join('/') : '--';
const validStatus = status => Boolean(status) && status !== 'N/A';
const isFault = status => ['NÃO JUSTIFICOU', 'NAO JUSTIFICOU'].includes(String(status || '').trim().toUpperCase());
const safeFilename = value => String(value || '').replace(/[^a-zA-Z0-9_-]+/g, '_');
const paginate = (items, size) => {
  if (!items.length) return [[]];
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
};

function getHighs(entries) {
  const result = {
    pts: { val: 0, date: '' }, reb: { val: 0, date: '' },
    ast: { val: 0, date: '' }, blk: { val: 0, date: '' }
  };
  entries.forEach(([date, stats]) => {
    const values = { pts: calcPts(stats), reb: num(stats?.reb), ast: num(stats?.ast), blk: num(stats?.blk) };
    Object.entries(values).forEach(([key, value]) => {
      if (value > result[key].val) result[key] = { val: value, date };
    });
  });
  return result;
}

function deriveReport(players, dates, year) {
  const playedDates = [...new Set(dates || [])]
    .filter(date => date.startsWith(year))
    .filter(date => players.some(player => player.attendance?.[date]?.includes('✅')))
    .sort();

  const reportData = players.map(player => {
    let validGames = 0;
    let presences = 0;
    let faults = 0;

    playedDates.forEach(date => {
      const status = player.attendance?.[date]?.trim() || '';
      if (!validStatus(status)) return;
      validGames += 1;
      if (status.includes('✅')) presences += 1;
      if (isFault(status)) faults += 1;
    });

    const statEntries = Object.entries(player.dailyStats || {})
      .filter(([date]) => date.startsWith(year))
      .sort(([a], [b]) => a.localeCompare(b));

    const totals = statEntries.reduce((acc, [, stats]) => ({
      pts: acc.pts + calcPts(stats),
      reb: acc.reb + num(stats?.reb),
      ast: acc.ast + num(stats?.ast),
      blk: acc.blk + num(stats?.blk)
    }), { pts: 0, reb: 0, ast: 0, blk: 0 });

    const gamesWithStats = statEntries.length;
    return {
      ...player,
      validGames,
      presences,
      faults,
      percentage: validGames ? (presences / validGames) * 100 : 0,
      statEntries,
      gamesWithStats,
      yearlyPoints: totals.pts,
      yearlyReb: totals.reb,
      yearlyAst: totals.ast,
      yearlyBlk: totals.blk,
      ppjYear: gamesWithStats ? totals.pts / gamesWithStats : 0,
      rpjYear: gamesWithStats ? totals.reb / gamesWithStats : 0,
      apjYear: gamesWithStats ? totals.ast / gamesWithStats : 0,
      tpjYear: gamesWithStats ? totals.blk / gamesWithStats : 0
    };
  });

  const validPlayerGames = reportData.reduce((sum, player) => sum + player.validGames, 0);
  const totalPresences = reportData.reduce((sum, player) => sum + player.presences, 0);
  const averageAttendance = validPlayerGames ? (totalPresences / validPlayerGames) * 100 : 0;
  const activePlayers = reportData.filter(player => player.validGames > 0).length;
  const statDates = new Set();
  reportData.forEach(player => player.statEntries.forEach(([date]) => statDates.add(date)));
  const statGameDates = [...statDates].filter(date => playedDates.includes(date));
  const coveragePct = playedDates.length ? (statGameDates.length / playedDates.length) * 100 : 0;

  return { playedDates, reportData, averageAttendance, activePlayers, statGameDates, coveragePct };
}

const PdfHeader = ({ title, subtitle, year }) => (
  <div className="flex items-end justify-between border-b-4 border-indigo-900 pb-4 mb-6">
    <div className="flex items-center gap-4">
      <img src={LOGO_URL} alt="Logo CBA" className="w-14 h-14 rounded-full border border-slate-200" crossOrigin="anonymous" />
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-700">Portal CBA</p>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
        <p className="text-xs font-bold text-slate-500 mt-1">{subtitle} • Temporada {year}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-[10px] uppercase font-black text-slate-400">Gerado em</p>
      <p className="text-sm font-black text-slate-700">{new Date().toLocaleDateString('pt-BR')}</p>
    </div>
  </div>
);

const Section = ({ number, children }) => (
  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 bg-slate-100 border-l-4 border-indigo-600 px-3 py-2 mb-4">
    {number ? `${number}. ` : ''}{children}
  </h3>
);

const Metric = ({ label, value, detail, accent = 'text-slate-900' }) => (
  <div className="border border-slate-200 rounded-xl p-3 bg-white text-center">
    <p className="text-[9px] uppercase font-black tracking-wider text-slate-500">{label}</p>
    <p className={`text-2xl font-black mt-1 ${accent}`}>{value}</p>
    {detail && <p className="text-[9px] text-slate-400 mt-1">{detail}</p>}
  </div>
);

async function savePdf(element, filename, orientation, footerLabel) {
  await loadHtml2Pdf();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const options = {
    margin: orientation === 'landscape' ? [0.28, 0.25, 0.38, 0.25] : [0.32, 0.36, 0.42, 0.36],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'in', format: 'a4', orientation },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  const worker = window.html2pdf().set(options).from(element).toPdf();
  await worker.get('pdf').then(pdf => {
    const totalPages = pdf.internal.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);
      pdf.setFontSize(8);
      pdf.setTextColor(130);
      const text = `${footerLabel} | Página ${page} de ${totalPages}`;
      pdf.text(text, (pdf.internal.pageSize.getWidth() - pdf.getTextWidth(text)) / 2, pdf.internal.pageSize.getHeight() - 0.18);
    }
  });
  await worker.save();
}

function AnnualGeneral({ year, derived }) {
  const { reportData, playedDates, activePlayers, averageAttendance, statGameDates, coveragePct } = derived;
  const attendance = [...reportData].filter(player => player.validGames > 0).sort((a, b) => b.percentage - a.percentage || b.presences - a.presences);
  const statPlayers = reportData.filter(player => player.gamesWithStats > 0);
  const leaders = {
    pts: [...statPlayers].sort((a, b) => b.yearlyPoints - a.yearlyPoints).slice(0, 3),
    reb: [...statPlayers].sort((a, b) => b.yearlyReb - a.yearlyReb).slice(0, 3),
    ast: [...statPlayers].sort((a, b) => b.yearlyAst - a.yearlyAst).slice(0, 3),
    blk: [...statPlayers].sort((a, b) => b.yearlyBlk - a.yearlyBlk).slice(0, 3)
  };
  const performancePages = paginate(attendance, 18);

  const LeaderBox = ({ title, items, totalKey, avgKey, tone }) => (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className={`px-3 py-2 text-[10px] uppercase font-black ${tone}`}>{title}</div>
      <table className="w-full text-[9px]"><tbody>
        {items.length ? items.map((player, index) => (
          <tr key={player.name} className="border-t border-slate-100">
            <td className="px-2 py-2 w-6 font-black text-slate-400">{index + 1}º</td>
            <td className="px-1 py-2 font-bold text-slate-800 truncate">{player.name}</td>
            <td className="px-1 py-2 text-right font-black">{player[totalKey]}</td>
            <td className="px-2 py-2 text-right text-slate-500">{player[avgKey].toFixed(1)}/j</td>
            <td className="px-2 py-2 text-right text-slate-400">{player.gamesWithStats}s</td>
          </tr>
        )) : <tr><td className="p-3 text-slate-400">Sem súmulas na temporada.</td></tr>}
      </tbody></table>
    </div>
  );

  return (
    <div id="pdf-v2-annual" style={{ width: 760, backgroundColor: '#fff', color: '#1e293b' }} className="font-sans">
      <div style={{ minHeight: 1040, pageBreakAfter: 'always' }} className="border-[10px] border-indigo-950 p-14 flex flex-col items-center justify-center text-center bg-slate-50">
        <img src={LOGO_URL} alt="Logo CBA" className="w-36 h-36 rounded-full border-4 border-white shadow mb-8" crossOrigin="anonymous" />
        <p className="text-sm font-black uppercase tracking-[0.35em] text-indigo-700">Basquete dos Aposentados</p>
        <h1 className="text-5xl font-black text-slate-950 uppercase tracking-tight mt-4">Relatório Executivo Anual</h1>
        <p className="text-3xl font-black text-indigo-700 mt-6">Temporada {year}</p>
        <div className="w-24 h-1.5 bg-indigo-600 my-8" />
        <p className="text-base text-slate-500 max-w-lg">Assiduidade, produção em quadra e qualidade da base estatística em um único documento oficial do CBA.</p>
        <div className="mt-12 grid grid-cols-3 gap-3 w-full max-w-lg">
          <Metric label="Jogos" value={playedDates.length} />
          <Metric label="Participantes" value={activePlayers} />
          <Metric label="Cobertura súmulas" value={`${coveragePct.toFixed(0)}%`} />
        </div>
        <p className="mt-auto text-[10px] uppercase font-bold tracking-widest text-slate-400">Documento oficial • Portal CBA • {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div className="p-7">
        <PdfHeader title="Relatório Executivo Anual" subtitle="Visão consolidada do elenco" year={year} />
        <Section number="1">Resumo Executivo</Section>
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Metric label="Jogos computados" value={playedDates.length} />
          <Metric label="Atletas participantes" value={activePlayers} detail={`${reportData.length} cadastrados`} />
          <Metric label="Assiduidade média" value={`${averageAttendance.toFixed(0)}%`} accent="text-indigo-700" />
          <Metric label="Cobertura de súmulas" value={`${coveragePct.toFixed(0)}%`} detail={`${statGameDates.length}/${playedDates.length || 0} jogos`} accent="text-violet-700" />
        </div>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 mb-7">
          <p className="text-[10px] font-black uppercase text-indigo-800">Qualidade dos dados</p>
          <p className="text-[10px] text-indigo-700 mt-1">As médias técnicas usam somente jogos com súmula. O número de súmulas acompanha cada média para evidenciar o tamanho da amostra.</p>
        </div>

        <Section number="2">Destaques de Assiduidade</Section>
        <div className="space-y-2 mb-7">
          {attendance.slice(0, 10).map((player, index) => (
            <div key={player.name} className="flex items-center gap-3 text-[10px]">
              <span className="w-7 text-right font-black text-slate-400">{index + 1}º</span>
              <span className="w-40 truncate font-black text-slate-800">{player.name}</span>
              <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-600" style={{ width: `${player.percentage}%` }} /></div>
              <span className="w-12 text-right font-black text-indigo-700">{player.percentage.toFixed(0)}%</span>
              <span className="w-16 text-right text-slate-500">{player.presences}/{player.validGames}</span>
            </div>
          ))}
        </div>

        <Section number="3">Líderes por Fundamento</Section>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <LeaderBox title="Pontos" items={leaders.pts} totalKey="yearlyPoints" avgKey="ppjYear" tone="bg-orange-50 text-orange-800" />
          <LeaderBox title="Rebotes" items={leaders.reb} totalKey="yearlyReb" avgKey="rpjYear" tone="bg-emerald-50 text-emerald-800" />
          <LeaderBox title="Assistências" items={leaders.ast} totalKey="yearlyAst" avgKey="apjYear" tone="bg-cyan-50 text-cyan-800" />
          <LeaderBox title="Tocos" items={leaders.blk} totalKey="yearlyBlk" avgKey="tpjYear" tone="bg-purple-50 text-purple-800" />
        </div>
      </div>

      {performancePages.map((pagePlayers, pageIndex) => (
        <div key={pageIndex} style={{ pageBreakBefore: 'always' }} className="p-7">
          <PdfHeader title="Desempenho Geral do Elenco" subtitle={`Dados ${pageIndex + 1}/${performancePages.length}`} year={year} />
          <table className="w-full text-[9px] border-collapse">
            <thead className="bg-slate-900 text-white"><tr><th className="text-left p-2">Atleta</th><th className="p-2">Pres.</th><th className="p-2">Assid.</th><th className="p-2">Súm.</th><th className="p-2">PTS/J</th><th className="p-2">REB/J</th><th className="p-2">AST/J</th><th className="p-2">TOC/J</th></tr></thead>
            <tbody>
              {pagePlayers.length ? pagePlayers.map((player, index) => (
                <tr key={player.name} className={index % 2 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="p-2 border-b border-slate-100 font-black truncate max-w-[150px]">{player.name}</td>
                  <td className="p-2 border-b border-slate-100 text-center">{player.presences}/{player.validGames}</td>
                  <td className="p-2 border-b border-slate-100 text-center font-black text-indigo-700">{player.percentage.toFixed(0)}%</td>
                  <td className="p-2 border-b border-slate-100 text-center">{player.gamesWithStats}</td>
                  <td className="p-2 border-b border-slate-100 text-center font-black text-orange-700">{player.ppjYear.toFixed(1)}</td>
                  <td className="p-2 border-b border-slate-100 text-center font-black text-emerald-700">{player.rpjYear.toFixed(1)}</td>
                  <td className="p-2 border-b border-slate-100 text-center font-black text-cyan-700">{player.apjYear.toFixed(1)}</td>
                  <td className="p-2 border-b border-slate-100 text-center font-black text-purple-700">{player.tpjYear.toFixed(1)}</td>
                </tr>
              )) : <tr><td colSpan="8" className="p-4 text-center text-slate-400">Nenhum atleta com participação válida em {year}.</td></tr>}
            </tbody>
          </table>
          {pageIndex === performancePages.length - 1 && <div className="mt-7 rounded-xl bg-slate-100 p-4 text-[9px] text-slate-600"><p className="font-black uppercase text-slate-800 mb-1">Metodologia</p><p>Assiduidade = presenças ÷ jogos válidos. Registros vazios e N/A não entram no denominador. PTS/J, REB/J, AST/J e TOC/J usam exclusivamente jogos com súmula na temporada.</p></div>}
        </div>
      ))}
    </div>
  );
}

function AnnualPlayer({ year, player }) {
  const seasonHighs = getHighs(player.statEntries);
  const careerHighs = getHighs(Object.entries(player.dailyStats || {}).sort(([a], [b]) => a.localeCompare(b)));
  const recent = player.statEntries.slice(-5).reverse();
  return (
    <div id="pdf-v2-annual" style={{ width: 760, backgroundColor: '#fff', color: '#1e293b' }} className="font-sans p-7">
      <PdfHeader title="Relatório Individual do Atleta" subtitle={player.name} year={year} />
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950 to-slate-900 text-white p-6 mb-6">
        <p className="text-[10px] uppercase tracking-[0.22em] font-black text-indigo-200">Perfil da temporada</p>
        <div className="flex items-center justify-between mt-3"><div><h1 className="text-3xl font-black uppercase">{player.name}</h1><p className="text-sm text-slate-300 mt-1">{player.posicao || 'Jogador'} • #{player.numero || '--'} • {player.altura || '--'} m</p></div><div className="text-right"><p className="text-4xl font-black">{player.percentage.toFixed(0)}%</p><p className="text-[10px] uppercase font-black text-indigo-200">Assiduidade</p></div></div>
      </div>

      <Section number="1">Resumo da Temporada</Section>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Metric label="Presenças" value={`${player.presences}/${player.validGames}`} />
        <Metric label="Súmulas" value={player.gamesWithStats} detail="base das médias" />
        <Metric label="Faltas NJ" value={player.faults} accent={player.faults ? 'text-rose-700' : 'text-emerald-700'} />
        <Metric label="Membro desde" value={player.dataEntrada ? new Date(player.dataEntrada).getFullYear() : '--'} />
      </div>

      <Section number="2">Médias Técnicas</Section>
      <div className="grid grid-cols-4 gap-3 mb-2"><Metric label="PTS / Jogo" value={player.ppjYear.toFixed(1)} accent="text-orange-700" /><Metric label="REB / Jogo" value={player.rpjYear.toFixed(1)} accent="text-emerald-700" /><Metric label="AST / Jogo" value={player.apjYear.toFixed(1)} accent="text-cyan-700" /><Metric label="TOC / Jogo" value={player.tpjYear.toFixed(1)} accent="text-purple-700" /></div>
      <p className="text-[9px] text-slate-500 mb-6">As médias usam {player.gamesWithStats} súmula(s) registradas em {year}.</p>

      <Section number="3">Recordes: Temporada x Carreira</Section>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[['Temporada', seasonHighs], ['Carreira', careerHighs]].map(([label, highs]) => <div key={label} className="border border-slate-200 rounded-xl p-4"><p className="text-[10px] uppercase font-black text-slate-500 mb-3">{label}</p><div className="grid grid-cols-4 gap-2 text-center">{[['pts','PTS','text-orange-700'],['reb','REB','text-emerald-700'],['ast','AST','text-cyan-700'],['blk','TOC','text-purple-700']].map(([key, metric, color]) => <div key={key}><p className="text-[8px] font-black text-slate-400">{metric}</p><p className={`text-xl font-black ${color}`}>{highs[key].val}</p><p className="text-[8px] text-slate-400">{fmtDate(highs[key].date)}</p></div>)}</div></div>)}
      </div>

      <Section number="4">Últimas 5 Súmulas da Temporada</Section>
      <div className="grid grid-cols-5 gap-2 mb-7">{recent.length ? recent.map(([date, stats]) => <div key={date} className="border border-slate-200 rounded-xl p-3"><p className="text-[9px] font-black text-slate-500">{fmtDate(date)}</p><p className="text-xl font-black text-orange-700 mt-1">{calcPts(stats)} PTS</p><p className="text-[8px] text-slate-500 mt-1">{num(stats?.reb)} REB • {num(stats?.ast)} AST • {num(stats?.blk)} TOC</p></div>) : <p className="col-span-5 text-sm text-slate-400">Sem súmulas registradas nesta temporada.</p>}</div>

      <Section number="5">Detalhamento das Súmulas</Section>
      <table className="w-full text-[9px] border-collapse"><thead className="bg-slate-900 text-white"><tr><th className="p-2 text-left">Data</th><th className="p-2">PTS</th><th className="p-2">REB</th><th className="p-2">AST</th><th className="p-2">TOC</th></tr></thead><tbody>{player.statEntries.length ? player.statEntries.map(([date, stats], index) => <tr key={date} className={index % 2 ? 'bg-slate-50' : 'bg-white'}><td className="p-2 border-b border-slate-100 font-bold">{fmtDate(date)}</td><td className="p-2 border-b border-slate-100 text-center font-black text-orange-700">{calcPts(stats)}</td><td className="p-2 border-b border-slate-100 text-center">{num(stats?.reb)}</td><td className="p-2 border-b border-slate-100 text-center">{num(stats?.ast)}</td><td className="p-2 border-b border-slate-100 text-center">{num(stats?.blk)}</td></tr>) : <tr><td colSpan="5" className="p-4 text-center text-slate-400">Sem súmulas em {year}.</td></tr>}</tbody></table>
      <div className="mt-6 rounded-xl bg-slate-100 p-4 text-[9px] text-slate-600"><p className="font-black text-slate-800 uppercase mb-1">Nota de leitura</p><p>Assiduidade considera apenas jogos válidos. As médias técnicas consideram exclusivamente as súmulas existentes na temporada selecionada.</p></div>
    </div>
  );
}

function Monthly({ year, derived }) {
  const { reportData, playedDates, activePlayers, averageAttendance } = derived;
  const sorted = [...reportData].filter(player => player.validGames > 0).sort((a, b) => b.percentage - a.percentage || b.presences - a.presences);
  const pages = paginate(sorted, 16);
  const monthly = MONTHS.map((month, monthIndex) => {
    const monthDates = playedDates.filter(date => Number(date.substring(5, 7)) - 1 === monthIndex);
    let valid = 0;
    let present = 0;
    reportData.forEach(player => monthDates.forEach(date => {
      const status = player.attendance?.[date]?.trim() || '';
      if (!validStatus(status)) return;
      valid += 1;
      if (status.includes('✅')) present += 1;
    }));
    return { month, games: monthDates.length, percentage: valid ? (present / valid) * 100 : null };
  });

  return (
    <div id="pdf-v2-monthly" style={{ width: 1120, backgroundColor: '#fff', color: '#1e293b' }} className="font-sans">
      {pages.map((pagePlayers, pageIndex) => (
        <div key={pageIndex} style={{ pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto' }} className="p-7">
          <PdfHeader title="Resumo Mensal de Assiduidade" subtitle={`Elenco CBA • Tabela ${pageIndex + 1}/${pages.length}`} year={year} />
          {pageIndex === 0 && <><div className="grid grid-cols-4 gap-3 mb-5"><Metric label="Jogos no ano" value={playedDates.length} /><Metric label="Atletas participantes" value={activePlayers} /><Metric label="Assiduidade média" value={`${averageAttendance.toFixed(0)}%`} accent="text-indigo-700" /><Metric label="Critério" value="Jogos válidos" detail="N/A não entra no cálculo" /></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-5 flex gap-5 text-[9px] text-slate-600"><span><strong>—</strong> = não houve jogo</span><span><strong>N/A</strong> = sem registro válido</span><span><strong>3/4 · 75%</strong> = 3 presenças em 4 jogos válidos</span></div></>}
          <table className="w-full border-collapse text-[8px]" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-slate-900 text-white"><tr><th className="p-2 text-left w-32">Atleta</th>{MONTHS.map((month, index) => <th key={month} className="p-1 text-center"><div>{month}</div><div className="text-[7px] text-slate-300 font-normal">{monthly[index].games}J</div></th>)}<th className="p-1 text-center w-12">Pres.</th><th className="p-1 text-center w-12">Faltas NJ</th><th className="p-1 text-center w-12">Assid.</th></tr></thead>
            <tbody>
              {pagePlayers.length ? pagePlayers.map((player, rowIndex) => <tr key={player.name} className={rowIndex % 2 ? 'bg-slate-50' : 'bg-white'}><td className="p-2 border-b border-r border-slate-200 font-black truncate">{player.name}</td>{MONTHS.map((_, monthIndex) => {
                const monthDates = playedDates.filter(date => Number(date.substring(5, 7)) - 1 === monthIndex);
                if (!monthDates.length) return <td key={monthIndex} className="p-1 border-b border-r border-slate-200 text-center text-slate-300">—</td>;
                let valid = 0; let present = 0;
                monthDates.forEach(date => { const status = player.attendance?.[date]?.trim() || ''; if (validStatus(status)) { valid += 1; if (status.includes('✅')) present += 1; } });
                if (!valid) return <td key={monthIndex} className="p-1 border-b border-r border-slate-200 text-center text-slate-400">N/A</td>;
                const pct = (present / valid) * 100;
                const tone = pct >= 80 ? 'text-emerald-700 bg-emerald-50' : pct >= 60 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50';
                return <td key={monthIndex} className={`p-1 border-b border-r border-slate-200 text-center font-black ${tone}`}><div>{present}/{valid}</div><div className="text-[7px]">{pct.toFixed(0)}%</div></td>;
              })}<td className="p-1 border-b border-r border-slate-200 text-center font-black text-emerald-700">{player.presences}</td><td className="p-1 border-b border-r border-slate-200 text-center font-black text-rose-700">{player.faults || '—'}</td><td className={`p-1 border-b border-slate-200 text-center font-black ${player.percentage >= 80 ? 'text-emerald-700' : player.percentage >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>{player.percentage.toFixed(0)}%</td></tr>) : <tr><td colSpan="16" className="p-5 text-center text-slate-400">Nenhum atleta com participação válida em {year}.</td></tr>}
              {pageIndex === pages.length - 1 && <tr className="bg-indigo-50 text-indigo-900 font-black"><td className="p-2 border-t-2 border-indigo-200">Média do elenco</td>{monthly.map(summary => <td key={summary.month} className="p-1 border-t-2 border-indigo-200 text-center">{summary.percentage === null ? '—' : `${summary.percentage.toFixed(0)}%`}</td>)}<td className="p-1 border-t-2 border-indigo-200 text-center" colSpan="3">{averageAttendance.toFixed(0)}% no ano</td></tr>}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPdfBridgeV2() {
  const [mountNode, setMountNode] = useState(null);
  const [active, setActive] = useState(false);
  const [data, setData] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [selectedPlayer, setSelectedPlayer] = useState('todos');
  const [annualBusy, setAnnualBusy] = useState(false);
  const [monthlyBusy, setMonthlyBusy] = useState(false);

  useEffect(() => {
    fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getInitialAppData' }) })
      .then(response => response.json()).then(setData).catch(() => setData(null));
  }, []);

  useEffect(() => {
    let node = null;
    let hiddenButtons = [];
    const sync = () => {
      const reportButton = document.querySelector('button[title="Relatórios"]');
      const isReports = Boolean(reportButton?.className?.includes('scale-110'));
      setActive(isReports);

      const heading = [...document.querySelectorAll('h2')].find(element => element.textContent?.trim() === 'Central de Relatórios');
      const container = heading?.closest('.space-y-8');
      if (!container) return;

      const selects = [...container.querySelectorAll('select')];
      const yearSelect = selects.find(select => /^\d{4}$/.test(select.value));
      const playerSelect = selects.find(select => [...select.options].some(option => option.value === 'todos'));
      if (yearSelect) setYear(yearSelect.value);
      if (playerSelect) setSelectedPlayer(playerSelect.value);

      const oldPdfButtons = [...container.querySelectorAll('button')].filter(button => {
        if (button.dataset.reportsPdfV2Button === 'true') return false;
        const text = button.textContent || '';
        return text.includes('Resumo Mensal') || text.includes('Relatório Anual');
      });
      hiddenButtons.forEach(button => { if (!oldPdfButtons.includes(button)) button.style.display = ''; });
      hiddenButtons = oldPdfButtons;
      oldPdfButtons.forEach(button => { button.style.display = isReports ? 'none' : ''; });

      const buttonParent = oldPdfButtons[0]?.parentElement;
      if (buttonParent && (!node || !node.isConnected)) {
        node = document.createElement('div');
        node.dataset.reportsPdfV2Mount = 'true';
        node.style.display = 'contents';
        buttonParent.appendChild(node);
        setMountNode(node);
      }
      if (node) node.style.display = isReports ? 'contents' : 'none';
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'value'] });
    document.addEventListener('change', sync, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('change', sync, true);
      hiddenButtons.forEach(button => { button.style.display = ''; });
      if (node?.isConnected) node.remove();
    };
  }, []);

  const appData = data?.data || data || {};
  const players = appData?.dashboard?.players || [];
  const dates = appData?.dashboard?.dates || [];
  const derived = useMemo(() => deriveReport(players, dates, year), [players, dates, year]);
  const selected = derived.reportData.find(player => player.name === selectedPlayer);

  const generateAnnual = async () => {
    if (!data) return;
    setAnnualBusy(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const element = document.getElementById('pdf-v2-annual');
      if (!element) throw new Error('Template anual indisponível');
      const suffix = selectedPlayer === 'todos' ? 'Geral' : safeFilename(selectedPlayer);
      await savePdf(element, `Relatorio_CBA_${year}_${suffix}.pdf`, 'portrait', `Basquete dos Aposentados - ${selectedPlayer === 'todos' ? 'Relatório Anual' : 'Relatório Individual'}`);
    } catch (error) {
      console.error('Erro ao gerar relatório anual:', error);
      window.alert('Não foi possível gerar o relatório anual. Tente novamente.');
    } finally {
      setAnnualBusy(false);
    }
  };

  const generateMonthly = async () => {
    if (!data) return;
    setMonthlyBusy(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const element = document.getElementById('pdf-v2-monthly');
      if (!element) throw new Error('Template mensal indisponível');
      await savePdf(element, `Resumo_Mensal_Assiduidade_${year}.pdf`, 'landscape', 'Basquete dos Aposentados - Resumo Mensal de Assiduidade');
    } catch (error) {
      console.error('Erro ao gerar resumo mensal:', error);
      window.alert('Não foi possível gerar o resumo mensal. Tente novamente.');
    } finally {
      setMonthlyBusy(false);
    }
  };

  if (!active || !mountNode || !data) return null;

  return createPortal(<>
    <button data-reports-pdf-v2-button="true" onClick={generateMonthly} disabled={monthlyBusy} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50" title="Resumo Mensal de Assiduidade v2">{monthlyBusy ? <RefreshCw className="animate-spin h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}<span>{monthlyBusy ? 'Gerando...' : 'Resumo Mensal'}</span></button>
    <button data-reports-pdf-v2-button="true" onClick={generateAnnual} disabled={annualBusy || (selectedPlayer !== 'todos' && !selected)} className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50" title="Relatório Anual v2">{annualBusy ? <RefreshCw className="animate-spin h-5 w-5" /> : <BookOpen className="h-5 w-5" />}<span>{annualBusy ? 'Gerando...' : 'Relatório Anual'}</span></button>
    {(annualBusy || monthlyBusy) && <div style={{ position: 'fixed', left: '-12000px', top: 0, zIndex: -100, opacity: 1, pointerEvents: 'none' }}>{annualBusy && (selectedPlayer === 'todos' ? <AnnualGeneral year={year} derived={derived} /> : selected ? <AnnualPlayer year={year} player={selected} /> : null)}{monthlyBusy && <Monthly year={year} derived={derived} />}</div>}
  </>, mountNode);
}
