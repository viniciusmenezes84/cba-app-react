import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, CalendarDays, CheckCircle2, Flame, Target, Trophy, Users, Zap } from 'lucide-react';
import ReportsRankingCompact from './ReportsRankingCompact';
import ReportsStatsByDate from './ReportsStatsByDate';
import ReportsPdf from './ReportsPdf';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);


const EMPTY_LIST = [];

const Card = ({ children, className = '' }) => (
  <div className={`bg-white/85 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xl rounded-3xl p-5 sm:p-6 ${className}`}>{children}</div>
);

const num = value => Number(value || 0);
const calcPts = stats => (num(stats?.pts2) * 2) + (num(stats?.pts3) * 3);
const fmtDate = date => date ? date.split('-').reverse().join('/') : '--';

function buildHighs(entries) {
  if (!entries.length) return null;
  const initial = {
    pts: { val: 0, date: '' }, reb: { val: 0, date: '' },
    ast: { val: 0, date: '' }, blk: { val: 0, date: '' }
  };
  const highs = entries.reduce((acc, [date, stats]) => {
    const values = { pts: calcPts(stats), reb: num(stats?.reb), ast: num(stats?.ast), blk: num(stats?.blk) };
    Object.entries(values).forEach(([key, value]) => {
      if (value > acc[key].val) acc[key] = { val: value, date };
    });
    return acc;
  }, initial);
  return Object.values(highs).some(item => item.val > 0) ? highs : null;
}

