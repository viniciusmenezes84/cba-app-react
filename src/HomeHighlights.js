import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, Award, BarChart3, CalendarDays, Crown, Flame, Medal, Shield, Sparkles, Target, TrendingUp, Trophy, Users, Zap } from 'lucide-react';
import { ProfileAvatar } from './MeuCba';
import { adminPost } from './cbaApi';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import { availableHighlightYears, buildHomeHighlights, roundDateLabel, STAT_KEYS, STAT_LABELS, efficiencyIndex, buildRankHistory } from './homeHighlightsData';

const todayBahia = () => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
const show = n => Number(n || 0).toLocaleString('pt-BR');
const EMPTY = 'Aguardando as primeiras estatísticas da temporada.';
const LABELS = {
  pts: { headline:'Cestinha',short:'PTS',Icon:Target,color:'text-amber-300',shade:'from-orange-500/20 to-amber-500/5' },
  reb: { headline:'Rebotes',short:'REB',Icon:Trophy,color:'text-emerald-300',shade:'from-emerald-500/20 to-emerald-500/5' },
  ast: { headline:'Assistências',short:'AST',Icon:Zap,color:'text-cyan-300',shade:'from-cyan-500/20 to-cyan-500/5' },
  blk: { headline:'Destaque defensivo',short:'TOC',Icon:Shield,color:'text-violet-300',shade:'from-violet-500/20 to-violet-500/5' },
  pts3: { headline:'Bolas de três',short:'3PT',Icon:Flame,color:'text-pink-300',shade:'from-pink-500/20 to-pink-500/5' }
};
const Frame = ({ children, className = '' }) => <div className={'min-w-0 rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-lg sm:p-5 ' + className}>{children}</div>;
function Athlete({ player, size = 'h-14 w-14' }) {
  return <div className="flex min-w-0 items-center gap-3">
    <ProfileAvatar name={player?.name} photoUrl={player?.photoUrl} className={size} />
    <span title={player?.name} className="min-w-0 truncate text-sm font-black text-white sm:text-base">{player?.name || 'Sem dados'}</span>
  </div>;
}
function StatCard({ label, athlete, metric, value }) {
  const cfg = LABELS[metric];
  return <div className={'min-w-0 rounded-2xl border border-white/10 bg-gradient-to-br p-4 ' + cfg.shade}>
    <div className="flex items-center justify-between gap-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">{label || cfg.headline}</p>
      <cfg.Icon className={'h-5 w-5 shrink-0 ' + cfg.color} aria-hidden="true"/>
    </div>
    {athlete ? <><div className="mt-4"><Athlete player={athlete}/></div>
      <div className="mt-4 flex items-baseline gap-2"><strong className={'text-3xl font-black tabular-nums ' + cfg.color}>{show(value)}</strong><span className="text-xs font-bold text-slate-400">{cfg.short}</span></div>
    </> : <p className="mt-4 min-h-16 text-xs text-slate-400">{EMPTY}</p>}
  </div>;
}
function Bars({ rows, metric = 'pts', attendance = false }) {
  const last = rows.slice(-8);
  const max = Math.max(1, ...last.map(r => attendance ? r.count : r[metric]));
  if (!last.length) return <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400">Sem rodadas registradas para exibir o gráfico.</p>;
  return <div role="img" aria-label={attendance ? 'Atletas presentes por data' : 'Estatística do atleta por rodada'}
    className="flex h-40 items-end justify-between gap-2 pt-3">
    {last.map(r => {
      const value = attendance ? r.count : r[metric];
      return <div key={r.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
        <span className="text-[10px] font-black tabular-nums text-slate-300">{show(value)}</span>
        <div className="flex h-24 w-full max-w-12 items-end overflow-hidden rounded-t-lg bg-white/5">
          <span className={'w-full rounded-t-md ' + (attendance ? 'bg-emerald-400' : 'bg-amber-400')} style={{ height: (value ? Math.max(8,value / max * 100) : 3) + '%' }}/>
        </div>
        <span title={roundDateLabel(r.date)} className="truncate text-center text-[9px] font-bold text-slate-400">{r.date.slice(5).replace('-', '/')}</span>
      </div>;
    })}
  </div>;
}
function PositionBars({ rows }) {
  const recent = rows.slice(-8);
  const placed = recent.map(r => r.position).filter(v => v !== null);
  const last = Math.max(1,...placed);
  if (!placed.length) return <p className="p-4 text-sm text-slate-400">Sem posição acumulada nesta métrica.</p>;
  return <div role="img" aria-label="Posição no ranking acumulado por rodada" className="flex h-40 items-end justify-between gap-2 pt-3">
    {recent.map(r => <div key={r.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
      <span className="text-[10px] font-black text-cyan-300">{r.position ? r.position + 'º' : '—'}</span>
      <div className="flex h-24 w-full max-w-12 items-end overflow-hidden rounded-t-lg bg-white/5">
        <span className="w-full rounded-t-md bg-cyan-400" style={{height:(r.position ? Math.max(12,(last+1-r.position)/last*100) : 3)+'%'}}/>
      </div>
      <span title={roundDateLabel(r.date)} className="text-center text-[9px] text-slate-400">{r.date.slice(5).replace('-','/')}</span>
    </div>)}
  </div>;
}
export default function HomeHighlights({ initialData, portalData, onNavigate, isAdmin = false }) {
  const today = todayBahia();
  const active = initialData?.data || initialData || {};
  const players = active.dashboard?.players || portalData?.dashboard?.players || [];
  const photos = (portalData?.athletes || []).map(p => [p.name,p.photoUrl]);
  const enriched = useMemo(() => {
    const byName = new Map(photos);
    return players.map(p => ({ ...p,photoUrl:p.fotoUrl || p.photoUrl || byName.get(p.name) || '' }));
  }, [players, portalData]);
  const years = useMemo(() => availableHighlightYears(enriched,today), [enriched,today]);
  const [year,setYear] = useState(today.slice(0,4));
  const [metric,setMetric] = useState('pts');
  const [selectedName,setSelectedName] = useState('');
  const [trendMode,setTrendMode] = useState('stats');
  const [pdfBusy,setPdfBusy] = useState(false);
  const [pdfError,setPdfError] = useState('');
  const [pdfReady,setPdfReady] = useState(null);
  useEffect(() => () => { if (pdfReady?.url) URL.revokeObjectURL(pdfReady.url); }, [pdfReady?.url]);
  useEffect(() => { if (!years.includes(year)) setYear(years[0]); }, [years,year]);
  const matches = portalData?.roundMatches || active.roundMatches || [];
  const summary = useMemo(() => buildHomeHighlights(enriched,year,matches,today), [enriched,year,matches,today]);
  const leader = summary.roundLeaders.pts;
  const standout = summary.standout;
  const seasonLeader = summary.seasonLeaders.pts;
  const trendPlayer = summary.athletes.find(p => p.name === selectedName) ||
    seasonLeader || summary.athletes.find(p => p.entries.length);
  const ranking = summary.rankings[metric] || [];
  const rankHistory = useMemo(() => buildRankHistory(summary,trendPlayer?.name,metric), [summary,trendPlayer?.name,metric]);
  const seasonCards = STAT_KEYS.map(key => ({key, athlete:summary.seasonLeaders[key]}));
  const presenceLeader = summary.presenceTop[0];
  const generatePdf = async () => {
    if (!isAdmin || pdfBusy || !summary.hasStats) return;
    setPdfBusy(true);
    setPdfError('');
    setPdfReady(null);
    try {
      // This action verifies the current session's ADMIN role on the server
      // and registers each issuance in the audit trail.
      await adminPost('authorizeSportsReport', { year, latestDate:summary.latestDate });
      const { buildSportsExecutivePdf } = await import('./HomeHighlightsPdf');
      const doc = buildSportsExecutivePdf(summary);
      const fileName = 'CBA_Relatorio_Executivo_Esportivo_' + year + '.pdf';
      const url = URL.createObjectURL(doc.output('blob'));
      setPdfReady({url,fileName});
    } catch (error) {
      setPdfError(error?.message || 'Não foi possível emitir o relatório. Tente novamente.');
    } finally {
      setPdfBusy(false);
    }
  };
  return <section aria-labelledby="cba-sports-title" className="space-y-4 pb-3">
    <header className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/60 p-5 shadow-2xl sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-300"><Sparkles className="h-4 w-4"/> CBA Sports Center</p>
          <h2 id="cba-sports-title" className="mt-2 text-2xl font-black text-white sm:text-3xl">O jogo em <span className="text-emerald-300">destaque.</span></h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">Os protagonistas da rodada, líderes da temporada e marcas que fazem a história do CBA.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <label className="w-full shrink-0 text-xs font-black text-slate-300 sm:w-40">Temporada
            <select aria-label="Temporada dos destaques" value={year} onChange={e => { setYear(e.target.value); setPdfReady(null); setPdfError(''); }} className="mt-2 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-base font-black text-white">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          {isAdmin && <button type="button" onClick={generatePdf} disabled={pdfBusy || !summary.hasStats}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white shadow-md transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            title={!summary.hasStats ? 'Aguarde as primeiras estatísticas da temporada.' : 'Emitir relatório esportivo exclusivo do ADM'}>
            {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/> : <FileText className="h-4 w-4" aria-hidden="true"/>}
            {pdfBusy ? 'Preparando relatório...' : 'Relatório executivo PDF'}
          </button>}
        </div>
      </div>
      {isAdmin && pdfError && <p role="alert" className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm font-bold text-rose-200">{pdfError}</p>}
      {isAdmin && pdfReady && <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3">
        <span className="min-w-0 flex-1 text-xs font-bold text-emerald-200">Relatório {year} pronto para consultar.</span>
        <a href={pdfReady.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/40 px-3 text-xs font-black text-emerald-200">Visualizar PDF</a>
        <a href={pdfReady.url} download={pdfReady.fileName} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-3 text-xs font-black text-slate-950"><FileDown className="h-4 w-4"/> Baixar PDF</a>
      </div>}
      <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-slate-300">
        <span className="rounded-full bg-white/10 px-3 py-1.5">{summary.rounds.length} rodadas com súmula</span>
        <span className="rounded-full bg-white/10 px-3 py-1.5">{summary.athletes.length} atletas cadastrados</span>
        <span className="rounded-full bg-white/10 px-3 py-1.5">Dados do portal CBA</span>
      </div>
    </header>
    {!players.length && <p role="status" className="rounded-xl border border-dashed border-slate-600 p-4 text-sm text-slate-400">
      Carregando estatísticas. Os destaques aparecerão quando os dados estiverem disponíveis.
    </p>}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-lg font-black text-white"><CalendarDays className="h-5 w-5 text-emerald-400"/> Destaques da rodada</h3>
      <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">{summary.latestDate ? roundDateLabel(summary.latestDate) : 'Sem súmula'}</span>
    </div>
    <div className="grid gap-3 lg:grid-cols-3">
      <Frame className="relative overflow-hidden border-amber-400/20 bg-gradient-to-br from-amber-900/30 via-slate-900 to-slate-950 lg:col-span-2">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-300"><Crown className="h-5 w-5"/> Cestinha da rodada</p>
        {leader ? <div className="mt-5 flex flex-wrap items-center gap-5">
          <ProfileAvatar name={leader.name} photoUrl={leader.photoUrl} className="h-24 w-24 sm:h-32 sm:w-32"/>
          <div className="min-w-0 flex-1">
            <h4 className="break-words text-2xl font-black text-white sm:text-3xl">{leader.name}</h4>
            <p className="mt-1 text-xs text-slate-400">Maior pontuação da última rodada com súmula</p>
            <p className="mt-3 text-5xl font-black tabular-nums text-amber-300">{show(leader.stats.pts)} <span className="text-sm text-slate-400">PTS</span></p>
            <button type="button" onClick={() => onNavigate('relatorios')} className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/40 px-4 text-sm font-black text-amber-200">Ver súmula <ArrowRight className="h-4 w-4"/></button>
          </div>
        </div> : <p className="mt-5 text-sm text-slate-400">{EMPTY}</p>}
      </Frame>
      <Frame className="border-emerald-400/20 bg-gradient-to-br from-emerald-950/70 to-slate-900">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300"><Award className="h-5 w-5"/> Destaque geral da rodada</p>
        {standout ? <><div className="mt-5"><Athlete player={standout} size="h-20 w-20"/></div>
          <p className="mt-5 text-4xl font-black text-white">{show(efficiencyIndex(standout.stats))} <span className="text-xs text-emerald-300">ÍNDICE</span></p>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">Índice informativo = pontos + rebotes + assistências + tocos. Não representa o MVP oficial.</p>
        </> : <p className="mt-5 text-sm text-slate-400">{EMPTY}</p>}
      </Frame>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {['reb','ast','blk'].map(key => <StatCard key={key} metric={key} athlete={summary.roundLeaders[key]} value={summary.roundLeaders[key]?.stats[key]}/>)}
    </div>
    <div className="flex items-center justify-between gap-2 pt-3">
      <h3 className="flex items-center gap-2 text-lg font-black text-white"><Medal className="h-5 w-5 text-amber-300"/> Líderes da temporada</h3>
      <span className="text-xs font-black text-slate-400">{year}</span>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {seasonCards.map(item => <StatCard key={item.key} label={STAT_LABELS[item.key] + ' · Temporada'} metric={item.key}
        athlete={item.athlete} value={item.athlete?.totals[item.key]}/>)}
      <Frame>
        <p className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-emerald-300">Assiduidade <Users className="h-5 w-5"/></p>
        {presenceLeader ? <><div className="mt-4"><Athlete player={presenceLeader}/></div>
          <p className="mt-4 text-3xl font-black text-emerald-300">{presenceLeader.presences} <span className="text-xs text-slate-400">presenças</span></p>
          <p className="mt-1 text-xs text-slate-400">{presenceLeader.attendanceRate?.toFixed(0)}% de {presenceLeader.validDates} datas válidas</p>
        </> : <p className="mt-4 text-xs text-slate-400">Sem presenças registradas nesta temporada.</p>}
      </Frame>
    </div>
    <div className="grid gap-4 xl:grid-cols-5">
      <Frame className="xl:col-span-3">
        <h3 className="flex items-center gap-2 text-base font-black text-white"><BarChart3 className="h-5 w-5 text-amber-300"/> Ranking acumulado</h3>
        <div role="group" aria-label="Métrica do ranking" className="mt-3 flex flex-wrap gap-1">
          {STAT_KEYS.map(key => <button type="button" key={key} aria-pressed={metric === key} onClick={() => setMetric(key)}
            className={'min-h-9 rounded-lg px-3 text-xs font-black ' + (metric === key ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300')}>{LABELS[key].short}</button>)}
        </div>
        <p className="mt-3 text-xs text-slate-400">Top 5 · {STAT_LABELS[metric]} · {year}</p>
        <div className="mt-4 space-y-2">{ranking.length ? ranking.slice(0,5).map((p,i) => <div key={p.name} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <span className="w-6 text-center font-black text-amber-300">{i+1}º</span>
          <div className="min-w-0 flex-1"><Athlete player={p} size="h-10 w-10"/></div>
          <strong className="shrink-0 text-lg font-black text-white">{show(p.totals[metric])}</strong>
        </div>) : <p className="text-sm text-slate-400">{EMPTY}</p>}</div>
        <button type="button" onClick={() => onNavigate('relatorios')} className="mt-4 flex min-h-11 items-center gap-2 text-sm font-black text-emerald-300">Abrir rankings completos <ArrowRight className="h-4 w-4"/></button>
      </Frame>
      <Frame className="xl:col-span-2">
        <h3 className="flex items-center gap-2 text-base font-black text-white"><TrendingUp className="h-5 w-5 text-cyan-300"/> Evolução por rodada</h3>
        <p className="mt-1 text-xs text-slate-400">Últimas oito súmulas</p>
        <label className="mt-3 block text-xs font-bold text-slate-300">Atleta
          <select aria-label="Atleta da evolução" value={trendPlayer?.name || ''} onChange={e => setSelectedName(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-sm text-white">
            {!trendPlayer && <option value="">Sem atleta</option>}
            {summary.athletes.filter(p => p.entries.length).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </label>
        <div role="group" aria-label="Tipo de evolução" className="mt-3 flex flex-wrap gap-2">
          {[['stats','Produção'],['position','Posição acumulada']].map(([key,label]) =>
            <button key={key} type="button" aria-pressed={trendMode === key} onClick={() => setTrendMode(key)}
              className={'min-h-9 rounded-lg px-3 text-xs font-black ' + (trendMode === key ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300')}>{label}</button>)}
        </div>
        <p className="mt-3 text-xs font-bold text-cyan-300">{trendMode === 'stats' ? STAT_LABELS[metric] + ' por rodada' : 'Colocação no ranking de ' + STAT_LABELS[metric]}</p>
        {trendMode === 'stats' ? <Bars rows={trendPlayer?.entries || []} metric={metric}/> : <PositionBars rows={rankHistory}/>}
        <button type="button" onClick={() => onNavigate('atleta')} className="mt-3 flex min-h-11 items-center gap-2 text-xs font-black text-cyan-300">Desempenho completo <ArrowRight className="h-4 w-4"/></button>
      </Frame>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Frame>
        <h3 className="flex items-center gap-2 text-base font-black text-white"><Activity className="h-5 w-5 text-emerald-300"/> Presença por rodada</h3>
        <p className="mt-1 text-xs text-slate-400">Quantidade de atletas presentes nas últimas oito datas</p>
        <div className="mt-3"><Bars rows={summary.presenceDates} attendance/></div>
        {summary.bestStreakLeader && <div className="mt-4 border-t border-white/10 pt-3">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-300">Melhor sequência de presenças</p>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1"><Athlete player={summary.bestStreakLeader} size="h-10 w-10"/></div>
            <strong className="shrink-0 text-lg font-black text-white">{summary.bestStreakLeader.bestStreak} <span className="text-xs text-slate-400">seguidas</span></strong>
          </div>
        </div>}
      </Frame>
      <Frame>
        <h3 className="flex items-center gap-2 text-base font-black text-white"><Flame className="h-5 w-5 text-orange-300"/> Recordes da temporada</h3>
        <p className="mt-1 text-xs text-slate-400">Melhores marcas por rodada</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {summary.roundRecords.filter(r => r.key !== 'pts3').map(r => <div key={r.key} className="min-w-0 rounded-xl bg-white/5 p-3">
            <div className="flex justify-between gap-2"><span className="text-xs text-slate-400">{STAT_LABELS[r.key]}</span><strong className="text-lg font-black text-white">{r.value ?? '—'}</strong></div>
            <p title={r.name} className="truncate text-xs font-black text-emerald-300">{r.name || 'Aguardando súmula'}</p>
            <p className="mt-1 text-[10px] text-slate-500">{roundDateLabel(r.date)}</p>
          </div>)}
        </div>
        {summary.gameRecords.some(r => r.value !== null) ? <details className="mt-3 border-t border-white/10 pt-3">
          <summary className="cursor-pointer text-xs font-black text-amber-300">Ver recordes por partida</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{summary.gameRecords.filter(r => r.key !== 'pts3').map(r => <div key={r.key} className="rounded-xl bg-white/5 p-3">
            <p className="text-xs text-slate-400">{STAT_LABELS[r.key]}</p>
            <p className="text-sm font-black text-white">{r.value ?? '—'} · {r.name || 'Sem dados'}</p>
            <p className="text-[10px] text-slate-500">{r.date ? roundDateLabel(r.date) + ' · Jogo ' + r.gameNumber : 'Sem partida registrada'}</p>
          </div>)}</div>
        </details> : <p className="mt-3 text-xs text-slate-500">Recordes por partida surgirão conforme novos jogos forem individualmente registrados.</p>}
      </Frame>
    </div>
    <p className="flex items-start gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-[11px] leading-relaxed text-slate-400">
      <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"/>
      As súmulas históricas anteriores ao registro por partida são totais de cada data. As médias, rankings e recordes por rodada respeitam essa classificação. O CBA ainda não registra tentativas de arremesso para medir aproveitamento real.
    </p>
  </section>;
}
