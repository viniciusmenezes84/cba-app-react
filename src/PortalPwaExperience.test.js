import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PortalInstallGuide, PortalUpdateNotice, getInstallPlatform } from './PortalPwaExperience';
import { applyPortalUpdate, hasPortalUpdate } from './portalPwa';

jest.mock('./portalPwa', () => ({
  applyPortalUpdate: jest.fn(),
  hasPortalUpdate: jest.fn(() => false)
}));

beforeEach(() => {
  window.dispatchEvent(new Event('appinstalled'));
  hasPortalUpdate.mockReturnValue(false);
  applyPortalUpdate.mockReset();
});

test('identifica dispositivos Android, iOS e desktop sem alterar acesso ao CBA', () => {
  expect(getInstallPlatform('Mozilla/5.0 (Linux; Android 15)')).toBe('android');
  expect(getInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('ios');
  expect(getInstallPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
});

test('guia de instalação exibe instruções e fecha sem mudar navegação', () => {
  const close = jest.fn();
  render(<PortalInstallGuide onClose={close}/>);
  expect(screen.getByRole('dialog', { name: 'Instalar Portal CBA' })).toBeInTheDocument();
  expect(screen.getByText(/Abra o CBA no Chrome, Edge ou Safari/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Fechar instruções de instalação' }));
  expect(close).toHaveBeenCalledTimes(1);
});

test('permite disparar prompt de instalação Chromium quando disponível', async () => {
  const nativePrompt = jest.fn().mockResolvedValue(undefined);
  const installEvent = new Event('beforeinstallprompt', { cancelable: true });
  Object.assign(installEvent, {
    prompt: nativePrompt,
    userChoice: Promise.resolve({ outcome: 'accepted' })
  });
  window.dispatchEvent(installEvent);
  render(<PortalInstallGuide onClose={() => {}}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Instalar agora' }));
  await waitFor(() => expect(nativePrompt).toHaveBeenCalledTimes(1));
  expect(await screen.findByText(/já está aberto como aplicativo/)).toBeInTheDocument();
});

test('avisa sobre versão nova e não recarrega automaticamente', () => {
  const result = render(<PortalUpdateNotice/>);
  expect(screen.queryByText('Nova versão do Portal CBA disponível.')).not.toBeInTheDocument();
  hasPortalUpdate.mockReturnValue(true);
  fireEvent(window, new Event('cba-pwa-update-ready'));
  expect(screen.getByText('Nova versão do Portal CBA disponível.')).toBeInTheDocument();
  expect(applyPortalUpdate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }));
  expect(applyPortalUpdate).toHaveBeenCalledTimes(1);
  result.unmount();
});
