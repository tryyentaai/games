// node dev/sim_autosave.js — headless autosave test. Boots the real modules (core → title) in a VM with a fake
// localStorage, plays the opening through the real lab battle, and checks that progress is written without the
// SAVE menu, survives a "reopen" (fresh VM on the same storage), skips writes mid-battle, flushes on hide, and
// copes with corrupt saves, old-format saves, full storage and storage that is switched off.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const FILES = ['core.js', 'audio.js', 'sprites_world.js', 'sprites_mons.js', 'data.js', 'menus.js', 'battle.js', 'world.js', 'dex.js', 'title.js'];
const SRC = FILES.map((f) => {
  let code = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  if (f === 'battle.js') code = code.replace('b.v.xp = target; this.dur = t + 6;', 'b.v.xp = target; if (!this.fin) { this.fin = 1; this.dur = t + 6; }'); // same test-only workaround as sim_world
  return [f, code];
});
let fails = 0;
function expect(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); }

function makeStorage(opts) {
  opts = opts || {};
  return { _s: {}, writes: 0, quota: opts.quota || Infinity,
    getItem(k) { if (opts.off) throw new Error('SecurityError'); return Object.prototype.hasOwnProperty.call(this._s, k) ? this._s[k] : null; },
    setItem(k, v) { if (opts.off) throw new Error('SecurityError'); const used = Object.entries(this._s).reduce((n, [kk, vv]) => n + (kk === k ? 0 : vv.length), 0); if (used + v.length > this.quota) throw new Error('QuotaExceededError'); this._s[k] = String(v); this.writes++; },
    removeItem(k) { if (opts.off) throw new Error('SecurityError'); delete this._s[k]; } };
}
// One "app launch": a fresh VM sharing the given storage.
async function launch(storage, o) {
  o = o || {};
  const ctx2d = () => new Proxy({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) },
    { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  const canvas = () => ({ width: 0, height: 0, getContext: () => ctx2d() });
  const winL = {}, docL = {}, errors = []; let rafCb = null;
  const doc = { addEventListener: (t, f) => ((docL[t] = docL[t] || []).push(f)), createElement: () => canvas(), fonts: { load: () => Promise.resolve(), check: () => true }, hidden: false };
  const win = {
    addEventListener: (t, f) => ((winL[t] = winL[t] || []).push(f)), removeEventListener() {},
    requestAnimationFrame: (f) => { rafCb = f; }, document: doc, navigator: {},
    console: { log() {}, error: (...a) => errors.push(a.join(' ')), warn() {} },
    setTimeout, setInterval: () => 0, clearInterval() {}, Promise, Math, JSON, Date,
  };
  if (o.storageThrows) Object.defineProperty(win, 'localStorage', { get() { throw new Error('SecurityError: storage disabled'); } });
  else win.localStorage = storage;
  win.window = win;
  vm.createContext(win);
  for (const [f, code] of SRC) vm.runInContext(code, win, { filename: f });
  const G = win.G;
  let ts = 0;
  const frames = async (n) => { for (let i = 0; i < n; i++) { ts += 1000 / 60; const cb = rafCb; rafCb = null; cb && cb(ts); if (i % 20 === 0) await new Promise((r) => setImmediate(r)); } await new Promise((r) => setImmediate(r)); };
  const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', a: 'KeyZ', b: 'KeyX', start: 'Enter' };
  const key = (t, b) => (winL[t] || []).forEach((f) => f({ code: KEY[b], preventDefault() {} }));
  const tap = async (b) => { key('keydown', b); await frames(2); key('keyup', b); await frames(2); };
  const holdDir = async (b, n) => { key('keydown', b); await frames(n); key('keyup', b); await frames(1); };
  const D = () => G.World.debug();
  const mashUntil = async (cond, max, btn) => { for (let i = 0; i < max; i++) { if (cond()) return true; await tap(btn || 'a'); } return cond(); };
  const hide = () => { doc.hidden = true; (docL.visibilitychange || []).forEach((f) => f()); doc.hidden = false; };
  const pagehide = () => (winL.pagehide || []).forEach((f) => f());
  await G.boot(canvas());
  await frames(3);
  return { G, win, frames, tap, holdDir, D, mashUntil, hide, pagehide, errors };
}
const saved = (st) => { const raw = st._s.wildlight_save; if (!raw) return null; const env = JSON.parse(raw); return JSON.parse(env.data); };

(async () => {
  // ---------- 1. Fresh install: play the opening, never touch SAVE ----------
  const storage = makeStorage();
  let A = await launch(storage);
  expect(!A.G.hasSave(), 'fresh install has no save');
  A.G.state = A.G.newState(); A.G.state.player.name = 'MIA';
  A.G.World.start({ newGame: true });
  await A.frames(5);
  await A.mashUntil(() => A.D().busy === 0, 60);
  await A.frames(3);
  let s = saved(storage);
  expect(s && s.map === 'home' && s.player.name === 'MIA', 'new journey saved automatically after the intro');

  // walking: position lands on disk within ~2 s of exploring, no menu needed
  for (let i = 0; i < 8 && A.D().y < 6; i++) await A.holdDir('down', 8);
  await A.frames(130);
  s = saved(storage);
  expect(s && s.x === A.D().x && s.y === A.D().y, 'position autosaved while exploring (' + (s && [s.x, s.y]) + ' vs ' + [A.D().x, A.D().y] + ')');

  // playTime alone never triggers a write; hiding the app flushes it
  const w0 = storage.writes; A.G.state.playTime = 777; await A.frames(250);
  expect(storage.writes === w0, 'idle playTime ticks do not cause writes');
  A.hide();
  expect(saved(storage).playTime === 777, 'backgrounding the app flushes the save');
  A.G.state.playTime = 778; A.pagehide();
  expect(saved(storage).playTime === 778, 'closing the page flushes the save');

  // the professor intercept → lab story → real rival battle, all without SAVE
  A.G.World.warp('hollowbrook', 9, 3, 'up'); await A.frames(3);
  await A.holdDir('up', 30); await A.frames(5);
  expect(A.D().busy > 0, 'story cutscene starts');
  const before = saved(storage);
  expect(before && !before.flags.got_starter && before.map === 'hollowbrook', 'snapshot taken right before the cutscene (consistent, pre-story)');
  // mid-story: mutate state, hide → must NOT write a half-finished story state
  let sawBattle = false, hidMidBattle = false;
  for (let i = 0; i < 6000 && !(A.D().busy === 0 && !A.G.scenes.some((sc) => sc.dialog || sc.items)); i++) {
    if (A.G.scenes.some((sc) => sc.S)) { sawBattle = true; if (!hidMidBattle) { hidMidBattle = true; A.hide(); expect(!saved(storage).flags.got_starter, 'hiding mid-battle keeps the last safe save'); } }
    await A.tap('a');
  }
  expect(sawBattle, 'real rival battle ran');
  await A.frames(3);
  s = saved(storage);
  expect(s && s.flags.got_starter && s.party.length === 1 && s.party[0].id === 'voltkit' && s.map === 'lab', 'story + battle result saved as soon as control returns');
  expect(A.errors.length === 0, 'no console errors in play session (' + A.errors.join(' | ') + ')');

  // menus: a change made inside a menu is saved the moment the menu closes
  const sc = A.G.push({ update() {}, draw() {} });
  A.G.state.bag.potion = 9; await A.frames(150);
  expect(saved(storage).bag.potion !== 9, 'nothing written while a menu/scene is open');
  A.G.pop(sc); await A.frames(2);
  expect(saved(storage).bag.potion === 9, 'menu change saved on close');
  const final = JSON.parse(JSON.stringify(A.G.state));

  // ---------- 2. Reopen the app on the same storage ----------
  let B = await launch(storage);
  expect(B.G.hasSave(), 'reopen: save detected (CONTINUE offered)');
  await B.frames(60); await B.tap('start'); await B.frames(5);
  const menu = B.G.scenes.find((x) => x.items);
  expect(menu && menu.items[0] === 'CONTINUE', 'title menu leads with CONTINUE');
  await B.tap('a'); await B.frames(60);
  expect(B.G.World.active() && B.D().map === final.map && B.D().x === final.x && B.D().y === final.y, 'continue restores map + position (' + B.D().map + ' ' + B.D().x + ',' + B.D().y + ')');
  expect(B.G.state.party[0].id === 'voltkit' && B.G.state.flags.got_starter && B.G.state.bag.potion === 9 && B.G.state.player.name === 'MIA', 'continue restores party, flags, bag, names');

  // ---------- 3. Corruption falls back to the backup slot ----------
  B.G.state.money = 4321; B.G.autosave(); B.G.state.money = 5555; B.G.autosave();
  expect(storage._s.wildlight_save_bak && JSON.parse(JSON.parse(storage._s.wildlight_save_bak).data).money === 4321, 'previous save kept as backup');
  const goodBak = storage._s.wildlight_save_bak;
  storage._s.wildlight_save = storage._s.wildlight_save.replace('5555', '9999'); // bit-rot: checksum no longer matches
  let C = await launch(storage);
  expect(C.G.loadGame() && C.G.state.money === 4321, 'tampered main save rejected, backup restored');
  storage._s.wildlight_save = '{not json'; storage._s.wildlight_save_bak = 'garbage';
  C = await launch(storage);
  expect(!C.G.hasSave() && !C.G.loadGame() && C.errors.length === 0, 'fully corrupt storage: no save, no crash');

  // ---------- 4. Old format (v1) migrates ----------
  const old = makeStorage(); old._s.wildlight_save_v1 = JSON.stringify(Object.assign({}, final, { money: 1234 }));
  C = await launch(old);
  expect(C.G.hasSave() && C.G.loadGame() && C.G.state.money === 1234 && C.G.state.party[0].id === 'voltkit', 'v1 save loads');
  C.G.autosave(true);
  expect(!old._s.wildlight_save_v1 && saved(old).money === 1234, 'v1 save migrated to the new format');
  const bad = makeStorage(); bad._s.wildlight_save_v1 = JSON.stringify({ party: 'nope' });
  C = await launch(bad);
  expect(!C.G.hasSave(), 'malformed v1 save ignored');

  // ---------- 5. Storage full / off ----------
  const tight = makeStorage(); tight._s.wildlight_save = goodBak; // a good existing save
  const goodRaw = tight._s.wildlight_save; tight.quota = goodRaw.length + 10;
  C = await launch(tight);
  expect(C.G.loadGame() && C.G.state.money === 4321, 'tight storage: existing save loads');
  C.G.state.box = Array.from({ length: 200 }, () => JSON.parse(JSON.stringify(final.party[0])));
  expect(C.G.autosave(true) === false && tight._s.wildlight_save === goodRaw, 'storage full: write fails cleanly, last good save untouched');
  const D2 = await launch(null, { storageThrows: true });
  D2.G.state = D2.G.newState(); D2.G.World.start({ newGame: true }); await D2.frames(5); await D2.mashUntil(() => D2.D().busy === 0, 60); await D2.frames(140); D2.hide();
  expect(!D2.G.hasSave() && D2.G.World.active() && D2.errors.length === 0, 'storage disabled (private mode): game runs, no crash');

  // ---------- 6. NEW GAME over a save archives the old journey ----------
  const ng = makeStorage(); ng._s.wildlight_save = goodBak;
  const E = await launch(ng);
  await E.frames(60); await E.tap('start'); await E.frames(5);
  const tm = E.G.scenes.find((x) => x.items); tm.index = tm.items.indexOf('NEW GAME'); await E.tap('a'); await E.frames(5); // NEW GAME
  await E.mashUntil(() => E.G.scenes.some((x) => x.items && x.items.includes('YES')), 20); await E.tap('a'); await E.frames(40); // YES, start over
  expect(!!ng._s.wildlight_save_archive && JSON.parse(JSON.parse(ng._s.wildlight_save_archive).data).money === 4321, 'old journey archived before the new one autosaves');
  expect(E.G.restoreArchive() && E.G.state.money === 4321, 'archived journey can be restored');

  console.log(fails ? fails + ' FAILED' : 'AUTOSAVE TESTS PASSED');
  process.exitCode = fails ? 1 : 0;
})().catch((e) => { console.log('CRASH', e && e.stack); process.exitCode = 1; });
