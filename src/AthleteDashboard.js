import React, { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler
} from 'chart.js';
import {
  Activity, Award, BarChart3, CalendarDays, Download, Flame, Shield, Target, Trophy, Users
} from 'lucide-react';
import { availableAthleteYears, buildAthleteSeason, formatDate } from './athleteDashboardData';
import AthleteCardModal from './AthleteCardModal';
import './AthleteDashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const METRICS = [
  { key: 'pts', label: 'Pontos', short: 'PTS', color: '#fb923c', icon: Target },
  { key: 'reb', label: 'Rebotes', short: 'REB', color: '#38bdf8', icon: Activity },
  { key: 'ast', label: 'Assistências', short: 'AST', color: '#a78bfa', icon: Users },
  { key: 'blk', label: 'Tocos', short: 'TOC', color: '#34d399', icon: Shield }
];

const oneDecimal = value => new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1, maximumFractionDigits: 1
}).format(value || 0);
const normalizeName = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

function AthletePhoto({ player }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [player?.fotoUrl]);
  return player?.fotoUrl && !failed
    ? <img className="cba-player__photo" src={player.fotoUrl} alt={`Foto de ${player.name}`} onError={() => setFailed(true)} />
    : <span className="cba-player__photo-fallback" aria-hidden="true">{player?.name?.charAt(0) || 'C'}</span>;
}

function Panel({ title, eyebrow, icon: Icon, children, className = '' }) {
  return <section className={`cba-player__panel ${className}`}>
    <div className="cba-player__panel-heading">
      <div><span className="cba-player__eyebrow">{eyebrow}</span><h2>{title}</h2></div>
      {Icon && <Icon aria-hidden="true" size={20} />}
    </div>
    {children}
  </section>;
}

function Empty({ children }) {
  return <div className="cba-player__empty"><BarChart3 size={25} aria-hidden="true"/><p>{children}</p></div>;
}

