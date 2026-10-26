import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import InteligenciaCBAPanel from './InteligenciaCBAPanel';
import {adminPost} from './cbaApi';

jest.mock('./cbaApi',()=>({adminPost:jest.fn()}));

const result={
 year:2026,generatedAt:'2026-10-26T12:00:00Z',truncated:false,
 engagement:{
  activeAthletes:37,approvedAccounts:3,onboardedActiveAthletes:3,
  sessions:6,distinctLoginUsers:2,deviceCounts:{celular:4,desktop:2},
  tabCounts:{inicio:7,relatorios:7},consentedUsers:1,usageEvents:14
 },
 attendance:{
  records:2144,legacyRecords:1987,dates:61,totalPresent:857,
  recentEstimate:16,recentCount:4,
  recentDates:[{date:'2026-09-13',present:13},{date:'2026-09-20',present:13},{date:'2026-10-11',present:17},{date:'2026-10-18',present:21}],
  monthly:[{month:'2026-09',dates:3,present:39},{month:'2026-10',dates:2,present:38}],
  leaderboard:[{name:'Jogador Um',present:10,registered:12,rate:83}]
 },
 sports:{
  matches:5,matchDays:1,statAthletes:20,scorePoints:73,
  performers:[{name:'Jogador Dois',games:3,points:22,avgPoints:7.3,rebounds:4,assists:2}],
  coverageNote:'Amostra limitada: mais partidas necessárias'
 },
 finance:{
  due:9840,paid:1640,dues:492,overdue:410,receipts:1700,expenses:500,
  ledgerBalance:1200,
  monthly:[{month:'2026-10',revenue:1700,expense:500}],
  note:'Mensalidades e lançamentos financeiros são fontes distintas.'
 }
};

beforeEach(()=>{adminPost.mockReset();adminPost.mockResolvedValue({result:'success',data:result});});

test('Inteligência CBA mostra KPIs e alterna quatro painéis usando respostas reais do gateway', async()=>{
 render(<InteligenciaCBAPanel/>);
 expect(await screen.findByText('Inteligência CBA')).toBeInTheDocument();
 await waitFor(()=>expect(adminPost).toHaveBeenCalledWith('intelligenceDashboard',{year:new Date().getFullYear()}));
 expect(screen.getByText('Adoção do portal')).toBeInTheDocument();
 expect(screen.getByText('Último encontro registrado')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Engajamento'}));
 expect(screen.getByText('Abas mais visitadas')).toBeInTheDocument();
 expect(screen.getByText(/Somente 1 conta/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Presenças'}));
 expect(screen.getByText('Evolução recente de presença')).toBeInTheDocument();
 expect(screen.getByText('Jogador Um')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Esportivo'}));
 expect(screen.getByText('Desempenho por partida')).toBeInTheDocument();
 expect(screen.getByText('Jogador Dois')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Gestão'}));
 expect(screen.getByText('Receitas por mês')).toBeInTheDocument();
 expect(screen.getByText(/Mensalidades não pagas não significam necessariamente inadimplência/)).toBeInTheDocument();
});

test('filtro de temporada solicita dados de novo e informa falha quando o backend nega',async()=>{
 render(<InteligenciaCBAPanel/>);
 await screen.findByText('Adoção do portal');
 expect(screen.getByRole('combobox',{name:'Ano da Inteligência CBA'})).toBeInTheDocument();
 adminPost.mockRejectedValueOnce(new Error('Acesso restrito ao SUPER_ADMIN'));
 fireEvent.change(screen.getByRole('combobox',{name:'Ano da Inteligência CBA'}),{target:{value:'2025'}});
 expect(await screen.findByRole('alert')).toHaveTextContent('Acesso restrito ao SUPER_ADMIN');
 expect(adminPost).toHaveBeenLastCalledWith('intelligenceDashboard',{year:2025});
});
