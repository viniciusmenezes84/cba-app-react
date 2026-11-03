import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CalendarCheck2, Trophy, X } from 'lucide-react';
import { formatDate } from './athleteDashboardData';

const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:opacity-50';

export default function MyCardPeriodSelector({ year, rounds = [], onClose, onSelect }) {
  const [period, setPeriod] = useState('latest');
  const [date, setDate] = useState(rounds[0]?.date || '');
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const hasRounds = rounds.length > 0;
  const selectedDate = period === 'latest' ? rounds[0]?.date : date;
  const canPreview = period === 'season' || (hasRounds && rounds.some(round => round.date === selectedDate));

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = oldOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  const keyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)') || [])];
    if (event.shiftKey && document.activeElement === focusable[0]) {
      event.preventDefault();
      focusable.at(-1)?.focus();
    } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
      event.preventDefault();
      focusable[0]?.focus();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={keyDown}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cba-card-period-title" className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Meu CBA</p>
            <h3 id="cba-card-period-title" className="mt-1 text-2xl font-black">Gerar meu card</h3>
            <p className="mt-2 text-sm text-slate-400">Escolha as estatísticas que deseja compartilhar.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 text-slate-200" aria-label="Fechar seleção do card"><X size={20} aria-hidden="true"/></button>
        </div>
        <fieldset className="mt-5 space-y-3">
          <legend className="mb-2 text-sm font-bold">Período das estatísticas</legend>
          {[
            { value: 'latest', label: 'Última rodada', hint: hasRounds ? `Rodada de ${formatDate(rounds[0].date)}` : 'Nenhuma rodada disponível', Icon: CalendarCheck2 },
            { value: 'date', label: 'Escolher uma rodada', hint: 'Selecione uma data do seu histórico de súmulas', Icon: CalendarDays },
            { value: 'season', label: 'Minha temporada', hint: `Estatísticas acumuladas de ${year}`, Icon: Trophy }
          ].map(({ value, label, hint, Icon }) => (
            <label key={value} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${period === value ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700 bg-slate-950/60'}`}>
              <input type="radio" name="cba-card-period" value={value} checked={period === value} onChange={() => setPeriod(value)} className="h-4 w-4 shrink-0 accent-emerald-400"/>
              <Icon size={22} className="shrink-0 text-emerald-300" aria-hidden="true"/>
              <span className="min-w-0"><span className="block font-bold">{label}</span><span className="block text-xs leading-5 text-slate-400">{hint}</span></span>
            </label>
          ))}
        </fieldset>
        {period === 'date' && <label className="mt-4 block text-sm font-bold">Data da rodada
          <select aria-label="Data da rodada para o card" className="mt-2 block min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-white" disabled={!hasRounds} value={date} onChange={event => setDate(event.target.value)}>
            {rounds.map(round => <option key={round.date} value={round.date}>{formatDate(round.date)}</option>)}
          </select>
        </label>}
        {!hasRounds && period !== 'season' && <p role="status" className="mt-3 text-sm text-amber-200">Você ainda não possui uma rodada com súmula disponível nesta temporada. Escolha Minha temporada ou altere o ano em Meu CBA.</p>}
        <p className="mt-4 text-xs leading-5 text-slate-400">Os dados da rodada representam o total do domingo, mesmo quando você participa de várias partidas. O card inclui apenas suas estatísticas.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" className={buttonClass} onClick={onClose}>Cancelar</button>
          <button type="button" disabled={!canPreview} className={`${buttonClass} border-emerald-500 bg-emerald-500 text-slate-950`} onClick={() => onSelect({ period, date: period === 'season' ? null : selectedDate })}>Visualizar card</button>
        </div>
      </section>
    </div>,
    document.body
  );
}
