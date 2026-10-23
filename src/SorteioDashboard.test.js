import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SorteioDashboard from './SorteioDashboard';
import { gatewayPost } from './cbaApi';

jest.mock('./cbaApi', () => ({ gatewayPost: jest.fn() }));
const players = Array.from({length: 12}, (_,index) => ({
  id: 'athlete-' + (index+1),
  name: 'Jogador ' + String(index+1).padStart(2,'0'),
  posicao: index%3 === 0 ? 'Armador' : index%3 === 1 ? 'Pivô' : 'Ala',
  attendance: {},
  dailyStats: {}
}));

beforeEach(() => { window.localStorage.clear(); gatewayPost.mockReset(); });
afterEach(() => window.localStorage.clear());

function selectAndContinue() {
  fireEvent.click(screen.getByRole('button',{name:'Selecionar todos'}));
  fireEvent.click(screen.getAllByRole('button',{name:/Continuar/})[0]);
}

function drawTeams(props = {}) {
  render(<SorteioDashboard players={players} dates={[]} {...props} />);
  selectAndContinue();
  fireEvent.click(screen.getByRole('button',{name:'Gerar Preto x Verde'}));
  expect(screen.getByText('3. Preto x Verde')).toBeInTheDocument();
  expect(screen.getByText('Reservas · 2')).toBeInTheDocument();
}

test('MEMBER autorizado vê a formação de equipes e salva 5x5 pela API do gateway', async () => {
  gatewayPost.mockResolvedValue({result:'success'});
  drawTeams({canSaveTeams:true});
  fireEvent.click(screen.getByRole('button',{name:'Salvar sorteio'}));
  await waitFor(() => expect(gatewayPost).toHaveBeenCalledTimes(1));
  const [action,payload] = gatewayPost.mock.calls[0];
  expect(action).toBe('saveTeams');
  const black = payload.teamBlack.split(',');
  const green = payload.teamRed.split(',');
  expect(black).toHaveLength(5);
  expect(green).toHaveLength(5);
  expect(new Set([...black,...green]).size).toBe(10);
  expect(await screen.findByText('Sorteio salvo com sucesso no Supabase.')).toBeInTheDocument();
  expect(window.localStorage.getItem('cba_sorteio_history_v2')).toContain('Jogador');
});

test('sem permissão de gravação, continua possível visualizar e compartilhar sorteios sem salvar', () => {
  drawTeams();
  expect(screen.queryByRole('button',{name:'Salvar sorteio'})).not.toBeInTheDocument();
  expect(screen.getByText(/Seu perfil pode consultar e compartilhar o sorteio/)).toBeInTheDocument();
  expect(gatewayPost).not.toHaveBeenCalled();
});

test('o sorteio avulso continua independente do salvamento 5x5', () => {
  render(<SorteioDashboard players={players} dates={[]} canSaveTeams />);
  selectAndContinue();
  fireEvent.click(screen.getByRole('button',{name:'Sortear 1 nome'}));
  expect(screen.getByText('3. Sorteio avulso')).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Salvar sorteio'})).not.toBeInTheDocument();
  expect(gatewayPost).not.toHaveBeenCalled();
});
