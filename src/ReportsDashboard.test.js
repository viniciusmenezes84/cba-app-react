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
    render(<ReportsDashboard data={data} isAdmin />);
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


test('MEMBER consulta o mesmo elenco e ranking que ADM, troca de atleta e temporada sem botões de exportação', () => {
  const input={data:{dashboard:{dates:['2025-04-05','2026-04-05'],players:[
    {id:'athlete-member',name:'Minha Pessoa',attendance:{'2026-04-05':'✅'},dailyStats:{'2026-04-05':{pts2:2}}},
    {id:'athlete-other',name:'Outro Atleta',attendance:{'2026-04-05':'✅'},dailyStats:{'2026-04-05':{pts2:12}}}
  ]}}};
  render(<ReportsDashboard data={input} isAdmin={false} currentUser={{athleteId:'athlete-member'}}/>);
  expect(screen.getByLabelText('Atleta')).toBeEnabled();
  expect(screen.getByLabelText('Atleta')).toHaveValue('todos');
  expect(screen.getByRole('option',{name:'Todos os atletas'})).toBeInTheDocument();
  expect(screen.getByRole('option',{name:'Outro Atleta'})).toBeInTheDocument();
  expect(screen.getByText('Ranking da temporada')).toBeInTheDocument();
  expect(screen.getByText('Súmulas por data')).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Resumo Mensal'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Relatório Anual'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Atleta'),{target:{value:'Outro Atleta'}});
  expect(screen.getByRole('heading',{name:'Outro Atleta'})).toBeInTheDocument();
  expect(screen.getByText('Estatísticas por jogo · Outro Atleta')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Atleta'),{target:{value:'todos'}});
  expect(screen.getByText('Ranking da temporada')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Temporada'),{target:{value:'2025'}});
  expect(screen.getByRole('heading',{name:'Central de Relatórios 2025'})).toBeInTheDocument();
});
