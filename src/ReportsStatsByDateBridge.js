import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3, CalendarDays, CheckCircle2, ChevronRight, Maximize2,
  Target, Trophy, Users, X
} from 'lucide-react';

const GATEWAY_URL = 'https://vqirdswgchlcxevepamu.supabase.co/functions/v1/cba-gateway';
const SESSION_KEYS = ['cba_session_v2', 'cba_session_v1'];

const num = value => Number(value || 0);
const calcPts = stats => (num(stats?.pts2) * 2) + (num(stats?.pts3) * 3);
const fmtDate = value => value ? value.split('-').reverse().join('/') : '--';

function readToken() {
  for (const key of SESSION_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token = parsed?.user?.token || parsed?.user?.user?.token || parsed?.token;
      if (token) return token;
    } catch { /* tenta a próxima chave */ }
  }
  try {
    const raw = window.sessionStorage.getItem('cba_session_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.token || parsed?.user?.token || null;
    }
  } catch { /* sem impacto */ }
  return null;
}

async function loadInitialData() {
  const token = readToken();
  if (!token) throw new Error('Sessão não encontrada.');
  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getInitialAppData', token })
  });
  const payload = await response.json();
  if (!response.ok || payload?.result === 'error') throw new Error(payload?.message || 'Falha ao carregar estatísticas.');
  return payload;
}

const Panel = ({ children, className = '' }) => (
  <div className={`rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/80 shadow-xl ${className}`}>{children}</div>
);

function Metric({ icon: Icon, label, value, detail, tone }) {
  return <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 p-3.5 relative overflow-hidden min-w-0">
    <Icon className={`absolute -right-2 -bottom-2 w-14 h-14 opacity-10 ${tone}`} />
    <p className="text-[9px] uppercase tracking-wider font-black text-slate-500 truncate">{label}</p>
    <p className={`text-2xl font-black mt-1 ${tone}`}>{value}</p>
    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{detail}</p>
  </div>;
}

function useBodyLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [locked]);
}

