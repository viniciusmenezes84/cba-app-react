import React, { lazy, Suspense, useState } from 'react';
import { Crown, Share2 } from 'lucide-react';
import { formatDate } from './athleteDashboardData';
import { idealTeamNotes } from './idealTeamData';
const IdealTeamCardModal = lazy(() => import('./IdealTeamCardModal'));

function HighlightPhoto({ athlete }) {
  const [failed, setFailed] = useState(false);
  return athlete.photoUrl && !failed ? <img src={athlete.photoUrl} alt={`Foto de ${athlete.name}`} referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
    : <span aria-hidden="true">{athlete.name[0]?.toUpperCase()}</span>;
}

export default function IdealTeam({ team, year }) {
  const [open, setOpen] = useState(false);
  return <section className="cba-ideal-team" aria-labelledby="ideal-team-title">
    <div className="cba-ideal-team__heading"><div><span className="cba-player__eyebrow">Cinco atletas · destaques da rodada</span><h2 id="ideal-team-title">Quinteto ideal da rodada</h2></div>
      {team && <time dateTime={team.date}>{formatDate(team.date)}</time>}
    </div>
    {team ? <>
      <div className="cba-ideal-team__grid">{team.slots.map(slot => <article className="cba-ideal-team__slot" key={slot.key} aria-label={slot.label}>
        <span className="cba-ideal-team__category">{slot.short} <span>· {slot.label}</span></span>
        {slot.athlete ? <>
          <Crown className="cba-ideal-team__crown" size={30} aria-hidden="true"/>
          <div className="cba-ideal-team__photo"><HighlightPhoto key={`${slot.athlete.id}-${slot.athlete.photoUrl}`} athlete={slot.athlete}/></div>
          <strong className="cba-ideal-team__name">{slot.athlete.name}</strong><span className="cba-ideal-team__value">{slot.value} <small>{slot.short}</small></span>
        </> : <div className="cba-ideal-team__vacant" aria-hidden="true">—</div>}
        <p className="cba-ideal-team__note">{idealTeamNotes(slot).join(' · ')}</p>
      </article>)}</div>
      <div className="cba-ideal-team__footer"><p>Totais consolidados por data; uma rodada pode reunir várias partidas.</p><button type="button" onClick={() => setOpen(true)}><Share2 size={17} aria-hidden="true"/>Compartilhar quinteto ideal</button></div>
      {open && <Suspense fallback={<p role="status">Preparando time ideal...</p>}><IdealTeamCardModal team={team} onClose={() => setOpen(false)}/></Suspense>}
    </> : <p className="cba-ideal-team__empty">Nenhuma rodada com súmula registrada em {year}. Presença sem estatísticas não gera destaques.</p>}
  </section>;
}
