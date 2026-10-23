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

test('item Documentos e impressões permanece alinhado à esquerda mesmo com duas linhas', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { email: 'admin@cba.test', token: 'sessao-de-teste', role: 'ADMIN' }
  }));
  const previousFetch = global.fetch;
  global.fetch = jest.fn(() => new Promise(() => {}));
  try {
    render(<AdminDashboardBridge open />);
    const documents = await screen.findByRole('button', { name: 'Documentos e impressões' });
    expect(documents).toHaveClass('text-left');
    expect(documents.querySelector('svg')).toHaveClass('shrink-0');
    expect(documents.querySelector('span')).toHaveClass('min-w-0', 'flex-1', 'text-left');
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});

test('SUPER_ADMIN proprietário vê monitoramento, ADM comum não vê a área exclusiva', async () => {
  const previousFetch = global.fetch;
  global.fetch = jest.fn(() => new Promise(() => {}));
  try {
    window.localStorage.setItem('cba_session_v1', JSON.stringify({
      user:{email:'vinicius.m84@gmail.com',token:'sessao-super',role:'SUPER_ADMIN'}
    }));
    const {unmount}=render(<AdminDashboardBridge open />);
    expect(await screen.findByRole('button',{name:'Monitoramento de acessos'})).toBeInTheDocument();
    unmount();
    window.localStorage.setItem('cba_session_v1', JSON.stringify({
      user:{email:'soulucaspportugal1985@gmail.com',token:'sessao-admin',role:'ADMIN'}
    }));
    render(<AdminDashboardBridge open />);
    expect(screen.queryByRole('button',{name:'Monitoramento de acessos'})).not.toBeInTheDocument();
  } finally {
    global.fetch=previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});
