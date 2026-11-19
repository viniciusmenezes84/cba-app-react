import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import IdealTeamCardModal from './IdealTeamCardModal';
import { buildIdealTeam, idealTeamCaption } from './idealTeamData';

const players = ['Ana', 'Bia', 'Cris', 'Dani', 'Eva'].map((name, index) => ({ id: String(index), name,
  dailyStats: { '2026-11-15': { pts2: 10 - index, pts3: 0, reb: 20 - index, ast: 20 - index, blk: 20 - index } } }));
const team = buildIdealTeam(players, null, '2026-11-18');
const withPhotos = () => ({ ...team, slots: team.slots.map((slot, index) => ({ ...slot,
  athlete: { ...slot.athlete, photoUrl: `https://photo.test/${index}.jpg` } })) });
let context, downloadName;
const originals = {};
const setNavigator = (key, value) => Object.defineProperty(navigator, key, { configurable: true, value });

beforeEach(() => {
  for (const key of ['share', 'canShare', 'clipboard']) originals[key] = Object.getOwnPropertyDescriptor(navigator, key);
  setNavigator('share', jest.fn().mockResolvedValue());
  setNavigator('canShare', jest.fn(() => true));
  setNavigator('clipboard', { writeText: jest.fn().mockResolvedValue() });
  context = {
    beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), closePath: jest.fn(), arc: jest.fn(),
    fill: jest.fn(), strokeRect: jest.fn(), fillRect: jest.fn(), drawImage: jest.fn(), clip: jest.fn(),
    save: jest.fn(), restore: jest.fn(), fillText: jest.fn(),
    measureText: text => ({ width: String(text).length * 10 }),
    createLinearGradient: () => ({ addColorStop: jest.fn() })
  };
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })));
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloadName = this.download; });
  URL.createObjectURL = jest.fn(() => 'blob:ideal-team'); URL.revokeObjectURL = jest.fn();
});
afterEach(() => {
  jest.restoreAllMocks();
  for (const key of Object.keys(originals)) {
    if (originals[key]) Object.defineProperty(navigator, key, originals[key]); else delete navigator[key];
  }
});
function chooseFormat(value) {
  fireEvent.click(screen.getByRole('button', { name: 'Escolher formato' }));
  fireEvent.click(screen.getByRole('menuitemradio', { name: value }));
}
function openShare() {
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar', exact: true }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Outros aplicativos' }));
}

test('Canvas coletivo preserva cinco nomes, coroas, marcas, data e colocações em Post e Story', async () => {
  render(<IdealTeamCardModal team={team} onClose={jest.fn()}/>);
  const canvas = screen.getByRole('img');
  expect(canvas).toHaveAttribute('width', '1080'); expect(canvas).toHaveAttribute('height', '1350');
  const printed = context.fillText.mock.calls.map(call => String(call[0]));
  for (const name of ['Ana', 'Bia', 'Cris', 'Dani', 'Eva', '15/11/2026', '20 PTS', '19 REB', '18 AST', '17 TOC',
    '2ª maior marca em rebotes', '3ª maior marca em assistências', '4ª maior marca em tocos', '60 IE-CBA', 'Selecionado para evitar repetição']) expect(printed).toContain(name);
  expect(context.arc).toHaveBeenCalledTimes(5);
  expect(context.fill).toHaveBeenCalledTimes(5); // Uma coroa vetorial por jogador.
  expect(context.strokeRect.mock.calls).toEqual([
    [70, 235, 301, 449], [389, 235, 301, 449], [708, 235, 301, 449],
    [70, 710, 461, 449], [549, 710, 461, 449]
  ]); // 3 + 2, sem sobreposição.
  expect(printed).not.toContain('WhatsApp');
  fireEvent.click(screen.getByRole('button', { name: 'Baixar PNG' }));
  expect(downloadName).toBe('cba-quinteto-ideal-2026-11-15-post.png');
  chooseFormat('Story');
  expect(canvas).toHaveAttribute('height', '1920');
  expect(context.drawImage).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), 0, 290, 1080, 1350);
  fireEvent.click(screen.getByRole('button', { name: 'Baixar PNG' }));
  expect(downloadName).toBe('cba-quinteto-ideal-2026-11-15-story.png');
  fireEvent.click(screen.getByRole('button', { name: 'Copiar legenda' }));
  await screen.findByText('Legenda copiada.');
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(idealTeamCaption(team));
  openShare();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Abrir seletor de aplicativos' })));
  expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({ text: idealTeamCaption(team), files: [expect.objectContaining({ name: 'cba-quinteto-ideal-2026-11-15-story.png' })] }));
  expect(navigator.canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
});

test('Canvas mantém empate e espaços sem atleta, sem inventar números', () => {
  const tied = buildIdealTeam([players[0], { ...players[1], dailyStats: players[0].dailyStats }], null, '2026-11-18');
  render(<IdealTeamCardModal team={tied} onClose={jest.fn()}/>);
  const printed = context.fillText.mock.calls.map(call => String(call[0]));
  expect(printed).toContain('Liderança empatada');
  expect(printed.filter(text => text === 'SEM DESTAQUE')).toHaveLength(3);
  expect(printed).not.toContain('0 TOC');
});

