import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import MesarioDashboard from './MesarioDashboard';
import { gatewayPost } from './cbaApi';

jest.mock('./cbaApi', () => ({ gatewayPost: jest.fn() }));
const names = ['Atleta Preto', 'Segundo Preto', 'Atleta Verde', 'Segundo Verde'];
const data = { dashboard: { players: names.map(name => ({ name, attendance: {} })) } };
const backup = { schemaVersion: 2, date: '2026-10-13', isLive: true, gameNumber: 1,
  teamBlack: names.slice(0, 2), teamGreen: names.slice(2), matchStats: {}, dayStats: {},
  eventHistory: [], gameHistory: [], sessionStartedAt: 1234567890123 };
const read = () => JSON.parse(localStorage.getItem('cba_mesario_backup_v2'));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('cba_mesario_backup_v2', JSON.stringify(backup));
  gatewayPost.mockReset();
});
afterEach(() => localStorage.clear());

async function open(props = {}) {
  const result = render(<MesarioDashboard data={data} {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continuar sessão' }));
  return result;
}

test('celular troca equipe e atleta, corrige, desfaz e recupera os lançamentos', async () => {
  const { unmount } = await open();
  expect(screen.queryByRole('button', { name: /\+3 0 · Segundo Preto/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Verde 0 pts/ }));
  fireEvent.click(screen.getByRole('button', { name: /Segundo Verde.*Toque para lançar/ }));
  fireEvent.click(screen.getByRole('button', { name: '+3 0 · Segundo Verde' }));
  expect(screen.getByLabelText('Placar: Preto 0, Verde 3')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Segundo Verde · +3 pontos');
  fireEvent.click(screen.getByRole('button', { name: 'AST 0 · Segundo Verde' }));
  fireEvent.click(screen.getByRole('button', { name: 'Corrigir lançamento de Segundo Verde' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remover assistências de Segundo Verde' }));
  expect(read().dayStats['Segundo Verde'].ast).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: /Desfazer/ }));
  expect(read().dayStats['Segundo Verde'].ast).toBe(1);
  expect(read().matchStats['Segundo Verde'].pts3).toBe(1);
  unmount();
  await open();
  fireEvent.click(screen.getByRole('button', { name: /Verde 3 pts/ }));
  fireEvent.click(screen.getByRole('button', { name: /Segundo Verde.*Toque para lançar/ }));
  expect(screen.getByRole('button', { name: 'AST 1 · Segundo Verde' })).toBeInTheDocument();
  expect(screen.getByLabelText('Placar: Preto 0, Verde 3')).toBeInTheDocument();
});

test('Modo Quadra sai com Escape e fim da partida, sem perder dados em erro ao salvar', async () => {
  const onCourtModeChange = jest.fn();
  const { container } = await open({ onCourtModeChange });
  fireEvent.click(screen.getByRole('button', { name: 'Modo Quadra' }));
  expect(container.firstChild).toHaveAttribute('data-court-mode', 'true');
  expect(onCourtModeChange).toHaveBeenLastCalledWith(true);
  fireEvent.click(screen.getByRole('button', { name: '+2 0 · Atleta Preto' }));
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(container.firstChild).toHaveAttribute('data-court-mode', 'false');
  expect(read().matchStats['Atleta Preto'].pts2).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: 'Modo Quadra' }));
  fireEvent.click(screen.getByRole('button', { name: 'Finalizar partida' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar resultado' }));
  expect(onCourtModeChange).toHaveBeenLastCalledWith(false);
  expect(read().gameHistory[0].blackScore).toBe(2);
  gatewayPost.mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValueOnce({ result: 'success' });
  fireEvent.click(screen.getByRole('button', { name: 'Encerrar sessão' }));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar súmula' }));
  expect(await screen.findByText('Sem conexão')).toBeInTheDocument();
  expect(read().gameHistory).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar súmula' }));
  expect(await screen.findByText('Súmula salva')).toBeInTheDocument();
  await waitFor(() => expect(localStorage.getItem('cba_mesario_backup_v2')).toBeNull());
});

test('mesa larga apresenta controles dos dois times e recolhe modo ao sair da aba', async () => {
  const size = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 1000 });
  const onCourtModeChange = jest.fn();
  try {
    const { unmount } = await open({ onCourtModeChange });
    const team = screen.getByRole('region', { name: 'Time Verde' });
    expect(within(team).getByRole('button', { name: '+3 0 · Segundo Verde' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Modo Quadra' }));
    unmount();
    expect(onCourtModeChange).toHaveBeenLastCalledWith(false);
  } finally { size.mockRestore(); }
});

test('duas partidas na mesma rodada são enviadas separadamente e com o total correto', async () => {
  const one = {number:1,blackScore:2,greenScore:0,winner:'black',teamBlack:['Atleta Preto'],
    teamGreen:['Atleta Verde'],playerStats:{'Atleta Preto':{pts2:1,pts3:0,reb:1,ast:0,blk:0},
      'Atleta Verde':{pts2:0,pts3:0,reb:0,ast:0,blk:0}}};
  const two = {number:2,blackScore:3,greenScore:0,winner:'black',teamBlack:['Atleta Preto'],
    teamGreen:['Atleta Verde'],playerStats:{'Atleta Preto':{pts2:0,pts3:1,reb:2,ast:1,blk:0},
      'Atleta Verde':{pts2:0,pts3:0,reb:0,ast:0,blk:0}}};
  localStorage.setItem('cba_mesario_backup_v2', JSON.stringify({
    ...backup,isLive:false,gameNumber:3,gameHistory:[one,two],
    dayStats:{'Atleta Preto':{pts2:1,pts3:1,reb:3,ast:1,blk:0},
      'Atleta Verde':{pts2:0,pts3:0,reb:0,ast:0,blk:0}}
  }));
  gatewayPost.mockResolvedValue({result:'success'});
  await open();
  fireEvent.click(screen.getByRole('button', {name:'Encerrar sessão'}));
  fireEvent.click(screen.getByRole('button', {name:'Salvar súmula'}));
  await waitFor(() => expect(gatewayPost).toHaveBeenCalledTimes(1));
  const [,payload] = gatewayPost.mock.calls[0];
  expect(payload.date).toBe('2026-10-13');
  expect(payload.matches).toHaveLength(2);
  expect(payload.matches.map(m => m.number)).toEqual([1,2]);
  expect(payload.stats.find(s => s.playerName === 'Atleta Preto')).toMatchObject({
    pts2:1,pts3:1,reb:3,ast:1
  });
});
