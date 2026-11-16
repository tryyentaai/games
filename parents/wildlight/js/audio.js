// WILDLIGHT — audio.js. A 4-channel handheld-style chiptune engine on WebAudio:
// 2 pulse channels (duty 12.5/25/50/75%), 1 wavetable channel, 1 LFSR noise channel.
// Songs are written in a tiny MML dialect plus chord-driven arpeggio/bass generators.
// All music and sound here is original.
(function () {
  'use strict';
  const G = window.G;

  // ======================================================================
  // Context + buses
  // ======================================================================
  let ctx = null, master = null, musicBus = null, duckBus = null, sfxBus = null, unlocked = false;
  const PW = {}; // periodic waves: p0..p3 (pulse duties), wv (wave channel)
  let noiseLong = null, noiseShort = null;

  function initCtx() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { return false; } }
    master = ctx.createGain(); master.gain.value = 0.9;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 12000; lp.Q.value = 0.3;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 28;
    let out = lp;
    if (ctx.createDynamicsCompressor) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.18;
      lp.connect(comp); out = comp;
    }
    master.connect(hp); hp.connect(lp); out.connect(ctx.destination);
    musicBus = ctx.createGain(); duckBus = ctx.createGain(); sfxBus = ctx.createGain();
    musicBus.connect(duckBus); duckBus.connect(master); sfxBus.connect(master);
    // Pulse waves via Fourier series of a pulse train with duty d.
    [0.125, 0.25, 0.5, 0.75].forEach((d, k) => {
      const N = 64, re = new Float32Array(N), im = new Float32Array(N);
      for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d);
      PW['p' + k] = ctx.createPeriodicWave(re, im);
    });
    // Wave channel: a 32-step 4-bit table (soft, round "bass" timbre), turned into harmonics by DFT.
    const T = [8, 10, 12, 13, 14, 15, 15, 15, 14, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 1, 2, 3, 5, 6];
    const mean = T.reduce((a, b) => a + b, 0) / T.length, N2 = 16, re2 = new Float32Array(N2), im2 = new Float32Array(N2);
    for (let k = 1; k < N2; k++) {
      let a = 0, b = 0;
      for (let n = 0; n < 32; n++) { const s = (T[n] - mean) / 7.5; a += s * Math.cos((2 * Math.PI * k * n) / 32); b += s * Math.sin((2 * Math.PI * k * n) / 32); }
      re2[k] = (2 / 32) * a; im2[k] = (2 / 32) * b;
    }
    PW.wv = ctx.createPeriodicWave(re2, im2);
    noiseLong = lfsr(false); noiseShort = lfsr(true);
    ctx.onstatechange = () => { if (ctx.state === 'running' && pending) { const p = pending; pending = null; startTrack(p.name, p.o); } };
    applyVolumes(true);
    setInterval(tick, 25);
    return true;
  }
  // Linear-feedback shift register noise, like the handheld's noise channel (15-bit "long" / 7-bit "short" metallic mode).
  function lfsr(short) {
    const sr = ctx.sampleRate, len = sr; const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    let reg = 0x7fff;
    for (let i = 0; i < len; i++) {
      if ((i & 1) === 0) {
        const bit = (reg ^ (reg >> 1)) & 1;
        reg = (reg >> 1) | (bit << 14);
        if (short) reg = (reg & ~0x40) | (bit << 6);
      }
      d[i] = reg & 1 ? -0.7 : 0.7;
    }
    return b;
  }

  let volCache = '';
  function applyVolumes(force) {
    if (!ctx) return;
    const o = G.opts || {}, on = o.sound !== false;
    const mv = on ? G.clamp(+o.music || 0, 0, 1) : 0, sv = on ? G.clamp(+o.sfx || 0, 0, 1) : 0;
    const key = mv + '|' + sv; if (!force && key === volCache) return; volCache = key;
    const t = ctx.currentTime;
    musicBus.gain.setTargetAtTime(mv * mv * 1.0, t, 0.05); // perceptual-ish curve
    sfxBus.gain.setTargetAtTime(sv * sv * 1.0, t, 0.03);
  }

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ======================================================================
  // MML dialect
  //   c d e f g a b  (+/# sharp, - flat) [len] [.]   r = rest   ^len = tie/extend previous note
  //   o4 octave  > <  l8 default length  v0-15 volume  @0-3 duty (12.5/25/50/75%)  q1-8 gate
  //   noise: k kick, s snare, h hat, x open hat, t tom.   [ ... ]n repeat.   | bar lines (ignored)
  //   Ticks: whole note = 96.
  // ======================================================================
  const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function parseMML(src) {
    let s = String(src).replace(/\|/g, ' ');
    const rep = /\[([^\[\]]*)\](\d*)/;
    while (rep.test(s)) s = s.replace(rep, (m, a, n) => Array(+(n || 2)).fill(a).join(' '));
    const ev = []; let t = 0, oct = 4, L = 8, v = 12, duty = 2, q = 8, i = 0;
    const num = () => { const m = /^\d+/.exec(s.slice(i)); if (m) { i += m[0].length; return +m[0]; } return null; };
    const len = () => { const n = num(); let d = 96 / (n || L); if (s[i] === '.') { d *= 1.5; i++; } return d; };
    while (i < s.length) {
      const c = s[i++];
      if (c <= ' ') continue;
      if (c in PC) {
        let pc = PC[c];
        if (s[i] === '+' || s[i] === '#') { pc++; i++; } else if (s[i] === '-') { pc--; i++; }
        const d = len(); ev.push({ t, d, m: 12 * (oct + 1) + pc, v, duty, q }); t += d;
      } else if (c === 'r') t += len();
      else if ('kshxt'.includes(c)) { const d = len(); ev.push({ t, d, n: c, v }); t += d; }
      else if (c === '^') { const d = len(); const e = ev[ev.length - 1]; if (e && Math.abs(e.t + e.d - t) < 0.01) e.d += d; t += d; }
      else if (c === 'o') oct = num();
      else if (c === '>') oct++;
      else if (c === '<') oct--;
      else if (c === 'l') L = num() || 8;
      else if (c === 'v') v = num();
      else if (c === '@') duty = G.clamp(num() || 0, 0, 3);
      else if (c === 'q') q = G.clamp(num() || 8, 1, 8);
    }
    return { ev, len: t };
  }

  // Chord-driven generator. chords: "D A Bm G,A" (space = bar, comma splits a bar).
  // pat: tokens of chord-tone index (0 root, 1 third, 2 fifth, 3 = root+8va ...), '.' rest, '-' hold.
  const NAMES = ['c', 'c+', 'd', 'd+', 'e', 'f', 'f+', 'g', 'g+', 'a', 'a+', 'b'];
  const QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], sus4: [0, 5, 7], aug: [0, 4, 8], '5': [0, 7] };
  function chord(name) {
    const m = /^([A-G])([#b]?)(.*)$/.exec(name); if (!m) return { r: 0, iv: [0, 4, 7] };
    let r = PC[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); r = (r + 12) % 12;
    return { r, iv: QUAL[m[3]] || QUAL[''] };
  }
  function arp(chords, o) {
    const len = o.len || 8, pat = o.pat.trim().split(/\s+/), oct = o.oct == null ? 4 : o.oct, out = [];
    let si = 0;
    chords.trim().split(/\s+/).forEach((bar) => {
      const segs = bar.split(','), per = len / segs.length;
      segs.forEach((cn, k) => {
        const ch = chord(cn);
        for (let j = 0; j < per; j++, si++) {
          const tok = pat[(k * per + j) % pat.length];
          if (tok === '.') { out.push('r' + len); continue; }
          if (tok === '-') { out.push('^' + len); continue; }
          const idx = +tok, n = ch.iv.length;
          const midi = 12 * (oct + 1) + ch.r + ch.iv[idx % n] + 12 * Math.floor(idx / n);
          out.push('o' + (Math.floor(midi / 12) - 1) + NAMES[midi % 12] + len);
        }
      });
    });
    return (o.pre || '') + ' ' + out.join(' ');
  }

  // ======================================================================
  // SONGS (original compositions). Each: bpm, loop, ch:{p1,p2,w,n}, env, optional intro, echo.
  // ======================================================================
  const SONGS = {};
  function song(name, def) { SONGS[name] = def; }

  // --- TITLE: bright, heroic. D major.
  {
    const C = 'D A Bm G D A G A Bm G D A Bm G Em A';
    song('title', { bpm: 140, loop: true, ch: {
      p1: '@1 v13 l8 o5 f+4. e d4 a4 | g+4 a b a4 e4 | f+4. e d c+ d f+ | g2 r g a b | a4. f+ d4 o6 d4 | c+4 o5 b a b4 e4 | d e f+ g a4 g f+ | e2. r4 |' +
          'o5 f+ b o6 c+ d o5 b4 f+4 | g b o6 d e d4 o5 b4 | a4. b a f+ d f+ | e4. f+ e c+ o4 a4 | o5 d c+ d f+ b4 a g | f+4 g a b4 o6 d4 | e4. d o5 b4 g4 | a2 g f+ e c+',
      p2: arp(C, { pre: '@0 v8', len: 8, oct: 4, pat: '0 2 1 2 3 2 1 2' }),
      w: arp(C, { pre: 'v12', len: 8, oct: 2, pat: '0 . 0 2 3 . 2 .' }),
      n: 'v10 k8 h8 s8 h8 k8 k8 s8 h8',
    } });
  }
  // --- TOWN (Hollowbrook): cozy, lilting. F major.
  {
    const C = 'F Am Bb C F Am Gm C Dm Am Bb F Gm C F Gm,C';
    song('town', { bpm: 104, loop: true, ch: {
      p1: '@2 v11 l8 o5 c4 o4 a g f4 a4 | o5 c4. d e4 c4 | d4 c o4 a+ a4 g4 | g2 r4 o5 c d | f4. e d c o4 a o5 c | e4 c4 o4 a4 o5 c4 | d c o4 a+ a g4 a+4 | o5 c2. r4 |' +
          'o5 d4 f e d4 a4 | c4. o4 b a2 | o5 d4 f d c4 o4 a+4 | a4 o5 c4 f4 r4 | g4. f e d c o4 a+ | a4 g4 o5 c4 e4 | f4. g a g f e | d4 o4 a+4 o5 c2',
      p2: arp(C, { pre: '@1 v6 q5', len: 8, oct: 4, pat: '. 1 . 2 . 1 . 2' }),
      w: arp(C, { pre: 'v11 q6', len: 8, oct: 3, pat: '0 . 2 . 0 . 2 .' }),
      n: 'v6 k8 h8 r8 h8 s8 h8 r8 h8',
    } });
  }
  // --- ROUTE: upbeat adventure. G major.
  {
    const C = 'G G C D Em C A7 D G Bm C D Em C Am D';
    song('route', { bpm: 150, loop: true, ch: {
      p1: '@1 v12 l8 o5 d d g d b4 a g | a4 b a g4 d4 | e e g e c4 e g | f+4. e d2 | b b o6 d o5 b g4 b o6 d | e4 d c o5 b4 g4 | c+ e a g e4 c+4 | d4 f+ a o6 d4 r4 |' +
          'o5 g4 b o6 d c o5 b a g | f+4 d4 b4 f+4 | g a g e c4 e4 | f+ g a b o6 c o5 b a f+ | g4. a b4 e4 | c d e g o6 c4 o5 g4 | a4 o6 c o5 a e4 a4 | f+4 a f+ d e f+ a',
      p2: arp(C, { pre: '@2 v6 q6', len: 8, oct: 4, pat: '0 1 2 1 0 1 2 1' }),
      w: arp(C, { pre: 'v12', len: 8, oct: 2, pat: '0 - 2 0 3 0 2 0' }),
      n: 'v9 k8 h8 s8 h8 k8 h8 s8 h16 h16',
    } });
  }
  // --- FOREST (Whisperwood): hushed, mysterious, with echo. E minor.
  {
    const C = 'Em C Am B Em C D B Am Em C B Am C Am,B Em';
    song('forest', { bpm: 96, loop: true, echo: { from: 'p1', to: 'p2', delay: 18, v: 0.45, duty: 0 }, ch: {
      p1: '@0 v11 l8 o5 e4. f+ g4 b4 | a2 g4 e4 | e4. d c4 o4 a4 | b2. r4 | o5 b4. a g4 f+4 | e2 g4 o6 c4 | o5 b4 a g f+4 d4 | d+2. r4 |' +
          'o5 c4 e4 a4. g | g4 f+ e b2 | c4 e4 g4. f+ | f+2 d+4 o4 b4 | o5 a4. b o6 c4 o5 a4 | g4 e4 c4 e4 | e4 c4 d+4 f+4 | e2. r4',
      w: arp(C, { pre: 'v10', len: 8, oct: 2, pat: '0 - - 2 - - 3 -' }),
      n: 'v5 k4 h8 r8 r8 h8 h8 r8',
    } });
  }
  // --- CAVE: cold, sparse, echoing. D minor.
  {
    const C = 'Dm Bb Gm A Dm Eb Gm A';
    song('cave', { bpm: 84, loop: true, echo: { from: 'p1', to: 'p2', delay: 24, v: 0.4, duty: 0 }, ch: {
      p1: '@1 v10 l8 o5 d2 r f e d | f2 e4 d4 | d2. r o4 a+ | a2 o5 c+4 e4 | a2 g f e f | g4. f d+2 | d4 o4 a+4 g4 a+4 | a1',
      w: arp(C, { pre: 'v10', len: 4, oct: 2, pat: '0 - - 2' }),
      n: 'v5 k2 r2 r2 h4 x4',
    } });
  }
  // --- LAB: curious, bubbly, staccato. C major.
  {
    const C = 'C Am F G C E7 F G7';
    song('lab', { bpm: 116, loop: true, ch: {
      p1: '@2 v11 q5 l8 o5 e g o6 c o5 g e g c e | a o6 c e c o5 a4 e4 | c f a o6 c d4 c4 | o5 b4 g4 d4 g4 | g e c e g o6 c e d | o5 b4 g+4 e4 d4 | c f a o6 c f4 e d | d4 o5 b g f4 d4',
      p2: arp(C, { pre: '@1 v5 q4', len: 16, oct: 4, pat: '0 1 2 3' }),
      w: arp(C, { pre: 'v11 q5', len: 8, oct: 3, pat: '0 0 . 0 2 2 . 2' }),
      n: 'v6 k8 h16 h16 s8 h8 k8 h8 s8 h8',
    } });
  }
  // --- BATTLE (wild): fast and urgent. A minor.
  {
    const C = 'Am Am F G Am Am F E Dm Am Dm E F G E E';
    song('battle', { bpm: 168, loop: true, intro: {
      ch: { p1: '@2 v12 l16 o6 e d+ d c+ c o5 b a+ a g+ g f+ f e d+ d c+ | o4 b8 o5 e8 b8 o4 b8 o5 e8 b8 e4', p2: '@0 v7 l16 o5 e d+ d c+ c o4 b a+ a g+ g f+ f e d+ d c+ | o3 b8 o4 e8 b8 o3 b8 o4 e8 b8 e4', w: 'v12 o2 e8 e8 e8 e8 e8 e8 e8 e8 | e8 e8 e8 e8 e8 e8 e4', n: 'v9 [s16]16 | k8 k8 s8 k8 k8 s8 s16 s16 s16 s16' }, len: 192 },
      ch: {
        p1: '@1 v12 l8 o5 a a o6 c o5 a e a b o6 c | d c o5 b a e4 a4 | o6 c c f c o5 a o6 c d e | d4. c o5 b4 g4 | a a o6 e o5 a o6 f e d c | o5 b o6 c d e a4 g4 | f4. e d c o5 a o6 c | o5 b4 g+4 e4 g+4 |' +
            'o5 f a o6 d o5 a f a o6 d f | e4. d c4 o5 a4 | d f a o6 d f4 e d | e2 o5 b4 g+4 | a o6 c f c o5 a o6 c f a | g f e d o5 b o6 d g4 | g+4. f+ e d c o5 b | g+ b o6 e g+ b4 r4',
        p2: arp(C, { pre: '@2 v6', len: 16, oct: 4, pat: '0 1 2 1' }),
        w: arp(C, { pre: 'v12', len: 8, oct: 2, pat: '0 3 0 3 0 3 0 3' }),
        n: 'v10 k8 h8 s8 h8 k8 k8 s8 s16 s16',
      } });
  }
  // --- TRAINER battle: syncopated, defiant. G minor.
  {
    const C = 'Gm Gm Eb F Gm Gm Eb D Cm Gm Cm D Eb F D D';
    song('trainer', { bpm: 176, loop: true, intro: {
      ch: { p1: '@2 v12 l16 o5 g8 r g8 r g8 r g a+ o6 d g4 | f+8 r f+8 r f+8 r d f+ a8 d8', p2: '@0 v7 l16 o4 g8 r g8 r g8 r g a+ o5 d g4 | f+8 r f+8 r f+8 r d f+ a8 d8', w: 'v12 o2 [g8 r16 g16]4 | [d8 r16 d16]4', n: 'v9 k8 r16 s16 k8 r16 s16 k8 s8 s8 s8 | k8 r16 s16 k8 r16 s16 [s16]8' }, len: 192 },
      ch: {
        p1: '@1 v12 l8 o5 g8. g16 r a+ o6 d c o5 a+ a | g4 d g r a+ a g | g8. g16 r a+ o6 d+ d c o5 a+ | o6 c4 o5 a f r a o6 c f | d8. d16 r c o5 a+ a g a+ | o6 d4 g4 f+4 d4 | d+ d c o5 a+ g4 o6 c4 | o5 a4 f+4 d4 f+4 |' +
            'o5 g o6 c d+ c g4 f d+ | d4. c o5 a+4 g4 | d+ g o6 c d+ g f d+ d | d2 o5 a4 f+4 | a+ o6 d+ g d+ a+4 g4 | a g f d+ d c o5 a o6 c | d f+ a f+ d4 o5 a4 | f+ a o6 d f+ a4 r4',
        p2: arp(C, { pre: '@0 v6', len: 16, oct: 4, pat: '0 2 1 2' }),
        w: arp(C, { pre: 'v12', len: 8, oct: 2, pat: '0 3 2 3 0 3 2 3' }),
        n: 'v10 k8 h8 s8 h8 k16 k16 h8 s8 h8',
      } });
  }
  // --- WARDEN battle: epic, relentless. C minor.
  {
    const C = 'Cm Ab Bb G Cm Ab Fm G Ab Bb Gm Cm Ab Bb G G';
    song('warden', { bpm: 184, loop: true, intro: {
      ch: { p1: '@2 v13 l8 o5 c c r c c r c c | d+ d+ r d+ f f g4', p2: '@1 v8 l8 o4 g g r g g r g g | a+ a+ r a+ o5 c c d4', w: 'v13 l8 o2 c c r c c r c c | c c r c c c c4', n: 'v10 k8 k8 r8 k8 k8 r8 k8 k8 | s8 s8 r8 s8 [s16]8' }, len: 192 },
      ch: {
        p1: '@2 v13 l8 o5 c4 d+4 g4 o6 c4 | c4. o5 a+ g+4 d+4 | f4. g a+4 o6 d4 | d2 o5 b4 g4 | o6 c d d+ d c o5 a+ g d+ | g+ a+ o6 c d+ g+4 g4 | f d+ c o5 g+ f4 g+4 | g b o6 d f g4 b4 |' +
            'o6 c4. d+ g+4 g4 | f4. d+ d4 o5 a+4 | o6 d d+ f g f d+ d o5 a+ | o6 c2. r4 | d+ c o5 g+ o6 c d+ g+ g f | d f a+ f d o5 a+ o6 d f | g4. f d4 o5 b4 | g g+ b o6 d f g b o7 d',
        p2: arp(C, { pre: '@1 v6', len: 16, oct: 4, pat: '0 1 2 3' }),
        w: arp(C, { pre: 'v13', len: 8, oct: 2, pat: '0 0 3 0 2 0 3 0' }),
        n: 'v10 k8 h8 s8 k8 k8 h8 s8 h16 s16',
      } });
  }
  // --- VICTORY: fanfare intro, then a proud loop. C major.
  {
    const C = 'C F G C Am F D7 G';
    song('victory', { bpm: 132, loop: true, intro: {
      ch: { p1: '@2 v13 l8 o5 g g g o6 c4. o5 a+ o6 c | d4 e4 g2', p2: '@1 v8 l8 o5 e e e g4. f g | b4 o6 c4 d2', w: 'v12 o3 c8 c8 c8 c4. o2 a+8 o3 c8 | g4 g4 c2', n: 'v8 s8 s8 s8 k4. s8 s8 | k4 k4 [s16]8' }, len: 192 },
      ch: {
        p1: '@2 v12 l8 o6 c4 o5 g e g4 o6 c4 | o5 a4 o6 c f a4 f4 | d4 o5 b g d4 g4 | o6 e4. d c2 | c e a e c o5 a o6 c e | f4 a4 f4 c4 | f+4. e d4 c4 | o5 b4 o6 d4 g4 r4',
        p2: arp(C, { pre: '@1 v6 q6', len: 8, oct: 4, pat: '0 1 2 1' }),
        w: arp(C, { pre: 'v11', len: 8, oct: 3, pat: '0 . 2 . 3 . 2 .' }),
        n: 'v7 k8 h8 s8 h8 k8 h8 s8 h8',
      } });
  }
  // --- HEAL (jingle): warm sparkle.
  song('heal', { bpm: 120, loop: false, ch: {
    p1: '@2 v12 l8 o5 c e g o6 c o5 b o6 d g4 | e c d o5 b o6 c2',
    p2: '@1 v7 l8 o4 g o5 c e g g b o6 d4 | o5 g e f d e2',
    w: 'v11 o3 c4 f4 g4 g4 | c4 g4 c2',
  } });
  // --- CAUGHT (jingle): a little victory twirl.
  song('caught', { bpm: 140, loop: false, ch: {
    p1: '@1 v13 l8 o5 g e g o6 c e4 d c | o5 b o6 d g b o7 c2',
    p2: '@2 v7 l8 o5 e c e g o6 c4 o5 b a | g b o6 d g e2',
    w: 'v12 o3 c4 e4 f4 f+4 | g4 g4 c2',
    n: 'v7 r2 r4 s8 s8 | k4 k4 x2',
  } });
  // --- EVOLVE: suspended, rising, shimmering. C minor.
  {
    const C = 'Cm Ab Fm G';
    song('evolve', { bpm: 120, loop: true, ch: {
      p1: '@2 v11 l8 o5 g2 c4 d+4 | d+2. c4 | f2 g+4 o6 c4 | o5 b2 o6 d2',
      p2: arp(C, { pre: '@0 v6', len: 16, oct: 4, pat: '0 1 2 3 4 5 4 3' }),
      w: arp(C, { pre: 'v11', len: 8, oct: 2, pat: '0 - 0 - 0 - 0 -' }),
      n: 'v4 [h16]16',
    } });
  }
  // --- ENDING: warm, reflective, hopeful. F major.
  {
    const C = 'F C Dm Bb F C Bb C Dm Am Bb F Gm C F F';
    song('ending', { bpm: 92, loop: true, ch: {
      p1: '@2 v11 l8 o5 a4. g f4 c4 | e4. f g2 | a4 o6 c4 d4 c o5 a | a+2 a4 g4 | a4. g f4 a4 | o6 c4. o5 a+ a g e c | d4 f4 a+4 a g | g2. r4 |' +
          'o5 f4 a4 o6 d4. c | c4 o5 e4 a2 | a+4 o6 d4 f4 e d | c2 o5 a4 f4 | g4 a+4 o6 d4 c o5 a+ | a4 g4 e4 c4 | f2 a4 o6 c4 | f2. r4',
      p2: arp(C, { pre: '@0 v5', len: 8, oct: 4, pat: '0 2 1 2 3 2 1 2' }),
      w: arp(C, { pre: 'v10', len: 4, oct: 2, pat: '0 2 3 2' }),
      n: 'v5 k8 r8 h8 r8 s8 r8 h8 r8',
    } });
  }

  // ======================================================================
  // Compile
  // ======================================================================
  const CHANS = ['p1', 'p2', 'w', 'n'];
  const compiled = {};
  function compile(name) {
    if (compiled[name]) return compiled[name];
    const def = SONGS[name]; if (!def) return null;
    const out = { name, def, spt: 60 / def.bpm / 24, chans: {}, introLen: def.intro ? def.intro.len : 0 };
    CHANS.forEach((c) => {
      const main = def.ch[c] ? parseMML(def.ch[c]) : { ev: [], len: 0 };
      const intro = def.intro && def.intro.ch[c] ? parseMML(def.intro.ch[c]).ev : [];
      out.chans[c] = { intro, loop: main.ev, len: main.len };
    });
    if (def.echo) { // delayed, quieter copy of one channel into another (cheap 2026 "reverb")
      const src = out.chans[def.echo.from], L = src.len, ev = src.loop.map((e) => {
        let t = e.t + def.echo.delay; if (t >= L) t -= L;
        return Object.assign({}, e, { t, v: e.v * def.echo.v, duty: def.echo.duty == null ? e.duty : def.echo.duty });
      }).sort((a, b) => a.t - b.t);
      out.chans[def.echo.to] = { intro: [], loop: ev, len: L };
    }
    out.total = out.introLen + Math.max(...CHANS.map((c) => out.chans[c].len));
    return (compiled[name] = out);
  }

  // ======================================================================
  // Voices
  // ======================================================================
  const CH_GAIN = { p1: 0.13, p2: 0.11, w: 0.2, n: 0.2 };
  const CH_PAN = { p1: -0.22, p2: 0.24, w: 0, n: 0.08 };
  const ENV = { p1: [0.72, 0.35], p2: [0.38, 0.16] }; // [sustain level, decay time]

  function voice(dest, t, dur, ev, ch, gate) {
    const rel = 0.025, peak = CH_GAIN[ch] * (ev.v / 15);
    const g = ctx.createGain(); g.connect(dest);
    const o = ctx.createOscillator();
    const f = mtof(ev.m);
    o.frequency.setValueAtTime(f, t);
    const sd = dur * (gate / 8);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.004);
    if (ch === 'w') {
      o.setPeriodicWave(PW.wv);
      g.gain.setValueAtTime(peak, t + Math.max(0.005, sd - rel));
    } else {
      o.setPeriodicWave(PW['p' + (ev.duty | 0)]);
      const [sus, dec] = ENV[ch] || ENV.p1;
      g.gain.linearRampToValueAtTime(peak * sus, t + Math.min(dec, Math.max(0.01, sd - rel)));
      g.gain.setValueAtTime(peak * sus, t + Math.max(0.006, sd - rel));
      if (ch === 'p1' && sd > 0.28) { // delayed vibrato on held lead notes
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + 0.16); lg.gain.linearRampToValueAtTime(f * 0.006, t + 0.4);
        lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + sd + rel + 0.05);
      }
    }
    g.gain.linearRampToValueAtTime(0, t + sd);
    o.connect(g); o.start(t); o.stop(t + sd + 0.03);
    o.onended = () => { try { g.disconnect(); } catch (e) {} };
  }
  function noiseHit(dest, t, kind, vol, short) {
    const p = { k: [0.09, 0.09, 1.0], s: [0.5, 0.13, 0.75], h: [1.7, 0.035, 0.38], x: [1.4, 0.16, 0.32], t: [0.25, 0.1, 0.6] }[kind] || [1, 0.05, 0.5];
    const src = ctx.createBufferSource(); src.buffer = short ? noiseShort : noiseLong; src.loop = true;
    src.playbackRate.setValueAtTime(p[0], t);
    const g = ctx.createGain(); const pk = vol * p[2];
    g.gain.setValueAtTime(pk, t); g.gain.linearRampToValueAtTime(0, t + p[1]);
    src.connect(g); g.connect(dest); src.start(t, Math.random() * 0.8); src.stop(t + p[1] + 0.02);
    src.onended = () => { try { g.disconnect(); } catch (e) {} };
    if (kind === 'k' || kind === 't') { // body thump
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'triangle';
      const f0 = kind === 'k' ? 150 : 220;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(kind === 'k' ? 42 : 90, t + 0.1);
      og.gain.setValueAtTime(vol * 1.6, t); og.gain.linearRampToValueAtTime(0, t + 0.11);
      o.connect(og); og.connect(dest); o.start(t); o.stop(t + 0.13);
      o.onended = () => { try { og.disconnect(); } catch (e) {} };
    }
  }

  // ======================================================================
  // Sequencer
  // ======================================================================
  let cur = null, curName = null, prevLoop = null, pending = null;
  function startTrack(name, o) {
    o = o || {};
    const c = compile(name); if (!c) return;
    stopSong(0.04);
    const songGain = ctx.createGain(); songGain.connect(musicBus);
    const outs = {};
    CHANS.forEach((ch) => {
      let node = songGain;
      if (ctx.createStereoPanner) { node = ctx.createStereoPanner(); node.pan.value = CH_PAN[ch]; node.connect(songGain); }
      outs[ch] = node;
    });
    const t0 = ctx.currentTime + 0.06;
    cur = { c, name, t0, outs, songGain, onEnd: o.onEnd, st: {}, endAt: c.def.loop ? Infinity : t0 + c.total * c.spt + 0.15 };
    CHANS.forEach((ch) => { cur.st[ch] = { phase: c.introLen ? 0 : 1, idx: 0, off: c.introLen, done: false }; });
    curName = name;
    tick();
  }
  function stopSong(fade) {
    if (!cur) return;
    const s = cur; cur = null;
    try {
      const t = ctx.currentTime;
      s.songGain.gain.cancelScheduledValues(t); s.songGain.gain.setValueAtTime(s.songGain.gain.value, t);
      s.songGain.gain.linearRampToValueAtTime(0, t + (fade || 0.04));
    } catch (e) {}
    setTimeout(() => { try { s.songGain.disconnect(); } catch (e) {} }, (fade || 0.04) * 1000 + 400);
  }
  function tick() {
    if (!ctx) return;
    applyVolumes();
    if (!cur || ctx.state !== 'running') return;
    const now = ctx.currentTime, ahead = now + 0.18, c = cur.c;
    CHANS.forEach((ch) => {
      const st = cur.st[ch], cd = c.chans[ch];
      let guard = 0;
      while (!st.done && guard++ < 256) {
        let list;
        if (st.phase === 0) {
          list = cd.intro;
          if (st.idx >= list.length) { st.phase = 1; st.idx = 0; st.off = c.introLen; continue; }
          const ev = list[st.idx], t = cur.t0 + ev.t * c.spt;
          if (t > ahead) break;
          if (t > now - 0.03) play1(ch, ev, t, c.spt);
          st.idx++;
        } else {
          list = cd.loop;
          if (!list.length || cd.len <= 0) { st.done = true; break; }
          if (st.idx >= list.length) { if (!c.def.loop) { st.done = true; break; } st.idx = 0; st.off += cd.len; continue; }
          const ev = list[st.idx], t = cur.t0 + (st.off + ev.t) * c.spt;
          if (t > ahead) break;
          if (t > now - 0.03) play1(ch, ev, t, c.spt);
          st.idx++;
        }
      }
    });
    if (now >= cur.endAt) {
      const s = cur, fin = s.onEnd; cur = null; curName = null;
      setTimeout(() => { try { s.songGain.disconnect(); } catch (e) {} }, 300);
      if (fin) fin();
      else if (prevLoop) API.play(prevLoop);
    }
  }
  function play1(ch, ev, t, spt) {
    const dest = cur.outs[ch], dur = ev.d * spt;
    if (ch === 'n') noiseHit(dest, t, ev.n, CH_GAIN.n * (ev.v / 15), false);
    else voice(dest, t, dur, ev, ch, ev.q || 8);
  }

  // ======================================================================
  // SFX
  // ======================================================================
  function T(o) { // pulse/tri tone with linear (handheld-style) decay. o:{t,f,f1,d,v,duty,wave,lin,hold,vib,vibHz,dest}
    const t0 = ctx.currentTime + 0.004 + (o.t || 0), d = o.d || 0.1;
    const osc = ctx.createOscillator();
    if (o.wave) osc.type = o.wave; else osc.setPeriodicWave(PW['p' + (o.duty == null ? 2 : o.duty)]);
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f1) { if (o.lin) osc.frequency.linearRampToValueAtTime(o.f1, t0 + (o.sd || d)); else osc.frequency.exponentialRampToValueAtTime(o.f1, t0 + (o.sd || d)); }
    const g = ctx.createGain(), v = (o.v == null ? 0.5 : o.v) * 0.32;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.004);
    if (o.hold) g.gain.setValueAtTime(v, t0 + d * o.hold);
    g.gain.linearRampToValueAtTime(0, t0 + d);
    if (o.vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vibHz || 20; lg.gain.value = o.f * o.vib;
      l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + d + 0.02);
    }
    osc.connect(g); g.connect(o.dest || sfxBus); osc.start(t0); osc.stop(t0 + d + 0.03);
    osc.onended = () => { try { g.disconnect(); } catch (e) {} };
  }
  function Nz(o) { // noise burst o:{t,d,v,r,r1,short}
    const t0 = ctx.currentTime + 0.004 + (o.t || 0), d = o.d || 0.1;
    const src = ctx.createBufferSource(); src.buffer = o.short ? noiseShort : noiseLong; src.loop = true;
    src.playbackRate.setValueAtTime(o.r || 1, t0);
    if (o.r1) src.playbackRate.exponentialRampToValueAtTime(o.r1, t0 + d);
    const g = ctx.createGain(), v = (o.v == null ? 0.5 : o.v) * 0.3;
    g.gain.setValueAtTime(v, t0); if (o.hold) g.gain.setValueAtTime(v, t0 + d * o.hold); g.gain.linearRampToValueAtTime(0, t0 + d);
    src.connect(g); g.connect(o.dest || sfxBus); src.start(t0, Math.random() * 0.8); src.stop(t0 + d + 0.03);
    src.onended = () => { try { g.disconnect(); } catch (e) {} };
  }
  const nf = (m) => mtof(m);
  function arpS(notes, step, o) { notes.forEach((m, i) => T(Object.assign({ t: i * step, f: nf(m), d: step * 1.6, v: 0.45, duty: 2 }, o, i === notes.length - 1 && o && o.last ? o.last : {}))); }

  const SFX = {
    blip: () => T({ f: 1760, d: 0.028, v: 0.22, duty: 1 }),
    cursor: () => T({ f: 1318, d: 0.035, v: 0.3, duty: 2 }),
    select: () => { T({ f: 988, d: 0.045, v: 0.35, duty: 2 }); T({ t: 0.045, f: 1976, d: 0.07, v: 0.35, duty: 2 }); },
    back: () => T({ f: 1200, f1: 520, d: 0.08, v: 0.35, duty: 2 }),
    bump: () => { T({ f: 120, f1: 70, d: 0.09, v: 0.6, duty: 2 }); Nz({ d: 0.05, r: 0.3, v: 0.25 }); },
    door: () => { Nz({ d: 0.28, r: 0.7, r1: 0.15, v: 0.5 }); T({ f: 260, f1: 110, d: 0.22, v: 0.35, duty: 1 }); },
    hit: () => { Nz({ d: 0.2, r: 1.3, r1: 0.25, v: 0.9 }); T({ f: 220, f1: 70, d: 0.12, v: 0.4, duty: 2 }); },
    hitSuper: () => { Nz({ d: 0.34, r: 1.8, r1: 0.12, v: 1.0, hold: 0.2 }); T({ f: 420, f1: 50, d: 0.3, v: 0.55, duty: 0 }); T({ t: 0.05, f: 300, f1: 40, d: 0.25, v: 0.4, duty: 2 }); },
    hitWeak: () => { Nz({ d: 0.1, r: 0.8, r1: 0.4, v: 0.45 }); },
    faint: () => { T({ f: 700, f1: 70, d: 0.75, v: 0.5, duty: 2, lin: true, vib: 0.04, vibHz: 18 }); Nz({ t: 0.55, d: 0.35, r: 0.25, r1: 0.08, v: 0.4 }); },
    levelup: () => { arpS([72, 76, 79, 84, 88, 91], 0.055, { duty: 1, v: 0.4 }); T({ t: 0.33, f: nf(96), d: 0.35, v: 0.4, duty: 2, hold: 0.5 }); T({ t: 0.33, f: nf(91), d: 0.35, v: 0.25, duty: 0, hold: 0.5 }); },
    heal: () => { [0, 0.24].forEach((o) => arpS([79, 83, 86, 91], 0.05, { t: o, duty: 1, v: 0.35 })); },
    orbThrow: () => { T({ f: 280, f1: 1500, d: 0.26, v: 0.3, duty: 1 }); Nz({ d: 0.3, r: 0.4, r1: 2.2, v: 0.35 }); },
    orbShake: () => { Nz({ d: 0.035, r: 1.5, v: 0.5, short: true }); T({ f: 170, f1: 120, d: 0.07, v: 0.45, duty: 2 }); T({ t: 0.09, f: 150, f1: 110, d: 0.06, v: 0.35, duty: 2 }); },
    orbCatch: () => { Nz({ d: 0.04, r: 2, v: 0.5, short: true }); T({ t: 0.05, f: 880, d: 0.05, v: 0.4, duty: 2 }); T({ t: 0.1, f: 1318, d: 0.3, v: 0.4, duty: 1, hold: 0.3 }); },
    run: () => { Nz({ d: 0.36, r: 0.35, r1: 1.8, v: 0.5 }); [0, 0.09, 0.18].forEach((t) => T({ t, f: 600, f1: 300, d: 0.05, v: 0.25, duty: 2 })); },
    save: () => { arpS([76, 79, 84], 0.07, { duty: 2, v: 0.4 }); T({ t: 0.24, f: nf(86), d: 0.08, v: 0.4, duty: 2 }); T({ t: 0.32, f: nf(88), d: 0.3, v: 0.4, duty: 2, hold: 0.4 }); },
    item: () => { arpS([79, 84, 88], 0.07, { duty: 1, v: 0.4 }); T({ t: 0.21, f: nf(91), d: 0.4, v: 0.4, duty: 1, hold: 0.5, vib: 0.008, vibHz: 6 }); T({ t: 0.21, f: nf(84), d: 0.4, v: 0.25, duty: 2, hold: 0.5 }); },
    ledge: () => { T({ f: 280, f1: 640, d: 0.1, v: 0.35, duty: 2 }); T({ t: 0.1, f: 640, f1: 200, d: 0.14, v: 0.35, duty: 2 }); Nz({ t: 0.24, d: 0.05, r: 0.4, v: 0.3 }); },
    encounter: () => { [0, 0.11, 0.22, 0.33].forEach((t, i) => T({ t, f: 1800 - i * 150, f1: 180, d: 0.11, v: 0.35, duty: i & 1 ? 0 : 2 })); Nz({ t: 0.44, d: 0.25, r: 2, r1: 0.3, v: 0.5 }); },
  };

  // ======================================================================
  // Cries — deterministic per creature id
  // ======================================================================
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function cry(id, o) {
    o = o || {};
    if (!ready()) return 0;
    const R = rng(hash(String(id)) ^ 0x9e3779b9);
    const md = G.DATA && G.DATA.mons && G.DATA.mons[id];
    let bst = 300; if (md && md.base) bst = Object.values(md.base).reduce((a, b) => a + (+b || 0), 0);
    const size = G.clamp((bst - 200) / 300, 0, 1); // bigger/stronger = lower, longer
    const types = (md && md.types) || [];
    const pitch = (o.pitch || 1) * (1.6 - size * 0.9) * (0.85 + R() * 0.3);
    const slow = (o.slow || 1) * (0.8 + size * 0.5);
    const segs = 2 + Math.floor(R() * 3);
    let t = 0;
    const base = 420 * pitch;
    for (let i = 0; i < segs; i++) {
      const d = (0.07 + R() * 0.16) * slow;
      const f = base * (0.6 + R() * 0.9), f1 = f * (0.5 + R() * 1.3);
      T({ t, f, f1, d: d + 0.03, v: 0.55, duty: Math.floor(R() * 3), vib: 0.02 + R() * 0.09, vibHz: 12 + R() * 26, hold: 0.55 });
      if (R() < 0.45) T({ t, f: f * 1.5, f1: f1 * 1.5, d: d + 0.03, v: 0.22, duty: 0, vib: 0.03, vibHz: 20, hold: 0.4 }); // overtone
      t += d * (0.75 + R() * 0.3);
    }
    if (types.some((x) => /ROCK|FIRE|GHOST/.test(x)) || R() < 0.3) Nz({ d: t * 0.9, r: 0.2 + R() * 0.6, r1: 0.1 + R() * 0.3, v: 0.28, hold: 0.5, short: types.includes('ELECTRIC') });
    duck(t + 0.1);
    return t + 0.08;
  }
  function duck(dur) {
    const n = ctx.currentTime;
    duckBus.gain.cancelScheduledValues(n); duckBus.gain.setTargetAtTime(0.35, n, 0.02); duckBus.gain.setTargetAtTime(1, n + dur, 0.08);
  }

  // ======================================================================
  // Public API
  // ======================================================================
  function ready() { if (!ctx) initCtx(); return !!ctx && ctx.state === 'running'; }
  const API = {
    tracks: Object.keys(SONGS),
    // play(track, {onEnd, restart}) — idempotent for the playing track. Jingles (non-looping) resume the previous loop unless onEnd given.
    play(name, o) {
      o = o || {};
      if (!SONGS[name]) return;
      if (!o.restart && curName === name && (cur || pending)) return;
      if (SONGS[name].loop) prevLoop = name;
      curName = name;
      if (!ctx) initCtx();
      if (!ctx || ctx.state !== 'running') { pending = { name, o }; return; }
      pending = null; startTrack(name, o);
    },
    stop(fade) { pending = null; curName = null; prevLoop = null; if (ctx) stopSong(fade || 0.05); },
    current: () => curName,
    sfx(name) { if (!ready() || !SFX[name]) return; try { SFX[name](); } catch (e) {} },
    cry(id, o) { try { return cry(id, o); } catch (e) { return 0; } },
    unlock() {
      if (!initCtx()) return;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {} // iOS: play even with ring switch on silent
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      if (!unlocked) {
        try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
        unlocked = true;
      }
    },
    setVolumes() { applyVolumes(true); },
    // dev helper: per-channel loop lengths in bars for every song
    _lengths() { const r = {}; Object.keys(SONGS).forEach((n) => { r[n] = {}; CHANS.forEach((c) => { r[n][c] = SONGS[n].ch[c] ? parseMML(SONGS[n].ch[c]).len / 96 : 0; }); }); return r; },
    _parse: parseMML,
  };
  G.audio = API;

  // Backup unlock on the first gesture anywhere.
  const first = () => { API.unlock(); ['pointerdown', 'touchend', 'keydown'].forEach((e) => removeEventListener(e, first, true)); };
  ['pointerdown', 'touchend', 'keydown'].forEach((e) => addEventListener(e, first, true));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (unlocked) ctx.resume().catch(() => {});
  });
  addEventListener('pagehide', () => { if (ctx) ctx.suspend().catch(() => {}); });
})();
