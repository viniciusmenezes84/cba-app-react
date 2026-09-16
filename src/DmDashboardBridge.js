import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity, CalendarDays, CheckCircle2, ChevronRight, Clock3, Edit3,
  HeartPulse, Plus, RefreshCw, Search, ShieldCheck, Stethoscope, X
} from 'lucide-react';

const MEDICAL_URL = 'https://vqirdswgchlcxevepamu.supabase.co/functions/v1/cba-medical';
const SESSION_KEYS = ['cba_session_v2', 'cba_session_v1'];
const STATUSES = ['Aguardando Exames', 'Repouso Absoluto', 'Fisioterapia', 'Transição Física', 'Afastado por Recomendação'];

function readToken() {
  for (const key of SESSION_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token = parsed?.user?.token || parsed?.user?.user?.token || parsed?.token;
      if (token) return token;
    } catch { /* tenta a próxima chave */ }
  }
  try {
    const raw = window.sessionStorage.getItem('cba_session_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.token || parsed?.user?.token || null;
    }
  } catch { /* sem impacto */ }
  return null;
}

async function medicalPost(action, payload = {}) {
  const token = readToken();
  if (!token) throw new Error('Sessão não encontrada. Entre novamente.');
  const response = await fetch(MEDICAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.result === 'error') throw new Error(data?.message || 'Falha ao comunicar com o Departamento Médico.');
  return data;
}

const fmtDate = value => value ? String(value).split('-').reverse().join('/') : '--';
const normalize = value => String(value || '').trim().toLowerCase();

