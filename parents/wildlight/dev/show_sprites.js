// node dev/show_sprites.js [filter] — prints overworld sprites as ASCII art for eyeballing.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { window: {}, console }; ctx.window.G = { SPR: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/sprites_world.js'), 'utf8'), ctx);
const G = ctx.window.G, f = process.argv[2] || '';
const sh = { '0': '  ', '1': '░░', '2': '▒▒', '3': '██', '.': ' ·' };
function show(name, rows) { console.log('== ' + name); rows.forEach((r) => console.log([...r].map((c) => sh[c] || '??').join(''))); }
function showRow(items) { // side by side
  console.log(items.map(([n]) => n.padEnd(34)).join(''));
  for (let y = 0; y < 16; y++) console.log(items.map(([, r]) => [...r[y]].map((c) => sh[c] || '??').join('') + '  ').join(''));
}
const all = [];
for (const k in G.SPR.tiles) all.push(['t:' + k, G.SPR.tiles[k]]);
for (const k in G.SPR.chars) for (const d of ['down', 'up', 'right', 'left']) G.SPR.chars[k][d].forEach((r, i) => all.push([k + '.' + d + i, r]));
for (const k in G.SPR.emotes) all.push(['e:' + k, G.SPR.emotes[k]]);
const sel = all.filter(([n]) => n.includes(f));
for (let i = 0; i < sel.length; i += 4) showRow(sel.slice(i, i + 4));