function DetailsShell({ title, subtitle, onClose, children }) {
  useBodyLock(true);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full h-full sm:max-w-6xl sm:h-[92vh] sm:mx-auto sm:my-[2vh] bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.18em] font-black text-indigo-500">Detalhamento estatístico</p>
            <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
          </div>
          <button onClick={onClose} className="shrink-0 w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Fechar detalhes">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function DayDetails({ date, rows, zeroRows, totals, onClose }) {
  const [showZero, setShowZero] = useState(false);
  const displayRows = showZero ? [...rows, ...zeroRows] : rows;

  return <DetailsShell title={`Súmula · ${fmtDate(date)}`} subtitle="Dados registrados pelo Mesário e pela Administração" onClose={onClose}>
    <div className="p-4 sm:p-6 space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        <Metric icon={Users} label="Jogadores" value={rows.length} detail="com presença ou produção" tone="text-indigo-500" />
        <Metric icon={Target} label="Pontos" value={totals.pts} detail="total da rodada" tone="text-orange-500" />
        <Metric icon={CheckCircle2} label="Rebotes" value={totals.reb} detail="total da rodada" tone="text-emerald-500" />
        <Metric icon={BarChart3} label="Assistências" value={totals.ast} detail="total da rodada" tone="text-cyan-500" />
        <Metric icon={CalendarDays} label="Tocos" value={totals.blk} detail="total da rodada" tone="text-violet-500" />
      </div>

      {zeroRows.length > 0 && <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
        <p className="text-xs text-slate-500"><strong className="text-slate-700 dark:text-slate-200">{zeroRows.length}</strong> registro(s) zerado(s) foram ocultados para melhorar a leitura.</p>
        <button onClick={() => setShowZero(value => !value)} className="text-xs font-black text-indigo-600 dark:text-indigo-400 text-left sm:text-right">{showZero ? 'Ocultar zerados' : 'Mostrar zerados'}</button>
      </div>}

      {/* Desktop: tabela completa */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-[minmax(190px,1fr)_70px_70px_80px_70px_70px_70px] gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-[9px] uppercase tracking-wider font-black text-slate-500 sticky top-0">
          <span>Atleta</span><span className="text-center">2PT</span><span className="text-center">3PT</span><span className="text-center">PTS</span><span className="text-center">REB</span><span className="text-center">AST</span><span className="text-center">TOC</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {displayRows.map((row, index) => <div key={`${row.name}-${index}`} className="grid grid-cols-[minmax(190px,1fr)_70px_70px_80px_70px_70px_70px] gap-2 items-center px-5 py-3 text-sm bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3 min-w-0"><span className="w-7 text-right text-[10px] font-black text-slate-400">{index + 1}º</span><span className="font-black text-slate-800 dark:text-slate-100 truncate">{row.name}</span></div>
            <span className="text-center text-slate-600 dark:text-slate-300">{row.pts2}</span><span className="text-center text-slate-600 dark:text-slate-300">{row.pts3}</span><span className="text-center font-black text-orange-500 text-base">{row.pts}</span><span className="text-center font-bold text-emerald-500">{row.reb}</span><span className="text-center font-bold text-cyan-500">{row.ast}</span><span className="text-center font-bold text-violet-500">{row.blk}</span>
          </div>)}
        </div>
      </div>

      {/* Mobile: cards, sem tabela horizontal */}
      <div className="md:hidden space-y-2.5">
        {displayRows.map((row, index) => <div key={`${row.name}-${index}`} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">#{index + 1}</p><p className="font-black text-slate-900 dark:text-white truncate">{row.name}</p></div>
            <div className="text-right shrink-0"><p className="text-2xl leading-none font-black text-orange-500">{row.pts}</p><p className="text-[9px] uppercase font-black text-slate-500 mt-1">PTS</p></div>
          </div>
          <div className="grid grid-cols-5 gap-1.5 mt-3">
            {[['2PT', row.pts2], ['3PT', row.pts3], ['REB', row.reb], ['AST', row.ast], ['TOC', row.blk]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-900/60 py-2 text-center"><p className="text-[8px] uppercase font-black text-slate-500">{label}</p><p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{value}</p></div>)}
          </div>
        </div>)}
      </div>

      {!displayRows.length && <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm font-bold text-slate-500">Nenhum atleta com presença ou produção estatística nesta data.</div>}
    </div>
  </DetailsShell>;
}

function DayView({ players, year }) {
  const statDates = useMemo(() => {
    const dates = new Set();
    players.forEach(player => Object.keys(player.dailyStats || {}).forEach(date => {
      if (date.startsWith(year)) dates.add(date);
    }));
    return [...dates].sort((a, b) => b.localeCompare(a));
  }, [players, year]);

  const [selectedDate, setSelectedDate] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!statDates.length) {
      setSelectedDate('');
      return;
    }
    if (!statDates.includes(selectedDate)) setSelectedDate(statDates[0]);
  }, [statDates, selectedDate]);

  const allRows = useMemo(() => players.map(player => {
    const stats = player.dailyStats?.[selectedDate];
    if (!stats) return null;
    const row = {
      name: player.name,
      pts2: num(stats.pts2), pts3: num(stats.pts3), reb: num(stats.reb),
      ast: num(stats.ast), blk: num(stats.blk), pts: calcPts(stats),
      present: String(player.attendance?.[selectedDate] || '').includes('✅')
    };
    row.hasProduction = row.pts > 0 || row.reb > 0 || row.ast > 0 || row.blk > 0;
    return row;
  }).filter(Boolean), [players, selectedDate]);

  const rows = useMemo(() => allRows.filter(row => row.present || row.hasProduction)
    .sort((a, b) => b.pts - a.pts || b.reb - a.reb || a.name.localeCompare(b.name)), [allRows]);
  const zeroRows = useMemo(() => allRows.filter(row => !row.present && !row.hasProduction)
    .sort((a, b) => a.name.localeCompare(b.name)), [allRows]);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    pts: acc.pts + row.pts, reb: acc.reb + row.reb, ast: acc.ast + row.ast, blk: acc.blk + row.blk
  }), { pts: 0, reb: 0, ast: 0, blk: 0 }), [rows]);

  const topPlayers = rows.slice(0, 3);

  return <>
    <Panel className="mt-5 overflow-hidden">
      <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/20">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400"><BarChart3 className="w-5 h-5"/><span className="text-[10px] uppercase tracking-[0.18em] font-black">Estatísticas registradas</span></div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">Súmulas por data</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Resumo da rodada. Abra os detalhes somente quando precisar consultar jogador por jogador.</p>
          </div>
          <label className="w-full lg:w-[220px] shrink-0">
            <span className="block text-[9px] uppercase tracking-wider font-black text-slate-500 mb-1.5">Data da súmula</span>
            <select value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30">
              {!statDates.length && <option value="">Sem súmulas em {year}</option>}
              {statDates.map(date => <option key={date} value={date}>{fmtDate(date)}</option>)}
            </select>
          </label>
        </div>
      </div>

      {selectedDate ? <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          <Metric icon={Users} label="Jogadores" value={rows.length} detail={fmtDate(selectedDate)} tone="text-indigo-500" />
          <Metric icon={Target} label="Pontos" value={totals.pts} detail="total da rodada" tone="text-orange-500" />
          <Metric icon={CheckCircle2} label="Rebotes" value={totals.reb} detail="total da rodada" tone="text-emerald-500" />
          <Metric icon={BarChart3} label="Assistências" value={totals.ast} detail="total da rodada" tone="text-cyan-500" />
          <Metric icon={CalendarDays} label="Tocos" value={totals.blk} detail="total da rodada" tone="text-violet-500" />
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-wider font-black text-slate-500 mb-2">Destaques da rodada</p>
            {topPlayers.length ? <div className="flex flex-wrap gap-2">{topPlayers.map((row, index) => <div key={row.name} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 px-3 py-2 min-w-0"><span className="text-sm">{['🥇','🥈','🥉'][index]}</span><span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate max-w-[140px]">{row.name}</span><span className="text-xs font-black text-orange-500">{row.pts} PTS</span></div>)}</div> : <p className="text-xs text-slate-500">Nenhuma produção estatística ou presença identificada nesta data.</p>}
          </div>
          <button onClick={() => setDetailsOpen(true)} className="w-full xl:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3.5 text-sm font-black shadow-lg shadow-indigo-600/20 transition">
            <Maximize2 className="w-4 h-4" /> Abrir detalhes da súmula <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div> : <div className="p-6 text-center text-sm font-bold text-slate-500 border-t border-slate-200 dark:border-slate-700">Ainda não existem estatísticas registradas em {year}.</div>}
    </Panel>

    {detailsOpen && selectedDate && <DayDetails date={selectedDate} rows={rows} zeroRows={zeroRows} totals={totals} onClose={() => setDetailsOpen(false)} />}
  </>;
}

