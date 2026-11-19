import { fireEvent, render, screen, within } from '@testing-library/react';
import IdealTeam from './IdealTeam';
import { buildIdealTeam } from './idealTeamData';
jest.mock('./IdealTeamCardModal', () => ({ team, onClose }) => <div role="dialog">Rodada {team.date}: {team.slots.map(slot => slot.athlete?.name || 'Sem destaque').join(', ')}<button onClick={onClose}>Fechar time</button></div>);

test('exibe cinco coroas, apelidos e notas reais; botão abre o card coletivo correto', async () => {
  const players = ['Ana', 'Bia', 'Cris', 'Dani', 'Eva'].map((name, index) => ({ id: index, name,
    nickname: index === 0 ? 'Armadora' : '', fotoUrl: `https://photo.test/${index}.jpg`,
    dailyStats: { '2026-11-15': { pts2: 10 - index, pts3: 0, reb: 8 - index, ast: 7 - index, blk: 4 - index } } }));
  const team = buildIdealTeam(players, null, '2026-11-18');
  const { container } = render(<IdealTeam team={team} year="2026"/>);
  expect(screen.getAllByRole('article')).toHaveLength(5);
  expect(container.querySelectorAll('.lucide-crown')).toHaveLength(5);
  expect(screen.getByText('Armadora')).toBeInTheDocument();
  const rebounds = within(screen.getByRole('article', { name: 'Rebotes' }));
  expect(rebounds.getByText(/2ª maior marca em rebotes · Selecionado para evitar repetição/)).toBeInTheDocument();
  fireEvent.error(screen.getByRole('img', { name: 'Foto de Armadora' }));
  expect(screen.queryByRole('img', { name: 'Foto de Armadora' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar time ideal da rodada' }));
  expect(await screen.findByRole('dialog')).toHaveTextContent('Rodada 2026-11-15: Armadora, Bia, Cris, Dani, Eva');
  fireEvent.click(screen.getByText('Fechar time'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('poucos atletas e zeros preservam os quatro espaços, com explicações', () => {
  const team = buildIdealTeam([{ id: 1, name: 'Ana', dailyStats: { '2026-11-15': { pts2: 1, pts3: 0, reb: 3, ast: 0 } } }], null, '2026-11-18');
  render(<IdealTeam team={team} year="2026"/>);
  expect(screen.getAllByRole('article')).toHaveLength(5);
  expect(screen.getByText('Sem outro atleta com marca positiva disponível.')).toBeInTheDocument();
  expect(screen.getByText('Marcas registradas zeradas nesta categoria.')).toBeInTheDocument();
  expect(screen.getByText('Sem marca registrada nesta categoria.')).toBeInTheDocument();
});
