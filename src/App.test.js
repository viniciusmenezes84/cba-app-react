import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('react-chartjs-2', () => ({ Bar: () => null, Doughnut: () => null, Line: () => null }));

test('mostra a entrada do Portal CBA', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: 'Entrar no Portal' })).toBeInTheDocument();
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
