import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck, X, LayoutDashboard, Users, ClipboardCheck, DollarSign, BarChart3,
  CalendarDays, PartyPopper, Stethoscope, BellRing, Settings, History, Search,
  Plus, Save, Trash2, UserCheck, UserX, RefreshCw, CheckCircle2, AlertTriangle,
  CreditCard, Activity, LockKeyhole, ChevronRight
} from 'lucide-react';

const ADMIN_EMAIL = 'vinicius.m84@gmail.com';
const ADMIN_URL = 'https://vqirdswgchlcxevepamu.supabase.co/functions/v1/cba-admin';
const SESSION_KEYS = ['cba_session_v2', 'cba_session_v1'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function readSession() {
  for (const key of SESSION_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const user = parsed?.user?.user || parsed?.user || parsed;
      const token = parsed?.user?.token || parsed?.user?.user?.token || parsed?.token || user?.token;
      const email = String(user?.email || parsed?.email || '').toLowerCase();
      if (token && email) return { token, email, user };
    } catch { /* tenta a próxima chave */ }
  }
  try {
    const raw = window.sessionStorage.getItem('cba_session_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { token: parsed?.token, email: String(parsed?.email || parsed?.user?.email || '').toLowerCase(), user: parsed?.user || parsed };
    }
  } catch { /* sem impacto */ }
  return null;
}

async function adminPost(action, payload = {}) {
  const session = readSession();
  if (!session?.token) throw new Error('Sessão administrativa não encontrada. Entre novamente no portal.');
  const response = await fetch(ADMIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token: session.token, ...payload }),
  });
  const data = await response.json().catch(() => ({ result: 'error', message: `HTTP ${response.status}` }));
  if (!response.ok || data?.result === 'error') throw new Error(data?.message || `Erro administrativo (${response.status}).`);
  return data;
}

const cx = (...values) => values.filter(Boolean).join(' ');
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateBr = value => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '--';
const dateTimeLocal = value => value ? new Date(value).toISOString().slice(0, 16) : '';

function Panel({ children, className = '' }) {
  return <div className={cx('rounded-3xl border border-slate-700/70 bg-slate-800/60 shadow-xl', className)}>{children}</div>;
}
function Field({ label, children, hint }) {
  return <label className="block"><span className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1.5">{label}</span>{children}{hint && <span className="block text-[10px] text-slate-500 mt-1">{hint}</span>}</label>;
}
const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-black transition disabled:opacity-40 disabled:cursor-not-allowed';

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const ok = toast.type !== 'error';
  return <div className={cx('fixed right-4 top-4 z-[200] max-w-sm rounded-2xl border p-4 shadow-2xl backdrop-blur-xl', ok ? 'border-emerald-500/30 bg-emerald-950/95 text-emerald-100' : 'border-rose-500/30 bg-rose-950/95 text-rose-100')}>
    <div className="flex items-start gap-3">{ok ? <CheckCircle2 className="w-5 h-5 mt-0.5" /> : <AlertTriangle className="w-5 h-5 mt-0.5" />}<div className="flex-1"><p className="font-black">{ok ? 'Concluído' : 'Erro'}</p><p className="text-sm mt-1 opacity-90">{toast.message}</p></div><button onClick={onClose}><X className="w-4 h-4" /></button></div>
  </div>;
}

const MODULES = [
  ['resumo', 'Resumo', LayoutDashboard], ['atletas', 'Atletas e usuários', Users], ['presencas', 'Presenças', ClipboardCheck],
  ['financeiro', 'Financeiro', DollarSign], ['estatisticas', 'Estatísticas', BarChart3], ['jogos', 'Jogos', CalendarDays],
  ['eventos', 'Eventos', PartyPopper], ['dm', 'Departamento médico', Stethoscope], ['notificacoes', 'Notificações', BellRing],
  ['configuracoes', 'Configurações', Settings], ['auditoria', 'Auditoria', History]
];

