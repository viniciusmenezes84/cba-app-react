import fs from 'fs';
import path from 'path';

test('PWA não armazena HTML de sessão nem respostas do backend e mostra tela offline anônima', () => {
  const worker = fs.readFileSync(path.join(__dirname, '../public/service-worker.js'), 'utf8');
  const offline = fs.readFileSync(path.join(__dirname, '../public/offline.html'), 'utf8');
  expect(worker).toContain("url.origin !== self.location.origin");
  expect(worker).toContain("request.mode === 'navigate'");
  expect(worker).toContain("cache: 'no-store'");
  expect(worker).toContain('if (!fingerprintedAsset) return;');
  expect(worker).toContain('SKIP_WAITING');
  expect(worker).toContain('cba-portal-cache-v1');
  expect(offline).toContain('sem conexão');
  expect(offline).not.toMatch(/token|senha|estatísticas do atleta/i);
});

test('manifest anuncia o CBA como aplicativo independente', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/manifest.json'), 'utf8'));
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/');
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: '192x192' }),
    expect.objectContaining({ sizes: '512x512' })
  ]));
});