function PlayerDetails({ player, entries, year, onClose }) {
  return <DetailsShell title={player?.name || 'Atleta'} subtitle={`Histórico jogo a jogo · temporada ${year}`} onClose={onClose}>
    <div className="p-4 sm:p-6">
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-[120px_70px_70px_80px_70px_70px_70px] gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-[9px] uppercase tracking-wider font-black text-slate-500"><span>Data</span><span className="text-center">2PT</span><span className="text-center">3PT</span><span className="text-center">PTS</span><span className="text-center">REB</span><span className="text-center">AST</span><span className="text-center">TOC</span></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">{entries.map(([date, stats]) => <div key={date} className="grid grid-cols-[120px_70px_70px_80px_70px_70px_70px] gap-2 items-center px-5 py-3 text-sm bg-white dark:bg-slate-900"><span className="font-black text-slate-800 dark:text-slate-100">{fmtDate(date)}</span><span className="text-center text-slate-600 dark:text-slate-300">{num(stats?.pts2)}</span><span className="text-center text-slate-600 dark:text-slate-300">{num(stats?.pts3)}</span><span className="text-center font-black text-orange-500 text-base">{calcPts(stats)}</span><span className="text-center font-bold text-emerald-500">{num(stats?.reb)}</span><span className="text-center font-bold text-cyan-500">{num(stats?.ast)}</span><span className="text-center font-bold text-violet-500">{num(stats?.blk)}</span></div>)}</div>
      </div>
      <div className="md:hidden space-y-2.5">{entries.map(([date, stats]) => <div key={date} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"><div className="flex justify-between gap-3"><div><p className="text-[9px] uppercase font-black tracking-wider text-slate-500">Jogo</p><p className="font-black text-slate-900 dark:text-white">{fmtDate(date)}</p></div><div className="text-right"><p className="text-2xl font-black leading-none text-orange-500">{calcPts(stats)}</p><p className="text-[9px] uppercase font-black text-slate-500 mt-1">PTS</p></div></div><div className="grid grid-cols-5 gap-1.5 mt-3">{[['2PT',num(stats?.pts2)],['3PT',num(stats?.pts3)],['REB',num(stats?.reb)],['AST',num(stats?.ast)],['TOC',num(stats?.blk)]].map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-900/60 py-2 text-center"><p className="text-[8px] uppercase font-black text-slate-500">{label}</p><p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{value}</p></div>)}</div></div>)}</div>
      {!entries.length && <div className="p-8 text-center text-sm font-bold text-slate-500">Sem súmulas registradas para {year}.</div>}
    </div>
  </DetailsShell>;
}

