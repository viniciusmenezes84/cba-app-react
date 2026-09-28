import { render, screen } from '@testing-library/react';
import ReportsDashboardBridge from './ReportsDashboardBridge';
import { InitialDataContext } from './InitialDataContext';

jest.mock('react-chartjs-2', () => ({ Doughnut: () => null, Line: () => null }));

test('relatórios usam os dados do portal sem nova consulta inicial', async () => {
  const previousFetch = global.fetch;
  global.fetch = jest.fn();
  try {
    render(<InitialDataContext.Provider value={{ data: { dashboard: { players: [], dates: [] } } }}>
      <nav><button title="Relatórios" className="scale-110">Relatórios</button></nav>
      <main><div className="space-y-8"><div><h2>Central de Relatórios</h2>
        <select defaultValue="2026"><option value="2026">2026</option></select>
        <select defaultValue="todos"><option value="todos">Todos</option></select>
      </div></div></main>
      <ReportsDashboardBridge />
    </InitialDataContext.Provider>);
    expect(await screen.findByRole('heading', { name: 'Central de Relatórios 2026' })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  } finally {
    global.fetch = previousFetch;
  }
});
