import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HomeDashboard from './HomeDashboard';
import { InitialDataContext } from './InitialDataContext';
import { portalPost, adminPost } from './cbaApi';

jest.mock('./cbaApi', () => ({ portalPost: jest.fn(), adminPost: jest.fn() }));
jest.mock('./HomeHighlightsPdf', () => ({ buildSportsExecutivePdf: jest.fn(() => ({ output: () => new Blob(['PDF de teste']) })) }));

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


test('Início mantém os cards antigos e mostra o Sports Center com rankings por temporada', async () => {
  const year = today.slice(0, 4);
  const stats = { dashboard: { players: [
    {name:'Ana',fotoUrl:'',dailyStats:{[today]:{pts2:5,pts3:0,reb:2,ast:2,blk:1}},attendance:{[today]:'✅'}},
    {name:'Bia',dailyStats:{[today]:{pts2:3,pts3:0,reb:4,ast:1,blk:0}},attendance:{[today]:'✅'}}
  ],dates:[today] } };
  portalPost.mockReset();
  portalPost.mockResolvedValue(payload);
  const navigate=jest.fn();
  render(<InitialDataContext.Provider value={{data:stats}}>
    <HomeDashboard isAdmin onNavigate={navigate}/>
  </InitialDataContext.Provider>);
  expect(await screen.findByRole('heading',{name:'Olá, Vinicius'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:/O jogo em/})).toBeInTheDocument();
  expect(screen.getByText('Cestinha da rodada')).toBeInTheDocument();
  expect(screen.getByText('Líderes da temporada')).toBeInTheDocument();
  expect(screen.getByText('Ranking acumulado')).toBeInTheDocument();
  expect(screen.getByText('Recordes da temporada')).toBeInTheDocument();
  expect(screen.getByText('R$ 15,00')).toBeInTheDocument();
  expect(screen.getByText('Aviso do clube')).toBeInTheDocument();
  expect(screen.getByLabelText('Temporada dos destaques')).toHaveValue(year);
  fireEvent.click(screen.getByRole('button',{name:'REB'}));
  expect(screen.getByRole('button',{name:'REB'})).toHaveAttribute('aria-pressed','true');
  fireEvent.click(screen.getByRole('button',{name:'Abrir rankings completos'}));
  expect(navigate).toHaveBeenCalledWith('relatorios');
  expect(portalPost).toHaveBeenCalledTimes(1);
});


test('somente ADM vê emitir relatório e backend autoriza antes da geração', async () => {
  const stats={dashboard:{players:[{name:'Ana',dailyStats:{[today]:{pts2:5,pts3:0,reb:2,ast:1,blk:0}},attendance:{[today]:'✅'}}],dates:[today]}};
  portalPost.mockReset().mockResolvedValue(payload);
  adminPost.mockReset().mockResolvedValue({result:'success'});
  const oldCreate=URL.createObjectURL;
  const oldRevoke=URL.revokeObjectURL;
  URL.createObjectURL=jest.fn(()=>'blob:cba-test');
  URL.revokeObjectURL=jest.fn();
  try {
    const ui=render(<InitialDataContext.Provider value={{data:stats}}>
      <HomeDashboard isAdmin={false} onNavigate={jest.fn()}/>
    </InitialDataContext.Provider>);
    await screen.findByRole('heading',{name:'Meu desempenho'});
    expect(screen.queryByText('Ranking acumulado')).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Relatório executivo PDF'})).not.toBeInTheDocument();
    expect(adminPost).not.toHaveBeenCalled();
    ui.rerender(<InitialDataContext.Provider value={{data:stats}}>
      <HomeDashboard isAdmin onNavigate={jest.fn()}/>
    </InitialDataContext.Provider>);
    const btn=screen.getByRole('button',{name:'Relatório executivo PDF'});
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    await waitFor(()=>expect(adminPost).toHaveBeenCalledWith('authorizeSportsReport',{
      year:today.slice(0,4),latestDate:today
    }));
    expect(await screen.findByText('Visualizar PDF')).toHaveAttribute('href','blob:cba-test');
    expect(screen.getByText('Baixar PDF')).toHaveAttribute('download',
      'CBA_Relatorio_Executivo_Esportivo_'+today.slice(0,4)+'.pdf');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  } finally {
    URL.createObjectURL=oldCreate;
    URL.revokeObjectURL=oldRevoke;
  }
});

test('se o servidor negar a emissão, não gera o PDF', async () => {
  const stats={dashboard:{players:[{name:'Ana',dailyStats:{[today]:{pts2:1}},attendance:{[today]:'✅'}}],dates:[today]}};
  portalPost.mockReset().mockResolvedValue(payload);
  adminPost.mockReset().mockRejectedValue(new Error('Acesso negado pelo servidor.'));
  render(<InitialDataContext.Provider value={{data:stats}}>
    <HomeDashboard isAdmin onNavigate={jest.fn()}/>
  </InitialDataContext.Provider>);
  const btn=await screen.findByRole('button',{name:'Relatório executivo PDF'});
  expect(btn).toBeEnabled();
  fireEvent.click(btn);
  expect(await screen.findByRole('alert')).toHaveTextContent('Acesso negado pelo servidor.');
  expect(screen.queryByText('Visualizar PDF')).not.toBeInTheDocument();
});
