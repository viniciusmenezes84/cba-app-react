import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HallDaFamaTab } from './App';

jest.mock('react-chartjs-2', () => ({ Bar: () => null, Doughnut: () => null, Line: () => null }));

test('abre e fecha a memória do CBA dentro do Hall da Fama sem precisar de fotos', async () => {
  render(<HallDaFamaTab allPlayersData={[]} dates={[]} />);
  expect(screen.getByRole('heading', { name: 'Hall da Fama' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Conheça nossa história' }));
  expect(await screen.findByRole('heading', { name: 'Uma amizade que voltou para a quadra.' })).toBeInTheDocument();
  expect(screen.getByText('Lucas Portugal')).toBeInTheDocument();
  expect(screen.getByText('Neilor Leite')).toBeInTheDocument();
  expect(screen.getByText('Alysson Costa')).toBeInTheDocument();
  expect(screen.getByText('Vinicius Menezes')).toBeInTheDocument();
  expect(screen.getByText(/cabo de vassoura/)).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Voltar ao Hall da Fama' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Hall da Fama' })).toBeInTheDocument());
});
