import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StatsModule } from './AdminDashboardBridge';
import { adminPost } from './cbaApi';

jest.mock('./cbaApi', () => ({
  adminPost: jest.fn(),
  readSession: jest.fn(() => ({role:'ADMIN', token:'mock-session'}))
}));

const getDate = () => new Date().toISOString().slice(0, 10);
const rows = [
  {athlete_id:'athlete-1',pts2:2,pts3:0,reb:1,ast:0,blk:0}
];

beforeEach(() => {
  adminPost.mockReset();
  adminPost.mockImplementation(async (action) => {
    if (action === 'statsByDate') return {
      result:'success', athletes:[{id:'athlete-1',name:'Atleta Teste'}],
      records:rows, matchCount:2
    };
    if (action === 'resetStatsByDate') return {
      result:'success',message:'Estatísticas e partidas desta data zeradas com cópia de segurança.',
      dailyRows:1,matches:2
    };
    throw Error('Ação inesperada: ' + action);
  });
});

test('Zerar exige confirmação digitada e envia somente a data selecionada', async () => {
  const notify=jest.fn(), setDirty=jest.fn();
  render(<StatsModule notify={notify} setDirty={setDirty}/>);
  const button=await screen.findByRole('button',{name:'Zerar estatísticas da data'});
  expect(button).toBeEnabled();
  expect(screen.getByText(/1 registro estatístico · 2 partidas salvas/)).toBeInTheDocument();
  fireEvent.click(button);
  expect(screen.getByRole('dialog',{name:'Confirmar limpeza da súmula'})).toBeInTheDocument();
  const confirm=screen.getByRole('button',{name:'Confirmar e zerar'});
  expect(confirm).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox',{name:'Confirmação para zerar'}),{target:{value:'ZERA'}});
  expect(confirm).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox',{name:'Confirmação para zerar'}),{target:{value:'ZERAR'}});
  expect(confirm).toBeEnabled();
  fireEvent.click(confirm);
  await waitFor(() => expect(adminPost).toHaveBeenCalledWith('resetStatsByDate',{
    date:getDate(),confirmation:'ZERAR'
  }));
  expect(setDirty).toHaveBeenCalledWith(true);
  await waitFor(() => expect(screen.queryByRole('dialog',{name:'Confirmar limpeza da súmula'})).not.toBeInTheDocument());
  expect(notify).toHaveBeenCalledWith(expect.stringContaining('zeradas'));
});

test('cancelamento não dispara limpeza', async () => {
  render(<StatsModule notify={jest.fn()} setDirty={jest.fn()}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Zerar estatísticas da data'}));
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));
  expect(screen.queryByRole('dialog',{name:'Confirmar limpeza da súmula'})).not.toBeInTheDocument();
  expect(adminPost.mock.calls.filter(([action])=>action==='resetStatsByDate')).toHaveLength(0);
});

test('botão de limpeza fica desabilitado sem estatísticas nem partidas para a data', async () => {
  adminPost.mockImplementation(async () => ({result:'success',athletes:[],records:[],matchCount:0}));
  render(<StatsModule notify={jest.fn()} setDirty={jest.fn()}/>);
  expect(await screen.findByRole('button',{name:'Zerar estatísticas da data'})).toBeDisabled();
});
