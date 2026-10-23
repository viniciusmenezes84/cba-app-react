import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import AccessMonitoringPanel from './AccessMonitoringPanel';
import {adminPost} from './cbaApi';
jest.mock('./cbaApi',()=>({adminPost:jest.fn()}));

test('monitoramento exibe atividade por conta, separando sessões e atividade recente',async()=>{
  adminPost.mockResolvedValue({data:{
    onlineUsers:1,sessionCount:3,knownUsers:2,
    consent:{yes:1,no:1},
    tabCounts:{inicio:6,presenca:3},
    dailyCounts:{'2026-10-23':9},
    note:'Registros posteriores à implantação',
    sessions:[{name:'Teste',email:'teste@example.test',role:'MEMBER',online:true,
      startedAt:'2026-10-23T10:00:00Z',lastActiveAt:'2026-10-23T10:01:00Z',
      device:'celular',os:'Android',browser:'Chrome',mode:'pwa',endedAt:null}]
  }});
  render(<AccessMonitoringPanel/>);
  expect(await screen.findByText('Monitoramento de acessos')).toBeInTheDocument();
  expect(await screen.findByText('Online agora')).toBeInTheDocument();
  expect(screen.getByText('Abas mais utilizadas (com autorização)')).toBeInTheDocument();
  expect(screen.getByText('Teste')).toBeInTheDocument();
  expect(screen.getByText('● Online')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox',{name:'Filtrar jogador ou dispositivo'}),{target:{value:'iPhone'}});
  expect(screen.getByText(/Ainda não há sessões registradas/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Atualizar dados'}));
  await waitFor(()=>expect(adminPost).toHaveBeenCalledTimes(2));
  expect(adminPost).toHaveBeenCalledWith('accessMonitoring');
});
