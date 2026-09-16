import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, Search, Users } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwNXGI4Cc5qGBye-IfWW_qqUcJ04NfArulExPXE4jgX0SZhWAmeWCjjKg2U9FFfHkHE/exec';

const num = value => Number(value || 0);
const calcPts = stats => (num(stats?.pts2) * 2) + (num(stats?.pts3) * 3);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white/85 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xl rounded-3xl p-4 sm:p-5 ${className}`}>
    {children}
  </div>
);

function buildReport(players, dates, year) {
  const playedDates = [...new Set(dates || [])]
    .filter(date => date.startsWith(year))
    .filter(date => players.some(player => player.attendance?.[date]?.includes('✅')))
    .sort();

  return players.map(player => {
    let validGames = 0;
    let presences = 0;
    let faults = 0;

    playedDates.forEach(date => {
      const status = player.attendance?.[date]?.trim() || '';
      if (!status || status === 'N/A') return;
      validGames += 1;
      if (status.includes('✅')) presences += 1;
      if (['NÃO JUSTIFICOU', 'NAO JUSTIFICOU'].includes(status.toUpperCase())) faults += 1;
    });

    const statEntries = Object.entries(player.dailyStats || {})
      .filter(([date]) => date.startsWith(year));

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
}

const CONFIG = {
  presencas: {
    label: 'Assiduidade',
    tab: 'Assiduidade',
    short: '%',
    value: player => player.percentage,
    avg: player => `${player.presences}/${player.validGames}`,
    detail: player => `${player.presences}/${player.validGames} presenças`,
    valid: player => player.validGames > 0,
    sort: (a, b) => b.percentage - a.percentage || b.presences - a.presences,
    color: '#6366f1'
  },
  pontos: {
    label: 'Pontos',
    tab: 'Cestinhas 🔥',
    short: 'PTS',
    value: player => player.yearlyPoints,
    avg: player => player.ppjYear.toFixed(1),
    detail: player => `${player.gamesWithStats} súmula(s) • ${player.ppjYear.toFixed(1)}/j`,
    valid: player => player.gamesWithStats > 0,
    sort: (a, b) => b.yearlyPoints - a.yearlyPoints,
    color: '#f97316'
  },
  rebotes: {
    label: 'Rebotes',
    tab: 'Rei do Garrafão 🛡️',
    short: 'REB',
    value: player => player.yearlyReb,
    avg: player => player.rpjYear.toFixed(1),
    detail: player => `${player.gamesWithStats} súmula(s) • ${player.rpjYear.toFixed(1)}/j`,
    valid: player => player.gamesWithStats > 0,
    sort: (a, b) => b.yearlyReb - a.yearlyReb,
    color: '#10b981'
  },
  assistencias: {
    label: 'Assistências',
    tab: 'Garçom 🎩',
    short: 'AST',
    value: player => player.yearlyAst,
    avg: player => player.apjYear.toFixed(1),
    detail: player => `${player.gamesWithStats} súmula(s) • ${player.apjYear.toFixed(1)}/j`,
    valid: player => player.gamesWithStats > 0,
    sort: (a, b) => b.yearlyAst - a.yearlyAst,
    color: '#06b6d4'
  },
  tocos: {
    label: 'Tocos',
    tab: 'Muralha 🧱',
    short: 'TOC',
    value: player => player.yearlyBlk,
    avg: player => player.tpjYear.toFixed(1),
    detail: player => `${player.gamesWithStats} súmula(s) • ${player.tpjYear.toFixed(1)}/j`,
    valid: player => player.gamesWithStats > 0,
    sort: (a, b) => b.yearlyBlk - a.yearlyBlk,
    color: '#a855f7'
  }
};

function CompactRanking({ data, year, onSelectPlayer }) {
  const appData = data?.data || data || {};
  const players = appData?.dashboard?.players || [];
  const dates = appData?.dashboard?.dates || [];
  const [rankingTab, setRankingTab] = useState('presencas');
  const [search, setSearch] = useState('');

  const reportData = useMemo(() => buildReport(players, dates, year), [players, dates, year]);
  const cfg = CONFIG[rankingTab];

  const ranking = useMemo(() => [...reportData]
    .filter(cfg.valid)
    .sort(cfg.sort), [reportData, rankingTab]);

  const filteredRanking = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return ranking;
    return ranking.filter(player => player.name?.toLocaleLowerCase('pt-BR').includes(query));
  }, [ranking, search]);

  const top10 = ranking.slice(0, 10);
  const leader = ranking[0];

  const chartData = {
    labels: top10.map(player => player.name),
    datasets: [{
      data: top10.map(player => Number(cfg.value(player).toFixed(1))),
      backgroundColor: top10.map((player, index) => {
        if (rankingTab !== 'presencas') return index === 0 ? '#f59e0b' : cfg.color;
        if (player.percentage >= 80) return '#22c55e';
        if (player.percentage >= 60) return '#f59e0b';
        return '#f43f5e';
      }),
      borderRadius: 8,
      maxBarThickness: 24
    }]
  };

  const chartMax = rankingTab === 'presencas' ? 100 : undefined;
  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: context => rankingTab === 'presencas'
            ? `${context.raw}%`
            : `${context.raw} ${cfg.short}`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: chartMax,
        grid: { color: 'rgba(148,163,184,.10)' },
        ticks: {
          color: '#94a3b8',
          callback: value => rankingTab === 'presencas' ? `${value}%` : value
        }
      },
      y: {
        grid: { display: false },
        ticks: {
          color: '#cbd5e1',
          font: { size: 11, weight: 'bold' }
        }
      }
    }
  };

  return (
    <Card>
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" /> Ranking da temporada
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Top 10 no gráfico e elenco completo na tabela compacta, sem alongar a página.
          </p>
        </div>
        {leader && (
          <div className="flex items-center gap-3 rounded-2xl bg-slate-100 dark:bg-slate-900/50 px-4 py-2.5 shrink-0">
            <span className="text-xl">🥇</span>
            <div>
              <p className="text-[9px] uppercase font-black tracking-wider text-slate-500">Líder em {cfg.label}</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{leader.name}</p>
            </div>
            <span className="font-black text-indigo-600 dark:text-indigo-400 ml-2">
              {rankingTab === 'presencas' ? `${cfg.value(leader).toFixed(0)}%` : `${cfg.value(leader)} ${cfg.short}`}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 border-b border-slate-200 dark:border-slate-700 hide-scrollbar">
        {Object.entries(CONFIG).map(([key, item]) => (
          <button
            key={key}
            onClick={() => { setRankingTab(key); setSearch(''); }}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition ${rankingTab === key ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
          >
            {item.tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mt-5">
        <div className="xl:col-span-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Top 10</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{cfg.label} • {year}</p>
            </div>
            <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-900/50 px-2.5 py-1 rounded-full">{ranking.length} atletas</span>
          </div>
          <div className="h-[360px] rounded-2xl bg-slate-50/60 dark:bg-slate-900/30 p-3">
            {top10.length ? <Bar data={chartData} options={chartOptions} /> : <div className="h-full flex items-center justify-center text-sm font-bold text-slate-500">Sem dados em {year}.</div>}
          </div>
          {rankingTab === 'presencas' && (
            <div className="flex flex-wrap gap-3 mt-3 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-emerald-500" />80%+</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-amber-500" />60–79%</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-rose-500" />Abaixo de 60%</span>
            </div>
          )}
        </div>

        <div className="xl:col-span-7 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Tabela completa</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Clique no atleta para abrir o perfil individual</p>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar atleta..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white/40 dark:bg-slate-900/20">
            <div className="grid grid-cols-[42px_minmax(0,1fr)_70px_72px] sm:grid-cols-[42px_minmax(0,1fr)_82px_90px_70px] gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-900/70 text-[9px] uppercase tracking-wider font-black text-slate-500 sticky top-0 z-10">
              <span>#</span>
              <span>Atleta</span>
              <span className="text-center">{rankingTab === 'presencas' ? 'Pres.' : 'Jogos'}</span>
              <span className="text-right">{rankingTab === 'presencas' ? '%' : `Total ${cfg.short}`}</span>
              <span className="hidden sm:block text-right">{rankingTab === 'presencas' ? 'NJ' : 'Média'}</span>
            </div>

            <div className="max-h-[360px] overflow-y-auto overscroll-contain">
              {filteredRanking.length ? filteredRanking.map(player => {
                const realIndex = ranking.findIndex(item => item.name === player.name);
                const value = cfg.value(player);
                return (
                  <button
                    key={player.name}
                    onClick={() => onSelectPlayer(player.name)}
                    className="w-full grid grid-cols-[42px_minmax(0,1fr)_70px_72px] sm:grid-cols-[42px_minmax(0,1fr)_82px_90px_70px] gap-2 items-center px-3 py-2.5 border-t border-slate-100 dark:border-slate-700/50 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/25 transition-colors"
                  >
                    <span className="text-xs font-black text-slate-400">{realIndex + 1}º</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-slate-900 dark:text-white truncate">{player.name}</span>
                      <span className="block text-[9px] text-slate-500 truncate">{cfg.detail(player)}</span>
                    </span>
                    <span className="text-center text-xs font-bold text-slate-500">
                      {rankingTab === 'presencas' ? `${player.presences}/${player.validGames}` : player.gamesWithStats}
                    </span>
                    <span className={`text-right text-sm font-black ${rankingTab === 'presencas' ? (player.percentage >= 80 ? 'text-emerald-500' : player.percentage >= 60 ? 'text-amber-500' : 'text-rose-500') : 'text-indigo-500'}`}>
                      {rankingTab === 'presencas' ? `${value.toFixed(0)}%` : value}
                    </span>
                    <span className={`hidden sm:block text-right text-xs font-black ${rankingTab === 'presencas' && player.faults ? 'text-rose-500' : 'text-slate-500'}`}>
                      {rankingTab === 'presencas' ? (player.faults || '—') : cfg.avg(player)}
                    </span>
                  </button>
                );
              }) : (
                <div className="h-40 flex flex-col items-center justify-center text-slate-500">
                  <Users className="w-8 h-8 opacity-40 mb-2" />
                  <p className="text-sm font-bold">Nenhum atleta encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function findRankingCard() {
  const attendanceButton = [...document.querySelectorAll('button')]
    .find(button => button.textContent?.trim() === 'Assiduidade');
  if (!attendanceButton) return null;

  let element = attendanceButton.parentElement;
  while (element && element !== document.body) {
    const className = typeof element.className === 'string' ? element.className : '';
    if (className.includes('rounded-3xl') && className.includes('shadow-xl')) return element;
    element = element.parentElement;
  }
  return null;
}

export default function ReportsRankingCompactBridge() {
  const [mountNode, setMountNode] = useState(null);
  const [active, setActive] = useState(false);
  const [data, setData] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [playerSelect, setPlayerSelect] = useState(null);

  useEffect(() => {
    fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getInitialAppData' })
    })
      .then(response => response.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    let node = null;
    let hiddenCard = null;

    const sync = () => {
      const reportButton = document.querySelector('button[title="Relatórios"]');
      const isReports = Boolean(reportButton?.className?.includes('scale-110'));
      setActive(isReports);

      const heading = [...document.querySelectorAll('h2')]
        .find(element => element.textContent?.trim() === 'Central de Relatórios');
      const container = heading?.closest('.space-y-8');
      if (!container) return;

      const selects = [...container.querySelectorAll('select')];
      const yearSelect = selects.find(select => /^\d{4}$/.test(select.value));
      const athleteSelect = selects.find(select => [...select.options].some(option => option.value === 'todos'));
      if (yearSelect) setYear(yearSelect.value);
      if (athleteSelect) setPlayerSelect(athleteSelect);

      const rankingCard = findRankingCard();
      if (!rankingCard) return;

      if (hiddenCard && hiddenCard !== rankingCard) hiddenCard.style.display = '';
      hiddenCard = rankingCard;

      if (!node || !node.isConnected) {
        node = document.createElement('div');
        node.dataset.compactReportsRanking = 'true';
        rankingCard.insertAdjacentElement('beforebegin', node);
        setMountNode(node);
      }

      rankingCard.style.display = isReports ? 'none' : '';
      node.style.display = isReports ? '' : 'none';
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'value'] });
    document.addEventListener('change', sync, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('change', sync, true);
      if (hiddenCard) hiddenCard.style.display = '';
      if (node?.isConnected) node.remove();
    };
  }, []);

  const onSelectPlayer = name => {
    if (!playerSelect) return;
    playerSelect.value = name;
    playerSelect.dispatchEvent(new Event('change', { bubbles: true }));
  };

  if (!active || !mountNode || !data) return null;
  return createPortal(
    <CompactRanking data={data} year={year} onSelectPlayer={onSelectPlayer} />,
    mountNode
  );
}
