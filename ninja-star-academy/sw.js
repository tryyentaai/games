const VERSION='ninja-star-recovery-1';
const ROOT=new URL('./',self.location.href),PREFIX='ninja-star-'+encodeURIComponent(ROOT.pathname)+'-',CACHE=PREFIX+VERSION;
const FILES=['index.html','style.css','app.js','game.js','core.mjs','art.js','manifest.webmanifest','icon.svg','icon-180.png','icon-192.png'].map(p=>new URL(p,ROOT).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith(PREFIX)&&k!==CACHE)await caches.delete(k);await self.clients.claim();for(const c of await self.clients.matchAll())c.postMessage({type:'OFFLINE_READY'});})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==ROOT.origin||!u.pathname.startsWith(ROOT.pathname))return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match(new URL('index.html',ROOT).href)));return;}if(FILES.includes(u.href))e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});
