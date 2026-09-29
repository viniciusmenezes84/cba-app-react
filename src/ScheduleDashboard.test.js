import { fireEvent, render, screen } from '@testing-library/react';
import ScheduleDashboard from './ScheduleDashboard';
import { portalPost } from './cbaApi';

jest.mock('./cbaApi', () => ({ portalPost: jest.fn(), gatewayPost: jest.fn(), readSession: () => null }));

test('falha do portal permite tentar novamente sem travar a aba Eventos', async () => {
  portalPost.mockRejectedValueOnce(new Error('Conexão indisponível'))
    .mockResolvedValueOnce({ user: { name: 'Ana', role: 'MEMBER' }, events: [] });
  render(<ScheduleDashboard tab="eventos" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Conexão indisponível');
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Nenhum evento agendado')).toBeInTheDocument();
  expect(portalPost).toHaveBeenCalledTimes(2);
});
