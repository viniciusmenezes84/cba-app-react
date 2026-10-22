import { buildPrintableSumulaPdf, printableSumulaAthletes } from './PrintableSumulaPdf';

const make = (n) => Array.from({ length: n }, (_, index) => ({
  id: String(index + 1),
  active: true,
  name: `Jogador ${String(index + 1).padStart(2, '0')}`
}));

test('súmula considera todos os ativos do cadastro, não a presença, e ignora marcações *', () => {
  const names = printableSumulaAthletes([
    { name: 'Vinicius', active: true, attendance: { '2026-10-18': 'absent' } },
    { name: 'Alan', active: true },
    { name: 'Não ativo', active: false },
    { name: 'Tem *', active: true },
    { name: '  Lucas Portugal  ', active: true },
    null
  ]);
  expect(names).toEqual(['Alan', 'Lucas Portugal', 'Vinicius']);
});

test('preserva uma única página A4 para 37 atletas, com PDF legível', () => {
  const pdf = buildPrintableSumulaPdf(make(37));
  expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(595.28, 0);
  expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(841.89, 0);
  expect(pdf.getNumberOfPages()).toBe(1);
  const bytes = new Uint8Array(pdf.output('arraybuffer'));
  expect(bytes.length).toBeGreaterThan(3500);
  expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
});

test('lista grande continua completa com páginas extras legíveis', () => {
  expect(buildPrintableSumulaPdf(make(50)).getNumberOfPages()).toBe(1);
  expect(buildPrintableSumulaPdf(make(51)).getNumberOfPages()).toBe(2);
});

test('não imprime documento silenciosamente sem atletas', () => {
  expect(() => buildPrintableSumulaPdf([])).toThrow(/atletas ativos/);
});
