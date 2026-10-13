import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gatewayPost } from './cbaApi';
import {
  AlertCircle, CalendarDays, CheckCircle, ClipboardList, Minus,
  ChevronDown, Maximize2, Minimize2, Play, RefreshCw, Save, Search, Trash, Trophy, X
} from 'lucide-react';

const BACKUP_KEY = 'cba_mesario_backup_v2';
const LEGACY_KEY = 'cba_mesario_backup';
const SCHEMA_VERSION = 2;

const emptyStats = () => ({ pts2: 0, pts3: 0, reb: 0, ast: 0, blk: 0 });
const num = value => Number(value || 0);
const calcPts = stats => (num(stats?.pts2) * 2) + (num(stats?.pts3) * 3);
const todayLocal = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const fmtDate = value => value ? value.split('-').reverse().join('/') : '--';
const fmtTime = value => value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--';

const Card = ({ children, className = '' }) => (
  <div className={`rounded-3xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-xl shadow-xl ${className}`}>{children}</div>
);

function safeParse(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function meaningfulBackup(value) {
  return Boolean(value && (
    value.isLive || value.sessionStartedAt || value.teamBlack?.length || value.teamGreen?.length ||
    Object.keys(value.dayStats || {}).length || value.gameHistory?.length
  ));
}

function readBackup() {
  const current = safeParse(localStorage.getItem(BACKUP_KEY));
  if (meaningfulBackup(current)) return { ...current, source: 'v2' };

  const legacy = safeParse(localStorage.getItem(LEGACY_KEY));
  if (!meaningfulBackup(legacy)) return null;
  return {
    schemaVersion: SCHEMA_VERSION,
    source: 'legacy',
    isLive: Boolean(legacy.isLive),
    date: legacy.date || todayLocal(),
    teamBlack: legacy.teamBlack || [],
    teamGreen: legacy.teamGreen || [],
    dayStats: legacy.dayStats || {},
    matchStats: legacy.matchStats || {},
    gameNumber: 1,
    gameHistory: [],
    eventHistory: [],
    sessionStartedAt: legacy.isLive || Object.keys(legacy.dayStats || {}).length ? Date.now() : null,
    savedAt: Date.now()
  };
}

const post = params => gatewayPost(params.action, params);

function Modal({ open, onClose, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 sm:p-6 shadow-2xl text-white`}>
        <button onClick={onClose} className="absolute right-4 top-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        {children}
      </div>
    </div>
  );
}

const describeEvent = event => {
  const multiplier = event.statKey === 'pts2' ? 2 : event.statKey === 'pts3' ? 3 : 1;
  const label = { pts2: 'pontos', pts3: 'pontos', reb: 'rebote', ast: 'assistência', blk: 'toco' }[event.statKey];
  const delta = event.delta * multiplier;
  return `${event.player} · ${delta > 0 ? '+' : ''}${delta} ${label}`;
};

const STAT_OPTIONS = [
  ['pts2', '+2', 'Cestas de 2'], ['pts3', '+3', 'Cestas de 3'],
  ['reb', 'REB', 'Rebotes'], ['ast', 'AST', 'Assistências'], ['blk', 'TOC', 'Tocos']
];

function PlayerCard({ name, player, stats, teamTone, expanded, selected, onSelect, onUpdate, feedback }) {
  const [correcting, setCorrecting] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = player?.fotoUrl || player?.photoUrl;
  useEffect(() => setPhotoFailed(false), [photo]);
  const controlsId = React.useId();
  return (
    <article className="mesario-player rounded-2xl" data-team={teamTone} data-expanded={expanded} data-feedback={feedback || undefined}>
      <button type="button" className="mesario-player-heading" aria-expanded={expanded} aria-controls={controlsId} onClick={onSelect}>
        <span className="mesario-avatar" aria-hidden="true">{photo && !photoFailed ? <img src={photo} alt="" onError={() => setPhotoFailed(true)} /> : name.slice(0, 1)}</span>
        <span className="mesario-player-name">{name}<span className="mesario-player-hint">{selected ? 'Selecionado' : 'Toque para lançar'}</span></span>
        <span className="mesario-player-points">{calcPts(stats)}<span>PTS</span></span>
        <ChevronDown className="mesario-player-chevron" aria-hidden="true" />
      </button>
      <div id={controlsId} className="mesario-player-controls" hidden={!expanded}>
        <div className="mesario-stat-grid">
          {STAT_OPTIONS.map(([key, label, description]) => (
            <div key={key} className="mesario-stat-cell">
              <button type="button" className="mesario-stat-button" data-scoring={key === 'pts2' || key === 'pts3'} aria-label={`${label} ${stats[key] || 0} · ${name}`} title={`${description} de ${name}: adicionar`} onClick={() => onUpdate(name, key, 1)}>
                <span>{label}</span><strong>{stats[key] || 0}</strong>
              </button>
              {correcting && <button type="button" className="mesario-subtract" aria-label={`Remover ${description.toLowerCase()} de ${name}`} disabled={!stats[key]} onClick={() => onUpdate(name, key, -1)}><Minus aria-hidden="true" size={16} /></button>}
            </div>
          ))}
        </div>
        <button type="button" className="mesario-correct" aria-label={`${correcting ? 'Concluir correção' : 'Corrigir lançamento'} de ${name}`} title={correcting ? 'Concluir correção' : 'Corrigir lançamento'} aria-pressed={correcting} onClick={() => setCorrecting(value => !value)}><Minus aria-hidden="true" size={18} /><span>{correcting ? 'Concluir correção' : 'Corrigir lançamento'}</span></button>
      </div>
    </article>
  );
}

export default function MesarioDashboard({ data, onStatsSaved, onCourtModeChange }) {
  const players = useMemo(() => [...(data?.data?.dashboard?.players || data?.dashboard?.players || [])].sort((a, b) => a.name.localeCompare(b.name)), [data]);

  const [bootBackup] = useState(() => readBackup());
  const [recovery, setRecovery] = useState(bootBackup);
  const [recoveryResolved, setRecoveryResolved] = useState(!bootBackup);

  const [date, setDate] = useState(todayLocal());
  const [teamBlack, setTeamBlack] = useState([]);
  const [teamGreen, setTeamGreen] = useState([]);
  const [dayStats, setDayStats] = useState({});
  const [matchStats, setMatchStats] = useState({});
  const [isLive, setIsLive] = useState(false);
  const [gameNumber, setGameNumber] = useState(1);
  const [gameHistory, setGameHistory] = useState([]);
  const [eventHistory, setEventHistory] = useState([]);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [activeMobileTeam, setActiveMobileTeam] = useState('black');
  const [search, setSearch] = useState('');
  const [onlyPresent, setOnlyPresent] = useState(false);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [courtMode, setCourtMode] = useState(false);
  const [wideLayout, setWideLayout] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState({});
  const [feedback, setFeedback] = useState(null);
  const boardRef = useRef(null);
  const inCourtMode = courtMode && isLive;

  useEffect(() => {
    onCourtModeChange?.(inCourtMode);
    return () => onCourtModeChange?.(false);
  }, [inCourtMode, onCourtModeChange]);

  useEffect(() => {
    if (!isLive) { setCourtMode(false); return; }
    const board = boardRef.current;
    if (!board) return;
    const measure = () => setWideLayout(board.getBoundingClientRect().width >= 840);
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(board);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [isLive, inCourtMode]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 1200);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!inCourtMode) return;
    const exit = event => { if (event.key === 'Escape' && !modal && !notice) setCourtMode(false); };
    window.addEventListener('keydown', exit);
    return () => window.removeEventListener('keydown', exit);
  }, [inCourtMode, modal, notice]);

  const sessionLocked = Boolean(sessionStartedAt || gameHistory.length || Object.keys(dayStats).length || isLive);

  const presentPlayers = useMemo(() => players.filter(player => player.attendance?.[date]?.includes('✅')), [players, date]);
  useEffect(() => {
    if (!presentPlayers.length) setOnlyPresent(false);
  }, [presentPlayers.length]);

  const visiblePlayers = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    return players.filter(player => {
      if (onlyPresent && !player.attendance?.[date]?.includes('✅')) return false;
      return !q || player.name.toLocaleLowerCase('pt-BR').includes(q);
    });
  }, [players, date, onlyPresent, search]);

  useEffect(() => {
    if (!recoveryResolved) return;
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      isLive, date, teamBlack, teamGreen, dayStats, matchStats,
      gameNumber, gameHistory, eventHistory, sessionStartedAt,
      savedAt: Date.now()
    };
    if (meaningfulBackup(payload)) localStorage.setItem(BACKUP_KEY, JSON.stringify(payload));
    else localStorage.removeItem(BACKUP_KEY);
  }, [recoveryResolved, isLive, date, teamBlack, teamGreen, dayStats, matchStats, gameNumber, gameHistory, eventHistory, sessionStartedAt]);

  const restoreBackup = () => {
    const b = recovery;
    if (!b) return;
    setDate(b.date || todayLocal());
    setTeamBlack(b.teamBlack || []);
    setTeamGreen(b.teamGreen || []);
    setDayStats(b.dayStats || {});
    setMatchStats(b.matchStats || {});
    setIsLive(Boolean(b.isLive));
    setGameNumber(b.gameNumber || 1);
    setGameHistory(b.gameHistory || []);
    setEventHistory(b.eventHistory || []);
    setSessionStartedAt(b.sessionStartedAt || null);
    localStorage.removeItem(LEGACY_KEY);
    setRecovery(null);
    setRecoveryResolved(true);
  };

  const discardRecovery = () => {
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem(LEGACY_KEY);
    setRecovery(null);
    setRecoveryResolved(true);
  };

  const assign = (name, team) => {
    if (isLive) return;
    if (team === 'black') {
      setTeamBlack(prev => prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]);
      setTeamGreen(prev => prev.filter(item => item !== name));
    } else {
      setTeamGreen(prev => prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]);
      setTeamBlack(prev => prev.filter(item => item !== name));
    }
  };

  const scoreBlack = useMemo(() => teamBlack.reduce((sum, name) => sum + calcPts(matchStats[name]), 0), [teamBlack, matchStats]);
  const scoreGreen = useMemo(() => teamGreen.reduce((sum, name) => sum + calcPts(matchStats[name]), 0), [teamGreen, matchStats]);

  const startGame = () => {
    if (teamBlack.length === 0 || teamGreen.length === 0) {
      setNotice({ title: 'Equipes incompletas', message: 'Selecione pelo menos 1 jogador no Time Preto e 1 jogador no Time Verde antes de iniciar.' });
      return;
    }
    const fresh = {};
    [...teamBlack, ...teamGreen].forEach(name => { fresh[name] = emptyStats(); });
    setMatchStats(fresh);
    setDayStats(prev => {
      const next = { ...prev };
      [...teamBlack, ...teamGreen].forEach(name => { if (!next[name]) next[name] = emptyStats(); });
      return next;
    });
    if (!sessionStartedAt) setSessionStartedAt(Date.now());
    setEventHistory(prev => prev.filter(event => event.gameNumber !== gameNumber));
    setFeedback(null);
    setSelectedPlayers({});
    setIsLive(true);
  };

  const updateStat = (player, statKey, delta) => {
    const current = num(matchStats[player]?.[statKey]);
    const next = Math.max(0, current + delta);
    const actualDelta = next - current;
    if (!actualDelta) return;
    setFeedback({ player, statKey, delta: actualDelta, at: Date.now() });

    setMatchStats(prev => ({ ...prev, [player]: { ...(prev[player] || emptyStats()), [statKey]: next } }));
    setDayStats(prev => {
      const currentDay = num(prev[player]?.[statKey]);
      return { ...prev, [player]: { ...(prev[player] || emptyStats()), [statKey]: Math.max(0, currentDay + actualDelta) } };
    });
    setEventHistory(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      at: Date.now(), gameNumber, player, statKey, delta: actualDelta
    }].slice(-120));
  };

  const undoLast = () => {
    const index = [...eventHistory].map((event, i) => ({ event, i })).reverse().find(item => item.event.gameNumber === gameNumber)?.i;
    if (index === undefined) return;
    const event = eventHistory[index];
    setFeedback({ player: event.player, statKey: event.statKey, delta: -event.delta, undone: true, at: Date.now() });
    setMatchStats(prev => {
      const current = num(prev[event.player]?.[event.statKey]);
      return { ...prev, [event.player]: { ...(prev[event.player] || emptyStats()), [event.statKey]: Math.max(0, current - event.delta) } };
    });
    setDayStats(prev => {
      const current = num(prev[event.player]?.[event.statKey]);
      return { ...prev, [event.player]: { ...(prev[event.player] || emptyStats()), [event.statKey]: Math.max(0, current - event.delta) } };
    });
    setEventHistory(prev => prev.filter((_, i) => i !== index));
  };

  const requestFinishGame = () => {
    if (scoreBlack === scoreGreen) {
      setNotice({ title: 'Jogo empatado', message: 'Registre o ponto de desempate antes de finalizar a partida.' });
      return;
    }
    setModal({ type: 'finishGame' });
  };

  const confirmFinishGame = () => {
    const winner = scoreBlack > scoreGreen ? 'black' : 'green';
    setGameHistory(prev => [...prev, {
      number: gameNumber,
      blackScore: scoreBlack,
      greenScore: scoreGreen,
      winner,
      teamBlack: [...teamBlack],
      teamGreen: [...teamGreen],
      playerStats: Object.fromEntries([...teamBlack, ...teamGreen].map(name => [name, { ...(matchStats[name] || emptyStats()) }])),
      endedAt: Date.now()
    }]);
    if (winner === 'black') setTeamGreen([]);
    else setTeamBlack([]);
    setMatchStats({});
    setGameNumber(prev => prev + 1);
    setIsLive(false);
    setModal(null);
  };

  const dayRows = useMemo(() => Object.entries(dayStats).map(([name, stats]) => ({
    name,
    pts: calcPts(stats),
    reb: num(stats.reb),
    ast: num(stats.ast),
    blk: num(stats.blk),
    pts2: num(stats.pts2),
    pts3: num(stats.pts3)
  })).sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name)), [dayStats]);

  const totals = useMemo(() => dayRows.reduce((acc, row) => ({
    pts: acc.pts + row.pts,
    reb: acc.reb + row.reb,
    ast: acc.ast + row.ast,
    blk: acc.blk + row.blk
  }), { pts: 0, reb: 0, ast: 0, blk: 0 }), [dayRows]);

  const resetSession = () => {
    setIsLive(false);
    setDate(todayLocal());
    setTeamBlack([]);
    setTeamGreen([]);
    setDayStats({});
    setMatchStats({});
    setGameNumber(1);
    setGameHistory([]);
    setEventHistory([]);
    setSessionStartedAt(null);
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem(LEGACY_KEY);
  };

  const saveSession = async () => {
    if (!dayRows.length) return;
    setSaving(true);
    try {
      const stats = dayRows.map(row => ({
        playerName: row.name,
        pts2: row.pts2,
        pts3: row.pts3,
        reb: row.reb,
        ast: row.ast,
        blk: row.blk
      }));
      const result = await post({
        action: 'saveMatchStats', date, stats,
        sessionKey: String(sessionStartedAt || ''),
        matches: gameHistory.map(game => ({
          number: game.number, blackScore: game.blackScore, greenScore: game.greenScore,
          winner: game.winner, teamBlack: game.teamBlack, teamGreen: game.teamGreen,
          playerStats: game.playerStats || {}, endedAt: game.endedAt
        }))
      });
      if (result.result !== 'success') throw new Error(result.message || 'Não foi possível salvar a súmula.');
      resetSession();
      setModal(null);
      setNotice({ title: 'Súmula salva', message: 'As estatísticas da sessão foram salvas com sucesso no portal.' });
      onStatsSaved?.();
    } catch (error) {
      setNotice({ title: 'Erro ao salvar', message: error.message || 'Falha inesperada ao salvar a sessão.' });
    } finally {
      setSaving(false);
    }
  };

  const statLabels = { pts2: '+2', pts3: '+3', reb: 'REB', ast: 'AST', blk: 'TOC' };
  const lastGameEvents = eventHistory.filter(event => event.gameNumber === gameNumber).slice(-6).reverse();
  const imbalance = Math.abs(teamBlack.length - teamGreen.length);


  return (
    <div data-mesario-v2-root="true" data-live={isLive} data-court-mode={inCourtMode} className="mesario-root space-y-5 pt-2 pb-48 md:pb-8 text-slate-100">
      <div className="mesario-intro rounded-3xl overflow-hidden border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-cyan-950/60 to-slate-900 p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300"><ClipboardList className="w-4 h-4" /> Mesa digital CBA</div>
            <h1 className="text-3xl sm:text-4xl font-black mt-3">Mesário</h1>
            <p className="text-sm text-slate-400 mt-1">Escalação, placar e estatísticas com menos toques e recuperação automática.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-2 rounded-xl bg-white/5 text-xs font-black">{fmtDate(date)}</span>
            <span className="px-3 py-2 rounded-xl bg-white/5 text-xs font-black">Jogo {gameNumber}</span>
            <span className={`px-3 py-2 rounded-xl text-xs font-black ${isLive ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{isLive ? '● AO VIVO' : 'Preparação'}</span>
          </div>
        </div>
      </div>

      {isLive ? (
        <section ref={boardRef} className="mesario-board" data-wide={wideLayout} aria-label="Mesa da partida">
          <div className="mesario-live-toolbar">
            <div><span className="mesario-live-dot" /> <strong>Mesa CBA</strong><span className="mesario-live-date">{fmtDate(date)} · Jogo {gameNumber}</span></div>
            <button type="button" className="mesario-mode-button" aria-pressed={inCourtMode} onClick={() => setCourtMode(value => !value)}>{inCourtMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}{inCourtMode ? 'Sair do Modo Quadra' : 'Modo Quadra'}</button>
          </div>
          <div className="mesario-scoreboard" aria-label={`Placar: Preto ${scoreBlack}, Verde ${scoreGreen}`}>
            <div><span>TIME PRETO</span><strong>{scoreBlack}</strong></div>
            <div className="mesario-score-center"><span>JOGO {gameNumber}</span><b>×</b><small>EM ANDAMENTO</small></div>
            <div data-team="green"><span>TIME VERDE</span><strong>{scoreGreen}</strong></div>
          </div>
          <div className="mesario-team-switch" aria-label="Equipe para lançamento">
            <button type="button" aria-pressed={activeMobileTeam === 'black'} data-team="black" onClick={() => setActiveMobileTeam('black')}>Preto <span>{scoreBlack} pts</span></button>
            <button type="button" aria-pressed={activeMobileTeam === 'green'} data-team="green" onClick={() => setActiveMobileTeam('green')}>Verde <span>{scoreGreen} pts</span></button>
          </div>
          <div className="mesario-teams">
            {[[ 'black', teamBlack, 'Time Preto' ], [ 'green', teamGreen, 'Time Verde' ]].map(([tone, team, title]) => {
              const selected = team.includes(selectedPlayers[tone]) ? selectedPlayers[tone] : team[0];
              return <section key={tone} className="mesario-team" data-team={tone} hidden={!wideLayout && activeMobileTeam !== tone} aria-label={title}>
                <div className="mesario-team-title"><h2>{title}</h2><span>{team.length} atletas</span></div>
                <div className="mesario-roster">
                  {team.map(name => <PlayerCard key={name} name={name} player={players.find(player => player.name === name)} stats={matchStats[name] || emptyStats()} teamTone={tone} expanded={wideLayout || selected === name} selected={selected === name} onSelect={() => setSelectedPlayers(prev => ({ ...prev, [tone]: name }))} onUpdate={updateStat} feedback={feedback?.player === name ? String(feedback.at) : null} />)}
                </div>
              </section>;
            })}
          </div>
          <div className="mesario-game-actions">
            <div className="mesario-last-action" role="status" aria-live="polite" aria-atomic="true">{feedback ? `${feedback.undone ? 'Desfeito: ' : ''}${describeEvent(feedback)}` : lastGameEvents[0] ? `Último: ${describeEvent(lastGameEvents[0])}` : 'Selecione o atleta e registre a jogada.'}</div>
            <div className="mesario-action-buttons">
              <button type="button" onClick={undoLast} disabled={!lastGameEvents.length} className="mesario-undo">↶ Desfazer</button>
              <button type="button" onClick={requestFinishGame} className="mesario-finish">Finalizar partida</button>
            </div>
            <details className="mesario-history"><summary>Histórico e resumo da sessão</summary>
              <div className="mesario-history-content">
                <p>{gameHistory.length} partidas finalizadas · {dayRows.length} atletas · {totals.pts} pontos na sessão</p>
                {lastGameEvents.length ? <ol>{lastGameEvents.map(event => <li key={event.id}><strong>{event.player}</strong> · {statLabels[event.statKey]} {event.delta > 0 ? '+' : ''}{event.delta}<time>{fmtTime(event.at)}</time></li>)}</ol> : <p>Nenhuma ação registrada neste jogo.</p>}
              </div>
            </details>
          </div>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <Card className="xl:col-span-4 p-5">
              <div className="flex items-center gap-2 mb-4"><CalendarDays className="w-5 h-5 text-cyan-400" /><h2 className="font-black">Sessão do dia</h2></div>
              <label className="text-[10px] uppercase font-black text-slate-500">Data da partida</label>
              <input type="date" value={date} disabled={sessionLocked} onChange={event => setDate(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 p-3 font-black text-white disabled:opacity-50" />
              {sessionLocked && <p className="mt-2 text-[10px] text-amber-400">🔒 Data bloqueada após o início da sessão.</p>}
              <div className="grid grid-cols-3 gap-2 mt-5"><div className="rounded-xl bg-slate-950 p-3 text-center"><p className="text-2xl font-black">{teamBlack.length}</p><p className="text-[9px] uppercase text-slate-500">Preto</p></div><div className="rounded-xl bg-emerald-950/40 p-3 text-center"><p className="text-2xl font-black text-emerald-400">{teamGreen.length}</p><p className="text-[9px] uppercase text-slate-500">Verde</p></div><div className="rounded-xl bg-slate-950 p-3 text-center"><p className="text-2xl font-black">{Math.max(0, players.length - new Set([...teamBlack, ...teamGreen]).size)}</p><p className="text-[9px] uppercase text-slate-500">Banco</p></div></div>
              {imbalance > 1 && <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300"><AlertCircle className="w-4 h-4 inline mr-1" /> Equipes com diferença de {imbalance} jogadores.</div>}
            </Card>

            <Card className="xl:col-span-8 p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <div><p className="text-xs uppercase font-black text-slate-500">Escalação</p><h2 className="text-xl font-black">Selecione os jogadores</h2></div>
                <div className="flex gap-2"><button onClick={() => setOnlyPresent(false)} className={`px-3 py-2 rounded-xl text-xs font-black ${!onlyPresent ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'}`}>Todos ({players.length})</button><button onClick={() => setOnlyPresent(true)} disabled={!presentPlayers.length} className={`px-3 py-2 rounded-xl text-xs font-black ${onlyPresent ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'} disabled:opacity-30`}>Presentes ({presentPlayers.length})</button></div>
              </div>
              <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar atleta..." className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-cyan-500/40" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {visiblePlayers.map(player => {
                  const inBlack = teamBlack.includes(player.name);
                  const inGreen = teamGreen.includes(player.name);
                  return <div key={player.name} className={`rounded-2xl border p-3 ${inBlack ? 'bg-slate-950 border-slate-600' : inGreen ? 'bg-emerald-950/50 border-emerald-700' : 'bg-slate-900/50 border-slate-700'}`}><div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="font-black truncate">{player.name}</p><p className="text-[9px] text-slate-500">{player.attendance?.[date]?.includes('✅') ? '✓ Presente hoje' : 'Disponível para escalação'}</p></div>{(inBlack || inGreen) && <span className={`text-[9px] font-black px-2 py-1 rounded-full ${inGreen ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white'}`}>{inGreen ? 'VERDE' : 'PRETO'}</span>}</div><div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => assign(player.name, 'black')} className={`py-2.5 rounded-xl text-xs font-black ${inBlack ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>PRETO</button><button onClick={() => assign(player.name, 'green')} className={`py-2.5 rounded-xl text-xs font-black ${inGreen ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>VERDE</button></div></div>;
                })}
              </div>
            </Card>
          </div>

          {gameHistory.length > 0 && <Card className="p-5"><div className="flex items-center justify-between mb-3"><div><p className="text-xs uppercase font-black text-slate-500">Histórico da sessão</p><h2 className="font-black">Partidas finalizadas</h2></div><Trophy className="w-5 h-5 text-amber-400" /></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{gameHistory.slice().reverse().map(game => <div key={game.number} className="rounded-2xl bg-slate-900/60 p-3 flex items-center justify-between"><div><p className="text-xs font-black text-slate-500">Jogo {game.number}</p><p className="text-sm font-black mt-1">Preto {game.blackScore} × {game.greenScore} Verde</p></div><span className={`text-[10px] font-black px-2 py-1 rounded-full ${game.winner === 'black' ? 'bg-white/10 text-white' : 'bg-emerald-500/15 text-emerald-300'}`}>{game.winner === 'black' ? 'PRETO' : 'VERDE'}</span></div>)}</div></Card>}

          <div className="fixed md:static inset-x-0 z-50 bg-slate-950/95 border-t md:border border-slate-800 p-3 md:p-4 md:rounded-3xl backdrop-blur-xl" style={{ bottom: 'calc(4.25rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-2">
              <button onClick={startGame} className="flex-1 py-3.5 rounded-2xl bg-cyan-600 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30"><Play className="w-5 h-5" /> Ir para a quadra</button>
              {dayRows.length > 0 && <button onClick={() => setModal({ type: 'summary' })} className="sm:w-auto px-5 py-3.5 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center gap-2"><Save className="w-5 h-5" /> Encerrar sessão</button>}
              {(sessionLocked || teamBlack.length || teamGreen.length) && <button onClick={() => setModal({ type: 'discard' })} className="sm:w-auto px-4 py-3.5 rounded-2xl bg-slate-800 text-rose-300 font-black"><Trash className="w-5 h-5" /></button>}
            </div>
          </div>
        </>
      )}

      <Modal open={Boolean(recovery) && !recoveryResolved} onClose={() => {}}>
        <div className="pr-10"><p className="text-xs uppercase font-black text-cyan-400">Recuperação automática</p><h2 className="text-2xl font-black mt-2">Sessão não encerrada encontrada</h2><p className="text-sm text-slate-400 mt-2">{fmtDate(recovery?.date)} · última atualização {fmtTime(recovery?.savedAt)}</p></div>
        <div className="grid grid-cols-3 gap-2 mt-5"><div className="rounded-xl bg-slate-800 p-3 text-center"><p className="text-xl font-black">{recovery?.gameNumber || 1}</p><p className="text-[9px] uppercase text-slate-500">jogo atual</p></div><div className="rounded-xl bg-slate-800 p-3 text-center"><p className="text-xl font-black">{Object.keys(recovery?.dayStats || {}).length}</p><p className="text-[9px] uppercase text-slate-500">atletas</p></div><div className="rounded-xl bg-slate-800 p-3 text-center"><p className="text-xl font-black">{recovery?.gameHistory?.length || 0}</p><p className="text-[9px] uppercase text-slate-500">finalizados</p></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6"><button onClick={restoreBackup} className="py-3 rounded-2xl bg-cyan-600 font-black">Continuar sessão</button><button onClick={discardRecovery} className="py-3 rounded-2xl bg-slate-800 text-rose-300 font-black">Descartar backup</button></div>
      </Modal>

      <Modal open={modal?.type === 'finishGame'} onClose={() => setModal(null)}>
        <p className="text-xs uppercase font-black text-cyan-400">Fim da partida</p><h2 className="text-2xl font-black mt-2">Confirmar resultado</h2>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 my-6"><div className="rounded-2xl bg-slate-800 p-4 text-center"><p className="text-xs uppercase text-slate-500 font-black">Preto</p><p className="text-4xl font-black">{scoreBlack}</p></div><span className="text-slate-500 font-black">×</span><div className="rounded-2xl bg-emerald-950/60 p-4 text-center"><p className="text-xs uppercase text-emerald-400 font-black">Verde</p><p className="text-4xl font-black text-emerald-400">{scoreGreen}</p></div></div>
        <p className="text-sm text-slate-400">🏆 {scoreBlack > scoreGreen ? 'Time Preto permanece na quadra; o Verde será liberado.' : 'Time Verde permanece na quadra; o Preto será liberado.'}</p>
        <div className="grid grid-cols-2 gap-2 mt-6"><button onClick={() => setModal(null)} className="py-3 rounded-2xl bg-slate-800 font-black">Corrigir placar</button><button onClick={confirmFinishGame} className="py-3 rounded-2xl bg-cyan-600 font-black">Confirmar resultado</button></div>
      </Modal>

      <Modal open={modal?.type === 'summary'} onClose={() => setModal(null)} width="max-w-3xl">
        <p className="text-xs uppercase font-black text-emerald-400">Resumo da rodada</p><h2 className="text-2xl font-black mt-2">Conferência antes de salvar</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5">{[[gameHistory.length,'Partidas'],[dayRows.length,'Atletas'],[totals.pts,'Pontos'],[totals.reb,'Rebotes'],[totals.ast,'Assist.']].map(([value,label]) => <div key={label} className="rounded-xl bg-slate-800 p-3 text-center"><p className="text-2xl font-black">{value}</p><p className="text-[9px] uppercase text-slate-500">{label}</p></div>)}</div>
        <div className="mt-5 max-h-72 overflow-y-auto rounded-2xl border border-slate-700"><div className="grid grid-cols-[1fr_52px_52px_52px_52px] bg-slate-800 px-3 py-2 text-[9px] uppercase font-black text-slate-500 sticky top-0"><span>Atleta</span><span>PTS</span><span>REB</span><span>AST</span><span>TOC</span></div>{dayRows.map(row => <div key={row.name} className="grid grid-cols-[1fr_52px_52px_52px_52px] px-3 py-2 border-t border-slate-800 text-xs"><span className="font-black truncate">{row.name}</span><span>{row.pts}</span><span>{row.reb}</span><span>{row.ast}</span><span>{row.blk}</span></div>)}</div>
        <div className="grid grid-cols-2 gap-2 mt-6"><button onClick={() => setModal(null)} className="py-3 rounded-2xl bg-slate-800 font-black">Voltar</button><button onClick={saveSession} disabled={saving} className="py-3 rounded-2xl bg-emerald-600 font-black disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Salvar súmula</button></div>
      </Modal>

      <Modal open={modal?.type === 'discard'} onClose={() => setModal(null)}>
        <p className="text-xs uppercase font-black text-rose-400">Atenção</p><h2 className="text-2xl font-black mt-2">Descartar sessão atual?</h2><p className="text-sm text-slate-400 mt-3">Equipes, estatísticas, histórico e backup local desta sessão serão apagados.</p><div className="grid grid-cols-2 gap-2 mt-6"><button onClick={() => setModal(null)} className="py-3 rounded-2xl bg-slate-800 font-black">Cancelar</button><button onClick={() => { resetSession(); setModal(null); }} className="py-3 rounded-2xl bg-rose-600 font-black">Descartar tudo</button></div>
      </Modal>

      <Modal open={Boolean(notice)} onClose={() => setNotice(null)}>
        <div className="flex items-start gap-3 pr-8"><AlertCircle className="w-6 h-6 text-cyan-400 shrink-0" /><div><h2 className="text-xl font-black">{notice?.title}</h2><p className="text-sm text-slate-400 mt-2">{notice?.message}</p></div></div><button onClick={() => setNotice(null)} className="mt-6 w-full py-3 rounded-2xl bg-cyan-600 font-black">OK</button>
      </Modal>
    </div>
  );
}
