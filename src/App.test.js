import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

test('Departamento Médico abre diretamente e preserva a restrição dos detalhes', async () => {
  const token = 'sessao-medica-de-teste';
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { role: 'MEMBER', email: 'atleta@cba.test', name: 'Atleta', token }, savedAt: Date.now()
  }));
  window.localStorage.setItem('cba_last_tab_v1', 'dm');
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async (url, options) => {
    const body = JSON.parse(options.body);
    expect(body.token).toBe(token);
    if (body.action === 'getInitialAppData') {
      expect(url).toContain('/cba-gateway');
      return { ok: true, json: async () => ({ data: { dashboard: { players: [], dates: [] }, finance: {} } }) };
    }
    expect(url).toContain('/cba-medical');
    expect(body.action).toBe('bootstrap');
    return { ok: true, json: async () => ({ isAdmin: false, athletes: [], records: [{
      id: 'restrito-1', playerName: 'Outro Atleta', status: 'Fisioterapia', canViewDetails: false
    }] }) };
  });
  try {
    const { container } = render(<App />);
    expect(await screen.findByText('Disponibilidade do elenco')).toBeInTheDocument();
    expect(screen.getByText('Outro Atleta')).toBeInTheDocument();
    expect(screen.getByText('Detalhes médicos restritos. Status operacional disponível.')).toBeInTheDocument();
    expect(screen.queryByText('Entorse no Tornozelo Direito')).not.toBeInTheDocument();
    expect(container.querySelector('[data-dm-dashboard-v2]')).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByText('Outro Atleta'));
    expect(screen.getByText(/Por privacidade, você pode ver apenas o status operacional/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dar alta' })).not.toBeInTheDocument();
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
    window.localStorage.removeItem('cba_last_tab_v1');
  }
});

test('Mesário recupera a sessão antiga, mantém o placar e atualiza os dados após salvar', async () => {
  const token = 'sessao-mesario-de-teste';
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { role: 'ADMIN', email: 'admin@cba.test', name: 'Admin', token }, savedAt: Date.now()
  }));
  window.localStorage.setItem('cba_last_tab_v1', 'mesario');
  window.localStorage.setItem('cba_mesario_backup', JSON.stringify({
    date: '2026-09-29', isLive: false, teamBlack: ['Atleta Um'], teamGreen: ['Atleta Dois'], dayStats: {}, matchStats: {}
  }));
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async (url, options) => {
    const body = JSON.parse(options.body);
    expect(url).toContain('/cba-gateway');
    expect(body.token).toBe(token);
    if (body.action === 'saveMatchStats') {
      expect(body.date).toBe('2026-09-29');
      expect(body.stats).toEqual(expect.arrayContaining([
        expect.objectContaining({ playerName: 'Atleta Um', pts2: 1, pts3: 0 })
      ]));
      return { ok: true, json: async () => ({ result: 'success' }) };
    }
    if (body.action === 'getInitialAppData') return { ok: true, json: async () => ({ data: {
      dashboard: { players: [{ name: 'Atleta Um', attendance: {} }, { name: 'Atleta Dois', attendance: {} }], dates: [] }, finance: {}
    } }) };
    return { ok: true, json: async () => ({ result: 'success' }) };
  });
  try {
    render(<App />);
    expect(await screen.findByText('Sessão não encerrada encontrada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar sessão' }));
    expect(window.localStorage.getItem('cba_mesario_backup')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ir para a quadra' }));
    const card = screen.getByText('Atleta Um').closest('.rounded-2xl');
    fireEvent.click(within(card).getByRole('button', { name: /\+2/ }));
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem('cba_mesario_backup_v2')).matchStats['Atleta Um'].pts2).toBe(1));
    fireEvent.click(screen.getAllByRole('button', { name: 'Presença' }).at(-1));
    await waitFor(() => expect(screen.queryByText('Mesa digital CBA')).not.toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Mesário'));
    expect(await screen.findByText('Sessão não encerrada encontrada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar sessão' }));
    expect(screen.getByRole('button', { name: /\+2 1/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar partida' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar resultado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar sessão' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar súmula' }));
    expect(await screen.findByText('Súmula salva')).toBeInTheDocument();
    expect(window.localStorage.getItem('cba_mesario_backup_v2')).toBeNull();
    await waitFor(() => expect(global.fetch.mock.calls.filter(([, options]) => JSON.parse(options.body).action === 'getInitialAppData')).toHaveLength(2));
    expect(global.fetch.mock.calls.filter(([, options]) => JSON.parse(options.body).action === 'saveMatchStats')).toHaveLength(1);
  } finally {
    global.fetch = previousFetch;
    ['cba_session_v1', 'cba_last_tab_v1', 'cba_mesario_backup', 'cba_mesario_backup_v2'].forEach(key => window.localStorage.removeItem(key));
  }
}, 15000);

