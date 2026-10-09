import React, { lazy, Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CalendarDays, Camera, Save, Share2, UserRound } from 'lucide-react';
import { portalPost } from './cbaApi';
import { InitialDataContext } from './InitialDataContext';
import { availableAthleteYears, formatDate } from './athleteDashboardData';
import { buildMySeason } from './myCbaStats';
const AthleteCardModal = lazy(() => import('./AthleteCardModal'));
const currentYear = () => new Intl.DateTimeFormat('en', { timeZone: 'America/Bahia', year: 'numeric' }).format(new Date());
const fields = profile => Object.fromEntries(['nickname', 'position', 'jerseyNumber', 'photoUrl'].map(key => [key, profile[key] || '']));
const inputClass = 'mt-2 w-full min-w-0 rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30';
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:opacity-50';

export function ProfileAvatar({ name, photoUrl, className = 'h-16 w-16' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photoUrl]);
  return photoUrl && !failed
    ? <img src={photoUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`${className} shrink-0 rounded-2xl object-cover`} />
    : <span aria-hidden="true" className={`${className} inline-flex shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl font-black text-emerald-300`}>{name?.trim()?.[0] || 'C'}</span>;
}

export default function MeuCba({ onBack, onOpenAgenda, onProfileSaved }) {
  const initial = useContext(InitialDataContext);
  const dashboard = (initial?.data || initial)?.dashboard;
  const years = [...new Set([currentYear(), ...availableAthleteYears(dashboard?.players || [], dashboard?.dates || [])])].filter(value => Number(value) <= Number(currentYear())).sort().reverse();
  const [year, setYear] = useState(currentYear);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [cardOpen, setCardOpen] = useState(false);
  const savingRef = useRef(false);
  const mounted = useRef(true);
  const heading = useRef(null);
  useEffect(() => { mounted.current = true; heading.current?.focus(); return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: '' });
    setMessage(''); setSaveError(''); setDraft(null);
    portalPost('getMyProfile', { year: Number(year) }, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setState({ loading: false, data, error: '' }); setDraft(fields(data.profile)); } })
      .catch(error => { if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.message || 'Não foi possível carregar seu perfil.' }); });
    return () => controller.abort();
  }, [year, attempt]);
  const athlete = useMemo(() => state.data ? buildMySeason(state.data) : null, [state.data]);
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(fields(state.data?.profile || {}));
  async function save(event) {
    event.preventDefault();
    if (savingRef.current || !dirty) return;
    savingRef.current = true; setSaving(true); setMessage(''); setSaveError('');
    try {
      const result = await portalPost('updateMyProfile', draft);
      if (!mounted.current) return;
      setState(previous => ({ ...previous, data: { ...previous.data, profile: result.profile } }));
      setDraft(fields(result.profile));
      setMessage('Perfil atualizado com sucesso.');
      onProfileSaved?.(result.profile);
    } catch (error) {
      if (mounted.current) setSaveError(error.message || 'Não foi possível salvar. Tente novamente.');
    } finally { savingRef.current = false; if (mounted.current) setSaving(false); }
  }
  const profile = state.data?.profile;
  return <section className="mx-auto max-w-5xl space-y-5 pb-24 text-slate-100 md:pb-8" aria-labelledby="meu-cba-title">
    <button type="button" onClick={onBack} className={buttonClass}><ArrowLeft size={16} aria-hidden="true"/>Voltar ao Início</button>
    <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-5 sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Seu lugar no time</p>
      <h2 id="meu-cba-title" ref={heading} tabIndex={-1} className="mt-2 text-3xl font-black outline-none">Meu CBA</h2>
      <p className="mt-2 text-sm text-slate-400">Seu perfil, sua presença e sua evolução na quadra.</p>
    </header>
    {state.loading && <p role="status" className="p-6 text-center text-slate-300">Carregando seu perfil...</p>}
    {state.error && <div role="alert" className="rounded-2xl border border-rose-500/30 bg-slate-900 p-6"><p>{state.error}</p><button type="button" className={`${buttonClass} mt-4`} onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>}
    {profile && draft && <>
      <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-slate-700 bg-slate-900 p-5">
        <ProfileAvatar name={profile.name} photoUrl={profile.photoUrl}/>
        <div className="min-w-0 flex-1"><h3 className="break-words text-xl font-black">{profile.nickname || profile.name}</h3>{profile.nickname && <p className="break-words text-sm text-slate-400">{profile.name}</p>}<p className="mt-1 text-sm text-emerald-300">{profile.position || 'Posição não informada'} · Camisa {profile.jerseyNumber || '—'}</p></div>
      </div>
      <details className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
        <summary className="min-h-11 cursor-pointer text-base font-bold">Editar meu perfil</summary>
        <form onSubmit={save} className="mt-3 space-y-4">
          <fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">Apelido<input className={inputClass} maxLength={40} value={draft.nickname} onChange={event => setDraft({ ...draft, nickname: event.target.value })} autoComplete="nickname" /></label>
            <label className="text-sm font-bold">Posição<input className={inputClass} maxLength={60} placeholder="Ex.: Armador, Ala ou Pivô" value={draft.position} onChange={event => setDraft({ ...draft, position: event.target.value })} /></label>
            <label className="text-sm font-bold">Camisa preferida<input className={inputClass} inputMode="numeric" pattern="[0-9]{1,2}" maxLength={2} placeholder="0 a 99" value={draft.jerseyNumber} onChange={event => setDraft({ ...draft, jerseyNumber: event.target.value })} /></label>
            <label className="min-w-0 text-sm font-bold">Link da foto<input className={inputClass} type="url" maxLength={2048} placeholder="https://..." value={draft.photoUrl} onChange={event => setDraft({ ...draft, photoUrl: event.target.value })} /></label>
          </fieldset>
          <p className="flex items-start gap-2 text-xs leading-5 text-slate-400"><Camera size={16} className="shrink-0" aria-hidden="true"/>Use o link HTTPS de uma imagem. Para retirar a foto, apague o link e salve. O nome cadastrado permanece como referência nas súmulas.</p>
          <button disabled={saving || !dirty} type="submit" className={`${buttonClass} border-emerald-500 bg-emerald-500 text-slate-950`}><Save size={16} aria-hidden="true"/>{saving ? 'Salvando...' : 'Salvar perfil'}</button>
          {saveError && <p role="alert" className="text-sm text-rose-300">{saveError}</p>}
          {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
        </form>
      </details>
      <section className="rounded-3xl border border-slate-700 bg-slate-900 p-5" aria-labelledby="my-season-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="my-season-title" className="text-xl font-black">Minha temporada</h3><label className="text-xs font-bold">Temporada<select disabled={saving || dirty} className={`${inputClass} ml-2 w-auto`} value={year} onChange={event => setYear(event.target.value)}>{years.map(value => <option key={value}>{value}</option>)}</select></label></div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Pontos', athlete.totals.pts], ['Rebotes', athlete.totals.reb], ['Assistências', athlete.totals.ast], ['Tocos', athlete.totals.blk]].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-950 p-4"><p className="text-2xl font-black text-emerald-300">{athlete.statDates ? value : '—'}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>)}</div>
        <p className="mt-4 text-xs leading-5 text-slate-400">{athlete.statDates ? `${athlete.statDates} rodadas com súmula. Cada data pode reunir mais de uma partida.` : 'Nenhuma súmula registrada para você nesta temporada.'}</p>
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => setCardOpen(true)} className={buttonClass}><Share2 size={16} aria-hidden="true"/>Meu card da temporada</button><button type="button" onClick={onOpenAgenda} className={buttonClass}><CalendarDays size={16} aria-hidden="true"/>Minha agenda</button></div>
      </section>
      <section className="rounded-3xl border border-slate-700 bg-slate-900 p-5" aria-labelledby="my-attendance-title">
        <h3 id="my-attendance-title" className="flex items-center gap-2 text-xl font-black"><UserRound size={20} aria-hidden="true"/>Minha presença</h3>
        <p className="mt-4 text-3xl font-black text-emerald-300">{athlete.attendanceRate === null ? '—' : `${Math.round(athlete.attendanceRate)}%`}</p>
        <p className="mt-1 text-sm text-slate-400">{athlete.validDates ? `${athlete.presences} presenças em ${athlete.validDates} datas com registro válido.` : 'Sem registros de presença nesta temporada.'}</p>
        {!!state.data.attendance.length && <details className="mt-5"><summary className="min-h-11 cursor-pointer text-sm font-bold">Ver histórico de presença</summary><ul className="mt-2 max-h-64 divide-y divide-slate-700 overflow-y-auto pr-2">{[...state.data.attendance].reverse().map(row => <li key={row.attendance_date} className="flex justify-between gap-3 py-3 text-sm"><span>{formatDate(row.attendance_date)}</span><span className={row.status === 'present' ? 'text-emerald-300' : 'text-slate-400'}>{{ present: 'Presente', absent: 'Ausente', justified: 'Justificado', na: 'Não se aplica' }[row.status] || 'Não informado'}</span></li>)}</ul></details>}
      </section>
      {cardOpen && <Suspense fallback={<p role="status">Preparando card...</p>}><AthleteCardModal athlete={athlete} year={year} onClose={() => setCardOpen(false)} /></Suspense>}
    </>}
  </section>;
}
