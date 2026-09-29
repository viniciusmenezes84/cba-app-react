import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AgendaView from './AgendaView';

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
const future = new Date(`${today}T12:00:00Z`);
future.setUTCDate(future.getUTCDate() + 1);
const tomorrow = future.toISOString().slice(0, 10);

test('agenda filtra confirmações e abre a aba original sem acrescentar navegação', () => {
  const onNavigate = jest.fn();
  render(<AgendaView onBack={jest.fn()} onNavigate={onNavigate} data={{
    user: { name: 'Ana' },
    games: [{ id: 'g1', date: tomorrow, time: '19:00', location: 'Ginásio', confirmed: ['Ana'] }],
    events: [{ id: 'e1', startsAt: `${tomorrow}T15:00:00-03:00`, name: 'Confraternização', location: 'Clube', deadline: tomorrow, attendees: [] }]
  }}/>);
  expect(screen.getByRole('heading', { name: 'Minha agenda' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Todos · 2' })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Google Agenda' })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Ver e confirmar' }));
  expect(onNavigate).toHaveBeenCalledWith('eventos');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmados · 1' }));
  expect(screen.getByText('Jogo do CBA')).toBeInTheDocument();
  expect(screen.queryByText('Confraternização')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes' }));
  expect(onNavigate).toHaveBeenCalledWith('jogos');
});

test('arquivo .ics usa compartilhamento nativo quando o celular oferece suporte', async () => {
  const previousCanShare = Object.getOwnPropertyDescriptor(navigator, 'canShare');
  const previousShare = Object.getOwnPropertyDescriptor(navigator, 'share');
  const share = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  try {
    render(<AgendaView onBack={jest.fn()} onNavigate={jest.fn()} data={{
      user: { name: 'Ana' },
      games: [{ id: 'g1', date: tomorrow, time: '19:00', confirmed: [] }], events: []
    }}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Arquivo .ics' }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ files: [expect.objectContaining({ name: 'cba-jogo-g1.ics' })] }));
  } finally {
    if (previousCanShare) Object.defineProperty(navigator, 'canShare', previousCanShare);
    else delete navigator.canShare;
    if (previousShare) Object.defineProperty(navigator, 'share', previousShare);
    else delete navigator.share;
  }
});