function ReportsExperience({ data, year, selectedPlayer, onSelectPlayer }) {
  const appData = data?.data || data || {};
  const players = appData?.dashboard?.players || EMPTY_LIST;
  const dates = appData?.dashboard?.dates || EMPTY_LIST;
  const [metric, setMetric] = useState('pts');

  const playedDates = useMemo(() => [...new Set(dates)]
    .filter(date => date.startsWith(year))
    .filter(date => players.some(player => player.attendance?.[date]?.includes('✅')))
    .sort(), [dates, players, year]);

  const reportData = useMemo(() => players.map(player => {
    let validGames = 0;
    let presences = 0;
    let faults = 0;
    playedDates.forEach(date => {
      const status = player.attendance?.[date]?.trim() || '';
      if (status && status !== 'N/A') {
        validGames += 1;
        if (status.includes('✅')) presences += 1;
        if (status.toUpperCase() === 'NÃO JUSTIFICOU') faults += 1;
      }
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
  }), [players, playedDates, year]);

  const validPlayerGames = reportData.reduce((sum, p) => sum + p.validGames, 0);
  const totalPresences = reportData.reduce((sum, p) => sum + p.presences, 0);
  const averageAttendance = validPlayerGames ? (totalPresences / validPlayerGames) * 100 : 0;
  const activePlayers = reportData.filter(p => p.validGames > 0).length;
  const statGameDates = useMemo(() => {
    const set = new Set();
    reportData.forEach(player => player.statEntries.forEach(([date]) => set.add(date)));
    return [...set].filter(date => playedDates.includes(date));
  }, [reportData, playedDates]);
  const coveragePct = playedDates.length ? (statGameDates.length / playedDates.length) * 100 : 0;

  const selected = reportData.find(player => player.name === selectedPlayer);

  if (selectedPlayer !== 'todos' && selected) {
    const seasonHighs = buildHighs(selected.statEntries);
    const careerEntries = Object.entries(selected.dailyStats || {}).sort(([a], [b]) => a.localeCompare(b));
    const careerHighs = buildHighs(careerEntries);
    const recentEntries = selected.statEntries.slice(-5);
    const chartValues = selected.statEntries.map(([, stats]) => ({
      pts: calcPts(stats), reb: num(stats?.reb), ast: num(stats?.ast), blk: num(stats?.blk)
    }));
    const metricLabels = { pts: 'Pontos', reb: 'Rebotes', ast: 'Assistências', blk: 'Tocos' };
    const metricColors = { pts: '#f97316', reb: '#10b981', ast: '#06b6d4', blk: '#a855f7' };
    const chartData = {
      labels: selected.statEntries.map(([date]) => fmtDate(date).slice(0, 5)),
      datasets: [{
        label: metricLabels[metric],
        data: chartValues.map(item => item[metric]),
        borderColor: metricColors[metric],
        backgroundColor: `${metricColors[metric]}22`,
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 4
      }]
    };
    const attendanceData = {
      labels: ['Presenças', 'Ausências'],
      datasets: [{ data: [selected.presences, Math.max(0, selected.validGames - selected.presences)], backgroundColor: ['#4f46e5', '#334155'], borderWidth: 0 }]
    };

    return (
      <div className="space-y-6 pt-2">
        <button onClick={() => onSelectPlayer('todos')} className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-sm font-black">← Voltar ao elenco</button>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <Card className="xl:col-span-4 text-center relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-indigo-500/20 to-transparent" />
            <div className="relative z-10">
              {selected.fotoUrl ? <img src={selected.fotoUrl} alt={selected.name} className="w-36 h-36 mx-auto rounded-3xl object-cover border-4 border-white dark:border-slate-700 shadow-2xl" crossOrigin="anonymous" /> : <div className="w-36 h-36 mx-auto rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-5xl font-black">{selected.name?.charAt(0)}</div>}
              <h2 className="text-3xl font-black mt-5 text-slate-900 dark:text-white uppercase tracking-tight">{selected.name}</h2>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-indigo-500 mt-1">{selected.posicao || 'Jogador'} • #{selected.numero || '--'}</p>
              <div className="grid grid-cols-2 gap-3 mt-6 text-left">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40"><p className="text-[10px] uppercase font-black text-slate-500">Altura</p><p className="font-black text-slate-900 dark:text-white">{selected.altura || '--'} m</p></div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40"><p className="text-[10px] uppercase font-black text-slate-500">Desde</p><p className="font-black text-slate-900 dark:text-white">{selected.dataEntrada ? new Date(selected.dataEntrada).getFullYear() : '--'}</p></div>
              </div>
              <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 text-left"><p className="text-[10px] uppercase font-black text-slate-500">Estilo de jogo</p><p className="font-bold text-slate-800 dark:text-slate-200">{selected.especialidade || 'Não informada'}</p></div>
            </div>
          </Card>

          <div className="xl:col-span-8 space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ['PTS / jogo', selected.ppjYear.toFixed(1), 'text-orange-500'],
                ['REB / jogo', selected.rpjYear.toFixed(1), 'text-emerald-500'],
                ['AST / jogo', selected.apjYear.toFixed(1), 'text-cyan-500'],
                ['TOC / jogo', selected.tpjYear.toFixed(1), 'text-purple-500']
              ].map(([label, value, color]) => <Card key={label} className="!p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className={`text-3xl font-black mt-2 ${color}`}>{value}</p><p className="text-[10px] text-slate-500 mt-1">{selected.gamesWithStats} súmula(s) em {year}</p></Card>)}
            </div>

            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="w-32 h-32 relative shrink-0">
                  <Doughnut data={attendanceData} options={{ responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false } } }} />
                  <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl font-black text-slate-900 dark:text-white">{selected.percentage.toFixed(0)}%</span></div>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Assiduidade em {year}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{selected.presences} presenças em {selected.validGames} jogos válidos</p>
                  <div className="flex flex-wrap gap-2 mt-3"><span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-bold">{selected.gamesWithStats} jogos com súmula</span>{selected.faults > 0 && <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-xs font-bold">{selected.faults} faltas não justificadas</span>}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <div><h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500" /> Evolução na temporada</h3><p className="text-xs text-slate-500 mt-1">Somente súmulas de {year}; sem mistura com temporadas anteriores.</p></div>
            <div className="flex flex-wrap gap-2">{Object.entries(metricLabels).map(([key, label]) => <button key={key} onClick={() => setMetric(key)} className={`px-3 py-2 rounded-xl text-xs font-black transition ${metric === key ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{label}</button>)}</div>
          </div>
          <div className="h-72">{selected.statEntries.length ? <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }} /> : <div className="h-full flex items-center justify-center text-slate-500 font-bold">Sem súmulas registradas para {year}.</div>}</div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Recordes da temporada</h3>
            {seasonHighs ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[['pts','PTS','text-orange-500'],['reb','REB','text-emerald-500'],['ast','AST','text-cyan-500'],['blk','TOC','text-purple-500']].map(([key,label,color]) => <div key={key} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 text-center"><p className="text-[10px] font-black text-slate-500">{label}</p><p className={`text-3xl font-black ${color}`}>{seasonHighs[key].val}</p><p className="text-[10px] text-slate-500">{fmtDate(seasonHighs[key].date)}</p></div>)}</div> : <p className="text-sm text-slate-500">Sem dados de súmula nesta temporada.</p>}
          </Card>
          <Card>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Recordes da carreira</h3>
            {careerHighs ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[['pts','PTS','text-orange-500'],['reb','REB','text-emerald-500'],['ast','AST','text-cyan-500'],['blk','TOC','text-purple-500']].map(([key,label,color]) => <div key={key} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 text-center"><p className="text-[10px] font-black text-slate-500">{label}</p><p className={`text-3xl font-black ${color}`}>{careerHighs[key].val}</p><p className="text-[10px] text-slate-500">{fmtDate(careerHighs[key].date)}</p></div>)}</div> : <p className="text-sm text-slate-500">Sem dados históricos.</p>}
          </Card>
        </div>

        <Card>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Últimas 5 súmulas de {year}</h3>
          {recentEntries.length ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">{recentEntries.slice().reverse().map(([date, stats]) => <div key={date} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40"><p className="text-xs font-black text-slate-500">{fmtDate(date)}</p><p className="text-2xl font-black text-orange-500 mt-2">{calcPts(stats)} PTS</p><p className="text-xs text-slate-500 mt-1">{num(stats?.reb)} REB • {num(stats?.ast)} AST • {num(stats?.blk)} TOC</p></div>)}</div> : <p className="text-sm text-slate-500">Sem súmulas nesta temporada.</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-2xl border border-indigo-500/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,.35),_transparent_45%)]" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-black uppercase tracking-[0.18em]"><BarChart3 className="w-4 h-4" /> Inteligência da temporada</div>
          <h2 className="text-3xl sm:text-4xl font-black mt-4">Central de Relatórios {year}</h2>
          <p className="text-slate-300 mt-2 max-w-2xl">Assiduidade, produção em quadra e cobertura das súmulas com todos os indicadores limitados à temporada selecionada.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        {[
          [CalendarDays, 'Jogos computados', playedDates.length, 'na temporada', 'text-indigo-500'],
          [Users, 'Atletas participantes', activePlayers, 'com registro válido', 'text-emerald-500'],
          [CheckCircle2, 'Assiduidade média', `${averageAttendance.toFixed(0)}%`, 'do elenco avaliado', 'text-cyan-500'],
          [Target, 'Cobertura de súmulas', `${coveragePct.toFixed(0)}%`, `${statGameDates.length}/${playedDates.length || 0} jogos`, 'text-violet-500']
        ].map(([Icon, label, value, detail, color]) => <Card key={label} className="!p-4 sm:!p-5 relative overflow-hidden"><Icon className={`absolute -right-2 -bottom-2 w-20 h-20 opacity-10 ${color}`} /><p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className={`text-3xl sm:text-4xl font-black mt-2 ${color}`}>{value}</p><p className="text-xs text-slate-500 mt-1">{detail}</p></Card>)}
      </div>

    </div>
  );
}

export default function ReportsDashboard({ data }) {
  const appData = data?.data || data || {};
  const players = appData?.dashboard?.players || EMPTY_LIST;
  const years = useMemo(() => {
    const dates = data?.data?.dashboard?.dates || data?.dashboard?.dates || EMPTY_LIST;
    const available = [...new Set(dates.map(date => String(date).slice(0, 4)))].filter(year => /^\d{4}$/.test(year));
    return available.length ? available.sort((a, b) => b.localeCompare(a)) : [String(new Date().getFullYear())];
  }, [data]);
  const [year, setYear] = useState(years[0]);
  const [selectedPlayer, setSelectedPlayer] = useState('todos');

  useEffect(() => {
    if (!years.includes(year)) setYear(years[0]);
  }, [year, years]);
  useEffect(() => {
    if (selectedPlayer !== 'todos' && !players.some(player => player.name === selectedPlayer)) setSelectedPlayer('todos');
  }, [players, selectedPlayer]);

  return <div className="space-y-5 pb-24 md:pb-8">
    <div className="rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/85 dark:bg-slate-800/70 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-end gap-3">
      <label className="flex-1 text-xs font-black text-slate-500">Temporada
        <select aria-label="Temporada" value={year} onChange={event => setYear(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm font-bold text-slate-900 dark:text-white">{years.map(value => <option key={value} value={value}>{value}</option>)}</select>
      </label>
      <label className="flex-1 text-xs font-black text-slate-500">Atleta
        <select aria-label="Atleta" value={selectedPlayer} onChange={event => setSelectedPlayer(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm font-bold text-slate-900 dark:text-white"><option value="todos">Todos os atletas</option>{players.map(player => <option key={player.name} value={player.name}>{player.name}</option>)}</select>
      </label>
      <div className="flex flex-wrap gap-2"><ReportsPdf data={data} year={year} selectedPlayer={selectedPlayer} /></div>
    </div>
    <ReportsExperience data={data} year={year} selectedPlayer={selectedPlayer} onSelectPlayer={setSelectedPlayer} />
    {selectedPlayer === 'todos' && <ReportsRankingCompact data={data} year={year} onSelectPlayer={setSelectedPlayer} />}
    <ReportsStatsByDate data={data} year={year} selectedPlayer={selectedPlayer} />
  </div>;
}