test('menu móvel abre o Sorteio diretamente e usa os dados iniciais', async () => {
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
    expect(global.fetch.mock.calls.filter(([, options]) => JSON.parse(options.body).action === 'getInitialAppData')).toHaveLength(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'Jogos' }).at(-1));
    expect(await screen.findByRole('button', { name: 'Abrir menu de navegação' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Monte os times em poucos toques')).not.toBeInTheDocument());
    expect(global.fetch.mock.calls.filter(([, options]) => JSON.parse(options.body).action === 'getInitialAppData')).toHaveLength(1);
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

test('Relatórios abre diretamente com dados iniciais e filtros compartilhados', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { role: 'MEMBER', email: 'atleta@cba.test', name: 'Atleta', token: 'sessao-de-teste' }, savedAt: Date.now()
  }));
  window.localStorage.setItem('cba_last_tab_v1', 'relatorios');
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ data: {
    dashboard: { players: [{ name: 'Ana', attendance: { '2026-04-05': '✅' }, dailyStats: {} }], dates: ['2026-04-05'] }, finance: {}
  } }) }));
  try {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Central de Relatórios 2026' })).toBeInTheDocument();
    expect(screen.getByLabelText('Temporada')).toHaveValue('2026');
    expect(screen.getByLabelText('Atleta')).toHaveValue('todos');
    expect(screen.getByText('Súmulas por data')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
    window.localStorage.removeItem('cba_last_tab_v1');
  }
});


test('Início abre diretamente, sem ponte pelo DOM, e os atalhos mudam de aba', async () => {
  window.localStorage.setItem('cba_session_v1', JSON.stringify({
    user: { role: 'MEMBER', email: 'atleta@cba.test', name: 'Atleta', token: 'sessao-de-teste' }, savedAt: Date.now()
  }));
  window.localStorage.setItem('cba_last_tab_v1', 'inicio');
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async (url, options) => {
    const { action } = JSON.parse(options.body);
    if (action === 'getInitialAppData') return { ok: true, json: async () => ({ data: { dashboard: { players: [], dates: [] }, finance: { summary: { balance: 0, revenue: 0, expense: 0 }, paymentStatus: [], paymentHeaders: [] } } }) };
    if (action === 'bootstrap') return { ok: true, json: async () => ({ result: 'success', user: { name: 'Atleta' }, games: [], events: [], notifications: [], finance: { ownerAthleteId: 'own', periods: [], dues: [] }, overview: {} }) };
    throw new Error(`Ação inesperada: ${action}`);
  });
  try {
    const { container } = render(<App />);
    expect(await screen.findByRole('heading', { name: 'Olá, Atleta' })).toBeInTheDocument();
    expect(container.querySelector('[data-cba-home-anchor]')).toBeNull();
    expect(container.querySelector('[data-portal-experience-v3]')).toBeNull();
    expect(global.fetch.mock.calls.map(([, options]) => JSON.parse(options.body).action)).toEqual(['getInitialAppData', 'bootstrap']);
    fireEvent.click(screen.getByRole('button', { name: 'Ver financeiro' }));
    expect(await screen.findByText('Situação Anual')).toBeInTheDocument();
  } finally {
    global.fetch = previousFetch;
    window.localStorage.removeItem('cba_session_v1');
    window.localStorage.removeItem('cba_last_tab_v1');
  }
});
