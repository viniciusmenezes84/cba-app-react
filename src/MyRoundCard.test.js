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
  fireEvent.click(screen.getByRole('button', { name: 'Escolher formato' }));
  fireEvent.click(screen.getByRole('menuitemradio', { name: 'Story' }));
  expect(canvas).toHaveAttribute('height', '1920');
  expect(context.drawImage).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), 0, 290, 1080, 1350);
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar no WhatsApp' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir seletor de aplicativos' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Abrir seletor de aplicativos' }));
  await waitFor(() => expect(navigator.share).toHaveBeenCalledWith({
    title: 'Minha rodada de 18/10/2025 • CBA', text: 'Minha rodada no CBA em 18/10/2025: 15 pontos! 🏀 #CBA',
    files: [expect.objectContaining({ name: 'cba-frances-2025-10-18-story.png', type: 'image/png' })]
  }));
  await screen.findByText('Conclua o envio no WhatsApp.');
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
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar no WhatsApp' }));
  expect(screen.queryByRole('button', { name: 'Abrir seletor de aplicativos' })).not.toBeInTheDocument();
  expect(screen.getByText(/Compartilhamento de imagem indisponível/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Baixar PNG' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Baixar PNG' }));
  expect(downloadName).toBe('cba-frances-2025-10-18-post.png');
  fireEvent.click(screen.getByRole('button', { name: 'Copiar legenda' }));
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('0 pontos!'));
  await screen.findByText('Legenda copiada.');
});

test('cancelamento é silencioso e falha real orienta a baixar', async () => {
  navigator.share.mockRejectedValueOnce(Object.assign(new Error('Cancelado'), { name: 'AbortError' }));
  render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar no WhatsApp' }));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Abrir seletor de aplicativos' })));
  expect(screen.queryByText(/Compartilhamento indisponível/)).not.toBeInTheDocument();
  navigator.share.mockRejectedValueOnce(new Error('Falha'));
  fireEvent.click(screen.getByRole('button', { name: 'Abrir seletor de aplicativos' }));
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

test('destaca a arte sem coluna lateral, dimensões ou descrições repetidas', () => {
  const { container } = render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={jest.fn()} />);
  expect(document.querySelector('.cba-card-modal__aside')).not.toBeInTheDocument();
  expect(screen.queryByText(/Pronto para publicar|1080|Totais da rodada/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Compartilhar no WhatsApp' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Compartilhar no Instagram' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Compartilhar', exact: true }).querySelector('svg')).toHaveClass('lucide-share2');
  expect(screen.getByRole('group', { name: 'Ações do card' }).contains(screen.getByRole('img'))).toBe(false);
  expect(container).toBeEmptyDOMElement(); // The modal remains a portal.
  expect(context.fillText.mock.calls.some(call => String(call[0]).includes('WhatsApp'))).toBe(false);
});

test('menu geral apresenta os destinos e usa o mesmo fluxo do botão WhatsApp', async () => {
  render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={jest.fn()} />);
  const share = screen.getByRole('button', { name: 'Compartilhar', exact: true });
  fireEvent.click(share);
  expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Instagram', 'WhatsApp', 'Telegram', 'X', 'Slack', 'TikTok', 'Outros aplicativos']);
  expect(screen.getByRole('menuitem', { name: 'Instagram' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' });
  expect(screen.getByRole('menuitem', { name: 'WhatsApp' })).toHaveFocus();
  fireEvent.click(screen.getByRole('menuitem', { name: 'WhatsApp' }));
  expect(screen.getByText(/Escolha WhatsApp no seletor/)).toBeInTheDocument();
  expect(navigator.share).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir seletor de aplicativos' }));
  await waitFor(() => expect(navigator.share).toHaveBeenCalledTimes(1));
  expect(screen.queryByText('Card compartilhado.')).not.toBeInTheDocument();
});

test('Instagram prepara Feed e Story com formatos diferentes e aguarda um gesto para compartilhar', async () => {
  render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={jest.fn()} />);
  const instagram = screen.getByRole('button', { name: 'Compartilhar no Instagram' });
  fireEvent.click(instagram);
  expect(screen.getByRole('menu', { name: 'Onde você quer publicar no Instagram?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Story' }));
  expect(screen.getByRole('img')).toHaveAttribute('height', '1920');
  expect(screen.getByText(/conclua a escolha de Story/)).toBeInTheDocument();
  expect(navigator.share).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir seletor de aplicativos' }));
  await waitFor(() => expect(navigator.share).toHaveBeenCalledTimes(1));
  expect(navigator.share.mock.calls[0][0].files[0].name).toBe('cba-frances-2025-10-18-story.png');
  fireEvent.click(instagram);
  fireEvent.click(screen.getByRole('menuitem', { name: 'Feed' }));
  expect(screen.getByRole('img')).toHaveAttribute('height', '1350');
  expect(screen.getByText(/conclua a escolha de Feed/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Baixar PNG' }));
  expect(downloadName).toBe('cba-frances-2025-10-18-post.png');
});

test('Reels prepara somente uma arte vertical para edição manual, sem fingir que PNG é vídeo', () => {
  render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar no Instagram' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Reels' }));
  expect(screen.getByText(/Reels precisa de vídeo/)).toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveAttribute('height', '1920');
  expect(screen.queryByRole('button', { name: 'Abrir seletor de aplicativos' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Baixar arte para editar' }));
  expect(downloadName).toBe('cba-frances-2025-10-18-story.png');
  expect(navigator.share).not.toHaveBeenCalled();
});

test.each(['Telegram', 'X', 'Slack', 'Outros aplicativos'])('destino %s envia arquivo somente após confirmação no seletor', async label => {
  render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar', exact: true }));
  fireEvent.click(screen.getByRole('menuitem', { name: label }));
  expect(navigator.share).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir seletor de aplicativos' }));
  await waitFor(() => expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] })));
});

