import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Check, ChevronRight, Clipboard, RotateCcw, Save, Search,
  Share2, Shuffle, Sparkles, Trophy, UserCheck, Users, X
} from 'lucide-react';

const GATEWAY_URL = 'https://vqirdswgchlcxevepamu.supabase.co/functions/v1/cba-gateway';
const SESSION_KEYS = ['cba_session_v2', 'cba_session_v1'];
const HISTORY_KEY = 'cba_sorteio_history_v2';

const normalize = value => String(value || '').trim().toLowerCase();
const fmtDate = value => value ? String(value).split('-').reverse().join('/') : '--';

function readSession() {
  for (const key of SESSION_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token = parsed?.user?.token || parsed?.user?.user?.token || parsed?.token;
      const role = parsed?.user?.role || parsed?.user?.user?.role || parsed?.role || '';
      if (token) return { token, role };
    } catch { /* tenta a próxima chave */ }
  }
  try {
    const raw = window.sessionStorage.getItem('cba_session_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        token: parsed?.token || parsed?.user?.token || null,
        role: parsed?.role || parsed?.user?.role || ''
      };
    }
  } catch { /* sem impacto */ }
  return { token: null, role: '' };
}

async function postBackend(action, payload = {}) {
  const { token } = readSession();
  if (!token) throw new Error('Sessão não encontrada. Entre novamente.');
  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.result === 'error') throw new Error(data?.message || 'Falha ao comunicar com o servidor.');
  return data;
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function playerRating(player) {
  const entries = Object.values(player?.dailyStats || {});
  if (!entries.length) return 0;
  const totals = entries.reduce((acc, stats) => {
    const pts = (Number(stats?.pts2 || 0) * 2) + (Number(stats?.pts3 || 0) * 3);
    acc.pts += pts;
    acc.reb += Number(stats?.reb || 0);
    acc.ast += Number(stats?.ast || 0);
    acc.blk += Number(stats?.blk || 0);
    return acc;
  }, { pts: 0, reb: 0, ast: 0, blk: 0 });
  const games = entries.length;
  return (totals.pts / games) + (totals.reb / games * 1.05) + (totals.ast / games * 1.2) + (totals.blk / games * 1.4);
}

function positionGroup(player) {
  const pos = normalize(player?.posicao);
  if (pos.includes('piv')) return 'big';
  if (pos.includes('arm')) return 'guard';
  return 'wing';
}

function buildBalancedTeams(activePlayers) {
  const ranked = shuffle(activePlayers).sort((a, b) => playerRating(b) - playerRating(a));
  const black = { players: [], score: 0, pos: { guard: 0, wing: 0, big: 0 } };
  const green = { players: [], score: 0, pos: { guard: 0, wing: 0, big: 0 } };

  const placementCost = (target, other, player) => {
    if (target.players.length >= 5) return Number.POSITIVE_INFINITY;
    const rating = playerRating(player);
    const group = positionGroup(player);
    const projectedScore = target.score + rating;
    const scoreGap = Math.abs(projectedScore - other.score);
    const positionGap = Math.abs((target.pos[group] + 1) - other.pos[group]);
    const sizeGap = Math.abs((target.players.length + 1) - other.players.length);
    return scoreGap + (positionGap * 3) + (sizeGap * 8);
  };

  ranked.forEach(player => {
    const blackCost = placementCost(black, green, player);
    const greenCost = placementCost(green, black, player);
    const target = blackCost < greenCost ? black : greenCost < blackCost ? green : (Math.random() < 0.5 ? black : green);
    const group = positionGroup(player);
    target.players.push(player);
    target.score += playerRating(player);
    target.pos[group] += 1;
  });

  return { black: black.players, green: green.players };
}

function loadHistory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch { return []; }
}

function saveLocalHistory(entry) {
  const next = [entry, ...loadHistory()].slice(0, 3);
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* sem impacto */ }
  return next;
}

