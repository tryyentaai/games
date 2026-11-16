// WILDLIGHT — title screen, new-game intro, name entry, options.
(function () {
  'use strict';
  const G = window.G;
  const T = (G.Title = {});

  // Big outlined logo text: 2x scaled font with a dark outline.
  function bigText(s, y, fill, outline) {
    const w = s.length * 16, x = ((G.W - w) / 2) | 0, ctx = G.ctx;
    const at = (dx, dy, c) => { ctx.save(); ctx.translate(x + dx, (y | 0) + dy); ctx.scale(2, 2); G.text(s, 0, 0, c); ctx.restore(); };
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 2], [0, 2], [2, 2], [2, 1]]) at(dx, dy, outline);
    at(1, 1, 2); at(0, 0, fill);
  }
  function monFront(id) { return G.SPR.mons && G.SPR.mons[id] && G.SPR.mons[id].front; }

  // ---------- Title ----------
  T.start = function () {
    G.clearScenes();
    G.audio.play('title');
    let t = 0, phase = 0; // 0 = logo/press start, 1 = menu open
    const sparks = Array.from({ length: 14 }, () => ({ x: G.rand(160), y: G.rand(90), s: G.rand(60) }));
    const sc = {
      opaque: true,
      update() {
        t++;
        if (phase === 0 && t > 30 && (G.input.pressed('start') || G.input.pressed('a'))) { phase = 1; G.audio.sfx('select'); openMenu(); }
      },
      draw() {
        G.clear(0);
        // banded sky
        G.rect(0, 0, 160, 10, 1); G.rect(0, 14, 160, 4, 1); G.rect(0, 22, 160, 2, 1);
        // hills
        for (let x = 0; x < 160; x++) {
          const h1 = 104 + Math.round(Math.sin((x + t * 0.15) / 18) * 5), h2 = 116 + Math.round(Math.sin(x / 11 + 2) * 3);
          G.rect(x, h1, 1, 144 - h1, 1); G.rect(x, h2, 1, 144 - h2, 2);
        }
        G.rect(0, 132, 160, 12, 3);
        // sparkles
        sparks.forEach((p) => { const k = (t + p.s) % 60; if (k < 30) { const c = k < 10 ? 1 : k < 20 ? 2 : 1; G.rect(p.x, p.y, 1, 1, c); if (k > 8 && k < 22) { G.rect(p.x - 1, p.y, 3, 1, c); G.rect(p.x, p.y - 1, 1, 3, c); } } });
        // logo drop-in with bounce
        const drop = Math.min(1, t / 40), bounce = drop < 1 ? (1 - drop) * -50 : Math.round(Math.sin(t / 30) * 1);
        bigText('WILDLIGHT', 16 + bounce, 0, 3);
        if (t > 40) { G.rect(30, 40, 100, 1, 3); G.textC('AMBER EDITION', 44, 2); }
        // hero creature
        const f = monFront('voltkit');
        if (f) { const bob = (t >> 4) & 1; G.drawSpr(f, 64, 64 + bob); }
        else { G.textC('★', 76, 3); }
        if (phase === 0 && t > 40 && (t >> 5) & 1) G.textC('PRESS START', 104, 3);
        G.textC('WILDLIGHT TEAM 2026', 136, 0);
      },
    };
    G.push(sc);
    function openMenu() {
      const items = [], acts = [];
      if (G.hasSave()) { items.push('CONTINUE'); acts.push(cont); }
      items.push('NEW GAME'); acts.push(newGame);
      items.push('OPTIONS'); acts.push(() => T.options(openMenu));
      G.menu({ items, x: 24, y: 88 - (items.length - 2) * 16, w: 112, onSelect: (i) => acts[i](), onCancel: () => { phase = 0; t = 41; } });
    }
  };

  function cont() {
    G.loadGame();
    G.fade(() => { G.clearScenes(); startWorld(false); });
  }
  function startWorld(newGame) {
    if (G.World && G.World.start) G.World.start({ newGame });
    else { G.push({ opaque: true, update() {}, draw() { G.clear(0); G.textC('WORLD LOADING…', 68); } }); }
  }

  // ---------- New game intro ----------
  function newGame() {
    const go = () => G.fade(() => { G.clearScenes(); G.state = G.newState(); intro(); });
    if (G.hasSave()) G.say('A saved journey already exists. Start over? It will be erased when you save.', { choices: ['YES', 'NO'], onChoice: (i) => { if (i === 0) go(); } });
    else go();
  }
  function intro() {
    G.audio.play('lab');
    let show = 'prof', t = 0;
    const stage = {
      opaque: true,
      update() { t++; },
      draw() {
        G.clear(0);
        G.rect(0, 80, 160, 16, 1); // floor glow
        if (show === 'prof') {
          const p = G.SPR.chars && G.SPR.chars.prof && G.SPR.chars.prof.down && G.SPR.chars.prof.down[0];
          if (p) { G.ctx.save(); G.ctx.scale(3, 3); G.drawSpr(p, 80 / 3 - 8, 30 / 3 - 4); G.ctx.restore(); }
          else G.textC('PROF. WREN', 44);
        } else if (show === 'mon') {
          const f = monFront('fluffin') || monFront('voltkit');
          if (f) G.drawSpr(f, 64, 44 + ((t >> 4) & 1)); else G.textC('?', 56);
        } else if (show === 'player') {
          const p = G.SPR.chars && G.SPR.chars.player && G.SPR.chars.player.down && G.SPR.chars.player.down[0];
          if (p) { G.ctx.save(); G.ctx.scale(3, 3); G.drawSpr(p, 80 / 3 - 8, 30 / 3 - 4); G.ctx.restore(); }
        } else if (show === 'rival') {
          const p = G.SPR.chars && G.SPR.chars.rival && G.SPR.chars.rival.down && G.SPR.chars.rival.down[0];
          if (p) { G.ctx.save(); G.ctx.scale(3, 3); G.drawSpr(p, 80 / 3 - 8, 30 / 3 - 4); G.ctx.restore(); }
        }
      },
    };
    G.push(stage);
    G.say(['Oh! Sorry, I was halfway through a sandwich. I\'m WREN. I run the little lab down in HOLLOWBROOK.', 'You\'ve probably seen me crawling around in the tall grass with a notebook.'], {
      onDone() {
        show = 'mon'; G.audio.cry && G.audio.cry('fluffin');
        G.say(['Those little rustles in the grass? Those are WILDS. AMBERLEAF is full of them.', 'Get close enough to one and something odd happens. The air goes warm and gold, like late afternoon.', 'I call it WILDLIGHT. Nobody believes me yet.'], {
          onDone() {
            show = 'player';
            G.say('Anyway! You look like someone with somewhere to be. Remind me, what do people call you?', {
              onDone() {
                nameEntry('YOUR NAME?', ['SAM', 'ALEX', 'RIO'], (name) => {
                  G.state.player.name = name;
                  show = 'rival';
                  G.say(['{PLAYER}! Of course. Mom\'s been telling me all about you.', 'And this one lives next door. Loud, fast, convinced he\'s going to be the best trainer in AMBERLEAF. Name was...?'], {
                    onDone() {
                      nameEntry("RIVAL'S NAME?", ['KAI', 'JUNE', 'REX'], (rname) => {
                        G.state.rival.name = rname;
                        G.say(['{RIVAL}! Yes. He\'s been camped outside my lab since sunrise.', 'Come by when you\'re up, {PLAYER}. I have a feeling today\'s the day something finds you.'], {
                          onDone() { G.fade(() => { G.clearScenes(); startWorld(true); }, { color: 0, frames: 20 }); },
                        });
                      });
                    },
                  });
                });
              },
            });
          },
        });
      },
    });
  }

  // ---------- Name entry: presets list, or a letter grid ----------
  function nameEntry(title, presets, cb) {
    G.menu({ items: ['NEW NAME', ...presets], x: 0, y: 0, w: 88, onSelect: (i) => { if (i === 0) grid(title, cb); else cb(presets[i - 1]); } });
  }
  function grid(title, cb) {
    const rows = ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ ', 'abcdefghi', 'jklmnopqr', 'stuvwxyz ', '-?!.♂♀   '];
    const MAX = 7; let name = '', cx = 0, cy = 0;
    const endRow = rows.length; // virtual row: DEL / END
    const sc = {
      opaque: true,
      update() {
        if (G.input.repeat('up')) { cy = (cy + endRow) % (endRow + 1); G.audio.sfx('cursor'); }
        if (G.input.repeat('down')) { cy = (cy + 1) % (endRow + 1); G.audio.sfx('cursor'); }
        if (G.input.repeat('left')) { cx = (cx + 8) % 9; G.audio.sfx('cursor'); }
        if (G.input.repeat('right')) { cx = (cx + 1) % 9; G.audio.sfx('cursor'); }
        if (G.input.pressed('b')) { name = name.slice(0, -1); G.audio.sfx('back'); }
        if (G.input.pressed('start')) cy = endRow, cx = 5;
        if (G.input.pressed('a')) {
          if (cy === endRow) {
            if (cx < 4) { name = name.slice(0, -1); G.audio.sfx('back'); }
            else if (name.trim().length) { G.audio.sfx('select'); G.pop(sc); cb(name.trim()); }
          } else {
            const ch = rows[cy][cx];
            if (ch && ch !== ' ' && name.length < MAX) { name += ch; G.audio.sfx('select'); if (name.length === MAX) { cy = endRow; cx = 5; } }
          }
        }
      },
      draw() {
        G.clear(0);
        G.text(title, 8, 4);
        G.box(32, 14, 96, 20);
        for (let i = 0; i < MAX; i++) { if (name[i]) G.text(name[i], 52 + i * 8, 20); else G.rect(52 + i * 8, 28, 7, 1, (i === name.length && (G.frame >> 4) & 1) ? 3 : 2); }
        G.box(0, 36, 160, 108);
        rows.forEach((r, y) => [...r].forEach((ch, x) => G.text(ch, 20 + x * 14, 46 + y * 12)));
        G.text('DEL', 28, 132); G.text('END', 100, 132);
        if (cy === endRow) G.text('▶', cx < 4 ? 18 : 90, 132);
        else G.text('▶', 11 + cx * 14, 46 + cy * 12);
      },
    };
    G.push(sc);
  }

  // ---------- Options ----------
  T.options = function (onClose) {
    const pals = Object.keys(G.PALETTES), speeds = ['slow', 'mid', 'fast', 'instant'], vols = [0, 0.2, 0.4, 0.6, 0.8, 1];
    if (G.opts.haptics === undefined) G.opts.haptics = true;
    const rows = [
      { k: 'PALETTE', get: () => G.PALETTES[G.palKey].name, step: (d) => { const i = (pals.indexOf(G.palKey) + d + pals.length) % pals.length; G.opts.palette = pals[i]; G.setPalette(pals[i]); } },
      { k: 'TEXT', get: () => G.opts.textSpeed.toUpperCase(), step: (d) => { G.opts.textSpeed = speeds[(speeds.indexOf(G.opts.textSpeed) + d + speeds.length) % speeds.length]; } },
      { k: 'MUSIC', get: () => bar(G.opts.music), step: (d) => { G.opts.music = vols[G.clamp(nearest(G.opts.music) + d, 0, 5)]; G.audio.setVolume && G.audio.setVolume(); } },
      { k: 'SFX', get: () => bar(G.opts.sfx), step: (d) => { G.opts.sfx = vols[G.clamp(nearest(G.opts.sfx) + d, 0, 5)]; G.audio.setVolume && G.audio.setVolume(); G.audio.sfx('blip'); } },
      { k: 'LCD FX', get: () => (G.opts.lcd ? 'ON' : 'OFF'), step: () => { G.opts.lcd = !G.opts.lcd; G.onPalette && G.onPalette(G.palKey); } },
      { k: 'HAPTICS', get: () => (G.opts.haptics ? 'ON' : 'OFF'), step: () => { G.opts.haptics = !G.opts.haptics; G.haptic('light'); } },
      { k: 'DONE' },
    ];
    function nearest(v) { let b = 0; vols.forEach((x, i) => { if (Math.abs(x - v) < Math.abs(vols[b] - v)) b = i; }); return b; }
    function bar(v) { const n = nearest(v); return '='.repeat(n) + '-'.repeat(5 - n); }
    let idx = 0;
    const sc = {
      opaque: true,
      update() {
        if (G.input.repeat('up')) { idx = (idx + rows.length - 1) % rows.length; G.audio.sfx('cursor'); }
        if (G.input.repeat('down')) { idx = (idx + 1) % rows.length; G.audio.sfx('cursor'); }
        const r = rows[idx];
        if (r.step && G.input.repeat('left')) { r.step(-1); G.audio.sfx('cursor'); }
        if (r.step && (G.input.repeat('right') || G.input.pressed('a'))) { r.step(1); G.audio.sfx('cursor'); }
        if (G.input.pressed('b') || G.input.pressed('start') || (!r.step && G.input.pressed('a'))) { G.saveOpts(); G.audio.sfx('back'); G.pop(sc); onClose && onClose(); }
      },
      draw() {
        G.clear(0);
        G.box(0, 0, 160, 144);
        G.textC('OPTIONS', 8, 3);
        rows.forEach((r, i) => { const y = 26 + i * 15; G.text(r.k, 16, y); if (r.get) G.textR(r.get(), 152, y, 2); });
        G.text('▶', 6, 26 + idx * 15);
        // palette swatch
        for (let c = 0; c < 4; c++) G.rect(52 + c * 14, 130, 12, 6, c);
      },
    };
    G.push(sc);
  };
})();
