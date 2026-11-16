// node dev/check_world.js — static checks for overworld sprites, maps and the story path.
// Loads js/sprites_world.js + js/world.js in a stubbed context (no canvas) and asserts invariants.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ROSTER = ['voltkit', 'sproutle', 'thornback', 'cindercub', 'blazebear', 'puddlet', 'torrentoad', 'pebbit', 'bouldurr', 'fluffin', 'galewing', 'nibblet', 'gnashrat', 'fuzzbug', 'cocoonix', 'lumimoth', 'sparkfly', 'mossprite', 'wispurr', 'hootlet', 'hootrix', 'shellop', 'auroryx'];
let FLAGS = {};
const G = { SPR: {}, DATA: {}, audio: { play() {}, sfx() {} }, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), scenes: [] };
G.state = { flags: new Proxy({}, { get: (t, k) => FLAGS[k] }), party: [], bag: {}, dex: { seen: {}, caught: {} } };
const ctx = { window: { G }, console, setInterval() {}, document: undefined };
vm.createContext(ctx);
for (const f of ['sprites_world.js', 'world.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });

let errors = 0, checks = 0;
const fail = (m) => { errors++; console.log('  FAIL ' + m); };
const ok = (c, m) => { checks++; if (!c) fail(m); };

// ---------- sprites ----------
console.log('Sprites');
function checkSpr(name, rows) {
  ok(Array.isArray(rows) && rows.length === 16, name + ' has ' + (rows && rows.length) + ' rows (want 16)');
  if (!Array.isArray(rows)) return;
  rows.forEach((r, i) => { ok(typeof r === 'string' && r.length === 16, name + ' row ' + i + ' width ' + (r && r.length)); ok(/^[0-3.]*$/.test(r), name + ' row ' + i + ' bad chars: ' + r); });
}
const T = G.SPR.tiles, CH = G.SPR.chars, EM = G.SPR.emotes;
for (const k in T) checkSpr('tile ' + k, T[k]);
const NEED_CH = ['player', 'rival', 'prof', 'mom', 'nurse', 'clerk', 'kid', 'lass', 'hiker', 'bugkid', 'sailor', 'warden_basalt', 'warden_coral', 'voltkit_follow'];
for (const c of NEED_CH) {
  ok(CH[c], 'char missing: ' + c); if (!CH[c]) continue;
  for (const d of ['down', 'up', 'left', 'right']) { ok(CH[c][d] && CH[c][d].length === 2, c + '.' + d + ' needs 2 frames'); (CH[c][d] || []).forEach((f, i) => checkSpr(c + '.' + d + i, f)); }
}
for (const e of ['excl', 'heart', 'note', 'dots', 'zz', 'angry']) { ok(EM[e], 'emote missing ' + e); if (EM[e]) checkSpr('emote ' + e, EM[e]); }
for (const a of ['tallgrass', 'flower', 'water', 'darkgrass']) ok(T[a + '2'], 'animated tile ' + a + ' missing 2nd frame');

// ---------- maps ----------
console.log('Maps');
const W = G.World, M = W.MAPS, LEG = W.LEG, RAW = W.RAW;
for (const ch in LEG) { ok(T[LEG[ch].t], 'legend ' + ch + ' -> missing tile ' + LEG[ch].t); if (LEG[ch].base && LEG[ch].base !== '@') ok(T[LEG[ch].base], 'legend base missing ' + LEG[ch].base); }
for (const s in W.STAMPS) W.STAMPS[s].rows.flat().forEach((t) => ok(T[t], 'stamp ' + s + ' -> missing tile ' + t));
const walk = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.grid[y][x] && !m.grid[y][x].solid;
for (const id in RAW) {
  const r = RAW[id], m = M[id];
  r.rows.forEach((row, i) => { ok(row.length === r.rows[0].length, id + ' row ' + i + ' width ' + row.length + ' != ' + r.rows[0].length); [...row].forEach((c, x) => ok(LEG[c], id + ' unknown legend char "' + c + '" at ' + x + ',' + i)); });
  (r.stamps || []).forEach((s) => { const st = W.STAMPS[s.s]; ok(st, id + ' unknown stamp ' + s.s); if (st) ok(s.x + st.rows[0].length <= m.w && s.y + st.rows.length <= m.h, id + ' stamp ' + s.s + ' out of bounds'); });
  for (const w of m.warps) {
    ok(m.grid[w.y] && m.grid[w.y][w.x], id + ' warp at ' + w.x + ',' + w.y + ' off map');
    if (w.to === '@ret') continue;
    const d = M[w.to]; ok(d, id + ' warp -> unknown map ' + w.to); if (!d) continue;
    ok(walk(d, w.tx, w.ty), id + ' warp -> ' + w.to + ' ' + w.tx + ',' + w.ty + ' lands on non-walkable tile');
    if (w.ret) ok(walk(m, w.x, w.y + 1), id + ' ret door ' + w.x + ',' + w.y + ' has blocked front');
    const k = m.grid[w.y][w.x].kind; ok(k === 'door' || k === 'mat', id + ' warp at ' + w.x + ',' + w.y + ' not on a door/mat tile (' + m.grid[w.y][w.x].t + ')');
  }
  // every mat/door tile has a warp (unless locked/solid)
  m.grid.forEach((row, y) => row.forEach((d, x) => { if (d && (d.kind === 'door' || d.kind === 'mat')) ok(m.warps.some((w) => w.x === x && w.y === y), id + ' door/mat at ' + x + ',' + y + ' without warp'); }));
  // connections
  const SIDES = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }, REV = { n: 's', s: 'n', e: 'w', w: 'e' };
  for (const side in m.conn) {
    const c = m.conn[side], o = M[c.to];
    ok(o, id + ' conn ' + side + ' -> unknown ' + c.to); if (!o) continue;
    const back = o.conn[REV[side]]; ok(back && back.to === id && back.off === -c.off, id + ' conn ' + side + ' not mirrored by ' + c.to);
    let gaps = 0;
    const edge = side === 'n' ? [...Array(m.w).keys()].map((x) => [x, 0]) : side === 's' ? [...Array(m.w).keys()].map((x) => [x, m.h - 1]) : side === 'w' ? [...Array(m.h).keys()].map((y) => [0, y]) : [...Array(m.h).keys()].map((y) => [m.w - 1, y]);
    for (const [x, y] of edge) {
      if (!walk(m, x, y)) continue;
      let nx, ny;
      if (side === 'n') { nx = x + c.off; ny = o.h - 1; } else if (side === 's') { nx = x + c.off; ny = 0; } else if (side === 'w') { nx = o.w - 1; ny = y + c.off; } else { nx = 0; ny = y + c.off; }
      if (walk(o, nx, ny)) gaps++;
      else ok(false, id + ' edge ' + side + ' tile ' + x + ',' + y + ' leads to blocked ' + c.to + ' ' + nx + ',' + ny);
    }
    ok(gaps > 0, id + ' conn ' + side + ' has no walkable gap');
  }
  // encounters
  if (r.enc) for (const e of r.enc.grass) { ok(ROSTER.includes(e[0]), id + ' encounter uses unknown id ' + e[0]); ok(e[1] <= e[2] && e[3] > 0, id + ' bad encounter row ' + e); }
  if (r.enc) ok(m.grid.flat().some((d) => d && d.kind === 'grass'), id + ' has encounters but no grass');
  // entities
  for (const n of r.npcs || []) {
    if (n.spr) ok(CH[n.spr], id + ' npc ' + n.id + ' unknown sprite ' + n.spr);
    if (n.img) ok(n.img.startsWith('mon:') ? ROSTER.includes(n.img.slice(4)) : T[n.img], id + ' npc ' + n.id + ' unknown img ' + n.img);
    const d = m.grid[n.y] && m.grid[n.y][n.x];
    ok(d && !d.solid, id + ' npc ' + n.id + ' stands on solid/missing tile ' + n.x + ',' + n.y);
    if (n.trainer) { n.trainer.party.forEach((p) => ok(ROSTER.includes(p[0]) && p[1] > 0 && p[1] <= 100, id + ' trainer ' + n.id + ' bad party ' + p)); ok(n.trainer.intro && n.trainer.lose && n.trainer.after, id + ' trainer ' + n.id + ' missing text'); }
    ok(n.talk || n.trainer, id + ' npc ' + n.id + ' has nothing to say');
  }
  for (const it of r.items || []) { const d = m.grid[it.y] && m.grid[it.y][it.x]; ok(d && (it.hidden || !d.solid), id + ' item ' + it.id + ' on bad tile'); }
  for (const sg of r.signs || []) { const d = m.grid[sg.y] && m.grid[sg.y][sg.x]; ok(d && d.kind === 'sign', id + ' sign at ' + sg.x + ',' + sg.y + ' not on a sign tile'); }
  m.grid.forEach((row, y) => row.forEach((d, x) => { if (d && d.kind === 'sign') ok((r.signs || []).some((s) => s.x === x && s.y === y), id + ' sign tile ' + x + ',' + y + ' has no text'); }));
  if (r.music) ok(['town', 'route', 'forest', 'cave', 'lab'].includes(r.music), id + ' unknown music ' + r.music);
}
// party ids used in scripted battles
const src = fs.readFileSync(path.join(ROOT, 'js', 'world.js'), 'utf8');
for (const mm of src.matchAll(/\['([a-z]+)', (\d+)\]/g)) ok(ROSTER.includes(mm[1]), 'script party uses unknown id ' + mm[1]);
for (const mm of src.matchAll(/(?:giveItem|item:)\s*\(?'([a-z]+)'/g)) ok(['potion', 'superpotion', 'antidote', 'awaken', 'fullheal', 'revive', 'orb', 'greatorb', 'repel'].includes(mm[1]), 'unknown item id ' + mm[1]);

// ---------- story path BFS ----------
console.log('Story path');
function bfs(flags, opts) {
  FLAGS = flags; opts = opts || {};
  const block = {};
  for (const id in RAW) block[id] = new Set((RAW[id].npcs || []).filter((n) => !n.cond || n.cond()).map((n) => n.x + ',' + n.y));
  const retMaps = new Set(Object.keys(M).filter((id) => M[id].warps.some((w) => w.to === '@ret')));
  const seen = new Set(), q = [], reach = {};
  const free = (id, x, y) => walk(M[id], x, y) && !block[id].has(x + ',' + y);
  // state carries the "return point" while inside a shared interior (care/mart/cottage)
  const push = (id, x, y, ret) => { if (!retMaps.has(id)) ret = null; const k = id + ':' + x + ',' + y; const kk = k + (ret ? '@' + ret.join(',') : ''); if (!seen.has(kk)) { seen.add(kk); seen.add(k); q.push([id, x, y, ret]); reach[id] = true; } };
  push('home', 6, 2, null);
  while (q.length) {
    const [id, x, y, ret] = q.shift(), m = M[id];
    const here = m.grid[y][x], w = m.warps.find((v) => v.x === x && v.y === y);
    const warpTo = (v) => { if (v.to === '@ret') { if (ret) push(ret[0], ret[1], ret[2], null); } else push(v.to, v.tx, v.ty, v.ret ? [id, v.x, v.y + 1] : ret); };
    if (w && here.kind === 'door') { warpTo(w); continue; }
    if (w && here.kind === 'mat') warpTo(w); // pressing down on a mat exits
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      let nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) {
        const side = ny < 0 ? 'n' : ny >= m.h ? 's' : nx < 0 ? 'w' : 'e', c = m.conn[side]; if (!c) continue;
        const o = M[c.to]; let tx, ty;
        if (side === 'n') { tx = nx + c.off; ty = o.h - 1; } else if (side === 's') { tx = nx + c.off; ty = 0; } else if (side === 'w') { tx = o.w - 1; ty = ny + c.off; } else { tx = 0; ty = ny + c.off; }
        if (free(c.to, tx, ty)) push(c.to, tx, ty, null);
        continue;
      }
      const d = m.grid[ny][nx];
      if (d && d.kind === 'ledge' && dy === 1) { if (free(id, nx, ny + 1)) push(id, nx, ny + 1, ret); continue; }
      if (free(id, nx, ny)) push(id, nx, ny, ret);
    }
  }
  return { reach, seen };
}
const ALL = new Proxy({}, { get: () => true });
const all = bfs(ALL);
for (const id of ['home', 'hollowbrook', 'lab', 'route1', 'fernhaven', 'care', 'mart', 'cottage', 'hall_basalt', 'whisperwood', 'lumenbay', 'hall_coral', 'skyridge', 'summit', 'aurora']) ok(all.reach[id], 'with all flags, map unreachable: ' + id);
const spots = [['lab', 4, 3, 'prof talk spot'], ['care', 4, 3, 'nurse counter'], ['mart', 2, 2, 'clerk counter'], ['hall_basalt', 4, 2, 'warden basalt'], ['hall_coral', 4, 2, 'warden coral'], ['summit', 7, 9, 'final rival spot'], ['aurora', 6, 4, 'auroryx'], ['fernhaven', 21, 10, 'rival 2 trigger'], ['hollowbrook', 9, 1, 'prof stop trigger']];
for (const [id, x, y, n] of spots) ok(all.seen.has(id + ':' + x + ',' + y), 'unreachable story spot: ' + n + ' (' + id + ' ' + x + ',' + y + ')');
// gates
const g1 = bfs({ got_starter: true, got_dex: true });
ok(g1.reach.fernhaven && g1.reach.hall_basalt, 'early game: fernhaven/hall_basalt should be reachable');
ok(!g1.reach.whisperwood, 'gate: whisperwood reachable without STONE badge');
const g2 = bfs({ got_starter: true, badge_stone: true, beat_rival2: true });
ok(g2.reach.whisperwood && g2.reach.lumenbay && g2.reach.hall_coral, 'with STONE badge: forest/lumen bay should be reachable');
ok(!g2.reach.skyridge, 'gate: skyridge reachable without TIDE badge');
ok(!g2.reach.aurora, 'gate: aurora reachable before the ending');
const g3 = bfs({ got_starter: true, badge_stone: true, badge_tide: true, beat_rival2: true });
ok(g3.reach.summit && g3.seen.has('summit:7,9'), 'with both badges: summit should be reachable');
// trainers must not wall off the critical path when unbeaten (they block their tile only; check path exists around them)
console.log('\n' + checks + ' checks, ' + errors + ' failures');
process.exit(errors ? 1 : 0);
