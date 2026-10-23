import { registerPortalPwa, applyPortalUpdate, hasPortalUpdate } from './portalPwa';

test('service worker registra apenas app shell e aguarda atualização consentida', async () => {
  const waiting = { postMessage: jest.fn() };
  const registration = {
    waiting: null,
    installing: null,
    addEventListener: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined)
  };
  const sw = {
    controller: {},
    addEventListener: jest.fn(),
    register: jest.fn().mockResolvedValue(registration)
  };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });
  await registerPortalPwa();
  expect(sw.register).toHaveBeenCalledWith('/service-worker.js', {
    scope: '/',
    updateViaCache: 'none'
  });
  expect(hasPortalUpdate()).toBe(false);
  registration.waiting = waiting;
  expect(hasPortalUpdate()).toBe(true);
  expect(waiting.postMessage).not.toHaveBeenCalled();
  expect(applyPortalUpdate()).toBe(true);
  expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
});