test('TikTok tem caminho manual com PNG, sem publicar ou gerar vídeo', () => {
  render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar', exact: true }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'TikTok' }));
  expect(screen.getByText(/importe no editor do TikTok/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Baixar arte para editar' }));
  expect(downloadName).toBe('cba-frances-2025-10-18-story.png');
  expect(navigator.share).not.toHaveBeenCalled();
});

test('menus operam por teclado: End, Home, Escape, Tab e retorno ao botão de origem', () => {
  const onClose = jest.fn();
  render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={onClose} />);
  const share = screen.getByRole('button', { name: 'Compartilhar', exact: true });
  fireEvent.click(share);
  fireEvent.keyDown(document.activeElement, { key: 'End' });
  expect(screen.getByRole('menuitem', { name: 'Outros aplicativos' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement, { key: 'Home' });
  expect(screen.getByRole('menuitem', { name: 'Instagram' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(share).toHaveFocus();
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(share);
  fireEvent.keyDown(document.activeElement, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'Baixar PNG' })).toHaveFocus();
  fireEvent.click(share);
  fireEvent.pointerDown(screen.getByRole('img'));
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

test('não compartilha um PNG antigo enquanto o novo formato ainda está sendo preparado', async () => {
  const callbacks = [];
  HTMLCanvasElement.prototype.toBlob.mockImplementation(callback => callbacks.push(callback));
  render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar no Instagram' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Story' }));
  act(() => callbacks[0](new Blob(['old-post'], { type: 'image/png' })));
  expect(screen.queryByRole('button', { name: 'Abrir seletor de aplicativos' })).not.toBeInTheDocument();
  act(() => callbacks.at(-1)(new Blob(['new-story'], { type: 'image/png' })));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Abrir seletor de aplicativos' })));
  expect(navigator.share.mock.calls[0][0].files[0].name).toBe('cba-frances-2025-10-18-story.png');
});

test('bloqueia exportação e mudança de formato enquanto o seletor nativo está em uso', async () => {
  let finish;
  navigator.share.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<AthleteCardModal athlete={athlete} year="2025" round={round} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar no WhatsApp' }));
  const native = screen.getByRole('button', { name: 'Abrir seletor de aplicativos' });
  fireEvent.click(native);
  expect(native).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Baixar PNG' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Escolher formato' })).toBeDisabled();
  fireEvent.click(native);
  expect(navigator.share).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(screen.getByRole('button', { name: 'Baixar PNG' })).toBeEnabled();
});
