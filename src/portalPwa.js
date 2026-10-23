/*
 * PWA lifecycle:
 * - installable without Play Store/App Store;
 * - new versions are offered to the user, not activated mid-súmula;
 * - never caches authenticated responses or Supabase requests.
 */
let updateRegistration = null;
let reloadAfterUpdate = false;
let initialized = false;

function notifyUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cba-pwa-update-ready'));
  }
}

export function hasPortalUpdate() {
  return Boolean(updateRegistration?.waiting);
}

export function applyPortalUpdate() {
  if (!updateRegistration?.waiting) return false;
  reloadAfterUpdate = true;
  updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

export async function registerPortalPwa() {
  if (initialized || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  initialized = true;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadAfterUpdate) {
      reloadAfterUpdate = false;
      window.location.reload();
    }
  });

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none'
    });
    updateRegistration = registration;
    if (registration.waiting && navigator.serviceWorker.controller) notifyUpdate();

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          updateRegistration = registration;
          notifyUpdate();
        }
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) registration.update().catch(() => {});
    });
  } catch (error) {
    initialized = false; // allow another attempt next time
    console.warn('PWA do CBA não pôde ser registrado:', error);
  }
}
