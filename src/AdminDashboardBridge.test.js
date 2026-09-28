import { fireEvent, render, screen } from '@testing-library/react';
import AdminDashboardBridge from './AdminDashboardBridge';

test('o painel publicado permite escolher módulos por nome no celular', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { email: 'admin@cba.test', token: 'sessao-de-teste', role: 'ADMIN' }
  }));
  const previousFetch = global.fetch;
  global.fetch = jest.fn(() => new Promise(() => {}));
  const onClose = jest.fn();

  try {
    render(<AdminDashboardBridge open onClose={onClose} />);
    const dialog = await screen.findByRole('dialog', { name: 'Administração' });
    expect(dialog).toBeInTheDocument();
    const moduleSelect = screen.getByRole('combobox', { name: 'Área da administração' });
    expect(moduleSelect).toHaveValue('resumo');
    fireEvent.change(moduleSelect, { target: { value: 'financeiro' } });
    expect(moduleSelect).toHaveValue('financeiro');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar administração' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});
