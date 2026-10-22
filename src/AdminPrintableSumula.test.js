import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminDashboardBridge from './AdminDashboardBridge';
import { adminPost, readSession } from './cbaApi';
import { buildPrintableSumulaPdf } from './PrintableSumulaPdf';

jest.mock('./cbaApi', () => ({
  adminPost: jest.fn(),
  readSession: jest.fn()
}));
const save = jest.fn();
jest.mock('./PrintableSumulaPdf', () => ({
  buildPrintableSumulaPdf: jest.fn(() => ({ save: jest.fn() }))
}));

beforeEach(() => {
  readSession.mockReturnValue({ role: 'ADMIN', token: 'admin-validado' });
  adminPost.mockReset();
  adminPost.mockResolvedValue({
    data: { overview: { activeAthletes: 2 }, athletes: [
      { name: 'Primeiro', active: true }, { name: 'Segundo', active: true }
    ], audit: [], accounts: [] }
  });
  buildPrintableSumulaPdf.mockReset();
  buildPrintableSumulaPdf.mockImplementation(() => ({ save }));
  save.mockReset();
});

test('ADM encontra o download em Administração e gera PDF do cadastro atualizado', async () => {
  const { unmount } = render(<AdminDashboardBridge open />);
  expect(await screen.findByText('Central de Administração')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Baixar súmula PDF' }));
  expect(await screen.findByRole('heading', { name: 'Documentos e impressões' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Baixar súmula PDF' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('CBA_Sumula.pdf'));
  expect(adminPost).toHaveBeenCalledWith('bootstrap');
  expect(buildPrintableSumulaPdf).toHaveBeenCalledWith([
    { name: 'Primeiro', active: true }, { name: 'Segundo', active: true }
  ]);
  unmount();
});

test('perfil MEMBER não recebe interface de Administração', () => {
  readSession.mockReturnValue({ role: 'MEMBER' });
  const { container, unmount } = render(<AdminDashboardBridge open />);
  expect(container).toBeEmptyDOMElement();
  expect(screen.queryByRole('button', { name: 'Baixar súmula PDF' })).not.toBeInTheDocument();
  unmount();
});

test('falha na revalidação administrativa impede baixar PDF', async () => {
  const { unmount } = render(<AdminDashboardBridge open />);
  expect(await screen.findByText('Central de Administração')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Baixar súmula PDF' }));
  adminPost.mockRejectedValueOnce(new Error('Acesso administrativo não autorizado.'));
  fireEvent.click(screen.getByRole('button', { name: 'Baixar súmula PDF' }));
  expect(await screen.findByText('Acesso administrativo não autorizado.')).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
  unmount();
});