test('espera todas as fotos com CORS e libera iniciais para as fotos que falharam', () => {
  const OldImage = global.Image, images = [];
  global.Image = class { constructor() { this.naturalWidth = 100; this.naturalHeight = 100; images.push(this); } };
  try {
    render(<IdealTeamCardModal team={withPhotos()} onClose={jest.fn()}/>);
    const download = () => screen.getByRole('button', { name: 'Baixar PNG' });
    expect(images).toHaveLength(5); expect(images.every(image => image.crossOrigin === 'anonymous')).toBe(true);
    expect(download()).toBeDisabled(); expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled();
    act(() => images[0].onload()); act(() => images[1].onerror()); act(() => images[2].onload());
    expect(download()).toBeDisabled(); expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled();
    act(() => images[3].onload());
    expect(download()).toBeDisabled();
    act(() => images[4].onload());
    expect(download()).toBeEnabled(); expect(screen.getByText(/Fotos indisponíveis usam a inicial/)).toBeInTheDocument();
    expect(context.drawImage.mock.calls.some(call => call[0] === images[0])).toBe(true);
    expect(context.drawImage.mock.calls.some(call => call[0] === images[1])).toBe(false);
  } finally { global.Image = OldImage; }
});

test('foto lenta só permite fallback explícito e chegada tardia atualiza o PNG compartilhado', async () => {
  jest.useFakeTimers();
  const OldImage = global.Image, images = [];
  global.Image = class { constructor() { images.push(this); } };
  try {
    render(<IdealTeamCardModal team={withPhotos()} onClose={jest.fn()}/>);
    act(() => jest.advanceTimersByTime(7000));
    expect(screen.getByRole('button', { name: 'Baixar PNG' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar com as iniciais' }));
    openShare();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Abrir seletor de aplicativos' })));
    const first = navigator.share.mock.calls[0][0].files[0];
    act(() => images.forEach(image => image.onload()));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Abrir seletor de aplicativos' })));
    expect(navigator.share.mock.calls[1][0].files[0]).not.toBe(first);
    expect(screen.queryByRole('button', { name: 'Tentar carregar foto novamente' })).not.toBeInTheDocument();
  } finally { global.Image = OldImage; jest.useRealTimers(); }
});

test('troca de formato cancela fotos antigas sem liberar exportação prematura', () => {
  const OldImage = global.Image, images = [];
  global.Image = class { constructor() { images.push(this); } };
  try {
    render(<IdealTeamCardModal team={withPhotos()} onClose={jest.fn()}/>);
    const oldLoad = images[0].onload;
    chooseFormat('Story');
    expect(images).toHaveLength(10);
    act(() => oldLoad());
    expect(screen.getByRole('button', { name: 'Baixar PNG' })).toBeDisabled();
    act(() => images.slice(5).forEach(image => image.onload()));
    expect(screen.getByRole('button', { name: 'Baixar PNG' })).toBeEnabled();
  } finally { global.Image = OldImage; }
});

test('fallback sem compartilhamento, cancelamento silencioso e caminhos Instagram/Reels continuam disponíveis', async () => {
  setNavigator('canShare', () => false);
  const { unmount } = render(<IdealTeamCardModal team={team} onClose={jest.fn()}/>);
  openShare();
  expect(screen.getByText(/Compartilhamento de imagem indisponível/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Baixar PNG' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Compartilhar no Instagram' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Reels' }));
  expect(screen.getByText(/Reels precisa de vídeo/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Baixar arte para editar' }));
  expect(downloadName).toBe('cba-quinteto-ideal-2026-11-15-story.png');
  unmount();
  setNavigator('canShare', () => true);
  navigator.share.mockRejectedValueOnce(Object.assign(new Error('Cancelado'), { name: 'AbortError' }));
  render(<IdealTeamCardModal team={team} onClose={jest.fn()}/>);
  openShare();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Abrir seletor de aplicativos' })));
  expect(screen.queryByText(/Compartilhamento indisponível/)).not.toBeInTheDocument();
});

test('modal tem nome, foco contido, Escape e restaura foco ao fechar', () => {
  const trigger = document.createElement('button'); document.body.appendChild(trigger); trigger.focus();
  const onClose = jest.fn();
  const { unmount } = render(<IdealTeamCardModal team={team} onClose={onClose}/>);
  const dialog = screen.getByRole('dialog', { name: 'Quinteto ideal da rodada de 15/11/2026' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  const close = screen.getByRole('button', { name: 'Fechar card' }); expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
  const buttons = dialog.querySelectorAll('button:not(:disabled)'); expect(buttons[buttons.length - 1]).toHaveFocus();
  fireEvent.keyDown(document.activeElement, { key: 'Tab' }); expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: 'Escape' }); expect(onClose).toHaveBeenCalled();
  unmount(); expect(trigger).toHaveFocus(); trigger.remove();
});
