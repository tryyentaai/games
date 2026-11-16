// WILDLIGHT — the WILDDEX: list + entry pages.
(function () {
  'use strict';
  const G = window.G;
  const D = (G.Dex = {});

  D.open = function (onClose) {
    const ids = Object.keys(G.DATA.mons || {});
    const seen = () => ids.filter((id) => G.state.dex.seen[id]).length;
    const caught = () => ids.filter((id) => G.state.dex.caught[id]).length;
    const ROWS = 7;
    let idx = 0, top = 0;
    const sc = {
      opaque: true,
      update() {
        if (!ids.length) { if (G.input.pressed('b') || G.input.pressed('a')) close(); return; }
        if (G.input.repeat('up')) { idx = Math.max(0, idx - 1); G.audio.sfx('cursor'); }
        if (G.input.repeat('down')) { idx = Math.min(ids.length - 1, idx + 1); G.audio.sfx('cursor'); }
        if (G.input.repeat('left')) { idx = Math.max(0, idx - ROWS); G.audio.sfx('cursor'); }
        if (G.input.repeat('right')) { idx = Math.min(ids.length - 1, idx + ROWS); G.audio.sfx('cursor'); }
        if (idx < top) top = idx; if (idx >= top + ROWS) top = idx - ROWS + 1;
        if (G.input.pressed('a') && G.state.dex.seen[ids[idx]]) { G.audio.sfx('select'); entry(ids[idx]); }
        if (G.input.pressed('b')) close();
      },
      draw() {
        G.clear(0);
        G.box(0, 0, 124, 144);
        for (let r = 0; r < ROWS && top + r < ids.length; r++) {
          const id = ids[top + r], y = 8 + r * 16, n = String(top + r + 1).padStart(2, '0');
          G.text(n, 12, y, 2);
          if (G.state.dex.caught[id]) G.text('★', 28, y);
          G.text(G.state.dex.seen[id] ? G.DATA.mons[id].name.slice(0, 10) : '----------', 36, y);
        }
        if (ids.length) G.text('▶', 4, 8 + (idx - top) * 16);
        // side panel
        G.text('SEEN', 126, 10, 2); G.textR(seen(), 158, 22);
        G.text('OWN', 126, 40, 2); G.textR(caught(), 158, 52);
        const id = ids[idx];
        if (id && G.state.dex.seen[id] && G.SPR.mons && G.SPR.mons[id]) G.drawSpr(G.SPR.mons[id].icon || G.SPR.mons[id].front, 134, 76 + ((G.frame >> 4) & 1));
        G.text('A:', 126, 116, 2); G.text('VIEW', 126, 128, 2);
      },
    };
    function close() { G.audio.sfx('back'); G.pop(sc); onClose && onClose(); }
    G.push(sc);
  };

  function entry(id) {
    const m = G.DATA.mons[id], own = !!G.state.dex.caught[id], dex = m.dex || {};
    const num = String(Object.keys(G.DATA.mons).indexOf(id) + 1).padStart(3, '0');
    G.audio.cry && G.audio.cry(id);
    let page = 0;
    const text = own ? G.wrap(dex.text || '', 18) : ['Catch one to learn', 'more about it.'];
    const pages = Math.max(1, Math.ceil(text.length / 3));
    const sc = {
      opaque: true,
      update() {
        if (G.input.pressed('a') || G.input.pressed('right')) { if (page < pages - 1) { page++; G.audio.sfx('blip'); } else close(); }
        else if (G.input.pressed('left') && page > 0) page--;
        else if (G.input.pressed('b')) close();
      },
      draw() {
        G.clear(0);
        G.box(0, 0, 160, 144);
        const spr = G.SPR.mons && G.SPR.mons[id] && G.SPR.mons[id].front;
        if (spr) G.drawSpr(spr, 12, 10);
        G.text(m.name, 56, 12);
        G.text((dex.kind || '???') + '', 56, 26, 2);
        G.text('No.' + num, 12, 46, 2);
        G.text((m.types || []).join('/').slice(0, 13), 56, 40, 2);
        G.text('HT ' + (own ? (dex.ht || '?') : '??'), 56, 54);
        G.text('WT ' + (own ? (dex.wt || '?') : '??'), 56, 64 + 2);
        G.rect(8, 80, 144, 2, 3); G.rect(8, 83, 144, 1, 2);
        text.slice(page * 3, page * 3 + 3).forEach((l, i) => G.text(l, 8, 92 + i * 14));
        if ((G.frame >> 4) & 1) G.text('▼', 144, 132);
      },
    };
    function close() { G.audio.sfx('back'); G.pop(sc); }
    G.push(sc);
  }
})();
