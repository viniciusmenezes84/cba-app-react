import { fireEvent, render, screen, within } from '@testing-library/react';
import AthleteDashboard from './AthleteDashboard';

jest.mock('react-chartjs-2', () => ({ Line: () => <div data-testid="season-chart" /> }));

const players = [
  { name: 'Ana', numero: '8', attendance: { '2026-09-06': '✅' },
    dailyStats: { '2026-09-06': { pts2: 2, pts3: 1, reb: 4, ast: 2, blk: 0 } } },
  { name: 'Beto', numero: '14', attendance: { '2026-09-06': '✅' }, dailyStats: {} }
];

test('abre o perfil do usuário e permite consultar outro atleta sem inventar súmulas', () => {
  render(<AthleteDashboard allPlayersData={players} dates={['2026-09-06']} currentUser={{ name: 'Ana' }} isAdmin />);

  expect(screen.getByRole('heading', { name: 'Ana' })).toBeInTheDocument();
  expect(screen.getByTestId('season-chart')).toBeInTheDocument();
  expect(screen.getByText(/7 no ano/)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Selecionar atleta'), { target: { value: 'Beto' } });
  expect(screen.getByRole('heading', { name: 'Beto' })).toBeInTheDocument();
  expect(screen.getByText('Ainda não há súmulas para Beto em 2026.')).toBeInTheDocument();
  expect(screen.queryByTestId('season-chart')).not.toBeInTheDocument();
});

test('entrada usa última súmula mesmo no ano anterior; temporada manual e atleta são independentes', () => {
  const historical = players.map(player => ({ ...player, dailyStats: player.name === 'Ana'
    ? { '2025-10-18': { pts2: 3, pts3: 1, reb: 4, ast: 1, blk: 0 } } : {}, attendance: { '2026-11-15': '✅' } }));
  const { rerender } = render(<AthleteDashboard allPlayersData={historical} dates={['2026-11-15']} currentUser={{ name: 'Ana' }} isAdmin/>);
  const region = () => within(screen.getByRole('region', { name: 'Time ideal da rodada' }));
  expect(screen.getByLabelText('Selecionar temporada')).toHaveValue('2025');
  expect(region().getByText('18/10/2025')).toBeInTheDocument();
  expect(region().getByText('Ana')).toBeInTheDocument();
  const team = screen.getByRole('region', { name: 'Time ideal da rodada' }).textContent;
  fireEvent.change(screen.getByLabelText('Selecionar atleta'), { target: { value: 'Beto' } });
  expect(screen.getByRole('region', { name: 'Time ideal da rodada' }).textContent).toBe(team);
  expect(screen.getByRole('heading', { name: 'Beto' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Selecionar temporada'), { target: { value: '2026' } });
  expect(region().getByText(/Nenhuma rodada com súmula registrada em 2026/)).toBeInTheDocument();
  expect(region().queryByRole('button', { name: 'Compartilhar time ideal da rodada' })).not.toBeInTheDocument();
  rerender(<AthleteDashboard allPlayersData={historical} dates={['2026-11-15', '2027-01-01']} currentUser={{ name: 'Ana' }} isAdmin/>);
  expect(screen.getByLabelText('Selecionar temporada')).toHaveValue('2026');
  fireEvent.change(screen.getByLabelText('Selecionar temporada'), { target: { value: '2025' } });
  expect(region().getByRole('button', { name: 'Compartilhar time ideal da rodada' })).toBeInTheDocument();
});

test('time ideal vem após o cabeçalho e antes do perfil individual', () => {
  const { container } = render(<AthleteDashboard allPlayersData={players} isAdmin/>);
  expect(container.querySelector('.cba-player__intro').nextElementSibling).toBe(screen.getByRole('region', { name: 'Time ideal da rodada' }));
  expect(container.querySelector('.cba-ideal-team').nextElementSibling).toHaveClass('cba-player__hero');
});

test('membro vê os destaques esportivos coletivos, mas somente seu próprio perfil individual', () => {
  const roster = players.map((player, index) => ({ ...player, id: String(index),
    financialNote: 'PRIVATE-CBA-ACCOUNT-DATA',
    dailyStats: { '2026-09-06': { pts2: index ? 100 : 2, pts3: 0, reb: 3, ast: 2, blk: 1 } }
  }));
  const { unmount } = render(<AthleteDashboard allPlayersData={roster} currentUser={{ name: 'Ana', athleteId: '0' }}/>);
  const team = within(screen.getByRole('region', { name: 'Time ideal da rodada' }));
  expect(team.getByText('Beto')).toBeInTheDocument();
  expect(team.getByText('Ana')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Ana' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Beto' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Selecionar atleta')).toBeDisabled();
  expect(screen.queryByText('PRIVATE-CBA-ACCOUNT-DATA')).not.toBeInTheDocument();
  const memberTeam = screen.getByRole('region', { name: 'Time ideal da rodada' }).textContent;
  unmount();

  render(<AthleteDashboard allPlayersData={roster} currentUser={{ name: 'Ana', athleteId: '0' }} isAdmin/>);
  expect(screen.getByRole('region', { name: 'Time ideal da rodada' }).textContent).toBe(memberTeam);
  expect(screen.getByLabelText('Selecionar atleta')).toBeEnabled();
});
