import { fireEvent, render, screen } from '@testing-library/react';
import AthleteDashboard from './AthleteDashboard';

jest.mock('react-chartjs-2', () => ({ Line: () => <div data-testid="season-chart" /> }));

const players = [
  { name: 'Ana', numero: '8', attendance: { '2026-09-06': '✅' },
    dailyStats: { '2026-09-06': { pts2: 2, pts3: 1, reb: 4, ast: 2, blk: 0 } } },
  { name: 'Beto', numero: '14', attendance: { '2026-09-06': '✅' }, dailyStats: {} }
];

test('abre o perfil do usuário e permite consultar outro atleta sem inventar súmulas', () => {
  render(<AthleteDashboard allPlayersData={players} dates={['2026-09-06']} currentUser={{ name: 'Ana' }} />);

  expect(screen.getByRole('heading', { name: 'Ana' })).toBeInTheDocument();
  expect(screen.getByTestId('season-chart')).toBeInTheDocument();
  expect(screen.getByText(/7 no ano/)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Selecionar atleta'), { target: { value: 'Beto' } });
  expect(screen.getByRole('heading', { name: 'Beto' })).toBeInTheDocument();
  expect(screen.getByText('Ainda não há súmulas para Beto em 2026.')).toBeInTheDocument();
  expect(screen.queryByTestId('season-chart')).not.toBeInTheDocument();
});
