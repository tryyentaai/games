// Headless sanity checks for WILDLIGHT battle data + logic.  Run: node dev/sim_battle.js
// Loads core.js / data.js / sprites_mons.js / battle.js / menus.js into a stub browser context and drives
// the real battle generator (G.Battle.run) with an auto-driver (AI on both sides).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = {
  console, Math, JSON, setTimeout, Promise,
  addEventListener() {}, requestAnimationFrame() {},
  localStorage: { getItem: () => null, setItem() {} },
  navigator: {}, document: { fonts: null, createElement: () => ({ getContext: () => ({}) }) },
};
ctx.window = ctx;
vm.createContext(ctx);
const load = (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
['js/core.js', 'js/data.js', 'js/sprites_mons.js', 'js/battle.js', 'js/menus.js'].forEach((f) => { if (fs.existsSync(path.join(ROOT, f))) load(f); else console.log('MISSING', f); });
const G = ctx.G, D = G.DATA;

let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.log('FAIL:', msg); } };

// ---------- static data checks ----------
const IDS = ['voltkit', 'sproutle', 'thornback', 'cindercub', 'blazebear', 'puddlet', 'torrentoad', 'pebbit', 'bouldurr', 'fluffin', 'galewing',
  'nibblet', 'gnashrat', 'fuzzbug', 'cocoonix', 'lumimoth', 'sparkfly', 'mossprite', 'wispurr', 'hootlet', 'hootrix', 'shellop', 'auroryx'];
check(Object.keys(D.mons).length === 23, 'expected 23 mons');
for (const id of IDS) {
  const s = D.mons[id];
  check(!!s, 'mon missing ' + id); if (!s) continue;
  check(s.name.length <= 10, id + ' name too long');
  check(s.learn.length >= 4 && s.learn.length <= 8, id + ' learnset size ' + s.learn.length);
  s.learn.forEach(([l, mv]) => check(!!D.moves[mv], id + ' learnset move missing: ' + mv));
  s.types.forEach((t) => check(D.TYPES.includes(t), id + ' bad type ' + t));
  if (s.evo) check(!!D.mons[s.evo.into], id + ' evo target missing');
  check(s.dex && s.dex.text && s.dex.text.split(/[.!?]/).filter((x) => x.trim()).length <= 3, id + ' dex text');
  const spr = G.SPR.mons && G.SPR.mons[id];
  check(!!spr, 'sprite missing ' + id);
  if (spr) {
    for (const k of ['front', 'back']) check(Array.isArray(spr[k]) && spr[k].length === 32 && spr[k].every((r) => r.length === 32 && /^[0-3.]+$/.test(r)), id + ' ' + k + ' sprite not 32x32');
    check(Array.isArray(spr.icon) && spr.icon.length === 16 && spr.icon.every((r) => r.length === 16 && /^[0-3.]+$/.test(r)), id + ' icon not 16x16');
  }
}
for (const [id, mv] of Object.entries(D.moves)) {
  check(mv.name.length <= 12, 'move name too long ' + id);
  check(D.TYPES.includes(mv.type), 'move type ' + id);
  check(['phys', 'spec', 'status'].includes(mv.cat), 'move cat ' + id);
}
for (const id in D.items) check(D.items[id].price > 0 && D.items[id].use, 'item ' + id);
const m5 = G.makeMon('voltkit', 5);
check(m5.bond === 70 && m5.xp === 125 && m5.moves.length <= 4 && m5.hp === m5.maxhp, 'makeMon voltkit shape');
console.log('static checks done. voltkit L5:', JSON.stringify({ hp: m5.maxhp, ...m5.stats, moves: m5.moves.map((x) => x.id) }));

