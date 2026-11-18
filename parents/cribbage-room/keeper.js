/* The Cribbage Room — score keeper for real-card games, and the hand counter (pick or scan). */
(function () {
  const C = window.CRIB, U = window.UI, $ = U.$;

  /* =================== SCORE KEEPER =================== */
  const KEY = 'crib-keeper';
  const fresh = (prev) => ({
    names: prev ? prev.names : ['Ryan', 'Matthew'], score: [0, 0], back: [0, 0], active: 0,
    dealer: prev ? 1 - prev.dealer : 0, hand: 1, log: [], hist: [], wins: prev ? prev.wins : [0, 0], over: false
  });
  let K = U.LS.get(KEY, null) || fresh();
  let kBoard = null;
  const save = () => U.LS.set(KEY, K);
  const snap = () => { K.hist.push(JSON.stringify({ score: K.score, back: K.back, dealer: K.dealer, hand: K.hand, log: K.log, over: K.over, wins: K.wins })); if (K.hist.length > 60) K.hist.shift(); };

  function kRender() {
    if (!kBoard) kBoard = U.createBoard($('kBoard'));
    kBoard.set(K.score, K.back);
    $('kPlayers').innerHTML = [0, 1].map((i) => {
      const lead = K.score[i] - K.score[1 - i];
      const meta = K.score[i] >= 121 ? 'Wins the game' : K.score[i] === 0 && K.score[1 - i] === 0 ? 'Tap to score for ' + K.names[i] : (121 - K.score[i]) + ' to go' + (lead > 0 ? ', up ' + lead : '');
      return '<button class="kp p' + (i + 1) + (K.active === i ? ' on' : '') + '" data-kp="' + i + '" aria-pressed="' + (K.active === i) + '">' +
        (K.dealer === i ? '<span class="kp-dealer" title="Dealer">D</span>' : '') +
        '<div class="kp-n">' + U.esc(K.names[i]) + '</div><div class="kp-s">' + K.score[i] + '</div><div class="kp-m">' + meta + '</div></button>';
    }).join('');
    $('kPad').innerHTML = [1, 2, 3, 4, 5, 6, 8, 12].map((n) => '<button type="button" data-add="' + n + '">+' + n + '</button>').join('');
    $('kCount').textContent = 'Count ' + K.names[K.active] + '\'s hand';
    $('kUndo').disabled = !K.hist.length;
    $('kLog').innerHTML = K.log.slice().reverse().map((l) => '<li>' + U.esc(l) + '</li>').join('') || '<li>No points yet. Hand 1, ' + U.esc(K.names[K.dealer]) + ' deals.</li>';
  }

  function kAdd(i, pts, why) {
    if (K.over || pts <= 0) return;
    snap();
    K.back[i] = K.score[i];
    K.score[i] = Math.min(121, K.score[i] + pts);
    K.log.push('Hand ' + K.hand + ': ' + K.names[i] + ' +' + pts + (why ? ' (' + why + ')' : '') + ' → ' + K.score[i]);
    U.SFX.peg(); U.buzz(12);
    kRender();
    U.burst('+' + pts, why || '', i ? 'opp' : 'you', document.querySelector('[data-kp="' + i + '"] .kp-s'));
    if (K.score[i] >= 121) { K.over = true; K.wins[i]++; save(); setTimeout(() => kWin(i), 700); }
    save();
  }

  function kWin(i) {
    const loser = K.score[1 - i], skunk = loser <= 90, dbl = loser <= 60;
    U.SFX.big();
    $('overlay').dataset.sticky = '1';
    U.modal('<h3>' + U.esc(K.names[i]) + ' wins</h3><div class="sub">' + K.score[0] + ' to ' + K.score[1] + (dbl ? ', a double skunk.' : skunk ? ', a skunk.' : '.') +
      ' ' + U.esc(K.names[1 - i]) + ' settles the check.</div>' +
      '<div class="mat-cap" style="text-align:center;font-size:13px">Series: ' + U.esc(K.names[0]) + ' ' + K.wins[0] + ', ' + U.esc(K.names[1]) + ' ' + K.wins[1] + '</div>' +
      '<div class="row" style="margin-top:14px"><button class="btn" id="kUndoWin">Undo last score</button><button class="btn gold" id="kNew">New game</button></div>');
  }

  function kMenu() {
    delete $('overlay').dataset.sticky;
    U.modal('<h3>Game options</h3>' +
      '<label class="field">First player<input id="kN0" maxlength="16" value="' + U.esc(K.names[0]) + '"></label>' +
      '<label class="field">Second player<input id="kN1" maxlength="16" value="' + U.esc(K.names[1]) + '"></label>' +
      '<div class="row" style="margin-top:6px"><button class="btn gold" id="kSaveNames">Save names</button></div>' +
      '<div class="setrow"><div>Start over<small>Clears this game. The series record stays.</small></div><button class="btn" id="kNew">New game</button></div>' +
      '<div class="setrow"><div>Reset the series<small>Sets the win count back to zero for both players.</small></div><button class="btn" id="kResetSeries">Reset</button></div>');
  }

  U.hooks.keeper = () => { kBoard = null; kRender(); };

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.kp !== undefined) { K.active = +t.dataset.kp; save(); U.SFX.tick(); return kRender(); }
    if (t.dataset.add) return kAdd(K.active, +t.dataset.add, '');
    switch (t.id) {
      case 'kUndo': case 'kUndoWin': {
        const h = K.hist.pop(); if (!h) return;
        const s = JSON.parse(h); Object.assign(K, s); save(); U.closeModal(); delete $('overlay').dataset.sticky; return kRender();
      }
      case 'kDeal':
        snap(); K.dealer = 1 - K.dealer; K.hand++; K.active = 1 - K.dealer;
        K.log.push('Hand ' + K.hand + ': ' + K.names[K.dealer] + ' deals');
        save(); U.SFX.card(); return kRender();
      case 'kCount': return openCounter({ forPlayer: K.active });
      case 'kMenu': return kMenu();
      case 'kSaveNames':
        K.names = [($('kN0').value || 'Player 1').trim(), ($('kN1').value || 'Player 2').trim()];
        save(); U.closeModal(); return kRender();
      case 'kNew': K = fresh(K); save(); delete $('overlay').dataset.sticky; U.closeModal(); return kRender();
      case 'kResetSeries': K.wins = [0, 0]; save(); U.closeModal(); return kRender();
    }
  });

  /* =================== HAND COUNTER =================== */
  const CT = { slots: [null, null, null, null, null], on: 0, suit: 0, crib: false, forPlayer: null, scanned: null };

  function openCounter(o) {
    CT.forPlayer = o && o.forPlayer !== undefined ? o.forPlayer : null;
    CT.slots = [null, null, null, null, null]; CT.on = 0; CT.crib = false; CT.scanned = null;
    U.go('counter');
  }
  U.hooks.counter = () => cRender();

  const used = () => new Set(CT.slots.filter(Boolean).map((c) => c.id));

  function cRender() {
    $('cTitle').textContent = CT.forPlayer !== null ? K.names[CT.forPlayer] + '\'s ' + (CT.crib ? 'crib' : 'hand') : 'Count a hand';
    $('cSlots').innerHTML = CT.slots.map((c, i) =>
      (i === 4 ? '<span></span>' : '') +
      '<button type="button" class="slot' + (CT.on === i ? ' on' : '') + '" data-slot="' + i + '" aria-label="' + (i === 4 ? 'Cut card' : 'Card ' + (i + 1)) + (c ? ', ' + C.label(c) : ', empty') + '">' +
      (c ? U.cardHTML(c) : '<span class="empty">+</span>') + '<span>' + (i === 4 ? 'Cut card' : '') + '</span></button>').join('');
    $('cCrib').setAttribute('aria-pressed', CT.crib);
    const u = used();
    $('cPicker').innerHTML = '<div class="suits">' + C.SUITS.map((s, i) =>
      '<button type="button" class="' + (i === 1 || i === 2 ? 'red' : '') + '" data-suit="' + i + '" aria-pressed="' + (CT.suit === i) + '" aria-label="' + ['Spades', 'Hearts', 'Diamonds', 'Clubs'][i] + '">' + s + '</button>').join('') + '</div>' +
      '<div class="ranks">' + C.RANKS.map((r, i) => '<button type="button" data-rank="' + (i + 1) + '"' + (u.has((i + 1) + '-' + CT.suit) ? ' disabled' : '') + '>' + r + '</button>').join('') + '</div>';
    cResult();
  }

  function cResult() {
    const el = $('cResult');
    if (CT.scanned) return; // the scan panel owns this area until it's dismissed
    if (CT.slots.some((c) => !c)) {
      const left = CT.slots.filter((c) => !c).length;
      el.innerHTML = '<div class="mat-cap" style="text-align:center;font-size:13px">' + (left === 5 ? 'Tap a suit, then a rank. Or scan the cards.' : left + ' more card' + (left > 1 ? 's' : '') + ' to go.') + '</div>';
      return;
    }
    const hand = CT.slots.slice(0, 4), cut = CT.slots[4];
    const res = C.scoreHand(hand, cut, CT.crib);
    const lines = C.narrate(res);
    el.innerHTML = '<div class="show"><div class="show-h"><span class="show-t">' + (CT.crib ? 'The crib' : 'The hand') + ' counts</span><span class="show-total">' + res.total + '</span></div>' +
      '<div class="narr">' + (res.items.length ? lines.map((l, i) => (i ? l : l.charAt(0).toUpperCase() + l.slice(1))).join(', ') + '.' : 'Nineteen. Nothing to count.') + '</div>' +
      (res.items.length ? '<table class="summary">' + res.items.map((it) => '<tr><td>' + it.label + ' <span class="mat-cap">' + it.cards.map(C.label).join(' ') + '</span></td><td>+' + it.pts + '</td></tr>').join('') + '</table>' : '') +
      (CT.forPlayer !== null ? '<button class="btn gold" id="cAdd" style="width:100%"' + (res.total ? '' : ' disabled') + '>Add ' + res.total + ' to ' + U.esc(K.names[CT.forPlayer]) + '</button>' : '') +
      '</div>';
    U.SFX.score();
  }

  function setCard(c) {
    if (used().has(c.id)) return;
    CT.slots[CT.on] = c;
    U.SFX.card();
    const next = CT.slots.findIndex((x) => !x);
    CT.on = next === -1 ? CT.on : next;
    cRender();
  }

  /* ---------- scanning ---------- */
  async function onPhoto(file) {
    if (!file) return;
    const el = $('cResult');
    CT.scanned = { busy: true };
    const cached = await window.VISION.isCached();
    el.innerHTML = '<div class="show scanbox"><div class="show-t">' + (cached ? 'Reading the cards…' : 'Getting the card reader ready') + '</div>' +
      (cached ? '' : '<div class="mat-cap" style="margin-top:4px">One-time download of about 40 MB. After this it works offline.</div>') +
      '<div class="progress"><i id="cProg"></i></div></div>';
    try {
      const { url, found } = await window.VISION.detect(file, (p) => { const b = document.getElementById('cProg'); if (b) b.style.width = Math.round(p * 100) + '%'; });
      const cards = found.map((f) => ({ card: C.fromCode(f.code), conf: f.conf })).filter((x) => x.card).slice(0, 5);
      CT.slots = [null, null, null, null, null];
      cards.forEach((x, i) => { if (i < 4) CT.slots[i] = x.card; });
      if (cards.length === 5) CT.slots[4] = cards[4].card;
      CT.on = Math.max(0, CT.slots.findIndex((x) => !x));
      CT.scanned = { url, cards };
      cRender();
      const shaky = cards.filter((x) => x.conf < 0.6).map((x) => C.label(x.card));
      el.innerHTML = '<div class="show scanbox"><img src="' + url + '" alt="Your photo">' +
        '<div class="show-t" style="margin-top:4px">' + (cards.length ? 'Found ' + cards.length + ' card' + (cards.length > 1 ? 's' : '') : 'No cards found') + '</div>' +
        '<div class="mat-cap" style="font-size:13px;line-height:1.5;margin:4px 0 10px">' +
        (cards.length === 5 ? 'Which one is the cut card? Tap it below.' : cards.length ? 'Add the missing card' + (cards.length < 4 ? 's' : '') + ' with the picker.' : 'Lay the cards flat and spread out so every corner shows, then try again.') +
        (shaky.length ? ' Double-check ' + shaky.join(', ') + '.' : '') + '</div>' +
        (cards.length === 5 ? '<div class="show-cards">' + cards.map((x) => U.cardHTML(x.card, { button: true }).replace('data-id=', 'data-cut=')).join('') + '</div>' : '') +
        '<button class="btn" id="cScanDone" style="width:100%;margin-top:8px">' + (cards.length === 5 ? 'Keep the order shown' : 'Done') + '</button></div>';
    } catch (err) {
      CT.scanned = { error: true };
      el.innerHTML = '<div class="show scanbox"><div class="show-t">The card reader didn\'t run</div><div class="mat-cap" style="font-size:13px;margin:6px 0 10px">' + U.esc(err.message || err) + '</div>' +
        '<button class="btn" id="cScanDone" style="width:100%">Use the picker instead</button></div>';
    }
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t || !t.closest('#counter')) return;
    if (t.dataset.slot !== undefined) { CT.on = +t.dataset.slot; U.SFX.tick(); return cRender(); }
    if (t.dataset.suit !== undefined) { CT.suit = +t.dataset.suit; return cRender(); }
    if (t.dataset.rank) return setCard(C.mk(+t.dataset.rank, CT.suit));
    if (t.dataset.cut) {
      const pick = CT.scanned.cards.find((x) => x.card.id === t.dataset.cut).card;
      const rest = CT.scanned.cards.map((x) => x.card).filter((c) => c.id !== pick.id);
      CT.slots = rest.slice(0, 4).concat([pick]);
      CT.scanned = null; return cRender();
    }
    switch (t.id) {
      case 'cScanDone': CT.scanned = null; return cRender();
      case 'cCrib': CT.crib = !CT.crib; return cRender();
      case 'cClear': CT.slots = [null, null, null, null, null]; CT.on = 0; CT.scanned = null; return cRender();
      case 'cScan': $('cFile').value = ''; return $('cFile').click();
      case 'cBack': return U.go(CT.forPlayer !== null ? 'keeper' : 'home');
      case 'cAdd': {
        const res = C.scoreHand(CT.slots.slice(0, 4), CT.slots[4], CT.crib);
        const who = CT.forPlayer;
        U.go('keeper');
        setTimeout(() => kAdd(who, res.total, CT.crib ? 'crib' : 'hand'), 250);
        return;
      }
    }
  });
  $('cFile').addEventListener('change', (e) => onPhoto(e.target.files && e.target.files[0]));

  // the home screen's "Count a hand" opens it standalone
  document.querySelector('[data-go="counter"]').addEventListener('click', () => { CT.forPlayer = null; CT.slots = [null, null, null, null, null]; CT.on = 0; CT.scanned = null; }, true);
  window.__keeper = { get K() { return K; }, CT };
})();