export default function AthleteDashboard({ allPlayersData = [], dates = [], currentUser, dataError }) {
  const players = useMemo(() => [...allPlayersData].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')), [allPlayersData]);
  const years = useMemo(() => availableAthleteYears(players, dates), [players, dates]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [selectedName, setSelectedName] = useState('');
  const [metric, setMetric] = useState('pts');
  const [copyStatus, setCopyStatus] = useState('');
  const [cardOpen, setCardOpen] = useState(false);

  useEffect(() => {
    if (years.length && !years.includes(year)) setYear(years[0]);
  }, [years, year]);

  const { athletes, rosterAverages, rankingFor } = useMemo(() =>
    buildAthleteSeason(players, dates, year), [players, dates, year]);
  const ownPlayer = currentUser?.name && athletes.find(player => normalizeName(player.name) === normalizeName(currentUser.name));
  const athlete = athletes.find(player => player.name === selectedName) || ownPlayer || athletes[0];
  const activeMetric = METRICS.find(item => item.key === metric);

  useEffect(() => setCopyStatus(''), [athlete?.name, year]);

  const chart = useMemo(() => ({
    labels: (athlete?.entries || []).map(entry => formatDate(entry.date).slice(0, 5)),
    datasets: [
      {
        label: activeMetric.label,
        data: (athlete?.entries || []).map(entry => entry[metric]),
        borderColor: activeMetric.color,
        backgroundColor: `${activeMetric.color}22`,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: activeMetric.color,
        tension: 0.3,
        fill: true
      },
      {
        label: 'Média por rodada',
        data: (athlete?.entries || []).map(() => athlete?.averages[metric] || 0),
        borderColor: '#8293ad',
        borderDash: [6, 6],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      }
    ]
  }), [athlete, activeMetric, metric]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#16243a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        callbacks: { title: items => formatDate(athlete?.entries[items[0]?.dataIndex]?.date) }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#92a3bb', maxTicksLimit: 8 } },
      y: { beginAtZero: true, grid: { color: '#23344d' }, ticks: { color: '#92a3bb', precision: 0 } }
    }
  }), [athlete]);

  if (!athlete) return <section className="cba-player cba-player--empty" aria-label="Desempenho do atleta">
    <Trophy size={34} aria-hidden="true" />
    <h1>Desempenho do atleta</h1>
    <p>{dataError ? `Não foi possível carregar os atletas: ${dataError}` : 'Ainda não há atletas disponíveis para exibir.'}</p>
  </section>;

  const recent = athlete.entries.slice(-5).reverse();
  const activeMonths = athlete.monthly.filter(month => month.valid > 0);
  const seasonPointsFromTwo = athlete.totals.pts2 * 2;
  const seasonPointsFromThree = athlete.totals.pts3 * 3;
  const threePointShare = athlete.totals.pts ? Math.round(seasonPointsFromThree / athlete.totals.pts * 100) : 0;
  const lastFiveAverage = recent.length ? recent.reduce((sum, entry) => sum + entry.pts, 0) / recent.length : 0;
  const ranking = rankingFor(athlete, 'pts');
  const joiningYear = /^\d{4}/.test(String(athlete.dataEntrada || '')) ? String(athlete.dataEntrada).slice(0, 4) : null;
  const scoringRange = athlete.entries.length > 1
    ? Math.max(...athlete.entries.map(entry => entry.pts)) - Math.min(...athlete.entries.map(entry => entry.pts)) : null;
  const bestAttendanceMonth = activeMonths.length > 1 ? [...activeMonths].sort((a, b) =>
    (b.present / b.valid) - (a.present / a.valid) || b.present - a.present)[0] : null;

  const copySummary = async () => {
    const summary = `${athlete.name} · CBA ${year}\n` +
      `${athlete.statDates} rodadas com súmula · ${athlete.totals.pts} PTS · ${athlete.totals.reb} REB · ${athlete.totals.ast} AST · ${athlete.totals.blk} TOC\n` +
      `Presença: ${athlete.presences}/${athlete.validDates} datas válidas. Estatísticas consolidadas por data.`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus('Resumo copiado.');
    } catch {
      setCopyStatus('Não foi possível copiar o resumo neste navegador.');
    }
  };

  return <section className="cba-player" aria-label="Desempenho do atleta">
    <div className="cba-player__topline"><span>CBA <b>/</b> INTELIGÊNCIA DE JOGO</span><span>TEMPORADA {year}</span></div>

    <header className="cba-player__intro">
      <div><span className="cba-player__eyebrow">Visão individual · CBA</span><h1>O jogo em <em>números.</em></h1>
        <p>O desempenho de cada atleta, sua evolução e sua presença em um só lugar.</p></div>
      <div className="cba-player__filters">
        <label>Atleta
          <select aria-label="Selecionar atleta" value={athlete.name} onChange={event => setSelectedName(event.target.value)}>
            {players.map(player => <option key={player.name} value={player.name}>{player.name}</option>)}
          </select>
        </label>
        <label>Temporada
          <select aria-label="Selecionar temporada" value={year} onChange={event => setYear(event.target.value)}>
            {(years.length ? years : [year]).map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {ownPlayer && ownPlayer.name !== athlete.name && <button type="button" onClick={() => setSelectedName(ownPlayer.name)}>Meu perfil</button>}
        <button type="button" onClick={copySummary}>Copiar resumo</button>
        <button type="button" className="cba-player__card-button" onClick={() => setCardOpen(true)}
          disabled={!athlete.statDates && !athlete.validDates}
          title={!athlete.statDates && !athlete.validDates ? 'O card estará disponível após os primeiros registros da temporada.' : undefined}>
          <Download size={15} aria-hidden="true" /> Gerar card
        </button>
      </div>
    </header>
    {copyStatus && <p className="cba-player__copy-status" role="status">{copyStatus}</p>}

    <div className="cba-player__hero">
      <div className="cba-player__portrait"><AthletePhoto player={athlete} /></div>
      <div className="cba-player__identity">
        <span className="cba-player__eyebrow">Ficha do atleta <i /> {year}</span>
        <h2>{athlete.name}</h2>
        <p>{athlete.posicao || 'Atleta do CBA'} <span>·</span> Camisa #{athlete.numero || '—'}</p>
        {(athlete.apelido || athlete.altura || joiningYear || athlete.especialidade) && <div className="cba-player__bio">
          {athlete.apelido && <span>Apelido: {athlete.apelido}</span>}
          {athlete.altura && <span>Altura: {athlete.altura} m</span>}
          {joiningYear && <span>No CBA desde {joiningYear}</span>}
          {athlete.especialidade && <span>Estilo: {athlete.especialidade}</span>}
        </div>}
        <div className="cba-player__tags">
          <span><CalendarDays size={15} aria-hidden="true" /> {athlete.statDates} {athlete.statDates === 1 ? 'rodada com súmula' : 'rodadas com súmula'}</span>
          <span><Activity size={15} aria-hidden="true" /> {athlete.presences} {athlete.presences === 1 ? 'presença' : 'presenças'}</span>
          {ranking?.field > 1 && <span><Trophy size={15} aria-hidden="true" /> {ranking.place}º em pontos</span>}
        </div>
      </div>
      <div className="cba-player__hero-number"><span>Pontos registrados</span><strong>{athlete.statDates ? athlete.totals.pts : '—'}</strong><small>na temporada {year}</small></div>
    </div>

    <div className="cba-player__metrics">
      {METRICS.map(({ key, label, short, icon: Icon, color }) => {
        const rank = rankingFor(athlete, key);
        return <div className="cba-player__metric" key={key} style={{ '--metric-color': color }}>
          <div className="cba-player__metric-label"><span><Icon size={16} aria-hidden="true" /> {short} / RODADA</span><span className="cba-player__metric-symbol">↗</span></div>
          <strong>{athlete.statDates ? oneDecimal(athlete.averages[key]) : '—'}</strong>
          <p>{label} · {athlete.statDates ? `${athlete.totals[key]} no ano` : 'sem súmulas'}</p>
          {rank?.field > 1 && <small>{rank.place}º de {rank.field} atletas com súmula</small>}
        </div>;
      })}
      <div className="cba-player__metric cba-player__metric--presence" style={{ '--metric-color': '#facc15' }}>
        <div className="cba-player__metric-label"><span><CalendarDays size={16} aria-hidden="true" /> ASSIDUIDADE</span><span className="cba-player__metric-symbol">✓</span></div>
        <strong>{athlete.attendanceRate === null ? '—' : `${Math.round(athlete.attendanceRate)}%`}</strong>
        <p>{athlete.validDates ? `${athlete.presences} de ${athlete.validDates} datas válidas` : 'sem registros válidos'}</p>
        {athlete.presenceStreak > 1 && <small>{athlete.presenceStreak} presenças seguidas</small>}
      </div>
    </div>

    <div className="cba-player__main-grid">
      <Panel title="Evolução por rodada" eyebrow="Performance na temporada" icon={BarChart3} className="cba-player__trend">
        <div className="cba-player__metric-switch" role="group" aria-label="Estatística do gráfico">
          {METRICS.map(item => <button key={item.key} type="button" aria-pressed={metric === item.key}
            className={metric === item.key ? 'is-active' : ''} onClick={() => setMetric(item.key)}>{item.short}</button>)}
        </div>
        {athlete.entries.length ? <>
          <div className="cba-player__chart"><Line data={chart} options={chartOptions} role="img" aria-label={`Evolução de ${activeMetric.label.toLowerCase()} de ${athlete.name} por rodada`} /></div>
          <div className="cba-player__chart-note"><span><i style={{ background: activeMetric.color }} />{activeMetric.label} por rodada</span><span><i className="is-dashed" />Média: {oneDecimal(athlete.averages[metric])}</span>{metric === 'pts' && scoringRange !== null && <span>Variação entre extremos: {scoringRange} PTS</span>}</div>
        </> : <Empty>Ainda não há súmulas para {athlete.name} em {year}.</Empty>}
      </Panel>

      <Panel title="Últimas rodadas" eyebrow="Súmulas registradas" icon={CalendarDays} className="cba-player__recent">
        {recent.length ? <>
          <div className="cba-player__recent-summary"><Flame size={17} aria-hidden="true" /> Média de {oneDecimal(lastFiveAverage)} pontos nas últimas {recent.length} {recent.length === 1 ? 'rodada' : 'rodadas'}</div>
          <div className="cba-player__recent-list">{recent.map(entry => <div key={entry.date} className="cba-player__recent-row">
            <time dateTime={entry.date}>{formatDate(entry.date)}</time>
            <div><strong>{entry.pts}</strong><small>PTS</small></div>
            <span>{entry.reb} REB <b>·</b> {entry.ast} AST</span>
          </div>)}</div>
        </> : <Empty>As rodadas registradas aparecerão aqui.</Empty>}
      </Panel>
    </div>

    <div className="cba-player__details-grid">
      <Panel title="Comparativo com o elenco" eyebrow="Média por rodada registrada" icon={Users}>
        {athlete.statDates && athletes.some(item => item.statDates > 0 && item.name !== athlete.name) ? <div className="cba-player__comparison">
          {METRICS.map(item => {
            const own = athlete.averages[item.key];
            const roster = rosterAverages[item.key];
            const scale = Math.max(own, roster, 1);
            return <div className="cba-player__compare-item" key={item.key}>
              <div className="cba-player__compare-label"><span>{item.label}</span><strong>{oneDecimal(own)} <small>/ {oneDecimal(roster)}</small></strong></div>
              <div className="cba-player__compare-track"><span style={{ width: `${own / scale * 100}%`, background: item.color }} /><i style={{ left: `${roster / scale * 100}%` }} /></div>
            </div>;
          })}
          <p className="cba-player__footnote">Barra: atleta · marcador: média dos {athletes.filter(item => item.statDates > 0).length} atletas com súmula.</p>
        </div> : <Empty>O comparativo aparece quando dois ou mais atletas têm súmula na temporada.</Empty>}
      </Panel>

      <Panel title="Recordes pessoais" eyebrow={`Melhores rodadas de ${year}`} icon={Award}>
        {athlete.statDates ? <div className="cba-player__records">{METRICS.map(item => {
          const record = athlete.records[item.key];
          return <div key={item.key} className="cba-player__record">
            <span className="cba-player__record-icon" style={{ color: item.color }}><item.icon size={18} aria-hidden="true" /></span>
            <div><small>{item.label}</small><strong>{record?.value ?? 0}</strong></div>
            <time dateTime={record?.date || undefined}>{record ? formatDate(record.date) : '—'}</time>
          </div>;
        })}</div> : <Empty>Os recordes aparecerão após a primeira súmula.</Empty>}
      </Panel>

      <Panel title="Presença no ano" eyebrow="Regularidade no CBA" icon={CalendarDays}>
        {activeMonths.length ? <>
          <div className="cba-player__attendance"><div className="cba-player__attendance-total"><strong>{Math.round(athlete.attendanceRate)}%</strong><span>{athlete.presences} presenças em {athlete.validDates} datas válidas</span></div>
            <div className="cba-player__attendance-track"><span style={{ width: `${athlete.attendanceRate}%` }} /></div></div>
          <div className="cba-player__months">{activeMonths.map(month => <div key={month.label}><span>{month.label}</span><strong>{month.present}/{month.valid}</strong><i><b style={{ width: `${month.present / month.valid * 100}%` }} /></i></div>)}</div>
          {bestAttendanceMonth && <p className="cba-player__footnote">Melhor mês de presença: {bestAttendanceMonth.label} ({bestAttendanceMonth.present}/{bestAttendanceMonth.valid} datas válidas).</p>}
        </> : <Empty>Ainda não há presenças válidas registradas nesta temporada.</Empty>}
      </Panel>

      <Panel title="Perfil de pontuação" eyebrow="Cestas convertidas" icon={Target}>
        {athlete.statDates ? <>
          <div className="cba-player__shots"><div><small>Cestas de 2</small><strong>{athlete.totals.pts2}</strong><span>{seasonPointsFromTwo} pontos</span></div>
            <div><small>Cestas de 3</small><strong>{athlete.totals.pts3}</strong><span>{seasonPointsFromThree} pontos</span></div></div>
          <div className="cba-player__shot-split"><span style={{ width: `${100 - threePointShare}%` }} /><span style={{ width: `${threePointShare}%` }} /></div>
          <p className="cba-player__footnote">{threePointShare}% dos pontos registrados vieram de cestas de 3. Tentativas e lances livres ainda não são registrados.</p>
        </> : <Empty>As cestas convertidas aparecerão após a primeira súmula.</Empty>}
      </Panel>
    </div>

    <p className="cba-player__disclaimer"><Trophy size={16} aria-hidden="true" /> As súmulas atuais são consolidadas por data. Quando há várias partidas no mesmo dia, os números representam a rodada inteira.</p>
    {cardOpen && <AthleteCardModal athlete={athlete} year={year} onClose={() => setCardOpen(false)} />}
  </section>;
}
