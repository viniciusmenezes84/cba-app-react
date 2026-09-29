import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HomeDashboard from './HomeDashboard';
import { portalPost } from './cbaApi';

jest.mock('./cbaApi', () => ({ portalPost: jest.fn() }));

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const payload = {
  user: { name: 'Vinicius', role: 'ADMIN' }, overview: { athletes: 20, upcomingGames: 1, dmActive: 2 },
  games: [{ id: 'g1', date: today, time: '19:00', location: 'Quadra CBA', confirmed: ['Ana'] }],
  events: [{ id: 'e1', name: 'Confraternização', startsAt: `${today}T12:00:00`, location: 'Clube' }],
  finance: { currentYear: 2026, ownerAthleteId: 'own', periods: [{ id: 'period', year: 2026 }], dues: [
    { athlete_id: 'own', period_id: 'period', amount_due: 20, amount_paid: 5 },
    { athlete_id: 'own', period_id: 'period', status: 'exempt', amount_due: 20, amount_paid: 0 },
    { athlete_id: 'other', period_id: 'period', amount_due: 1000, amount_paid: 0 }
  ] },
  notifications: [{ title: 'Aviso do clube', message: 'Treino confirmado' }]
};

test('Início consulta o portal uma vez, mostra a situação própria e navega pelo React', async () => {
  portalPost.mockResolvedValue(payload);
  const onNavigate = jest.fn();
  render(<HomeDashboard isAdmin onNavigate={onNavigate} />);
  expect(await screen.findByRole('heading', { name: 'Olá, Vinicius' })).toBeInTheDocument();
  expect(screen.getByText('R$ 15,00')).toBeInTheDocument();
  expect(screen.queryByText('R$ 1.015,00')).not.toBeInTheDocument();
  expect(screen.getByText('Aviso do clube')).toBeInTheDocument();
  expect(portalPost).toHaveBeenCalledTimes(1);
  expect(portalPost).toHaveBeenCalledWith('bootstrap', {}, expect.objectContaining({ signal: expect.any(Object) }));
  fireEvent.click(screen.getByRole('button', { name: 'Abrir minha agenda' }));
  expect(screen.getByRole('heading', { name: 'Minha agenda' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Confirmados · 0' })).toBeInTheDocument();
  expect(portalPost).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Voltar ao Início' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ver jogo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ver financeiro' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ver eventos' }));
  fireEvent.click(screen.getByRole('button', { name: 'Central de comunicação' }));
  expect(onNavigate.mock.calls.map(([tab]) => tab)).toEqual(['jogos', 'financas', 'eventos', 'notificacoes']);
});

test('falha de carregamento oferece nova tentativa sem prender a navegação', async () => {
  portalPost.mockRejectedValueOnce(new Error('Conexão indisponível')).mockResolvedValueOnce(payload);
  render(<HomeDashboard isAdmin={false} onNavigate={jest.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Conexão indisponível');
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByRole('heading', { name: 'Olá, Vinicius' })).toBeInTheDocument();
  expect(portalPost).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('button', { name: 'Central de comunicação' })).not.toBeInTheDocument();
});

test('atualização global recarrega o painel e descarta resposta antiga', async () => {
  let resolveOld;
  portalPost.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(payload);
  const { rerender } = render(<HomeDashboard isAdmin={false} onNavigate={jest.fn()} refreshKey={0} />);
  rerender(<HomeDashboard isAdmin={false} onNavigate={jest.fn()} refreshKey={1} />);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Olá, Vinicius' })).toBeInTheDocument());
  resolveOld({ ...payload, user: { name: 'Antigo' } });
  expect(screen.queryByRole('heading', { name: 'Olá, Antigo' })).not.toBeInTheDocument();
});
