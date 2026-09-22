import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity, AlertTriangle, BarChart3, BellRing, BookOpen, CalendarDays,
  Check, CheckCircle2, Copy, CreditCard, DollarSign, Edit3,
  FileText, Home, MapPin, PartyPopper, Plus, RefreshCw, Search,
  Send, ShieldCheck, Star, Trash2, Trophy, UserCheck, Users, WalletCards, X
} from 'lucide-react';

const PORTAL_URL = 'https://vqirdswgchlcxevepamu.supabase.co/functions/v1/cba-portal';
const GATEWAY_URL = 'https://vqirdswgchlcxevepamu.supabase.co/functions/v1/cba-gateway';
const SESSION_KEYS = ['cba_session_v2', 'cba_session_v1'];
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const cx = (...values) => values.filter(Boolean).join(' ');
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = value => {
  if (!value) return '--';
  const raw = String(value).slice(0, 10);
  const [y,m,d] = raw.split('-');
  return y && m && d ? `${d}/${m}/${y}` : '--';
};
const todayBahia = () => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Bahia', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
const normalize = value => String(value || '').trim().toLowerCase();
const isAdminSession = () => String(readSession()?.role || '').toUpperCase() === 'ADMIN';

function readSession() {
  for (const key of SESSION_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const user = parsed?.user?.user || parsed?.user || parsed;
      const token = parsed?.user?.token || parsed?.user?.user?.token || parsed?.token || user?.token;
      if (token) return { token, role:user?.role || parsed?.role || '', email:user?.email || parsed?.email || '', name:user?.name || '' };
    } catch { /* tenta próxima */ }
  }
  try {
    const raw = window.sessionStorage.getItem('cba_session_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { token: parsed?.token || parsed?.user?.token, role:parsed?.role || parsed?.user?.role || '', email:parsed?.email || parsed?.user?.email || '', name:parsed?.name || parsed?.user?.name || '' };
    }
  } catch { /* sem impacto */ }
  return null;
}

