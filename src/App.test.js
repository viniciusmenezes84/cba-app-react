import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('react-chartjs-2', () => ({ Bar: () => null, Doughnut: () => null, Line: () => null }));

test('mostra a entrada do Portal CBA', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: 'Entrar no Portal' })).toBeInTheDocument();
});

test('login entra pelo gateway e carrega os painéis com a sessão recebida', async () => {
  const token = 'c'.repeat(64);
  const previousFetch = global.fetch;
  global.fetch = jest.fn((url, options) => {
    const body = JSON.parse(options.body);
    expect(url).toBe('https://vqirdswgchlcxevepamu.supabase.co/functions/v1/cba-gateway');
    if (body.action === 'loginUser') {
      expect(body.token).toBeUndefined();
      return Promise.resolve({ ok: true, json: async () => ({ status: 'approved', role: 'MEMBER', name: 'Atleta', email: 'atleta@cba.test', token }) });
    }
    expect(body).toMatchObject({ action: 'getInitialAppData', token });
    return new Promise(() => {});
  });
  try {
    render(<App />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'atleta@cba.test' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-de-teste' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar no Portal' }));
    expect(await screen.findByText('Carregando dados na quadra...')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(window.localStorage.getItem('cba_session_v1')).user.token).toBe(token);
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});

test('administrador acessa o painel diretamente pela barra inferior', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { role: 'ADMIN', email: 'admin@cba.test', name: 'Admin', token: 'sessao-de-teste' }, savedAt: Date.now()
  }));
  const previousFetch = global.fetch;
  global.fetch = jest.fn(() => new Promise(() => {}));
  try {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Administração' }));
    expect(await screen.findByRole('dialog', { name: 'Administração' })).toBeInTheDocument();
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});

test('uma falha inicial oferece nova tentativa', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { role: 'MEMBER', email: 'atleta@cba.test', name: 'Atleta', token: 'sessao-de-teste' }, savedAt: Date.now()
  }));
  const previousFetch = global.fetch;
  global.fetch = jest.fn().mockRejectedValueOnce(new Error('Conexão indisponível'))
    .mockImplementation(() => new Promise(() => {}));
  try {
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o portal');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});

test('o painel de presença usa os dados iniciais sem repetir a consulta', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { role: 'MEMBER', email: 'atleta@cba.test', name: 'Atleta', token: 'sessao-de-teste' }, savedAt: Date.now()
  }));
  window.localStorage.setItem('cba_last_tab_v1', 'presenca');
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ data: { dashboard: { players: [], dates: [] }, finance: {} } }) }));
  try {
    render(<App />);
    expect(await screen.findByText(/Visão do elenco em/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
    window.localStorage.removeItem('cba_last_tab_v1');
  }
});

test('menu móvel abre o Sorteio diretamente, rola até o fim e volta sem nova consulta', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { role: 'MEMBER', email: 'atleta@cba.test', name: 'Atleta', token: 'sessao-de-teste' }, savedAt: Date.now()
  }));
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({
    data: { dashboard: { players: [{ name: 'Atleta Teste', posicao: 'Armador', attendance: {} }], dates: [] }, finance: {} }
  }) }));
  try {
    const { container } = render(<App />);
    expect(await screen.findByRole('button', { name: 'Abrir menu de navegação' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Menu principal' })).toHaveClass('overflow-y-auto');
    container.querySelector('main').scrollTop = 200;
    fireEvent.click(screen.getByTitle('Sorteio'));
    expect(await screen.findByText('Monte os times em poucos toques')).toBeInTheDocument();
    expect(screen.getByText('Atleta Teste')).toBeInTheDocument();
    expect(container.querySelector('main').scrollTop).toBe(0);
    expect(screen.getByRole('button', { name: 'Abrir menu de navegação' })).toHaveAttribute('aria-expanded', 'false');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'Jogos' }).at(-1));
    expect(await screen.findByRole('button', { name: 'Abrir menu de navegação' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Monte os times em poucos toques')).not.toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledTimes(2);
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
    window.localStorage.removeItem('cba_last_tab_v1');
  }
});

test('sair revoga a sessão no servidor antes de limpar o dispositivo', async () => {
  const token = 'a'.repeat(64);
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { role: 'MEMBER', email: 'atleta@cba.test', name: 'Atleta', token }, savedAt: Date.now()
  }));
  const previousFetch = global.fetch;
  global.fetch = jest.fn((_, options) => {
    const body = JSON.parse(options.body);
    if (body.action === 'logoutUser') {
      expect(body.token).toBe(token);
      expect(window.localStorage.getItem('cba_session_v1')).not.toBeNull();
      return Promise.resolve({ ok: true, json: async () => ({ result: 'success' }) });
    }
    return new Promise(() => {});
  });
  try {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByRole('button', { name: 'Entrar no Portal' })).toBeInTheDocument();
    expect(window.localStorage.getItem('cba_session_v1')).toBeNull();
    expect(global.fetch.mock.calls.some(([, options]) => JSON.parse(options.body).action === 'logoutUser')).toBe(true);
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});

test('falha na revogação limpa a sessão local e avisa o usuário', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { role: 'MEMBER', email: 'atleta@cba.test', name: 'Atleta', token: 'b'.repeat(64) }, savedAt: Date.now()
  }));
  const previousFetch = global.fetch;
  global.fetch = jest.fn((_, options) => JSON.parse(options.body).action === 'logoutUser'
    ? Promise.reject(new Error('Offline')) : new Promise(() => {}));
  const previousError = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByText(/não foi possível confirmar o encerramento da sessão no servidor/i)).toBeInTheDocument();
    expect(window.localStorage.getItem('cba_session_v1')).toBeNull();
  } finally {
    previousError.mockRestore();
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
  }
});
