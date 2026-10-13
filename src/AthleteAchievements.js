import React from 'react';
import { Award, Check, Target } from 'lucide-react';
import { achievementRemaining } from './athleteAchievementRules';

function Progress({ item }) {
  return <div role="progressbar" aria-label={item.title} aria-valuemin={0} aria-valuemax={item.target} aria-valuenow={Math.min(item.value, item.target)} aria-valuetext={`${item.value} de ${item.target} ${item.plural}`} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${item.progress}%` }} />
  </div>;
}

export default function AthleteAchievements({ achievements, year, onOpenCard }) {
  const { items, earned, next, featured } = achievements;
  return <section aria-labelledby="my-achievements-title" className="rounded-3xl border border-amber-400/20 bg-slate-900 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 id="my-achievements-title" className="flex items-center gap-2 text-xl font-black"><Award size={22} className="shrink-0 text-amber-300" aria-hidden="true" />Minhas conquistas</h3>
      <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">{earned.length} de {items.length} · {year}</span>
    </div>
    <p className="mt-2 text-sm leading-6 text-slate-400">Cada presença e cada jogada contam. Acompanhe suas conquistas nesta temporada.</p>
    <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
      <div className="min-w-0 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-200">{featured ? 'Conquista em destaque' : 'Sua jornada começa aqui'}</p>
        <p className="mt-2 break-words text-lg font-black">{featured?.title || 'Vamos para a quadra?'}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{featured ? featured.description : 'As conquistas aparecem quando suas presenças e súmulas são registradas.'}</p>
        {featured && <button type="button" onClick={onOpenCard} className="mt-3 min-h-11 rounded-xl border border-amber-400/40 px-3 py-2 text-sm font-bold text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">Ver conquista no meu card</button>}
      </div>
      <div className="min-w-0 rounded-2xl bg-slate-950 p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300"><Target size={16} aria-hidden="true" />{next ? 'Próximo objetivo' : 'Temporada completa'}</p>
        <p className="mt-2 break-words text-lg font-black">{next?.title || 'Todas as conquistas alcançadas!'}</p>
        {next ? <><p className="mt-2 text-sm text-slate-300">{achievementRemaining(next)} para chegar lá.</p><Progress item={next} /><p className="mt-2 text-xs text-slate-400">{next.value} / {next.target} {next.plural}{!next.hasRecords && ` · Aguardando ${next.metric === 'presences' ? 'registros de presença' : 'súmulas'}`}</p></> : <p className="mt-2 text-sm leading-6 text-slate-300">Você completou os seis objetivos desta temporada. Leve esse reconhecimento no seu card.</p>}
      </div>
    </div>
    <details className="mt-4">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold text-slate-200">Ver todas as conquistas e regras</summary>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {items.map(item => <li key={item.id} className="min-w-0 rounded-2xl border border-slate-700 p-4">
          <div className="flex items-start justify-between gap-2"><h4 className="font-bold">{item.title}</h4>{item.earned && <Check size={18} className="shrink-0 text-amber-300" aria-hidden="true" />}</div>
          <p className={`mt-1 text-xs font-bold ${item.earned ? 'text-amber-200' : 'text-slate-400'}`}>{item.earned ? 'Conquistada' : 'Em progresso'}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
          <Progress item={item} />
          <p className="mt-2 text-xs text-slate-300">{item.value} / {item.target} {item.plural}{!item.earned && ` · ${achievementRemaining(item)}`}</p>
        </li>)}
      </ul>
      <p className="mt-4 text-xs leading-5 text-slate-400">Somente presenças confirmadas contam. Pontos, rebotes e assistências vêm das súmulas da temporada selecionada. Ao carregar os dados, correções nos registros também atualizam as conquistas. O destaque do card prioriza os marcos de presença mais altos, depois assistências, rebotes e pontos.</p>
    </details>
  </section>;
}