async function post(url, action, payload = {}) {
  const session = readSession();
  if (!session?.token) throw new Error('Sessão não encontrada. Entre novamente no portal.');
  const response = await fetch(url, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body:JSON.stringify({ action, token:session.token, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.result === 'error') throw new Error(data?.message || 'Falha ao comunicar com o servidor.');
  return data;
}
const portalPost = (action,payload={}) => post(PORTAL_URL,action,payload);
const gatewayPost = (action,payload={}) => post(GATEWAY_URL,action,payload);

function Panel({ children, className='' }) {
  return <div className={cx('rounded-3xl border border-slate-700/80 bg-slate-900/75 shadow-xl',className)}>{children}</div>;
}
function Pill({ children, tone='slate' }) {
  const tones = {
    slate:'border-slate-700 bg-slate-800 text-slate-300',
    emerald:'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    rose:'border-rose-500/30 bg-rose-500/10 text-rose-300',
    amber:'border-amber-500/30 bg-amber-500/10 text-amber-300',
    blue:'border-blue-500/30 bg-blue-500/10 text-blue-300'
  };
  return <span className={cx('inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide',tones[tone] || tones.slate)}>{children}</span>;
}
function Empty({ icon:Icon=Activity, title, text, action }) {
  return <Panel className="p-8 sm:p-12 text-center"><Icon className="w-12 h-12 mx-auto text-slate-600"/><h3 className="text-lg font-black text-white mt-3">{title}</h3><p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{text}</p>{action && <div className="mt-5">{action}</div>}</Panel>;
}
function Modal({ open, title, onClose, children, wide=false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown',onKey);
    return () => document.removeEventListener('keydown',onKey);
  },[open,onClose]);
  if (!open) return null;
  return createPortal(<div className="fixed inset-0 z-[220] bg-slate-950/85 backdrop-blur-sm p-3 sm:p-5 flex items-end sm:items-center justify-center" onMouseDown={e=>{if(e.target===e.currentTarget)onClose?.();}}>
    <div className={cx('w-full max-h-[94vh] rounded-t-3xl sm:rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col',wide?'sm:max-w-4xl':'sm:max-w-xl')}>
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-800"><h3 className="font-black text-white text-lg">{title}</h3><button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center"><X className="w-5 h-5"/></button></div>
      <div className="overflow-y-auto flex-1 p-4 sm:p-6">{children}</div>
    </div>
  </div>,document.body);
}

function Header({ icon:Icon, kicker, title, text, children }) {
  return <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 p-5 sm:p-7 shadow-2xl">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div><div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-emerald-300"><Icon className="w-4 h-4"/>{kicker}</div><h2 className="text-2xl sm:text-3xl font-black text-white mt-3">{title}</h2><p className="text-sm text-slate-400 mt-1 max-w-2xl">{text}</p></div>
      {children}
    </div>
  </div>;
}

function HomeView({ data }) {
  const nextGame = useMemo(() => (data.games || []).filter(g=>!g.cancelledAt && g.date >= todayBahia()).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0], [data.games]);
  const nextEvent = useMemo(() => (data.events || []).filter(e=>String(e.startsAt).slice(0,10)>=todayBahia()).sort((a,b)=>String(a.startsAt).localeCompare(String(b.startsAt)))[0], [data.events]);
  const ownDues = data.finance?.dues || [];
  const currentYear = data.finance?.currentYear;
  const currentPeriods = (data.finance?.periods || []).filter(p=>Number(p.year)===Number(currentYear));
  const currentIds = new Set(currentPeriods.map(p=>p.id));
  const ownYearDues = ownDues.filter(d=>currentIds.has(d.period_id));
  const debt = ownYearDues.reduce((sum,d)=>sum+Math.max(0,Number(d.amount_due||0)-Number(d.amount_paid||0)),0);
  const latestNotice = data.notifications?.[0];

  return <div className="space-y-5 pb-24 md:pb-8">
    <Header icon={Home} kicker="Início" title={`Olá, ${data.user?.name || 'atleta'}`} text="O que importa no CBA agora, sem precisar procurar em várias abas.">
      <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
        <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-center"><p className="text-xl font-black text-white">{data.overview?.athletes || 0}</p><p className="text-[9px] uppercase font-black text-slate-500">Atletas</p></div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-center"><p className="text-xl font-black text-emerald-300">{data.overview?.upcomingGames || 0}</p><p className="text-[9px] uppercase font-black text-slate-500">Jogos</p></div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-center"><p className="text-xl font-black text-rose-300">{data.overview?.dmActive || 0}</p><p className="text-[9px] uppercase font-black text-slate-500">DM</p></div>
      </div>
    </Header>

    <div className="grid lg:grid-cols-2 gap-4">
      <Panel className="p-5">
        <div className="flex items-center justify-between"><div><Pill tone="emerald">Próximo jogo</Pill><h3 className="text-xl font-black text-white mt-3">{nextGame ? fmtDate(nextGame.date) : 'Nenhum jogo agendado'}</h3></div><CalendarDays className="w-8 h-8 text-emerald-400"/></div>
        {nextGame ? <><p className="text-sm text-slate-400 mt-2">{nextGame.time} · {nextGame.location}</p><p className="text-xs text-slate-500 mt-4">{nextGame.confirmed.length} confirmados</p><button onClick={()=>window.navigateToTab?.('jogos')} className="mt-4 w-full rounded-2xl bg-emerald-500 py-3 text-slate-950 font-black">Ver jogo</button></> : <button onClick={()=>window.navigateToTab?.('jogos')} className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-800 py-3 text-white font-black">Ir para Jogos</button>}
      </Panel>

      <Panel className="p-5">
        <div className="flex items-center justify-between"><div><Pill tone={debt>0?'rose':'emerald'}>Minha situação</Pill><h3 className={cx('text-2xl font-black mt-3',debt>0?'text-rose-300':'text-emerald-300')}>{debt>0?money(debt):'Em dia'}</h3></div><WalletCards className="w-8 h-8 text-slate-400"/></div>
        <p className="text-xs text-slate-500 mt-2">{currentPeriods.length ? `Exercício ${currentYear}` : `Exercício ${currentYear} ainda não preparado`}</p>
        <button onClick={()=>window.navigateToTab?.('financas')} className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-800 py-3 text-white font-black">Ver financeiro</button>
      </Panel>

      <Panel className="p-5">
        <div className="flex items-center justify-between"><div><Pill tone="amber">Próximo evento</Pill><h3 className="text-xl font-black text-white mt-3">{nextEvent?.name || 'Nenhum evento agendado'}</h3></div><PartyPopper className="w-8 h-8 text-amber-300"/></div>
        {nextEvent && <p className="text-sm text-slate-400 mt-2">{fmtDate(nextEvent.startsAt)} · {nextEvent.location}</p>}
        <button onClick={()=>window.navigateToTab?.('eventos')} className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-800 py-3 text-white font-black">Ver eventos</button>
      </Panel>

      <Panel className="p-5">
        <div className="flex items-center justify-between"><div><Pill tone="blue">Comunicação</Pill><h3 className="text-xl font-black text-white mt-3">{latestNotice?.title || 'Sem avisos recentes'}</h3></div><BellRing className="w-8 h-8 text-blue-300"/></div>
        <p className="text-sm text-slate-400 mt-2 line-clamp-2">{latestNotice?.message || 'Os avisos do CBA aparecerão aqui.'}</p>
        {isAdminSession() && <button onClick={()=>window.navigateToTab?.('notificacoes')} className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-800 py-3 text-white font-black">Central de comunicação</button>}
      </Panel>
    </div>
  </div>;
}

function financeStatus(due, period) {
  if (!period) return { label:'Não preparado',tone:'slate' };
  if (!due) return { label:'Sem lançamento',tone:'slate' };
  if (due.status === 'exempt') return { label:'Isento',tone:'blue' };
  const paid=Number(due.amount_paid||0), amount=Number(due.amount_due||0);
  if (amount > 0 && paid >= amount) return { label:'Pago',tone:'emerald' };
  if (paid > 0 && paid < amount) return { label:'Parcial',tone:'amber' };
  return { label: String(period.due_date||'') < todayBahia() ? 'Vencido' : 'A vencer', tone:String(period.due_date||'') < todayBahia()?'rose':'slate' };
}

function FinanceView({ data, refresh }) {
  const f=data.finance || {};
  // A autorização efetiva vem do backend, nunca de um parâmetro de tela.
  const isAdmin=String(data.user?.role).toUpperCase()==='ADMIN' && f.accessScope==='all';
  const ownAthleteId=f.ownerAthleteId || '';
  const [year,setYear]=useState(f.currentYear || new Date().getFullYear());
  const [athleteId,setAthleteId]=useState(isAdmin ? (ownAthleteId || data.athletes?.[0]?.id || '') : ownAthleteId);
  const [filter,setFilter]=useState('todos');
  const [monthFilter,setMonthFilter]=useState('todos');
  const [search,setSearch]=useState('');
  const [copy,setCopy]=useState(false);
  const [busy,setBusy]=useState(false);
  const periods=(f.periods||[]).filter(p=>Number(p.year)===Number(year));
  const periodByMonth=new Map(periods.map(p=>[Number(p.month),p]));
  const targetAthleteId=isAdmin ? athleteId : ownAthleteId;
  const duesForAthlete=(f.dues||[]).filter(d=>d.athlete_id===targetAthleteId);
  const dueByPeriod=new Map(duesForAthlete.map(d=>[d.period_id,d]));
  const months=MONTHS.map((label,i)=>{const period=periodByMonth.get(i+1); const due=period?dueByPeriod.get(period.id):null; return {month:i+1,label,period,due,status:financeStatus(due,period)};});
  const yearDebt=months.reduce((sum,m)=>sum+(m.due&&!['exempt','isento'].includes(normalize(m.due.status))?Math.max(0,Number(m.due.amount_due||0)-Number(m.due.amount_paid||0)):0),0);
  const paidCount=months.filter(m=>m.status.label==='Pago'||m.status.label==='Isento').length;
  const recordedCount=months.filter(m=>Boolean(m.due)).length;
  const group=f.aggregateByYear?.[String(year)] || {amountDue:0,amountPaid:0,outstanding:0};
  const monthlyDues=useMemo(()=>{
    if(!isAdmin) return [];
    const selectedPeriod=monthFilter==='todos' ? null : periodByMonth.get(Number(monthFilter));
    return (data.athletes||[]).map(a=>{
      const own=(f.dues||[]).filter(d=>d.athlete_id===a.id);
      const relevant=selectedPeriod?own.filter(d=>d.period_id===selectedPeriod.id):own.filter(d=>periods.some(p=>p.id===d.period_id));
      const due=selectedPeriod?relevant[0]:null;
      const status=selectedPeriod ? financeStatus(due,selectedPeriod) : null;
      const outstanding=relevant.reduce((sum,d)=>sum+(['exempt','isento'].includes(normalize(d.status))?0:Math.max(0,Number(d.amount_due||0)-Number(d.amount_paid||0))),0);
      const settled=relevant.filter(d=>['Pago','Isento'].includes(financeStatus(d,periods.find(p=>p.id===d.period_id)).label)).length;
      const totalPaid=relevant.reduce((sum,d)=>sum+Number(d.amount_paid||0),0);
      const category=selectedPeriod ? (status?.label==='Pago'?'pago':status?.label==='Parcial'?'parcial':status?.label==='Isento'?'isento':status?.label==='Vencido'?'pendente':status?.label==='A vencer'?'pendente':'sem_registro') : (relevant.length===0?'sem_registro':outstanding>0?'pendente':'pago');
      return {...a,outstanding,settled,totalPaid,category,status,hasRecords:relevant.length>0};
    }).filter(a=>(filter==='todos'||filter===a.category) && normalize(a.name).includes(normalize(search)))
      .sort((a,b)=>b.outstanding-a.outstanding||a.name.localeCompare(b.name));
  },[isAdmin,data.athletes,f.dues,periods,monthFilter,filter,search]);

  const prepare=async()=>{
    setBusy(true);
    try{await portalPost('prepareFinanceYear',{year:Number(year)});await refresh();}
    catch(e){window.alert(e.message);}
    finally{setBusy(false);}
  };
  const copyPix=async()=>{try{await navigator.clipboard.writeText(f.pixCode||'');setCopy(true);setTimeout(()=>setCopy(false),1800);}catch{}};

  return <div className="space-y-5 pb-24 md:pb-8">
    <Header icon={DollarSign} kicker="Financeiro" title="Finanças do CBA" text="Valores reais do Supabase, sem interpretação por texto ou mensalidade fixa no frontend.">
      <select value={year} onChange={e=>setYear(Number(e.target.value))} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-black text-white outline-none">
        {(f.years||[f.currentYear]).map(y=><option key={y} value={y}>{y}</option>)}
      </select>
    </Header>

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {[['Saldo geral do CBA',money(f.summary?.balance),WalletCards,'text-white'],['Receitas gerais',money(f.summary?.revenue),BarChart3,'text-emerald-300'],['Despesas gerais',money(f.summary?.expense),CreditCard,'text-rose-300'],['A receber pelo CBA · '+year,money(group.outstanding),AlertTriangle,group.outstanding?'text-amber-300':'text-emerald-300']].map(([label,value,Icon,tone])=><Panel key={label} className="p-4"><div className="flex items-center justify-between"><p className="text-[9px] uppercase tracking-wider font-black text-slate-500">{label}</p><Icon className={cx('w-4 h-4',tone)}/></div><p className={cx('text-xl sm:text-2xl font-black mt-2 break-words',tone)}>{value}</p></Panel>)}
    </div>

    <Panel className="p-4 sm:p-5"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div><Pill tone={isAdmin?'amber':'emerald'}>{isAdmin?'Gestão administrativa':'Meu histórico financeiro'}</Pill><h3 className="text-lg font-black text-white mt-2">{isAdmin?'Todos os pagamentos, atleta por atleta':'Apenas seus pagamentos individuais'}</h3><p className="text-xs text-slate-400 mt-1">{isAdmin?'Consulte quem pagou, quem está pendente, valores e competências.':'Você pode acompanhar suas mensalidades e os valores gerais do CBA. Os pagamentos de outros atletas não são compartilhados.'}</p></div>
      <p className="text-sm font-black text-slate-300">{isAdmin?'Ano '+year:!ownAthleteId?'Conta sem atleta vinculado':recordedCount ? money(yearDebt)+' de pendência pessoal' : 'Nenhuma mensalidade lançada para você'}</p>
    </div></Panel>
    {!periods.length && <Empty icon={CalendarDays} title={`Exercício ${year} ainda não preparado`} text="Nenhuma competência foi criada para este ano. Isso não gera dívida automaticamente." action={isAdmin?<button onClick={prepare} disabled={busy} className="rounded-2xl bg-emerald-500 text-slate-950 px-5 py-3 font-black">{busy?'Preparando...':'Preparar 12 competências'}</button>:null}/>}

    {periods.length>0 && <>
      {isAdmin && <Panel className="p-4"><div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-slate-500">Consultar atleta</p><p className="text-sm text-slate-400 mt-1">A situação abaixo é individual.</p></div><select value={targetAthleteId} onChange={e=>setAthleteId(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white">{(data.athletes||[]).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div></Panel>}
      <Panel className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4"><div><h3 className="text-xl font-black text-white">{isAdmin?'Histórico do atleta selecionado':'Meu histórico de pagamentos'}</h3><p className="text-xs text-slate-400 mt-1">{recordedCount} competências lançadas · {paidCount} quitadas ou isentas · pendência pessoal {money(yearDebt)}</p></div></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">{months.map(m=><div key={m.month} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs font-black text-white">{m.label}</p><Pill tone={m.status.tone}>{m.status.label}</Pill></div>{m.due&&<div className="mt-3 text-[10px] text-slate-500"><p>Devido: <strong className="text-slate-300">{money(m.due.amount_due)}</strong></p><p>Pago: <strong className="text-slate-300">{money(m.due.amount_paid)}</strong></p>{m.due.paid_at&&<p>Último pagamento: {new Date(m.due.paid_at).toLocaleDateString('pt-BR')}</p>}</div>}</div>)}</div>
      </Panel>
    </>}

    <div className="grid lg:grid-cols-[1.5fr_.8fr] gap-4">
      {isAdmin ? <Panel className="p-5"><div className="flex flex-col gap-3 mb-4"><div><h3 className="text-lg font-black text-white">Gestão de pagamentos</h3><p className="text-xs text-slate-500">Visualização administrativa de todos os atletas, com identificação de quem pagou e quem não pagou.</p></div><div className="flex flex-col sm:flex-row gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar atleta..." aria-label="Buscar atleta" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"/><select value={monthFilter} onChange={e=>{setMonthFilter(e.target.value);setFilter('todos');}} aria-label="Competência para filtrar" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white"><option value="todos">Ano inteiro</option>{periods.map(p=><option key={p.id} value={String(p.month)}>{MONTHS[Number(p.month)-1]} / {year}</option>)}</select></div><div className="flex flex-wrap gap-1.5">{[['todos','Todos'],['pago','Pagos / em dia'],['pendente','Pendentes'],...(monthFilter==='todos'?[]:[['parcial','Parciais'],['isento','Isentos']]),['sem_registro','Sem lançamento']].map(([key,label])=><button key={key} onClick={()=>setFilter(key)} className={cx('rounded-xl px-3 py-2.5 text-xs font-black min-h-10',filter===key?'bg-emerald-500 text-slate-950':'bg-slate-800 text-slate-300')}>{label}</button>)}</div></div><p className="text-[11px] font-bold text-slate-500 mb-3">{monthlyDues.length} atleta(s) nesta visão · clique para consultar o histórico completo.</p><div className="space-y-2 max-h-[400px] overflow-y-auto">{monthlyDues.map(a=><button key={a.id} onClick={()=>setAthleteId(a.id)} className={cx('w-full rounded-2xl border p-3 flex items-center justify-between gap-3 text-left min-h-14',targetAthleteId===a.id?'border-emerald-500/50 bg-emerald-950/20':'border-slate-800 bg-slate-950/50')}><div className="min-w-0"><p className="font-black text-white truncate">{a.name}</p><p className="text-[10px] text-slate-400">{monthFilter==='todos'?a.hasRecords?`${a.settled} quitadas/isentas · ${money(a.totalPaid)} pagos`:'Sem mensalidades lançadas':`${a.status?.label||'Sem lançamento'} · pago ${money(a.totalPaid)}`}</p></div><div className="shrink-0 text-right"><Pill tone={a.category==='pago'||a.category==='isento'?'emerald':a.category==='sem_registro'?'slate':'rose'}>{a.category==='sem_registro'?'Sem lançamento':a.category==='pago'?'Pago':a.category==='pendente'?'Pendente':a.category==='isento'?'Isento':'Parcial'}</Pill><p className={cx('text-xs font-black mt-1',a.outstanding?'text-rose-300':'text-slate-400')}>{a.outstanding?money(a.outstanding):'Sem pendência'}</p></div></button>)}{!monthlyDues.length&&<p className="text-sm text-slate-500 py-6 text-center">Nenhum atleta encontrado para esse filtro.</p>}</div></Panel> : <Panel className="p-5"><h3 className="text-lg font-black text-white">Minha situação</h3><p className="text-sm text-slate-400 mt-2">{!ownAthleteId?'Sua conta não possui um atleta vinculado. Solicite a vinculação a um administrador.':!recordedCount?'Nenhuma mensalidade individual lançada neste exercício.':yearDebt>0?`Você possui ${money(yearDebt)} pendente em ${year}.`:`Suas mensalidades registradas para ${year} estão em dia.`}</p></Panel>}

      <Panel className="p-5 bg-gradient-to-br from-slate-900 to-emerald-950/30"><Pill tone="emerald">PIX CBA</Pill><h3 className="text-lg font-black text-white mt-3">Pagamento</h3><p className="text-xs text-slate-500 mt-1">Copie a chave oficial cadastrada no portal.</p><div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-3 flex items-center gap-2"><code className="min-w-0 flex-1 truncate text-xs text-slate-300">{f.pixCode || 'PIX não configurado'}</code><button disabled={!f.pixCode} onClick={copyPix} className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center disabled:opacity-40">{copy?<Check className="w-4 h-4"/>:<Copy className="w-4 h-4"/>}</button></div></Panel>
    </div>
    {isAdmin && <Panel className="p-5"><h3 className="text-lg font-black text-white">Lançamentos financeiros do CBA</h3><p className="text-xs text-slate-500 mt-1">Detalhamento exclusivo para administradores.</p><div className="mt-4 space-y-2">{(f.entries||[]).filter(e=>String(e.occurred_on||'').startsWith(String(year))).slice(0,30).map(e=><div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="min-w-0"><p className="text-sm font-black text-white truncate">{e.description||e.category||'Lançamento'}</p><p className="text-[10px] text-slate-500">{fmtDate(e.occurred_on)} · {e.category||'Outros'}</p></div><strong className={e.kind==='revenue'?'text-emerald-300':'text-rose-300'}>{e.kind==='revenue'?'+':'−'}{money(e.amount)}</strong></div>)}{!(f.entries||[]).some(e=>String(e.occurred_on||'').startsWith(String(year)))&&<p className="text-sm text-slate-500 py-4">Nenhum lançamento neste ano.</p>}</div></Panel>}
  </div>;
}

function compactNames(names) {
  const list=names||[]; return { visible:list.slice(0,6), rest:Math.max(0,list.length-6) };
}
function GameForm({ item, onClose, onSaved }) {
  const [form,setForm]=useState({date:item?.date||'',time:item?.time||'',location:item?.location||''});
  const [busy,setBusy]=useState(false);
  const submit=async e=>{e.preventDefault();setBusy(true);try{await gatewayPost(item?'updateGame':'createGame',{id:item?.id,data:form.date,horario:form.time,local:form.location});onSaved();onClose();}catch(err){window.alert(err.message);}finally{setBusy(false);}};
  return <form onSubmit={submit} className="space-y-4">{[['Data','date','date'],['Horário','time','time'],['Local','location','text']].map(([label,key,type])=><label key={key} className="block"><span className="text-[10px] uppercase font-black text-slate-500">{label}</span><input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3.5 text-white outline-none" required/></label>)}<button disabled={busy} className="w-full rounded-2xl bg-emerald-500 text-slate-950 py-3.5 font-black">{busy?'Salvando...':item?'Atualizar jogo':'Criar jogo'}</button></form>;
}

function GamesView({ data, refresh }) {
  const isAdmin=String(data.user?.role).toUpperCase()==='ADMIN';
  const [view,setView]=useState('proximos'); const [formGame,setFormGame]=useState(undefined); const [cancelGame,setCancelGame]=useState(null); const [reason,setReason]=useState(''); const [busy,setBusy]=useState(false);
  const games=data.games||[]; const today=todayBahia();
  const upcoming=games.filter(g=>!g.cancelledAt&&g.date>=today).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const history=games.filter(g=>!g.cancelledAt&&g.date<today).sort((a,b)=>b.date.localeCompare(a.date));
  const cancelled=games.filter(g=>g.cancelledAt).sort((a,b)=>b.date.localeCompare(a.date));
  const list=view==='proximos'?upcoming:view==='historico'?history:cancelled;
  const session=readSession(); const ownName=data.user?.name||session?.name||'';
  const attend=async g=>{setBusy(true);try{await gatewayPost('handleAttendanceUpdate',{itemId:g.id,actionType:g.confirmed.includes(ownName)?'withdraw':'confirm',type:'game'});await refresh();}catch(e){window.alert(e.message);}finally{setBusy(false);}};
  const cancel=async()=>{if(!cancelGame||!reason.trim())return;setBusy(true);try{await portalPost('cancelGame',{id:cancelGame.id,reason});setCancelGame(null);setReason('');await refresh();}catch(e){window.alert(e.message);}finally{setBusy(false);}};
  const restore=async g=>{setBusy(true);try{await portalPost('restoreGame',{id:g.id});await refresh();}catch(e){window.alert(e.message);}finally{setBusy(false);}};
  const del=async g=>{if(!window.confirm('Excluir definitivamente este jogo?'))return;setBusy(true);try{await gatewayPost('deleteGame',{id:g.id});await refresh();}catch(e){window.alert(e.message);}finally{setBusy(false);}};
  const next=upcoming[0];

  return <div className="space-y-5 pb-24 md:pb-8">
    <Header icon={CalendarDays} kicker="Jogos" title="Calendário de jogos" text="Próximos compromissos, confirmações e histórico em uma visão mais rápida.">
      {isAdmin&&<button onClick={()=>setFormGame(null)} className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-slate-950 flex items-center gap-2"><Plus className="w-4 h-4"/>Novo jogo</button>}
    </Header>
    {next && <Panel className="p-5 border-emerald-500/30"><div className="flex flex-col md:flex-row md:items-center gap-5 justify-between"><div><Pill tone="emerald">Próximo jogo</Pill><h3 className="text-2xl font-black text-white mt-3">{fmtDate(next.date)} · {next.time}</h3><p className="text-sm text-slate-400 mt-1 flex items-center gap-2"><MapPin className="w-4 h-4"/>{next.location}</p><p className="text-xs text-slate-500 mt-3">{next.confirmed.length} confirmados</p></div><button disabled={busy} onClick={()=>attend(next)} className={cx('rounded-2xl px-6 py-3.5 font-black',next.confirmed.includes(ownName)?'bg-rose-500/10 border border-rose-500/30 text-rose-300':'bg-emerald-500 text-slate-950')}>{next.confirmed.includes(ownName)?'Desistir':'Estou dentro'}</button></div></Panel>}

    <div className="flex gap-2 overflow-x-auto">{[['proximos','Próximos',upcoming.length],['historico','Histórico',history.length],['cancelados','Cancelados',cancelled.length]].map(([k,l,n])=><button key={k} onClick={()=>setView(k)} className={cx('shrink-0 rounded-xl px-3.5 py-2 text-xs font-black',view===k?'bg-white text-slate-950':'bg-slate-800 text-slate-400')}>{l} · {n}</button>)}</div>
    {!list.length ? <Empty icon={CalendarDays} title={view==='proximos'?'Nenhum jogo agendado':'Nenhum jogo nesta visão'} text={view==='proximos'?'Quando um jogo for criado, ele aparecerá aqui automaticamente.':'O histórico será preservado aqui.'} action={isAdmin&&view==='proximos'?<button onClick={()=>setFormGame(null)} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-slate-950 font-black">Criar jogo</button>:null}/> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{list.map(g=>{const names=compactNames(g.confirmed);return <Panel key={g.id} className={cx('p-4 flex flex-col',g.cancelledAt&&'opacity-80')}><div className="flex justify-between gap-3"><div><Pill tone={g.cancelledAt?'rose':g.date>=today?'emerald':'slate'}>{g.cancelledAt?'Cancelado':g.date>=today?'Agendado':'Realizado'}</Pill><h3 className="text-xl font-black text-white mt-2">{fmtDate(g.date)} · {g.time}</h3><p className="text-xs text-slate-500 mt-1">{g.location}</p></div><div className="text-right"><strong className="text-2xl text-white">{g.confirmed.length}</strong><p className="text-[9px] uppercase font-black text-slate-500">Confirmados</p></div></div>{g.cancelledAt&&<div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-950/20 p-3 text-xs text-rose-300">{g.cancelReason||'Sem motivo informado'}</div>}<div className="mt-4 flex flex-wrap gap-1.5 min-h-8">{names.visible.map(n=><span key={n} className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300">{n}</span>)}{names.rest>0&&<span className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-black text-emerald-300">+{names.rest} outros</span>}</div><div className="mt-auto pt-4 flex gap-2">{!g.cancelledAt&&g.date>=today&&<button disabled={busy} onClick={()=>attend(g)} className={cx('flex-1 rounded-xl py-2.5 text-xs font-black',g.confirmed.includes(ownName)?'bg-rose-950/30 text-rose-300':'bg-emerald-500 text-slate-950')}>{g.confirmed.includes(ownName)?'Desistir':'Confirmar'}</button>}{isAdmin&&!g.cancelledAt&&<><button onClick={()=>setFormGame(g)} className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center"><Edit3 className="w-4 h-4"/></button><button onClick={()=>setCancelGame(g)} className="w-10 h-10 rounded-xl bg-amber-950/30 text-amber-300 flex items-center justify-center"><X className="w-4 h-4"/></button></>}{isAdmin&&g.cancelledAt&&<><button onClick={()=>restore(g)} className="flex-1 rounded-xl bg-emerald-950/30 text-emerald-300 py-2.5 text-xs font-black">Reativar</button><button onClick={()=>del(g)} className="w-10 h-10 rounded-xl bg-rose-950/30 text-rose-300 flex items-center justify-center"><Trash2 className="w-4 h-4"/></button></>}</div></Panel>;})}</div>}
    <Modal open={formGame!==undefined} title={formGame?'Editar jogo':'Novo jogo'} onClose={()=>setFormGame(undefined)}><GameForm item={formGame||null} onClose={()=>setFormGame(undefined)} onSaved={refresh}/></Modal>
    <Modal open={Boolean(cancelGame)} title="Cancelar jogo" onClose={()=>{setCancelGame(null);setReason('');}}><p className="text-sm text-slate-400 mb-4">O jogo será mantido no histórico, junto com as confirmações.</p><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo do cancelamento..." className="w-full min-h-28 rounded-2xl border border-slate-700 bg-slate-950 p-3.5 text-white outline-none"/><button disabled={busy||!reason.trim()} onClick={cancel} className="mt-4 w-full rounded-2xl bg-amber-500 py-3.5 font-black text-slate-950 disabled:opacity-40">Confirmar cancelamento</button></Modal>
  </div>;
}

function bahiaDateTimeInput(value) {
  if(!value)return '';
  try{
    const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(value));
    const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  }catch{return String(value).slice(0,16);}
}
function EventForm({ item, onClose, onSaved }) {
  const [form,setForm]=useState({name:item?.name||'',startsAt:bahiaDateTimeInput(item?.startsAt),deadline:item?.deadline||'',location:item?.location||'',value:item?.value??'',description:item?.description||''}); const [busy,setBusy]=useState(false);
  const submit=async e=>{e.preventDefault();setBusy(true);try{const date=form.startsAt?`${form.startsAt}:00-03:00`:'';await gatewayPost(item?'updateEvent':'createEvent',{id:item?.id,name:form.name,date,deadline:form.deadline,location:form.location,value:Number(form.value||0),description:form.description});onSaved();onClose();}catch(err){window.alert(err.message);}finally{setBusy(false);}};
  const field=(label,key,type='text')=><label className="block"><span className="text-[10px] uppercase font-black text-slate-500">{label}</span><input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3.5 text-white outline-none" required/></label>;
  return <form onSubmit={submit} className="space-y-4">{field('Nome do evento','name')}<div className="grid sm:grid-cols-2 gap-4">{field('Data e hora','startsAt','datetime-local')}{field('Prazo de confirmação','deadline','date')}</div>{field('Local','location')} {field('Valor individual','value','number')}<label className="block"><span className="text-[10px] uppercase font-black text-slate-500">Descrição</span><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1.5 w-full min-h-28 rounded-2xl border border-slate-700 bg-slate-950 p-3.5 text-white outline-none" required/></label><button disabled={busy} className="w-full rounded-2xl bg-emerald-500 text-slate-950 py-3.5 font-black">{busy?'Salvando...':item?'Atualizar evento':'Criar evento'}</button></form>;
}
function EventsView({ data, refresh }) {
  const isAdmin=String(data.user?.role).toUpperCase()==='ADMIN'; const ownName=data.user?.name||''; const [view,setView]=useState('proximos'); const [formEvent,setFormEvent]=useState(undefined); const [busy,setBusy]=useState(false);
  const today=todayBahia(); const events=data.events||[]; const upcoming=events.filter(e=>String(e.startsAt).slice(0,10)>=today).sort((a,b)=>String(a.startsAt).localeCompare(String(b.startsAt))); const history=events.filter(e=>String(e.startsAt).slice(0,10)<today).sort((a,b)=>String(b.startsAt).localeCompare(String(a.startsAt))); const list=view==='proximos'?upcoming:history;
  const attend=async e=>{setBusy(true);try{await gatewayPost('handleAttendanceUpdate',{itemId:e.id,actionType:e.attendees.includes(ownName)?'withdraw':'confirm',type:'event'});await refresh();}catch(err){window.alert(err.message);}finally{setBusy(false);}};
  const del=async e=>{if(!window.confirm(`Excluir o evento ${e.name}?`))return;setBusy(true);try{await gatewayPost('deleteEvent',{id:e.id});await refresh();}catch(err){window.alert(err.message);}finally{setBusy(false);}};
  const displayDateTime=v=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
  return <div className="space-y-5 pb-24 md:pb-8"><Header icon={PartyPopper} kicker="Eventos" title="Eventos & confraternizações" text="Datas, inscrições e valores previstos sem confundir confirmação com pagamento.">{isAdmin&&<button onClick={()=>setFormEvent(null)} className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-slate-950 flex items-center gap-2"><Plus className="w-4 h-4"/>Novo evento</button>}</Header>
  <div className="flex gap-2">{[['proximos','Próximos',upcoming.length],['historico','Encerrados',history.length]].map(([k,l,n])=><button key={k} onClick={()=>setView(k)} className={cx('rounded-xl px-3.5 py-2 text-xs font-black',view===k?'bg-white text-slate-950':'bg-slate-800 text-slate-400')}>{l} · {n}</button>)}</div>
  {!list.length?<Empty icon={PartyPopper} title={view==='proximos'?'Nenhum evento agendado':'Nenhum evento encerrado'} text="Os eventos cadastrados aparecem aqui automaticamente."/>:<div className="grid md:grid-cols-2 gap-4">{list.map(e=>{const closed=today>String(e.deadline);const names=compactNames(e.attendees);return <Panel key={e.id} className="p-5 flex flex-col"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Pill tone={closed?'slate':'emerald'}>{closed?'Inscrições encerradas':'Inscrições abertas'}</Pill><h3 className="text-xl font-black text-white mt-2 truncate">{e.name}</h3></div>{isAdmin&&<div className="flex gap-1"><button onClick={()=>setFormEvent(e)} className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center"><Edit3 className="w-4 h-4"/></button><button onClick={()=>del(e)} className="w-9 h-9 rounded-xl bg-rose-950/30 text-rose-300 flex items-center justify-center"><Trash2 className="w-4 h-4"/></button></div>}</div><div className="grid sm:grid-cols-2 gap-2 mt-4 text-sm"><div className="rounded-xl bg-slate-950/60 p-3 text-slate-300"><CalendarDays className="w-4 h-4 text-emerald-400 inline mr-2"/>{displayDateTime(e.startsAt)}</div><div className="rounded-xl bg-slate-950/60 p-3 text-slate-300"><MapPin className="w-4 h-4 text-emerald-400 inline mr-2"/>{e.location}</div></div><p className="text-sm text-slate-400 mt-3">{e.description}</p><div className="grid grid-cols-3 gap-2 mt-4"><div className="rounded-xl bg-slate-950 p-3 text-center"><p className="text-lg font-black text-white">{e.attendees.length}</p><p className="text-[9px] uppercase font-black text-slate-500">Inscritos</p></div><div className="rounded-xl bg-slate-950 p-3 text-center"><p className="text-lg font-black text-emerald-300">{money(e.value)}</p><p className="text-[9px] uppercase font-black text-slate-500">Individual</p></div><div className="rounded-xl bg-slate-950 p-3 text-center"><p className="text-lg font-black text-amber-300">{money(e.attendees.length*e.value)}</p><p className="text-[9px] uppercase font-black text-slate-500">Previsto</p></div></div><div className="mt-4 flex flex-wrap gap-1.5">{names.visible.map(n=><span key={n} className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300">{n}</span>)}{names.rest>0&&<span className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-black text-emerald-300">+{names.rest} outros</span>}</div><p className="text-[10px] text-slate-500 mt-4">Confirmações até {fmtDate(e.deadline)}.</p><button disabled={closed||busy} onClick={()=>attend(e)} className={cx('mt-4 w-full rounded-xl py-3 font-black text-sm disabled:opacity-40',e.attendees.includes(ownName)?'bg-rose-950/30 text-rose-300':'bg-emerald-500 text-slate-950')}>{closed?'Inscrições encerradas':e.attendees.includes(ownName)?'Desistir':'Confirmar participação'}</button></Panel>;})}</div>}
  <Modal open={formEvent!==undefined} title={formEvent?'Editar evento':'Novo evento'} onClose={()=>setFormEvent(undefined)}><EventForm item={formEvent||null} onClose={()=>setFormEvent(undefined)} onSaved={refresh}/></Modal></div>;
}

function leaders(list,key,minGames=0) {
  const valid=list.filter(x=>Number(x[key]||0)>0 && Number(x.eligibleGames||0)>=minGames);
  if(!valid.length)return [];
  const max=Math.max(...valid.map(x=>Number(x[key]||0)));
  return valid.filter(x=>Number(x[key]||0)===max).sort((a,b)=>a.name.localeCompare(b.name));
}
function LeaderCard({ label, items, value, unit, icon:Icon, tone='text-emerald-300' }) {
  return <Panel className="p-4"><div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-wider font-black text-slate-500">{label}</p><Icon className={cx('w-5 h-5',tone)}/></div>{items.length?<><div className="mt-4 space-y-1">{items.map(p=><p key={p.id} className="text-lg font-black text-white truncate">{p.name}</p>)}</div><p className={cx('text-3xl font-black mt-3',tone)}>{value(items[0])}<span className="text-xs ml-1 text-slate-500">{unit}</span></p>{items.length>1&&<Pill tone="amber">Empate · {items.length} atletas</Pill>}</>:<p className="text-slate-600 font-black mt-6">Sem dados</p>}</Panel>;
}
function HallView({ data }) {
  const hall=data.hall||[]; const pts=leaders(hall,'pts'), reb=leaders(hall,'reb'), ast=leaders(hall,'ast'), blk=leaders(hall,'blk'), pres=leaders(hall,'presences');
  const eligiblePct=hall.filter(x=>x.eligibleGames>=5&&x.attendancePct>0); const bestPct=eligiblePct.length?Math.max(...eligiblePct.map(x=>x.attendancePct)):0; const pct=eligiblePct.filter(x=>Math.abs(x.attendancePct-bestPct)<0.001).sort((a,b)=>a.name.localeCompare(b.name));
  return <div className="space-y-5 pb-24 md:pb-8"><Header icon={Trophy} kicker="Hall da Fama" title="Recordes históricos do CBA" text="Somente atletas elegíveis participam dos recordes; empates são preservados em vez de escolher um vencedor arbitrariamente."/>
  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3"><LeaderCard label="Cestinha" items={pts} value={x=>x.pts} unit="pts" icon={Star} tone="text-amber-300"/><LeaderCard label="Rei do garrafão" items={reb} value={x=>x.reb} unit="reb" icon={Trophy}/><LeaderCard label="Garçom" items={ast} value={x=>x.ast} unit="ast" icon={Users} tone="text-blue-300"/><LeaderCard label="Muralha" items={blk} value={x=>x.blk} unit="tocos" icon={ShieldCheck} tone="text-purple-300"/><LeaderCard label="Mais presente" items={pres} value={x=>x.presences} unit="presenças" icon={UserCheck} tone="text-cyan-300"/><LeaderCard label="Rei da assiduidade" items={pct} value={x=>`${x.attendancePct.toFixed(0)}%`} unit="mín. 5 encontros" icon={CheckCircle2} tone="text-emerald-300"/></div>
  <Panel className="p-6 sm:p-8 text-center"><Trophy className="w-12 h-12 text-amber-300 mx-auto"/><h3 className="text-xl font-black text-white mt-3">Lendas eternizadas</h3><p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">O mural permanente está pronto para receber homenagens formais, camisas aposentadas e histórias aprovadas pela diretoria.</p></Panel></div>;
}

function StatuteView({ data, refresh }) {
  const docs=data.statutes||[]; const isAdmin=String(data.user?.role).toUpperCase()==='ADMIN'; const [query,setQuery]=useState(''); const [selected,setSelected]=useState(docs.find(d=>d.is_current)||docs[0]||null); const [editing,setEditing]=useState(undefined); const [busy,setBusy]=useState(false);
  useEffect(()=>{if(selected&&!docs.some(d=>d.id===selected.id))setSelected(docs[0]||null);},[docs,selected]);
  const filtered=docs.filter(d=>normalize(d.title+' '+d.content).includes(normalize(query)));
  const save=async e=>{e.preventDefault();setBusy(true);try{await portalPost('saveStatute',{id:editing.id,title:editing.title,documentType:editing.document_type,documentDate:editing.document_date,isCurrent:editing.is_current,sortOrder:editing.sort_order,content:editing.content});setEditing(undefined);await refresh();}catch(err){window.alert(err.message);}finally{setBusy(false);}};
  const archive=async d=>{if(!window.confirm('Arquivar este documento?'))return;setBusy(true);try{await portalPost('archiveStatute',{id:d.id});await refresh();}catch(err){window.alert(err.message);}finally{setBusy(false);}};
  return <div className="space-y-5 pb-24 md:pb-8"><Header icon={BookOpen} kicker="Documentos" title="Estatuto e documentos oficiais" text="Conteúdo carregado do Supabase, com busca e manutenção sem precisar alterar o código do portal.">{isAdmin&&<button onClick={()=>setEditing({id:'',title:'',document_type:'minutes',document_date:'',is_current:false,sort_order:50,content:''})} className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-slate-950 flex items-center gap-2"><Plus className="w-4 h-4"/>Novo documento</button>}</Header>
  <Panel className="p-3"><div className="relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar regra, convidado, mensalidade..." className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-3 text-white outline-none"/></div></Panel>
  <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-4"><Panel className="p-2 h-fit"><div className="space-y-1">{filtered.map(d=><button key={d.id} onClick={()=>setSelected(d)} className={cx('w-full rounded-2xl p-3 text-left border',selected?.id===d.id?'border-emerald-500/40 bg-emerald-950/20':'border-transparent hover:bg-slate-800')}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-black text-white truncate">{d.title}</p><p className="text-[10px] text-slate-500 mt-1">{d.document_date?fmtDate(d.document_date):'Documento vigente'}</p></div>{d.is_current&&<Pill tone="emerald">Vigente</Pill>}</div></button>)}</div></Panel>
  {selected?<Panel className="p-5 sm:p-7"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-800"><div><div className="flex gap-2 mb-2">{selected.is_current&&<Pill tone="emerald">Vigente</Pill>}<Pill>{selected.document_type==='regulation'?'Regulamento':'Documento'}</Pill></div><h3 className="text-2xl font-black text-white">{selected.title}</h3>{selected.document_date&&<p className="text-xs text-slate-500 mt-1">{fmtDate(selected.document_date)}</p>}</div>{isAdmin&&<div className="flex gap-2"><button onClick={()=>setEditing({...selected})} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-black text-white flex items-center gap-2"><Edit3 className="w-4 h-4"/>Editar</button><button onClick={()=>archive(selected)} className="w-10 h-10 rounded-xl bg-rose-950/30 text-rose-300 flex items-center justify-center"><Trash2 className="w-4 h-4"/></button></div>}</div><div className="mt-5 whitespace-pre-wrap text-sm sm:text-base leading-7 text-slate-300">{selected.content}</div></Panel>:<Empty icon={FileText} title="Nenhum documento encontrado" text="Tente outro termo de busca."/>}</div>
  <Modal open={editing!==undefined} title={editing?.id?'Editar documento':'Novo documento'} onClose={()=>setEditing(undefined)} wide><form onSubmit={save} className="space-y-4">{editing&&<><label className="block"><span className="text-[10px] uppercase font-black text-slate-500">Título</span><input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" required/></label><div className="grid sm:grid-cols-3 gap-3"><label><span className="text-[10px] uppercase font-black text-slate-500">Tipo</span><select value={editing.document_type} onChange={e=>setEditing({...editing,document_type:e.target.value})} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"><option value="regulation">Regulamento</option><option value="minutes">Ata</option><option value="document">Documento</option></select></label><label><span className="text-[10px] uppercase font-black text-slate-500">Data</span><input type="date" value={editing.document_date||''} onChange={e=>setEditing({...editing,document_date:e.target.value})} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"/></label><label className="flex items-end"><span className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm font-bold text-slate-300"><input type="checkbox" checked={Boolean(editing.is_current)} onChange={e=>setEditing({...editing,is_current:e.target.checked})} className="mr-2"/>Documento vigente</span></label></div><label className="block"><span className="text-[10px] uppercase font-black text-slate-500">Conteúdo</span><textarea value={editing.content} onChange={e=>setEditing({...editing,content:e.target.value})} className="mt-1.5 w-full min-h-[360px] rounded-xl border border-slate-700 bg-slate-950 p-3 text-white font-mono text-sm" required/></label><button disabled={busy} className="w-full rounded-xl bg-emerald-500 py-3.5 font-black text-slate-950">{busy?'Salvando...':'Salvar documento'}</button></>}</form></Modal></div>;
}

function NotificationsView({ data, refresh }) {
  const [form,setForm]=useState({title:'',message:'',targetTab:'presenca'}); const [preview,setPreview]=useState(false); const [busy,setBusy]=useState(false); const [notice,setNotice]=useState('');
  const options=[['inicio','Início'],['presenca','Presença'],['relatorios','Relatórios'],['financas','Finanças'],['jogos','Jogos'],['eventos','Eventos'],['sorteio','Sorteio'],['dm','Departamento Médico'],['halldafama','Hall da Fama'],['estatuto','Estatuto']];
  const send=async()=>{setBusy(true);setNotice('');try{const r=await gatewayPost('sendPushNotificationToAll',{title:form.title,message:form.message,targetTab:form.targetTab});setNotice(r.message||'Aviso enviado.');setForm({title:'',message:'',targetTab:'presenca'});setPreview(false);await refresh();}catch(e){setNotice(e.message);}finally{setBusy(false);}};
  return <div className="space-y-5 pb-24 md:pb-8"><Header icon={BellRing} kicker="Comunicação" title="Central de comunicação" text="Crie o aviso, confira como ficará e saiba quantos dispositivos aceitaram ou falharam."/>
  <div className="grid xl:grid-cols-[.9fr_1.1fr] gap-4"><Panel className="p-5"><div className="flex items-center justify-between"><div><h3 className="text-lg font-black text-white">Novo push</h3><p className="text-xs text-slate-500 mt-1">Público potencial: {data.notificationAudience||0} contas ativas.</p></div><Send className="w-6 h-6 text-emerald-400"/></div><div className="space-y-4 mt-5"><label className="block"><span className="text-[10px] uppercase font-black text-slate-500">Título</span><input value={form.title} maxLength={150} onChange={e=>setForm({...form,title:e.target.value})} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"/></label><label className="block"><span className="text-[10px] uppercase font-black text-slate-500">Mensagem</span><textarea value={form.message} maxLength={2500} onChange={e=>setForm({...form,message:e.target.value})} className="mt-1.5 w-full min-h-28 rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"/></label><label className="block"><span className="text-[10px] uppercase font-black text-slate-500">Ao tocar, abrir</span><select value={form.targetTab} onChange={e=>setForm({...form,targetTab:e.target.value})} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>{notice&&<div className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs font-bold text-slate-300">{notice}</div>}<button disabled={!form.title.trim()||!form.message.trim()} onClick={()=>setPreview(true)} className="w-full rounded-xl bg-emerald-500 py-3.5 font-black text-slate-950 disabled:opacity-40">Visualizar antes de enviar</button></div></Panel>
  <Panel className="p-5"><h3 className="text-lg font-black text-white">Histórico</h3><div className="mt-4 space-y-2 max-h-[560px] overflow-y-auto">{(data.notifications||[]).length?(data.notifications||[]).map(n=><div key={n.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="font-black text-white truncate">{n.title}</p><p className="text-sm text-slate-400 mt-1">{n.message}</p></div><Pill>{n.target_tab||'--'}</Pill></div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black"><span className="text-emerald-300">{n.push_accepted||0} aceitos</span><span className="text-rose-300">{n.push_failed||0} falhas</span><span className="text-slate-600">{new Date(n.created_at).toLocaleString('pt-BR')}</span></div></div>):<p className="text-sm text-slate-500">Nenhum aviso enviado.</p>}</div></Panel></div>
  <Modal open={preview} title="Confirmar envio" onClose={()=>setPreview(false)}><div className="rounded-2xl border border-slate-700 bg-slate-950 p-4"><Pill tone="emerald">Prévia</Pill><h4 className="text-lg font-black text-white mt-3">{form.title}</h4><p className="text-sm text-slate-400 mt-2">{form.message}</p><p className="text-[10px] text-slate-500 mt-4">Destino: {options.find(x=>x[0]===form.targetTab)?.[1]}</p></div><div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-xs font-bold text-amber-300">O aviso será registrado para o CBA e enviado aos dispositivos com push cadastrado. Público de contas ativas: {data.notificationAudience||0}.</div><button disabled={busy} onClick={send} className="mt-4 w-full rounded-xl bg-emerald-500 py-3.5 font-black text-slate-950">{busy?'Enviando...':'Enviar agora'}</button></Modal></div>;
}

const VIEWS = {
  inicio: HomeView,
  financas: FinanceView,
  jogos: GamesView,
  eventos: EventsView,
  halldafama: HallView,
  estatuto: StatuteView,
  notificacoes: NotificationsView,
};
const TITLES = {
  financas:'Finanças', jogos:'Jogos', eventos:'Eventos', halldafama:'Hall da Fama', estatuto:'Estatuto', notificacoes:'Avisos'
};
const HEADING_MATCH = {
  financas:'Situação Anual', jogos:'Calendário de Jogos', eventos:'Eventos & Confraternizações',
  halldafama:'Hall da Fama', estatuto:'Estatuto e Documentos Oficiais', notificacoes:'Disparar Push'
};

export default function PortalExperienceBridge() {
  const [tab,setTab]=useState(null); const [mountNode,setMountNode]=useState(null); const [data,setData]=useState(null); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);

  const refresh=useCallback(async()=>{setLoading(true);setError('');try{setData(await portalPost('bootstrap'));}catch(e){setError(e?.message||'Falha ao carregar os dados do portal.');}finally{setLoading(false);}},[]);
  useEffect(()=>{if(tab&&VIEWS[tab])refresh();},[tab,refresh]);

  useEffect(()=>{
    let node=null, hiddenRoot=null;
    const sync=()=>{
      let activeKey=null;
      if(document.querySelector('[data-cba-home-anchor="true"]')) activeKey='inicio';
      if(!activeKey){
        for(const [key,title] of Object.entries(TITLES)){
          const button=document.querySelector(`button[title="${title}"]`);
          if(button?.className?.includes('scale-110')){activeKey=key;break;}
        }
      }
      setTab(activeKey);
      if(!activeKey||!VIEWS[activeKey]){
        if(hiddenRoot?.isConnected)hiddenRoot.style.display='';
        if(node?.isConnected)node.style.display='none';
        return;
      }
      let anchor=null, legacyRoot=null;
      if(activeKey==='inicio'){
        anchor=document.querySelector('[data-cba-home-anchor="true"]');
      }else{
        const wanted=HEADING_MATCH[activeKey];
        const heading=[...document.querySelectorAll('h2,h3')].find(el=>el.textContent?.trim().includes(wanted));
        legacyRoot=heading?.closest('.space-y-8') || heading?.closest('[class*="space-y-8"]');
        anchor=legacyRoot;
      }
      if(!anchor?.parentElement)return;
      if(hiddenRoot&&hiddenRoot!==legacyRoot&&hiddenRoot.isConnected)hiddenRoot.style.display='';
      hiddenRoot=legacyRoot;
      if(!node||!node.isConnected){
        node=document.createElement('div');
        node.dataset.portalExperienceV3='true';
        anchor.insertAdjacentElement('afterend',node);
        setMountNode(node);
      }
      if(legacyRoot)legacyRoot.style.display='none';
      node.style.display='';
    };
    sync();
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    return()=>{observer.disconnect();if(hiddenRoot?.isConnected)hiddenRoot.style.display='';if(node?.isConnected)node.remove();};
  },[]);

  if(!tab||!mountNode||!VIEWS[tab])return null;
  const View=VIEWS[tab];
  if(error)return createPortal(<Empty icon={AlertTriangle} title="Não foi possível carregar" text={error} action={<button onClick={refresh} className="rounded-xl bg-slate-800 px-4 py-2.5 text-white font-black">Tentar novamente</button>}/>,mountNode);
  if(!data||loading)return createPortal(<Panel className="p-10 text-center"><RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto"/><p className="text-sm font-bold text-slate-500 mt-3">Atualizando dados do CBA...</p></Panel>,mountNode);
  return createPortal(<View data={data} refresh={refresh}/>,mountNode);
}
