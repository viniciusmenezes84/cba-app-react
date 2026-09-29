import React, { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Download, ExternalLink, MapPin, PartyPopper, Trophy } from 'lucide-react';
import { buildAgendaItems, googleCalendarUrl, makeCalendarFile } from './agendaCalendar';

const shortDate = value => {
  const [year, month, day] = String(value || '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : '--';
};
const formatStart = item => item.start && !Number.isNaN(item.start.getTime())
  ? new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Bahia', weekday: 'short', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(item.start)
  : `${shortDate(item.date)} · horário a confirmar`;

async function saveCalendar(item) {
  const content = makeCalendarFile(item);
  if (!content) return;
  const filename = `cba-${item.kind}-${String(item.id).replace(/[^a-z0-9-]/gi, '')}.ics`;
  const file = new File([content], filename, { type: 'text/calendar' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AgendaView({ data, onBack, onNavigate }) {
  const [filter, setFilter] = useState('todos');
  const [exportError, setExportError] = useState('');
  const items = useMemo(() => buildAgendaItems(data), [data]);
  const confirmed = items.filter(item => item.confirmed).length;
  const visible = filter === 'confirmados' ? items.filter(item => item.confirmed) : items;
  const exportItem = async item => {
    setExportError('');
    try { await saveCalendar(item); }
    catch { setExportError('Não foi possível abrir o arquivo neste dispositivo. Use a opção Google Agenda ou tente novamente.'); }
  };

  return <section aria-label="Minha agenda" className="space-y-5 pb-24 md:pb-8">
    <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-5 shadow-2xl sm:p-7">
      <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-slate-200"><ArrowLeft className="h-4 w-4"/>Voltar ao Início</button>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300"><CalendarDays className="h-4 w-4"/>Agenda CBA</p><h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Minha agenda</h2><p className="mt-2 max-w-xl text-sm text-slate-400">Jogos e eventos em ordem de data, com sua confirmação e os detalhes do compromisso.</p></div><div className="grid grid-cols-2 gap-2 sm:min-w-[220px]"><div className="rounded-xl bg-slate-950/70 p-3"><p className="text-2xl font-black text-white">{items.length}</p><p className="text-[10px] font-black uppercase text-slate-500">Próximos</p></div><div className="rounded-xl bg-slate-950/70 p-3"><p className="text-2xl font-black text-emerald-300">{confirmed}</p><p className="text-[10px] font-black uppercase text-slate-500">Confirmados</p></div></div></div>
    </div>
    {exportError&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-sm font-bold text-rose-200">{exportError}</p>}
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar agenda">{[['todos','Todos',items.length],['confirmados','Confirmados',confirmed]].map(([key,label,count])=><button key={key} type="button" aria-pressed={filter===key} onClick={()=>setFilter(key)} className={`min-h-10 rounded-xl px-4 py-2 text-xs font-black ${filter===key?'bg-white text-slate-950':'bg-slate-800 text-slate-300'}`}>{label} · {count}</button>)}</div>
    {!visible.length ? <div className="rounded-3xl border border-slate-700 bg-slate-900/75 p-8 text-center sm:p-12"><CalendarDays className="mx-auto h-10 w-10 text-slate-500"/><h3 className="mt-3 text-lg font-black text-white">{filter==='confirmados'?'Nenhum compromisso confirmado':'Nenhum compromisso agendado'}</h3><p className="mt-2 text-sm text-slate-400">{filter==='confirmados'?'Veja todos os compromissos e confirme sua participação nas abas Jogos ou Eventos.':'Quando houver jogos ou eventos futuros, eles aparecerão aqui.'}</p>{filter==='confirmados'&&<button type="button" onClick={()=>setFilter('todos')} className="mt-4 min-h-10 rounded-xl bg-slate-800 px-4 font-black text-white">Ver todos</button>}</div>
      : <div className="grid gap-3 lg:grid-cols-2">{visible.map(item=>{
        const kindIcon=item.kind==='jogo'?Trophy:PartyPopper;
        const Icon=kindIcon;
        const calendarUrl=googleCalendarUrl(item);
        const sourceTab=item.kind==='jogo'?'jogos':'eventos';
        const deadlinePassed=item.deadline && item.deadline < new Intl.DateTimeFormat('en-CA', { timeZone:'America/Bahia', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
        return <article key={`${item.kind}-${item.id}`} className="flex min-w-0 flex-col rounded-3xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-xl sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${item.kind==='jogo'?'border-emerald-500/30 bg-emerald-500/10 text-emerald-300':'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}><Icon className="h-3.5 w-3.5"/>{item.kind==='jogo'?'Jogo':'Evento'}</span><h3 className="mt-2 break-words text-lg font-black text-white">{item.title}</h3></div><span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black ${item.confirmed?'bg-emerald-950 text-emerald-300':deadlinePassed?'bg-slate-800 text-slate-400':'bg-amber-950/40 text-amber-300'}`}>{item.confirmed?<><CheckCircle2 className="mr-1 inline h-3 w-3"/>Confirmado</>:deadlinePassed?'Prazo encerrado':'A confirmar'}</span></div>
          <div className="mt-4 space-y-2 text-sm text-slate-300"><p className="flex items-center gap-2"><Clock3 className="h-4 w-4 shrink-0 text-emerald-300"/>{formatStart(item)}</p><p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"/>{item.location||'Local a definir'}</p>{item.kind==='evento'&&item.deadline&&<p className="text-xs text-slate-500">Confirmações até {shortDate(item.deadline)}</p>}</div>
          <div className="mt-auto grid grid-cols-2 gap-2 pt-5"><button type="button" onClick={()=>onNavigate(sourceTab)} className="col-span-2 min-h-11 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-black text-slate-950">{item.confirmed?'Ver detalhes':'Ver e confirmar'}</button><button type="button" disabled={!calendarUrl} onClick={()=>exportItem(item)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-2 text-xs font-black text-slate-200 disabled:opacity-40"><Download className="h-4 w-4"/>Arquivo .ics</button>{calendarUrl?<a href={calendarUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-2 text-center text-xs font-black text-slate-200"><ExternalLink className="h-4 w-4"/>Google Agenda</a>:<span className="flex items-center justify-center rounded-xl border border-slate-700 text-center text-xs text-slate-500">Horário pendente</span>}</div>
        </article>;
      })}</div>}
    <p className="text-center text-xs text-slate-500">O arquivo .ics abre o compartilhamento do celular quando disponível ou é baixado. Usa um período estimado de 2 horas e não sincroniza alterações futuras automaticamente.</p>
  </section>;
}
