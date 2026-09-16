import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, CalendarDays, CheckCircle2, Target, Users } from 'lucide-react';

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
  return <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 p-3.5 relative overflow-hidden">
    <Icon className={`absolute -right-2 -bottom-2 w-14 h-14 opacity-10 ${tone}`} />
    <p className="text-[9px] uppercase tracking-wider font-black text-slate-500">{label}</p>
    <p className={`text-2xl font-black mt-1 ${tone}`}>{value}</p>
    <p className="text-[10px] text-slate-500 mt-0.5">{detail}</p>
  </div>;
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

  useEffect(() => {
    if (!statDates.length) {
      setSelectedDate('');
      return;
    }
    if (!statDates.includes(selectedDate)) setSelectedDate(statDates[0]);
  }, [statDates, selectedDate]);

  const rows = useMemo(() => players.map(player => {
    const stats = player.dailyStats?.[selectedDate];
    if (!stats) return null;
    return {
      name: player.name,
      pts2: num(stats.pts2), pts3: num(stats.pts3), reb: num(stats.reb),
      ast: num(stats.ast), blk: num(stats.blk), pts: calcPts(stats)
    };
  }).filter(Boolean).sort((a, b) => b.pts - a.pts || b.reb - a.reb || a.name.localeCompare(b.name)), [players, selectedDate]);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    pts: acc.pts + row.pts, reb: acc.reb + row.reb, ast: acc.ast + row.ast, blk: acc.blk + row.blk
  }), { pts: 0, reb: 0, ast: 0, blk: 0 }), [rows]);

  return <Panel className="mt-5 overflow-hidden">
    <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/20">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400"><BarChart3 className="w-5 h-5"/><span className="text-[10px] uppercase tracking-[0.18em] font-black">Estatísticas registradas</span></div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">Súmulas por data</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Cada data abaixo representa os números gravados pelo Mesário ou corrigidos pela Administração.</p>
        </div>
        <label className="min-w-[220px]">
          <span className="block text-[9px] uppercase tracking-wider font-black text-slate-500 mb-1.5">Data da súmula</span>
          <select value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30">
            {!statDates.length && <option value="">Sem súmulas em {year}</option>}
            {statDates.map(date => <option key={date} value={date}>{fmtDate(date)}</option>)}
          </select>
        </label>
      </div>
    </div>

    {selectedDate ? <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700">
        <Metric icon={Users} label="Jogadores" value={rows.length} detail={fmtDate(selectedDate)} tone="text-indigo-500" />
        <Metric icon={Target} label="Pontos" value={totals.pts} detail="total da rodada" tone="text-orange-500" />
        <Metric icon={CheckCircle2} label="Rebotes" value={totals.reb} detail="total da rodada" tone="text-emerald-500" />
        <Metric icon={BarChart3} label="Assistências" value={totals.ast} detail="total da rodada" tone="text-cyan-500" />
        <Metric icon={CalendarDays} label="Tocos" value={totals.blk} detail="total da rodada" tone="text-violet-500" />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[minmax(190px,1fr)_70px_70px_80px_70px_70px_70px] gap-2 px-4 sm:px-5 py-3 bg-slate-50 dark:bg-slate-900/60 text-[9px] uppercase tracking-wider font-black text-slate-500">
            <span>Atleta</span><span className="text-center">2PT</span><span className="text-center">3PT</span><span className="text-center">PTS</span><span className="text-center">REB</span><span className="text-center">AST</span><span className="text-center">TOC</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[430px] overflow-y-auto">
            {rows.map((row, index) => <div key={row.name} className="grid grid-cols-[minmax(190px,1fr)_70px_70px_80px_70px_70px_70px] gap-2 items-center px-4 sm:px-5 py-3 text-sm">
              <div className="flex items-center gap-3 min-w-0"><span className="w-6 text-right text-[10px] font-black text-slate-400">{index + 1}º</span><span className="font-black text-slate-800 dark:text-slate-100 truncate">{row.name}</span></div>
              <span className="text-center text-slate-600 dark:text-slate-300">{row.pts2}</span><span className="text-center text-slate-600 dark:text-slate-300">{row.pts3}</span><span className="text-center font-black text-orange-500 text-base">{row.pts}</span><span className="text-center font-bold text-emerald-500">{row.reb}</span><span className="text-center font-bold text-cyan-500">{row.ast}</span><span className="text-center font-bold text-violet-500">{row.blk}</span>
            </div>)}
          </div>
        </div>
      </div>
    </> : <div className="p-8 text-center text-sm font-bold text-slate-500">Ainda não existem estatísticas registradas em {year}.</div>}
  </Panel>;
}

function PlayerHistory({ player, year }) {
  const entries = useMemo(() => Object.entries(player?.dailyStats || {})
    .filter(([date]) => date.startsWith(year))
    .sort(([a], [b]) => b.localeCompare(a)), [player, year]);

  return <Panel className="mt-5 overflow-hidden">
    <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/20">
      <div className="flex items-center justify-between gap-4">
        <div><div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400"><CalendarDays className="w-5 h-5"/><span className="text-[10px] uppercase tracking-[0.18em] font-black">Histórico individual</span></div><h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">Estatísticas por jogo · {player?.name}</h3><p className="text-xs sm:text-sm text-slate-500 mt-1">Uma linha por data registrada no Mesário/Admin durante {year}.</p></div>
        <div className="shrink-0 rounded-2xl bg-indigo-600 text-white px-4 py-3 text-center"><p className="text-2xl font-black leading-none">{entries.length}</p><p className="text-[9px] uppercase font-black mt-1">súmulas</p></div>
      </div>
    </div>
    {entries.length ? <div className="overflow-x-auto"><div className="min-w-[720px]">
      <div className="grid grid-cols-[120px_70px_70px_80px_70px_70px_70px] gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 text-[9px] uppercase tracking-wider font-black text-slate-500"><span>Data</span><span className="text-center">2PT</span><span className="text-center">3PT</span><span className="text-center">PTS</span><span className="text-center">REB</span><span className="text-center">AST</span><span className="text-center">TOC</span></div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[430px] overflow-y-auto">{entries.map(([date, stats]) => <div key={date} className="grid grid-cols-[120px_70px_70px_80px_70px_70px_70px] gap-2 items-center px-5 py-3 text-sm"><span className="font-black text-slate-800 dark:text-slate-100">{fmtDate(date)}</span><span className="text-center text-slate-600 dark:text-slate-300">{num(stats?.pts2)}</span><span className="text-center text-slate-600 dark:text-slate-300">{num(stats?.pts3)}</span><span className="text-center font-black text-orange-500 text-base">{calcPts(stats)}</span><span className="text-center font-bold text-emerald-500">{num(stats?.reb)}</span><span className="text-center font-bold text-cyan-500">{num(stats?.ast)}</span><span className="text-center font-bold text-violet-500">{num(stats?.blk)}</span></div>)}</div>
    </div></div> : <div className="p-8 text-center text-sm font-bold text-slate-500">{player?.name} ainda não possui súmula em {year}.</div>}
  </Panel>;
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
        node.className = 'mt-5';
        headerChild.appendChild(node);
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
