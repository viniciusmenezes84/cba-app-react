import React, { useMemo } from 'react';
import AthleteCardModal from './AthleteCardModal';
import { formatDate } from './athleteDashboardData';
import { idealTeamCaption } from './idealTeamData';
import { drawIdealTeamCard, drawIdealTeamStory } from './idealTeamCanvas';

export default function IdealTeamCardModal({ team, onClose }) {
  const collective = useMemo(() => ({
    title: `Time ideal da rodada de ${formatDate(team.date)}`,
    label: `Time ideal · ${formatDate(team.date)}`,
    filename: `cba-time-ideal-${team.date}`,
    caption: idealTeamCaption(team),
    photos: team.slots.filter(slot => slot.athlete).map(slot => ({ id: slot.athlete.id, url: slot.athlete.photoUrl })),
    draw: (canvas, format, photos) => (format === 'story' ? drawIdealTeamStory : drawIdealTeamCard)(canvas, team, photos)
  }), [team]);
  return <AthleteCardModal collective={collective} onClose={onClose}/>;
}
