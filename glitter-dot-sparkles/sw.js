const CACHE = 'glitter-dot-sparkles-v1';
const ASSETS = ['./','./index.html','./app.js','./engine.js','./style.css','./favicon.svg','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('glitter-dot-sparkles-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => { if (event.request.method !== 'GET' || !event.request.url.startsWith(self.registration.scope)) return; event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))); });
