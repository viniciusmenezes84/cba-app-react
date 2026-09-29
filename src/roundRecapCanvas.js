export const RECAP_WIDTH = 1080;
export const RECAP_HEIGHT = 1350;
export const RECAP_STORY_HEIGHT = 1920;

const color = { white: '#f8fafc', muted: '#a5b8ca', orange: '#ff994d', green: '#32d7ac' };
const text = (ctx, value, x, y, size, fill = color.white, weight = 800) => {
  ctx.fillStyle = fill;
  ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(String(value), x, y);
};
const rule = (ctx, y) => {
  ctx.fillStyle = '#2d4054';
  ctx.fillRect(76, y, 928, 2);
};
const fit = (ctx, value, width, max = 42) => {
  const label = String(value);
  let size = max;
  while (size > 22) {
    ctx.font = `900 ${size}px Inter, system-ui, sans-serif`;
    if (ctx.measureText(label).width <= width) return { label, size };
    size -= 2;
  }
  ctx.font = `900 ${size}px Inter, system-ui, sans-serif`;
  let clipped = label;
  while (clipped.length && ctx.measureText(`${clipped}…`).width > width) clipped = clipped.slice(0, -1);
  return { label: `${clipped}…`, size };
};

export function drawRoundRecap(canvas, recap) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  canvas.width = RECAP_WIDTH;
  canvas.height = RECAP_HEIGHT;
  const gradient = ctx.createLinearGradient(0, 0, RECAP_WIDTH, RECAP_HEIGHT);
  gradient.addColorStop(0, '#132e43');
  gradient.addColorStop(.55, '#0a1b2c');
  gradient.addColorStop(1, '#081521');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, RECAP_WIDTH, RECAP_HEIGHT);
  ctx.fillStyle = color.orange;
  ctx.fillRect(0, 0, 14, RECAP_HEIGHT);
  text(ctx, 'CBA', 76, 78, 70, color.white, 900);
  text(ctx, 'RESUMO DA RODADA', 78, 168, 27, color.orange, 900);
  rule(ctx, 224);
  const [year, month, day] = recap.date.split('-');
  text(ctx, `${day}/${month}/${year}`, 76, 262, 70, color.white, 900);
  text(ctx, `${recap.players} ${recap.players === 1 ? 'ATLETA COM SÚMULA' : 'ATLETAS COM SÚMULA'}`, 79, 355, 25, color.muted, 800);

  ctx.fillStyle = '#173449';
  ctx.fillRect(76, 425, 928, 260);
  text(ctx, 'PRODUÇÃO REGISTRADA NO DIA', 106, 455, 22, color.green, 900);
  text(ctx, recap.totals.pts, 101, 503, 116, color.white, 900);
  text(ctx, 'PONTOS', 106, 625, 24, color.muted, 900);
  for (const [index, [label, value]] of [['REBOTES', recap.totals.reb], ['ASSISTÊNCIAS', recap.totals.ast], ['CESTAS DE 3', recap.totals.pts3]].entries()) {
    const x = 76 + index * 314;
    ctx.fillStyle = '#132b3e';
    ctx.fillRect(x, 712, 300, 150);
    text(ctx, label, x + 17, 731, 20, color.muted, 900);
    text(ctx, value, x + 17, 769, 64, color.white, 900);
  }
  if (recap.matches?.length) {
    text(ctx, 'PLACARES REGISTRADOS', 76, 888, 25, color.orange, 900);
    rule(ctx, 927);
    recap.matches.slice(0, 3).forEach((match, index) => {
      const y = 950 + index * 67;
      text(ctx, `PARTIDA ${match.number}`, 78, y, 21, color.muted, 900);
      ctx.textAlign = 'right';
      text(ctx, `PRETO ${match.blackScore}  ×  ${match.greenScore} VERDE`, 1001, y - 5, 30, color.white, 900);
      ctx.textAlign = 'left';
    });
    if (recap.matches.length > 3) text(ctx, `+ ${recap.matches.length - 3} partidas registradas`, 78, 1161, 22, color.muted, 800);
    const leader = recap.leaders.pts;
    const name = fit(ctx, leader.name, 495, 31);
    text(ctx, `CESTINHA DO DIA: ${name.label}`, 78, 1210, 26, color.green, 900);
  } else {
    text(ctx, 'DESTAQUES DA SÚMULA', 76, 918, 25, color.orange, 900);
    rule(ctx, 960);
    [['CESTINHA', 'pts', 'PTS'], ['REBOTES', 'reb', 'REB'], ['ASSISTÊNCIAS', 'ast', 'AST']].forEach(([label, key, unit], index) => {
      const leader = recap.leaders[key];
      const y = 981 + index * 88;
      text(ctx, label, 78, y, 18, color.muted, 900);
      const name = fit(ctx, leader.name, 700);
      text(ctx, name.label, 78, y + 26, name.size, color.white, 900);
      ctx.textAlign = 'right';
      text(ctx, `${leader[key]} ${unit}`, 1001, y + 30, 25, color.green, 900);
      ctx.textAlign = 'left';
    });
  }
  rule(ctx, 1263);
  text(ctx, 'Súmula consolidada por data; pode incluir várias partidas.', 76, 1282, 19, color.muted, 600);
  text(ctx, 'CBA  /  BASQUETE', 76, 1313, 20, color.orange, 900);
}

export function drawRoundRecapStory(canvas, recap) {
  const post = document.createElement('canvas');
  drawRoundRecap(post, recap);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  canvas.width = RECAP_WIDTH;
  canvas.height = RECAP_STORY_HEIGHT;
  ctx.fillStyle = '#0b1b2d';
  ctx.fillRect(0, 0, RECAP_WIDTH, RECAP_STORY_HEIGHT);
  ctx.fillStyle = color.orange;
  ctx.fillRect(0, 0, 14, RECAP_STORY_HEIGHT);
  text(ctx, 'CBA  /  BASQUETE', 76, 115, 40, color.white, 900);
  text(ctx, 'A RODADA EM NÚMEROS', 76, 176, 24, color.orange, 900);
  ctx.drawImage(post, 0, 286, RECAP_WIDTH, RECAP_HEIGHT);
  text(ctx, 'RESUMO DA RODADA', 76, 1710, 42, color.white, 900);
  text(ctx, 'Dados da súmula consolidada do dia', 76, 1774, 24, color.muted, 700);
}
