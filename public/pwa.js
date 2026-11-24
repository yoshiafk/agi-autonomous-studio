// Antigravity Autonomous Studio - PWA Desktop Installation Handler
(function() {
  let deferredPrompt = null;

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        // Registered successfully
      }).catch((err) => {
        console.warn('PWA ServiceWorker registration failed:', err);
      });
    });
  }

  // Check if running in standalone mode (already installed as desktop app)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar
    e.preventDefault();
    deferredPrompt = e;

    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn && !isStandalone) {
      installBtn.classList.remove('hidden');
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          installBtn.classList.add('hidden');
        }
        deferredPrompt = null;
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) installBtn.classList.add('hidden');
    deferredPrompt = null;
  });
})();
