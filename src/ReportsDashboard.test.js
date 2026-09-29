import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReportsDashboard from './ReportsDashboard';

jest.mock('react-chartjs-2', () => ({ Bar: () => null, Doughnut: () => null, Line: () => null }));

test('filtros de temporada e atleta atualizam resumo, ranking e súmulas sem nova consulta inicial', async () => {
  const previousFetch = global.fetch;
  global.fetch = jest.fn();
  const data = { data: { dashboard: { dates: ['2025-03-02', '2026-04-05'], players: [{
    name: 'Ana', attendance: { '2025-03-02': '✅ Presente', '2026-04-05': '✅ Presente' },
    dailyStats: { '2025-03-02': { pts2: 1 }, '2026-04-05': { pts2: 3, reb: 2 } }
  }] } } };
  try {
    render(<ReportsDashboard data={data} />);
    expect(screen.getByRole('heading', { name: 'Central de Relatórios 2026' })).toBeInTheDocument();
    expect(screen.getByText('Súmulas por data')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Temporada'), { target: { value: '2025' } });
    expect(screen.getByRole('heading', { name: 'Central de Relatórios 2025' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Atleta'), { target: { value: 'Ana' } });
    expect(screen.getByText('Estatísticas por jogo · Ana')).toBeInTheDocument();
    expect(screen.queryByText('Súmulas por data')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Atleta'), { target: { value: 'todos' } });
    expect(screen.getByText('Súmulas por data')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Central de Relatórios 2025' })).toBeInTheDocument());
    expect(global.fetch).not.toHaveBeenCalled();
  } finally {
    global.fetch = previousFetch;
  }
});