function daysUntil(value) {
  if (!value) return null;
  const target = new Date(`${value}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function returnLabel(value) {
  const days = daysUntil(value);
  if (days === null) return 'Sem previsão';
  if (days === 0) return 'Retorno previsto hoje';
  if (days === 1) return 'Retorno em 1 dia';
  if (days > 1) return `Retorno em ${days} dias`;
  if (days === -1) return 'Previsão vencida há 1 dia';
  return `Previsão vencida há ${Math.abs(days)} dias`;
}

function statusClasses(status) {
  const value = normalize(status);
  if (value.includes('transição')) return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';
  if (value.includes('fisioterapia')) return 'bg-orange-500/10 border-orange-500/30 text-orange-300';
  if (value.includes('aguardando')) return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
  if (value.includes('alta')) return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
  return 'bg-rose-500/10 border-rose-500/30 text-rose-300';
}

function Avatar({ record, size = 'w-12 h-12' }) {
  return record?.photoUrl ? (
    <img src={record.photoUrl} alt={record.playerName} className={`${size} rounded-2xl object-cover border border-slate-700`} crossOrigin="anonymous" />
  ) : (
    <div className={`${size} rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-slate-400`}>
      {record?.playerName?.charAt(0) || '?'}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, detail, tone = 'text-white' }) {
  return <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3.5 sm:p-4">
    <div className="flex items-center justify-between gap-3"><p className="text-[9px] uppercase tracking-wider font-black text-slate-500">{label}</p><Icon className={`w-4 h-4 ${tone}`} /></div>
    <p className={`text-2xl sm:text-3xl font-black mt-1 ${tone}`}>{value}</p>
    <p className="text-[10px] text-slate-500 mt-1">{detail}</p>
  </div>;
}

function ModalShell({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm sm:p-4 flex items-end sm:items-center justify-center" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-xl h-[94vh] sm:h-auto sm:max-h-[90vh] bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <h3 className="text-lg sm:text-xl font-black text-white">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6 flex-1">{children}</div>
      </div>
    </div>, document.body
  );
}

function DmExperience({ initial, refresh }) {
  const [filter, setFilter] = useState('ativos');
  const [query, setQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formRecord, setFormRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const { records = [], athletes = [], isAdmin = false } = initial || {};

  const activeRecords = useMemo(() => records.filter(item => !item.dischargedAt), [records]);
  const historyRecords = useMemo(() => records.filter(item => item.dischargedAt), [records]);
  const transitionCount = activeRecords.filter(item => normalize(item.status).includes('transição')).length;
  const soonCount = activeRecords.filter(item => item.expectedReturn && daysUntil(item.expectedReturn) >= 0 && daysUntil(item.expectedReturn) <= 14).length;

  const filtered = useMemo(() => {
    let list = activeRecords;
    if (filter === 'historico') list = historyRecords;
    if (filter === 'transicao') list = activeRecords.filter(item => normalize(item.status).includes('transição'));
    if (filter === 'proximos') list = activeRecords.filter(item => item.expectedReturn && daysUntil(item.expectedReturn) >= 0 && daysUntil(item.expectedReturn) <= 14);
    const term = normalize(query);
    if (term) list = list.filter(item => normalize(item.playerName).includes(term) || normalize(item.status).includes(term) || normalize(item.injury).includes(term));
    return list;
  }, [activeRecords, historyRecords, filter, query]);

  const openNew = () => setFormRecord({ id: '', athleteId: athletes[0]?.id || '', injury: '', injuryDate: new Date().toISOString().slice(0, 10), expectedReturn: '', status: 'Aguardando Exames' });
  const openEdit = record => setFormRecord({ id: record.id, athleteId: record.athleteId, injury: record.injury || '', injuryDate: record.injuryDate || '', expectedReturn: record.expectedReturn || '', status: record.status || 'Aguardando Exames' });

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await medicalPost('save', formRecord);
      setFormRecord(null);
      setSelectedRecord(null);
      setNotice({ type: 'success', text: formRecord?.id ? 'Registro atualizado.' : 'Ocorrência registrada.' });
      await refresh();
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Falha ao salvar.' });
    } finally { setSaving(false); }
  };

  const discharge = async record => {
    if (!window.confirm(`Confirmar alta médica de ${record.playerName}? O registro será preservado no histórico.`)) return;
    setSaving(true);
    try {
      await medicalPost('discharge', { id: record.id });
      setSelectedRecord(null);
      setNotice({ type: 'success', text: 'Alta registrada. O histórico foi preservado.' });
      await refresh();
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Falha ao registrar alta.' });
    } finally { setSaving(false); }
  };

  return <div className="space-y-4 sm:space-y-6 pb-24 md:pb-8">
    <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/40 p-5 sm:p-7 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div><div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-black text-rose-300"><Stethoscope className="w-4 h-4"/> Departamento Médico</div><h2 className="text-2xl sm:text-3xl font-black text-white mt-3">Disponibilidade do elenco</h2><p className="text-sm text-slate-400 mt-1">Acompanhamento de afastamentos, recuperação e retorno à quadra.</p></div>
        {isAdmin && <button onClick={openNew} className="hidden sm:flex rounded-2xl bg-rose-600 hover:bg-rose-500 text-white px-5 py-3 font-black items-center justify-center gap-2"><Plus className="w-5 h-5"/> Registrar ocorrência</button>}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-5">
        <SummaryCard icon={HeartPulse} label="Em tratamento" value={activeRecords.length} detail="registros ativos" tone="text-rose-300" />
        <SummaryCard icon={Activity} label="Transição" value={transitionCount} detail="retorno gradual" tone="text-cyan-300" />
        <SummaryCard icon={Clock3} label="Retorno próximo" value={soonCount} detail="até 14 dias" tone="text-amber-300" />
        <SummaryCard icon={ShieldCheck} label="Histórico" value={historyRecords.length} detail="altas preservadas" tone="text-emerald-300" />
      </div>
    </div>

    {notice && <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${notice.type === 'error' ? 'border-rose-500/30 bg-rose-950/30 text-rose-300' : 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'}`}>{notice.text}</div>}

    <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-3 sm:p-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[['ativos','Ativos'],['proximos','Retorno próximo'],['transicao','Transição'],['historico','Histórico']].map(([key,label]) => <button key={key} onClick={() => setFilter(key)} className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black ${filter === key ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{label}</button>)}
      </div>
      <div className="relative mt-2"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar atleta ou status..." className="w-full rounded-2xl border border-slate-700 bg-slate-950 text-white pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/30" /></div>
    </div>

    {filtered.length === 0 ? <div className="rounded-3xl border border-slate-700 bg-slate-900/60 py-12 px-5 text-center"><HeartPulse className="w-12 h-12 text-emerald-400 mx-auto mb-3"/><h3 className="font-black text-white text-lg">Nenhum registro nesta visão</h3><p className="text-sm text-slate-500 mt-1">Quando houver uma ocorrência, ela aparecerá aqui automaticamente.</p></div> : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
      {filtered.map(record => <button key={record.id} onClick={() => setSelectedRecord(record)} className="text-left rounded-3xl border border-slate-700 bg-slate-900/80 hover:border-slate-600 p-4 transition min-w-0">
        <div className="flex items-center gap-3"><Avatar record={record}/><div className="min-w-0 flex-1"><p className="font-black text-white truncate">{record.playerName}</p><span className={`inline-flex mt-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClasses(record.status)}`}>{record.status || 'Em acompanhamento'}</span></div><ChevronRight className="w-5 h-5 text-slate-600 shrink-0"/></div>
        <div className="mt-3 pt-3 border-t border-slate-800">
          {record.canViewDetails ? <><p className="text-sm font-bold text-slate-300 line-clamp-1">{record.injury}</p><div className="mt-2 flex items-center justify-between gap-3"><span className="text-[10px] text-slate-500">{fmtDate(record.injuryDate)}</span><span className={`text-[10px] font-black ${daysUntil(record.expectedReturn) < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{returnLabel(record.expectedReturn)}</span></div></> : <p className="text-xs text-slate-500">Detalhes médicos restritos. Status operacional disponível.</p>}
        </div>
      </button>)}
    </div>}

    {isAdmin && <button onClick={openNew} className="sm:hidden fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-rose-600 text-white shadow-2xl flex items-center justify-center" aria-label="Registrar ocorrência"><Plus className="w-6 h-6"/></button>}

    <ModalShell open={Boolean(selectedRecord)} title={selectedRecord?.playerName || 'Detalhes'} onClose={() => setSelectedRecord(null)}>
      {selectedRecord && <div className="space-y-5">
        <div className="flex items-center gap-4"><Avatar record={selectedRecord} size="w-16 h-16"/><div><p className="font-black text-white text-xl">{selectedRecord.playerName}</p><span className={`inline-flex mt-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClasses(selectedRecord.status)}`}>{selectedRecord.status}</span></div></div>
        {selectedRecord.canViewDetails ? <div className="space-y-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4"><p className="text-[9px] uppercase tracking-wider font-black text-slate-500">Lesão / ocorrência</p><p className="text-white font-bold mt-1">{selectedRecord.injury}</p></div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-slate-700 bg-slate-950 p-3"><p className="text-[9px] uppercase font-black text-slate-500">Ocorrência</p><p className="text-white font-black mt-1">{fmtDate(selectedRecord.injuryDate)}</p></div><div className="rounded-2xl border border-slate-700 bg-slate-950 p-3"><p className="text-[9px] uppercase font-black text-slate-500">Previsão</p><p className="text-white font-black mt-1">{fmtDate(selectedRecord.expectedReturn)}</p></div></div>
          {!selectedRecord.dischargedAt && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4"><p className="text-xs font-black text-emerald-300">{returnLabel(selectedRecord.expectedReturn)}</p></div>}
          {selectedRecord.dischargedAt && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 flex items-center gap-2 text-emerald-300 font-black"><CheckCircle2 className="w-5 h-5"/> Alta registrada em {new Date(selectedRecord.dischargedAt).toLocaleDateString('pt-BR')}</div>}
        </div> : <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">Por privacidade, você pode ver apenas o status operacional deste atleta. O diagnóstico e as datas detalhadas ficam restritos ao próprio atleta e à administração.</div>}
        {isAdmin && !selectedRecord.dischargedAt && <div className="grid sm:grid-cols-2 gap-2"><button onClick={() => openEdit(selectedRecord)} className="rounded-2xl border border-slate-700 bg-slate-800 py-3 font-black text-white flex items-center justify-center gap-2"><Edit3 className="w-4 h-4"/> Atualizar fase</button><button disabled={saving} onClick={() => discharge(selectedRecord)} className="rounded-2xl bg-emerald-500 text-slate-950 py-3 font-black flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle2 className="w-4 h-4"/> Dar alta</button></div>}
      </div>}
    </ModalShell>

    <ModalShell open={Boolean(formRecord)} title={formRecord?.id ? 'Atualizar ocorrência' : 'Registrar ocorrência'} onClose={() => !saving && setFormRecord(null)}>
      {formRecord && <form onSubmit={submit} className="space-y-4">
        <label className="block"><span className="text-[10px] uppercase tracking-wider font-black text-slate-500">Atleta</span><select value={formRecord.athleteId} onChange={event => setFormRecord(prev => ({ ...prev, athleteId: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 text-white p-3.5 font-bold" required>{athletes.map(athlete => <option key={athlete.id} value={athlete.id}>{athlete.name}</option>)}</select></label>
        <label className="block"><span className="text-[10px] uppercase tracking-wider font-black text-slate-500">Lesão / ocorrência</span><input value={formRecord.injury} onChange={event => setFormRecord(prev => ({ ...prev, injury: event.target.value }))} placeholder="Ex.: Entorse no tornozelo direito" maxLength={300} className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 text-white p-3.5" required /></label>
        <div className="grid sm:grid-cols-2 gap-4"><label className="block"><span className="text-[10px] uppercase tracking-wider font-black text-slate-500">Data da ocorrência</span><input type="date" value={formRecord.injuryDate} onChange={event => setFormRecord(prev => ({ ...prev, injuryDate: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 text-white p-3.5" required /></label><label className="block"><span className="text-[10px] uppercase tracking-wider font-black text-slate-500">Previsão de retorno</span><input type="date" value={formRecord.expectedReturn} onChange={event => setFormRecord(prev => ({ ...prev, expectedReturn: event.target.value }))} min={formRecord.injuryDate} className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 text-white p-3.5" required /></label></div>
        <label className="block"><span className="text-[10px] uppercase tracking-wider font-black text-slate-500">Fase atual</span><select value={formRecord.status} onChange={event => setFormRecord(prev => ({ ...prev, status: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-950 text-white p-3.5 font-bold">{STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select></label>
        <button type="submit" disabled={saving} className="w-full rounded-2xl bg-rose-600 hover:bg-rose-500 text-white py-3.5 font-black flex items-center justify-center gap-2 disabled:opacity-50">{saving ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Stethoscope className="w-5 h-5"/>}{saving ? 'Salvando...' : formRecord.id ? 'Salvar atualização' : 'Registrar ocorrência'}</button>
      </form>}
    </ModalShell>
  </div>;
}

export default function DmDashboardBridge() {
  const [mountNode, setMountNode] = useState(null);
  const [active, setActive] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try { setError(''); setData(await medicalPost('bootstrap')); }
    catch (err) { setError(err?.message || 'Falha ao carregar o Departamento Médico.'); }
  }, []);

  useEffect(() => { if (active) refresh(); }, [active, refresh]);

  useEffect(() => {
    let node = null;
    let hiddenRoot = null;
    const sync = () => {
      const button = document.querySelector('button[title="Departamento Médico"]');
      const isActive = Boolean(button?.className?.includes('scale-110'));
      setActive(isActive);

      const heading = [...document.querySelectorAll('h2')].find(element => element.textContent?.trim().includes('Departamento Médico'));
      const legacyRoot = heading?.closest('.space-y-8');
      if (!legacyRoot?.parentElement) return;

      if (hiddenRoot && hiddenRoot !== legacyRoot && hiddenRoot.isConnected) hiddenRoot.style.display = '';
      hiddenRoot = legacyRoot;
      if (!node || !node.isConnected) {
        node = document.createElement('div');
        node.dataset.dmDashboardV2 = 'true';
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
  if (!data) return createPortal(<div className="rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center text-sm font-bold text-slate-500">Carregando Departamento Médico...</div>, mountNode);
  return createPortal(<DmExperience initial={data} refresh={refresh} />, mountNode);
}
