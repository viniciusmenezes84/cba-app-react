/*
 * PWA lifecycle:
 * - installable without Play Store/App Store;
 * - new versions are offered to the user, not activated mid-súmula;
 * - never caches authenticated responses or Supabase requests.
 */
let updateRegistration = null;
let reloadAfterUpdate = false;
let initialized = false;
let newerBuildAvailable = false;

function notifyUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cba-pwa-update-ready'));
  }
}

export function hasPortalUpdate() {
  return Boolean(updateRegistration?.waiting || newerBuildAvailable);
}

export function applyPortalUpdate() {
  if (updateRegistration?.waiting) {
    reloadAfterUpdate = true;
    updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    return true;
  }
  if (newerBuildAvailable) {
    window.location.reload(); // user explicitly chose to update
    return true;
  }
  return false;
}

// CRA generates asset-manifest.json on each build. Detect new JS bundles even when
// the service-worker.js file itself is unchanged between releases.
export async function checkForPortalBuildUpdate() {
  if (typeof document === 'undefined' || typeof fetch !== 'function') return false;
  const currentScript = Array.from(document.scripts)
    .map(script => script.src)
    .find(src => src.includes('/static/js/main.') && /\.js(?:\?|$)/.test(src));
  if (!currentScript) return false;
  try {
    const response = await fetch('/asset-manifest.json', { cache: 'no-store', credentials: 'omit' });
    if (!response.ok) return false;
    const info = await response.json();
    const latest = info?.files?.['main.js'];
    if (!latest || typeof latest !== 'string') return false;
    if (new URL(latest, window.location.origin).pathname !==
      new URL(currentScript, window.location.origin).pathname) {
      newerBuildAvailable = true;
      notifyUpdate();
    }
    return newerBuildAvailable;
  } catch {
    return false;
  }
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
    checkForPortalBuildUpdate();
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
      if (!document.hidden) {
        registration.update().catch(() => {});
        checkForPortalBuildUpdate();
      }
    });
  } catch (error) {
    initialized = false; // allow another attempt next time
    console.warn('PWA do CBA não pôde ser registrado:', error);
  }
}