// ---------- battle sim ----------
function sim(party, enemy, o) {
  o = o || {};
  G.state = G.newState(); G.state.party = party; G.state.bag = Object.assign({}, o.bag || {});
  const S = G.Battle.create({ kind: o.kind || 'trainer', party, enemyMons: enemy, trainer: o.trainer || { name: 'X', cls: 'KID' } });
  const gen = G.Battle.run(S);
  let v, n = 0, potionsUsed = 0;
  for (;;) {
    const r = gen.next(v); v = undefined;
    if (r.done) break;
    const y = r.value;
    if (y.choose === 'action') {
      const pb = S.p.b;
      if (o.potions && G.state.bag.superpotion > 0 && pb.mon.hp < pb.mon.maxhp * 0.3 && S.e.b.mon.hp > S.e.b.mon.maxhp * 0.25) { v = { type: 'item', id: 'superpotion', target: S.p.act }; potionsUsed++; }
      else if (o.catch && G.state.bag.orb > 0) v = { type: 'item', id: 'orb' };
      else v = { type: 'move', i: G.Battle.ai(S, pb, S.e.b, o.smart == null ? 0.8 : o.smart) };
    } else if (y.choose === 'party') v = party.findIndex((m) => m.hp > 0);
    else if (y.ask) v = 0;
    else if (y.pickMove) { const ms = y.pickMove.mon.moves; let k = 0; ms.forEach((x, i) => { if (D.moves[x.id].power < D.moves[ms[k].id].power) k = i; }); v = k; }
    else if (y.evolve) v = true;
    else if (y.hp) y.hp.disp = y.hp.mon.hp;
    if (++n > 200000) throw new Error('runaway battle');
  }
  return { result: S.result, turns: S.turn, potionsUsed };
}
function rate(label, N, mk, o) {
  let w = 0, turns = 0;
  for (let i = 0; i < N; i++) { const { party, enemy } = mk(); const r = sim(party, enemy, o); if (r.result === 'win') w++; turns += r.turns; }
  console.log(label.padEnd(58), ((100 * w) / N).toFixed(1).padStart(5) + '% win', ' avg turns', (turns / N).toFixed(1));
  return w / N;
}
const N = 600;
const r1 = rate('Rival 1: VOLTKIT L5 vs SPROUTLE L5', N, () => ({ party: [G.makeMon('voltkit', 5)], enemy: [G.makeMon('sproutle', 5)] }));
check(r1 > 0.4 && r1 < 0.62, 'rival1 should be ~50/50');
rate('Warden: VOLTKIT L11 solo, no items', N, () => ({ party: [G.makeMon('voltkit', 11)], enemy: [G.makeMon('pebbit', 10), G.makeMon('bouldurr', 12)] }), { trainer: { name: 'BASALT', cls: 'WARDEN' } });
const r2 = rate('Warden: VOLTKIT L12 solo, 2 super potions', N, () => ({ party: [G.makeMon('voltkit', 12)], enemy: [G.makeMon('pebbit', 10), G.makeMon('bouldurr', 12)] }), { trainer: { name: 'BASALT', cls: 'WARDEN' }, potions: true, bag: { superpotion: 2 } });
const r3 = rate('Warden: VOLTKIT12+NIBBLET10+FLUFFIN10, no items', N, () => ({ party: [G.makeMon('voltkit', 12), G.makeMon('nibblet', 10), G.makeMon('fluffin', 10)], enemy: [G.makeMon('pebbit', 10), G.makeMon('bouldurr', 12)] }), { trainer: { name: 'BASALT', cls: 'WARDEN' } });
const r4 = rate('Warden: V13+NIBBLET11+FLUFFIN11, 2 super potions', N, () => ({ party: [G.makeMon('voltkit', 13), G.makeMon('nibblet', 11), G.makeMon('fluffin', 11)], enemy: [G.makeMon('pebbit', 10), G.makeMon('bouldurr', 12)] }), { trainer: { name: 'BASALT', cls: 'WARDEN' }, potions: true, bag: { superpotion: 2 } });
check(r4 > 0.45 && r4 < 0.92, 'warden with a prepared team should be beatable but challenging');
rate('Warden Coral: VOLTKIT17+FLUFFIN15+MOSSPRITE15', N, () => ({ party: [G.makeMon('voltkit', 17), G.makeMon('galewing', 15), G.makeMon('mossprite', 15)], enemy: [G.makeMon('shellop', 16), G.makeMon('puddlet', 15), G.makeMon('torrentoad', 18)] }), { trainer: { name: 'CORAL', cls: 'WARDEN' } });
rate('Rival final: V22+GALEWING21+LUMIMOTH20+MOSS20', 300, () => ({ party: [G.makeMon('voltkit', 22), G.makeMon('galewing', 21), G.makeMon('lumimoth', 20), G.makeMon('mossprite', 20)], enemy: [G.makeMon('gnashrat', 20), G.makeMon('galewing', 21), G.makeMon('thornback', 23)] }), { trainer: { name: 'KAI', cls: 'RIVAL' } });
rate('Route 1 wild: VOLTKIT L5 vs NIBBLET L4 (random AI)', N, () => ({ party: [G.makeMon('voltkit', 5)], enemy: [G.makeMon('nibblet', 4)] }), { kind: 'wild' });
rate('Mirror: random vs random species L20', N, () => ({ party: [G.makeMon(G.pick(IDS.slice(0, 22)), 20)], enemy: [G.makeMon(G.pick(IDS.slice(0, 22)), 20)] }));

// per-species 1v1 win rate at L20 against the field (balance smell test)
const wr = {};
for (const a of IDS.slice(0, 22)) {
  let w = 0, n = 0;
  for (const b of IDS.slice(0, 22)) for (let k = 0; k < 12; k++) { if (sim([G.makeMon(a, 20)], [G.makeMon(b, 20)]).result === 'win') w++; n++; }
  wr[a] = Math.round((100 * w) / n);
}
console.log('L20 1v1 win% vs field:', Object.entries(wr).sort((x, y) => y[1] - x[1]).map(([k, v]) => k + ' ' + v).join(', '));

// leveling / evolution / catching path
{
  const sp = G.makeMon('sproutle', 15); sp.xp = G.xpForLevel(16) - 5;
  sim([sp], [G.makeMon('nibblet', 10)], { kind: 'wild', smart: 1 });
  check(sp.id === 'thornback' && sp.lvl >= 16, 'sproutle should evolve at 16 (got ' + sp.id + ' L' + sp.lvl + ')');
  let caught = 0;
  for (let i = 0; i < 200; i++) { const r = sim([G.makeMon('voltkit', 8)], [G.makeMon('fluffin', 4)], { kind: 'wild', catch: true, bag: { orb: 5 }, smart: 1 }); if (r.result === 'caught') caught++; }
  console.log('catch fluffin L4 with up to 5 orbs:', ((caught / 200) * 100).toFixed(0) + '%');
  check(caught > 100, 'catching should usually work on easy mons');
  const xp1 = G.makeMon('voltkit', 5); sim([xp1], [G.makeMon('nibblet', 5)], { kind: 'wild', smart: 1 });
  console.log('voltkit L5 xp after beating nibblet L5:', xp1.xp, 'lvl', xp1.lvl);
}
console.log(fails ? fails + ' FAILURE(S)' : 'ALL CHECKS PASSED');
process.exitCode = fails ? 1 : 0;
