/* The Cribbage Room — shared UI kit: storage, cards, peg board, sound, effects, navigation. */
(function () {
  const C = window.CRIB;
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const settings = Object.assign({ coach: true, hints: true, muggins: false, sound: true, lm: false }, LS.get('crib-settings', {}));
  const saveSettings = () => LS.set('crib-settings', settings);

  /* ---------- cards ---------- */
  const RANKN = C.RANKS;
  function cardHTML(c, o) {
    o = o || {};
    const tag = o.button ? 'button' : 'div';
    const cls = ['card', C.isRed(c) ? 'red' : '', o.cls || ''].join(' ');
    const attrs = (o.button ? 'type="button" data-id="' + c.id + '"' : 'role="img"') + (o.style ? ' style="' + o.style + '"' : '');
    const r = RANKN[c.r - 1], s = C.SUITS[c.s];
    const face = c.r > 10 ? '<span class="court">' + r + '</span>' : '<span class="pip">' + s + '</span>';
    return '<' + tag + ' class="' + cls + '" ' + attrs + ' aria-label="' + C.label(c) + '">' +
      '<span class="ix">' + r + '<i>' + s + '</i></span>' + face + '<span class="ix b">' + r + '<i>' + s + '</i></span>' +
      (o.hint ? '<span class="hint">' + o.hint + '</span>' : '') + '</' + tag + '>';
  }
  const backHTML = (o) => '<div class="card back ' + ((o && o.cls) || '') + '"' + (o && o.style ? ' style="' + o.style + '"' : '') + '></div>';

  /* ---------- peg board ---------- */
  // Serpentine board: row 1 runs left to right (1-40), row 2 back (41-80), row 3 out again (81-120), then the game hole.
  const BX0 = 30, SP = 7.15, GG = 3.1;
  function colX(i) { return BX0 + i * SP + Math.floor(i / 5) * GG; }
  function holeXY(lane, n) {
    if (n <= 0) return { x: 13, y: 24 + lane * 12 };
    if (n >= 121) return { x: 346, y: 108 + lane * 12 };
    const idx = n - 1, row = Math.floor(idx / 40), i = idx % 40;
    const col = row === 1 ? 39 - i : i;
    return { x: colX(col), y: 24 + row * 42 + lane * 12 };
  }
  let boardSeq = 0;
  function createBoard(el, colors) {
    const id = 'b' + (++boardSeq);
    colors = colors || ['#ebcb86', '#d0566a'];
    let s = '<svg viewBox="0 0 360 136" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cribbage board">' +
      '<defs>' +
      '<linearGradient id="' + id + 'w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4e2f"/><stop offset=".5" stop-color="#5d3a22"/><stop offset="1" stop-color="#4a2d1a"/></linearGradient>' +
      '<filter id="' + id + 'g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".008 .28" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 .12  0 0 0 0 .06  0 0 0 0 .02  0 0 0 .55 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>' +
      '<radialGradient id="' + id + 'h"><stop offset="0" stop-color="#0d0805"/><stop offset=".7" stop-color="#1c110a"/><stop offset="1" stop-color="#6b4a30"/></radialGradient>';
    colors.forEach((c, k) => {
      s += '<radialGradient id="' + id + 'p' + k + '" cx=".35" cy=".3"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="' + c + '"/><stop offset="1" stop-color="' + c + '" stop-opacity=".55"/></radialGradient>';
    });
    s += '</defs>' +
      '<rect width="360" height="136" fill="url(#' + id + 'w)"/><rect width="360" height="136" fill="#fff" filter="url(#' + id + 'g)"/>';
    // lane inlays
    for (let row = 0; row < 3; row++)
      for (let lane = 0; lane < 2; lane++) {
        const y = 24 + row * 42 + lane * 12;
        s += '<line x1="' + (colX(0) - 4) + '" x2="' + (colX(39) + 4) + '" y1="' + y + '" y2="' + y + '" stroke="' + colors[lane] + '" stroke-opacity=".18" stroke-width="7" stroke-linecap="round"/>';
      }
    // skunk line between 90 and 91, and the 60 midpoint
    [[90.5, '#d0566a'], [60.5, '#ebcb86']].forEach(([n, col]) => {
      const a = holeXY(0, Math.floor(n)), b = holeXY(0, Math.ceil(n));
      const x = (a.x + b.x) / 2, y = a.y;
      s += '<line x1="' + x + '" x2="' + x + '" y1="' + (y - 7) + '" y2="' + (y + 19) + '" stroke="' + col + '" stroke-width="1.2" stroke-opacity=".75"/>';
    });
    for (let lane = 0; lane < 2; lane++)
      for (let n = 0; n <= 121; n++) {
        const p = holeXY(lane, n);
        s += '<circle cx="' + p.x.toFixed(2) + '" cy="' + p.y + '" r="' + (n === 121 || n === 0 ? 2.6 : 1.9) + '" fill="url(#' + id + 'h)"/>';
      }
    s += '<text x="346" y="100" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-weight="900" font-size="8" fill="#ebcb86" fill-opacity=".8">121</text>';
    s += '<text x="13" y="16" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-size="6.5" fill="#ebcb86" fill-opacity=".6">start</text>';
    for (let lane = 0; lane < 2; lane++)
      for (const k of ['b', 'f']) {
        const p = holeXY(lane, 0);
        s += '<g class="peg" data-peg="' + lane + k + '" style="transform:translate(' + p.x + 'px,' + p.y + 'px)">' +
          '<ellipse cx="1.2" cy="2.2" rx="4.2" ry="2.6" fill="#000" opacity=".35"/>' +
          '<circle r="4.1" fill="url(#' + id + 'p' + lane + ')" stroke="#000" stroke-opacity=".45" stroke-width=".5"/></g>';
      }
    s += '</svg>';
    el.innerHTML = s;
    const pegs = {};
    el.querySelectorAll('[data-peg]').forEach((g) => { pegs[g.dataset.peg] = g; });
    return {
      set(front, back) {
        for (let lane = 0; lane < 2; lane++) {
          const f = holeXY(lane, front[lane]), b = holeXY(lane, back[lane]);
          pegs[lane + 'f'].style.transform = 'translate(' + f.x + 'px,' + f.y + 'px)';
          pegs[lane + 'b'].style.transform = 'translate(' + b.x + 'px,' + b.y + 'px)';
        }
      }
    };
  }

  /* ---------- sound (synthesized, no files) ---------- */
  let ac = null;
  function audio() {
    if (!settings.sound) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, slide) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function snap() {
    const a = audio(); if (!a) return;
    const len = Math.floor(a.sampleRate * 0.05), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 2200; g.gain.value = 0.5;
    src.connect(f).connect(g).connect(a.destination); src.start();
  }
  const SFX = {
    card: snap,
    peg: () => { tone(1500, 0.06, 'triangle', 0.12, 900); setTimeout(() => tone(1100, 0.05, 'triangle', 0.08, 700), 70); },
    score: () => { tone(660, 0.12, 'sine', 0.12); setTimeout(() => tone(990, 0.18, 'sine', 0.1), 90); },
    big: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.1), i * 80)); },
    tick: () => tone(1800, 0.03, 'square', 0.04),
    lose: () => { tone(392, 0.25, 'sine', 0.1, 330); setTimeout(() => tone(294, 0.4, 'sine', 0.1, 220), 220); }
  };
  document.addEventListener('pointerdown', () => { if (settings.sound) audio(); }, { once: true });
  const buzz = (ms) => { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} };

  /* ---------- effects ---------- */
  function burst(text, sub, who, anchor) {
    const fx = $('fx'); if (!fx || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'burst ' + who;
    d.style.left = Math.max(70, Math.min(window.innerWidth - 70, r.left + r.width / 2)) + 'px';
    const key = Math.round(r.left) + ':' + Math.round(r.top);
    fx.querySelectorAll('.burst').forEach((o) => { if (o.dataset.key === key) o.remove(); });
    d.dataset.key = key;
    d.style.top = (r.top - 8) + 'px';
    d.innerHTML = esc(text) + (sub ? '<small>' + esc(sub) + '</small>' : '');
    fx.appendChild(d);
    setTimeout(() => d.remove(), 1600);
  }
  // Animate a freshly rendered element in from where something used to be.
  function flyFrom(rect, el, ms) {
    if (!rect || !el || !el.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const to = el.getBoundingClientRect();
    if (!to.width) return;
    const dx = rect.left + rect.width / 2 - (to.left + to.width / 2), dy = rect.top + rect.height / 2 - (to.top + to.height / 2);
    const sc = rect.width / to.width || 1;
    el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ') rotate(-8deg)' }, { transform: 'none' }],
      { duration: ms || 380, easing: 'cubic-bezier(.2,.8,.3,1.05)' });
  }

  /* ---------- navigation & modal ---------- */
  const screens = ['home', 'pick', 'table', 'keeper', 'counter'];
  const hooks = {};
  function go(name, arg) {
    screens.forEach((s) => { $(s).hidden = s !== name; });
    closeModal();
    window.scrollTo(0, 0);
    if (hooks[name]) hooks[name](arg);
  }
  function modal(html) { const o = $('overlay'); o.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>'; o.hidden = false; }
  function closeModal() { const o = $('overlay'); o.hidden = true; o.innerHTML = ''; }
  $('overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay' && !$('overlay').dataset.sticky) closeModal(); });

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go]');
    if (t) go(t.dataset.go);
  });

  window.UI = { $, esc, LS, settings, saveSettings, cardHTML, backHTML, createBoard, SFX, buzz, burst, flyFrom, go, hooks, modal, closeModal };
})();
