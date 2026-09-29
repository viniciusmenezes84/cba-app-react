import { RECAP_HEIGHT, RECAP_STORY_HEIGHT, RECAP_WIDTH, drawRoundRecap, drawRoundRecapStory } from './roundRecapCanvas';

const recap = {
  date: '2026-09-28', players: 2,
  totals: { pts: 17, reb: 9, ast: 4, blk: 1, pts3: 1 },
  matches: [{ number: 1, blackScore: 13, greenScore: 11 }],
  leaders: {
    pts: { name: 'Ana', pts: 11 }, reb: { name: 'Bia', reb: 6 }, ast: { name: 'Bia', ast: 3 }
  }
};

test('gera post e Story com os números reais e nota de consolidação por data', () => {
  const lines = [];
  const context = {
    createLinearGradient: () => ({ addColorStop: jest.fn() }),
    fillRect: jest.fn(), drawImage: jest.fn(),
    fillText: value => lines.push(String(value)),
    measureText: value => ({ width: String(value).length * 20 })
  };
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = () => context;
  try {
    const canvas = document.createElement('canvas');
    drawRoundRecap(canvas, recap);
    expect([canvas.width, canvas.height]).toEqual([RECAP_WIDTH, RECAP_HEIGHT]);
    expect(lines).toContain('17');
    expect(lines).toContain('CESTINHA DO DIA: Ana');
    expect(lines).toContain('PRETO 13  ×  11 VERDE');
    expect(lines).toContain('Súmula consolidada por data; pode incluir várias partidas.');
    drawRoundRecapStory(canvas, recap);
    expect([canvas.width, canvas.height]).toEqual([RECAP_WIDTH, RECAP_STORY_HEIGHT]);
    expect(context.drawImage).toHaveBeenCalled();
  } finally {
    HTMLCanvasElement.prototype.getContext = original;
  }
});