function PlayerHistory({ player, year }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const entries = useMemo(() => Object.entries(player?.dailyStats || {})
    .filter(([date]) => date.startsWith(year))
    .sort(([a], [b]) => b.localeCompare(a)), [player, year]);

  const totals = useMemo(() => entries.reduce((acc, [, stats]) => ({
    pts: acc.pts + calcPts(stats), reb: acc.reb + num(stats?.reb), ast: acc.ast + num(stats?.ast), blk: acc.blk + num(stats?.blk)
  }), { pts: 0, reb: 0, ast: 0, blk: 0 }), [entries]);

  const recent = entries.slice(0, 3);

  return <>
    <Panel className="mt-5 overflow-hidden">
      <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div><div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400"><CalendarDays className="w-5 h-5"/><span className="text-[10px] uppercase tracking-[0.18em] font-black">Histórico individual</span></div><h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">Estatísticas por jogo · {player?.name}</h3><p className="text-xs sm:text-sm text-slate-500 mt-1">Resumo da temporada {year}.</p></div>
          <div className="rounded-2xl bg-indigo-600 text-white px-4 py-3 text-center self-start sm:self-auto"><p className="text-2xl font-black leading-none">{entries.length}</p><p className="text-[9px] uppercase font-black mt-1">súmulas</p></div>
        </div>
      </div>
      <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <Metric icon={Target} label="Pontos" value={totals.pts} detail="na temporada" tone="text-orange-500" />
          <Metric icon={CheckCircle2} label="Rebotes" value={totals.reb} detail="na temporada" tone="text-emerald-500" />
          <Metric icon={BarChart3} label="Assistências" value={totals.ast} detail="na temporada" tone="text-cyan-500" />
          <Metric icon={Trophy} label="Tocos" value={totals.blk} detail="na temporada" tone="text-violet-500" />
        </div>
        <div className="flex flex-col xl:flex-row xl:items-end gap-3">
          <div className="flex-1"><p className="text-[9px] uppercase tracking-wider font-black text-slate-500 mb-2">Últimas súmulas</p>{recent.length ? <div className="flex flex-wrap gap-2">{recent.map(([date, stats]) => <div key={date} className="rounded-xl bg-slate-100 dark:bg-slate-900/60 px-3 py-2"><p className="text-[9px] font-black text-slate-500">{fmtDate(date)}</p><p className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5">{calcPts(stats)} PTS · {num(stats?.reb)} REB · {num(stats?.ast)} AST</p></div>)}</div> : <p className="text-xs text-slate-500">Sem súmulas nesta temporada.</p>}</div>
          <button onClick={() => setDetailsOpen(true)} disabled={!entries.length} className="w-full xl:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 text-white px-5 py-3.5 text-sm font-black shadow-lg shadow-indigo-600/20 transition"><Maximize2 className="w-4 h-4" /> Abrir histórico completo <ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </Panel>
    {detailsOpen && <PlayerDetails player={player} entries={entries} year={year} onClose={() => setDetailsOpen(false)} />}
  </>;
}

function StatsExperience({ data, year, selectedPlayer }) {
  const players = data?.data?.dashboard?.players || data?.dashboard?.players || [];
  if (selectedPlayer !== 'todos') {
    const player = players.find(item => item.name === selectedPlayer);
    if (player) return <PlayerHistory player={player} year={year} />;
  }
  return <DayView players={players} year={year} />;
}

export default function ReportsStatsByDateBridge() {
  const [mountNode, setMountNode] = useState(null);
  const [active, setActive] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [selectedPlayer, setSelectedPlayer] = useState('todos');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try { setError(''); setData(await loadInitialData()); }
    catch (err) { setError(err?.message || 'Falha ao carregar estatísticas.'); }
  }, []);

  useEffect(() => {
    if (active) refresh();
  }, [active, refresh]);

  useEffect(() => {
    let node = null;
    const sync = () => {
      const reportButton = document.querySelector('button[title="Relatórios"]');
      const isReports = Boolean(reportButton?.className?.includes('scale-110'));
      setActive(isReports);

      const heading = [...document.querySelectorAll('h2')].find(el => el.textContent?.trim() === 'Central de Relatórios');
      const container = heading?.closest('.space-y-8');
      if (!container) return;
      const headerChild = [...container.children].find(child => child.contains(heading));
      if (!headerChild) return;

      const selects = [...container.querySelectorAll('select')];
      const yearSelect = selects.find(select => /^\d{4}$/.test(select.value));
      const athleteSelect = selects.find(select => select.value === 'todos' || [...select.options].some(option => option.value === 'todos'));
      if (yearSelect) setYear(yearSelect.value);
      if (athleteSelect) setSelectedPlayer(athleteSelect.value);

      if (!node || !node.isConnected) {
        node = document.createElement('div');
        node.dataset.reportsStatsByDate = 'true';
        node.className = 'mt-5 w-full min-w-0';
        const dashboardNode = container.querySelector('[data-reports-dashboard-v2="true"]');
        if (dashboardNode) dashboardNode.appendChild(node);
        else headerChild.insertAdjacentElement('afterend', node);
        setMountNode(node);
      }
      node.style.display = isReports ? '' : 'none';
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'value'] });
    document.addEventListener('change', sync, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('change', sync, true);
      if (node?.isConnected) node.remove();
    };
  }, []);

  if (!active || !mountNode) return null;
  if (error) return createPortal(<Panel className="mt-5 p-4 text-sm font-bold text-rose-500">{error}</Panel>, mountNode);
  if (!data) return createPortal(<Panel className="mt-5 p-4 text-sm font-bold text-slate-500">Carregando estatísticas por data...</Panel>, mountNode);
  return createPortal(<StatsExperience data={data} year={year} selectedPlayer={selectedPlayer} />, mountNode);
}
