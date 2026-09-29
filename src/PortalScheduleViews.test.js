import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EventsView, GamesView } from './PortalExperienceBridge';
import { gatewayPost } from './cbaApi';

jest.mock('./cbaApi', () => ({ gatewayPost: jest.fn(), portalPost: jest.fn(), readSession: () => null }));
jest.mock('./RoundRecapModal', () => ({ __esModule: true, default: ({ recap, onClose }) => <div role="dialog" aria-label="Resumo da rodada"><span>{recap.totals.pts} pontos na data</span><button onClick={onClose}>Fechar resumo</button></div> }));

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
const dateOffset = days => {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

test('Jogos destaca só o próximo, preserva histórico e confirma presença', async () => {
  gatewayPost.mockResolvedValue({ result: 'success' });
  const refresh = jest.fn();
  render(<GamesView refresh={refresh} data={{
    user: { name: 'Ana', role: 'MEMBER' },
    games: [
      { id: 'one', date: dateOffset(1), time: '19:00', location: 'Ginásio', confirmed: ['Bruno'] },
      { id: 'two', date: dateOffset(2), time: '20:00', location: 'Quadra B', confirmed: [] },
      { id: 'old', date: dateOffset(-1), time: '18:00', location: 'Quadra C', confirmed: ['Ana'] }
    ]
  }}/>);
  expect(screen.getByText('Próximo jogo')).toBeInTheDocument();
  expect(screen.getByText('Depois deste jogo')).toBeInTheDocument();
  expect(screen.getByText('Quadra B')).toBeInTheDocument();
  expect(screen.getAllByText('Ginásio')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar presença' }));
  await waitFor(() => expect(gatewayPost).toHaveBeenCalledWith('handleAttendanceUpdate', {
    itemId: 'one', actionType: 'confirm', type: 'game'
  }));
  expect(refresh).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Histórico · 1' }));
  expect(screen.getByText('Jogos realizados')).toBeInTheDocument();
  expect(screen.getByText('Quadra C')).toBeInTheDocument();
  expect(screen.queryByText('Ginásio')).not.toBeInTheDocument();
});

test('Eventos mostra detalhes reais, impede confirmação fora do prazo e mantém encerrados', () => {
  const refresh = jest.fn();
  const future = dateOffset(2);
  render(<EventsView refresh={refresh} data={{
    user: { name: 'Ana', role: 'MEMBER' },
    events: [
      { id: 'one', name: 'Encontro CBA', startsAt: `${future}T18:00:00-03:00`, deadline: dateOffset(1), location: 'Clube', description: 'Encontro dos atletas.', value: 25, attendees: ['Ana'] },
      { id: 'two', name: 'Treino aberto', startsAt: `${dateOffset(3)}T18:00:00-03:00`, deadline: dateOffset(-1), location: 'Ginásio', description: 'Para convidados.', value: 0, attendees: [] },
      { id: 'old', name: 'Evento anterior', startsAt: `${dateOffset(-1)}T12:00:00-03:00`, deadline: dateOffset(-2), location: 'Quadra', description: 'Já realizado.', value: 10, attendees: [] }
    ]
  }}/>);
  expect(screen.getAllByText('Encontro CBA')).toHaveLength(1);
  expect(screen.getByText('Encontro dos atletas.')).toBeInTheDocument();
  expect(screen.getByText('R$ 25,00')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Desistir da participação' })).toBeEnabled();
  const laterCard = screen.getByText('Treino aberto').closest('[class*="rounded-3xl"]');
  expect(within(laterCard).getByRole('button', { name: 'Inscrições encerradas' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Encerrados · 1' }));
  expect(screen.getByText('Evento anterior')).toBeInTheDocument();
  expect(screen.queryByText('Encontro CBA')).not.toBeInTheDocument();
});

test('Quando não há próximos compromissos, os atalhos levam ao histórico', () => {
  const old = dateOffset(-1);
  const { unmount } = render(<GamesView refresh={jest.fn()} data={{ user: { name: 'Ana' }, games: [
    { id: 'old', date: old, time: '18:00', location: 'Quadra', confirmed: [] }
  ] }}/ >);
  expect(screen.getByText('Nenhum jogo agendado')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver histórico' }));
  expect(screen.getByText('Quadra')).toBeInTheDocument();
  unmount();
  render(<EventsView refresh={jest.fn()} data={{ user: { name: 'Ana' }, events: [
    { id: 'old', name: 'Encontro passado', startsAt: `${old}T18:00:00-03:00`, deadline: old, location: 'Clube', description: 'Descrição.', attendees: [] }
  ] }}/ >);
  expect(screen.getByText('Nenhum evento agendado')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver encerrados' }));
  expect(screen.getByText('Encontro passado')).toBeInTheDocument();
});

test('Administradores mantêm edição e cancelamento no jogo destacado', () => {
  render(<GamesView refresh={jest.fn()} data={{ user: { name: 'Ana', role: 'ADMIN' }, games: [
    { id: 'next', date: dateOffset(1), time: '19:00', location: 'Ginásio', confirmed: [] }
  ] }}/ >);
  fireEvent.click(screen.getByRole('button', { name: 'Editar jogo' }));
  expect(screen.getByRole('heading', { name: 'Editar jogo' })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar jogo' }));
  expect(screen.getByRole('heading', { name: 'Cancelar jogo' })).toBeInTheDocument();
});

test('Resumo da rodada só aparece no histórico com súmula registrada naquela data', async () => {
  const withStats = dateOffset(-2);
  const withoutStats = dateOffset(-1);
  const players = [
    { name: 'Ana', dailyStats: { [withStats]: { pts2: 3, pts3: 1, reb: 2, ast: 1 } } },
    { name: 'Bia', dailyStats: { [withStats]: { pts2: 2, reb: 4 } } }
  ];
  render(<GamesView refresh={jest.fn()} players={players} data={{ user: { name: 'Ana' }, games: [
    { id: 'with', date: withStats, time: '18:00', location: 'Ginásio', confirmed: [] },
    { id: 'without', date: withoutStats, time: '18:00', location: 'Quadra', confirmed: [] },
    { id: 'cancelled', date: withStats, time: '20:00', cancelledAt: '2026-01-01', confirmed: [] }
  ] }}/ >);
  fireEvent.click(screen.getByRole('button', { name: 'Histórico · 2' }));
  expect(screen.getByText('Sem súmula registrada para esta data.')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Ver resumo da rodada' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Ver resumo da rodada' }));
  expect(await screen.findByRole('dialog', { name: 'Resumo da rodada' })).toHaveTextContent('13 pontos na data');
  fireEvent.click(screen.getByRole('button', { name: 'Fechar resumo' }));
  expect(screen.queryByRole('dialog', { name: 'Resumo da rodada' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelados · 1' }));
  expect(screen.queryByRole('button', { name: 'Ver resumo da rodada' })).not.toBeInTheDocument();
});

test('Eventos mostra erro da API em vez de deixar o clique sem resposta', async () => {
  gatewayPost.mockRejectedValueOnce(new Error('Conta sem atleta associado.'));
  render(<EventsView refresh={jest.fn()} data={{ user: { name: 'Ana' }, events: [
    { id: 'event', name: 'Confraternização', startsAt: `${dateOffset(1)}T18:00:00-03:00`, deadline: today, location: 'Clube', description: 'Encontro.', value: 20, attendees: [] }
  ] }}/ >);
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar participação' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Conta sem atleta associado.');
  expect(gatewayPost).toHaveBeenCalledWith('handleAttendanceUpdate', {
    itemId: 'event', actionType: 'confirm', type: 'event'
  });
});
