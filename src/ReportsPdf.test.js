import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReportsPdf, { buildAnnualGeneral, buildAnnualPlayer, buildMonthly, deriveReport } from './ReportsPdf';
import { medicalPost } from './cbaApi';

jest.mock('./cbaApi', () => ({ medicalPost: jest.fn() }));

const player = {
  name: 'Ana', attendance: { '2025-03-02': '✅', '2026-04-05': '✅' },
  dailyStats: { '2025-03-02': { pts2: 1 }, '2026-04-05': { pts2: 3, reb: 2 } }
};
const data = { data: { dashboard: { players: [player], dates: ['2025-03-02', '2026-04-05'] } } };
const derived = deriveReport([player], data.data.dashboard.dates, '2026');

function pdfText(doc) {
  return doc.internal.pages.flat().join('\n');
}

test('gera PDFs completos diretamente dos dados sem depender de HTML ou CDN', () => {
  const medical = { records: [
    { id: '1', playerName: 'Ana', status: 'Fisioterapia', expectedReturn: '2026-10-01', diagnosis: 'Privado' },
    { id: '2', playerName: 'Bia', status: 'Alta', dischargedAt: '2026-05-02' }
  ] };
  const annual = buildAnnualGeneral('2026', derived, medical);
  expect(typeof annual.output).toBe('function');
  expect(annual.getNumberOfPages()).toBeGreaterThanOrEqual(3);
  expect(pdfText(annual)).toContain('Fisioterapia');
  expect(pdfText(annual)).toContain('Ana');
  expect(pdfText(annual)).not.toContain('Privado');
  expect(pdfText(annual)).not.toContain('Bia');
  expect(annual.output()).toMatch(/^%PDF-/);

  const individual = buildAnnualPlayer('2026', derived.reportData[0]);
  expect(pdfText(individual)).toContain('Ana');
  expect(individual.output()).toMatch(/^%PDF-/);

  const monthly = buildMonthly('2026', derived);
  expect(pdfText(monthly)).toContain('Ana');
  expect(monthly.output()).toMatch(/^%PDF-/);
});

test('falha no preparo mostra erro e libera a navegação e nova tentativa', async () => {
  const previousCreate = URL.createObjectURL;
  const previousRevoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn().mockImplementationOnce(() => { throw new Error('Falha no navegador'); }).mockReturnValue('blob:pdf-teste');
  URL.revokeObjectURL = jest.fn();
  const logger = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const { unmount } = render(<><nav><button type="button">Jogos</button></nav><ReportsPdf data={data} year="2026" selectedPlayer="todos" /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Resumo Mensal' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível preparar o PDF');
    expect(screen.getByRole('button', { name: 'Jogos' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Resumo Mensal' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Resumo Mensal' }));
    const link = await screen.findByRole('link', { name: /PDF pronto: abrir ou baixar/ });
    expect(link).toHaveAttribute('href', 'blob:pdf-teste');
    expect(link).toHaveAttribute('download', 'Resumo_Mensal_Assiduidade_2026.pdf');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();
  } finally {
    logger.mockRestore();
    URL.createObjectURL = previousCreate;
    URL.revokeObjectURL = previousRevoke;
  }
});

test('consulta o status médico apenas no relatório anual geral', async () => {
  medicalPost.mockRejectedValueOnce(new Error('indisponível'));
  const previousCreate = URL.createObjectURL;
  const previousRevoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn().mockReturnValue('blob:pdf-anual');
  URL.revokeObjectURL = jest.fn();
  const logger = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const { unmount } = render(<ReportsPdf data={data} year="2026" selectedPlayer="todos" />);
    fireEvent.click(screen.getByRole('button', { name: 'Relatório Anual' }));
    expect(await screen.findByRole('link', { name: /PDF pronto: abrir ou baixar/ })).toHaveAttribute('download', 'Relatorio_CBA_2026_Geral.pdf');
    expect(medicalPost).toHaveBeenCalledWith('bootstrap', {}, expect.objectContaining({ signal: expect.any(Object) }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();
  } finally {
    logger.mockRestore();
    URL.createObjectURL = previousCreate;
    URL.revokeObjectURL = previousRevoke;
  }
});
