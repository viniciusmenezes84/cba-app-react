export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const INK = '#f7fafc';
const MUTED = '#a8b8c9';
const ORANGE = '#ff994d';

const formatAverage = value => new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1, maximumFractionDigits: 1
}).format(value);

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawText(ctx, text, x, y, size, color = INK, weight = 700) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(String(text), x, y);
}

function nameLines(ctx, name, maxWidth, maxLines) {
  const words = String(name || 'ATLETA DO CBA').trim().toUpperCase().split(/\s+/);
  for (let size = 76; size >= 38; size -= 2) {
    ctx.font = `900 ${size}px Inter, system-ui, sans-serif`;
    const lines = [];
    for (const word of words) {
      const current = lines[lines.length - 1];
      if (current && ctx.measureText(`${current} ${word}`).width <= maxWidth) {
        lines[lines.length - 1] = `${current} ${word}`;
      } else {
        lines.push(word);
      }
    }
    if (lines.length <= maxLines && lines.every(line => ctx.measureText(line).width <= maxWidth)) {
      return { lines, size };
    }
  }
  return { lines: [String(name || 'ATLETA DO CBA').toUpperCase()], size: 38 };
}

function drawPhoto(ctx, photo, athlete) {
  const x = 594, y = 201, width = 410, height = 526;
  ctx.save();
  roundedRect(ctx, x, y, width, height, 28);
  ctx.clip();
  const background = ctx.createLinearGradient(x, y, x + width, y + height);
  background.addColorStop(0, '#344c62');
  background.addColorStop(1, '#14243a');
  ctx.fillStyle = background;
  ctx.fillRect(x, y, width, height);
  if (photo?.naturalWidth && photo?.naturalHeight) {
    const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight);
    const drawWidth = photo.naturalWidth * scale;
    const drawHeight = photo.naturalHeight * scale;
    ctx.drawImage(photo, x + (width - drawWidth) / 2, y + (height - drawHeight) * 0.28, drawWidth, drawHeight);
  } else {
    const initial = String(athlete.name || 'C').trim().charAt(0).toUpperCase();
    ctx.textAlign = 'center';
    drawText(ctx, initial, x + width / 2, y + 136, 224, '#f6af72', 900);
    ctx.textAlign = 'left';
  }
  const shade = ctx.createLinearGradient(0, y + 200, 0, y + height);
  shade.addColorStop(0, 'rgba(7, 19, 33, 0)');
  shade.addColorStop(1, 'rgba(7, 19, 33, .72)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
  ctx.strokeStyle = '#526179';
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, width, height, 28);
  ctx.stroke();
}

function statTile(ctx, x, label, value) {
  ctx.fillStyle = '#15263a';
  roundedRect(ctx, x, 1041, 224, 149, 21);
  ctx.fill();
  ctx.strokeStyle = '#2e4055';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawText(ctx, label, x + 19, 1060, 19, MUTED, 800);
  drawText(ctx, value, x + 19, 1096, 61, INK, 900);
}

/** Draws the exact pixels used in the preview and the downloaded PNG. */
export function drawAthleteCard(canvas, athlete, year, photo = null) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const background = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  background.addColorStop(0, '#0e2136');
  background.addColorStop(.55, '#091827');
  background.addColorStop(1, '#07121f');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.strokeStyle = 'rgba(255, 255, 255, .045)';
  ctx.lineWidth = 3;
  for (let offset = -1000; offset < 1100; offset += 113) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + 920, 1350);
    ctx.stroke();
  }
  ctx.fillStyle = ORANGE;
  ctx.fillRect(0, 0, 13, CARD_HEIGHT);
  ctx.fillRect(76, 70, 47, 7);
  drawText(ctx, 'CBA', 76, 94, 64, INK, 900);
  drawText(ctx, 'PERFIL DO ATLETA', 80, 161, 19, MUTED, 800);
  ctx.textAlign = 'right';
  drawText(ctx, `TEMPORADA ${year}`, 1004, 116, 25, ORANGE, 900);
  ctx.textAlign = 'left';

  drawPhoto(ctx, photo, athlete);
  drawText(ctx, 'O JOGO EM NÚMEROS', 78, 257, 20, ORANGE, 900);
  const { lines, size } = nameLines(ctx, athlete.name, 495, 4);
  lines.forEach((line, index) => drawText(ctx, line, 76, 306 + index * (size + 4), size, INK, 900));
  const identityY = Math.max(568, 316 + lines.length * (size + 4) + 13);
  drawText(ctx, athlete.posicao || 'Atleta do CBA', 78, identityY, 26, '#d4dfeb', 700);
  drawText(ctx, `CAMISA #${athlete.numero || '—'}`, 78, identityY + 49, 23, ORANGE, 900);

  ctx.fillStyle = '#273b50';
  ctx.fillRect(76, 761, 928, 2);
  ctx.fillStyle = '#13263a';
  roundedRect(ctx, 76, 786, 928, 231, 27);
  ctx.fill();
  ctx.strokeStyle = '#30465d';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawText(ctx, 'PONTOS NA TEMPORADA', 101, 812, 21, MUTED, 900);
  drawText(ctx, athlete.statDates ? athlete.totals.pts : '—', 94, 850, 107, INK, 900);
  drawText(ctx, `${athlete.statDates} ${athlete.statDates === 1 ? 'RODADA COM SÚMULA' : 'RODADAS COM SÚMULA'}`, 101, 980, 19, ORANGE, 800);
  ctx.fillStyle = '#344a60';
  ctx.fillRect(539, 816, 2, 171);
  drawText(ctx, 'MÉDIA / RODADA', 569, 813, 20, MUTED, 900);
  drawText(ctx, athlete.statDates ? formatAverage(athlete.averages.pts) : '—', 566, 847, 70, INK, 900);
  drawText(ctx, 'PRESENÇA', 569, 941, 18, MUTED, 900);
  drawText(ctx, athlete.attendanceRate === null ? '—' : `${Math.round(athlete.attendanceRate)}%`, 733, 930, 42, '#facc15', 900);

  statTile(ctx, 76, 'REBOTES', athlete.statDates ? athlete.totals.reb : '—');
  statTile(ctx, 310, 'ASSISTÊNCIAS', athlete.statDates ? athlete.totals.ast : '—');
  statTile(ctx, 544, 'TOCOS', athlete.statDates ? athlete.totals.blk : '—');
  statTile(ctx, 778, 'CESTAS DE 3', athlete.statDates ? athlete.totals.pts3 : '—');

  drawText(ctx, 'Médias por rodada com súmula. Súmulas consolidadas por data.', 77, 1220, 21, MUTED, 600);
  drawText(ctx, athlete.validDates ? `${athlete.presences} PRESENÇAS EM ${athlete.validDates} DATAS VÁLIDAS` : 'SEM DATAS VÁLIDAS DE PRESENÇA', 77, 1253, 19, '#d1dce8', 800);
  ctx.fillStyle = '#34485f';
  ctx.fillRect(76, 1294, 928, 2);
  drawText(ctx, 'CBA / BASQUETE', 77, 1310, 19, ORANGE, 900);
  ctx.textAlign = 'right';
  drawText(ctx, String(year), 1003, 1310, 19, MUTED, 900);
  ctx.textAlign = 'left';
}
