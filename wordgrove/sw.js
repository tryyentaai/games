const FILES=[
  "app.js",
  "arcade.css",
  "arcade.js",
  "art/catch.svg",
  "art/cross.svg",
  "art/detective.svg",
  "art/hero.webp",
  "art/icon-192.png",
  "art/icon-512.png",
  "art/ladder.svg",
  "art/missing.svg",
  "art/pairs.svg",
  "art/path.svg",
  "art/scramble.svg",
  "art/search.svg",
  "art/spell.svg",
  "art/train.svg",
  "data.js",
  "icons.js",
  "index.html",
  "manifest.webmanifest",
  "practice.css",
  "practice.js",
  "puzzles.css",
  "puzzles.js",
  "scan.css",
  "scan.js",
  "style.css",
  "vendor/ocr/eng.traineddata.gz",
  "vendor/ocr/tesseract-core-lstm.wasm.js",
  "vendor/ocr/tesseract.esm.min.js",
  "vendor/ocr/worker.min.js"
];
const cacheName='wordgrove-20261107-1';
const allowed=new Set(FILES.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('wordgrove-')&&key!==cacheName)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 if(request.mode==='navigate' && request.url.startsWith(self.registration.scope)){
   event.respondWith(caches.open(cacheName).then(async cache=>(await cache.match('./index.html'))||fetch(request)));return;
 }
 if(allowed.has(request.url))event.respondWith(caches.open(cacheName).then(async cache=>(await cache.match(request))||fetch(request)));
});
