import { CARD_WIDTH, CARD_HEIGHT, STORY_HEIGHT } from './athleteCardCanvas';
import { formatDate } from './athleteDashboardData';
import { idealTeamNotes } from './idealTeamData';

const gold = '#f6cf70', ink = '#f8fafc', muted = '#b9c8db';
const text = (ctx, value, x, y, size, color = ink, maxWidth) => {
  ctx.fillStyle = color; ctx.font = `800 ${size}px Inter, system-ui, sans-serif`; ctx.textBaseline = 'top';
  if (maxWidth) ctx.fillText(String(value), x, y, maxWidth); else ctx.fillText(String(value), x, y);
};
function crown(ctx, x, y) {
  ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.lineTo(x - 18, y + 32);
  ctx.lineTo(x + 18, y + 32); ctx.lineTo(x + 28, y); ctx.lineTo(x + 10, y + 13);
  ctx.lineTo(x, y - 8); ctx.lineTo(x - 10, y + 13); ctx.closePath();
  ctx.fillStyle = gold; ctx.fill();
  ctx.fillRect(x - 18, y + 37, 36, 5);
}
function lines(ctx, content, x, y, width, size = 20) {
  ctx.font = `800 ${size}px Inter, system-ui, sans-serif`;
  let line = '', offset = 0;
  for (const word of content.split(/\s+/)) {
    if (line && ctx.measureText(`${line} ${word}`).width > width) {
      text(ctx, line, x, y + offset, size, muted); offset += size + 7; line = word;
    } else line += `${line ? ' ' : ''}${word}`;
  }
  if (line) text(ctx, line, x, y + offset, size, muted);
}
function portrait(ctx, athlete, photo, center, top) {
  const size = 136;
  ctx.save(); ctx.beginPath(); ctx.arc(center, top + size / 2, size / 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#344962'; ctx.fillRect(center - size / 2, top, size, size);
  if (photo?.naturalWidth && photo?.naturalHeight) {
    const scale = Math.max(size / photo.naturalWidth, size / photo.naturalHeight);
    const width = photo.naturalWidth * scale, height = photo.naturalHeight * scale;
    ctx.drawImage(photo, center - width / 2, top + (size - height) / 2, width, height);
  } else {
    ctx.textAlign = 'center'; text(ctx, athlete.name[0]?.toUpperCase() || '', center, top + 28, 70, gold); ctx.textAlign = 'left';
  }
  ctx.restore();
}

// Card 1080x1350: três destaques em cima e dois na segunda linha.
export function drawIdealTeamCard(canvas, team, photos = new Map()) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  canvas.width = CARD_WIDTH; canvas.height = CARD_HEIGHT;
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, '#22324b'); gradient.addColorStop(1, '#081521');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = '#fb923c'; ctx.fillRect(0, 0, 12, CARD_HEIGHT);
  text(ctx, 'CBA', 70, 47, 61);
  text(ctx, 'QUINTETO IDEAL DA RODADA', 70, 127, 36, gold);
  ctx.textAlign = 'right'; text(ctx, formatDate(team.date), 1003, 69, 32, gold); ctx.textAlign = 'left';
  text(ctx, 'Cinco atletas distintos • quatro fundamentos + eficiência', 70, 183, 21, muted);

  const layouts = team.slots.map((slot, index) => ({
    slot,
    x: index < 3 ? 70 + index * 319 : 70 + (index - 3) * 479,
    y: index < 3 ? 235 : 710,
    width: index < 3 ? 301 : 461,
    height: 449
  }));

  layouts.forEach(({ slot, x, y, width, height }, index) => {
    ctx.fillStyle = index === 4 ? '#23324a' : '#16283e';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = index === 4 ? '#fb923c' : '#73603a';
    ctx.lineWidth = 2; ctx.strokeRect(x, y, width, height);
    text(ctx, `${slot.short} / ${slot.label.toUpperCase()}`, x + 15, y + 17, 19, gold, width - 30);
    if (!slot.athlete) {
      text(ctx, 'SEM DESTAQUE', x + 18, y + 128, 28, muted, width - 36);
      lines(ctx, slot.reason, x + 18, y + 205, width - 36, 20);
      return;
    }
    crown(ctx, x + width / 2, y + 63);
    portrait(ctx, slot.athlete, photos.get(slot.athlete.id), x + width / 2, y + 109);
    ctx.textAlign = 'center';
    text(ctx, slot.athlete.name, x + width / 2, y + 260, 30, ink, width - 27);
    text(ctx, `${slot.value} ${slot.short}`, x + width / 2, y + 312, 43, gold, width - 24);
    ctx.textAlign = 'left';
    idealTeamNotes(slot).slice(0, 3).forEach((note, line) =>
      text(ctx, note, x + 14, y + 372 + line * 23, 17, muted, width - 28));
  });
  text(ctx, 'Totais consolidados por rodada; uma data pode reunir várias partidas.', 70, 1204, 21, muted);
  text(ctx, 'IE-CBA = PTS + REB + AST + TOC (índice simplificado).', 70, 1244, 21, muted);
  text(ctx, 'PORTAL CBA / BASQUETE', 70, 1300, 20, gold);
}

export function drawIdealTeamStory(canvas, team, photos = new Map()) {
  const post = document.createElement('canvas');
  drawIdealTeamCard(post, team, photos);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  canvas.width = CARD_WIDTH; canvas.height = STORY_HEIGHT;
  ctx.fillStyle = '#0a1728'; ctx.fillRect(0, 0, CARD_WIDTH, STORY_HEIGHT);
  text(ctx, 'CBA / QUINTETO IDEAL', 76, 128, 50, gold);
  text(ctx, `Rodada de ${formatDate(team.date)}`, 76, 203, 30, muted);
  ctx.drawImage(post, 0, 290, CARD_WIDTH, CARD_HEIGHT);
  text(ctx, 'CINCO DESTAQUES DA NOSSA RODADA', 76, 1710, 35, gold);
  text(ctx, 'Destaques estatísticos • sem repetir atletas', 76, 1773, 25, muted);
}
