/* The Cribbage Room — game controller. Engine lives in engine.js (window.CRIB). */
(function () {
  const C = window.CRIB;
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const AUTO = qs.get('auto') === '1';                 // both sides AI (used for testing)
  const SPEED = qs.has('speed') ? parseFloat(qs.get('speed')) : 1; // delay multiplier
  const wait = (ms) => (SPEED === 0 ? 0 : ms * SPEED);

  /* ---------- personas & banter ---------- */
  const PERSONAS = {
    sal: {
      id: 'sal', name: 'Sal', title: 'The Regular',
      blurb: 'Table four since 1987. Plays the crib hard and talks harder.',
      voice: 'a gruff, wisecracking New York steakhouse regular who loves cribbage',
      cribWeight: 1.15, noise: 0, slip: 0,
      lines: {
        start: ['Deal them. Check is on the loser, you know the rule.', 'Sit down, kid. Table four doesn\'t stay empty.', 'Cut the deck and cut the chatter.'],
        oppBig: ['That\'s how it\'s done, pal.', 'Write that one on the tab.', 'I could do that in my sleep.'],
        youBig: ['Lucky cards. Luck doesn\'t last.', 'Okay, okay. Don\'t let it go to your head.', 'Hmph. Beginner\'s luck.'],
        oppGo: ['Go. Your move, hotshot.', 'Can\'t play. Go on.'],
        win: ['Pull out the wallet. Dinner\'s on you.', 'Another one for the house. Bring the check.'],
        lose: ['Fine. You got me. Dessert is on me.', 'Lucky. Run it back.'],
        skunk: ['Skunked! Somebody call the kitchen, he\'s buying.', 'Skunk! Don\'t show your face before ninety.']
      }
    },
    walt: {
      id: 'walt', name: 'Walt', title: 'Grandpa',
      blurb: 'Patient, kind, and sharper than he looks. A gentle table.',
      voice: 'a warm, patient grandfather who taught the grandkids cribbage',
      cribWeight: 0.9, noise: 0.35, slip: 0.1,
      lines: {
        start: ['Take your time, there\'s no rush at this table.', 'Good luck, son. Deal \'em out.', 'Cribbage is better with company.'],
        oppBig: ['Well, how about that.', 'Fifteen-two, fifteen-four, and I\'m still counting.', 'The old man still has it.'],
        youBig: ['Nicely done. You\'re learning fast.', 'Now that\'s a fine hand!', 'You\'ve been practicing, I can tell.'],
        oppGo: ['Go, I\'m afraid.', 'Nothing I can play. Over to you.'],
        win: ['Good game. Let me buy you pie.', 'That\'s the way it goes. Rematch?'],
        lose: ['Well played. You\'ve got a knack for this.', 'You earned that one, no question.'],
        skunk: ['Oh dear, that\'s a skunk. We\'ll call it a lesson.', 'Skunk! We don\'t talk about this one.']
      }
    }
  };

  /* ---------- storage ---------- */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const settings = Object.assign({ coach: true, lm: false }, LS.get('crib-settings', {}));
  const record = LS.get('crib-record', { sal: { w: 0, l: 0 }, walt: { w: 0, l: 0 } });
  const saveSettings = () => LS.set('crib-settings', settings);
  const saveRecord = () => LS.set('crib-record', record);

  /* ---------- state ---------- */
  let G = null;
  let timer = null;
  const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(fn, wait(ms)); };
  const other = (w) => (w === 'you' ? 'opp' : 'you');
  const P = () => PERSONAS[G.pid];

  /* ---------- tiny on-device LM (optional, beta) ---------- */
  const LM = { state: 'off', pipe: null };
  async function loadLM() {
    if (LM.state === 'loading' || LM.state === 'ready') return;
    if (!navigator.gpu) { LM.state = 'fail'; settings.lm = false; saveSettings(); setStatus('Live banter needs WebGPU, which this device lacks. Using house lines.'); return; }
    LM.state = 'loading';
    setStatus('Loading the house wit (one-time download, ~250 MB)…');
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm');
      LM.pipe = await mod.pipeline('text-generation', 'onnx-community/SmolLM2-360M-Instruct', { device: 'webgpu', dtype: 'q4' });
      LM.state = 'ready';
      setStatus('Live banter is on.');
    } catch (e) {
      LM.state = 'fail'; settings.lm = false; saveSettings();
      setStatus('Could not load live banter here. Using house lines.');
    }
  }
  async function lmLine(p, desc) {
    const run = LM.pipe([
      { role: 'system', content: 'You are ' + p.name + ', ' + p.voice + '. Reply with ONE short in-character line, at most 16 words. No numbers, no emojis, no quotes.' },
      { role: 'user', content: desc }
    ], { max_new_tokens: 36, do_sample: true, temperature: 0.8 });
    const out = await Promise.race([run, new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
    let t = (out[0].generated_text.at ? out[0].generated_text.at(-1).content : String(out[0].generated_text)) || '';
    t = t.split('\n')[0].replace(/["“”]/g, '').trim();
    if (!t || t.length > 120 || /\d/.test(t)) throw new Error('bad');
    return t;
  }

  let lastSay = 0;
  async function banter(event, desc, force) {
    const p = P();
    const now = Date.now();
    if (!force && now - lastSay < wait(2500)) return;
    lastSay = now;
    const pool = p.lines[event];
    let line = pool ? pool[Math.floor(Math.random() * pool.length)] : null;
    if (!line) return;
    say(p.name, line);
    if (settings.lm && LM.state === 'ready' && desc) {
      try { const l = await lmLine(p, desc); if (G && G.pid === p.id) say(p.name, l); } catch (e) {}
    }
  }
  function say(who, text) {
    const b = $('bubble');
    b.textContent = '';
    const n = document.createElement('b');
    n.textContent = who + ':';
    b.append(n, ' ' + text);
  }
  function setStatus(t) { $('status').textContent = t; }

  /* ---------- peg board ---------- */
  const ROWS = [[0, 40], [40, 80], [80, 121]];
  function holePos(who, n) {
    if (n <= 0) return { x: 6, y: who === 'you' ? 24 : 14 };
    const idx = n - 1;
    const row = idx < 40 ? 0 : idx < 80 ? 1 : 2;
    const col = idx - ROWS[row][0];
    return { x: 18 + col * 9.1, y: 12 + row * 26 + (who === 'you' ? 10 : 0) };
  }
  function buildBoard() {
    let s = '<svg viewBox="0 0 392 86" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cribbage board">';
    for (const who of ['opp', 'you']) {
      for (let n = 1; n <= 121; n++) {
        const p = holePos(who, n);
        const big = n % 5 === 0;
        const col = n === 91 ? '#B23A48' : n === 121 ? '#E8C87E' : '#1b130b';
        s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (n === 91 || n === 121 ? 2.4 : big ? 1.9 : 1.5) + '" fill="' + col + '" stroke="#6b5230" stroke-width=".4"/>';
      }
    }
    const pegs = [['you', 'f', '#E8C87E'], ['you', 'b', '#A87F3C'], ['opp', 'f', '#d65c6a'], ['opp', 'b', '#7a2530']];
    for (const [w, k, col] of pegs)
      s += '<g class="peg" id="peg-' + w + '-' + k + '" style="transform:translate(6px,' + holePos(w, 0).y + 'px)"><circle r="3.6" fill="' + col + '" stroke="#000" stroke-opacity=".5" stroke-width=".6"/></g>';
    s += '</svg>';
    $('board').innerHTML = s;
  }
  function movePegs() {
    for (const w of ['you', 'opp']) {
      const f = holePos(w, Math.min(G.score[w], 121)), b = holePos(w, Math.min(G.back[w], 121));
      $('peg-' + w + '-f').style.transform = 'translate(' + f.x + 'px,' + f.y + 'px)';
      $('peg-' + w + '-b').style.transform = 'translate(' + b.x + 'px,' + b.y + 'px)';
    }
  }

  /* ---------- scoring plumbing ---------- */
  function peg(who, pts, reason) {
    if (pts <= 0 || G.winner) return;
    G.back[who] = G.score[who];
    G.score[who] += pts;
    G.log.push(who + ' +' + pts + ' ' + reason);
    if (G.score[who] >= 121) { G.score[who] = 121; G.winner = who; later(endGame, 700); }
    movePegs();
    $('sy').textContent = G.score.you; $('so').textContent = G.score.opp;
  }

  /* ---------- rendering ---------- */
  function cardEl(c, cls, attrs) {
    const tag = attrs && attrs.indexOf('data-id') !== -1 ? 'button' : 'div';
    const role = tag === 'div' ? ' role="img"' : '';
    return '<' + tag + role + ' class="card ' + (C.isRed(c) ? 'red ' : '') + (cls || '') + '" ' + (tag === 'button' ? attrs : '') + ' aria-label="' + C.label(c) + '"><span>' + C.RANKS[c.r - 1] + '</span><span class="su">' + C.SUITS[c.s] + '</span></' + tag + '>';
  }
  const backEl = (cls) => '<div class="card back ' + (cls || '') + '"></div>';

  function render() {
    if (!G) return;
    $('vs').textContent = 'vs ' + P().name;
    $('oname').textContent = P().name.toUpperCase();
    $('sy').textContent = G.score.you; $('so').textContent = G.score.opp;

    // opponent hand
    $('oppHand').innerHTML = (G.phase === 'discard' || G.phase === 'pegging')
      ? G.hand.opp.map(() => backEl('')).join('') : '';

    // play area
    $('starter').innerHTML = G.starter
      ? '<div>STARTER</div>' + cardEl(G.starter, 'sm start') : '<div>' + (G.dealer === 'you' ? 'YOUR DEAL' : P().name.toUpperCase() + '\'S DEAL') + '</div>';
    const shown = G.stack.length ? G.stack : G.shownOld || [];
    $('stack').innerHTML = shown.map((c) => cardEl(c, 'sm' + (G.stack.length ? '' : ' dim'))).join('');
    $('count').innerHTML = G.count + '<small>COUNT</small>';

    renderMyHand();
    renderPanel();
    renderActions();
  }

  function legal(c) { return G.phase === 'pegging' && G.turn === 'you' && !AUTO && G.count + C.val(c) <= 31; }

  function renderMyHand() {
    const hand = G.hand.you.slice().sort((a, b) => a.r - b.r || a.s - b.s);
    $('myHand').innerHTML = hand.map((c) => {
      if (G.phase === 'discard') return cardEl(c, G.sel.has(c.id) ? 'sel' : '', 'data-id="' + c.id + '"');
      if (G.phase === 'pegging') return cardEl(c, legal(c) ? '' : 'dim', 'data-id="' + c.id + '"');
      return cardEl(c, '');
    }).join('');
    if (G.phase === 'show') $('myHand').innerHTML = '';
  }

  function itemsHTML(res) {
    if (!res.items.length) return '<div class="muted" style="margin-top:6px">Nineteen — nothing to count.</div>';
    return '<div class="items">' + res.items.map((i) =>
      '<div>' + i.label + (i.cards ? ' <span class="muted">' + i.cards.map(C.label).join(' ') + '</span>' : '') + '</div><div class="p">+' + i.pts + '</div>').join('') + '</div>';
  }

  function renderPanel() {
    const el = $('panel');
    if (G.phase === 'discard' && settings.coach && G.coach) {
      const b = G.coach[0];
      const dealerNote = G.dealer === 'you' ? 'It feeds your crib, so a good pair there is a bonus.' : 'It feeds ' + P().name + '\'s crib, so keep gifts like fives and pairs out.';
      el.hidden = false;
      el.innerHTML = '<div id="coach"><b>Coach:</b> toss ' + b.disc.map(C.label).join(' ') + ', keep ' + b.keep.map(C.label).join(' ') +
        ' (about ' + b.hEV.toFixed(1) + ' pts in hand). ' + dealerNote + '</div>';
    } else if (G.phase === 'show' && G.step) {
      const s = G.step;
      el.hidden = false;
      el.innerHTML = '<div class="who">' + s.title + '</div>' +
        '<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap">' + s.cards.map((c) => cardEl(c, 'sm')).join('') +
        '<span style="width:6px"></span>' + cardEl(G.starter, 'sm start') + '</div>' +
        itemsHTML(s.res) + '<div class="tot">' + s.res.total + (s.res.total === 1 ? ' point' : ' points') + '</div>';
    } else { el.hidden = true; el.innerHTML = ''; }
  }

  function renderActions() {
    const a = $('actions');
    a.innerHTML = '';
    if (G.phase === 'discard' && !AUTO) {
      a.innerHTML = (settings.coach ? '<button class="btn" id="useCoach">Use coach pick</button>' : '') +
        '<button class="btn gold" id="doDiscard"' + (G.sel.size === 2 ? '' : ' disabled') + '>Send to ' + (G.dealer === 'you' ? 'your' : 'the') + ' crib (' + G.sel.size + '/2)</button>';
    } else if (G.phase === 'show' && G.step && !G.winner) {
      a.innerHTML = '<button class="btn gold" id="nextStep">' + (G.stepIdx >= 2 ? 'Next hand' : 'Continue') + '</button>';
    }
  }

  /* ---------- game flow ---------- */
  const SAVE_KEY = 'crib-save';
  function startGame(pid, saved) {
    clearTimeout(timer);
    $('splash').hidden = true; $('table').hidden = false; $('overlay').hidden = true;
    G = {
      pid, score: { you: 0, opp: 0 }, back: { you: 0, opp: 0 }, dealer: Math.random() < 0.5 ? 'you' : 'opp',
      hand: { you: [], opp: [] }, keep: {}, crib: [], starter: null, deck: [], phase: 'discard', sel: new Set(),
      count: 0, stack: [], shownOld: null, turn: 'you', lastPlayer: null, winner: null, log: [], hands: 0, step: null, stepIdx: 0, coach: null
    };
    if (saved) {
      G.score = saved.score; G.back = saved.back; G.dealer = saved.dealer; G.hands = Math.max(0, saved.hands - 1);
    }
    buildBoard(); movePegs();
    banter('start', 'The game is starting. Greet the player.', true);
    newHand();
  }

  function newHand() {
    if (G.winner) return;
    const d = C.shuffle(C.deck());
    G.hand = { you: d.splice(0, 6), opp: d.splice(0, 6) };
    G.deck = d; G.crib = []; G.starter = null; G.phase = 'discard'; G.sel = new Set();
    G.count = 0; G.stack = []; G.shownOld = null; G.lastPlayer = null; G.step = null; G.stepIdx = 0; G.hands++;
    // opponent discards immediately
    const pr = P();
    const res = C.chooseDiscard(G.hand.opp, G.dealer === 'opp', { cribWeight: pr.cribWeight, noise: pr.noise });
    G.crib.push(...res[0].disc); G.hand.opp = res[0].keep;
    G.coach = settings.coach ? C.chooseDiscard(G.hand.you, G.dealer === 'you', {}) : null;
    if (!AUTO) LS.set(SAVE_KEY, { pid: G.pid, score: G.score, back: G.back, dealer: G.dealer, hands: G.hands });
    setStatus(G.dealer === 'you' ? 'Your deal. Choose two cards for your crib.' : P().name + ' deals. Choose two cards for his crib.');
    render();
    if (AUTO) {
      const r = C.chooseDiscard(G.hand.you, G.dealer === 'you', {});
      G.crib.push(...r[0].disc); G.hand.you = r[0].keep;
      later(cutStarter, 50);
    }
  }

  function confirmDiscard() {
    if (G.sel.size !== 2) return;
    const disc = G.hand.you.filter((c) => G.sel.has(c.id));
    G.hand.you = G.hand.you.filter((c) => !G.sel.has(c.id));
    G.crib.push(...disc);
    G.sel = new Set();
    render();
    cutStarter();
  }

  function cutStarter() {
    G.starter = G.deck.splice(Math.floor(Math.random() * G.deck.length), 1)[0];
    G.keep = { you: G.hand.you.slice(), opp: G.hand.opp.slice() };
    G.phase = 'pegging';
    G.turn = other(G.dealer);
    G.count = 0; G.stack = []; G.lastPlayer = null;
    if (G.starter.r === 11) { peg(G.dealer, 2, 'His heels'); setStatus((G.dealer === 'you' ? 'You' : P().name) + ' scored 2 for his heels.'); }
    else setStatus('Starter: ' + C.label(G.starter) + '. ' + (G.turn === 'you' ? 'Your lead.' : P().name + ' leads.'));
    render();
    if (G.winner) return;
    later(pegTurn, 900);
  }

  function hasPlay(who) { return G.hand[who].some((c) => G.count + C.val(c) <= 31); }

  function pegTurn() {
    if (G.winner || G.phase !== 'pegging') return;
    if (!G.hand.you.length && !G.hand.opp.length) return finishPegging();
    const cur = G.turn;
    if (hasPlay(cur)) {
      if (cur === 'opp' || AUTO) {
        const pr = cur === 'opp' ? P() : { slip: 0 };
        const card = C.choosePeg(G.hand[cur], G.stack, G.count, { slip: pr.slip });
        setStatus((cur === 'opp' ? P().name : 'You') + ' thinks…');
        later(() => doPlay(cur, card), 650);
      } else {
        setStatus('Your play. Count is ' + G.count + '.');
        render();
      }
      return;
    }
    // current player cannot play
    const o = other(cur);
    if (hasPlay(o)) {
      if (G.hand[cur].length) {
        setStatus((cur === 'opp' ? P().name : 'You') + ' says Go.');
        if (cur === 'opp') banter('oppGo', P().name + ' cannot play a card and says go.');
      }
      G.turn = o; render(); later(pegTurn, 800);
    } else {
      // nobody can play: go point, reset
      if (G.lastPlayer && G.count !== 31) { peg(G.lastPlayer, 1, 'Go'); setStatus((G.lastPlayer === 'you' ? 'You' : P().name) + ' scores 1 for go.'); }
      if (G.winner) return render();
      G.shownOld = G.stack.slice(); G.stack = []; G.count = 0;
      let next = other(G.lastPlayer || cur);
      if (!G.hand[next].length) next = other(next);
      G.lastPlayer = null; G.turn = next;
      render();
      if (!G.hand.you.length && !G.hand.opp.length) return later(finishPegging, 700);
      later(pegTurn, 900);
    }
  }

  function doPlay(who, card) {
    if (G.winner || G.phase !== 'pegging' || !card || G.turn !== who) return;
    G.hand[who] = G.hand[who].filter((c) => c.id !== card.id);
    G.shownOld = null;
    G.stack.push(card); G.count += C.val(card); G.lastPlayer = who;
    const ps = C.pegScore(G.stack);
    if (ps.total) {
      peg(who, ps.total, ps.items.map((i) => i.label).join(', '));
      setStatus((who === 'you' ? 'You' : P().name) + ' scores ' + ps.total + ': ' + ps.items.map((i) => i.label).join(', ') + '.');
      if (who === 'opp' && ps.total >= 4) banter('oppBig', P().name + ' just scored ' + ps.total + ' points pegging.');
      if (who === 'you' && ps.total >= 4) banter('youBig', 'The player just scored a big pegging play.');
    }
    if (G.winner) return render();
    const bothEmpty = !G.hand.you.length && !G.hand.opp.length;
    if (bothEmpty && G.count !== 31) { peg(who, 1, 'Last card'); setStatus((who === 'you' ? 'You' : P().name) + ' scores 1 for last card.'); }
    if (G.winner) return render();
    if (G.count === 31) { G.shownOld = G.stack.slice(); G.stack = []; G.count = 0; G.lastPlayer = null; }
    G.turn = other(who);
    render();
    if (bothEmpty) return later(finishPegging, 900);
    later(pegTurn, 700);
  }

  function finishPegging() {
    if (G.winner) return;
    G.phase = 'show'; G.stack = []; G.shownOld = null; G.count = 0;
    G.stepIdx = -1;
    nextStep();
  }

  function nextStep() {
    if (G.winner) return;
    G.stepIdx++;
    if (G.stepIdx > 2) { G.dealer = other(G.dealer); return newHand(); }
    const nd = other(G.dealer);
    const order = [
      { who: nd, cards: G.keep[nd], crib: false, name: nd === 'you' ? 'Your hand' : P().name + '\'s hand' },
      { who: G.dealer, cards: G.keep[G.dealer], crib: false, name: G.dealer === 'you' ? 'Your hand' : P().name + '\'s hand' },
      { who: G.dealer, cards: G.crib, crib: true, name: G.dealer === 'you' ? 'Your crib' : P().name + '\'s crib' }
    ];
    const s = order[G.stepIdx];
    const res = C.scoreHand(s.cards, G.starter, s.crib);
    G.step = { title: s.name, cards: s.cards, res };
    peg(s.who, res.total, s.name);
    setStatus(s.name + ': ' + res.total + '.');
    render();
    if (res.total >= 8 && !G.winner) {
      if (s.who === 'opp') banter('oppBig', P().name + ' counted a strong hand worth ' + res.total + '.', true);
      else banter('youBig', 'The player counted a strong hand.', true);
    }
    if (AUTO && !G.winner) later(nextStep, 40);
  }

  function endGame() {
    if (!G || !G.winner) return;
    G.phase = 'over';
    const youWon = G.winner === 'you';
    const loserScore = G.score[other(G.winner)];
    const skunk = loserScore <= 90;
    const r = record[G.pid];
    if (youWon) r.w++; else r.l++;
    saveRecord();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    G.result = { youWon, skunk };
    render();
    if (AUTO) { document.body.dataset.done = JSON.stringify({ winner: G.winner, score: G.score, hands: G.hands, skunk }); return; }
    const pr = P();
    const evt = skunk ? 'skunk' : youWon ? 'lose' : 'win';
    banter(evt, youWon ? 'The player won the game.' : pr.name + ' won the game.', true);
    $('overlay').hidden = false;
    $('overlay').innerHTML = '<div class="modal"><h2>' + (youWon ? 'Check, please' : 'The house takes it') + '</h2>' +
      '<div class="muted" style="font-family:var(--serif);font-style:italic">' + (youWon ? pr.name + ' settles the check.' : 'You settle the check.') + '</div>' +
      (skunk ? '<div style="color:#e07a86;font-family:var(--serif);font-style:italic;margin-top:8px">Skunked.</div>' : '') +
      '<hr class="rule"><div class="muted" style="font-size:12px;margin-bottom:12px">You ' + G.score.you + ' · ' + pr.name + ' ' + G.score.opp + '<br>House record vs ' + pr.name + ': ' + r.w + '–' + r.l + '</div>' +
      '<div style="display:flex;gap:8px"><button class="btn" id="toMenu">Menu</button><button class="btn gold" id="again" style="flex:2">Play again</button></div></div>';
  }

  /* ---------- UI wiring ---------- */
  function buildSeats() {
    const sv = LS.get(SAVE_KEY, null);
    const resume = sv && PERSONAS[sv.pid]
      ? '<button class="btn gold" id="resume" style="width:100%;margin:6px 0 4px">Resume vs ' + PERSONAS[sv.pid].name + ' · ' + sv.score.you + '–' + sv.score.opp + '</button>'
      : '';
    $('seats').innerHTML = resume + Object.values(PERSONAS).map((p) => {
      const r = record[p.id];
      return '<button class="seat" data-p="' + p.id + '"><div class="t">' + p.title + '</div><div class="n">' + p.name + '</div><div class="b">' + p.blurb +
        '</div><div class="rec">HOUSE RECORD ' + r.w + '–' + r.l + '</div></button>';
    }).join('');
  }

  function settingsModal() {
    const o = $('overlay');
    o.hidden = false;
    o.innerHTML = '<div class="modal"><h2>The House Rules</h2>' +
      '<div class="setrow"><div>Coach<small>Suggests the best two cards to throw to the crib.</small></div><button class="tog ' + (settings.coach ? 'on' : '') + '" id="tCoach" aria-label="Coach"><i></i></button></div>' +
      '<div class="setrow"><div>Live banter (beta)<small>Tiny on-device model rewrites the table talk. One-time ~250 MB download. Needs WebGPU. Nothing leaves your device.</small></div><button class="tog ' + (settings.lm ? 'on' : '') + '" id="tLM" aria-label="Live banter"><i></i></button></div>' +
      '<div style="margin-top:14px"><button class="btn gold" id="closeSet" style="width:100%">Done</button></div></div>';
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button,.seat');
    if (!t) return;
    if (t.classList.contains('seat')) return startGame(t.dataset.p);
    if (t.id === 'home' || t.id === 'toMenu') { clearTimeout(timer); G = null; $('overlay').hidden = true; $('table').hidden = true; $('splash').hidden = false; buildSeats(); return; }
    if (t.id === 'gear') return settingsModal();
    if (t.id === 'resume') { const sv = LS.get(SAVE_KEY, null); if (sv && PERSONAS[sv.pid]) startGame(sv.pid, sv); return; }
    if (t.id === 'closeSet') { $('overlay').hidden = true; if (G) { G.coach = settings.coach && G.phase === 'discard' ? C.chooseDiscard(G.hand.you, G.dealer === 'you', {}) : G.coach; render(); } return; }
    if (t.id === 'tCoach') { settings.coach = !settings.coach; saveSettings(); return settingsModal(); }
    if (t.id === 'tLM') { settings.lm = !settings.lm; saveSettings(); if (settings.lm) loadLM(); settingsModal(); return; }
    if (t.id === 'again') { $('overlay').hidden = true; return startGame(G.pid); }
    if (!G) return;
    if (t.id === 'doDiscard') return confirmDiscard();
    if (t.id === 'useCoach') { if (G.coach) { G.sel = new Set(G.coach[0].disc.map((c) => c.id)); render(); } return; }
    if (t.id === 'nextStep') return nextStep();
    const id = t.dataset && t.dataset.id;
    if (!id) return;
    const card = G.hand.you.find((c) => c.id === id);
    if (!card) return;
    if (G.phase === 'discard') {
      if (G.sel.has(id)) G.sel.delete(id); else if (G.sel.size < 2) G.sel.add(id);
      render();
    } else if (G.phase === 'pegging' && legal(card)) {
      doPlay('you', card);
    }
  });

  buildSeats();
  if (settings.lm) loadLM();
  if (qs.get('p') && PERSONAS[qs.get('p')]) startGame(qs.get('p'));
  window.__crib = { get G() { return G; } }; // test hook
})();