function Summary({ data, onGo }) {
  const o = data?.overview || {};
  const cards = [
    ['Atletas ativos', o.activeAthletes || 0, Users], ['Usuários com acesso', o.users || 0, UserCheck],
    ['Pendências financeiras', o.overdue || 0, CreditCard], ['Receitas registradas', money(o.revenue), DollarSign],
    ['Despesas registradas', money(o.expense), Activity]
  ];
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-black text-white">Central de Administração</h2><p className="text-sm text-slate-400 mt-1">Cadastre e mantenha todos os dados operacionais do CBA em um só lugar.</p></div>
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">{cards.map(([label, value, Icon]) => <Panel key={label} className="p-4"><Icon className="w-5 h-5 text-indigo-400"/><p className="text-[10px] uppercase font-black tracking-wider text-slate-500 mt-4">{label}</p><p className="text-xl font-black text-white mt-1">{value}</p></Panel>)}</div>
    <Panel className="p-5"><p className="text-xs uppercase font-black tracking-wider text-slate-500 mb-4">Ações rápidas</p><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{[
      ['Lançar presença', 'presencas', ClipboardCheck], ['Cadastrar atleta', 'atletas', Plus], ['Atualizar mensalidade', 'financeiro', DollarSign], ['Lançar súmula', 'estatisticas', BarChart3]
    ].map(([label, target, Icon]) => <button key={target} onClick={() => onGo(target)} className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/50 p-4 text-left hover:border-indigo-500/60 hover:bg-indigo-950/20 transition"><div><Icon className="w-5 h-5 text-indigo-400 mb-3"/><p className="font-black text-white">{label}</p></div><ChevronRight className="w-5 h-5 text-slate-600"/></button>)}</div></Panel>
    <Panel className="p-5"><p className="text-xs uppercase font-black tracking-wider text-slate-500 mb-3">Últimas alterações</p><div className="divide-y divide-slate-700/60">{(data?.audit || []).slice(0, 8).map(item => <div key={item.id} className="py-3 flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-slate-200">{item.action}</p><p className="text-xs text-slate-500">{item.entity_type || 'sistema'} · {item.entity_id || '--'}</p></div><span className="text-xs text-slate-500 shrink-0">{new Date(item.created_at).toLocaleString('pt-BR')}</span></div>)}</div></Panel>
  </div>;
}

function AthletesModule({ data, reload, notify, setDirty }) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const athletes = data?.athletes || [];
  const accounts = data?.accounts || [];
  const selected = selectedId ? athletes.find(a => a.id === selectedId) : null;
  const selectedAccount = selected ? accounts.find(a => a.athlete_id === selected.id) : null;
  const blank = { name: '', height_m: '', position: '', jersey_number: '', specialty: '', joined_on: '', birth_date: '', photo_url: '', eligible_for_hof: true, active: true };
  const [form, setForm] = useState(blank);
  const [account, setAccount] = useState({ enabled: false, email: '', password: '', status: 'approved' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected) { setForm(blank); setAccount({ enabled: false, email: '', password: '', status: 'approved' }); return; }
    setForm({ ...blank, ...selected, height_m: selected.height_m ?? '', joined_on: selected.joined_on || '', birth_date: selected.birth_date || '', photo_url: selected.photo_url || '' });
    setAccount({ enabled: Boolean(selectedAccount && selectedAccount.status === 'approved'), email: selectedAccount?.email || '', password: '', status: selectedAccount?.status || 'approved' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.updated_at, selectedAccount?.updated_at]);

  const filtered = athletes.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()) || accounts.find(ac => ac.athlete_id === a.id)?.email?.toLowerCase().includes(search.toLowerCase()));
  const save = async () => {
    try { setSaving(true); const result = await adminPost('saveAthlete', { id: selectedId || '', athlete: form, account }); notify(result.message); setDirty(true); await reload(); if (!selectedId && result.id) setSelectedId(result.id); }
    catch (e) { notify(e.message, 'error'); } finally { setSaving(false); }
  };
  const toggleActive = async athlete => {
    if (!window.confirm(`${athlete.active ? 'Inativar' : 'Ativar'} ${athlete.name}?`)) return;
    try { const r = await adminPost('setAthleteActive', { id: athlete.id, active: !athlete.active }); notify(r.message); setDirty(true); await reload(); }
    catch (e) { notify(e.message, 'error'); }
  };

  return <div className="grid xl:grid-cols-[minmax(320px,.8fr)_minmax(520px,1.2fr)] gap-5">
    <Panel className="overflow-hidden"><div className="p-4 border-b border-slate-700"><div className="flex gap-2"><div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar atleta ou e-mail" className={cx(inputClass,'pl-9')}/></div><button onClick={()=>setSelectedId(null)} className={cx(btn,'bg-indigo-600 hover:bg-indigo-500 text-white')}><Plus className="w-4 h-4"/>Novo</button></div></div>
      <div className="max-h-[68vh] overflow-y-auto divide-y divide-slate-700/50">{filtered.map(a => { const ac = accounts.find(x=>x.athlete_id===a.id); return <button key={a.id} onClick={()=>setSelectedId(a.id)} className={cx('w-full p-4 text-left hover:bg-slate-700/30 transition flex items-center gap-3', selectedId===a.id && 'bg-indigo-950/30')}><div className="w-10 h-10 rounded-xl bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">{a.photo_url ? <img src={a.photo_url} alt="" className="w-full h-full object-cover"/> : <Users className="w-5 h-5 text-slate-400"/>}</div><div className="min-w-0 flex-1"><p className="font-black text-slate-100 truncate">{a.name}</p><p className="text-xs text-slate-500 truncate">{ac?.email || 'Sem acesso ao portal'}</p></div><span className={cx('w-2.5 h-2.5 rounded-full', a.active ? 'bg-emerald-500' : 'bg-slate-600')}/></button>; })}</div>
    </Panel>
    <Panel className="p-5"><div className="flex items-center justify-between mb-5"><div><h3 className="text-xl font-black text-white">{selected ? 'Editar atleta' : 'Novo atleta'}</h3><p className="text-xs text-slate-500 mt-1">Perfil esportivo e acesso ao portal.</p></div>{selected && <button onClick={()=>toggleActive(selected)} className={cx(btn, selected.active ? 'bg-rose-950/60 text-rose-300 border border-rose-700/40' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/40')}>{selected.active ? <UserX className="w-4 h-4"/> : <UserCheck className="w-4 h-4"/>}{selected.active ? 'Inativar' : 'Ativar'}</button>}</div>
      <div className="grid sm:grid-cols-2 gap-4"><Field label="Nome completo"><input className={inputClass} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Foto (URL)"><input className={inputClass} value={form.photo_url} onChange={e=>setForm({...form,photo_url:e.target.value})}/></Field><Field label="Altura (m)"><input type="number" step="0.01" className={inputClass} value={form.height_m} onChange={e=>setForm({...form,height_m:e.target.value})}/></Field><Field label="Posição"><input className={inputClass} value={form.position || ''} onChange={e=>setForm({...form,position:e.target.value})}/></Field><Field label="Número"><input className={inputClass} value={form.jersey_number || ''} onChange={e=>setForm({...form,jersey_number:e.target.value})}/></Field><Field label="Especialidade"><input className={inputClass} value={form.specialty || ''} onChange={e=>setForm({...form,specialty:e.target.value})}/></Field><Field label="Data de entrada"><input type="date" className={inputClass} value={form.joined_on || ''} onChange={e=>setForm({...form,joined_on:e.target.value})}/></Field><Field label="Nascimento"><input type="date" className={inputClass} value={form.birth_date || ''} onChange={e=>setForm({...form,birth_date:e.target.value})}/></Field></div>
      <label className="flex items-center gap-3 mt-4 rounded-xl border border-slate-700 bg-slate-900/40 p-3"><input type="checkbox" checked={form.eligible_for_hof !== false} onChange={e=>setForm({...form,eligible_for_hof:e.target.checked})}/><span className="text-sm font-bold text-slate-300">Elegível para Hall da Fama</span></label>
      <div className="mt-6 pt-5 border-t border-slate-700"><div className="flex items-center justify-between"><div><p className="font-black text-white flex items-center gap-2"><LockKeyhole className="w-4 h-4 text-indigo-400"/>Acesso ao portal</p><p className="text-xs text-slate-500 mt-1">Atletas podem existir sem usuário de login.</p></div><label className="flex items-center gap-2 text-sm font-bold text-slate-300"><input type="checkbox" checked={account.enabled} disabled={selectedAccount?.email?.toLowerCase()===ADMIN_EMAIL} onChange={e=>setAccount({...account,enabled:e.target.checked})}/>Liberar acesso</label></div>{account.enabled && <div className="grid sm:grid-cols-2 gap-4 mt-4"><Field label="E-mail"><input type="email" className={inputClass} value={account.email} disabled={selectedAccount?.email?.toLowerCase()===ADMIN_EMAIL} onChange={e=>setAccount({...account,email:e.target.value})}/></Field><Field label={selectedAccount ? 'Nova senha (opcional)' : 'Senha inicial'} hint="Mínimo de 10 caracteres."><input type="password" className={inputClass} value={account.password} onChange={e=>setAccount({...account,password:e.target.value})}/></Field></div>}</div>
      <div className="flex justify-end mt-6"><button disabled={saving || !form.name.trim()} onClick={save} className={cx(btn,'bg-indigo-600 hover:bg-indigo-500 text-white min-w-32')}>{saving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}Salvar</button></div>
    </Panel>
  </div>;
}

function AttendanceModule({ notify, setDirty }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [athletes, setAthletes] = useState([]); const [values, setValues] = useState({}); const [loading,setLoading]=useState(false);
  const load = useCallback(async () => { try { setLoading(true); const d=await adminPost('attendanceByDate',{date}); setAthletes(d.athletes||[]); const next={}; (d.records||[]).forEach(r=>next[r.athlete_id]=r.status); setValues(next); } catch(e){notify(e.message,'error');} finally{setLoading(false);} },[date,notify]);
  useEffect(()=>{load();},[load]);
  const save=async()=>{try{setLoading(true);const records=athletes.map(a=>({athleteId:a.id,status:values[a.id]||'none'}));const r=await adminPost('saveAttendance',{date,records});notify(r.message);setDirty(true);}catch(e){notify(e.message,'error');}finally{setLoading(false);}};
  const all=status=>setValues(Object.fromEntries(athletes.map(a=>[a.id,status])));
  return <div className="space-y-4"><Panel className="p-4"><div className="flex flex-col md:flex-row md:items-end gap-3"><Field label="Data do encontro"><input type="date" className={inputClass} value={date} onChange={e=>setDate(e.target.value)}/></Field><button onClick={()=>all('present')} className={cx(btn,'bg-emerald-950/60 text-emerald-300 border border-emerald-700/40')}>Todos presentes</button><button onClick={()=>all('absent')} className={cx(btn,'bg-rose-950/60 text-rose-300 border border-rose-700/40')}>Todos ausentes</button><button onClick={save} disabled={loading} className={cx(btn,'bg-indigo-600 text-white ml-auto')}><Save className="w-4 h-4"/>Salvar presença</button></div></Panel>
    <Panel className="overflow-hidden"><div className="grid grid-cols-[minmax(0,1fr)_190px] px-4 py-3 bg-slate-900/60 text-[10px] uppercase font-black tracking-wider text-slate-500"><span>Atleta</span><span>Situação</span></div><div className="max-h-[68vh] overflow-y-auto divide-y divide-slate-700/50">{loading ? <div className="p-8 text-center text-slate-500">Carregando...</div> : athletes.map(a=><div key={a.id} className="grid grid-cols-[minmax(0,1fr)_190px] items-center px-4 py-2.5"><span className="font-bold text-slate-200 truncate">{a.name}</span><select className={inputClass} value={values[a.id]||'none'} onChange={e=>setValues({...values,[a.id]:e.target.value})}><option value="none">Sem registro</option><option value="present">✅ Presente</option><option value="absent">❌ Ausente</option><option value="unexcused">Não justificou</option><option value="excused">Justificou</option><option value="na">N/A</option></select></div>)}</div></Panel>
  </div>;
}

function FinanceModule({ data, reload, notify, setDirty }) {
  const currentYear = new Date().getFullYear(); const currentMonth = new Date().getMonth()+1;
  const years = [...new Set((data?.periods||[]).map(p=>p.year))].sort((a,b)=>b-a);
  const [year,setYear]=useState(years[0]||currentYear); const [month,setMonth]=useState(currentMonth); const [entry,setEntry]=useState({kind:'expense',occurred_on:new Date().toISOString().slice(0,10),amount:'',category:'outras',description:''});
  useEffect(()=>{if(years.length && !years.includes(year)) setYear(years[0]);},[years,year]);
  const period=(data?.periods||[]).find(p=>p.year===Number(year)&&p.month===Number(month));
  const active=(data?.athletes||[]).filter(a=>a.active); const dueMap=new Map((data?.dues||[]).filter(d=>d.period_id===period?.id).map(d=>[d.athlete_id,d]));
  const ensure=async()=>{try{const r=await adminPost('ensureFinanceYear',{year:Number(year)});notify(r.message);setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  const saveDue=async(a,draft)=>{try{const r=await adminPost('saveDue',{athleteId:a.id,periodId:period.id,amountDue:draft.amount_due,amountPaid:draft.amount_paid,status:draft.status,note:draft.note||''});notify(`${a.name}: ${r.message}`);setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  const addEntry=async()=>{try{const r=await adminPost('saveFinanceEntry',entry);notify(r.message);setEntry({...entry,amount:'',description:''});setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  const delEntry=async id=>{if(!window.confirm('Excluir este lançamento?'))return;try{const r=await adminPost('deleteFinanceEntry',{id});notify(r.message);setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  return <div className="space-y-5"><Panel className="p-4"><div className="flex flex-wrap items-end gap-3"><Field label="Ano"><select className={inputClass} value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y}>{y}</option>)}{!years.includes(currentYear)&&<option>{currentYear}</option>}</select></Field><button onClick={ensure} className={cx(btn,'bg-indigo-600 text-white')}><Plus className="w-4 h-4"/>Preparar 12 meses</button><Field label="Mês"><select className={inputClass} value={month} onChange={e=>setMonth(Number(e.target.value))}>{MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></Field><div className="ml-auto text-right"><p className="text-[10px] uppercase font-black text-slate-500">Competência</p><p className="font-black text-white">{period ? `${MONTHS[period.month-1]}/${period.year}` : 'Ainda não criada'}</p></div></div></Panel>
    {period && <Panel className="overflow-hidden"><div className="px-4 py-3 bg-slate-900/60"><h3 className="font-black text-white">Mensalidades</h3><p className="text-xs text-slate-500">Edite o atleta e salve somente a linha alterada.</p></div><div className="max-h-[55vh] overflow-y-auto">{active.map(a=><DueRow key={a.id} athlete={a} due={dueMap.get(a.id)} defaultAmount={period.default_amount} onSave={d=>saveDue(a,d)}/>)}</div></Panel>}
    <Panel className="p-5"><h3 className="font-black text-white mb-4">Novo lançamento avulso</h3><div className="grid md:grid-cols-5 gap-3"><Field label="Tipo"><select className={inputClass} value={entry.kind} onChange={e=>setEntry({...entry,kind:e.target.value})}><option value="expense">Despesa</option><option value="revenue">Receita</option></select></Field><Field label="Data"><input type="date" className={inputClass} value={entry.occurred_on} onChange={e=>setEntry({...entry,occurred_on:e.target.value})}/></Field><Field label="Valor"><input type="number" step="0.01" className={inputClass} value={entry.amount} onChange={e=>setEntry({...entry,amount:e.target.value})}/></Field><Field label="Categoria"><input className={inputClass} value={entry.category} onChange={e=>setEntry({...entry,category:e.target.value})}/></Field><Field label="Descrição"><input className={inputClass} value={entry.description} onChange={e=>setEntry({...entry,description:e.target.value})}/></Field></div><div className="flex justify-end mt-3"><button disabled={!entry.amount} onClick={addEntry} className={cx(btn,'bg-indigo-600 text-white')}><Plus className="w-4 h-4"/>Adicionar lançamento</button></div></Panel>
    <Panel className="overflow-hidden"><div className="px-4 py-3 bg-slate-900/60 font-black text-white">Lançamentos recentes</div><div className="max-h-[38vh] overflow-y-auto divide-y divide-slate-700/50">{(data?.financeEntries||[]).slice(0,100).map(e=><div key={e.id} className="grid grid-cols-[95px_90px_minmax(0,1fr)_100px_40px] gap-2 items-center px-4 py-2.5 text-sm"><span className="text-slate-400">{dateBr(e.occurred_on)}</span><span className={e.kind==='revenue'?'text-emerald-400 font-bold':'text-rose-400 font-bold'}>{e.kind==='revenue'?'Receita':'Despesa'}</span><span className="text-slate-300 truncate">{e.category} · {e.description||''}</span><span className="font-black text-white text-right">{money(e.amount)}</span><button onClick={()=>delEntry(e.id)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4"/></button></div>)}</div></Panel>
  </div>;
}

function DueRow({ athlete, due, defaultAmount, onSave }) {
  const [draft,setDraft]=useState({amount_due:due?.amount_due??defaultAmount,amount_paid:due?.amount_paid??0,status:due?.status||'pending',note:due?.note||''});
  useEffect(()=>setDraft({amount_due:due?.amount_due??defaultAmount,amount_paid:due?.amount_paid??0,status:due?.status||'pending',note:due?.note||''}),[due?.updated_at,due?.amount_paid,due?.status,defaultAmount]);
  return <div className="grid grid-cols-[minmax(120px,1fr)_90px_90px_105px_90px] gap-2 items-center px-4 py-2.5 border-t border-slate-700/50"><span className="font-bold text-slate-200 truncate">{athlete.name}</span><input type="number" step="0.01" className={inputClass} value={draft.amount_due} onChange={e=>setDraft({...draft,amount_due:e.target.value})}/><input type="number" step="0.01" className={inputClass} value={draft.amount_paid} onChange={e=>setDraft({...draft,amount_paid:e.target.value})}/><select className={inputClass} value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="pending">Pendente</option><option value="partial">Parcial</option><option value="paid">Pago</option><option value="exempt">Isento</option></select><button onClick={()=>onSave(draft)} className={cx(btn,'bg-slate-700 hover:bg-indigo-600 text-white')}><Save className="w-4 h-4"/>Salvar</button></div>;
}

function StatsModule({ notify, setDirty }) {
  const [date,setDate]=useState(new Date().toISOString().slice(0,10)); const [athletes,setAthletes]=useState([]); const [values,setValues]=useState({}); const [loading,setLoading]=useState(false);
  const load=useCallback(async()=>{try{setLoading(true);const d=await adminPost('statsByDate',{date});setAthletes(d.athletes||[]);const n={};(d.records||[]).forEach(r=>n[r.athlete_id]=r);setValues(n);}catch(e){notify(e.message,'error');}finally{setLoading(false);}},[date,notify]);
  useEffect(()=>{load();},[load]);
  const change=(id,key,v)=>setValues(prev=>({...prev,[id]:{...(prev[id]||{}),[key]:Math.max(0,Number(v)||0)}}));
  const save=async()=>{try{setLoading(true);const records=athletes.map(a=>({athleteId:a.id,pts2:values[a.id]?.pts2||0,pts3:values[a.id]?.pts3||0,reb:values[a.id]?.reb||0,ast:values[a.id]?.ast||0,blk:values[a.id]?.blk||0}));const r=await adminPost('saveStats',{date,records});notify(r.message);setDirty(true);}catch(e){notify(e.message,'error');}finally{setLoading(false);}};
  return <div className="space-y-4"><Panel className="p-4 flex flex-wrap items-end gap-3"><Field label="Data da súmula"><input type="date" className={inputClass} value={date} onChange={e=>setDate(e.target.value)}/></Field><button onClick={save} disabled={loading} className={cx(btn,'bg-indigo-600 text-white ml-auto')}><Save className="w-4 h-4"/>Salvar estatísticas</button></Panel><Panel className="overflow-hidden"><div className="grid grid-cols-[minmax(140px,1fr)_70px_70px_70px_70px_70px_70px] gap-2 px-4 py-3 bg-slate-900/60 text-[10px] uppercase font-black text-slate-500"><span>Atleta</span><span>2PT</span><span>3PT</span><span>REB</span><span>AST</span><span>TOC</span><span>PTS</span></div><div className="max-h-[68vh] overflow-y-auto">{athletes.map(a=>{const s=values[a.id]||{};return <div key={a.id} className="grid grid-cols-[minmax(140px,1fr)_70px_70px_70px_70px_70px_70px] gap-2 items-center px-4 py-2 border-t border-slate-700/50"><span className="font-bold text-slate-200 truncate">{a.name}</span>{['pts2','pts3','reb','ast','blk'].map(k=><input key={k} type="number" min="0" className={cx(inputClass,'px-2 text-center')} value={s[k]||0} onChange={e=>change(a.id,k,e.target.value)}/>)}<span className="text-center font-black text-indigo-300">{(Number(s.pts2||0)*2)+(Number(s.pts3||0)*3)}</span></div>})}</div></Panel></div>;
}

function GamesModule({ data, reload, notify, setDirty }) {
  const empty={id:'',game_date:new Date().toISOString().slice(0,10),game_time:'20:00',location:'',cancelled:false}; const [form,setForm]=useState(empty);
  const save=async()=>{try{const r=await adminPost('saveGame',form);notify(r.message);setForm(empty);setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  const del=async id=>{if(!window.confirm('Excluir este jogo e suas confirmações?'))return;try{const r=await adminPost('deleteGame',{id});notify(r.message);setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  return <CrudList title="Jogo" form={<div className="grid md:grid-cols-4 gap-3"><Field label="Data"><input type="date" className={inputClass} value={form.game_date} onChange={e=>setForm({...form,game_date:e.target.value})}/></Field><Field label="Horário"><input type="time" className={inputClass} value={form.game_time} onChange={e=>setForm({...form,game_time:e.target.value})}/></Field><Field label="Local"><input className={inputClass} value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></Field><div className="flex items-end"><button onClick={save} className={cx(btn,'bg-indigo-600 text-white w-full')}><Save className="w-4 h-4"/>{form.id?'Atualizar':'Cadastrar'}</button></div></div>} items={(data?.games||[]).map(g=>({id:g.id,title:`${dateBr(g.game_date)} · ${String(g.game_time).slice(0,5)}`,subtitle:g.location,muted:g.cancelled_at?'Cancelado':''}))} onEdit={id=>{const g=data.games.find(x=>x.id===id);setForm({id:g.id,game_date:g.game_date,game_time:String(g.game_time).slice(0,5),location:g.location,cancelled:Boolean(g.cancelled_at)});}} onDelete={del}/>;
}

function EventsModule({ data, reload, notify, setDirty }) {
  const empty={id:'',name:'',starts_at:'',location:'',description:'',value:0,deadline:''};const [form,setForm]=useState(empty);
  const save=async()=>{try{const r=await adminPost('saveEvent',form);notify(r.message);setForm(empty);setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  const del=async id=>{if(!window.confirm('Excluir este evento e suas confirmações?'))return;try{const r=await adminPost('deleteEvent',{id});notify(r.message);setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  return <CrudList title="Evento" form={<><div className="grid md:grid-cols-3 gap-3"><Field label="Nome"><input className={inputClass} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Data e hora"><input type="datetime-local" className={inputClass} value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/></Field><Field label="Local"><input className={inputClass} value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></Field><Field label="Prazo de inscrição"><input type="date" className={inputClass} value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></Field><Field label="Valor"><input type="number" step="0.01" className={inputClass} value={form.value} onChange={e=>setForm({...form,value:e.target.value})}/></Field><Field label="Descrição"><input className={inputClass} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field></div><div className="flex justify-end mt-3"><button onClick={save} className={cx(btn,'bg-indigo-600 text-white')}><Save className="w-4 h-4"/>{form.id?'Atualizar':'Cadastrar evento'}</button></div></>} items={(data?.events||[]).map(e=>({id:e.id,title:e.name,subtitle:`${new Date(e.starts_at).toLocaleString('pt-BR')} · ${e.location}`,muted:money(e.value)}))} onEdit={id=>{const e=data.events.find(x=>x.id===id);setForm({id:e.id,name:e.name,starts_at:dateTimeLocal(e.starts_at),location:e.location,description:e.description,value:e.value,deadline:e.deadline});}} onDelete={del}/>;
}

function CrudList({ title, form, items, onEdit, onDelete }) {
  return <div className="space-y-5"><Panel className="p-5"><h3 className="font-black text-white mb-4">{title}</h3>{form}</Panel><Panel className="overflow-hidden"><div className="px-4 py-3 bg-slate-900/60 font-black text-white">Registros</div><div className="max-h-[58vh] overflow-y-auto divide-y divide-slate-700/50">{items.map(item=><div key={item.id} className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="font-black text-slate-200 truncate">{item.title}</p><p className="text-xs text-slate-500 truncate">{item.subtitle}</p></div><span className="text-xs text-slate-500">{item.muted}</span><button onClick={()=>onEdit(item.id)} className={cx(btn,'bg-slate-700 text-slate-200')}>Editar</button><button onClick={()=>onDelete(item.id)} className="p-2 text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4"/></button></div>)}</div></Panel></div>;
}

function MedicalModule({ data, reload, notify, setDirty }) {
  const athletes=(data?.athletes||[]).filter(a=>a.active); const empty={id:'',athlete_id:'',injury:'',injury_date:new Date().toISOString().slice(0,10),expected_return:'',status:'Em tratamento'};const [form,setForm]=useState(empty);
  const name=id=>data.athletes.find(a=>a.id===id)?.name||'Atleta';
  const save=async()=>{try{const r=await adminPost('saveMedical',form);notify(r.message);setForm(empty);setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  const discharge=async id=>{if(!window.confirm('Registrar alta deste atleta?'))return;try{const r=await adminPost('dischargeMedical',{id});notify(r.message);setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  const del=async id=>{if(!window.confirm('Excluir definitivamente este registro médico?'))return;try{const r=await adminPost('deleteMedical',{id});notify(r.message);setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  return <div className="space-y-5"><Panel className="p-5"><div className="grid md:grid-cols-5 gap-3"><Field label="Atleta"><select className={inputClass} value={form.athlete_id} onChange={e=>setForm({...form,athlete_id:e.target.value})}><option value="">Selecione</option>{athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field><Field label="Lesão"><input className={inputClass} value={form.injury} onChange={e=>setForm({...form,injury:e.target.value})}/></Field><Field label="Data"><input type="date" className={inputClass} value={form.injury_date} onChange={e=>setForm({...form,injury_date:e.target.value})}/></Field><Field label="Previsão retorno"><input type="date" className={inputClass} value={form.expected_return} onChange={e=>setForm({...form,expected_return:e.target.value})}/></Field><div className="flex items-end"><button onClick={save} className={cx(btn,'bg-indigo-600 text-white w-full')}><Save className="w-4 h-4"/>Salvar</button></div></div></Panel><Panel className="overflow-hidden"><div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-700/50">{(data?.medical||[]).map(r=><div key={r.id} className="flex items-center gap-3 px-4 py-3"><div className="flex-1 min-w-0"><p className="font-black text-slate-200">{name(r.athlete_id)} · {r.injury}</p><p className="text-xs text-slate-500">{dateBr(r.injury_date)} → {dateBr(r.expected_return)} · {r.status}</p></div>{!r.discharged_at&&<button onClick={()=>discharge(r.id)} className={cx(btn,'bg-emerald-950/60 text-emerald-300')}>Dar alta</button>}<button onClick={()=>del(r.id)} className="p-2 text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4"/></button></div>)}</div></Panel></div>;
}

function NotificationsModule({ data, reload, notify, setDirty }) {
  const [form,setForm]=useState({title:'',message:'',targetTab:'presenca',sendPush:true});const send=async()=>{try{const r=await adminPost('sendNotification',form);notify(r.message);setForm({...form,title:'',message:''});setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  return <div className="grid xl:grid-cols-2 gap-5"><Panel className="p-5"><h3 className="font-black text-white mb-4">Novo aviso</h3><div className="space-y-4"><Field label="Título"><input className={inputClass} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field><Field label="Mensagem"><textarea rows="6" className={inputClass} value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></Field><Field label="Abrir aba"><select className={inputClass} value={form.targetTab} onChange={e=>setForm({...form,targetTab:e.target.value})}>{['presenca','relatorios','financas','jogos','eventos','sorteio','dm','halldafama','estatuto'].map(x=><option key={x} value={x}>{x}</option>)}</select></Field><label className="flex items-center gap-2 text-sm font-bold text-slate-300"><input type="checkbox" checked={form.sendPush} onChange={e=>setForm({...form,sendPush:e.target.checked})}/>Enviar push para dispositivos cadastrados</label><button disabled={!form.title||!form.message} onClick={send} className={cx(btn,'bg-indigo-600 text-white w-full')}><BellRing className="w-4 h-4"/>Publicar aviso</button></div></Panel><Panel className="overflow-hidden"><div className="px-4 py-3 bg-slate-900/60 font-black text-white">Histórico de avisos</div><div className="max-h-[68vh] overflow-y-auto divide-y divide-slate-700/50">{(data?.notifications||[]).map(n=><div key={n.id} className="p-4"><div className="flex justify-between gap-3"><p className="font-black text-slate-200">{n.title}</p><span className="text-[10px] text-slate-500">{new Date(n.created_at).toLocaleString('pt-BR')}</span></div><p className="text-sm text-slate-400 mt-2">{n.message}</p><p className="text-[10px] text-slate-500 mt-2">Destino: {n.target_tab||'--'} · push {n.push_accepted} ok / {n.push_failed} falhas</p></div>)}</div></Panel></div>;
}

function SettingsModule({ data, reload, notify, setDirty }) {
  const map=Object.fromEntries((data?.settings||[]).map(s=>[s.key,s.value])); const [form,setForm]=useState({monthly_fee:map.monthly_fee??20,pix_code:map.pix_code??'',active_season:map.active_season??new Date().getFullYear(),finance_balance_adjustment:map.finance_balance_adjustment??0});
  useEffect(()=>setForm({monthly_fee:map.monthly_fee??20,pix_code:map.pix_code??'',active_season:map.active_season??new Date().getFullYear(),finance_balance_adjustment:map.finance_balance_adjustment??0}),[data?.settings]);
  const save=async()=>{try{const r=await adminPost('saveSettings',{settings:{...form,monthly_fee:Number(form.monthly_fee),active_season:Number(form.active_season),finance_balance_adjustment:Number(form.finance_balance_adjustment)}});notify(r.message);setDirty(true);await reload();}catch(e){notify(e.message,'error');}};
  return <Panel className="p-5 max-w-3xl"><h3 className="text-xl font-black text-white">Configurações gerais</h3><p className="text-xs text-slate-500 mt-1 mb-5">Parâmetros usados pelo portal e pelo financeiro.</p><div className="grid sm:grid-cols-2 gap-4"><Field label="Mensalidade padrão (R$)"><input type="number" step="0.01" className={inputClass} value={form.monthly_fee} onChange={e=>setForm({...form,monthly_fee:e.target.value})}/></Field><Field label="Temporada ativa"><input type="number" className={inputClass} value={form.active_season} onChange={e=>setForm({...form,active_season:e.target.value})}/></Field><Field label="PIX"><input className={inputClass} value={form.pix_code} onChange={e=>setForm({...form,pix_code:e.target.value})}/></Field><Field label="Ajuste de saldo de abertura" hint="Preserva diferenças históricas anteriores ao Supabase."><input type="number" step="0.01" className={inputClass} value={form.finance_balance_adjustment} onChange={e=>setForm({...form,finance_balance_adjustment:e.target.value})}/></Field></div><div className="flex justify-end mt-5"><button onClick={save} className={cx(btn,'bg-indigo-600 text-white')}><Save className="w-4 h-4"/>Salvar configurações</button></div></Panel>;
}

function AuditModule({ data }) {
  return <Panel className="overflow-hidden"><div className="px-4 py-3 bg-slate-900/60"><h3 className="font-black text-white">Trilha de auditoria</h3><p className="text-xs text-slate-500">Últimas 150 operações registradas no backend.</p></div><div className="max-h-[72vh] overflow-y-auto divide-y divide-slate-700/50">{(data?.audit||[]).map(a=><div key={a.id} className="grid md:grid-cols-[170px_220px_160px_minmax(0,1fr)] gap-3 px-4 py-3 text-sm"><span className="text-slate-500">{new Date(a.created_at).toLocaleString('pt-BR')}</span><span className="font-bold text-slate-200">{a.action}</span><span className="text-slate-400">{a.entity_type||'--'}</span><span className="text-slate-500 truncate">{a.entity_id||'--'}</span></div>)}</div></Panel>;
}

function AdminConsole({ onClose }) {
  const [module,setModule]=useState('resumo'); const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [toast,setToast]=useState(null); const [dirty,setDirty]=useState(false);
  const notify=useCallback((message,type='success')=>{setToast({message,type});window.clearTimeout(window.__cbaAdminToast);window.__cbaAdminToast=window.setTimeout(()=>setToast(null),4000);},[]);
  const reload=useCallback(async()=>{try{setLoading(true);const r=await adminPost('bootstrap');setData(r.data);}catch(e){notify(e.message,'error');}finally{setLoading(false);}},[notify]);
  useEffect(()=>{reload();},[reload]);
  const close=()=>{if(dirty){window.location.reload();return;}onClose();};
  const content=()=>{if(loading&&!data)return <div className="h-full flex items-center justify-center text-slate-400"><RefreshCw className="w-6 h-6 animate-spin mr-3"/>Carregando administração...</div>;switch(module){case'resumo':return <Summary data={data} onGo={setModule}/>;case'atletas':return <AthletesModule data={data} reload={reload} notify={notify} setDirty={setDirty}/>;case'presencas':return <AttendanceModule notify={notify} setDirty={setDirty}/>;case'financeiro':return <FinanceModule data={data} reload={reload} notify={notify} setDirty={setDirty}/>;case'estatisticas':return <StatsModule notify={notify} setDirty={setDirty}/>;case'jogos':return <GamesModule data={data} reload={reload} notify={notify} setDirty={setDirty}/>;case'eventos':return <EventsModule data={data} reload={reload} notify={notify} setDirty={setDirty}/>;case'dm':return <MedicalModule data={data} reload={reload} notify={notify} setDirty={setDirty}/>;case'notificacoes':return <NotificationsModule data={data} reload={reload} notify={notify} setDirty={setDirty}/>;case'configuracoes':return <SettingsModule data={data} reload={reload} notify={notify} setDirty={setDirty}/>;case'auditoria':return <AuditModule data={data}/>;default:return null;}};
  return createPortal(<div className="fixed inset-0 z-[150] bg-slate-950 text-slate-100 flex overflow-hidden"><Toast toast={toast} onClose={()=>setToast(null)}/><aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-800 bg-slate-900/95 p-4 flex-col"><div className="flex items-center gap-3 p-3"><div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center"><ShieldCheck className="w-5 h-5"/></div><div><p className="font-black">Administração</p><p className="text-[10px] text-slate-500">Portal CBA</p></div></div><div className="mt-4 space-y-1 overflow-y-auto">{MODULES.map(([key,label,Icon])=><button key={key} onClick={()=>setModule(key)} className={cx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition',module===key?'bg-indigo-600 text-white':'text-slate-400 hover:bg-slate-800 hover:text-white')}><Icon className="w-4 h-4"/>{label}</button>)}</div><div className="mt-auto pt-4 border-t border-slate-800"><p className="text-[10px] text-slate-600 px-3">Acesso exclusivo<br/>{ADMIN_EMAIL}</p></div></aside><div className="flex-1 min-w-0 flex flex-col"><header className="h-16 shrink-0 border-b border-slate-800 bg-slate-900/85 backdrop-blur-xl flex items-center gap-3 px-4"><div className="lg:hidden flex gap-2 overflow-x-auto flex-1">{MODULES.map(([key,label,Icon])=><button key={key} title={label} onClick={()=>setModule(key)} className={cx('w-10 h-10 rounded-xl shrink-0 flex items-center justify-center',module===key?'bg-indigo-600':'bg-slate-800 text-slate-400')}><Icon className="w-4 h-4"/></button>)}</div><div className="hidden lg:block flex-1"><p className="text-xs uppercase font-black tracking-wider text-slate-500">Administração</p><p className="font-black text-white">{MODULES.find(x=>x[0]===module)?.[1]}</p></div>{loading&&<RefreshCw className="w-4 h-4 animate-spin text-indigo-400"/>}<button onClick={reload} className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"><RefreshCw className="w-4 h-4"/></button><button onClick={close} className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"><X className="w-5 h-5"/></button></header><main className="flex-1 overflow-y-auto p-4 md:p-6">{content()}</main></div></div>,document.body);
}

export default function AdminDashboardBridge() {
  const [allowed,setAllowed]=useState(false); const [open,setOpen]=useState(false); const [mountNode,setMountNode]=useState(null);
  useEffect(()=>{const check=()=>setAllowed(readSession()?.email===ADMIN_EMAIL);check();window.addEventListener('storage',check);const timer=window.setInterval(check,1500);return()=>{window.removeEventListener('storage',check);window.clearInterval(timer);};},[]);
  useEffect(()=>{if(!allowed)return;let node=null;const sync=()=>{const nav=[...document.querySelectorAll('nav')].find(n=>n.querySelector('button[title="Presença"]'));if(!nav)return;if(!node||!node.isConnected){node=document.createElement('div');node.dataset.cbaAdminMount='true';nav.appendChild(node);setMountNode(node);}};sync();const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();if(node?.isConnected)node.remove();};},[allowed]);
  if(!allowed)return null;
  return <>{mountNode&&createPortal(<button type="button" title="Administração" aria-label="Abrir Administração" onClick={()=>setOpen(true)} className="flex items-center gap-3 w-full min-h-12 px-3.5 rounded-2xl text-left transition-all duration-300 text-indigo-400 hover:bg-indigo-950/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"><ShieldCheck className="w-5 h-5 shrink-0"/><span className="font-black text-sm truncate">Administração</span></button>,mountNode)}{open&&<AdminConsole onClose={()=>setOpen(false)}/>}</>;
}
