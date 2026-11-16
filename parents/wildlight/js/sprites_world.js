// WILDLIGHT — overworld sprites (world engineer).
// G.SPR.tiles[name]  : 16x16 rows ('0'-'3', '.' transparent). Animated tiles have name + name2 (2nd frame).
// G.SPR.chars[name]  : {down:[f0,f1], up:[f0,f1], left:[f0,f1], right:[f0,f1]} 16x16 each.
// G.SPR.emotes[name] : 16x16 speech bubbles: excl, heart, note, dots, zz, angry.
// Art is composed from small templates below so every character shares one outline style.
(function () {
  'use strict';
  const G = window.G;
  G.SPR = G.SPR || {};

  // ---------- helpers ----------
  function mk(f) { const r = []; for (let y = 0; y < 16; y++) { let s = ''; for (let x = 0; x < 16; x++) s += f(x, y); r.push(s); } return r; }
  function rev(s) { return s.split('').reverse().join(''); }
  function mirror(rows) { return rows.map((h) => (h.length === 16 ? h : h + rev(h))); }
  function flip(rows) { return rows.map(rev); }
  function remap(rows, m) { return rows.map((r) => r.replace(/./g, (c) => (m[c] !== undefined ? m[c] : c))); }
  function over(base, top) { return base.map((r, y) => r.split('').map((c, x) => (top[y][x] === '.' ? c : top[y][x])).join('')); }
  function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function stamp(rows, pat, ox, oy) { // write small pattern into rows at ox,oy ('.' in pat = keep)
    const out = rows.slice();
    pat.forEach((p, j) => { const y = oy + j; if (y < 0 || y > 15) return; let r = out[y].split(''); for (let i = 0; i < p.length; i++) { const x = ox + i; if (x >= 0 && x < 16 && p[i] !== '.') r[x] = p[i]; } out[y] = r.join(''); });
    return out;
  }
  const T = {};

  // ---------- nature ----------
  T.grass = [
    '0000000000000000',
    '0000000000010000',
    '0100000000101000',
    '1010000000000000',
    '0000000000000000',
    '0000000100000000',
    '0000001010000000',
    '0000000000000000',
    '0000000000000010',
    '0001000000000101',
    '0010100000000000',
    '0000000000000000',
    '0000000000100000',
    '0000000001010000',
    '0000000000000000',
    '0000000000000000',
  ];
  T.path = mk((x, y) => { const h = hash(x, y, 7); return h < 0.07 ? '2' : h < 0.2 ? '0' : '1'; });
  T.sand = mk((x, y) => { const h = hash(x, y, 11); return h < 0.04 ? '2' : h < 0.16 ? '1' : '0'; });
  T.rocky = mk((x, y) => {
    const peb = [[3, 4], [11, 2], [7, 10], [13, 12], [2, 13]];
    for (const [px, py] of peb) { if (y === py && (x === px || x === px + 1)) return '2'; if (y === py + 1 && (x === px || x === px + 1)) return '3'; if (y === py - 1 && x === px) return '0'; }
    return hash(x, y, 5) < 0.06 ? '2' : '1';
  });
  // tall grass: two staggered rows of blade tufts; frame 2 sways one pixel
  function tallGrass(sh, bg, fill, edge, hi) {
    return mk((x, y) => {
      const band = y < 8 ? 0 : 1, ly = y % 8, off = band ? 4 : 0;
      const sway = ly < 3 ? sh : 0;
      const cx = (((x + off + sway) % 8) + 8) % 8; const d = Math.abs(cx - 3.5);
      const half = ly * 0.55 + 0.6;
      if (ly === 7) return d < 3 ? edge : bg;
      if (d < half - 1) return (ly < 4 && cx === 3) ? hi : fill;
      if (d < half) return edge;
      return bg;
    });
  }
  T.tallgrass = tallGrass(0, '1', '2', '3', '1');
  T.tallgrass2 = tallGrass(1, '1', '2', '3', '1');
  T.darkgrass = tallGrass(0, '2', '1', '3', '2');
  T.darkgrass2 = tallGrass(1, '2', '1', '3', '2');
  T.tree = [
    '.....333333.....',
    '...3322222233...',
    '..321112222223..',
    '.32111122212223.',
    '.32211222111223.',
    '3222222221122223',
    '3211222222222123',
    '3211122212222223',
    '3221222111222323',
    '.32222221122233.',
    '.33222222222333.',
    '..333322223333..',
    '....33322333....',
    '......3223......',
    '......3223......',
    '.....332233.....',
  ];
  T.pine = [
    '.......33.......',
    '......3123......',
    '.....312223.....',
    '....31222223....',
    '...3112222223...',
    '....33122233....',
    '....31222223....',
    '...3122222223...',
    '..311222222223..',
    '...3312222333...',
    '..312222222223..',
    '.31122222222223.',
    '.33333222233333.',
    '......3223......',
    '......3223......',
    '.....332233.....',
  ];
  T.darkfloor = mk((x, y) => { const h = hash(x, y, 13); return h < 0.08 ? '2' : h < 0.11 ? '0' : '1'; });
  function flowers(sh) {
    let r = T.grass.slice();
    const f = ['.33.', '3013', '3103', '.33.'];
    const f2 = ['.33.', '3103', '3013', '.33.'];
    const a = sh ? f2 : f;
    r = stamp(r, a, 2 + sh, 2); r = stamp(r, ['.3..'], 2, 6);
    r = stamp(r, a, 10 - sh, 9); r = stamp(r, ['..3.'], 10, 13);
    return r;
  }
  T.flower = flowers(0);
  T.flower2 = flowers(1);
  function water(ph) {
    return mk((x, y) => {
      const band = y % 8, ox = (((x + (y >= 8 ? 4 : 0) + ph * 2) % 8) + 8) % 8;
      if (band === 2 && (ox === 2 || ox === 3 || ox === 4)) return '0';
      if (band === 3 && (ox === 1 || ox === 5)) return '0';
      if (band === 3 && (ox >= 2 && ox <= 4)) return '2';
      if (band === 6 && ox === 7) return '2';
      return '1';
    });
  }
  T.water = water(0);
  T.water2 = water(1);
  T.shore_n = mk((x, y) => (y === 0 ? '3' : y === 1 ? '0' : y === 2 && (x % 4 === 1) ? '0' : '.'));
  T.shore_s = mk((x, y) => (y === 15 ? '3' : y === 14 ? '0' : '.'));
  T.shore_w = mk((x, y) => (x === 0 ? '3' : x === 1 ? '0' : '.'));
  T.shore_e = mk((x, y) => (x === 15 ? '3' : x === 14 ? '0' : '.'));
  T.ledge = over(T.grass, mk((x, y) => {
    if (y === 9) return '3';
    if (y === 10) return (x % 4 === 3) ? '3' : '2';
    if (y === 11) return (x % 4 === 3) ? '3' : '1';
    if (y === 12) return (x % 8 === 3) ? '2' : '.';
    if (y === 8) return x % 5 === 0 ? '1' : '.';
    return '.';
  }));
  T.fence = mk((x, y) => {
    const post = (x >= 1 && x <= 3) || (x >= 12 && x <= 14);
    if (post && y >= 2 && y <= 14) { if (x === 1 || x === 14 || y === 2 || y === 14) return '3'; return x === 2 || x === 13 ? '1' : '2'; }
    if ((y === 5 || y === 10) && !post) return '3';
    if ((y === 6 || y === 11) && !post) return '1';
    if ((y === 7 || y === 12) && !post) return '3';
    return '.';
  });
  T.sign = [
    '................',
    '................',
    '.33333333333333.',
    '.31111111111113.',
    '.31000000000013.',
    '.31033033303013.',
    '.31000000000013.',
    '.31030333033013.',
    '.31000000000013.',
    '.32222222222223.',
    '.33333322333333.',
    '......3223......',
    '......3223......',
    '......3223......',
    '.....322223.....',
    '.....333333.....',
  ];
  T.boulder = [
    '................',
    '................',
    '.....333333.....',
    '...3300011133...',
    '..301111112213..',
    '..301111111223..',
    '.3011112111223..',
    '.30111211112223.',
    '.31112111122223.',
    '.31111111122223.',
    '.31111111222233.',
    '.32211122222233.',
    '..332222222333..',
    '...3333333333...',
    '................',
    '................',
  ];
  T.cliff = mk((x, y) => {
    const row = Math.floor(y / 5), off = row % 2 ? 4 : 0;
    const bx = (x + off) % 8;
    if (y % 5 === 4) return '3';
    if (bx === 7) return '3';
    if (y % 5 === 0 || bx === 0) return '1';
    return hash(x, y, 9) < 0.15 ? '3' : '2';
  });
  T.cavemouth = over(T.cliff, mk((x, y) => {
    const d = Math.hypot(x - 7.5, Math.max(0, 9 - y));
    if (y >= 4 && d < 6) return d > 5 ? '2' : '3';
    return '.';
  }));
  T.cavefloor = mk((x, y) => { const h = hash(x, y, 17); return h < 0.06 ? '3' : h < 0.12 ? '1' : '2'; });
  T.cavewall = mk((x, y) => {
    const bx = (x + (Math.floor(y / 4) % 2) * 3) % 6;
    if (y % 4 === 3 || bx === 5) return '3';
    if (y % 4 === 0 && bx < 3) return '2';
    return hash(x, y, 19) < 0.2 ? '2' : '3';
  });
  T.crystal = [
    '.......33.......',
    '......3003......',
    '..33..3013......',
    '.3003.30113.33..',
    '.3013.301133003.',
    '.30113301113013.',
    '.30113301113013.',
    '..3011301133013.',
    '..30113011330113',
    '..30113011130113',
    '..3011301113013.',
    '.333333333333333',
    '.322222222222223',
    '..3333333333333.',
    '................',
    '................',
  ];
  T.dock = mk((x, y) => { if (y % 8 === 7) return '3'; if (x % 8 === 0 && y % 8 === 3) return '3'; if (y % 8 === 0) return '0'; return (x + y) % 11 === 0 ? '2' : '1'; });
  T.itemball = [
    '................',
    '................',
    '................',
    '................',
    '.....333333.....',
    '....32222223....',
    '...3200222223...',
    '...3202222223...',
    '...3333333333...',
    '...3000330003...',
    '...3000000003...',
    '....30000003....',
    '.....333333.....',
    '................',
    '................',
    '................',
  ];
  T.shadow = [
    '................', '................', '................', '................',
    '................', '................', '................', '................',
    '................', '................', '................', '................',
    '....33333333....', '...3333333333...', '....33333333....', '................',
  ];
  T.rustle = [
    '................', '................', '................', '................',
    '................', '................', '................', '................',
    '..3..........3..', '.323........323.', '..3..........3..', '................',
    '................', '................', '................', '................',
  ];
  T.black = mk(() => '3');

  // ---------- buildings (procedural pieces) ----------
  // House: dark shingle roof, cream plank walls.
  function roof(o) { // o: {l,r,top,eave, fill, line}
    return mk((x, y) => {
      if (o.top && y === 0) return '3';
      if (o.l && x === 0) return '3';
      if (o.r && x === 15) return '3';
      if (o.eave) { if (y >= 13) return y === 13 ? '3' : (y === 14 ? '2' : '3'); }
      const row = Math.floor(y / 4), bx = (x + (row % 2) * 4) % 8;
      if (y % 4 === 3) return '3';
      if (bx === 0) return '3';
      if (y % 4 === 0) return o.hi || '1';
      return o.fill || '2';
    });
  }
  T.roof_tl = roof({ l: 1, top: 1 }); T.roof_t = roof({ top: 1 }); T.roof_tr = roof({ r: 1, top: 1 });
  T.roof_bl = roof({ l: 1, eave: 1 }); T.roof_b = roof({ eave: 1 }); T.roof_br = roof({ r: 1, eave: 1 });
  function wall(o) {
    return mk((x, y) => {
      if (o.l && x === 0) return '3'; if (o.r && x === 15) return '3';
      if (y === 15) return '3';
      if (y % 4 === 0) return '1';
      return o.fill || '0';
    });
  }
  T.wall = wall({});
  function windowOn(base, dark) {
    return over(base, mk((x, y) => {
      if (x < 3 || x > 12 || y < 3 || y > 11) return '.';
      if (x === 3 || x === 12 || y === 3 || y === 11) return '3';
      if (x === 7 || x === 8 || y === 7) return '3';
      if ((x === 4 || x === 9) && (y === 4 || y === 8)) return '0';
      return dark ? '2' : '1';
    }));
  }
  T.wall_win = windowOn(T.wall);
  function doorOn(base, style) {
    return over(base, mk((x, y) => {
      if (x < 3 || x > 12 || y < 2) return '.';
      if (x === 3 || x === 12 || y === 2) return '3';
      if (style === 'glass') { if (x === 7 || x === 8) return '3'; if (y === 3) return '3'; return (x + y) % 5 === 0 ? '0' : '2'; }
      if (style === 'arch') { if (y === 3 && (x === 4 || x === 11)) return '3'; return y > 6 && (x === 7 || x === 8) ? '3' : '3'; }
      if (x === 10 && y === 9) return '1';
      if (y === 15) return '3';
      return x === 4 ? '3' : '2';
    }));
  }
  T.door = doorOn(T.wall);
  // Lab: flat pale roof with vents, block walls, glass door
  function labRoof(o) {
    return mk((x, y) => {
      if (o.top && y === 0) return '3'; if (o.l && x === 0) return '3'; if (o.r && x === 15) return '3';
      if (o.eave) { if (y === 12) return '3'; if (y > 12) return y === 13 ? '1' : '3'; }
      if (o.vent && x >= 5 && x <= 10 && y >= 4 && y <= 9) { if (x === 5 || x === 10 || y === 4 || y === 9) return '3'; return y % 2 ? '2' : '1'; }
      return (x + y * 3) % 16 === 0 ? '1' : '0';
    });
  }
  T.lab_roof_l = labRoof({ l: 1, top: 1 }); T.lab_roof = labRoof({ top: 1 }); T.lab_roof_v = labRoof({ top: 1, vent: 1 }); T.lab_roof_r = labRoof({ r: 1, top: 1 });
  T.lab_eave_l = labRoof({ l: 1, eave: 1 }); T.lab_eave = labRoof({ eave: 1 }); T.lab_eave_r = labRoof({ r: 1, eave: 1 });
  T.lab_wall = mk((x, y) => { if (y === 15) return '3'; if (y % 5 === 4) return '2'; if ((x + (Math.floor(y / 5) % 2) * 8) % 16 === 0) return '2'; return '1'; });
  T.lab_wall_l = over(T.lab_wall, mk((x) => (x === 0 ? '3' : '.')));
  T.lab_wall_r = over(T.lab_wall, mk((x) => (x === 15 ? '3' : '.')));
  T.lab_win = windowOn(T.lab_wall, true);
  T.lab_door = doorOn(T.lab_wall, 'glass');
  // Care Center: rounded light roof with a heart emblem
  function careRoof(o) {
    return mk((x, y) => {
      if (o.top && y === 0) return '3'; if (o.l && x === 0) return '3'; if (o.r && x === 15) return '3';
      if (o.eave) { if (y === 11) return '3'; if (y >= 12) return y % 2 ? '1' : '2'; }
      return y % 3 === 2 ? '1' : '0';
    });
  }
  T.care_roof_l = careRoof({ l: 1, top: 1 }); T.care_roof = careRoof({ top: 1 }); T.care_roof_r = careRoof({ r: 1, top: 1 });
  T.care_eave_l = careRoof({ l: 1, eave: 1 }); T.care_eave = careRoof({ eave: 1 }); T.care_eave_r = careRoof({ r: 1, eave: 1 });
  T.care_emblem = over(careRoof({ top: 1 }), [
    '................', '................', '...3333333333...', '..300000000003..',
    '..300330033003..', '..303223322303..', '..303222222303..', '..300322223003..',
    '..300032230003..', '..300003300003..', '..300000000003..', '...3333333333...',
    '................', '................', '................', '................']);
  T.care_wall = wall({ fill: '0' });
  T.care_win = windowOn(T.care_wall);
  T.care_door = doorOn(T.care_wall, 'glass');
  // Mart: striped awning, bold "bag" emblem
  function martRoof(o) {
    return mk((x, y) => {
      if (o.top && y === 0) return '3'; if (o.l && x === 0) return '3'; if (o.r && x === 15) return '3';
      if (o.eave) { if (y >= 8) { if (y === 15) return '3'; if (y === 14) return x % 4 < 2 ? '3' : '.'; return x % 4 < 2 ? '2' : '0'; } }
      return x % 4 < 2 ? '2' : '1';
    });
  }
  T.mart_roof_l = martRoof({ l: 1, top: 1 }); T.mart_roof = martRoof({ top: 1 }); T.mart_roof_r = martRoof({ r: 1, top: 1 });
  T.mart_eave_l = martRoof({ l: 1, eave: 1 }); T.mart_eave = martRoof({ eave: 1 }); T.mart_eave_r = martRoof({ r: 1, eave: 1 });
  T.mart_emblem = over(martRoof({ top: 1 }), [
    '................', '................', '.....333333.....', '.....3....3.....',
    '...3333333333...', '...3000000003...', '...3003003003...', '...3030330303...',
    '...3030000303...', '...3003333003...', '...3000000003...', '...3333333333...',
    '................', '................', '................', '................']);
  T.mart_wall = wall({ fill: '0' });
  T.mart_win = over(T.mart_wall, mk((x, y) => {
    if (x < 2 || x > 13 || y < 3 || y > 12) return '.';
    if (x === 2 || x === 13 || y === 3 || y === 12) return '3';
    if (y === 7 || y === 10) return '3';
    if (y < 7) return '1';
    return (x % 3 === 0) ? '2' : '1';
  }));
  T.mart_door = doorOn(T.mart_wall, 'glass');
  // Warden Hall: heavy stone gable, pillars
  function hallRoof(o) {
    return mk((x, y) => {
      if (o.top && y === 0) return '3'; if (o.l && x === 0) return '3'; if (o.r && x === 15) return '3';
      if (o.eave) { if (y === 10) return '3'; if (y > 10) return y === 11 ? '0' : y === 15 ? '3' : '1'; }
      const bx = (x + (Math.floor(y / 4) % 2) * 6) % 12;
      if (y % 4 === 3 || bx === 0) return '3';
      return '2';
    });
  }
  T.hall_roof_l = hallRoof({ l: 1, top: 1 }); T.hall_roof = hallRoof({ top: 1 }); T.hall_roof_r = hallRoof({ r: 1, top: 1 });
  T.hall_eave_l = hallRoof({ l: 1, eave: 1 }); T.hall_eave = hallRoof({ eave: 1 }); T.hall_eave_r = hallRoof({ r: 1, eave: 1 });
  T.hall_emblem = over(hallRoof({ top: 1 }), [
    '................', '.......33.......', '......3003......', '.....300003.....',
    '....30011003....', '...3001111003...', '..300111111003..', '..301111111103..',
    '...3001111003...', '....30011003....', '.....300003.....', '......3003......',
    '.......33.......', '................', '................', '................']);
  T.hall_wall = mk((x, y) => { if (y === 15) return '3'; if (y % 4 === 3) return '3'; if ((x + (Math.floor(y / 4) % 2) * 4) % 8 === 0) return '3'; return '1'; });
  T.hall_pillar = mk((x, y) => {
    if (y <= 1) return y === 0 ? '3' : '0';
    if (y >= 14) return y === 15 ? '3' : '0';
    if (x === 3 || x === 12) return '3';
    if (x > 3 && x < 12) return x === 5 || x === 9 ? '0' : x === 11 ? '2' : '1';
    return '2';
  });
  T.hall_door = doorOn(T.hall_wall, '');

  // ---------- interior ----------
  T.floor = mk((x, y) => { if (y % 4 === 3) return '1'; if (y % 4 !== 3 && (x + Math.floor(y / 4) * 5) % 16 === 0) return '1'; return '0'; });
  T.iwall = mk((x, y) => { if (y >= 12) return y === 12 ? '3' : y === 15 ? '3' : '2'; if (y === 0) return '3'; return x % 4 === 0 ? '2' : '1'; });
  T.iwall_win = over(T.iwall, mk((x, y) => {
    if (x < 3 || x > 12 || y < 2 || y > 10) return '.';
    if (x === 3 || x === 12 || y === 2 || y === 10) return '3';
    if (x === 7 || x === 8 || y === 6) return '3';
    return (x + y) % 6 === 0 ? '1' : '0';
  }));
  T.table = [
    '................',
    '................',
    '3333333333333333',
    '3000000000000003',
    '3011111111111103',
    '3011111111111103',
    '3011111111111103',
    '3011111111111103',
    '3222222222222223',
    '3333333333333333',
    '.32..........23.',
    '.32..........23.',
    '.32..........23.',
    '.33..........33.',
    '................',
    '................',
  ];
  T.bed = [
    '.33333333333333.',
    '.30000000000003.',
    '.30333333333303.',
    '.30300000000303.',
    '.30333333333303.',
    '.31111111111113.',
    '.32222222222223.',
    '.31111111111113.',
    '.31211112111123.',
    '.31111111111113.',
    '.31121111121113.',
    '.31111111111113.',
    '.32222222222223.',
    '.33333333333333.',
    '.33..........33.',
    '................',
  ];
  T.tv = [
    '................',
    '....3......3....',
    '.....3....3.....',
    '......3..3......',
    '.33333333333333.',
    '.31111111111113.',
    '.31333333333313.',
    '.31300000000313.',
    '.31301100000313.',
    '.31301000000313.',
    '.31300000000313.',
    '.31333333333313.',
    '.31111111131313.',
    '.33333333333333.',
    '..33........33..',
    '................',
  ];
  T.pc = [
    '................',
    '..333333333333..',
    '..311111111113..',
    '..313333333313..',
    '..313000000313..',
    '..313033300313..',
    '..313000000313..',
    '..313033000313..',
    '..313333333313..',
    '..311111111113..',
    '..333333333333..',
    '.32222222222223.',
    '.30303030303003.',
    '.32222222222223.',
    '.33333333333333.',
    '................',
  ];
  T.counter = mk((x, y) => { if (y === 2 || y === 15) return '3'; if (y < 2) return '.'; if (y === 3) return '0'; if (y < 7) return '1'; if (y === 7) return '3'; return x % 8 === 0 ? '3' : '2'; });
  T.bookshelf = mk((x, y) => {
    if (x === 0 || x === 15 || y === 0 || y === 15 || y === 7 || y === 8) return '3';
    const books = [1, 2, 3, 1, 2, 2, 3, 1, 1, 2, 3, 2, 1, 3];
    const b = books[(x - 1 + (y > 7 ? 5 : 0)) % books.length];
    if (y === 1 || y === 9) return '2';
    if (x % 3 === 0) return '3';
    return String(b === 3 ? 2 : b === 2 ? 1 : 0);
  });
  T.plant = [
    '................',
    '......3..3......',
    '....33133133....',
    '...3112312113...',
    '..311223322113..',
    '..321113311123..',
    '...3221331223...',
    '..311223322113..',
    '...3322332233...',
    '.....333333.....',
    '....30000003....',
    '....31111113....',
    '....32222223....',
    '.....322223.....',
    '.....333333.....',
    '................',
  ];
  T.rug = mk((x, y) => { if (x === 0 || x === 15 || y === 0 || y === 15) return '2'; if (x === 2 || x === 13 || y === 2 || y === 13) return '3'; if ((x + y) % 4 === 0) return '2'; return '1'; });
  T.stairs = mk((x, y) => { if (x === 0 || x === 15) return '3'; if (y % 4 === 0) return '3'; if (y % 4 === 1) return '0'; return y < 8 ? '2' : '1'; });
  T.mat = over(T.floor, mk((x, y) => { if (x < 2 || x > 13 || y < 4 || y > 12) return '.'; if (x === 2 || x === 13 || y === 4 || y === 12) return '3'; return (x + y) % 2 ? '2' : '1'; }));
  T.machine = [
    '.33333333333333.',
    '.31111111111113.',
    '.31333333333313.',
    '.31300003030313.',
    '.31303000000313.',
    '.31300003300313.',
    '.31333333333313.',
    '.31111111111113.',
    '.31330330330313.',
    '.31330330330313.',
    '.31111111111113.',
    '.31000000000013.',
    '.32222222222223.',
    '.33333333333333.',
    '.33..........33.',
    '................',
  ];
  T.hallfloor = mk((x, y) => { if (x % 8 === 7 || y % 8 === 7) return '2'; if (x % 8 === 0 || y % 8 === 0) return '0'; return '1'; });
  T.statue = [
    '......3333......',
    '.....311003.....',
    '....31100003....',
    '....31300303....',
    '....31100003....',
    '.....311003.....',
    '....33111033....',
    '...3111110003...',
    '...3111110003...',
    '....31111003....',
    '...3333333333...',
    '...3000000003...',
    '...3111111113...',
    '...3222222223...',
    '..333333333333..',
    '................',
  ];
  T.void = mk(() => '3');

  G.SPR.tiles = T;

  // ---------- characters ----------
  // Head templates: 9 rows. 8-char rows are mirrored (down/up), 16-char rows used as-is (right).
  // Symbols: o outline(3) s skin(0) h hair k accent w white(0) e eye(3) c shirt p pants
  const HEAD = {
    cap: {
      down: ['....oooo', '...okkkk', '..okkkkk', '..okkkww', '.ooooooo', '.ohsssss', '.ohssoss', '..osssss', '...ooooo'],
      up: ['....oooo', '...okkkk', '..okkkkk', '..okkkkk', '..oooooo', '.ohhhhhh', '.ohhhhhh', '..ohhhhh', '...ooooo'],
      right: ['....oooooo......', '...okkkkkkoo....', '..okkkkkkkkko...', '..okkkkkkkwko...', '..oooooooooooooo', '..ohhhsssssso...', '..ohhssssssoso..', '..ohsssssssssso.', '...ooooooooooo..'],
    },
    spiky: {
      down: ['..o.o.oo', '.ohohohh', 'ohhhhhhh', '.ohhhhhh', '.ohhhhhs', '.ohhssss', '.ohssoss', '..osssss', '...ooooo'],
      up: ['..o.o.oo', '.ohohohh', 'ohhhhhhh', '.ohhhhhh', '.ohhhhhh', '.ohhhhhh', '.ohhhhhh', '..ohhhhh', '...ooooo'],
      right: ['...o.o.oo.......', '..ohohohhoo.....', '.ohhhhhhhhhho...', 'ohhhhhhhhhhhho..', '.ohhhhhhhsssso..', '..ohhhsssssso...', '..ohhssssssoso..', '..ohsssssssssso.', '...ooooooooooo..'],
    },
    short: {
      down: ['....oooo', '...ohhhh', '..ohhhhh', '.ohhhhhh', '.ohhhhhh', '.ohsssss', '.ohssoss', '..osssss', '...ooooo'],
      up: ['....oooo', '...ohhhh', '..ohhhhh', '.ohhhhhh', '.ohhhhhh', '.ohhhhhh', '.ohhhhhh', '..ohhhhh', '...ooooo'],
      right: ['....oooooo......', '...ohhhhhhoo....', '..ohhhhhhhhho...', '.ohhhhhhhhhhho..', '.ohhhhhhhhssso..', '..ohhhsssssso...', '..ohhssssssoso..', '..ohsssssssssso.', '...ooooooooooo..'],
    },
    glasses: {
      down: ['....oooo', '...ohhhh', '..ohhhhh', '.ohhhhhh', '.ohhhhhh', '.ohsssss', '.ohooeoo', '..osssss', '...ooooo'],
      up: ['....oooo', '...ohhhh', '..ohhhhh', '.ohhhhhh', '.ohhhhhh', '.ohhhhhh', '.ohhhhhh', '..ohhhhh', '...ooooo'],
      right: ['....oooooo......', '...ohhhhhhoo....', '..ohhhhhhhhho...', '.ohhhhhhhhhhho..', '.ohhhhhhhhssso..', '..ohhhsssssso...', '..ohhssoooeoo...', '..ohsssssssssso.', '...ooooooooooo..'],
    },
    long: {
      down: ['....oooo', '...ohhhh', '..ohhhhh', '.ohhhhhh', '.ohhhhss', 'ohhsssss', 'ohhssoss', 'ohhossss', 'ohhhoooo'],
      up: ['....oooo', '...ohhhh', '..ohhhhh', '.ohhhhhh', '.ohhhhhh', 'ohhhhhhh', 'ohhhhhhh', 'ohhhhhhh', '.ohhhhhh'],
      right: ['....oooooo......', '...ohhhhhhoo....', '..ohhhhhhhhho...', '.ohhhhhhhhhhho..', '.ohhhhhhhhssso..', 'ohhhhhsssssso...', 'ohhhhssssssoso..', 'ohhhosssssssso..', 'ohhhhooooooooo..'],
    },
    nurse: {
      down: ['....oooo', '...owww3', '..owww33', '..owwww3', '.ohhhhhh', 'ohhsssss', 'ohhssoss', 'ohhossss', 'ohhhoooo'],
      up: ['....oooo', '...owwww', '..owwwww', '..owwwww', '.ohhhhhh', 'ohhhhhhh', 'ohhhhhhh', 'ohhhhhhh', '.ohhhhhh'],
      right: ['....oooooo......', '...owwwwwwoo....', '..owwwwwwwwwo...', '.ohhhhhhhhhhho..', '.ohhhhhhhhssso..', 'ohhhhhsssssso...', 'ohhhhssssssoso..', 'ohhhosssssssso..', 'ohhhhooooooooo..'],
    },
    hat: {
      down: ['....oooo', '...okkkk', '...okkkk', 'oooooooo', '.ohhssss', '.ohsssss', '.ohssoss', '..osssss', '...ooooo'],
      up: ['....oooo', '...okkkk', '...okkkk', 'oooooooo', '.ohhhhhh', '.ohhhhhh', '.ohhhhhh', '..ohhhhh', '...ooooo'],
      right: ['.....oooo.......', '....okkkko......', '....okkkko......', 'oooooooooooooooo', '..ohhhsssssso...', '..ohhhsssssso...', '..ohhssssssoso..', '..ohsssssssssso.', '...ooooooooooo..'],
    },
    beardhat: {
      down: ['....oooo', '...okkkk', '...okkkk', 'oooooooo', '.ohhssss', '.ohsssss', '.ohssoss', '..ohhhhh', '...ohhhh'],
      up: ['....oooo', '...okkkk', '...okkkk', 'oooooooo', '.ohhhhhh', '.ohhhhhh', '.ohhhhhh', '..ohhhhh', '...ooooo'],
      right: ['.....oooo.......', '....okkkko......', '....okkkko......', 'oooooooooooooooo', '..ohhhsssssso...', '..ohhhsssssso...', '..ohhssssssoso..', '..ohsssshhhhhho.', '...oooohhhhhho..'],
    },
    bandana: {
      down: ['....oooo', '...ossss', '..osssss', '.okkkkkk', '.ossooss', '.ossssss', '.osssoss', '..ohhhhh', '...ohhhh'],
      up: ['....oooo', '...ossss', '..osssss', '.okkkkkk', '.osssssk', '.ossssss', '.ossssss', '..osssss', '...ooooo'],
      right: ['....oooooo......', '...ossssssoo....', '..ossssssssso...', '.kokkkkkkkkkko..', 'kkosssssssooso..', '..ossssssssso...', '..ossssssssoso..', '..ohhhhhhhhhhho.', '...ohhhhhhhhho..'],
    },
  };
  // Body templates: 7 rows (rows 9..15). stand/step for down (up reuses), right.
  const BODY = {
    boy: {
      down0: ['..occccc', '.occoccc', '.occoccc', '.ossoppp', '..oopppp', '...opppo', '...ooooo'],
      down1: ['..occcccccccco..', '.occoccccccocco.', '.occoccccccocco.', '.ossoppppppposso', '..oopppppppppoo.', '...oooo.opppo...', '........ooooo...'],
      right0: ['....occcccco....', '...occcccccco...', '...occcoccco....', '....oppossoo....', '....opppppo.....', '....oppppo......', '....oooooo......'],
      right1: ['....occcccco....', '...occcccccco...', '...occcoccco....', '...opppossoo....', '...opppppppo....', '..opppo.oppo....', '..oooo...ooo....'],
    },
    dress: {
      down0: ['..occccc', '.occoccc', '.occoccc', '.ossoccc', '..occccc', '.ooooooo', '....oo..'],
      down1: ['..occcccccccco..', '.occoccccccocco.', '.occoccccccocco.', '.ossoccccccosso.', '.occcccccccco...', '.oooooooooooooo.', '...oo.....oo....'],
      right0: ['....occcccco....', '...occcccccco...', '...occcoccco....', '...occcossco....', '...occcccccco...', '..oooooooooooo..', '.....oo.oo......'],
      right1: ['....occcccco....', '...occcccccco...', '...occcoccco....', '...occcossco....', '..occcccccccco..', '..oooooooooooo..', '....oo....oo....'],
    },
  };
  // fix: some boy/dress rows above are intentionally 16 wide; normalize any row of odd length
  function normRow(r) { if (r.length === 8 || r.length === 16) return r; return (r + '................').slice(0, 16); }
  function buildChar(def) {
    const head = HEAD[def.head], body = BODY[def.body || 'boy'];
    const m = Object.assign({ o: '3', s: '0', w: '0', e: '3', h: '3', k: '2', c: '1', p: '2', '.': '.' }, def.map || {});
    const H = (rows) => mirror(rows.map(normRow));
    const B = (rows) => mirror(rows.map(normRow)).map((r, i) => (def.stripes && i < 3 ? r.replace(/c/g, i % 2 ? '2' : '0') : r));
    const assemble = (h, b) => remap(H(h).concat(B(b)), m);
    const down = [assemble(head.down, body.down0), assemble(head.down, body.down1)];
    const up = [assemble(head.up, body.down0), assemble(head.up, body.down1)];
    const right = [assemble(head.right, body.right0), assemble(head.right, body.right1)];
    // make "up" step mirror the other foot so walking alternates naturally
    up[1] = flip(up[1]);
    return { down, up, right, left: right.map(flip) };
  }
  const CHARDEFS = {
    player: { head: 'cap', map: { k: '2', h: '3', c: '1', p: '2' } },
    rival: { head: 'spiky', map: { h: '2', c: '0', p: '2' } },
    prof: { head: 'glasses', body: 'dress', map: { h: '1', c: '0' } },
    mom: { head: 'long', body: 'dress', map: { h: '3', c: '1' } },
    nurse: { head: 'nurse', body: 'dress', map: { h: '2', c: '0', w: '0' } },
    clerk: { head: 'cap', map: { k: '1', h: '3', c: '2', p: '3', w: '0' } },
    kid: { head: 'short', map: { h: '3', c: '1', p: '1' } },
    lass: { head: 'long', body: 'dress', map: { h: '1', c: '2' } },
    hiker: { head: 'beardhat', map: { k: '2', h: '3', c: '2', p: '3' } },
    bugkid: { head: 'hat', map: { k: '1', h: '3', c: '0', p: '1' } },
    sailor: { head: 'cap', stripes: true, map: { k: '0', w: '2', h: '3', p: '2' } },
    warden_basalt: { head: 'bandana', map: { k: '2', h: '3', c: '2', p: '3' } },
    warden_coral: { head: 'long', body: 'dress', map: { h: '3', c: '2' } },
  };
  const CH = {};
  for (const k in CHARDEFS) CH[k] = buildChar(CHARDEFS[k]);

  // VOLTKIT follower: tiny electric fox kit with a lightning tail.
  const VK_DOWN = [
    '................',
    '................',
    '..33........33..',
    '..303......303..',
    '..3013....3103..',
    '..311133331113..',
    '.31111111111113.',
    '.31113111131113.',
    '.30111133111103.',
    '..311100001113..',
    '...3311111133.3.',
    '....31111113.33.',
    '...3111111113.3.',
    '...3101111013...',
    '....33333333....',
    '................',
  ];
  const VK_UP = [
    '................',
    '................',
    '..33........33..',
    '..313......313..',
    '..3113....3113..',
    '..311133331113..',
    '.31111111111113.',
    '.31111111111113.',
    '.31111111111113.',
    '..311113311113..',
    '...3311303133...',
    '....311303113...',
    '...3111033113...',
    '...3111130113...',
    '....33333333....',
    '................',
  ];
  const VK_RIGHT = [
    '................',
    '................',
    '........3...3...',
    '........33..33..',
    '.......30133033.',
    '.......311111113',
    '.3.....311113113',
    '333...3111111003',
    '.313.31111111133',
    '..313311111113..',
    '...3111111113...',
    '...3111111113...',
    '...3111111113...',
    '...3013330133...',
    '....33...33.....',
    '................',
  ];
  function bob(rows, feet) { // walk frame: shift up 1px, swap foot row
    const r = rows.slice(1).concat(['................']);
    if (feet) r[12] = feet;
    return r;
  }
  const vkDown1 = bob(VK_DOWN, '...3011111103...');
  const vkUp1 = bob(VK_UP, '...3111111113...');
  const vkRight1 = VK_RIGHT.slice(0, 13).concat(['..30133..30133..', '..33.....33.....', '................']);
  CH.voltkit_follow = {
    down: [VK_DOWN, vkDown1], up: [VK_UP, vkUp1], right: [VK_RIGHT, vkRight1],
    left: [flip(VK_RIGHT), flip(vkRight1)],
  };
  G.SPR.chars = CH;

  // ---------- emotes ----------
  const BUBBLE = [
    '..333333333333..',
    '.30000000000003.',
    '3000000000000003',
    '3000000000000003',
    '3000000000000003',
    '3000000000000003',
    '3000000000000003',
    '3000000000000003',
    '3000000000000003',
    '3000000000000003',
    '3000000000000003',
    '.30000000000003.',
    '..3333300333333.',
    '......303.......',
    '......33........',
    '................',
  ];
  const ICON = {
    excl: ['...33...', '..3333..', '..3333..', '..3333..', '...33...', '...33...', '........', '...33...'],
    heart: ['........', '.33..33.', '32233223', '32222223', '.322223.', '..3223..', '...33...', '........'],
    note: ['....333.', '....3.33', '....3...', '....3...', '..333...', '.3333...', '..33....', '........'],
    dots: ['........', '........', '........', '........', '........', '........', '33.33.33', '33.33.33'],
    zz: ['3333....', '...3....', '..3.....', '.3......', '3333.333', '.......3', '.....33.', '....3333'],
    angry: ['.33..33.', '.3....3.', '33....33', '........', '........', '33....33', '.3....3.', '.33..33.'],
  };
  const EM = {};
  for (const k in ICON) EM[k] = stamp(BUBBLE, ICON[k], 4, 3);
  G.SPR.emotes = EM;
})();
