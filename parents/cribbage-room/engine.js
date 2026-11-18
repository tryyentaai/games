/* The Cribbage Room — rules engine (no DOM). Works in browser (window.CRIB) and node. */
(function (root) {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const mk = (r, s) => ({ r, s, id: r + '-' + s });
  const val = (c) => Math.min(c.r, 10);
  const label = (c) => RANKS[c.r - 1] + SUITS[c.s];
  const isRed = (c) => c.s === 1 || c.s === 2;

  function deck() {
    const d = [];
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push(mk(r, s));
    return d;
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const popcount = (m) => { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; };

  /** Score a 4-card hand (or crib) with the starter. */
  function scoreHand(hand, starter, isCrib) {
    const items = [];
    const all = hand.concat([starter]);
    const n = all.length;

    for (let m = 1; m < 1 << n; m++) {
      let sum = 0; const cs = [];
      for (let i = 0; i < n; i++) if (m & (1 << i)) { sum += val(all[i]); cs.push(all[i]); }
      if (sum === 15) items.push({ label: 'Fifteen', pts: 2, cards: cs });
    }
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (all[i].r === all[j].r) items.push({ label: 'Pair', pts: 2, cards: [all[i], all[j]] });

    for (let L = n; L >= 3; L--) {
      const found = [];
      for (let m = 1; m < 1 << n; m++) {
        if (popcount(m) !== L) continue;
        const cs = [];
        for (let i = 0; i < n; i++) if (m & (1 << i)) cs.push(all[i]);
        const rs = cs.map((c) => c.r);
        if (new Set(rs).size === L && Math.max(...rs) - Math.min(...rs) === L - 1) found.push(cs);
      }
      if (found.length) {
        found.forEach((cs) => items.push({ label: 'Run of ' + L, pts: L, cards: cs }));
        break;
      }
    }

    const hs = hand[0].s;
    if (hand.every((c) => c.s === hs)) {
      if (starter.s === hs) items.push({ label: 'Flush of 5', pts: 5, cards: all });
      else if (!isCrib) items.push({ label: 'Flush', pts: 4, cards: hand.slice() });
    }
    const jack = hand.find((c) => c.r === 11 && c.s === starter.s);
    if (jack) items.push({ label: 'Nobs', pts: 1, cards: [jack] });

    return { total: items.reduce((a, b) => a + b.pts, 0), items };
  }

  /** Score the card just played. stack = cards since last reset, INCLUDING the new card. */
  function pegScore(stack) {
    const count = stack.reduce((a, c) => a + val(c), 0);
    const items = [];
    if (count === 15) items.push({ label: 'Fifteen', pts: 2 });
    if (count === 31) items.push({ label: 'Thirty-one', pts: 2 });

    let k = 1;
    const last = stack[stack.length - 1];
    for (let i = stack.length - 2; i >= 0 && stack[i].r === last.r; i--) k++;
    if (k === 2) items.push({ label: 'Pair', pts: 2 });
    if (k === 3) items.push({ label: 'Pair royal', pts: 6 });
    if (k === 4) items.push({ label: 'Double pair royal', pts: 12 });

    for (let L = Math.min(stack.length, 7); L >= 3; L--) {
      const rs = stack.slice(-L).map((c) => c.r);
      if (new Set(rs).size === L && Math.max(...rs) - Math.min(...rs) === L - 1) {
        items.push({ label: 'Run of ' + L, pts: L });
        break;
      }
    }
    return { total: items.reduce((a, b) => a + b.pts, 0), items, count };
  }

  /** Rough expected value of two cards thrown to the crib. */
  function cribHeur(d) {
    const [a, b] = d;
    let v = 0;
    if (a.r === b.r) v += 2.0;
    if (val(a) + val(b) === 15) v += 2.0;
    if (a.r === 5 || b.r === 5) v += 1.0;
    const diff = Math.abs(a.r - b.r);
    if (diff === 1) v += 0.7; else if (diff === 2) v += 0.35;
    if (a.s === b.s) v += 0.25;
    if ((a.r === 11 || b.r === 11)) v += 0.15; // nobs chance
    return v;
  }

  /** Rank all 15 discard options. Returns sorted array of {keep, disc, hEV, cEV, val}. */
  function chooseDiscard(hand, isDealer, o) {
    o = Object.assign({ cribWeight: 1, noise: 0 }, o || {});
    const seen = new Set(hand.map((c) => c.id));
    const unseen = deck().filter((c) => !seen.has(c.id));
    const res = [];
    for (let i = 0; i < hand.length; i++)
      for (let j = i + 1; j < hand.length; j++) {
        const disc = [hand[i], hand[j]];
        const keep = hand.filter((_, k) => k !== i && k !== j);
        let t = 0;
        for (const s of unseen) t += scoreHand(keep, s, false).total;
        const hEV = t / unseen.length;
        const cEV = cribHeur(disc);
        const v = hEV + (isDealer ? 1 : -1) * cEV * o.cribWeight + (o.noise ? gauss() * o.noise : 0);
        res.push({ keep, disc, hEV, cEV, val: v });
      }
    res.sort((a, b) => b.val - a.val);
    return res;
  }

  /** Pick a card to peg. Returns a card from hand, or null if none playable. */
  function choosePeg(hand, stack, count, o) {
    o = Object.assign({ slip: 0 }, o || {});
    const playable = hand.filter((c) => count + val(c) <= 31);
    if (!playable.length) return null;
    if (o.slip && Math.random() < o.slip) return playable[Math.floor(Math.random() * playable.length)];
    let best = null, bestV = -1e9;
    for (const c of playable) {
      const pts = pegScore(stack.concat([c])).total;
      const nc = count + val(c);
      let v = pts * 10 + Math.random() * 0.5;
      if (nc === 5 || nc === 21) v -= 4;
      if (nc === 10) v -= 3;
      if (stack.length === 0) {
        if (c.r === 5) v -= 3;
        if (val(c) <= 4) v += 1;
      }
      if (v > bestV) { bestV = v; best = c; }
    }
    return best;
  }

  const api = { SUITS, RANKS, mk, val, label, isRed, deck, shuffle, scoreHand, pegScore, cribHeur, chooseDiscard, choosePeg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CRIB = api;
})(typeof window !== 'undefined' ? window : globalThis);
