import { fireEvent, render, screen } from '@testing-library/react';
import AdminDashboardBridge from './AdminDashboardBridge';

test('expõe Administração como opção do menu e permite abri-la', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { email: 'vinicius.m84@gmail.com', token: 'sessao-de-teste' }
  }));
  const previousFetch = global.fetch;
  global.fetch = jest.fn(() => new Promise(() => {}));

  try {
    render(<>
      <nav aria-label="Menu principal"><button title="Presença">Presença</button></nav>
      <AdminDashboardBridge />
    </>);
    const access = await screen.findByRole('button', { name: 'Abrir Administração' });
    expect(access).toHaveTextContent('Administração');
    expect(access.closest('nav')).toHaveAttribute('aria-label', 'Menu principal');

    fireEvent.click(access);
    expect(screen.getByText('Carregando administração...')).toBeInTheDocument();
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});
