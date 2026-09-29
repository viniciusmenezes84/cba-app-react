import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarDays, Home, PartyPopper, RefreshCw, WalletCards } from 'lucide-react';
import { portalPost } from './cbaApi';
import AgendaView from './AgendaView';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = value => {
  if (!value) return '--';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '--';
};
const todayBahia = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

function Panel({ children }) {
  return <div className="rounded-3xl border border-slate-700/80 bg-slate-900/75 p-5 shadow-xl">{children}</div>;
}
function Pill({ children, tone = 'emerald' }) {
  const tones = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-300'
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${tones[tone]}`}>{children}</span>;
}

export function HomeView({ data, isAdmin, onNavigate, onOpenAgenda }) {
  const nextGame = useMemo(() => (data.games || [])
    .filter(game => !game.cancelledAt && game.date >= todayBahia())
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0], [data.games]);
  const nextEvent = useMemo(() => (data.events || [])
    .filter(event => String(event.startsAt).slice(0, 10) >= todayBahia())
    .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)))[0], [data.events]);
  const finance = data.finance || {};
  const currentYear = finance.currentYear;
  const currentIds = new Set((finance.periods || [])
    .filter(period => Number(period.year) === Number(currentYear))
    .map(period => period.id));
  const ownDues = (finance.dues || []).filter(due => finance.ownerAthleteId
    && due.athlete_id === finance.ownerAthleteId && currentIds.has(due.period_id));
  const debt = ownDues.reduce((sum, due) => ['exempt', 'isento'].includes(String(due.status || '').toLowerCase())
    ? sum : sum + Math.max(0, Number(due.amount_due || 0) - Number(due.amount_paid || 0)), 0);
  const latestNotice = data.notifications?.[0];

  return <div className="space-y-5 pb-24 md:pb-8">
    <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 p-5 shadow-2xl sm:p-7">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-emerald-300"><Home className="h-4 w-4" />Início</span>
          <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Olá, {data.user?.name || 'atleta'}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">O que importa no CBA agora, sem precisar procurar em várias abas.</p>
          <button type="button" onClick={onOpenAgenda} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950"><CalendarDays className="h-4 w-4"/>Abrir minha agenda</button>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
          {[
            ['Atletas', data.overview?.athletes || 0, 'text-white'],
            ['Jogos', data.overview?.upcomingGames || 0, 'text-emerald-300'],
            ['DM', data.overview?.dmActive || 0, 'text-rose-300']
          ].map(([label, value, color]) => <div key={label} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-center"><p className={`text-xl font-black ${color}`}>{value}</p><p className="text-[9px] font-black uppercase text-slate-500">{label}</p></div>)}
        </div>
      </div>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <div className="flex items-center justify-between"><div><Pill>Próximo jogo</Pill><h3 className="mt-3 text-xl font-black text-white">{nextGame ? fmtDate(nextGame.date) : 'Nenhum jogo agendado'}</h3></div><CalendarDays className="h-8 w-8 text-emerald-400" /></div>
        {nextGame && <><p className="mt-2 text-sm text-slate-400">{nextGame.time} · {nextGame.location}</p><p className="mt-4 text-xs text-slate-500">{nextGame.confirmed?.length || 0} confirmados</p></>}
        <button type="button" onClick={() => onNavigate('jogos')} className={`mt-4 w-full rounded-2xl py-3 font-black ${nextGame ? 'bg-emerald-500 text-slate-950' : 'border border-slate-700 bg-slate-800 text-white'}`}>{nextGame ? 'Ver jogo' : 'Ir para Jogos'}</button>
      </Panel>
      <Panel>
        <div className="flex items-center justify-between"><div><Pill tone={debt > 0 ? 'rose' : 'emerald'}>Minha situação</Pill><h3 className={`mt-3 text-2xl font-black ${debt > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{!finance.ownerAthleteId ? 'Sem vínculo' : debt > 0 ? money(debt) : 'Em dia'}</h3></div><WalletCards className="h-8 w-8 text-slate-400" /></div>
        <p className="mt-2 text-xs text-slate-500">{currentIds.size ? `Exercício ${currentYear}` : currentYear ? `Exercício ${currentYear} ainda não preparado` : 'Exercício ainda não preparado'}</p>
        <button type="button" onClick={() => onNavigate('financas')} className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-800 py-3 font-black text-white">Ver financeiro</button>
      </Panel>
      <Panel>
        <div className="flex items-center justify-between"><div><Pill tone="amber">Próximo evento</Pill><h3 className="mt-3 text-xl font-black text-white">{nextEvent?.name || 'Nenhum evento agendado'}</h3></div><PartyPopper className="h-8 w-8 text-amber-300" /></div>
        {nextEvent && <p className="mt-2 text-sm text-slate-400">{fmtDate(nextEvent.startsAt)} · {nextEvent.location}</p>}
        <button type="button" onClick={() => onNavigate('eventos')} className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-800 py-3 font-black text-white">Ver eventos</button>
      </Panel>
      <Panel>
        <div className="flex items-center justify-between"><div><Pill tone="blue">Comunicação</Pill><h3 className="mt-3 text-xl font-black text-white">{latestNotice?.title || 'Sem avisos recentes'}</h3></div><BellRing className="h-8 w-8 text-blue-300" /></div>
        <p className="mt-2 line-clamp-2 text-sm text-slate-400">{latestNotice?.message || 'Os avisos do CBA aparecerão aqui.'}</p>
        {isAdmin && <button type="button" onClick={() => onNavigate('notificacoes')} className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-800 py-3 font-black text-white">Central de comunicação</button>}
      </Panel>
    </div>
  </div>;
}

export default function HomeDashboard({ isAdmin, onNavigate, refreshKey = 0 }) {
  const [attempt, setAttempt] = useState(0);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [state, setState] = useState({ data: null, error: '', loading: true });

  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: '' }));
    portalPost('bootstrap', {}, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ data, error: '', loading: false }); })
      .catch(error => { if (!controller.signal.aborted) setState({ data: null, error: error?.message || 'Falha ao carregar os dados do portal.', loading: false }); });
    return () => controller.abort();
  }, [attempt, refreshKey]);

  if (state.loading) return <div role="status" className="rounded-3xl border border-slate-700 bg-slate-900/75 p-10 text-center text-slate-400"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-400" /><p className="mt-3 text-sm font-bold">Atualizando dados do CBA...</p></div>;
  if (state.error) return <div role="alert" className="rounded-3xl border border-slate-700 bg-slate-900/75 p-8 text-center text-white"><h2 className="text-lg font-black">Não foi possível carregar o Início</h2><p className="mt-2 text-sm text-slate-400">{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-5 rounded-xl bg-emerald-500 px-4 py-2.5 font-black text-slate-950">Tentar novamente</button></div>;
  if (agendaOpen) return <AgendaView data={state.data} onBack={() => setAgendaOpen(false)} onNavigate={onNavigate} />;
  return <HomeView data={state.data} isAdmin={isAdmin} onNavigate={onNavigate} onOpenAgenda={() => setAgendaOpen(true)} />;
}
