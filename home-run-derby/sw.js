// Moonshot Derby service worker. Scope: this folder only.
// Cache names are prefixed "hrd-" so the other games in the repo are never touched.
const VERSION = 'hrd-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hrd-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (isPage) {
    // Network first (so a new version arrives on the next launch), but never wait more than 2.5 s
    // and never let an error page replace the good offline copy.
    const net = fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('./index.html', copy)); }
      return res;
    });
    e.waitUntil(net.catch(() => {}));
    e.respondWith((async () => {
      const cached = (await caches.match('./index.html')) || (await caches.match('./'));
      if (!cached) return net;
      const timeout = new Promise((r) => setTimeout(() => r(cached), 2500));
      return Promise.race([net.then((res) => (res && res.ok ? res : cached)).catch(() => cached), timeout]);
    })());
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
