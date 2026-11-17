const VERSION = '2';
const CACHE = 'wjr-' + VERSION;
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './art/voltkit.webp', './art/shellop.webp', './art/auroryx.webp', './art/sproutle.webp', './art/pebbit.webp', './art/fluffin.webp', './art/nibblet.webp', './art/fuzzbug.webp', './art/mossprite.webp', './art/sparkfly.webp', './art/wispurr.webp', './art/cocoonix.webp', './art/lumimoth.webp', './art/puddlet.webp', './art/torrentoad.webp', './art/galewing.webp', './art/gnashrat.webp', './art/cindercub.webp', './art/hootlet.webp', './art/bouldurr.webp', './art/thornback.webp', './art/blazebear.webp', './art/hootrix.webp', './art/bg-meadow.jpg', './art/bg-woods.jpg', './art/bg-beach.jpg', './art/bg-mountain.jpg', './art/bg-cave.jpg', './voice/again.mp3', './voice/book.mp3', './voice/book_help.mp3', './voice/book_unknown.mp3', './voice/explore.mp3', './voice/found_new.mp3', './voice/found_old.mp3', './voice/friend_new.mp3', './voice/friend_old.mp3', './voice/g_ring.mp3', './voice/g_ring_hint.mp3', './voice/g_snack.mp3', './voice/g_snack_hint.mp3', './voice/g_tag.mp3', './voice/g_tag_hint.mp3', './voice/golden.mp3', './voice/hello.mp3', './voice/legend.mp3', './voice/lets_go.mp3', './voice/locked.mp3', './voice/map.mp3', './voice/map_help.mp3', './voice/miss.mp3', './voice/n_auroryx.mp3', './voice/n_blazebear.mp3', './voice/n_bouldurr.mp3', './voice/n_cindercub.mp3', './voice/n_cocoonix.mp3', './voice/n_fluffin.mp3', './voice/n_fuzzbug.mp3', './voice/n_galewing.mp3', './voice/n_gnashrat.mp3', './voice/n_hootlet.mp3', './voice/n_hootrix.mp3', './voice/n_lumimoth.mp3', './voice/n_mossprite.mp3', './voice/n_nibblet.mp3', './voice/n_pebbit.mp3', './voice/n_puddlet.mp3', './voice/n_shellop.mp3', './voice/n_sparkfly.mp3', './voice/n_sproutle.mp3', './voice/n_thornback.mp3', './voice/n_torrentoad.mp3', './voice/n_voltkit.mp3', './voice/n_wispurr.mp3', './voice/nothing.mp3', './voice/nudge_tap.mp3', './voice/orb.mp3', './voice/p_beach.mp3', './voice/p_cave.mp3', './voice/p_meadow.mp3', './voice/p_mountain.mp3', './voice/p_woods.mp3', './voice/party.mp3', './voice/party_book.mp3', './voice/pet.mp3', './voice/praise1.mp3', './voice/praise2.mp3', './voice/praise3.mp3', './voice/praise4.mp3', './voice/praise5.mp3', './voice/praise6.mp3', './voice/sleepy.mp3', './voice/star_find.mp3', './voice/title.mp3', './voice/unlock.mp3', './voice/wrong_snack.mp3'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith('wjr-') && k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;
  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
