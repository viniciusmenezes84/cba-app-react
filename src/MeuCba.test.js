import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MeuCba from './MeuCba';
import HomeDashboard from './HomeDashboard';
import { InitialDataContext } from './InitialDataContext';
import { buildMySeason } from './myCbaStats';
import { portalPost } from './cbaApi';
jest.mock('./cbaApi', () => ({ portalPost: jest.fn() }));
jest.mock('./AthleteCardModal', () => ({ athlete, onClose }) => <div role="dialog">Card de {athlete.name}{athlete.achievement?.title && <span>Conquista: {athlete.achievement.title}</span>}<button onClick={onClose}>Fechar card</button></div>);
const data = {
  profile: { athleteId: 'own', name: 'Atleta', nickname: '', photoUrl: '', position: 'Pivô', jerseyNumber: '00' },
  attendance: [{ attendance_date: '2026-01-01', status: 'present' }, { attendance_date: '2026-01-08', status: 'absent' }, { attendance_date: '2026-01-15', status: 'na' }],
  stats: [{ stat_date: '2026-01-01', pts2: 3, pts3: 2, reb: 5, ast: 1, blk: 2 }]
};
beforeEach(() => portalPost.mockReset());
test('temporada preserva faltas no denominador e não conta N/A; pontos são cestas convertidas', () => {
  expect(buildMySeason(data)).toMatchObject({ totals: { pts: 12 }, attendanceRate: 50, validDates: 2, presences: 1, statDates: 1, numero: '00' });
  expect(buildMySeason({ profile: data.profile })).toMatchObject({ attendanceRate: null, statDates: 0 });
});
test('perfil salva somente campos próprios, mantém dados após erro e permite abrir o card atualizado', async () => {
  portalPost.mockResolvedValueOnce(data).mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValueOnce({ profile: { ...data.profile, nickname: 'Gigante' } });
  const onSaved = jest.fn();
  render(<MeuCba onBack={jest.fn()} onOpenAgenda={jest.fn()} onProfileSaved={onSaved} />);
  expect(await screen.findByText('50%')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Editar meu perfil'));
  fireEvent.change(screen.getByLabelText('Apelido'), { target: { value: 'Gigante' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão');
  expect(screen.getByLabelText('Apelido')).toHaveValue('Gigante');
  fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Perfil atualizado');
  expect(portalPost).toHaveBeenLastCalledWith('updateMyProfile', { nickname: 'Gigante', position: 'Pivô', jerseyNumber: '00' });
  expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ nickname: 'Gigante' }));
  fireEvent.click(screen.getByText('Meu card da temporada'));
  expect(await screen.findByRole('dialog')).toHaveTextContent('Card de Gigante');
});
test('conta sem vínculo exibe orientação e mantém saída disponível', async () => {
  portalPost.mockRejectedValueOnce(new Error('Sua conta ainda não está vinculada a um atleta. Procure a administração.'));
  const onBack = jest.fn();
  render(<MeuCba onBack={onBack} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('não está vinculada');
  expect(screen.queryByText('Salvar perfil')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Voltar ao Início'));
  expect(onBack).toHaveBeenCalled();
});
test('Início abre Meu CBA, salva apelido, atualiza saudação e acessa agenda', async () => {
  portalPost.mockResolvedValueOnce({ user: { name: 'Atleta' } }).mockResolvedValueOnce(data).mockResolvedValueOnce({ profile: { ...data.profile, nickname: 'Gigante' } }).mockResolvedValueOnce(data);
  const profileSaved = jest.fn();
  render(<HomeDashboard onNavigate={jest.fn()} onProfileSaved={profileSaved} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir Meu CBA' }));
  expect(await screen.findByText('50%')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Editar meu perfil'));
  fireEvent.change(screen.getByLabelText('Apelido'), { target: { value: 'Gigante' } });
  fireEvent.click(screen.getByText('Salvar perfil'));
  await screen.findByText('Perfil atualizado com sucesso.');
  expect(profileSaved).toHaveBeenCalledWith(expect.objectContaining({ nickname: 'Gigante', photoUrl: '' }));
  fireEvent.click(screen.getByText('Voltar ao Início'));
  expect(screen.getByRole('heading', { name: 'Olá, Gigante' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir Meu CBA' }));
  await screen.findByText('50%');
  fireEvent.click(screen.getByText('Minha agenda'));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Minha agenda' })).toBeInTheDocument());
});


test('conquistas acompanham o ano selecionado e o card recebe somente prêmio alcançado', async () => {
  portalPost.mockImplementation(async (_, payload) => payload.year === 2025
    ? { ...data, attendance: [], stats: [] } : data);
  render(<InitialDataContext.Provider value={{ dashboard: { dates: ['2025-01-01'], players: [] } }}><MeuCba onBack={jest.fn()} /></InitialDataContext.Provider>);
  expect(await screen.findByText('1 de 6 · 2026')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver conquista no meu card' }));
  expect(await screen.findByRole('dialog')).toHaveTextContent('Conquista: De volta à quadra');
  fireEvent.click(screen.getByRole('button', { name: 'Fechar card' }));
  fireEvent.change(screen.getByLabelText('Temporada'), { target: { value: '2025' } });
  expect(await screen.findByText('0 de 6 · 2025')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ver conquista no meu card' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Meu card da temporada' }));
  expect(await screen.findByRole('dialog')).not.toHaveTextContent('Conquista:');
  expect(portalPost.mock.calls.map(call => call[0])).toEqual(['getMyProfile', 'getMyProfile']);
});
