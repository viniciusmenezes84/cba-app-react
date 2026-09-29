import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReportsPdf from './ReportsPdf';
import { medicalPost } from './cbaApi';

jest.mock('./cbaApi', () => ({ medicalPost: jest.fn() }));

test('relatório anual consulta o Departamento Médico na geração e incorpora apenas o status operacional', async () => {
  medicalPost.mockResolvedValue({ records: [
    { id: '1', playerName: 'Ana', status: 'Fisioterapia', expectedReturn: '2026-10-01', diagnosis: 'Privado' },
    { id: '2', playerName: 'Bia', status: 'Alta', dischargedAt: '2026-05-02' }
  ] });
  const save = jest.fn().mockResolvedValue();
  const from = jest.fn(element => {
    expect(element).toHaveTextContent('Departamento Médico');
    expect(element).toHaveTextContent('Ana');
    expect(element).toHaveTextContent('Fisioterapia');
    expect(element).not.toHaveTextContent('Privado');
    expect(element).not.toHaveTextContent('Bia');
    return worker;
  });
  const pdf = { internal: { getNumberOfPages: () => 1, pageSize: { getWidth: () => 8, getHeight: () => 11 } }, setPage: jest.fn(), setFontSize: jest.fn(), setTextColor: jest.fn(), getTextWidth: () => 1, text: jest.fn() };
  const worker = { set: () => worker, from, toPdf: () => worker, get: () => Promise.resolve(pdf), save };
  window.html2pdf = () => worker;
  const previousRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = callback => setTimeout(callback, 0);
  try {
    render(<ReportsPdf data={{ data: { dashboard: { players: [{ name: 'Ana', attendance: { '2026-04-05': '✅' }, dailyStats: {} }], dates: ['2026-04-05'] } } }} year="2026" selectedPlayer="todos" />);
    fireEvent.click(screen.getByRole('button', { name: 'Relatório Anual' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(medicalPost).toHaveBeenCalledWith('bootstrap');
    expect(from).toHaveBeenCalledTimes(1);
  } finally {
    delete window.html2pdf;
    window.requestAnimationFrame = previousRaf;
  }
});
