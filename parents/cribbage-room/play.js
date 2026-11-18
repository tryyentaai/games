/* The Cribbage Room — play against the house. */
(function () {
  const C = window.CRIB, U = window.UI, $ = U.$;
  const qs = new URLSearchParams(location.search);
  const AUTO = qs.get('auto') === '1';                       // both seats played by the AI (tests)
  const SPEED = qs.has('speed') ? parseFloat(qs.get('speed')) : 1;
  const wait = (ms) => (SPEED === 0 ? 0 : ms * SPEED);
  const S = U.settings;

  /* ---------- the house ---------- */
  const PERSONAS = {
    walt: {
      id: 'walt', name: 'Walt', level: 'Easy', color: '#5d7a5a', title: 'Grandpa',
      blurb: 'Patient and kind. He talks you through it and slips now and then.',
      voice: 'a warm, patient grandfather who taught the grandkids cribbage',
      cribWeight: 0.85, noise: 0.45, slip: 0.14, peg: 'easy',
      lines: {
        start: ['Take your time, there\'s no rush at this table.', 'Good luck, son. Deal \'em out.', 'Cribbage is better with company.'],
        oppBig: ['Well, how about that.', 'The old man still has it.', 'Fifteen two, fifteen four, and I\'m still counting.'],
        youBig: ['Nicely done. You\'re learning fast.', 'Now that\'s a fine hand.', 'You\'ve been practicing, I can tell.'],
        oppGo: ['Go, I\'m afraid.', 'Nothing I can play. Over to you.'],
        muggins: ['You left a few on the table, son. I\'ll take those.', 'Muggins. Count slow, it\'s not a race.'],
        win: ['Good game. Let me buy you pie.', 'That\'s the way it goes. Rematch?'],
        lose: ['Well played. You\'ve got a knack for this.', 'You earned that one, no question.'],
        skunk: ['Oh dear, that\'s a skunk. We\'ll call it a lesson.', 'Skunk. We don\'t talk about this one.']
      }
    },
    sal: {
      id: 'sal', name: 'Sal', level: 'Medium', color: '#8c2232', title: 'The regular',
      blurb: 'Table four since 1987. Plays his crib hard and talks harder.',
      voice: 'a gruff, wisecracking New York steakhouse regular who loves cribbage',
      cribWeight: 1.1, noise: 0.1, slip: 0.03, peg: 'normal',
      lines: {
        start: ['Deal them. Check is on the loser, you know the rule.', 'Sit down, kid. Table four doesn\'t stay empty.', 'Cut the deck and cut the chatter.'],
        oppBig: ['That\'s how it\'s done, pal.', 'Write that one on the tab.', 'I could do that in my sleep.'],
        youBig: ['Lucky cards. Luck doesn\'t last.', 'Okay, okay. Don\'t let it go to your head.', 'Hmph. Beginner\'s luck.'],
        oppGo: ['Go. Your move, hotshot.', 'Can\'t play. Go on.'],
        muggins: ['Muggins! Those are mine now.', 'You counted short. Thanks for the points.'],
        win: ['Pull out the wallet. Dinner\'s on you.', 'Another one for the house. Bring the check.'],
        lose: ['Fine. You got me. Dessert is on me.', 'Lucky. Run it back.'],
        skunk: ['Skunked! Somebody call the kitchen, he\'s buying.', 'Skunk! Don\'t show your face before ninety.']
      }
    },
    vinnie: {
      id: 'vinnie', name: 'Vinnie', level: 'Hard', color: '#2f3f5c', title: 'The shark',
      blurb: 'Quiet, counts every card and reads your pegging. Bring your best.',
      voice: 'a cool, quiet card shark who never wastes words',
      cribWeight: 1.05, noise: 0, slip: 0, peg: 'hard',
      lines: {
        start: ['Cut.', 'Let\'s see what you\'ve got.', 'Your deal or mine, doesn\'t matter.'],
        oppBig: ['Mm.', 'As expected.', 'Count \'em and weep.'],
        youBig: ['Not bad.', 'Enjoy it.', 'You\'ll need more than that.'],
        oppGo: ['Go.', 'Pass.'],
        muggins: ['Muggins.', 'You missed some. I didn\'t.'],
        win: ['Good game. Check\'s on you.', 'That\'s the job.'],
        lose: ['Well played. Rematch.', 'Respect.'],
        skunk: ['Skunk.', 'That one\'s going on the wall.']
      }
    }
  };
  const record = Object.assign({ walt: { w: 0, l: 0 }, sal: { w: 0, l: 0 }, vinnie: { w: 0, l: 0 } }, U.LS.get('crib-record', {}));
  const SAVE_KEY = 'crib-save';

  /* ---------- state ---------- */
  let G = null, timer = null;
  const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(fn, wait(ms)); };
  const other = (w) => (w === 'you' ? 'opp' : 'you');
  const P = () => PERSONAS[G.pid];
  const nameOf = (w) => (w === 'you' ? 'You' : P().name);
  let board = null;

  /* ---------- table talk ---------- */
  const LM = { state: 'off', pipe: null };
  async function loadLM() {
    if (LM.state === 'loading' || LM.state === 'ready') return;
    if (!navigator.gpu) { LM.state = 'fail'; S.lm = false; U.saveSettings(); setStatus('Live banter needs WebGPU, which this browser lacks.'); return; }
    LM.state = 'loading';
    setStatus('Downloading live banter (one time, about 250 MB)…');
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm');
      LM.pipe = await mod.pipeline('text-generation', 'onnx-community/SmolLM2-360M-Instruct', { device: 'webgpu', dtype: 'q4' });
      LM.state = 'ready'; setStatus('Live banter is on.');
    } catch (e) { LM.state = 'fail'; S.lm = false; U.saveSettings(); setStatus('Live banter could not load here. Using house lines.'); }
  }
  async function lmLine(p, desc) {
    const run = LM.pipe([
      { role: 'system', content: 'You are ' + p.name + ', ' + p.voice + '. Reply with ONE short in-character line, at most 16 words. No numbers, no emojis, no quotes.' },
      { role: 'user', content: desc }
    ], { max_new_tokens: 36, do_sample: true, temperature: 0.8 });
    const out = await Promise.race([run, new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
    const g = out[0].generated_text;
    let t = (Array.isArray(g) ? g[g.length - 1].content : String(g)) || '';
    t = t.split('\n')[0].replace(/["“”]/g, '').trim();
    if (!t || t.length > 120 || /\d/.test(t)) throw new Error('bad');
    return t;
  }
  let lastSay = 0, talkTimer = null;
  function say(text) {
    $('talkWho').textContent = P().name;
    $('talkText').textContent = text;
    const el = $('talk'); el.classList.add('on');
    clearTimeout(talkTimer); talkTimer = setTimeout(() => el.classList.remove('on'), 5200);
  }
  async function banter(event, desc, force) {
    const p = P(), now = Date.now();
    if (!force && now - lastSay < 2500) return;
    lastSay = now;
    const pool = p.lines[event]; if (!pool) return;
    say(pool[Math.floor(Math.random() * pool.length)]);
    if (S.lm && LM.state === 'ready' && desc) { try { const l = await lmLine(p, desc); if (G && G.pid === p.id) say(l); } catch (e) {} }
  }
  function setStatus(t) { $('status').textContent = t; }

  /* ---------- scoring ---------- */
  function peg(who, pts, reason, source) {
    if (pts <= 0 || G.winner) return;
    G.back[who] = G.score[who];
    G.score[who] = Math.min(121, G.score[who] + pts);
    G.stats[source][who] += pts;
    G.log.push(who + ' +' + pts + ' ' + reason);
    board.set([G.score.you, G.score.opp], [G.back.you, G.back.opp]);
    $('sy').textContent = G.score.you; $('so').textContent = G.score.opp;
    if (!AUTO) {
      U.burst('+' + pts, reason, who, $(who === 'you' ? 'sy' : 'so'));
      (pts >= 6 ? U.SFX.big : U.SFX.peg)();
      if (who === 'you') U.buzz(pts >= 6 ? [20, 40, 20] : 15);
    }
    if (G.score[who] >= 121) { G.winner = who; later(endGame, 900); }
  }

  /* ---------- rendering ---------- */
  function render() {
    if (!G) return;
    const p = P();
    $('vsLine').textContent = 'You vs ' + p.name;
    $('oname').textContent = p.name;
    $('sy').textContent = G.score.you; $('so').textContent = G.score.opp;

    const oh = G.hand.opp;
    $('oppHand').innerHTML = (G.phase === 'discard' || G.phase === 'pegging')
      ? oh.map((_, i) => U.backHTML({ cls: G.dealt ? 'deal' : '', style: '--i:' + (i * 2 + 1) })).join('') : '';

    $('deckPile').innerHTML = G.starter ? U.cardHTML(G.starter, { cls: G.cutFresh ? 'flip' : '' }) : U.backHTML();
    $('starterCap').textContent = G.starter ? 'Cut card' : (G.dealer === 'you' ? 'Your crib' : p.name + '\'s crib');
    const shown = G.stack.length ? G.stack : (G.oldStack || []);
    $('stack').className = 'stack' + (G.stack.length ? '' : ' old');
    $('stack').innerHTML = shown.map((c) => U.cardHTML(c)).join('');
    $('countN').textContent = G.count;
    $('count').classList.toggle('hot', G.count >= 21);
    $('mat').hidden = G.phase === 'show';

    renderHand();
    renderActions();
    G.dealt = false; G.cutFresh = false;
  }

  function legal(c) { return G.phase === 'pegging' && G.turn === 'you' && !AUTO && G.count + C.val(c) <= 31; }

  function renderHand() {
    const el = $('myHand');
    if (G.phase === 'show' || G.phase === 'over') { el.innerHTML = ''; return; }
    const hand = G.hand.you.slice().sort((a, b) => a.r - b.r || a.s - b.s), n = hand.length;
    el.innerHTML = hand.map((c, i) => {
      const rot = (i - (n - 1) / 2) * 5;
      let cls = G.dealt ? 'deal' : '', hint = '';
      if (G.phase === 'discard' && G.sel.has(c.id)) cls += ' sel';
      if (G.phase === 'pegging') {
        if (!legal(c)) cls += ' dim';
        else if (S.hints) { const pts = C.pegScore(G.stack.concat([c])).total; if (pts) hint = '+' + pts; }
      }
      return U.cardHTML(c, { button: true, cls, hint, style: '--rot:' + rot + 'deg;--i:' + i * 2 });
    }).join('');
  }

  function renderActions() {
    const a = $('actions');
    let h = '';
    if (G.phase === 'discard' && !AUTO) {
      if (S.coach && G.coach) {
        const b = G.coach[0];
        h += '<div class="coach" style="flex:1 1 100%">Coach: throw <b>' + b.disc.map(C.label).join(' ') + '</b>, keep ' + b.keep.map(C.label).join(' ') +
          '. That hand averages <b>' + b.hEV.toFixed(1) + '</b> points' + (G.dealer === 'you' ? ', and the throw helps your crib.' : ' and gives ' + P().name + '\'s crib little.') + '</div>';
      }
      h = '<div style="display:flex;flex-direction:column;gap:8px;width:100%">' + h + '<div style="display:flex;gap:8px">' +
        (S.coach ? '<button class="btn" id="useCoach">Take the tip</button>' : '') +
        '<button class="btn gold" id="doDiscard" style="flex:1"' + (G.sel.size === 2 ? '' : ' disabled') + '>' +
        (G.sel.size === 2 ? 'Throw to ' + (G.dealer === 'you' ? 'your' : P().name + '\'s') + ' crib' : 'Pick ' + (2 - G.sel.size) + ' for the crib') + '</button></div></div>';
    }
    a.innerHTML = h;
  }

  /* ---------- flow ---------- */
  function freshState(pid) {
    return {
      pid, score: { you: 0, opp: 0 }, back: { you: 0, opp: 0 }, dealer: Math.random() < 0.5 ? 'you' : 'opp',
      hand: { you: [], opp: [] }, keep: {}, crib: [], starter: null, deck: [], phase: 'discard', sel: new Set(),
      count: 0, stack: [], oldStack: null, played: [], turn: 'you', lastPlayer: null, winner: null, log: [], hands: 0,
      stepIdx: 0, coach: null, dealt: false, cutFresh: false,
      stats: { peg: { you: 0, opp: 0 }, hand: { you: 0, opp: 0 }, crib: { you: 0, opp: 0 } },
      best: { you: null, opp: null }
    };
  }

  function startGame(pid, saved) {
    clearTimeout(timer);
    U.go('table');
    G = freshState(pid);
    if (saved) Object.assign(G, { score: saved.score, back: saved.back, dealer: saved.dealer, hands: Math.max(0, saved.hands - 1), stats: saved.stats || G.stats, best: saved.best || G.best });
    board = U.createBoard($('board'));
    board.set([G.score.you, G.score.opp], [G.back.you, G.back.opp]);
    $('show') && $('show').remove();
    banter('start', 'The game is starting. Greet the player.', true);
    newHand();
  }

  function newHand() {
    if (G.winner) return;
    const d = C.shuffle(C.deck());
    Object.assign(G, {
      hand: { you: d.splice(0, 6), opp: d.splice(0, 6) }, deck: d, crib: [], starter: null, phase: 'discard', sel: new Set(),
      count: 0, stack: [], oldStack: null, played: [], lastPlayer: null, stepIdx: 0, dealt: true
    });
    G.hands++;
    removeShow();
    const pr = P();
    const res = C.chooseDiscard(G.hand.opp, G.dealer === 'opp', { cribWeight: pr.cribWeight, noise: pr.noise });
    G.crib.push(...res[0].disc); G.hand.opp = res[0].keep;
    G.coach = S.coach ? C.chooseDiscard(G.hand.you, G.dealer === 'you', {}) : null;
    setStatus(G.dealer === 'you' ? 'Your deal. Pick two cards for your crib.' : pr.name + ' deals. Pick two cards for his crib.');
    if (!AUTO) { U.LS.set(SAVE_KEY, { pid: G.pid, score: G.score, back: G.back, dealer: G.dealer, hands: G.hands, stats: G.stats, best: G.best }); U.SFX.card(); }
    render();
    if (AUTO) {
      const r = C.chooseDiscard(G.hand.you, G.dealer === 'you', {});
      G.crib.push(...r[0].disc); G.hand.you = r[0].keep;
      later(cutStarter, 30);
    }
  }

  function confirmDiscard() {
    if (G.sel.size !== 2) return;
    const disc = G.hand.you.filter((c) => G.sel.has(c.id));
    G.hand.you = G.hand.you.filter((c) => !G.sel.has(c.id));
    G.crib.push(...disc); G.sel = new Set();
    U.SFX.card();
    render();
    later(cutStarter, 350);
  }

  function cutStarter() {
    G.starter = G.deck.splice(Math.floor(Math.random() * G.deck.length), 1)[0];
    G.cutFresh = true;
    G.keep = { you: G.hand.you.slice(), opp: G.hand.opp.slice() };
    G.phase = 'pegging'; G.turn = other(G.dealer);
    G.count = 0; G.stack = []; G.lastPlayer = null;
    if (!AUTO) U.SFX.card();
    render();
    if (G.starter.r === 11) { peg(G.dealer, 2, 'His heels', 'peg'); setStatus(nameOf(G.dealer) + ' cut a jack: two for his heels.'); }
    else setStatus('Cut card ' + C.label(G.starter) + '. ' + (G.turn === 'you' ? 'Your lead.' : P().name + ' leads.'));
    if (G.winner) return;
    later(pegTurn, 900);
  }

  const hasPlay = (who) => G.hand[who].some((c) => G.count + C.val(c) <= 31);

  function pegTurn() {
    if (!G || G.winner || G.phase !== 'pegging') return;
    if (!G.hand.you.length && !G.hand.opp.length) return finishPegging();
    const cur = G.turn;
    if (hasPlay(cur)) {
      if (cur === 'opp' || AUTO) {
        const pr = cur === 'opp' ? P() : { slip: 0, peg: 'normal' };
        const card = C.choosePeg(G.hand[cur], G.stack, G.count, { slip: pr.slip, level: pr.peg, seen: G.played.concat(G.starter ? [G.starter] : []) });
        if (cur === 'opp') setStatus(P().name + ' is thinking…');
        later(() => doPlay(cur, card), cur === 'opp' ? 700 : 40);
      } else {
        setStatus('Your play. The count is ' + G.count + '.');
        render();
      }
      return;
    }
    const o = other(cur);
    if (hasPlay(o)) {
      if (G.hand[cur].length) {
        setStatus(nameOf(cur) + (cur === 'you' ? ' say go.' : ' says go.'));
        if (cur === 'opp') banter('oppGo', P().name + ' cannot play and says go.');
      }
      G.turn = o; render(); later(pegTurn, 800);
    } else {
      if (G.lastPlayer && G.count !== 31) { peg(G.lastPlayer, 1, 'Go', 'peg'); setStatus(nameOf(G.lastPlayer) + ' score' + (G.lastPlayer === 'you' ? '' : 's') + ' one for the go.'); }
      if (G.winner) return render();
      G.oldStack = G.stack.slice(); G.stack = []; G.count = 0;
      let next = other(G.lastPlayer || cur);
      if (!G.hand[next].length) next = other(next);
      G.lastPlayer = null; G.turn = next;
      render();
      if (!G.hand.you.length && !G.hand.opp.length) return later(finishPegging, 700);
      later(pegTurn, 900);
    }
  }

  function doPlay(who, card, fromRect) {
    if (!G || G.winner || G.phase !== 'pegging' || !card || G.turn !== who) return;
    if (!fromRect && who === 'opp') { const o = $('oppHand').lastElementChild; fromRect = o && o.getBoundingClientRect(); }
    G.hand[who] = G.hand[who].filter((c) => c.id !== card.id);
    G.oldStack = null; G.played.push(card);
    G.stack.push(card); G.count += C.val(card); G.lastPlayer = who;
    if (!AUTO) U.SFX.card();
    const ps = C.pegScore(G.stack);
    const bothEmpty = !G.hand.you.length && !G.hand.opp.length;
    const reset = G.count === 31;
    G.turn = other(who);
    render();
    U.flyFrom(fromRect, $('stack').lastElementChild);
    if (ps.total) {
      const why = ps.items.map((i) => i.label).join(' + ');
      peg(who, ps.total, why, 'peg');
      setStatus(nameOf(who) + ' peg' + (who === 'you' ? '' : 's') + ' ' + ps.total + ' for ' + why.toLowerCase() + '.');
      if (ps.total >= 4) banter(who === 'opp' ? 'oppBig' : 'youBig', (who === 'opp' ? P().name + ' just' : 'The player just') + ' pegged ' + ps.total + ' points.');
    }
    if (G.winner) return;
    if (bothEmpty && !reset) { peg(who, 1, 'Last card', 'peg'); if (!ps.total) setStatus(nameOf(who) + ' score' + (who === 'you' ? '' : 's') + ' one for last card.'); }
    if (G.winner) return;
    if (reset) { later(() => { G.oldStack = G.stack.slice(); G.stack = []; G.count = 0; G.lastPlayer = null; render(); later(bothEmpty ? finishPegging : pegTurn, 500); }, 600); return; }
    later(bothEmpty ? finishPegging : pegTurn, bothEmpty ? 900 : 650);
  }

  /* ---------- the show (counting hands) ---------- */
  function removeShow() { const s = document.getElementById('show'); if (s) s.remove(); }

  function finishPegging() {
    if (G.winner) return;
    G.phase = 'show'; G.stack = []; G.oldStack = null; G.count = 0; G.stepIdx = -1;
    render();
    nextStep();
  }

  function showOrder() {
    const nd = other(G.dealer), whose = (w, what) => (w === 'you' ? 'Your ' : P().name + '\'s ') + what;
    return [
      { who: nd, cards: G.keep[nd], crib: false, title: whose(nd, 'hand') },
      { who: G.dealer, cards: G.keep[G.dealer], crib: false, title: whose(G.dealer, 'hand') },
      { who: G.dealer, cards: G.crib, crib: true, title: whose(G.dealer, 'crib') }
    ];
  }

  function nextStep() {
    if (G.winner) return;
    G.stepIdx++;
    if (G.stepIdx > 2) { G.dealer = other(G.dealer); return newHand(); }
    const s = showOrder()[G.stepIdx];
    const res = C.scoreHand(s.cards, G.starter, s.crib);
    s.res = res;
    removeShow();
    const box = document.createElement('div');
    box.id = 'show'; box.className = 'show';
    box.innerHTML = '<div class="show-h"><span class="show-t">' + U.esc(s.title) + '</span><span class="show-total" id="showTotal">0</span></div>' +
      '<div class="show-cards">' + s.cards.map((c, i) => U.cardHTML(c, { cls: 'flip', style: '--i:' + i }).replace('class="card', 'data-cid="' + c.id + '" class="card')).join('') +
      '<span class="gap"></span>' + U.cardHTML(G.starter).replace('class="card', 'data-cid="' + G.starter.id + '" class="card') + '</div>' +
      '<div class="narr" id="narr"></div><div id="showAct"></div>';
    $('status').after(box);
    setStatus('');
    if (s.who === 'you' && S.muggins && !AUTO) return askClaim(s);
    playCount(s, null);
  }

  // Muggins: you count your own hand. Anything you miss goes to the house.
  function askClaim(s) {
    const opts = [];
    for (let n = 0; n <= 29; n++) if (![19, 25, 26, 27].includes(n)) opts.push(n);
    $('narr').textContent = 'What\'s it worth? Count it yourself.';
    $('showAct').innerHTML = '<div class="claim">' + opts.map((n) => '<button type="button" data-claim="' + n + '">' + (n === 0 ? '19' : n) + '</button>').join('') + '</div>' +
      '<div class="mat-cap" style="margin-top:6px">A hand worth nothing is called nineteen.</div>';
  }

  function playCount(s, claimed) {
    const res = s.res, narr = $('narr'), tot = $('showTotal'), act = $('showAct');
    act.innerHTML = '';
    narr.innerHTML = '';
    const lines = C.narrate(res);
    let i = 0, running = 0;
    const lit = (cards) => {
      document.querySelectorAll('#show .card').forEach((el) => el.classList.remove('lit'));
      (cards || []).forEach((c) => { const el = document.querySelector('#show [data-cid="' + c.id + '"]'); if (el) el.classList.add('lit'); });
    };
    const step = () => {
      if (!G || !document.getElementById('show')) return;
      if (i < res.items.length) {
        const it = res.items[i];
        running += it.pts;
        lit(it.cards);
        const span = document.createElement('span');
        const txt = lines[i];
        span.textContent = (i === 0 ? txt.charAt(0).toUpperCase() + txt.slice(1) : txt) + (i < res.items.length - 1 ? ', ' : '.');
        narr.appendChild(span);
        tot.textContent = running;
        if (!AUTO) U.SFX.tick();
        i++;
        later(step, 520);
        return;
      }
      lit([]);
      if (!res.items.length) narr.textContent = 'Nineteen. Nothing to count.';
      finishCount(s, claimed);
    };
    later(step, AUTO ? 0 : 650);
  }

  function finishCount(s, claimed) {
    const res = s.res, src = s.crib ? 'crib' : 'hand';
    let got = res.total, stolen = 0;
    if (claimed !== null && claimed !== undefined) {
      got = Math.min(claimed, res.total);
      stolen = Math.max(0, res.total - claimed);
    }
    const best = G.best[s.who];
    if (!best || res.total > best.pts) G.best[s.who] = { pts: res.total, label: s.title.replace(/^Your |^\w+'s /, ''), cards: s.cards.concat([G.starter]).map(C.label).join(' ') };
    peg(s.who, got, s.title, src);
    if (stolen && !G.winner) {
      later(() => { peg('opp', stolen, 'Muggins', src); banter('muggins', 'The player under-counted their hand and ' + P().name + ' stole the points.', true); }, 500);
    } else if (res.total >= 10 && !G.winner) {
      banter(s.who === 'opp' ? 'oppBig' : 'youBig', (s.who === 'opp' ? P().name : 'The player') + ' counted a strong hand.', true);
    }
    if (claimed !== null && claimed !== undefined && claimed > res.total) setStatus('You called ' + claimed + ' but it counts ' + res.total + '. You peg ' + res.total + '.');
    else if (stolen) setStatus('You called ' + claimed + '. It was worth ' + res.total + ', so ' + P().name + ' takes ' + stolen + '.');
    if (G.winner) return;
    if (AUTO) return later(nextStep, 20);
    $('showAct').innerHTML = '<button class="btn gold" id="nextStep" style="width:100%;margin-top:10px">' + (G.stepIdx >= 2 ? 'Deal the next hand' : 'Next count') + '</button>';
  }

  /* ---------- end of game ---------- */
  function endGame() {
    if (!G || !G.winner || G.phase === 'over') return;
    G.phase = 'over';
    const youWon = G.winner === 'you', loser = G.score[other(G.winner)], skunk = loser <= 90, doubleSkunk = loser <= 60;
    const r = record[G.pid]; if (youWon) r.w++; else r.l++;
    U.LS.set('crib-record', record); U.LS.del(SAVE_KEY);
    if (AUTO) { document.body.dataset.done = JSON.stringify({ winner: G.winner, score: G.score, hands: G.hands, skunk, stats: G.stats }); return; }
    clearTimeout(timer);
    const p = P();
    banter(skunk ? 'skunk' : youWon ? 'lose' : 'win', youWon ? 'The player won the game.' : p.name + ' won the game.', true);
    (youWon ? U.SFX.big : U.SFX.lose)();
    const st = G.stats, row = (l, k) => '<tr><td>' + l + '</td><td>' + st[k].you + '</td><td>' + st[k].opp + '</td></tr>';
    const bestLine = (w) => { const b = G.best[w]; return b ? b.pts + ' (' + b.cards + ')' : 'none'; };
    $('overlay').dataset.sticky = '1';
    U.modal('<h3>' + (youWon ? 'Check, please' : 'The house wins') + '</h3>' +
      '<div class="sub">' + (youWon ? p.name + ' settles the check.' : 'You settle the check.') +
      (doubleSkunk ? ' Double skunk.' : skunk ? ' Skunked.' : '') + '</div>' +
      '<table class="summary"><tr><th></th><th>You</th><th>' + p.name + '</th></tr>' + row('Pegging', 'peg') + row('Hands', 'hand') + row('Cribs', 'crib') +
      '<tr class="tot"><td>Final</td><td>' + G.score.you + '</td><td>' + G.score.opp + '</td></tr></table>' +
      '<div class="mat-cap" style="font-size:13px;line-height:1.6">Your best count: ' + bestLine('you') + '<br>' + p.name + '\'s best count: ' + bestLine('opp') +
      '<br>Your record against ' + p.name + ': ' + r.w + ' won, ' + r.l + ' lost</div>' +
      '<div class="row" style="margin-top:14px"><button class="btn" id="toHome">Leave the table</button><button class="btn gold" id="again">Rematch</button></div>');
  }

  /* ---------- seats & settings ---------- */
  function buildSeats() {
    $('seats').innerHTML = Object.values(PERSONAS).map((p) => {
      const r = record[p.id];
      return '<button class="seat" data-p="' + p.id + '"><span class="seat-face" style="background:' + p.color + '">' + p.name[0] + '</span><span>' +
        '<span class="seat-n">' + p.name + '<span class="seat-d">' + p.level + '</span></span>' +
        '<span class="seat-b" style="display:block">' + p.title + '. ' + p.blurb + '</span>' +
        '<span class="seat-r" style="display:block">' + (r.w + r.l ? 'You\'re ' + r.w + ' and ' + r.l + ' against him' : 'You haven\'t played him yet') + '</span></span></button>';
    }).join('');
  }
  function refreshResume() {
    const sv = U.LS.get(SAVE_KEY, null), b = $('resume');
    if (sv && PERSONAS[sv.pid]) { b.hidden = false; b.textContent = 'Resume your game with ' + PERSONAS[sv.pid].name + ', ' + sv.score.you + ' to ' + sv.score.opp; }
    else b.hidden = true;
  }
  const tog = (id, on, label, help) => '<div class="setrow"><div>' + label + '<small>' + help + '</small></div><button class="tog" role="switch" id="' + id + '" aria-checked="' + on + '" aria-label="' + label + '"></button></div>';
  function settingsModal() {
    delete $('overlay').dataset.sticky;
    U.modal('<h3>House rules</h3>' +
      tog('tCoach', S.coach, 'Discard coach', 'Suggests the two cards to throw, with the average value of what you keep.') +
      tog('tHints', S.hints, 'Pegging hints', 'Shows the points a card would score before you play it.') +
      tog('tMug', S.muggins, 'Muggins', 'You count your own hand. Points you miss go to the house.') +
      tog('tSound', S.sound, 'Table sounds', 'Card snaps, peg clicks and the count.') +
      tog('tLM', S.lm, 'Live banter (beta)', 'A small model on this device writes new table talk. One-time 250 MB download, needs WebGPU. Nothing leaves your phone.') +
      '<div class="row" style="margin-top:12px"><button class="btn gold" id="closeSet">Done</button></div>');
  }

  /* ---------- input ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.classList.contains('seat')) return startGame(t.dataset.p);
    if (t.id === 'resume') { const sv = U.LS.get(SAVE_KEY, null); if (sv && PERSONAS[sv.pid]) startGame(sv.pid, sv); return; }
    if (t.id === 'gear') return settingsModal();
    if (t.id === 'closeSet') { U.closeModal(); if (G && G.phase === 'discard') { G.coach = S.coach ? C.chooseDiscard(G.hand.you, G.dealer === 'you', {}) : null; render(); } else if (G) render(); return; }
    const map = { tCoach: 'coach', tHints: 'hints', tMug: 'muggins', tSound: 'sound', tLM: 'lm' };
    if (map[t.id]) {
      S[map[t.id]] = !S[map[t.id]]; U.saveSettings(); t.setAttribute('aria-checked', S[map[t.id]]);
      if (t.id === 'tLM' && S.lm) loadLM();
      return;
    }
    if (t.id === 'leave' || t.id === 'toHome') { clearTimeout(timer); G = null; delete $('overlay').dataset.sticky; removeShow(); U.go('home'); return; }
    if (t.id === 'again') { delete $('overlay').dataset.sticky; const pid = G.pid; return startGame(pid); }
    if (!G) return;
    if (t.id === 'doDiscard') return confirmDiscard();
    if (t.id === 'useCoach') { if (G.coach) { G.sel = new Set(G.coach[0].disc.map((c) => c.id)); render(); } return; }
    if (t.id === 'nextStep') return nextStep();
    if (t.dataset.claim !== undefined) { const s = showOrder()[G.stepIdx]; s.res = C.scoreHand(s.cards, G.starter, s.crib); return playCount(s, +t.dataset.claim); }
    const id = t.dataset.id;
    if (!id || !t.closest('#myHand')) return;
    const card = G.hand.you.find((c) => c.id === id);
    if (!card) return;
    if (G.phase === 'discard') {
      if (G.sel.has(id)) G.sel.delete(id); else if (G.sel.size < 2) G.sel.add(id);
      U.SFX.tick(); render();
    } else if (legal(card)) {
      doPlay('you', card, t.getBoundingClientRect());
    }
  });

  U.hooks.pick = buildSeats;
  U.hooks.home = refreshResume;
  const hb = U.createBoard($('homeBoard'));
  setTimeout(() => hb.set([121, 104], [117, 96]), 350);
  refreshResume();
  if (S.lm) loadLM();
  if (qs.get('p') && PERSONAS[qs.get('p')]) startGame(qs.get('p'));
  window.__crib = { get G() { return G; } };
})();
