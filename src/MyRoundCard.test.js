import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AthleteCardModal from './AthleteCardModal';

const athlete = { name: 'Francês', fotoUrl: '' };
const round = { date: '2025-10-18', pts: 15, reb: 4, ast: 2, blk: 1 };
let context, downloadName;
const originals = {};
const setNavigator = (key, value) => Object.defineProperty(navigator, key, { configurable: true, value });

beforeEach(() => {
  for (const key of ['share', 'canShare', 'clipboard']) originals[key] = Object.getOwnPropertyDescriptor(navigator, key);
  setNavigator('share', jest.fn().mockResolvedValue());
  setNavigator('canShare', jest.fn(() => true));
  setNavigator('clipboard', { writeText: jest.fn().mockResolvedValue() });
  context = {
    beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), arcTo: jest.fn(), closePath: jest.fn(),
    fill: jest.fn(), stroke: jest.fn(), fillRect: jest.fn(), drawImage: jest.fn(), clip: jest.fn(),
    save: jest.fn(), restore: jest.fn(), fillText: jest.fn(),
    measureText: text => ({ width: text.length * 28 }),
    createLinearGradient: () => ({ addColorStop: jest.fn() })
  };
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })));
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloadName = this.download; });
  URL.createObjectURL = jest.fn(() => 'blob:round');
  URL.revokeObjectURL = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
  for (const key of Object.keys(originals)) {
    if (originals[key]) Object.defineProperty(navigator, key, originals[key]);
    else delete navigator[key];
  }
});

test('desenha dados reais, baixa Post e Story e compartilha PNG com legenda e nome corretos', async () => {
  render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={jest.fn()} />);
  const canvas = screen.getByRole('img');
  expect(canvas).toHaveAttribute('width', '1080');
  expect(canvas).toHaveAttribute('height', '1350');
  const text = context.fillText.mock.calls.map(call => String(call[0]));
  for (const value of ['CBA', 'FRANCÊS', '18/10/2025', '15', '4', '2', '1', 'MEU DESEMPENHO NA RODADA']) expect(text).toContain(value);
  expect(text).not.toContain('PONTOS NA TEMPORADA');
  fireEvent.click(screen.getByRole('button', { name: 'Baixar PNG' }));
  expect(downloadName).toBe('cba-frances-2025-10-18-post.png');
  fireEvent.click(screen.getByRole('button', { name: 'Copiar legenda' }));
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Minha rodada no CBA em 18/10/2025: 15 pontos! 🏀 #CBA'));
  fireEvent.click(screen.getByRole('button', { name: 'Story · 1080 × 1920' }));
  expect(canvas).toHaveAttribute('height', '1920');
  expect(context.drawImage).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), 0, 290, 1080, 1350);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Compartilhar imagem' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar imagem' }));
  await waitFor(() => expect(navigator.share).toHaveBeenCalledWith({
    title: 'Minha rodada de 18/10/2025 • CBA', text: 'Minha rodada no CBA em 18/10/2025: 15 pontos! 🏀 #CBA',
    files: [expect.objectContaining({ name: 'cba-frances-2025-10-18-story.png', type: 'image/png' })]
  }));
  fireEvent.click(screen.getByRole('button', { name: 'Baixar PNG' }));
  expect(downloadName).toBe('cba-frances-2025-10-18-story.png');
  expect(navigator.canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
});

test.each(['no-share', 'no-canShare', 'false', 'throws'])('mantém download e legenda quando compartilhar arquivos não é suportado: %s', async mode => {
  if (mode === 'no-share') setNavigator('share', undefined);
  if (mode === 'no-canShare') setNavigator('canShare', undefined);
  if (mode === 'false') setNavigator('canShare', () => false);
  if (mode === 'throws') setNavigator('canShare', () => { throw new Error('Unsupported'); });
  render(<AthleteCardModal athlete={athlete} year="2025" round={{ ...round, pts: 0 }} onClose={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Compartilhar imagem' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Baixar PNG' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Baixar PNG' }));
  expect(downloadName).toBe('cba-frances-2025-10-18-post.png');
  expect(screen.getByLabelText('Legenda da rodada')).toHaveTextContent('0 pontos!');
});

test('cancelamento é silencioso e falha real orienta a baixar', async () => {
  navigator.share.mockRejectedValueOnce(Object.assign(new Error('Cancelado'), { name: 'AbortError' }));
  render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={jest.fn()} />);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Compartilhar imagem' })));
  expect(screen.queryByText(/Compartilhamento indisponível/)).not.toBeInTheDocument();
  navigator.share.mockRejectedValueOnce(new Error('Falha'));
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar imagem' }));
  expect(await screen.findByText('Compartilhamento indisponível. Use Baixar PNG.')).toBeInTheDocument();
});

test('clipboard indisponível mantém a legenda visível para cópia manual', async () => {
  setNavigator('clipboard', undefined);
  render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Copiar legenda' }));
  expect(await screen.findByText(/copie manualmente/)).toBeInTheDocument();
  expect(screen.getByLabelText('Legenda da rodada')).toHaveTextContent('15 pontos!');
});

test('foto CORS com erro usa inicial; exportação com erro e blob vazio não baixam arquivo', () => {
  const oldImage = global.Image;
  let photo;
  global.Image = class { constructor() { photo = this; } };
  try {
    render(<AthleteCardModal athlete={{ ...athlete, fotoUrl: 'https://photo.test/own.jpg' }} year="2025" round={round} onClose={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Baixar PNG' })).toBeDisabled();
    expect(photo.crossOrigin).toBe('anonymous');
    act(() => photo.onerror());
    expect(screen.getByRole('button', { name: 'Baixar PNG' })).toBeEnabled();
    expect(screen.getByText(/usando a inicial/)).toBeInTheDocument();
    HTMLCanvasElement.prototype.toBlob.mockImplementation(() => { throw new Error('Tainted canvas'); });
    fireEvent.click(screen.getByRole('button', { name: 'Baixar PNG' }));
    expect(screen.getByRole('status')).toHaveTextContent('Não foi possível exportar');
    HTMLCanvasElement.prototype.toBlob.mockImplementation(callback => callback(null));
    fireEvent.click(screen.getByRole('button', { name: 'Baixar PNG' }));
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  } finally { global.Image = oldImage; }
});

test('modal tem nome, foco inicial, contenção de Tab, Escape e restauração do foco', () => {
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  trigger.focus();
  const onClose = jest.fn();
  const { unmount } = render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={onClose} />);
  expect(screen.getByRole('dialog', { name: 'Card de Francês · 18/10/2025' })).toHaveAttribute('aria-modal', 'true');
  const close = screen.getByRole('button', { name: 'Fechar card' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
  expect(screen.getByRole('button', { name: 'Copiar legenda' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement, { key: 'Tab' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
  unmount();
  expect(trigger).toHaveFocus();
  trigger.remove();
});
