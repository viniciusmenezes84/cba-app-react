import { fireEvent, render, screen } from '@testing-library/react';
import AthleteDashboard from './AthleteDashboard';

jest.mock('react-chartjs-2', () => ({ Line: () => <div /> }));

test('gera e baixa o card com os números da temporada selecionada', () => {
  const context = {
    beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), arcTo: jest.fn(), closePath: jest.fn(),
    fill: jest.fn(), stroke: jest.fn(), fillRect: jest.fn(), clip: jest.fn(),
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
    fireEvent.keyDown(screen.getByRole('button', { name: 'Fechar card' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  } finally {
    getContext.mockRestore();
    toBlob.mockRestore();
    click.mockRestore();
  }
});
