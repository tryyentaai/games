// Headless scene test: drives the real battle SCENE (G.Battle.start) frame by frame with fake A presses,
// to catch UI hangs (XP bars, level-up boxes, move learning, evolution, catching). Run: node dev/sim_scene.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, JSON, addEventListener() {}, requestAnimationFrame() {}, localStorage: { getItem: () => null, setItem() {} }, navigator: {}, document: {} };
ctx.window = ctx; vm.createContext(ctx);
['js/core.js', 'js/data.js', 'js/sprites_mons.js', 'js/menus.js', 'js/battle.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
const G = ctx.G; G.opts.textSpeed = 'instant';
function runCase(name, setup, opts, maxFrames) {
  G.clearScenes(); G.state = G.newState(); setup();
  let result = null;
  G.Battle.start(Object.assign({}, opts, { onEnd: (r) => { result = r; } }));
  for (let f = 0; f < (maxFrames || 60000) && result == null; f++) {
    const press = f % 6 === 0;
    G.input.setVirtual('a', press); G.input._tick(); G.frame++;
    const t = G.top(); if (t) t.update();
    if (!press) G.input.setVirtual('a', false);
  }
  console.log((result ? 'ok  ' : 'HANG') + ' ' + name.padEnd(50) + ' -> ' + result + '  party: ' + G.state.party.map((m) => m.id + ' L' + m.lvl + ' [' + m.moves.map((x) => x.id).join(',') + ']').join(' '));
  return !!result;
}
let ok = true;
ok &= runCase('wild win (xp bar)', () => { G.state.party = [G.makeMon('voltkit', 9)]; }, { kind: 'wild', enemy: [['nibblet', 4]] });
ok &= runCase('multi-level chain + learn several moves', () => { const m = G.makeMon('voltkit', 3); G.state.party = [m]; m.stats.atk = 20000; m.stats.spd = 999; m.hp = m.maxhp = 999; }, { kind: 'wild', enemy: [['auroryx', 45]] });
ok &= runCase('evolution after battle', () => { const s = G.makeMon('sproutle', 15); s.xp = G.xpForLevel(16) - 2; s.moves.reverse(); s.moves.unshift(s.moves.splice(s.moves.findIndex((x) => x.id === 'leafflick'), 1)[0]); G.state.party = [s]; }, { kind: 'wild', enemy: [['fuzzbug', 3]] });
ok &= runCase('trainer 2 mons, prize', () => { G.state.party = [G.makeMon('voltkit', 20)]; }, { kind: 'trainer', enemy: [['pebbit', 6], ['nibblet', 6]], trainer: { name: 'TOM', cls: 'HIKER', loseText: 'Rocks!' } });
ok &= runCase('loss (blackout)', () => { G.state.party = [G.makeMon('fuzzbug', 2)]; }, { kind: 'trainer', enemy: [['blazebear', 30]], trainer: { name: 'X', cls: 'ACE' } });
console.log(ok ? 'SCENE TESTS PASSED' : 'SCENE TESTS FAILED'); process.exitCode = ok ? 0 : 1;
