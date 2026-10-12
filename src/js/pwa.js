// PWA : installation facultative et service worker (stratégie hors ligne prudente).
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  document.dispatchEvent(new CustomEvent('tempofit:installable'));
});
export function canInstall() {
  return Boolean(deferredInstall);
}
export async function promptInstall() {
  if (!deferredInstall) return false;
  deferredInstall.prompt();
  const choice = await deferredInstall.userChoice;
  deferredInstall = null;
  return choice.outcome === 'accepted';
}

let userRequestedUpdate = false;

function showUpdateBanner(worker) {
  const banner = document.getElementById('update-banner');
  if (!banner) return;
  banner.hidden = false;
  banner.querySelector('button').addEventListener('click', () => {
    userRequestedUpdate = true;
    worker.postMessage({ type: 'SKIP_WAITING' });
  });
}

export function initPWA() {
  const swAllowed = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && swAllowed) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js');
        if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          w?.addEventListener('statechange', () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner(w);
          });
        });
        // Rechargement uniquement à la demande de l'utilisateur (jamais pendant une séance).
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (userRequestedUpdate) location.reload();
        });
      } catch {
        /* le site reste entièrement utilisable sans service worker */
      }
    });
  }
}
