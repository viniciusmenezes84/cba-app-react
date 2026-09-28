import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AthleteDashboard from './AthleteDashboard';

jest.mock('react-chartjs-2', () => ({ Line: () => <div /> }));

test('gera, baixa e compartilha o card nos formatos de post e Story', async () => {
  const previousShare = Object.getOwnPropertyDescriptor(navigator, 'share');
  const previousCanShare = Object.getOwnPropertyDescriptor(navigator, 'canShare');
  Object.defineProperty(navigator, 'share', { configurable: true, value: jest.fn().mockResolvedValue() });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: jest.fn(() => true) });
  const context = {
    beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), arcTo: jest.fn(), closePath: jest.fn(),
    fill: jest.fn(), stroke: jest.fn(), fillRect: jest.fn(), drawImage: jest.fn(), clip: jest.fn(),
    save: jest.fn(), restore: jest.fn(), fillText: jest.fn(),
    measureText: text => ({ width: text.length * 28 }),
    createLinearGradient: () => ({ addColorStop: jest.fn() })
  };
  const getContext = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  const toBlob = jest.spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })));
  URL.createObjectURL = jest.fn(() => 'blob:cba-card');
  URL.revokeObjectURL = jest.fn();
  let filename;
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    filename = this.download;
  });

  try {
    render(<AthleteDashboard
      allPlayersData={[{ name: 'Ana Souza', numero: '8', attendance: { '2026-09-06': '✅' },
        dailyStats: { '2026-09-06': { pts2: 2, pts3: 1, reb: 4, ast: 2, blk: 1 } } }]}
      dates={['2026-09-06']} currentUser={{ name: 'Ana Souza' }}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Gerar card' }));
    expect(screen.getByRole('dialog', { name: 'Card de Ana Souza' })).toBeInTheDocument();
    const canvas = screen.getByRole('img', { name: 'Prévia do card de Ana Souza na temporada 2026' });
    expect(canvas).toHaveAttribute('width', '1080');
    expect(canvas).toHaveAttribute('height', '1350');
    const printed = context.fillText.mock.calls.map(call => String(call[0]));
    expect(printed).toContain('7');
    expect(printed).toContain('4');
    expect(printed).toContain('2');
    expect(printed).toContain('100%');

    fireEvent.click(screen.getByRole('button', { name: 'Baixar PNG' }));
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
    expect(filename).toBe('cba-ana-souza-2026.png');
    fireEvent.click(await screen.findByRole('button', { name: 'Compartilhar imagem' }));
    await waitFor(() => expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({
      files: [expect.objectContaining({ name: 'cba-ana-souza-2026.png' })]
    })));
    fireEvent.click(screen.getByRole('button', { name: 'Story · 1080 × 1920' }));
    const story = screen.getByRole('img', { name: 'Prévia do card de Ana Souza na temporada 2026 para Stories' });
    expect(story).toHaveAttribute('width', '1080');
    expect(story).toHaveAttribute('height', '1920');
    expect(context.drawImage).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Baixar PNG' }));
    expect(filename).toBe('cba-ana-souza-2026-story.png');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Fechar card' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  } finally {
    getContext.mockRestore();
    toBlob.mockRestore();
    click.mockRestore();
    if (previousShare) Object.defineProperty(navigator, 'share', previousShare);
    else delete navigator.share;
    if (previousCanShare) Object.defineProperty(navigator, 'canShare', previousCanShare);
    else delete navigator.canShare;
  }
});