function Stepper({ step }) {
  const steps = [['selection', '1', 'Atletas'], ['mode', '2', 'Modalidade'], ['result', '3', 'Resultado']];
  const activeIndex = Math.max(0, steps.findIndex(([key]) => key === step));
  return <div className="flex items-center gap-2 overflow-x-auto pb-1">
    {steps.map(([key, number, label], index) => <React.Fragment key={key}>
      {index > 0 && <div className={`h-px min-w-6 flex-1 ${index <= activeIndex ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
      <div className={`flex items-center gap-2 shrink-0 ${index <= activeIndex ? 'text-white' : 'text-slate-500'}`}>
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${index < activeIndex ? 'bg-emerald-500 text-slate-950' : index === activeIndex ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
          {index < activeIndex ? <Check className="w-4 h-4" /> : number}
        </span>
        <span className="text-xs font-black uppercase tracking-wide">{label}</span>
      </div>
    </React.Fragment>)}
  </div>;
}

const StatPill = ({ label, value }) => <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-center">
  <p className="text-xl font-black text-white">{value}</p>
  <p className="text-[9px] uppercase tracking-wider font-black text-slate-500">{label}</p>
</div>;

function TeamCard({ title, players, green = false }) {
  return <div className={`rounded-3xl overflow-hidden border ${green ? 'border-emerald-500/50 bg-emerald-950/30' : 'border-slate-600 bg-black'}`}>
    <div className={`px-5 py-4 flex items-center justify-between ${green ? 'bg-emerald-500 text-slate-950' : 'bg-black text-white border-b border-slate-700'}`}>
      <div className="flex items-center gap-3"><span className={`w-4 h-4 rounded-full ${green ? 'bg-emerald-900' : 'bg-slate-100 border border-slate-500'}`} /><h3 className="font-black text-lg">{title}</h3></div>
      <span className="text-xs font-black uppercase">5 jogadores</span>
    </div>
    <div className="p-3 space-y-2">
      {players.map((player, index) => <div key={player.name} className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${green ? 'bg-emerald-900/25' : 'bg-slate-900'}`}>
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${green ? 'bg-emerald-500 text-slate-950' : 'bg-white text-black'}`}>{index + 1}</span>
        <div className="min-w-0 flex-1"><p className="font-black text-white truncate">{player.name}</p><p className={`text-[10px] font-bold uppercase ${green ? 'text-emerald-300' : 'text-slate-500'}`}>{player.posicao || 'Posição não informada'}</p></div>
      </div>)}
    </div>
  </div>;
}

function SorteioExperience({ players, dates, isAdmin }) {
  const [step, setStep] = useState('selection');
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [presenceDate, setPresenceDate] = useState('');
  const [numToDraw, setNumToDraw] = useState(1);
  const [teams, setTeams] = useState(null);
  const [drawnPlayers, setDrawnPlayers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [history, setHistory] = useState(loadHistory);

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => String(a.name).localeCompare(String(b.name))), [players]);
  const filteredPlayers = useMemo(() => sortedPlayers.filter(player => normalize(player.name).includes(normalize(query))), [sortedPlayers, query]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const availableDates = useMemo(() => {
    const set = new Set();
    (dates || []).forEach(item => {
      const value = typeof item === 'string' ? item : item?.date || item?.value;
      if (value) set.add(String(value));
    });
    players.forEach(player => Object.keys(player.attendance || {}).forEach(date => set.add(date)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [dates, players]);

  useEffect(() => {
    if (!presenceDate && availableDates.length) setPresenceDate(availableDates[0]);
  }, [availableDates, presenceDate]);

  const selectedPlayers = useMemo(() => selected.map(name => sortedPlayers.find(player => player.name === name)).filter(Boolean), [selected, sortedPlayers]);

  const togglePlayer = name => setSelected(prev => prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]);
  const selectAll = () => setSelected(sortedPlayers.map(player => player.name));
  const clear = () => setSelected([]);
  const usePresent = () => {
    const names = sortedPlayers.filter(player => String(player.attendance?.[presenceDate] || '').includes('✅')).map(player => player.name);
    setSelected(names);
    setNotice({ type: names.length ? 'success' : 'info', text: names.length ? `${names.length} presentes carregados de ${fmtDate(presenceDate)}.` : `Nenhum presente encontrado em ${fmtDate(presenceDate)}.` });
  };

  const generateTeams = () => {
    if (selectedPlayers.length < 10) {
      setNotice({ type: 'error', text: 'Selecione pelo menos 10 atletas para formar dois times.' });
      return;
    }
    const randomized = shuffle(selectedPlayers);
    const active = randomized.slice(0, 10);
    const reserves = randomized.slice(10);
    const balanced = buildBalancedTeams(active);
    setTeams({ ...balanced, reserves });
    setStep('result');
    setNotice(null);
  };

  const generateCustom = () => {
    if (selectedPlayers.length < numToDraw) {
      setNotice({ type: 'error', text: `Selecione pelo menos ${numToDraw} atleta(s).` });
      return;
    }
    setDrawnPlayers(shuffle(selectedPlayers).slice(0, numToDraw));
    setTeams(null);
    setStep('result');
    setNotice(null);
  };

  const shareText = useMemo(() => {
    if (teams) {
      const reserves = teams.reserves.length ? `\n🟡 Reservas: ${teams.reserves.map(p => p.name).join(', ')}` : '';
      return `🏀 CBA — Times sorteados\n\n⚫ TIME PRETO\n${teams.black.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}\n\n🟢 TIME VERDE\n${teams.green.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}${reserves}`;
    }
    if (drawnPlayers.length) return `🏀 CBA — Sorteio avulso\n\n${drawnPlayers.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}`;
    return '';
  }, [teams, drawnPlayers]);

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'CBA - Sorteio', text: shareText });
      else {
        await navigator.clipboard.writeText(shareText);
        setNotice({ type: 'success', text: 'Resultado copiado. Já pode colar no WhatsApp.' });
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setNotice({ type: 'error', text: 'Não foi possível compartilhar o resultado.' });
    }
  };

  const saveTeams = async () => {
    if (!teams || !isAdmin) return;
    setSaving(true);
    try {
      // O backend preserva o nome legado teamRed por compatibilidade. Na interface o segundo time é Verde.
      await postBackend('saveTeams', {
        teamBlack: teams.black.map(player => player.name).join(','),
        teamRed: teams.green.map(player => player.name).join(',')
      });
      const entry = {
        savedAt: new Date().toISOString(),
        black: teams.black.map(player => player.name),
        green: teams.green.map(player => player.name),
        reserves: teams.reserves.map(player => player.name)
      };
      setHistory(saveLocalHistory(entry));
      setNotice({ type: 'success', text: 'Sorteio salvo com sucesso no Supabase.' });
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Falha ao salvar o sorteio.' });
    } finally { setSaving(false); }
  };

  const newSelection = () => {
    setStep('selection');
    setTeams(null);
    setDrawnPlayers([]);
    setNotice(null);
  };

  const repeatDraw = () => {
    setTeams(null);
    setDrawnPlayers([]);
    setStep('mode');
    setNotice(null);
  };

  return <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8">
    <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/50 p-5 sm:p-7 shadow-2xl">
      <div className="flex flex-col lg:flex-row lg:items-end gap-5 justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-black text-emerald-400"><Shuffle className="w-4 h-4" /> Sorteio CBA</div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">Monte os times em poucos toques</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">Selecione quem está na quadra, escolha a modalidade e gere Time Preto, Time Verde e reservas.</p>
        </div>
        <div className="lg:min-w-[430px]"><Stepper step={step} /></div>
      </div>
    </div>

    {notice && <div className={`rounded-2xl border px-4 py-3 flex items-start gap-3 text-sm font-bold ${notice.type === 'error' ? 'border-rose-500/30 bg-rose-950/30 text-rose-300' : notice.type === 'success' ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-300'}`}>
      <Sparkles className="w-5 h-5 shrink-0 mt-0.5" /><span className="flex-1">{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Fechar"><X className="w-4 h-4" /></button>
    </div>}

    {step === 'selection' && <>
      <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-4">
          <div><h3 className="text-xl font-black text-white">1. Quem vai participar?</h3><p className="text-xs text-slate-500 mt-1">Toque no atleta para marcar ou desmarcar.</p></div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 self-start"><Users className="w-4 h-4 text-emerald-400"/><span className="text-2xl font-black text-emerald-400">{selected.length}</span><span className="text-[10px] uppercase font-black text-slate-500">selecionados</span></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 mb-4">
          <div className="relative"><Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar atleta..." className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-11 pr-4 py-3.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/30" /></div>
          <div className="flex gap-2 overflow-x-auto">
            <button onClick={selectAll} className="shrink-0 rounded-xl bg-slate-700 px-3.5 py-3 text-xs font-black text-white hover:bg-slate-600">Selecionar todos</button>
            <button onClick={clear} className="shrink-0 rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-3 text-xs font-black text-slate-300 hover:text-white">Limpar</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 min-w-0"><UserCheck className="w-5 h-5 text-emerald-400 shrink-0"/><div><p className="text-xs font-black text-white">Usar lista de presença</p><p className="text-[10px] text-slate-500">Carrega automaticamente quem está marcado como presente.</p></div></div>
          <div className="flex gap-2 sm:ml-auto">
            <select value={presenceDate} onChange={e => setPresenceDate(e.target.value)} className="min-w-0 flex-1 sm:flex-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-black text-white outline-none">
              {availableDates.map(date => <option key={date} value={date}>{fmtDate(date)}</option>)}
            </select>
            <button onClick={usePresent} disabled={!presenceDate} className="shrink-0 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40">Usar presentes</button>
          </div>
        </div>

        <div className="md:hidden mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3">
          <span className="text-xs font-black text-emerald-300">{selected.length} atleta{selected.length===1?'':'s'} selecionado{selected.length===1?'':'s'}</span>
          <button type="button" onClick={() => setStep('mode')} disabled={!selected.length} className="min-h-11 rounded-xl bg-emerald-500 px-4 py-2 font-black text-slate-950 disabled:opacity-40">Continuar →</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {filteredPlayers.map(player => {
            const active = selectedSet.has(player.name);
            return <button key={player.name} onClick={() => togglePlayer(player.name)} className={`min-h-[58px] rounded-2xl border p-3 flex items-center gap-3 text-left transition ${active ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-950/20' : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>{active ? <Check className="w-5 h-5"/> : <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-600"/>}</span>
              <div className="min-w-0 flex-1"><p className={`font-black truncate ${active ? 'text-white' : 'text-slate-200'}`}>{player.name}</p><p className="text-[10px] uppercase font-bold text-slate-500 truncate">{player.posicao || 'Posição não informada'}</p></div>
            </button>;
          })}
        </div>
        {!filteredPlayers.length && <div className="py-10 text-center text-sm font-bold text-slate-500">Nenhum atleta encontrado.</div>}
      </div>

      {history.length > 0 && <div className="rounded-3xl border border-slate-700 bg-slate-800/50 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3"><Clipboard className="w-4 h-4 text-slate-500"/><h3 className="text-sm font-black text-white">Últimos sorteios salvos neste dispositivo</h3></div>
        <div className="grid sm:grid-cols-3 gap-2">{history.map((item, index) => <div key={`${item.savedAt}-${index}`} className="rounded-2xl bg-slate-900 border border-slate-700 p-3"><p className="text-[10px] font-black uppercase text-slate-500">{new Date(item.savedAt).toLocaleDateString('pt-BR')}</p><p className="text-xs font-bold text-white mt-1">⚫ {item.black?.join(', ')}</p><p className="text-xs font-bold text-emerald-400 mt-1">🟢 {item.green?.join(', ')}</p></div>)}</div>
      </div>}

      <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1"><p className="text-xl font-black text-emerald-400 leading-none">{selected.length} selecionado{selected.length===1?'':'s'}</p><p className="text-xs text-slate-400 mt-1">Pronto para escolher o tipo de sorteio?</p></div>
        <button type="button" onClick={() => setStep('mode')} disabled={!selected.length} className="min-h-12 w-full sm:w-auto rounded-2xl bg-emerald-500 px-6 py-3 font-black text-slate-950 flex items-center justify-center gap-2 disabled:opacity-40">Continuar <ChevronRight className="w-5 h-5"/></button>
      </div>
    </>}

    {step === 'mode' && <div className="space-y-4">
      <button onClick={() => setStep('selection')} className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4"/> Voltar aos atletas</button>
      <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-4 sm:p-6 shadow-xl">
        <div className="mb-5"><h3 className="text-xl font-black text-white">2. Como deseja sortear?</h3><p className="text-xs text-slate-500 mt-1">{selected.length} atletas disponíveis para esta rodada.</p></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-slate-700 bg-slate-950 p-5 flex flex-col">
            <div className="flex items-center gap-3"><div className="flex -space-x-1"><span className="w-8 h-8 rounded-full bg-black border-2 border-slate-500"/><span className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-slate-950"/></div><div><h4 className="font-black text-white text-lg">Formar Times 5x5</h4><p className="text-[10px] uppercase font-black text-emerald-400">Preto x Verde</p></div></div>
            <p className="text-sm text-slate-400 mt-4 flex-1">Seleciona 10 atletas para a rodada e faz balanceamento assistido usando posição e produção registrada. Se houver mais de 10, os demais aparecem como reservas.</p>
            <div className="grid grid-cols-2 gap-2 my-4"><StatPill label="Em quadra" value={Math.min(selected.length, 10)} /><StatPill label="Reservas" value={Math.max(0, selected.length - 10)} /></div>
            <button onClick={generateTeams} disabled={selected.length < 10} className="w-full rounded-2xl bg-emerald-500 py-3.5 font-black text-slate-950 disabled:opacity-40 flex items-center justify-center gap-2"><Shuffle className="w-5 h-5"/> Gerar Preto x Verde</button>
            {selected.length < 10 && <p className="text-[10px] font-bold text-amber-400 text-center mt-2">Faltam {10 - selected.length} atleta(s) para o 5x5.</p>}
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-950 p-5 flex flex-col">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center"><Trophy className="w-5 h-5"/></div><div><h4 className="font-black text-white text-lg">Sorteio Avulso</h4><p className="text-[10px] uppercase font-black text-slate-500">Nomes individuais</p></div></div>
            <p className="text-sm text-slate-400 mt-4">Escolha quantos nomes deseja retirar do grupo selecionado.</p>
            <div className="mt-5"><p className="text-[10px] uppercase tracking-wider font-black text-slate-500 mb-2">Quantidade</p><div className="grid grid-cols-5 gap-2">{[1,2,3,4,5].map(number => <button key={number} onClick={() => setNumToDraw(number)} className={`aspect-square rounded-xl font-black ${numToDraw === number ? 'bg-white text-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{number}</button>)}</div></div>
            <button onClick={generateCustom} className="w-full rounded-2xl bg-white text-black py-3.5 font-black mt-5 flex items-center justify-center gap-2"><Sparkles className="w-5 h-5"/> Sortear {numToDraw} nome{numToDraw > 1 ? 's' : ''}</button>
          </div>
        </div>
      </div>
    </div>}

    {step === 'result' && teams && <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.18em] font-black text-emerald-400">Sorteio concluído</p><h3 className="text-2xl sm:text-3xl font-black text-white">3. Preto x Verde</h3></div><div className="flex gap-2"><button onClick={repeatDraw} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-black text-slate-300 flex items-center gap-2"><RotateCcw className="w-4 h-4"/> Refazer</button><button onClick={newSelection} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-300">Nova seleção</button></div></div>
      <div className="grid md:grid-cols-2 gap-4"><TeamCard title="TIME PRETO" players={teams.black} /><TeamCard title="TIME VERDE" players={teams.green} green /></div>
      {teams.reserves.length > 0 && <div className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-4 sm:p-5"><div className="flex items-center gap-2 mb-3"><Users className="w-5 h-5 text-amber-400"/><h4 className="font-black text-white">Reservas · {teams.reserves.length}</h4></div><div className="flex flex-wrap gap-2">{teams.reserves.map((player, index) => <span key={player.name} className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200">{index + 1}. {player.name}</span>)}</div></div>}
      <div className="grid sm:grid-cols-3 gap-2.5">
        <button onClick={share} className="rounded-2xl border border-slate-700 bg-slate-800 py-3.5 font-black text-white flex items-center justify-center gap-2"><Share2 className="w-5 h-5"/> Compartilhar</button>
        {isAdmin && <button onClick={saveTeams} disabled={saving} className="rounded-2xl bg-emerald-500 py-3.5 font-black text-slate-950 flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-5 h-5"/> {saving ? 'Salvando...' : 'Salvar sorteio'}</button>}
        <button onClick={repeatDraw} className="rounded-2xl bg-white py-3.5 font-black text-black flex items-center justify-center gap-2"><RotateCcw className="w-5 h-5"/> Sortear novamente</button>
      </div>
      {!isAdmin && <p className="text-xs text-slate-500 text-center">Somente o administrador pode salvar o sorteio no histórico do sistema.</p>}
    </div>}

    {step === 'result' && !teams && drawnPlayers.length > 0 && <div className="space-y-4">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.18em] font-black text-emerald-400">Sorteio concluído</p><h3 className="text-2xl sm:text-3xl font-black text-white">3. Sorteio avulso</h3></div><button onClick={newSelection} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-300">Nova seleção</button></div>
      <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-4 sm:p-6"><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{drawnPlayers.map((player, index) => <div key={player.name} className="rounded-2xl bg-slate-950 border border-slate-700 p-4 flex items-center gap-3"><span className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-lg">{index + 1}</span><div className="min-w-0"><p className="font-black text-white truncate">{player.name}</p><p className="text-[10px] uppercase font-bold text-slate-500">{player.posicao || 'Atleta'}</p></div></div>)}</div></div>
      <div className="grid sm:grid-cols-2 gap-2.5"><button onClick={share} className="rounded-2xl border border-slate-700 bg-slate-800 py-3.5 font-black text-white flex items-center justify-center gap-2"><Share2 className="w-5 h-5"/> Compartilhar</button><button onClick={repeatDraw} className="rounded-2xl bg-white py-3.5 font-black text-black flex items-center justify-center gap-2"><RotateCcw className="w-5 h-5"/> Sortear novamente</button></div>
    </div>}
  </div>;
}

export default function SorteioDashboardBridge() {
  const [mountNode, setMountNode] = useState(null);
  const [active, setActive] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setError('');
      const payload = await postBackend('getInitialAppData');
      setData(payload?.data || payload || {});
    } catch (err) { setError(err?.message || 'Falha ao carregar o Sorteio.'); }
  }, []);

  useEffect(() => { if (active) refresh(); }, [active, refresh]);

  useEffect(() => {
    let node = null;
    let hiddenRoot = null;
    const sync = () => {
      const button = document.querySelector('button[title="Sorteio"]');
      const isActive = Boolean(button?.className?.includes('scale-110'));
      setActive(isActive);

      const heading = [...document.querySelectorAll('h2')].find(element => element.textContent?.trim() === 'Sorteador Automático');
      const legacyRoot = heading?.closest('.space-y-8');
      if (!legacyRoot?.parentElement) return;

      if (hiddenRoot && hiddenRoot !== legacyRoot && hiddenRoot.isConnected) hiddenRoot.style.display = '';
      hiddenRoot = legacyRoot;

      if (!node || !node.isConnected) {
        node = document.createElement('div');
        node.dataset.sorteioDashboardV2 = 'true';
        legacyRoot.insertAdjacentElement('afterend', node);
        setMountNode(node);
      }
      legacyRoot.style.display = isActive ? 'none' : '';
      node.style.display = isActive ? '' : 'none';
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      if (hiddenRoot?.isConnected) hiddenRoot.style.display = '';
      if (node?.isConnected) node.remove();
    };
  }, []);

  if (!active || !mountNode) return null;
  if (error) return createPortal(<div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm font-bold text-rose-300">{error}</div>, mountNode);
  if (!data) return createPortal(<div className="rounded-3xl border border-slate-700 bg-slate-800 p-8 text-center text-sm font-bold text-slate-500">Carregando Sorteio...</div>, mountNode);

  const { role } = readSession();
  return createPortal(<SorteioExperience players={data?.dashboard?.players || []} dates={data?.dashboard?.dates || []} isAdmin={String(role).toUpperCase() === 'ADMIN'} />, mountNode);
}
