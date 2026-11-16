// WILDLIGHT — party, bag and summary screens. Owner: battle module.
// G.Menus.party({mode:'view'|'battle'|'item', active?, forced?, onPick(i)})  i = party index, or -1 on cancel
// G.Menus.bag({mode:'field'|'battle', onUse(itemId, partyIndex?)})        battle: returns the choice (null = cancel); field: applies it
// G.Menus.summary(mon, onClose?)
(function () {
  'use strict';
  const G = window.G;
  const M = (G.Menus = G.Menus || {});
  const D = () => G.DATA;
  const nm = (m) => G.monName(m);

  function hpBar(x, y, m, w) {
    w = w || 48;
    const f = G.clamp(m.hp / m.maxhp, 0, 1);
    G.rect(x, y, w + 4, 6, 3); G.rect(x + 1, y + 1, w + 2, 4, 0);
    const fw = Math.ceil(w * f); if (fw > 0) G.rect(x + 2, y + 2, fw, 2, f > 0.5 ? 3 : f > 0.2 ? 2 : 1);
  }
  M.hpBar = hpBar;

  // ---------- Party ----------
  M.party = function (o) {
    o = o || {};
    const party = G.state.party, mode = o.mode || 'view';
    let idx = 0, swapFrom = -1, msg = null;
    const defMsg = mode === 'item' ? 'Use on which mon?' : mode === 'battle' ? (o.forced ? 'Send out which mon?' : 'Choose a mon.') : 'Choose a mon.';
    const sc = {
      opaque: true,
      update() {
        if (!party.length) { if (G.input.pressed('a') || G.input.pressed('b')) close(-1); return; }
        if (G.input.repeat('up')) { idx = (idx + party.length - 1) % party.length; G.audio.sfx('cursor'); }
        if (G.input.repeat('down')) { idx = (idx + 1) % party.length; G.audio.sfx('cursor'); }
        if (G.input.pressed('b')) {
          if (swapFrom >= 0) { swapFrom = -1; msg = null; G.audio.sfx('back'); return; }
          if (o.forced) { G.audio.sfx('bump'); return; }
          G.audio.sfx('back'); close(-1); return;
        }
        if (!G.input.pressed('a')) return;
        G.audio.sfx('select');
        const m = party[idx];
        if (mode === 'item') return close(idx);
        if (swapFrom >= 0) {
          if (swapFrom !== idx) { const t = party[swapFrom]; party[swapFrom] = party[idx]; party[idx] = t; }
          swapFrom = -1; msg = null; return;
        }
        if (mode === 'battle') {
          G.menu({ items: ['SHIFT', 'SUMMARY', 'CANCEL'], x: 80, y: 88, cancelIndex: 2, onSelect: (k) => {
            if (k === 0) {
              if (m.hp <= 0) G.say(nm(m) + ' has no energy left to fight!');
              else if (idx === o.active) G.say(nm(m) + ' is already battling!');
              else close(idx);
            } else if (k === 1) M.summary(m);
          } });
        } else {
          G.menu({ items: ['SUMMARY', 'SWITCH', 'CANCEL'], x: 80, y: 88, cancelIndex: 2, onSelect: (k) => {
            if (k === 0) M.summary(m);
            else if (k === 1) { swapFrom = idx; msg = 'Move to where?'; }
          } });
        }
      },
      draw() {
        G.clear(0);
        party.forEach((m, i) => {
          const y = i * 16;
          if (i === idx && G.top() === sc) G.rect(0, y, 160, 16, i === swapFrom ? 1 : 0);
          if (i === swapFrom) G.text('▷', 0, y + 4);
          else if (i === idx) G.text('▶', 0, y + 4);
          const spr = G.SPR.mons && G.SPR.mons[m.id];
          const bob = i === idx && m.hp > 0 ? ((G.frame >> 3) & 1) : 0;
          if (spr) G.drawSpr(spr.icon, 8, y + bob, m.hp <= 0 ? { map: '1223' } : null);
          G.text(nm(m), 28, y);
          G.textR('Lv' + m.lvl, 158, y);
          G.text(m.hp <= 0 ? 'FNT' : m.status || '', 28, y + 8);
          hpBar(56, y + 9, m, 40);
          G.textR(m.hp + '/' + m.maxhp, 158, y + 8);
        });
        G.box(0, 96, 160, 48);
        G.wrap(msg || defMsg, 18).slice(0, 2).forEach((l, i) => G.text(l, 8, 104 + i * 16));
      },
    };
    function close(i) { G.pop(sc); o.onPick && o.onPick(i); }
    return G.push(sc);
  };

  // ---------- Bag ----------
  M.bag = function (o) {
    o = o || {};
    const mode = o.mode || 'field';
    let idx = 0, top = 0;
    const list = () => {
      const bag = G.state.bag || {};
      const ids = Object.keys(D().items).filter((k) => bag[k] > 0 && !(mode === 'battle' && D().items[k].use.repel));
      Object.keys(bag).forEach((k) => { if (bag[k] > 0 && !ids.includes(k) && D().items[k] && mode !== 'battle') ids.push(k); });
      return ids.concat(['__cancel']);
    };
    const consume = (id) => { const bag = G.state.bag; if (bag[id] > 0) { bag[id]--; if (!bag[id]) delete bag[id]; } };
    const sc = {
      opaque: true,
      update() {
        const L = list();
        if (idx >= L.length) idx = L.length - 1;
        if (G.input.repeat('up')) { idx = (idx + L.length - 1) % L.length; G.audio.sfx('cursor'); }
        if (G.input.repeat('down')) { idx = (idx + 1) % L.length; G.audio.sfx('cursor'); }
        if (idx < top) top = idx; if (idx > top + 4) top = idx - 4;
        if (G.input.pressed('b')) { G.audio.sfx('back'); return close(null); }
        if (!G.input.pressed('a')) return;
        G.audio.sfx('select');
        const id = L[idx];
        if (id === '__cancel') return close(null);
        const it = D().items[id], u = it.use;
        if (mode === 'battle') {
          if (u.catch) return close(id);
          M.party({ mode: 'item', item: id, onPick: (i) => {
            if (i < 0) return;
            if (!D().canUse(G.state.party[i], id)) { G.say('It won\'t have any effect.'); return; }
            close(id, i);
          } });
          return;
        }
        G.menu({ items: ['USE', 'TOSS', 'CANCEL'], x: 96, y: 40, cancelIndex: 2, onSelect: (k) => {
          if (k === 0) fieldUse(id);
          else if (k === 1) G.say('Toss one ' + it.name + '?', { choices: ['YES', 'NO'], onChoice: (c) => { if (c === 0) { consume(id); G.say('Tossed one ' + it.name + '.'); } } });
        } });
      },
      draw() {
        G.clear(0);
        const L = list();
        G.box(0, 0, 160, 96);
        L.slice(top, top + 5).forEach((id, j) => {
          const i = top + j, y = 8 + j * 16;
          if (id === '__cancel') G.text('CANCEL', 16, y);
          else { G.text(D().items[id].name, 16, y); G.textR('×' + G.state.bag[id], 150, y + 6); }
          if (i === idx) G.text('▶', 6, y);
        });
        if (top + 5 < L.length && (G.frame >> 4) & 1) G.text('▼', 144, 84);
        G.box(0, 96, 160, 48);
        const id = L[idx];
        const desc = id === '__cancel' ? (mode === 'field' ? 'MONEY $' + (G.state.money || 0) : 'Close the bag.') : D().items[id].desc;
        G.wrap(desc, 18).slice(0, 2).forEach((l, i) => G.text(l, 8, 104 + i * 16));
      },
    };
    function fieldUse(id) {
      const it = D().items[id], u = it.use;
      if (u.catch) { G.say('An ORB is for battles with wild mons.'); return; }
      if (u.repel) { consume(id); G.state.repel = u.repel; G.audio.sfx('item'); G.say('Used ' + it.name + '! Wild mons will keep away for a while.'); o.onUse && o.onUse(id); return; }
      M.party({ mode: 'item', item: id, onPick: (i) => {
        if (i < 0) return;
        const m = G.state.party[i], r = D().applyItem(m, id);
        if (!r) { G.say("It won't have any effect."); return; }
        consume(id); G.audio.sfx('heal');
        if (m.id === 'voltkit' && u.heal) m.bond = Math.min(255, (m.bond || 0) + 1);
        G.say(r); o.onUse && o.onUse(id, i);
      } });
    }
    function close(id, target) { G.pop(sc); if (mode === 'battle') o.onUse && o.onUse(id, target); }
    return G.push(sc);
  };

  // ---------- Summary ----------
  M.summary = function (mon, onClose) {
    let page = 0;
    const sp = D().mons[mon.id];
    G.audio.cry(mon.id);
    const sc = {
      opaque: true,
      update() {
        if (G.input.pressed('left') || G.input.pressed('right') || G.input.pressed('a')) { page ^= 1; G.audio.sfx('cursor'); }
        if (G.input.pressed('b')) { G.audio.sfx('back'); G.pop(sc); onClose && onClose(); }
      },
      draw() {
        G.clear(0);
        const spr = G.SPR.mons && G.SPR.mons[mon.id];
        if (page === 0) {
          if (spr) G.ctx.drawImage(G.sprCanvas(spr.front, false, null), 4, 6, 64, 64);
          G.text('No.' + String(sp.no || 0).padStart(3, '0'), 76, 4);
          G.text(nm(mon), 76, 16);
          G.text('Lv' + mon.lvl, 76, 28);
          G.text(mon.hp <= 0 ? 'FNT' : mon.status || 'OK', 120, 28);
          sp.types.forEach((t, i) => G.text(t, 76, 42 + i * 10));
          if (mon.id === 'voltkit') {
            const h = Math.min(5, Math.floor((mon.bond || 0) / 51));
            G.text('BOND', 76, 64);
            for (let i = 0; i < 5; i++) G.text('♥', 112 + i * 9, 64, i < h ? 3 : 1);
          }
          G.box(0, 74, 160, 70);
          G.text('HP', 8, 82); hpBar(28, 83, mon, 48); G.textR(mon.hp + '/' + mon.maxhp, 152, 82);
          const st = mon.stats;
          [['ATK', st.atk], ['DEF', st.def], ['SPD', st.spd], ['SPC', st.spc]].forEach(([k, v], i) => {
            const x = 8 + (i & 1) * 76, y = 96 + (i >> 1) * 12; G.text(k, x, y); G.textR(String(v), x + 64, y);
          });
          G.text('XP', 8, 122); G.textR(String(mon.xp), 72, 122);
          G.text('NEXT', 84, 122); G.textR(String(mon.lvl >= 100 ? 0 : G.xpForLevel(mon.lvl + 1) - mon.xp), 152, 122);
          G.text('▶', 144, 132);
        } else {
          if (spr) G.drawSpr(spr.icon, 4, 2);
          G.text(nm(mon), 24, 6); G.textR('Lv' + mon.lvl, 156, 6);
          G.box(0, 20, 160, 124);
          for (let i = 0; i < 4; i++) {
            const y = 28 + i * 28, s = mon.moves[i];
            if (!s) { G.text('-', 12, y); continue; }
            const mv = D().moves[s.id];
            G.text(mv.name, 12, y);
            G.text(mv.type, 20, y + 10, 2);
            G.textR('PP' + s.pp + '/' + mv.pp, 152, y + 10);
          }
        }
      },
    };
    return G.push(sc);
  };
})();
