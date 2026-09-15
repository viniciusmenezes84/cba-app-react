import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, AlertCircle, Award, CalendarDays, CheckCircle, Crown, Flame, Star, Trophy, Users } from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwNXGI4Cc5qGBye-IfWW_qqUcJ04NfArulExPXE4jgX0SZhWAmeWCjjKg2U9FFfHkHE/exec';
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const Card = ({ children, className = '' }) => (
  <div className={`bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 shadow-xl rounded-3xl p-6 ${className}`}>{children}</div>
);

function Insights({ data }) {
  const appData = data?.data || data || {};
  const players = appData?.dashboard?.players || [];
  const dates = appData?.dashboard?.dates || [];
  const years = useMemo(() => [...new Set(dates.map(d => d.substring(0, 4)))].sort((a, b) => b - a), [dates]);
  const [year, setYear] = useState(years[0] || new Date().getFullYear().toString());

  useEffect(() => {
    if (years.length && !years.includes(year)) setYear(years[0]);
  }, [years, year]);

  const playedDates = useMemo(() => [...new Set(dates)]
    .filter(date => date.startsWith(year))
    .filter(date => players.some(player => player.attendance?.[date]?.includes('✅')))
    .sort(), [dates, players, year]);

  const playerStats = useMemo(() => players.map(player => {
    let valid = 0;
    let present = 0;
    playedDates.forEach(date => {
      const status = player.attendance?.[date]?.trim() || '';
      if (status && status !== 'N/A') {
        valid += 1;
        if (status.includes('✅')) present += 1;
      }
    });
    return { ...player, valid, present, pct: valid ? (present / valid) * 100 : 0 };
  }), [players, playedDates]);

  const gameSeries = useMemo(() => playedDates.map(date => ({
    date,
    count: players.reduce((sum, player) => sum + (player.attendance?.[date]?.includes('✅') ? 1 : 0), 0)
  })), [playedDates, players]);

  const totalPresences = gameSeries.reduce((sum, item) => sum + item.count, 0);
  const avgPlayers = gameSeries.length ? totalPresences / gameSeries.length : 0;
  const totalValid = playerStats.reduce((sum, player) => sum + player.valid, 0);
  const attendancePct = totalValid ? (playerStats.reduce((sum, player) => sum + player.present, 0) / totalValid) * 100 : 0;
  const eligible = playerStats.filter(player => player.valid > 0 && String(player.isEligibleForHoF).toUpperCase() !== 'FALSE');
  const topPresence = [...eligible].sort((a, b) => b.present - a.present || b.pct - a.pct)[0];
  const topPct = [...eligible].sort((a, b) => b.pct - a.pct || b.present - a.present)[0];
  const bestGame = gameSeries.length ? [...gameSeries].sort((a, b) => b.count - a.count)[0] : null;
  const worstGame = gameSeries.length ? [...gameSeries].sort((a, b) => a.count - b.count)[0] : null;
  const trend = gameSeries.length > 1 ? gameSeries.at(-1).count - gameSeries.at(-2).count : 0;

  const monthly = useMemo(() => MONTHS.map((name, index) => {
    const games = gameSeries.filter(item => Number(item.date.substring(5, 7)) - 1 === index);
    const total = games.reduce((sum, item) => sum + item.count, 0);
    return { name, games: games.length, total, avg: games.length ? total / games.length : 0 };
  }), [gameSeries]);
  const bestMonth = [...monthly].filter(item => item.games).sort((a, b) => b.avg - a.avg)[0];

  const bands = playerStats.reduce((result, player) => {
    if (!player.valid) return result;
    if (player.pct >= 80) result.high += 1;
    else if (player.pct >= 60) result.mid += 1;
    else result.low += 1;
    return result;
  }, { high: 0, mid: 0, low: 0 });

  const ranking = [...playerStats].filter(player => player.valid).sort((a, b) => b.pct - a.pct || b.present - a.present).slice(0, 8);
  const axis = '#94a3b8';
  const grid = 'rgba(148,163,184,.10)';
  const common = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: grid }, ticks: { color: axis } }, x: { grid: { display: false }, ticks: { color: axis } } } };

  const perGameData = {
    labels: gameSeries.map(item => item.date.split('-').slice(1).reverse().join('/')),
    datasets: [
      { label: 'Atletas presentes', data: gameSeries.map(item => item.count), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.14)', fill: true, tension: .35, borderWidth: 3, pointRadius: 4 },
      { label: 'Média', data: gameSeries.map(() => Number(avgPlayers.toFixed(1))), borderColor: '#818cf8', borderDash: [6, 6], borderWidth: 2, pointRadius: 0 }
    ]
  };
  const perGameOptions = { ...common, plugins: { legend: { display: true, position: 'top', align: 'end', labels: { color: '#cbd5e1', usePointStyle: true, boxWidth: 8 } } } };
  const monthlyData = { labels: MONTHS, datasets: [{ label: 'Total de Presenças', data: monthly.map(item => item.total), backgroundColor: '#818cf8', borderRadius: 8, maxBarThickness: 46 }] };
  const bandData = { labels: ['80% ou mais', '60% a 79%', 'Abaixo de 60%'], datasets: [{ data: [bands.high, bands.mid, bands.low], backgroundColor: ['#22c55e', '#f59e0b', '#f43f5e'], borderColor: '#0f172a', borderWidth: 4 }] };
  const bandOptions = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1', usePointStyle: true, padding: 16 } } } };
  const rankData = { labels: ranking.map(player => player.name), datasets: [{ data: ranking.map(player => Number(player.pct.toFixed(1))), backgroundColor: ranking.map((_, index) => index === 0 ? '#f59e0b' : '#6366f1'), borderRadius: 8, maxBarThickness: 25 }] };
  const rankOptions = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 100, grid: { color: grid }, ticks: { color: axis, callback: value => `${value}%` } }, y: { grid: { display: false }, ticks: { color: axis, font: { weight: 'bold' } } } } };

  const yearlyData = useMemo(() => {
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
    return {
      labels: MONTHS,
      datasets: years.map((itemYear, index) => {
        const values = new Array(12).fill(0);
        [...new Set(dates)].filter(date => date.startsWith(itemYear) && players.some(player => player.attendance?.[date]?.includes('✅'))).forEach(date => {
          values[Number(date.substring(5, 7)) - 1] += players.reduce((sum, player) => sum + (player.attendance?.[date]?.includes('✅') ? 1 : 0), 0);
        });
        return { label: itemYear, data: values, borderColor: colors[index % colors.length], tension: .4, borderWidth: itemYear === year ? 4 : 2, pointRadius: itemYear === year ? 4 : 2 };
      })
    };
  }, [years, dates, players, year]);
  const yearlyOptions = { ...common, plugins: { legend: { display: true, position: 'top', align: 'end', labels: { color: '#cbd5e1', usePointStyle: true } } } };
  const fmt = date => date ? date.split('-').reverse().join('/') : '--';

  return (
    <div className="space-y-6 pt-6">
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-indigo-500/10 shadow-2xl p-6 sm:p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-black uppercase tracking-[0.2em]"><Activity className="w-4 h-4" /> Central de presença</div><h1 className="text-3xl sm:text-4xl font-black mt-4">Visão do elenco em {year}</h1><p className="text-slate-300 mt-2">Quórum, regularidade e evolução da participação em uma experiência mais analítica.</p><div className="flex flex-wrap gap-2 mt-5"><span className="px-3 py-1.5 rounded-full bg-emerald-400/10 text-emerald-300 text-xs font-bold">{gameSeries.length} jogos</span><span className="px-3 py-1.5 rounded-full bg-indigo-400/10 text-indigo-200 text-xs font-bold">{avgPlayers.toFixed(1)} atletas/jogo</span>{gameSeries.length > 1 && <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${trend >= 0 ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>Último jogo: {trend >= 0 ? '+' : ''}{trend} vs anterior</span>}</div></div>
          <div><label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Temporada</label><select value={year} onChange={event => setYear(event.target.value)} className="p-3.5 bg-white/10 border border-white/15 rounded-2xl font-black text-white outline-none">{years.map(item => <option className="text-slate-900" key={item}>{item}</option>)}</select></div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        {[[CalendarDays, 'Jogos realizados', gameSeries.length, 'na temporada', 'text-indigo-400'], [Users, 'Quórum médio', avgPlayers.toFixed(1), 'atletas por jogo', 'text-emerald-400'], [CheckCircle, 'Assiduidade média', `${attendancePct.toFixed(0)}%`, 'do elenco', 'text-cyan-400'], [Activity, 'Atletas cadastrados', players.length, 'no elenco atual', 'text-violet-400']].map(([Icon, label, value, detail, color]) => <Card key={label} className="!p-4 sm:!p-5 relative overflow-hidden"><Icon className={`absolute -right-2 -bottom-2 w-20 h-20 opacity-10 ${color}`} /><p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className={`text-3xl sm:text-4xl font-black mt-2 ${color}`}>{value}</p><p className="text-xs text-slate-500 mt-1">{detail}</p></Card>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Card className="xl:col-span-5 bg-gradient-to-br from-orange-500 to-rose-600 !text-white border-none relative overflow-hidden"><Trophy className="absolute -right-8 -bottom-10 w-44 h-44 opacity-15" /><p className="text-orange-100 text-xs font-black uppercase tracking-wider">Destaque do ano</p><p className="text-3xl font-black mt-4">{topPresence?.name || '--'}</p><p className="text-orange-100 mt-1">{topPresence?.present || 0} presenças em {topPresence?.valid || 0} jogos válidos</p><span className="inline-block mt-5 px-3 py-1.5 rounded-full bg-white/15 text-sm font-black">{topPresence?.pct?.toFixed(0) || 0}% de assiduidade</span></Card>
        <Card className="xl:col-span-3 relative overflow-hidden"><Crown className="absolute -right-3 -bottom-3 w-28 h-28 text-amber-500/10" /><p className="text-xs font-black uppercase text-slate-500">Maior média</p><p className="text-2xl font-black text-white mt-4 truncate">{topPct?.name || '--'}</p><p className="text-4xl font-black text-amber-400 mt-2">{topPct?.pct?.toFixed(0) || 0}%</p></Card>
        <Card className="xl:col-span-4"><p className="text-xs font-black uppercase text-slate-500">Leitura rápida</p><p className="text-xl font-black text-white mt-4">{bands.high} atletas acima de 80%</p><p className="text-sm text-slate-400 mt-1">{bands.low > 0 ? `${bands.low} atleta(s) estão abaixo de 60% e merecem atenção.` : 'Nenhum atleta avaliado está abaixo de 60%.'}</p></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="!p-5"><div className="flex gap-3 items-center"><Flame className="w-5 h-5 text-emerald-400" /><div><p className="text-xs font-black uppercase text-slate-500">Maior quórum</p><p className="text-xl font-black text-white">{bestGame?.count || 0} atletas</p></div></div><p className="text-xs text-slate-500 mt-3">{fmt(bestGame?.date)}</p></Card>
        <Card className="!p-5"><div className="flex gap-3 items-center"><Award className="w-5 h-5 text-amber-400" /><div><p className="text-xs font-black uppercase text-slate-500">Melhor mês</p><p className="text-xl font-black text-white">{bestMonth?.name || '--'}</p></div></div><p className="text-xs text-slate-500 mt-3">{bestMonth ? `${bestMonth.avg.toFixed(1)} atletas/jogo` : 'Sem jogos'}</p></Card>
        <Card className="!p-5"><div className="flex gap-3 items-center"><AlertCircle className="w-5 h-5 text-rose-400" /><div><p className="text-xs font-black uppercase text-slate-500">Menor quórum</p><p className="text-xl font-black text-white">{worstGame?.count || 0} atletas</p></div></div><p className="text-xs text-slate-500 mt-3">{fmt(worstGame?.date)}</p></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Card className="xl:col-span-8"><h3 className="text-lg font-black text-white flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-400" /> Quórum jogo a jogo</h3><p className="text-xs text-slate-500 mt-1 mb-5">Mostra a evolução real de participantes em cada encontro.</p><div className="h-72 sm:h-80"><Line data={perGameData} options={perGameOptions} /></div></Card>
        <Card className="xl:col-span-4"><h3 className="text-lg font-black text-white flex items-center gap-2"><Users className="w-5 h-5 text-indigo-400" /> Faixas de assiduidade</h3><p className="text-xs text-slate-500 mt-1 mb-3">Distribuição dos atletas por frequência.</p><div className="h-72"><Doughnut data={bandData} options={bandOptions} /></div></Card>
        <Card className="xl:col-span-7"><h3 className="text-lg font-black text-white">Tendência de Quórum (Mensal)</h3><p className="text-xs text-slate-500 mt-1 mb-5">Gráfico atual mantido: total de presenças acumuladas por mês.</p><div className="h-72"><Bar data={monthlyData} options={common} /></div></Card>
        <Card className="xl:col-span-5"><h3 className="text-lg font-black text-white flex items-center gap-2"><Star className="w-5 h-5 text-amber-400" /> Top assiduidade</h3><p className="text-xs text-slate-500 mt-1 mb-5">Os oito atletas mais regulares da temporada.</p><div className="h-72"><Bar data={rankData} options={rankOptions} /></div></Card>
        <Card className="xl:col-span-12"><h3 className="text-lg font-black text-white flex items-center gap-2"><Activity className="w-5 h-5 text-violet-400" /> Comparativo Anual de Presenças</h3><p className="text-xs text-slate-500 mt-1 mb-5">Gráfico atual mantido com destaque para o ano selecionado.</p><div className="h-72 sm:h-80"><Line data={yearlyData} options={yearlyOptions} /></div></Card>
      </div>
    </div>
  );
}

export default function PresenceDashboardBridge() {
  const [mountNode, setMountNode] = useState(null);
  const [data, setData] = useState(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    fetch(SCRIPT_URL, {
      method: 'POST', mode: 'cors', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getInitialAppData' })
    }).then(response => response.json()).then(setData).catch(() => setData(null));
  }, []);

  useEffect(() => {
    let node = null;
    const sync = () => {
      const presenceButton = document.querySelector('button[title="Presença"]');
      const isPresence = Boolean(presenceButton?.className?.includes('scale-110'));
      setActive(isPresence);
      const container = document.querySelector('main .max-w-7xl > div > div.space-y-6');
      if (!container) return;

      if (!node || !node.isConnected) {
        node = document.createElement('div');
        node.dataset.presenceDashboardV2 = 'true';
        container.appendChild(node);
        setMountNode(node);
      }

      [...container.children].forEach((child, index) => {
        if (child === node) return;
        child.style.display = isPresence && index > 0 ? 'none' : '';
      });
      node.style.display = isPresence ? '' : 'none';
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      if (node?.isConnected) node.remove();
    };
  }, []);

  if (!active || !mountNode || !data) return null;
  return createPortal(<Insights data={data} />, mountNode);
}
