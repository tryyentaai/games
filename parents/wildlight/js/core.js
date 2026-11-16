// WILDLIGHT — engine core. This file is THE CONTRACT every other module codes against.
// 160x144 screen, 4-shade palette, scene stack, input, bitmap font, dialog, menus, save.
(function () {
  'use strict';
  const G = (window.G = {});
  G.W = 160; G.H = 144; G.frame = 0;

  // ---------- Palettes (index 0 = lightest, 3 = darkest) ----------
  G.PALETTES = {
    amber:   { name: 'AMBER',   c: ['#fff4cf', '#f0bf48', '#b05a2a', '#33180e'] },
    classic: { name: 'CLASSIC', c: ['#e0f8d0', '#88c070', '#346856', '#081820'] },
    pocket:  { name: 'POCKET',  c: ['#f2f2e8', '#a9a99c', '#5c5c52', '#1b1b17'] },
    night:   { name: 'NIGHT',   c: ['#dbe9ff', '#7d8fdc', '#3a3e92', '#110e2c'] },
    sakura:  { name: 'SAKURA',  c: ['#fff0f3', '#f4a6b8', '#a8506e', '#2e1020'] },
  };
  G.palKey = 'amber';
  G.C = G.PALETTES.amber.c;
  let rgb = [];
  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  G.setPalette = function (key) {
    if (!G.PALETTES[key]) key = 'amber';
    G.palKey = key; G.C = G.PALETTES[key].c; rgb = G.C.map(hexRgb);
    fontAtlas = {};
    if (G.onPalette) G.onPalette(key); // shell hook (recolor device chrome)
  };

  // ---------- Canvas ----------
  G.init = function (canvas) {
    G.canvas = canvas; canvas.width = G.W; canvas.height = G.H;
    G.ctx = canvas.getContext('2d', { alpha: false });
    G.ctx.imageSmoothingEnabled = false;
  };
  G.rect = function (x, y, w, h, c) { G.ctx.fillStyle = G.C[c == null ? 3 : c]; G.ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };
  G.clear = function (c) { G.rect(0, 0, G.W, G.H, c == null ? 0 : c); };

  // ---------- Sprites ----------
  // A sprite is an array of equal-length strings. Chars '0'-'3' = palette index, '.' (or ' ') = transparent.
  // G.drawSpr(rows, x, y, {flip:bool, map:'0123'}) — map remaps indices (e.g. '3333' = silhouette, '0000' = white flash).
  const sprCache = new WeakMap();
  function sprCanvas(rows, flip, map) {
    let e = sprCache.get(rows);
    if (!e || e.pal !== G.palKey) { e = { pal: G.palKey }; sprCache.set(rows, e); }
    const k = (flip ? 'f' : 'n') + (map || '');
    if (e[k]) return e[k];
    const h = rows.length, w = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d'); const img = cx.createImageData(w, h); const d = img.data;
    for (let y = 0; y < h; y++) {
      const r = rows[y];
      for (let x = 0; x < w; x++) {
        let ch = r.charCodeAt(flip ? w - 1 - x : x) - 48;
        if (!(ch >= 0 && ch <= 3)) continue;
        if (map) ch = map.charCodeAt(ch) - 48;
        const i = (y * w + x) * 4, c = rgb[ch];
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0);
    return (e[k] = cv);
  }
  G.sprCanvas = sprCanvas;
  G.drawSpr = function (rows, x, y, o) {
    if (!rows) return;
    o = o || {};
    G.ctx.drawImage(sprCanvas(rows, o.flip, o.map), Math.round(x), Math.round(y));
  };
  G.sprSize = function (rows) { return { w: rows[0].length, h: rows.length }; };

  // ---------- Bitmap font (8x8, built from "Press Start 2P" thresholded; custom glyphs below) ----------
  const CUSTOM = {
    '▶': ['01000000', '01100000', '01110000', '01111000', '01110000', '01100000', '01000000', '00000000'],
    '▷': ['01000000', '01100000', '01010000', '01001000', '01010000', '01100000', '01000000', '00000000'],
    '▼': ['00000000', '11111110', '01111100', '00111000', '00010000', '00000000', '00000000', '00000000'],
    '♥': ['00000000', '01101100', '11111110', '11111110', '01111100', '00111000', '00010000', '00000000'],
    '…': ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '10010010', '00000000'],
    '★': ['00010000', '00010000', '11111110', '01111100', '00111000', '01101100', '01000100', '00000000'],
    '♪': ['00011100', '00010110', '00010000', '00010000', '01110000', '11110000', '01100000', '00000000'],
    '×': ['00000000', '01000100', '00101000', '00010000', '00101000', '01000100', '00000000', '00000000'],
    '·': ['00000000', '00000000', '00000000', '00011000', '00011000', '00000000', '00000000', '00000000'],
    'é': ['00001100', '00011000', '01111100', '11000110', '11111110', '11000000', '01111100', '00000000'],
    '♂': ['00001111', '00000011', '00000101', '01111001', '11001100', '11001100', '01111000', '00000000'],
    '♀': ['00111100', '01100110', '01100110', '00111100', '00011000', '01111110', '00011000', '00000000'],
  };
  G.CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~' + Object.keys(CUSTOM).join('');
  let glyphs = null; const charIndex = {};
  let fontAtlas = {};
  function buildGlyphs(family) {
    glyphs = [];
    const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    [...G.CHARS].forEach((ch, i) => {
      charIndex[ch] = i;
      const g = new Uint8Array(64);
      if (CUSTOM[ch]) { CUSTOM[ch].forEach((r, y) => { for (let x = 0; x < 8; x++) g[y * 8 + x] = r[x] === '1' ? 1 : 0; }); }
      else {
        cx.clearRect(0, 0, 16, 16); cx.fillStyle = '#000'; cx.textBaseline = 'top';
        cx.font = family; cx.fillText(ch, 0, 0);
        const d = cx.getImageData(0, 0, 8, 8).data;
        for (let p = 0; p < 64; p++) g[p] = d[p * 4 + 3] > 110 ? 1 : 0;
      }
      glyphs.push(g);
    });
  }
  function atlas(c) {
    if (fontAtlas[c]) return fontAtlas[c];
    const n = glyphs.length, cv = document.createElement('canvas'); cv.width = n * 8; cv.height = 8;
    const cx = cv.getContext('2d'); const img = cx.createImageData(n * 8, 8); const col = rgb[c];
    glyphs.forEach((g, i) => { for (let p = 0; p < 64; p++) if (g[p]) { const o = ((p >> 3) * n * 8 + i * 8 + (p & 7)) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255; } });
    cx.putImageData(img, 0, 0);
    return (fontAtlas[c] = cv);
  }
  // G.text(str, x, y, color=3). 8px per char, no kerning. Returns width in px.
  G.text = function (s, x, y, c) {
    s = String(s); const a = atlas(c == null ? 3 : c);
    let cx = x | 0;
    for (const ch of s) { const i = charIndex[ch]; if (i != null && ch !== ' ') G.ctx.drawImage(a, i * 8, 0, 8, 8, cx, y | 0, 8, 8); cx += 8; }
    return cx - x;
  };
  G.textR = function (s, xr, y, c) { s = String(s); return G.text(s, xr - [...s].length * 8, y, c); }; // right-aligned
  G.textC = function (s, y, c) { s = String(s); return G.text(s, ((G.W - [...s].length * 8) / 2) | 0, y, c); }; // centered
  G.wrap = function (s, max) { // word wrap into lines of <= max chars; honors \n
    const out = [];
    String(s).split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((w) => {
        if (!line.length) line = w;
        else if ((line + ' ' + w).length <= max) line += ' ' + w;
        else { out.push(line); line = w; }
      });
      out.push(line);
    });
    return out;
  };
  G.fmt = function (s) { // {PLAYER} {RIVAL} {STARTER} tokens
    const st = G.state || {};
    return String(s)
      .replace(/\{PLAYER\}/g, (st.player && st.player.name) || 'SAM')
      .replace(/\{RIVAL\}/g, (st.rival && st.rival.name) || 'KAI')
      .replace(/\{STARTER\}/g, (st.party && st.party[0] && (st.party[0].nick || st.party[0].name)) || 'VOLTKIT');
  };

  // ---------- Windows ----------
  // GB-style window: light fill, double dark border with rounded corners.
  G.box = function (x, y, w, h) {
    G.rect(x, y, w, h, 0);
    G.rect(x + 1, y, w - 2, 2, 3); G.rect(x + 1, y + h - 2, w - 2, 2, 3);
    G.rect(x, y + 1, 2, h - 2, 3); G.rect(x + w - 2, y + 1, 2, h - 2, 3);
    G.rect(x + 3, y + 3, w - 6, 1, 2); G.rect(x + 3, y + h - 4, w - 6, 1, 2);
    G.rect(x + 3, y + 3, 1, h - 6, 2); G.rect(x + w - 4, y + 3, 1, h - 6, 2);
  };

  // ---------- Input ----------
  // Buttons: up down left right a b start select.
  // G.input.down(b) held · pressed(b) edge this frame · repeat(b) edge + auto-repeat (menus) · setVirtual(b,on) for touch.
  const BTNS = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'a', KeyJ: 'a', Space: 'a', KeyX: 'b', KeyK: 'b', Backspace: 'b', Escape: 'b', Enter: 'start', ShiftLeft: 'select', ShiftRight: 'select' };
  const keyHeld = {}, virt = {}, queued = {}, now = {}, hold = {};
  let lastDir = [];
  function press(b) { queued[b] = true; if (b in { up: 1, down: 1, left: 1, right: 1 }) { lastDir = lastDir.filter((d) => d !== b); lastDir.push(b); } if (G.onButton) G.onButton(b); }
  addEventListener('keydown', (e) => { const b = KEYMAP[e.code]; if (!b) return; e.preventDefault(); if (!keyHeld[b]) press(b); keyHeld[b] = true; });
  addEventListener('keyup', (e) => { const b = KEYMAP[e.code]; if (!b) return; keyHeld[b] = false; });
  addEventListener('blur', () => { BTNS.forEach((b) => { keyHeld[b] = false; virt[b] = false; }); });
  G.input = {
    down: (b) => !!(keyHeld[b] || virt[b]),
    pressed: (b) => !!now[b],
    repeat: (b) => !!now[b] || (hold[b] > 20 && hold[b] % 5 === 0),
    anyPressed: () => BTNS.some((b) => now[b]),
    dir: () => { for (let i = lastDir.length - 1; i >= 0; i--) if (G.input.down(lastDir[i])) return lastDir[i]; return null; }, // most recent held direction
    setVirtual: (b, on) => { if (on && !virt[b]) press(b); virt[b] = !!on; },
    consume: () => BTNS.forEach((b) => (now[b] = false)), // swallow this frame's presses (call after acting on one if needed)
    _tick: () => { BTNS.forEach((b) => { now[b] = !!queued[b]; queued[b] = false; hold[b] = G.input.down(b) ? (hold[b] || 0) + 1 : 0; }); },
  };

  // ---------- Scene stack ----------
  // scene = { update(), draw(), enter?(), exit?(), opaque?:bool }. Only the top scene updates.
  // Drawing starts at the top-most opaque scene and goes up (so dialogs/menus overlay the world).
  G.scenes = [];
  G.push = function (s) { G.scenes.push(s); if (s.enter) s.enter(); return s; };
  G.pop = function (s) { // pop top, or a specific scene if given
    const i = s ? G.scenes.lastIndexOf(s) : G.scenes.length - 1; if (i < 0) return null;
    const [t] = G.scenes.splice(i, 1); if (t.exit) t.exit(); return t;
  };
  G.replace = function (s) { G.pop(); return G.push(s); };
  G.top = function () { return G.scenes[G.scenes.length - 1]; };
  G.clearScenes = function () { while (G.scenes.length) G.pop(); };

  // ---------- Dialog ----------
  // G.say(textOrPages, {onDone, choices:['YES','NO'], onChoice(i), cancelChoice:index}) — bottom textbox, 18 chars x 2 lines,
  // typewriter, scrolls a line at a time, ▼ prompt. Array = multiple pages. Tokens via G.fmt. Returns the scene.
  G.say = function (pages, o) {
    o = o || {};
    if (!Array.isArray(pages)) pages = [pages];
    const lines = []; // {t, brk} brk = starts new page
    pages.forEach((p) => G.wrap(G.fmt(p), 18).forEach((t, i) => lines.push({ t, brk: i === 0 })));
    const spd = { slow: 1, mid: 2, fast: 4, instant: 99 }[G.opts.textSpeed] || 2;
    let row0 = null, row1 = null, li = 0, typed = 0, waiting = false, typingRow = 0, done = false;
    function startLine() {
      const L = lines[li];
      if (L.brk || row0 == null) { row0 = L.t; row1 = null; typingRow = 0; }
      else if (row1 == null) { row1 = L.t; typingRow = 1; }
      else { row0 = row1; row1 = L.t; typingRow = 1; }
      typed = 0;
    }
    startLine();
    const sc = {
      dialog: true,
      update() {
        if (done) return;
        const cur = typingRow === 0 ? row0 : row1;
        if (!waiting) {
          typed += (G.input.down('a') || G.input.down('b')) ? 8 : spd / 2;
          if (typed >= cur.length) {
            typed = cur.length;
            const next = lines[li + 1];
            if (next && !next.brk && typingRow === 0) { li++; startLine(); return; } // fill second row immediately
            waiting = true;
            if (!next && o.choices) { done = true; openChoices(); }
          }
          return;
        }
        if (G.input.pressed('a') || G.input.pressed('b')) {
          G.audio.sfx('blip');
          if (li + 1 < lines.length) { li++; waiting = false; startLine(); }
          else { done = true; G.pop(sc); if (o.onDone) o.onDone(); }
        }
      },
      draw() {
        G.box(0, 96, 160, 48);
        if (row0 != null) G.text(typingRow === 0 ? row0.slice(0, typed | 0) : row0, 8, 112 - 8);
        if (row1 != null) G.text(typingRow === 1 ? row1.slice(0, typed | 0) : row1, 8, 128 - 8);
        if (waiting && !done && (G.frame >> 4) & 1) G.text('▼', 144, 132);
      },
    };
    function openChoices() {
      const items = o.choices, w = Math.max(...items.map((s) => s.length)) * 8 + 24, h = items.length * 16 + 8;
      G.menu({ items, x: 160 - w, y: 96 - h, w, cancelIndex: o.cancelChoice == null ? items.length - 1 : o.cancelChoice,
        onSelect: (i) => { G.pop(sc); if (o.onChoice) o.onChoice(i); if (o.onDone) o.onDone(i); } });
    }
    return G.push(sc);
  };

  // ---------- Menu ----------
  // G.menu({items:[str], x, y, w?, h?, index?, cancelIndex?: number|null (B selects it; null = B disabled),
  //         onSelect(i, scene), onCancel?(), onMove?(i), keep?:bool (don't auto-pop on select), drawExtra?(scene)}). Vertical list, 16px rows.
  G.menu = function (o) {
    const items = o.items, w = o.w || Math.max(...items.map((s) => String(s).length)) * 8 + 24, h = o.h || items.length * 16 + 8;
    const sc = {
      index: o.index || 0, items,
      update() {
        if (G.input.repeat('up')) { sc.index = (sc.index + items.length - 1) % items.length; G.audio.sfx('cursor'); o.onMove && o.onMove(sc.index); }
        if (G.input.repeat('down')) { sc.index = (sc.index + 1) % items.length; G.audio.sfx('cursor'); o.onMove && o.onMove(sc.index); }
        if (G.input.pressed('a')) { G.audio.sfx('select'); if (!o.keep) G.pop(sc); o.onSelect && o.onSelect(sc.index, sc); }
        else if (G.input.pressed('b')) {
          if (o.onCancel) { G.audio.sfx('back'); if (!o.keep) G.pop(sc); o.onCancel(sc); }
          else if (o.cancelIndex != null) { G.audio.sfx('back'); if (!o.keep) G.pop(sc); o.onSelect && o.onSelect(o.cancelIndex, sc); }
        }
      },
      draw() {
        G.box(o.x, o.y, w, h);
        items.forEach((s, i) => G.text(s, o.x + 16, o.y + 8 + i * 16 + 0));
        G.text('▶', o.x + 6, o.y + 8 + sc.index * 16);
        o.drawExtra && o.drawExtra(sc);
      },
    };
    return G.push(sc);
  };

  // ---------- Transitions ----------
  // G.fade(mid, {color:3|0, frames:10}) — fade out, call mid() (swap scenes there), fade back in. Stays on top of the stack.
  G.fade = function (mid, o) {
    o = o || {}; const col = o.color == null ? 3 : o.color, F = o.frames || 10;
    let t = 0, phase = 0;
    const sc = {
      update() {
        t++;
        if (phase === 0 && t >= F) { phase = 1; t = 0; G.pop(sc); mid && mid(); G.push(sc); }
        else if (phase === 1 && t >= F) { G.pop(sc); o.onDone && o.onDone(); }
      },
      draw() {
        const k = phase === 0 ? t / F : 1 - t / F, steps = Math.round(k * 4) / 4;
        if (steps <= 0) return;
        G.ctx.globalAlpha = Math.min(1, steps); G.rect(0, 0, G.W, G.H, col); G.ctx.globalAlpha = 1;
      },
    };
    return G.push(sc);
  };
  // G.wait(frames, cb) — invisible blocking scene (cutscene pacing).
  G.wait = function (frames, cb) { let t = 0; const sc = { update() { if (++t >= frames) { G.pop(sc); cb && cb(); } }, draw() {} }; return G.push(sc); };

  // ---------- Utils ----------
  G.rand = (n) => Math.floor(Math.random() * n);
  G.chance = (p) => Math.random() < p;
  G.pick = (a) => a[G.rand(a.length)];
  G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.haptic = function (kind) { if (G.onHaptic) G.onHaptic(kind); else if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 30 : 8); };

  // ---------- Options (persist separately from save) ----------
  G.opts = { textSpeed: 'mid', palette: 'amber', sound: true, music: 0.6, sfx: 0.8, lcd: true };
  try { Object.assign(G.opts, JSON.parse(localStorage.getItem('wildlight_opts') || '{}')); } catch (e) {}
  G.saveOpts = function () { try { localStorage.setItem('wildlight_opts', JSON.stringify(G.opts)); } catch (e) {} };

  // ---------- Game state + save ----------
  // World module owns map/x/y/dir meaning; battle module owns party/mon shape (see DESIGN.md).
  G.newState = function () {
    return { v: 1, player: { name: 'SAM' }, rival: { name: 'KAI' }, map: 'home', x: 4, y: 4, dir: 'down',
      party: [], box: [], bag: { potion: 1 }, money: 3000, badges: [], dex: { seen: {}, caught: {} },
      flags: {}, playTime: 0, lastHeal: null };
  };
  G.state = G.newState();
  const SAVE_KEY = 'wildlight_save_v1';
  G.hasSave = function () { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };
  G.saveGame = function () { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.state)); return true; } catch (e) { return false; } };
  G.loadGame = function () { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) { G.state = Object.assign(G.newState(), s); return true; } } catch (e) {} return false; };
  G.dexSee = (id) => { G.state.dex.seen[id] = 1; };
  G.dexCatch = (id) => { G.state.dex.seen[id] = 1; G.state.dex.caught[id] = 1; };
  G.flag = (k, v) => { if (v === undefined) return !!G.state.flags[k]; G.state.flags[k] = v; };

  // ---------- Module stubs (real modules overwrite these) ----------
  G.audio = { play() {}, stop() {}, sfx() {}, cry() {}, unlock() {} };
  G.SPR = G.SPR || {};
  G.DATA = G.DATA || {};

  // ---------- Main loop (fixed 60 Hz) ----------
  let acc = 0, last = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!last) last = ts;
    acc += Math.min(100, ts - last); last = ts;
    let steps = 0;
    while (acc >= 1000 / 60 && steps < 4) {
      acc -= 1000 / 60; steps++; G.frame++;
      G.input._tick();
      const t = G.top(); if (t) t.update();
    }
    if (steps) draw();
  }
  function draw() {
    let start = 0;
    for (let i = G.scenes.length - 1; i >= 0; i--) if (G.scenes[i].opaque) { start = i; break; }
    if (!G.scenes.length || !G.scenes[start].opaque) G.clear(0);
    for (let i = start; i < G.scenes.length; i++) G.scenes[i].draw();
    if (G.onFrame) G.onFrame(); // shell hook (e.g. LCD ghosting)
  }

  G.boot = async function (canvas) {
    G.init(canvas);
    G.setPalette(G.opts.palette);
    const fam = '8px "Press Start 2P"';
    try { await Promise.race([document.fonts.load(fam), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
    buildGlyphs(document.fonts && document.fonts.check(fam) ? fam : 'bold 8px monospace');
    if (G.Title && G.Title.start) G.Title.start();
    else if (G.World && G.World.start) G.World.start({ newGame: true });
    requestAnimationFrame(loop);
  };
})();
