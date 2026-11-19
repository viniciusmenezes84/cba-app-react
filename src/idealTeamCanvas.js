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

export function drawIdealTeamCard(canvas, team, photos = new Map()) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  canvas.width = CARD_WIDTH; canvas.height = CARD_HEIGHT;
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, '#22324b'); gradient.addColorStop(1, '#081521');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = gold; ctx.fillRect(0, 0, 12, CARD_HEIGHT);
  text(ctx, 'CBA', 76, 54, 62, ink);
  text(ctx, 'TIME IDEAL DA RODADA', 76, 132, 36, gold);
  ctx.textAlign = 'right'; text(ctx, formatDate(team.date), 1004, 77, 32, gold); ctx.textAlign = 'left';
  text(ctx, 'Quatro categorias • atletas distintos • marcas registradas', 76, 184, 22, muted);
  team.slots.forEach((slot, index) => {
    const x = index % 2 ? 556 : 76, y = index < 2 ? 242 : 722, width = 448;
    ctx.fillStyle = '#16283e'; ctx.fillRect(x, y, width, 456);
    ctx.strokeStyle = '#73603a'; ctx.lineWidth = 2; ctx.strokeRect(x, y, width, 456);
    text(ctx, `${slot.short} / ${slot.label.toUpperCase()}`, x + 20, y + 18, 21, gold);
    if (!slot.athlete) {
      text(ctx, 'SEM DESTAQUE', x + 24, y + 138, 31, muted);
      lines(ctx, slot.reason, x + 24, y + 226, width - 48, 24);
      return;
    }
    crown(ctx, x + width / 2, y + 57);
    portrait(ctx, slot.athlete, photos.get(slot.athlete.id), x + width / 2, y + 104);
    ctx.textAlign = 'center';
    text(ctx, slot.athlete.name, x + width / 2, y + 256, 32, ink, width - 40);
    text(ctx, `${slot.value} ${slot.short}`, x + width / 2, y + 303, 54, gold, width - 40);
    ctx.textAlign = 'left';
    idealTeamNotes(slot).forEach((note, line) => text(ctx, note, x + 20, y + 370 + line * 24, 20, muted, width - 40));
  });
  text(ctx, 'Súmula consolidada por data; pode reunir várias partidas.', 76, 1220, 23, muted);
  text(ctx, 'Colocação calculada antes de evitar repetições.', 76, 1260, 22, muted);
  text(ctx, 'PORTAL CBA / BASQUETE', 76, 1310, 20, gold);
}

export function drawIdealTeamStory(canvas, team, photos = new Map()) {
  const post = document.createElement('canvas');
  drawIdealTeamCard(post, team, photos);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  canvas.width = CARD_WIDTH; canvas.height = STORY_HEIGHT;
  ctx.fillStyle = '#0a1728'; ctx.fillRect(0, 0, CARD_WIDTH, STORY_HEIGHT);
  text(ctx, 'CBA / TIME IDEAL', 76, 128, 50, gold);
  text(ctx, `Rodada de ${formatDate(team.date)}`, 76, 203, 30, muted);
  ctx.drawImage(post, 0, 290, CARD_WIDTH, CARD_HEIGHT);
  text(ctx, 'QUATRO DESTAQUES DA NOSSA RODADA', 76, 1710, 35, gold);
  text(ctx, 'Seleção sem repetir atletas • números reais da súmula', 76, 1773, 25, muted);
}
