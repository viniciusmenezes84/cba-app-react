import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, Award, CalendarDays, CheckCircle, Crown, DollarSign, Flame, MapPin, Star, Trophy, Users, X } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const MONTHS_MAP = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const GlassCard = ({ children, className = '', onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: 'easeOut' }}
    onClick={onClick}
    className={`bg-white/80 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-xl rounded-3xl p-6 ${onClick ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''} ${className}`}
  >
    {children}
  </motion.div>
);

const ProximoJogoCard = ({ game, currentUser, onAttendanceUpdate }) => {
  if (!game) {
    return (
      <GlassCard className="text-center bg-gradient-to-br from-indigo-50/50 to-white/50 dark:from-slate-800/80 dark:to-slate-800/50">
        <h2 className="text-2xl font-black mb-2 text-slate-800 dark:text-slate-100">Nenhum jogo agendado</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Fique atento para novas marcações.</p>
      </GlassCard>
    );
  }

  const isConfirmed = game.confirmados.includes(currentUser.name);
  const gameDate = new Date(`${game.data}T${game.horario}`);

  return (
    <GlassCard className="relative overflow-hidden bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/90 dark:to-slate-800/60 border-l-4 border-l-indigo-500">
      <h2 className="text-xl text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider mb-4 flex items-center gap-2"><Trophy className="w-5 h-5" /> Próximo Jogo</h2>
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-3 w-full md:w-auto relative z-10">
          <div className="flex items-center text-slate-800 dark:text-slate-100 gap-3">
            <CalendarDays className="w-6 h-6 text-slate-500" />
            <span className="text-xl font-bold">{gameDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })} às {game.horario}</span>
          </div>
          <div className="flex items-center text-slate-600 dark:text-slate-300 gap-3"><MapPin className="w-6 h-6 text-slate-500" /><span className="text-lg font-medium">{game.local}</span></div>
          <div className="flex items-center text-slate-600 dark:text-slate-300 gap-3"><Flame className="w-6 h-6 text-orange-500" /><span className="text-lg font-medium"><strong className="text-indigo-600 dark:text-indigo-400">{game.confirmados.length}</strong> Confirmados</span></div>
        </div>
        <div className="w-full md:w-64 shrink-0 z-10">
          {isConfirmed ? (
            <button onClick={() => onAttendanceUpdate(game.id, 'withdraw')} className="w-full font-bold py-4 px-6 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white shadow-lg flex items-center justify-center gap-2"><X className="w-5 h-5" /> Desistir</button>
          ) : (
            <button onClick={() => onAttendanceUpdate(game.id, 'confirm')} className="w-full font-bold py-4 px-6 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> Estou Dentro!</button>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

export default function PresencaDashboardV2({ allPlayersData, dates, financeData, isLoading, error, nextGame, currentUser, onAttendanceUpdate }) {
  const availableYears = useMemo(() => {
    if (!dates || dates.length === 0) return [new Date().getFullYear().toString()];
    return [...new Set(dates.map(d => d.substring(0, 4)))].sort((a, b) => b - a);
  }, [dates]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0]);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) setSelectedYear(availableYears[0]);
  }, [availableYears, selectedYear]);

  const playedDatesByYear = useMemo(() => {
    const uniqueDates = [...new Set(dates || [])];
    return uniqueDates
      .filter(d => d.startsWith(selectedYear))
      .filter(date => allPlayersData.some(p => p.attendance[date]?.includes('✅')))
      .sort((a, b) => a.localeCompare(b));
  }, [dates, selectedYear, allPlayersData]);

  const playersWithStats = useMemo(() => allPlayersData.map(player => {
    let validGames = 0;
    let presences = 0;
    playedDatesByYear.forEach(date => {
      const status = player.attendance[date]?.trim() || '';
      if (status !== '' && status !== 'N/A') {
        validGames += 1;
        if (status.includes('✅')) presences += 1;
      }
    });
    return { ...player, validGames, presences, percentage: validGames ? (presences / validGames) * 100 : 0 };
  }), [allPlayersData, playedDatesByYear]);

  const eligiblePlayers = playersWithStats.filter(p => p.validGames > 0 && String(p.isEligibleForHoF).toUpperCase() !== 'FALSE');
  const topPresencePlayer = [...eligiblePlayers].sort((a, b) => b.presences - a.presences || b.percentage - a.percentage)[0];
  const topPercentagePlayer = [...eligiblePlayers].sort((a, b) => b.percentage - a.percentage || b.presences - a.presences)[0];

  const gameAttendanceSeries = useMemo(() => playedDatesByYear.map(date => ({
    date,
    count: allPlayersData.reduce((total, player) => total + (player.attendance[date]?.includes('✅') ? 1 : 0), 0)
  })), [playedDatesByYear, allPlayersData]);

  const totalPresences = gameAttendanceSeries.reduce((sum, item) => sum + item.count, 0);
  const jogosRealizados = gameAttendanceSeries.length;
  const averagePlayersPerGame = jogosRealizados ? totalPresences / jogosRealizados : 0;

  const totalValidPlayerGames = playersWithStats.reduce((sum, player) => sum + player.validGames, 0);
  const totalGlobalPresences = playersWithStats.reduce((sum, player) => sum + player.presences, 0);
  const globalAverage = totalValidPlayerGames ? (totalGlobalPresences / totalValidPlayerGames) * 100 : 0;

  const bestGame = gameAttendanceSeries.length ? [...gameAttendanceSeries].sort((a, b) => b.count - a.count)[0] : null;
  const lowestGame = gameAttendanceSeries.length ? [...gameAttendanceSeries].sort((a, b) => a.count - b.count)[0] : null;
  const latestGameTrend = gameAttendanceSeries.length >= 2 ? gameAttendanceSeries.at(-1).count - gameAttendanceSeries.at(-2).count : 0;

  const monthlySummary = useMemo(() => MONTHS_MAP.map((month, monthIndex) => {
    const games = gameAttendanceSeries.filter(item => parseInt(item.date.substring(5, 7), 10) - 1 === monthIndex);
    const monthTotal = games.reduce((sum, item) => sum + item.count, 0);
    return { month, games: games.length, total: monthTotal, average: games.length ? monthTotal / games.length : 0 };
  }), [gameAttendanceSeries]);

  const bestMonth = [...monthlySummary].filter(item => item.games).sort((a, b) => b.average - a.average)[0] || null;
  const attendanceBands = playersWithStats.reduce((acc, player) => {
    if (!player.validGames) return acc;
    if (player.percentage >= 80) acc.excellent += 1;
    else if (player.percentage >= 60) acc.regular += 1;
    else acc.attention += 1;
    return acc;
  }, { excellent: 0, regular: 0, attention: 0 });

  const topAttendancePlayers = [...playersWithStats]
    .filter(player => player.validGames > 0)
    .sort((a, b) => b.percentage - a.percentage || b.presences - a.presences)
    .slice(0, 8);

  const myFinanceRecord = financeData?.paymentStatus?.find(p => p.player.toLowerCase() === currentUser.name.toLowerCase());
  let myDebt = 0;
  if (myFinanceRecord && financeData?.paymentHeaders) {
    const monthMap = { janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11 };
    const currentMonth = new Date().getMonth();
    financeData.paymentHeaders.forEach(month => {
      const status = String(myFinanceRecord.statuses[month] || '').trim().toLowerCase();
      if (status !== 'isento' && status !== '20' && monthMap[month.toLowerCase()] < currentMonth) myDebt += 20;
    });
  }

  const isDark = true;
  const axisColor = '#94a3b8';
  const gridColor = 'rgba(148, 163, 184, 0.10)';
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: axisColor } },
      x: { grid: { display: false }, ticks: { color: axisColor } }
    }
  };

  const monthlyChart = {
    labels: MONTHS_MAP,
    datasets: [{ label: 'Total de Presenças', data: monthlySummary.map(item => item.total), backgroundColor: '#818cf8', borderRadius: 8, maxBarThickness: 46 }]
  };

  const perGameChart = {
    labels: gameAttendanceSeries.map(item => {
      const [, month, day] = item.date.split('-');
      return `${day}/${month}`;
    }),
    datasets: [
      { label: 'Atletas presentes', data: gameAttendanceSeries.map(item => item.count), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.14)', pointBackgroundColor: '#22c55e', borderWidth: 3, pointRadius: 4, tension: .35, fill: true },
      { label: 'Média do ano', data: gameAttendanceSeries.map(() => Number(averagePlayersPerGame.toFixed(1))), borderColor: '#818cf8', borderDash: [6, 6], borderWidth: 2, pointRadius: 0 }
    ]
  };

  const perGameOptions = {
    ...baseOptions,
    plugins: { legend: { display: true, position: 'top', align: 'end', labels: { color: '#cbd5e1', usePointStyle: true, boxWidth: 8, font: { weight: 'bold' } } } }
  };

  const bandChart = {
    labels: ['80% ou mais', '60% a 79%', 'Abaixo de 60%'],
    datasets: [{ data: [attendanceBands.excellent, attendanceBands.regular, attendanceBands.attention], backgroundColor: ['#22c55e', '#f59e0b', '#f43f5e'], borderColor: '#0f172a', borderWidth: 4, hoverOffset: 8 }]
  };

  const bandOptions = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1', usePointStyle: true, padding: 18, font: { weight: 'bold' } } } } };

  const rankingChart = {
    labels: topAttendancePlayers.map(player => player.name),
    datasets: [{ label: 'Assiduidade', data: topAttendancePlayers.map(player => Number(player.percentage.toFixed(1))), backgroundColor: topAttendancePlayers.map((_, index) => index === 0 ? '#f59e0b' : '#6366f1'), borderRadius: 8, maxBarThickness: 26 }]
  };

  const rankingOptions = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${context.raw}% de assiduidade` } } },
    scales: { x: { beginAtZero: true, max: 100, grid: { color: gridColor }, ticks: { color: axisColor, callback: value => `${value}%` } }, y: { grid: { display: false }, ticks: { color: axisColor, font: { weight: 'bold' } } } }
  };

  const yearlyComparisonData = useMemo(() => {
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
    return {
      labels: MONTHS_MAP,
      datasets: availableYears.map((year, index) => {
        const totals = new Array(12).fill(0);
        [...new Set(dates || [])]
          .filter(date => date.startsWith(year) && allPlayersData.some(player => player.attendance[date]?.includes('✅')))
          .forEach(date => {
            const monthIndex = parseInt(date.substring(5, 7), 10) - 1;
            totals[monthIndex] += allPlayersData.reduce((count, player) => count + (player.attendance[date]?.includes('✅') ? 1 : 0), 0);
          });
        return { label: year, data: totals, borderColor: colors[index % colors.length], backgroundColor: colors[index % colors.length] + '33', tension: .4, borderWidth: year === selectedYear ? 4 : 2, pointRadius: year === selectedYear ? 4 : 2 };
      })
    };
  }, [availableYears, dates, allPlayersData, selectedYear]);

  const yearlyOptions = { ...baseOptions, plugins: { legend: { display: true, position: 'top', align: 'end', labels: { color: '#cbd5e1', usePointStyle: true, font: { weight: 'bold' } } } } };
  const formatDate = date => date ? date.split('-').reverse().join('/') : '--';

  if (isLoading) return <div className="py-20 text-center text-slate-400">Sincronizando quadra...</div>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <GlassCard className="relative overflow-hidden !p-0 border-none bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 !text-white">
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-indigo-200 text-xs font-black uppercase tracking-[0.2em] mb-4"><Activity className="w-4 h-4" /> Central de presença</div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">Visão do elenco em {selectedYear}</h1>
            <p className="text-slate-300 mt-3 max-w-2xl text-sm sm:text-base">Quórum, regularidade e evolução da participação em uma leitura rápida da temporada.</p>
            <div className="flex flex-wrap gap-2 mt-5">
              <span className="px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-bold">{jogosRealizados} jogos realizados</span>
              <span className="px-3 py-1.5 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-indigo-200 text-xs font-bold">{averagePlayersPerGame.toFixed(1)} atletas/jogo</span>
              {gameAttendanceSeries.length >= 2 && <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${latestGameTrend >= 0 ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-300' : 'bg-rose-400/10 border-rose-400/20 text-rose-300'}`}>Último jogo: {latestGameTrend >= 0 ? '+' : ''}{latestGameTrend} vs. anterior</span>}
            </div>
          </div>
          <div className="w-full lg:w-auto min-w-[180px]">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Temporada</label>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="w-full p-3.5 bg-white/10 border border-white/15 rounded-2xl outline-none font-black text-white focus:ring-2 focus:ring-indigo-400"><option disabled hidden>{selectedYear}</option>{availableYears.map(year => <option className="text-slate-900" key={year} value={year}>{year}</option>)}</select>
          </div>
        </div>
      </GlassCard>

      <ProximoJogoCard game={nextGame} currentUser={currentUser} onAttendanceUpdate={onAttendanceUpdate} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        {[[CalendarDays, 'Jogos realizados', jogosRealizados, 'na temporada', 'text-indigo-500'], [Users, 'Quórum médio', averagePlayersPerGame.toFixed(1), 'atletas por jogo', 'text-emerald-500'], [CheckCircle, 'Assiduidade média', `${globalAverage.toFixed(0)}%`, 'do elenco', 'text-cyan-500'], [Activity, 'Atletas cadastrados', allPlayersData.length, 'no elenco atual', 'text-violet-500']].map(([Icon, label, value, detail, color]) => (
          <GlassCard key={label} className="!p-4 sm:!p-5 relative overflow-hidden"><Icon className={`absolute -right-2 -bottom-2 w-20 h-20 opacity-10 ${color}`} /><p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className={`text-3xl sm:text-4xl font-black mt-2 ${color}`}>{value}</p><p className="text-xs text-slate-500 mt-1">{detail}</p></GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <GlassCard className="xl:col-span-5 bg-gradient-to-br from-orange-500 to-rose-600 !text-white border-none relative overflow-hidden"><Trophy className="absolute -right-8 -bottom-10 opacity-15 w-44 h-44" /><div className="relative z-10"><p className="text-orange-100 text-xs font-black uppercase tracking-wider">Maior presença</p><p className="text-3xl sm:text-4xl font-black mt-4">{topPresencePlayer?.name || '--'}</p><p className="text-orange-100 mt-1">{topPresencePlayer?.presences || 0} presenças em {topPresencePlayer?.validGames || 0} jogos</p><span className="inline-flex mt-5 px-3 py-1.5 rounded-full bg-white/15 text-sm font-black">{topPresencePlayer?.percentage?.toFixed(0) || 0}% de assiduidade</span></div></GlassCard>
        <GlassCard className="xl:col-span-3 relative overflow-hidden"><Crown className="absolute -right-3 -bottom-3 w-28 h-28 text-amber-500/10" /><p className="text-xs font-black uppercase tracking-wider text-slate-500">Melhor percentual</p><p className="text-2xl font-black text-slate-900 dark:text-white mt-4 truncate">{topPercentagePlayer?.name || '--'}</p><p className="text-4xl font-black text-amber-500 mt-2">{topPercentagePlayer?.percentage?.toFixed(0) || 0}%</p></GlassCard>
        <GlassCard className={`xl:col-span-4 relative overflow-hidden ${myDebt > 0 ? 'bg-gradient-to-br from-rose-500 to-red-600 !text-white border-none' : 'bg-gradient-to-br from-emerald-500 to-teal-600 !text-white border-none'}`} onClick={() => window.navigateToTab && window.navigateToTab('financas')}><DollarSign className="absolute -right-5 -bottom-5 w-36 h-36 opacity-15" /><div className="relative z-10"><p className="text-xs font-black uppercase tracking-wider opacity-80">Meu status financeiro</p><p className="text-2xl font-black mt-4">{myDebt > 0 ? 'Mensalidade atrasada' : 'Tudo em dia!'}</p><p className="text-sm mt-1 opacity-90">{myDebt > 0 ? `Pendências de R$ ${myDebt.toFixed(2)}.` : 'Obrigado por fortalecer o CBA.'}</p></div></GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="!p-5"><div className="flex items-center gap-3"><Flame className="w-5 h-5 text-emerald-500" /><div><p className="text-xs font-black uppercase text-slate-500">Maior quórum</p><p className="text-xl font-black text-slate-900 dark:text-white">{bestGame?.count || 0} atletas</p></div></div><p className="text-xs text-slate-500 mt-3">{bestGame ? formatDate(bestGame.date) : 'Sem jogos'}</p></GlassCard>
        <GlassCard className="!p-5"><div className="flex items-center gap-3"><Award className="w-5 h-5 text-amber-500" /><div><p className="text-xs font-black uppercase text-slate-500">Melhor mês</p><p className="text-xl font-black text-slate-900 dark:text-white">{bestMonth?.month || '--'}</p></div></div><p className="text-xs text-slate-500 mt-3">{bestMonth ? `${bestMonth.average.toFixed(1)} atletas/jogo` : 'Sem jogos'}</p></GlassCard>
        <GlassCard className="!p-5"><div className="flex items-center gap-3"><AlertCircle className="w-5 h-5 text-rose-500" /><div><p className="text-xs font-black uppercase text-slate-500">Menor quórum</p><p className="text-xl font-black text-slate-900 dark:text-white">{lowestGame?.count || 0} atletas</p></div></div><p className="text-xs text-slate-500 mt-3">{lowestGame ? formatDate(lowestGame.date) : 'Sem jogos'}</p></GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <GlassCard className="xl:col-span-8 !p-5 sm:!p-6"><h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-500" /> Quórum jogo a jogo</h3><p className="text-xs text-slate-500 mt-1 mb-5">Evolução da quantidade de atletas presentes em cada encontro.</p><div className="h-72 sm:h-80"><Line data={perGameChart} options={perGameOptions} /></div></GlassCard>
        <GlassCard className="xl:col-span-4 !p-5 sm:!p-6"><h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> Faixas de assiduidade</h3><p className="text-xs text-slate-500 mt-1 mb-3">Distribuição do elenco por percentual de presença.</p><div className="h-72"><Doughnut data={bandChart} options={bandOptions} /></div></GlassCard>
        <GlassCard className="xl:col-span-7 !p-5 sm:!p-6"><h3 className="text-lg font-black text-slate-900 dark:text-white">Tendência de Quórum (Mensal)</h3><p className="text-xs text-slate-500 mt-1 mb-5">Gráfico atual preservado: total acumulado de presenças por mês.</p><div className="h-72"><Bar data={monthlyChart} options={baseOptions} /></div></GlassCard>
        <GlassCard className="xl:col-span-5 !p-5 sm:!p-6"><h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /> Top assiduidade</h3><p className="text-xs text-slate-500 mt-1 mb-5">Os oito atletas mais regulares da temporada.</p><div className="h-72"><Bar data={rankingChart} options={rankingOptions} /></div></GlassCard>
        <GlassCard className="xl:col-span-12 !p-5 sm:!p-6"><h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Activity className="w-5 h-5 text-violet-500" /> Comparativo Anual de Presenças</h3><p className="text-xs text-slate-500 mt-1 mb-5">Gráfico atual preservado, com destaque para a temporada selecionada.</p><div className="h-72 sm:h-80"><Line data={yearlyComparisonData} options={yearlyOptions} /></div></GlassCard>
      </div>
    </div>
  );
}
