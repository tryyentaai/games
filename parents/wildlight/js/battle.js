// WILDLIGHT — battle system. Owner: battle module.
// Structure: the battle LOGIC is a generator (run) that yields "effects" ({say}, {anim}, {hp}, {choose}...).
// The scene below is one driver (animations + UI); dev/sim_battle.js is another (auto-answers, no drawing).
(function () {
  'use strict';
  const G = window.G;
  const DATA = () => G.DATA;
  const Bt = (G.Battle = G.Battle || {});

  const STAT = { atk: 'ATTACK', def: 'DEFENSE', spd: 'SPEED', spc: 'SPECIAL', acc: 'ACCURACY', eva: 'EVASION' };
  const pct = (p) => Math.random() * 100 < p;
  const nm = (m) => G.monName(m);
  const types = (m) => DATA().mons[m.id].types;
  const stageMul = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
  const accMul = (s) => (s >= 0 ? (3 + s) / 3 : 3 / (3 - s));
  const xpFrac = (m) => (m.lvl >= 100 ? 0 : G.clamp((m.xp - G.xpForLevel(m.lvl)) / (G.xpForLevel(m.lvl + 1) - G.xpForLevel(m.lvl)), 0, 1));
  Bt.xpFrac = xpFrac;

  function mkB(mon, side) {
    return { mon, side, st: { atk: 0, def: 0, spd: 0, spc: 0, acc: 0, eva: 0 }, flinch: false, moved: false, fainted: false,
      disp: mon.hp, v: { show: true, dx: 0, dy: 0, blink: 0, scale: 1, map: null, faintY: 0, xp: xpFrac(mon) } };
  }
  function bname(S, b) { return b.side === 1 ? (S.kind === 'wild' ? 'Wild ' : 'Foe ') + nm(b.mon) : nm(b.mon); }
  function tname(S) { const t = S.trainer || {}; return ((t.cls ? t.cls + ' ' : '') + (t.name || 'TRAINER')).trim(); }
  function effSpd(b) { return b.mon.stats.spd * stageMul(b.st.spd) * (b.mon.status === 'PAR' ? 0.25 : 1); }
  function canStatus(b, st) {
    if (b.mon.status || b.mon.hp <= 0) return false;
    const t = types(b.mon);
    if (st === 'PAR' && t.includes('ELECTRIC')) return false;
    if (st === 'BRN' && t.includes('FIRE')) return false;
    if (st === 'PSN' && t.includes('GHOST')) return false;
    return true;
  }
  function rollHits(h) { if (h[0] === 2 && h[1] === 5) { const r = Math.random(); return r < 0.375 ? 2 : r < 0.75 ? 3 : r < 0.875 ? 4 : 5; } return h[0] + G.rand(h[1] - h[0] + 1); }

  // Raw damage (before crit/random) helper shared by real calc and the AI estimate.
  function calcDamage(att, def, mv, crit, rnd) {
    const phys = mv.cat === 'phys', ak = phys ? 'atk' : 'spc', dk = phys ? 'def' : 'spc';
    let as = att.st[ak], ds = def.st[dk];
    if (crit) { as = Math.max(0, as); ds = Math.min(0, ds); }
    let A = att.mon.stats[ak] * stageMul(as); const Dv = Math.max(1, def.mon.stats[dk] * stageMul(ds));
    if (phys && att.mon.status === 'BRN') A *= 0.5;
    let dmg = Math.floor(Math.floor(((Math.floor((2 * att.mon.lvl) / 5) + 2) * mv.power * A) / Dv) / 50) + 2;
    if (crit) dmg *= 1.5;
    if (types(att.mon).includes(mv.type)) dmg *= 1.5;
    dmg *= DATA().typeMult(mv.type, types(def.mon));
    dmg *= rnd == null ? (217 + G.rand(39)) / 255 : rnd;
    return Math.max(1, Math.floor(dmg));
  }
  Bt.calcDamage = calcDamage;

  // ---------- AI ----------
  function scoreMove(b, foe, mvId) {
    const mv = DATA().moves[mvId], ef = mv.effect || {}, hpF = b.mon.hp / b.mon.maxhp;
    if (mv.cat !== 'status') {
      const eff = DATA().typeMult(mv.type, types(foe.mon)); if (eff === 0) return 0;
      const hits = ef.hits ? 3 : 1;
      let dmg = calcDamage(b, foe, mv, false, 0.92) * hits * ((mv.acc || 100) / 100);
      let s = Math.min(100, (dmg / Math.max(1, foe.mon.hp)) * 100);
      if (dmg >= foe.mon.hp) s += 80 + (mv.prio > 0 ? 40 : 0);
      if (ef.recoil) s *= 0.9;
      if (ef.drain && hpF < 0.6) s *= 1.2;
      if (ef.status && canStatus(foe, ef.status)) s += (ef.chance || 0) * 0.4;
      return s;
    }
    let s = 0;
    if (ef.status) s += canStatus(foe, ef.status) ? ({ SLP: 75, PAR: 55, PSN: 40, BRN: 45, FRZ: 80 }[ef.status] * (mv.acc || 100)) / 100 : 0;
    if (ef.foe) for (const k in ef.foe) s += foe.st[k] > -2 && hpF > 0.5 ? 18 : 0;
    if (ef.self) for (const k in ef.self) s += b.st[k] < 2 && hpF > 0.6 ? 22 : 0;
    if (ef.heal) s += hpF < 0.4 ? 130 : hpF < 0.6 ? 35 : 0;
    if (ef.rest) s += hpF < 0.33 || (b.mon.status && hpF < 0.6) ? 120 : 0;
    return s;
  }
  // smart: 0 (random) .. 1 (always best)
  Bt.ai = function (S, b, foe, smart) {
    const opts = b.mon.moves.map((s, i) => ({ i, s })).filter((o) => o.s.pp > 0);
    if (!opts.length) return -1;
    if (Math.random() >= smart) return G.pick(opts).i;
    opts.forEach((o) => { o.sc = scoreMove(b, foe, o.s.id) + Math.random() * 6; });
    opts.sort((a, c) => c.sc - a.sc);
    return opts[0].i;
  };

  // ---------- Battle state ----------
  Bt.create = function (opts) {
    const kind = opts.kind === 'trainer' ? 'trainer' : 'wild';
    const S = {
      kind, opts, trainer: opts.trainer || null,
      canRun: kind === 'wild' && opts.canRun !== false,
      p: { party: opts.party || G.state.party, act: -1, b: null },
      e: { party: opts.enemyMons || (opts.enemy || []).map(([id, l]) => G.makeMon(id, l)), act: 0, b: null },
      part: new Set(), leveled: new Set(), runTries: 0, result: null, turn: 0,
    };
    const t = S.trainer || {};
    const warden = /WARDEN/i.test((t.cls || '') + ' ' + (t.name || ''));
    S.warden = warden;
    S.eItems = t.items != null ? t.items : 0;
    S.aiSmart = kind === 'trainer' ? (warden ? 0.95 : 0.8) : 0.35;
    if (kind === 'wild') { S.e.b = mkB(S.e.party[0], 1); }
    return S;
  };

  // ---------- Logic generators ----------
  const say = (text) => ({ say: text });

  function* sendOut(S, side, idx) {
    const party = side ? S.e.party : S.p.party, b = mkB(party[idx], side);
    if (side === 0) { S.p.act = idx; S.p.b = b; S.part.add(idx); }
    else { S.e.act = idx; S.e.b = b; G.dexSee(b.mon.id); }
    yield { sendOut: b };
    G.audio.cry(b.mon.id);
  }

  function* statChange(S, b, changes) {
    let animated = false;
    for (const k in changes) {
      const d = changes[k], cur = b.st[k];
      if ((d > 0 && cur >= 6) || (d < 0 && cur <= -6)) { yield say(bname(S, b) + "'s " + STAT[k] + " won't go " + (d > 0 ? 'higher!' : 'lower!')); continue; }
      b.st[k] = G.clamp(cur + d, -6, 6);
      if (!animated) { yield { statFx: { b, up: d > 0 } }; animated = true; }
      yield say(bname(S, b) + "'s " + STAT[k] + (d > 1 ? ' rose sharply!' : d > 0 ? ' rose!' : d < -1 ? ' fell sharply!' : ' fell!'));
    }
  }

  function* inflict(S, b, st) {
    b.mon.status = st;
    if (st === 'SLP') b.mon.slpT = 1 + G.rand(3);
    yield { statusFx: { b, st } };
    const n = bname(S, b);
    yield say({ PSN: n + ' was poisoned!', BRN: n + ' was scorched by a burn!', PAR: n + ' is paralyzed! It may not move!', SLP: n + ' dozed off!', FRZ: n + ' froze solid!' }[st]);
  }

  function* useMove(S, user, target, mi) {
    const m = user.mon, un = bname(S, user);
    user.moved = true;
    if (m.status === 'SLP') {
      m.slpT = (m.slpT || 1) - 1;
      if (m.slpT <= 0) { m.status = null; yield say(un + ' woke up!'); return; }
      yield { statusFx: { b: user, st: 'SLP' } }; yield say(un + ' is sound asleep.'); return;
    }
    if (m.status === 'FRZ') {
      if (G.chance(0.2)) { m.status = null; yield say(un + ' thawed out!'); }
      else { yield say(un + ' is frozen stiff!'); return; }
    }
    if (user.flinch) { yield say(un + ' flinched and froze up!'); return; }
    if (m.status === 'PAR' && G.chance(0.25)) { yield { statusFx: { b: user, st: 'PAR' } }; yield say(un + " is too paralyzed to move!"); return; }

    let mvId;
    const slot = m.moves[mi];
    if (mi < 0 || !slot || slot.pp <= 0) { mvId = 'lastgasp'; yield say(un + ' has no moves left!'); }
    else { slot.pp--; mvId = slot.id; }
    const mv = DATA().moves[mvId], ef = mv.effect || {};
    yield say(un + ' used ' + mv.name + '!');

    const hitsFoe = mv.cat !== 'status' || ef.foe || ef.status;
    if (hitsFoe && mv.acc && Math.random() >= (mv.acc / 100) * accMul(user.st.acc - target.st.eva)) {
      yield { anim: { kind: 'miss', mv, user, target } };
      yield say(un + "'s move missed!"); return;
    }

    if (mv.cat !== 'status') {
      const eff = DATA().typeMult(mv.type, types(target.mon));
      if (eff === 0) { yield say('It had no effect on ' + bname(S, target) + '...'); return; }
      yield { anim: { kind: 'move', mv, user, target } };
      const nh = ef.hits ? rollHits(ef.hits) : 1;
      let total = 0, done = 0, endured = false;
      for (let k = 0; k < nh; k++) {
        const crit = Math.random() < (ef.crit ? 0.25 : 1 / 16);
        let dmg = Math.min(calcDamage(user, target, mv, crit), target.mon.hp);
        const tm = target.mon;
        if (dmg >= tm.hp && tm.hp > 1 && target.side === 0 && tm.id === 'voltkit' && (tm.bond || 0) >= 200 && G.chance(0.1)) { dmg = tm.hp - 1; endured = true; }
        tm.hp -= dmg; total += dmg; done++;
        yield { hit: { b: target, eff, crit } };
        yield { hp: target };
        if (crit) yield say('A lucky strike!');
        if (tm.hp <= 0 || endured) break;
      }
      if (nh > 1) yield say('It hit ' + done + ' time' + (done > 1 ? 's' : '') + '!');
      if (eff > 1) yield say("It's extra effective!");
      else if (eff < 1) yield say("It's barely effective...");
      if (endured) yield say(nm(target.mon) + ' hung on for you!');
      if (ef.drain && total > 0 && m.hp > 0 && m.hp < m.maxhp) {
        m.hp = Math.min(m.maxhp, m.hp + Math.max(1, Math.floor(total * ef.drain)));
        yield { hp: user }; yield say(bname(S, target) + ' had its energy sipped!');
      }
      if (ef.recoil && total > 0 && m.hp > 0) {
        m.hp = Math.max(0, m.hp - Math.max(1, Math.floor(total * ef.recoil)));
        yield { hit: { b: user, eff: 1, crit: false, quiet: true } }; yield { hp: user }; yield say(un + ' took recoil damage!');
      }
      if (target.mon.hp > 0) {
        const p = ef.chance == null ? 100 : ef.chance;
        if (ef.status && canStatus(target, ef.status) && pct(p)) yield* inflict(S, target, ef.status);
        if (ef.foe && pct(p)) yield* statChange(S, target, ef.foe);
        if (ef.flinch && !target.moved && pct(ef.flinch)) target.flinch = true;
      }
      return;
    }

    // status moves
    yield { anim: { kind: 'move', mv, user, target } };
    if (ef.status) {
      if (!canStatus(target, ef.status)) yield say(target.mon.status === ef.status ? bname(S, target) + ' is already affected!' : 'But nothing happened!');
      else yield* inflict(S, target, ef.status);
    }
    if (ef.foe) yield* statChange(S, target, ef.foe);
    if (ef.self) yield* statChange(S, user, ef.self);
    if (ef.heal) {
      if (m.hp >= m.maxhp) yield say('But nothing happened!');
      else { m.hp = Math.min(m.maxhp, m.hp + Math.floor(m.maxhp * ef.heal)); G.audio.sfx('heal'); yield { hp: user }; yield say(un + ' recovered health!'); }
    }
    if (ef.rest) {
      if (m.hp >= m.maxhp && !m.status) yield say('But nothing happened!');
      else { m.hp = m.maxhp; m.status = 'SLP'; m.slpT = 2; G.audio.sfx('heal'); yield { hp: user }; yield say(un + ' curled up for a CATNAP!'); }
    }
  }

  function* learnMove(S, m, mvId) {
    if (m.moves.some((x) => x.id === mvId)) return;
    const mn = DATA().moves[mvId].name, n = nm(m);
    if (m.moves.length < 4) { m.moves.push({ id: mvId, pp: DATA().moves[mvId].pp }); G.audio.sfx('levelup'); yield say(n + ' learned ' + mn + '!'); return; }
    for (;;) {
      yield say([n + ' wants to learn ' + mn + '.', 'But ' + n + ' already knows 4 moves.']);
      const yes = yield { ask: 'Forget a move to make room for ' + mn + '?', choices: ['YES', 'NO'] };
      if (yes === 0) {
        const k = yield { pickMove: { mon: m, newMove: mvId } };
        if (k != null && k >= 0) {
          const old = DATA().moves[m.moves[k].id].name;
          m.moves[k] = { id: mvId, pp: DATA().moves[mvId].pp };
          yield say([n + ' let go of ' + old + '...', 'and learned ' + mn + '!']);
          G.audio.sfx('levelup');
          return;
        }
      }
      const stop = yield { ask: 'Give up on learning ' + mn + '?', choices: ['YES', 'NO'] };
      if (stop === 0) { yield say(n + ' did not learn ' + mn + '.'); return; }
    }
  }

  function* gainXP(S) {
    const em = S.e.b.mon, sp = DATA().mons[em.id];
    let total = Math.floor((sp.xpYield * em.lvl) / 7);
    if (S.kind === 'trainer') total = Math.floor(total * 1.5);
    const ids = [...S.part].filter((i) => S.p.party[i] && S.p.party[i].hp > 0);
    if (!ids.length) return;
    const each = Math.max(1, Math.floor(total / ids.length));
    for (const i of ids) {
      const m = S.p.party[i]; if (m.lvl >= 100) continue;
      const active = i === S.p.act;
      m.xp += each;
      yield say(nm(m) + ' earned ' + each + ' XP!');
      if (active) yield { xp: S.p.b };
      while (m.lvl < 100 && m.xp >= G.xpForLevel(m.lvl + 1)) {
        const prev = Object.assign({ hp: m.maxhp }, m.stats);
        m.lvl++; G.recalc(m); S.leveled.add(m);
        if (active) S.p.b.disp = m.hp;
        G.audio.sfx('levelup');
        yield { levelUp: { mon: m, prev, b: active ? S.p.b : null } };
        for (const [l, mv] of DATA().mons[m.id].learn) if (l === m.lvl) yield* learnMove(S, m, mv);
        if (active) yield { xp: S.p.b };
      }
    }
  }

  function* throwOrb(S, itemId) {
    const it = DATA().items[itemId], em = S.e.b.mon, sp = DATA().mons[em.id];
    yield say('{PLAYER} threw ' + (/^[AEIOU]/.test(it.name) ? 'an ' : 'a ') + it.name + '!');
    const sb = em.status === 'SLP' || em.status === 'FRZ' ? 2 : em.status ? 1.5 : 1;
    const a = ((3 * em.maxhp - 2 * em.hp) * sp.catchRate * it.use.catch * sb) / (3 * em.maxhp);
    let shakes = 0, caught = false;
    if (a >= 255) { caught = true; shakes = 3; }
    else {
      const bb = 1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(0.1, a)));
      while (shakes < 4 && G.rand(65536) < bb) shakes++;
      caught = shakes === 4; shakes = Math.min(3, shakes);
    }
    yield { throwOrb: { shakes, caught, item: itemId } };
    if (!caught) {
      yield say(['It burst right out!', 'Darn! It wriggled free!', 'Argh! So close!', 'No way! It was nearly caught!'][shakes]);
      return null;
    }
    G.audio.play('caught');
    G.dexCatch(em.id);
    yield say('Caught it! ' + nm(em) + ' joined you!');
    em.slpT = em.status === 'SLP' ? em.slpT : 0;
    if (S.p.party.length < 6) S.p.party.push(em);
    else { (G.state.box = G.state.box || []).push(em); yield say(nm(em) + ' was sent to the BOX.'); }
    return 'caught';
  }

  function consume(id) { const bag = G.state.bag; if (bag[id] > 0) { bag[id]--; if (!bag[id]) delete bag[id]; } }

  function* useItem(S, act) {
    const it = DATA().items[act.id];
    if (!it) return null;
    if (it.use.catch) { consume(act.id); return yield* throwOrb(S, act.id); }
    const m = S.p.party[act.target];
    if (!m) return null;
    const msg = DATA().applyItem(m, act.id);
    yield say('{PLAYER} used ' + it.name + '!');
    if (!msg) { yield say('It had no effect.'); return null; }
    consume(act.id); G.audio.sfx('heal');
    if (act.target === S.p.act) yield { hp: S.p.b };
    yield say(msg);
    return null;
  }

  function* handleFaints(S) {
    const p = S.p.b, e = S.e.b;
    if (e && e.mon.hp <= 0 && !e.fainted) {
      e.fainted = true;
      yield { faint: e }; G.audio.sfx('faint');
      yield say(bname(S, e) + ' fainted!');
      yield* gainXP(S);
    }
    if (p && p.mon.hp <= 0 && !p.fainted) {
      p.fainted = true;
      yield { faint: p }; G.audio.sfx('faint');
      yield say(nm(p.mon) + ' fainted!');
    }
    const eNext = S.e.party.findIndex((m) => m.hp > 0);
    if (e && e.mon.hp <= 0 && eNext < 0) return 'win';
    if (p && p.mon.hp <= 0) {
      if (!S.p.party.some((m) => m.hp > 0)) {
        yield say(['{PLAYER} has no mons left to fight!', '{PLAYER} hurried away from the battle...']);
        return 'lose';
      }
      const idx = yield { choose: 'party', forced: true };
      yield say('Go for it, ' + nm(S.p.party[idx]) + '!');
      yield* sendOut(S, 0, idx);
    }
    if (e && e.mon.hp <= 0) {
      yield say(tname(S) + ' sent out ' + nm(S.e.party[eNext]) + '!');
      yield* sendOut(S, 1, eNext);
      S.part = new Set([S.p.act]);
    }
    return null;
  }

  function* endTurn(S) {
    for (const b of [S.p.b, S.e.b]) {
      if (!b || b.mon.hp <= 0) continue;
      const m = b.mon, n = bname(S, b);
      if (m.status === 'PSN' || m.status === 'BRN') {
        m.hp = Math.max(0, m.hp - Math.max(1, Math.floor(m.maxhp / (m.status === 'PSN' ? 8 : 16))));
        yield { statusFx: { b, st: m.status } }; yield { hp: b };
        yield say(n + (m.status === 'PSN' ? ' is hurt by poison!' : ' is hurt by its burn!'));
      }
      if (b.side === 0 && m.id === 'voltkit' && m.hp > 0 && m.status && (m.bond || 0) >= 200 && G.chance(0.2)) {
        const s = m.status; m.status = null; m.slpT = 0;
        yield { emote: b };
        yield say(n + ' shook off its ' + { PSN: 'poison', BRN: 'burn', PAR: 'paralysis', SLP: 'drowsiness', FRZ: 'frost' }[s] + ' for you!');
      }
    }
    for (const b of [S.p.b, S.e.b]) if (b) { b.flinch = false; b.moved = false; }
  }

  function enemyAction(S) {
    const e = S.e.b, m = e.mon;
    if (S.kind === 'trainer' && S.eItems > 0 && m.hp > 0 && m.hp < m.maxhp * 0.25 && G.chance(0.8)) return { type: 'heal' };
    return { type: 'move', i: Bt.ai(S, e, S.p.b, S.aiSmart) };
  }

  function* runTurn(S, act) {
    S.turn++;
    let p = S.p.b; const e = S.e.b;
    const eAct = enemyAction(S);
    if (act.type === 'run') {
      S.runTries++;
      const ps = p.mon.stats.spd, es = e.mon.stats.spd;
      const f = Math.floor((ps * 32) / Math.max(1, Math.floor(es / 4) % 256)) + 30 * S.runTries;
      if (ps >= es || f > 255 || G.rand(256) < f) { G.audio.sfx('run'); yield say('You slipped away!'); return 'run'; }
      yield say("Couldn't get away!");
    } else if (act.type === 'switch') {
      yield say(nm(p.mon) + ', come back!');
      yield { recall: p };
      yield say('Go for it, ' + nm(S.p.party[act.i]) + '!');
      yield* sendOut(S, 0, act.i);
      p = S.p.b;
    } else if (act.type === 'item') {
      const r = yield* useItem(S, act);
      if (r) return r;
    }
    if (eAct.type === 'heal') {
      S.eItems--; e.mon.hp = Math.min(e.mon.maxhp, e.mon.hp + 50); G.audio.sfx('heal');
      yield say(tname(S) + ' used a SUPER POTION!'); yield { hp: e };
    }
    const order = [];
    if (act.type === 'move') order.push([p, e, act.i]);
    if (eAct.type === 'move') order.push([e, p, eAct.i]);
    if (order.length === 2) {
      const prio = (o) => (o[2] >= 0 && o[0].mon.moves[o[2]] ? DATA().moves[o[0].mon.moves[o[2]].id].prio : 0);
      const pa = prio(order[0]), pb = prio(order[1]);
      const sa = effSpd(order[0][0]), sb = effSpd(order[1][0]);
      if (pb > pa || (pb === pa && (sb > sa || (sb === sa && G.chance(0.5))))) order.reverse();
    }
    for (const [u, t, i] of order) {
      if (u.mon.hp <= 0 || t.mon.hp <= 0 || u !== (u.side ? S.e.b : S.p.b)) continue;
      yield* useMove(S, u, t, i);
      const r = yield* handleFaints(S);
      if (r) return r;
    }
    yield* endTurn(S);
    return yield* handleFaints(S);
  }

  function* evolve(S, m) {
    const evo = DATA().mons[m.id].evo, old = nm(m);
    yield { evoStart: m };
    G.audio.play('evolve');
    yield say('Oh! ' + old + ' is glowing!');
    const ok = yield { evolve: { mon: m, into: evo.into } };
    if (!ok) { yield say(old + ' settled down.'); yield { evoEnd: m }; return; }
    m.id = evo.into; G.recalc(m); G.dexCatch(m.id);
    G.audio.cry(m.id);
    yield say(old + ' became ' + DATA().mons[m.id].name + '!');
    for (const [l, mv] of DATA().mons[m.id].learn) if (l === m.lvl) yield* learnMove(S, m, mv);
    yield { evoEnd: m };
  }

  function* finish(S) {
    const r = S.result;
    if (r === 'win') {
      G.audio.play('victory');
      S.p.party.forEach((m) => { if (m.id === 'voltkit') m.bond = Math.min(255, (m.bond || 0) + 2); });
      if (S.kind === 'trainer') {
        const t = S.trainer || {};
        yield { trainerIn: true };
        yield say('{PLAYER} beat ' + tname(S) + '!');
        if (t.loseText) yield say(t.loseText);
        const last = S.e.party[S.e.party.length - 1];
        const prize = t.prize != null ? t.prize : last.lvl * 25;
        if (prize > 0) { G.state.money = (G.state.money || 0) + prize; yield say('{PLAYER} received $' + prize + ' for winning!'); }
      }
    }
    if (r !== 'lose') {
      for (const m of S.leveled) {
        const evo = DATA().mons[m.id].evo;
        if (m.hp > 0 && evo && m.lvl >= evo.lvl && S.p.party.includes(m)) yield* evolve(S, m);
      }
    }
    yield { end: r };
  }

  function* run(S) {
    yield { intro: true };
    if (S.kind === 'wild') {
      G.dexSee(S.e.b.mon.id); G.audio.cry(S.e.b.mon.id);
      yield say('A wild ' + nm(S.e.b.mon) + ' leapt out!');
    } else {
      yield say(tname(S) + ' challenges you!');
      if (S.trainer && S.trainer.intro) yield say(S.trainer.intro);
      yield say(tname(S) + ' sent out ' + nm(S.e.party[0]) + '!');
      yield* sendOut(S, 1, 0);
    }
    const first = S.p.party.findIndex((m) => m.hp > 0);
    if (first < 0) { S.result = 'lose'; yield { end: 'lose' }; return; }
    yield say('Go for it, ' + nm(S.p.party[first]) + '!');
    yield* sendOut(S, 0, first);
    S.part = new Set([first]);
    for (;;) {
      const act = yield { choose: 'action' };
      if (act.type === 'run' && S.kind === 'trainer') { yield say("You can't run from a trainer battle!"); continue; }
      if (act.type === 'run' && !S.canRun) { yield say("There's no escape!"); continue; }
      if (act.type === 'item' && S.kind === 'trainer' && DATA().items[act.id] && DATA().items[act.id].use.catch) {
        yield say(['The trainer swatted the ORB away!', "You can't catch another trainer's mon!"]); continue;
      }
      const r = yield* runTurn(S, act);
      if (r) { S.result = r; break; }
    }
    yield* finish(S);
  }
  Bt.run = run;

  // =====================================================================
  // Scene driver
  // =====================================================================
  const EPOS = { x: 96, y: -4 }, PPOS = { x: 8, y: 32 };
  const center = (b) => (b.side ? { x: 128, y: 30 } : { x: 40, y: 66 });

  Bt.start = function (opts) {
    opts = opts || {};
    const S = Bt.create(opts);
    const gen = run(S);
    const t = S.trainer || {};
    const music = opts.music || (S.kind === 'wild' ? 'battle' : S.warden ? 'warden' : 'trainer');
    G.audio.play(music);
    G.audio.sfx('encounter');

    const sc = {
      opaque: false, S, anims: [], waiting: false, resume: undefined, ui: null, lastText: null,
      hide: true, eTrainer: S.kind === 'trainer', pTrainer: true, eTx: 0, pTx: 0, eHud: false, pHud: false,
      shake: 0, flashCol: -1, levelBox: null, evo: null, orb: null, ended: false, mainIdx: 0, moveIdx: 0,
      update() {
        for (const a of sc.anims.slice()) { a.t++; if (a.upd) a.upd(a.t); if (a.t >= a.dur) { sc.anims.splice(sc.anims.indexOf(a), 1); a.done && a.done(); } }
        if (sc.shake > 0) sc.shake--;
        if (sc.levelBox) { if (G.input.pressed('a') || G.input.pressed('b')) { G.audio.sfx('blip'); sc.levelBox = null; finishWait(); } return; }
        if (sc.evo && sc.evo.running) { evoUpdate(); return; }
        if (sc.ui) { sc.ui.update(); return; }
        if (!sc.waiting && !sc.ended) advance();
      },
      draw() { drawScene(); },
    };
    let doneCb = null;
    function wait(cb) { sc.waiting = true; doneCb = cb || null; }
    function finishWait(v) { sc.waiting = false; sc.resume = v; if (doneCb) { const c = doneCb; doneCb = null; c(); } }
    function addAnim(a) { a.t = 0; sc.anims.push(a); return a; }
    function animThen(a) { wait(); a.done = ((d) => () => { d && d(); finishWait(); })(a.done); addAnim(a); }

    function advance() {
      for (let guard = 0; guard < 200 && !sc.waiting && !sc.ui && G.top() === sc; guard++) {
        const r = gen.next(sc.resume); sc.resume = undefined;
        if (r.done) { sc.ended = true; return; }
        handle(r.value);
      }
    }

    function sayText(text) {
      const pages = Array.isArray(text) ? text : [text];
      const lines = G.wrap(G.fmt(pages[pages.length - 1]), 18);
      sc.lastText = lines.slice(-2);
    }

    function handle(y) {
      if (y.say != null) { wait(); sayText(y.say); G.say(y.say, { onDone: () => finishWait() }); return; }
      if (y.ask) { wait(); sayText(y.ask); G.say(y.ask, { choices: y.choices, cancelChoice: 1, onChoice: (i) => finishWait(i) }); return; }
      if (y.intro) return animThen(introAnim());
      if (y.sendOut) return animThen(sendOutAnim(y.sendOut));
      if (y.recall) return animThen(recallAnim(y.recall));
      if (y.faint) return animThen(faintAnim(y.faint));
      if (y.hp) return animThen(hpAnim(y.hp));
      if (y.xp) return animThen(xpAnim(y.xp));
      if (y.hit) return animThen(hitAnim(y.hit));
      if (y.anim) return animThen(moveAnim(y.anim));
      if (y.statFx) return animThen(statAnim(y.statFx));
      if (y.statusFx) return animThen(statusAnim(y.statusFx));
      if (y.emote) return animThen(emoteAnim(y.emote));
      if (y.throwOrb) return animThen(orbAnim(y.throwOrb));
      if (y.trainerIn) { sc.eTrainer = true; sc.eHud = false; sc.eTx = 80; return animThen({ dur: 30, upd: (t) => { sc.eTx = 80 - (80 * t) / 30; } }); }
      if (y.levelUp) {
        wait(); const lu = y.levelUp; sc.levelBox = lu;
        if (lu.b) { lu.b.v.xp = 0; lu.b.disp = lu.mon.hp; }
        sc.lastText = G.wrap(nm(lu.mon) + ' reached Lv' + lu.mon.lvl + '!', 18);
        return;
      }
      if (y.choose === 'action') { sc.lastText = null; sc.ui = mainMenu(); return; }
      if (y.choose === 'party') {
        wait();
        G.Menus.party({ mode: 'battle', forced: true, active: -1, onPick: (i) => finishWait(i) });
        return;
      }
      if (y.pickMove) { wait(); pickMoveMenu(y.pickMove, (i) => finishWait(i)); return; }
      if (y.evoStart) { sc.evo = { mon: y.evoStart, running: false }; sc.lastText = null; return; }
      if (y.evolve) { wait(); sc.evo = { mon: y.evolve.mon, from: y.evolve.mon.id, into: y.evolve.into, running: true, t: 0, show: 'from', flash: 0 }; return; }
      if (y.evoEnd) return; // keep the evolution screen up until the battle fades out
      if (y.end) {
        wait();
        G.fade(() => { G.pop(sc); opts.onEnd && opts.onEnd(y.end); });
        return;
      }
    }

    // ---------- UI: main menu + move menu ----------
    function mainMenu() {
      const labels = ['FIGHT', 'BAG', 'MON', 'RUN'];
      const ui = {
        mode: 'main',
        update() {
          if (ui.mode === 'moves') return movesUpdate();
          let i = sc.mainIdx;
          if (G.input.pressed('left') || G.input.pressed('right')) { i ^= 1; G.audio.sfx('cursor'); }
          if (G.input.pressed('up') || G.input.pressed('down')) { i ^= 2; G.audio.sfx('cursor'); }
          sc.mainIdx = i;
          if (!G.input.pressed('a')) return;
          G.audio.sfx('select');
          const pm = S.p.b.mon;
          if (i === 0) {
            if (!pm.moves.some((m) => m.pp > 0)) return choose({ type: 'move', i: -1 });
            ui.mode = 'moves'; if (sc.moveIdx >= pm.moves.length) sc.moveIdx = 0;
          } else if (i === 1) {
            G.Menus.bag({ mode: 'battle', onUse: (id, target) => { if (id) choose({ type: 'item', id, target }); } });
          } else if (i === 2) {
            G.Menus.party({ mode: 'battle', active: S.p.act, onPick: (k) => { if (k != null && k >= 0 && k !== S.p.act) choose({ type: 'switch', i: k }); } });
          } else choose({ type: 'run' });
        },
        draw() {
          if (ui.mode === 'moves') return movesDraw();
          G.box(0, 96, 160, 48);
          G.text('What', 8, 108); G.text('next?', 8, 124);
          G.box(56, 96, 104, 48);
          labels.forEach((s, k) => G.text(s, 72 + (k & 1) * 48, 108 + (k >> 1) * 16));
          G.text('▶', 64 + (sc.mainIdx & 1) * 48, 108 + (sc.mainIdx >> 1) * 16);
        },
      };
      function choose(a) { sc.ui = null; sc.resume = a; }
      function movesUpdate() {
        const ms = S.p.b.mon.moves;
        if (G.input.repeat('up')) { sc.moveIdx = (sc.moveIdx + ms.length - 1) % ms.length; G.audio.sfx('cursor'); }
        if (G.input.repeat('down')) { sc.moveIdx = (sc.moveIdx + 1) % ms.length; G.audio.sfx('cursor'); }
        if (G.input.pressed('b')) { G.audio.sfx('back'); ui.mode = 'main'; return; }
        if (G.input.pressed('a')) {
          if (ms[sc.moveIdx].pp <= 0) { G.audio.sfx('bump'); G.say('No PP left for that move!'); return; }
          G.audio.sfx('select'); choose({ type: 'move', i: sc.moveIdx });
        }
      }
      function movesDraw() {
        const ms = S.p.b.mon.moves, cur = ms[sc.moveIdx], mv = DATA().moves[cur.id];
        G.box(0, 56, 88, 48);
        G.text('TYPE/', 8, 64); G.text(mv.type, 16, 74);
        G.textR(cur.pp + '/' + mv.pp, 80, 84);
        G.box(32, 96, 128, 48);
        for (let k = 0; k < 4; k++) G.text(ms[k] ? DATA().moves[ms[k].id].name : '-', 48, 104 + k * 8);
        G.text('▶', 40, 104 + sc.moveIdx * 8);
      }
      return ui;
    }

    function pickMoveMenu(o, cb) {
      const m = o.mon, items = m.moves.map((x) => DATA().moves[x.id].name);
      G.menu({ items, x: 24, y: 16, w: 136, cancelIndex: null, onCancel: () => cb(-1), onSelect: (i) => cb(i),
        drawExtra: (msc) => {
          const mv = DATA().moves[m.moves[msc.index].id];
          G.box(0, 96, 160, 48); G.text('Forget which move?', 8, 104);
          G.text(mv.type, 8, 120); G.textR((mv.power || '-') + ' PWR', 152, 120);
        } });
    }

    // ---------- Animations ----------
    function introAnim() {
      const swirl = S.kind === 'trainer';
      const cells = [];
      if (swirl) { // spiral order of 8x8 cells (20x18), from outside in
        let x0 = 0, y0 = 0, x1 = 19, y1 = 17;
        while (x0 <= x1 && y0 <= y1) {
          for (let x = x0; x <= x1; x++) cells.push([x, y0]); y0++;
          for (let y = y0; y <= y1; y++) cells.push([x1, y]); x1--;
          if (y0 <= y1) { for (let x = x1; x >= x0; x--) cells.push([x, y1]); y1--; }
          if (x0 <= x1) { for (let y = y1; y >= y0; y--) cells.push([x0, y]); x0++; }
        }
      }
      sc.eTx = -112; sc.pTx = 120;
      return {
        dur: 130,
        upd(t) {
          if (t === 64) { sc.opaque = true; sc.hide = false; }
          if (t > 64) { const k = Math.min(1, (t - 64) / 56); const e = 1 - (1 - k) * (1 - k); sc.eTx = -112 * (1 - e); sc.pTx = 120 * (1 - e); }
          if (t === 129 && S.kind === 'wild') sc.eHud = true;
        },
        drw(t) {
          if (t < 24) { if ((t >> 2) & 1) G.rect(0, 0, 160, 144, (t >> 3) & 1 ? 0 : 3); return; }
          if (t < 64) {
            const k = (t - 24) / 38;
            if (swirl) { const n = Math.min(cells.length, Math.floor(k * cells.length)); for (let i = 0; i < n; i++) G.rect(cells[i][0] * 8, cells[i][1] * 8, 8, 8, 3); }
            else for (let i = 0; i < 9; i++) { const w = Math.min(160, Math.floor(k * 170)); G.rect(i & 1 ? 160 - w : 0, i * 16, w, 16, 3); }
          }
        },
      };
    }

    function sendOutAnim(b) {
      const side = b.side, c = center(b);
      b.v.show = false; b.v.scale = 0;
      const start = side ? { x: 150, y: 10 } : { x: 10, y: 70 };
      const a = {
        dur: 52,
        upd(t) {
          if (t <= 16) { if (side) { if (sc.eTrainer) sc.eTx = (80 * t) / 16; } else if (sc.pTrainer) sc.pTx = (-90 * t) / 16; }
          if (t === 16) { if (side) { sc.eTrainer = false; sc.eTx = 0; } else { sc.pTrainer = false; sc.pTx = 0; } G.audio.sfx('orbThrow'); }
          if (t === 30) { b.v.show = true; G.audio.sfx('orbCatch'); G.haptic('light'); }
          if (t >= 30) { const k = Math.min(1, (t - 30) / 14); b.v.scale = k; b.v.map = t < 46 ? '0000' : null; }
          if (t === 51) { if (side) sc.eHud = true; else sc.pHud = true; b.v.scale = 1; b.v.map = null; }
        },
        drw(t) {
          if (t >= 16 && t < 30) { const k = (t - 16) / 14; drawOrb(start.x + (c.x - start.x) * k, start.y + (c.y + 10 - start.y) * k - Math.sin(k * Math.PI) * 24, 0); }
          if (t >= 30 && t < 40) { const r = (t - 30) * 3; for (let i = 0; i < 8; i++) { const an = (i * Math.PI) / 4; G.rect(c.x + Math.cos(an) * r - 1, c.y + 12 + Math.sin(an) * r - 1, 3, 3, i & 1 ? 2 : 3); } }
        },
      };
      return a;
    }
    function recallAnim(b) {
      return { dur: 18, upd(t) { b.v.map = '0000'; b.v.scale = 1 - t / 18; if (t === 17) { b.v.show = false; sc.pHud = false; } } };
    }
    function faintAnim(b) {
      G.audio.cry(b.mon.id);
      return { dur: 28, upd(t) { if (t > 8) b.v.faintY = ((t - 8) / 20) * 64; if (t === 27) { b.v.show = false; b.v.faintY = 0; if (b.side) sc.eHud = false; else sc.pHud = false; } } };
    }
    function hpAnim(b) {
      const step = Math.max(0.25, b.mon.maxhp / 48);
      return { dur: 999, upd(t) {
        const d = b.mon.hp - b.disp;
        if (Math.abs(d) <= step) { b.disp = b.mon.hp; if (!this.fin) { this.fin = 1; this.dur = t; } } else b.disp += Math.sign(d) * step;
      } };
    }
    function xpAnim(b) {
      const target = xpFrac(b.mon) >= 1 || b.mon.xp >= G.xpForLevel(b.mon.lvl + 1) ? 1 : xpFrac(b.mon);
      return { dur: 999, upd(t) {
        const d = target - b.v.xp;
        if (Math.abs(d) <= 0.02) { b.v.xp = target; if (!this.fin) { this.fin = 1; this.dur = t + 6; } } else b.v.xp += Math.sign(d) * 0.02;
      } };
    }
    function hitAnim(h) {
      const b = h.b;
      if (!h.quiet) {
        G.audio.sfx(h.eff > 1 ? 'hitSuper' : h.eff < 1 ? 'hitWeak' : 'hit');
        G.haptic(h.eff > 1 || h.crit ? 'heavy' : 'light');
        if (h.eff > 1 || h.crit) sc.shake = 14; else if (b.side === 0) sc.shake = 6;
      }
      return { dur: 24, upd(t) { b.v.blink = t < 23 ? 1 : 0; } };
    }
    function statAnim(f) {
      const b = f.b, c = center(b);
      G.audio.sfx(f.up ? 'levelup' : 'hitWeak');
      return { dur: 34, upd(t) { b.v.map = f.up ? (t & 4 ? '0012' : null) : (t & 4 ? '1233' : null); if (t === 33) b.v.map = null; },
        drw(t) {
          for (let i = 0; i < 6; i++) {
            const x = c.x - 24 + i * 10, ph = (t * 2 + i * 9) % 40;
            const y = f.up ? c.y + 20 - ph : c.y - 20 + ph;
            arrow(x, y, f.up);
          }
        } };
    }
    function arrow(x, y, up) {
      if (up) { G.rect(x + 1, y, 1, 1, 3); G.rect(x, y + 1, 3, 1, 3); G.rect(x + 1, y + 2, 1, 3, 2); }
      else { G.rect(x + 1, y, 1, 3, 2); G.rect(x, y + 3, 3, 1, 3); G.rect(x + 1, y + 4, 1, 1, 3); }
    }
    function statusAnim(f) {
      const b = f.b, c = center(b), st = f.st;
      return { dur: 30, upd(t) { if (st === 'PAR') b.v.map = t & 2 ? '3330' : null; if (st === 'FRZ') b.v.map = t & 4 ? '0011' : null; if (st === 'PSN') b.v.map = t & 4 ? '1223' : null; if (t === 29) b.v.map = null; },
        drw(t) {
          if (st === 'SLP') { for (let i = 0; i < 3; i++) { const k = (t + i * 10) % 30; G.text('z', c.x + 8 + i * 6 + k / 4, c.y - 14 - k, 3); } }
          if (st === 'PSN') { for (let i = 0; i < 5; i++) { const k = (t * 2 + i * 13) % 30; G.rect(c.x - 20 + i * 10, c.y + 16 - k, 3, 3, 2); G.rect(c.x - 20 + i * 10, c.y + 16 - k, 1, 1, 0); } }
          if (st === 'BRN') flames(c.x, c.y + 18, t, 5);
          if (st === 'PAR') bolt(c.x - 10 + G.rand(20), c.y - 30, c.y + 10);
          if (st === 'FRZ') for (let i = 0; i < 6; i++) sparkle(c.x - 24 + i * 9, c.y - 20 + ((i * 17 + t) % 40), t + i);
        } };
    }
    function emoteAnim(b) {
      const c = center(b);
      return { dur: 40, drw(t) { const y = c.y - 34 - Math.min(8, t / 3); G.box(c.x + 12, y, 20, 16); G.text('♥', c.x + 18, y + 4, (t >> 3) & 1 ? 3 : 2); } };
    }
    function flames(cx, by, t, n) {
      for (let i = 0; i < n; i++) {
        const x = cx - 20 + i * 10, h = 6 + ((t * 3 + i * 7) % 8);
        G.rect(x, by - h, 5, h, 3); G.rect(x + 1, by - h + 2, 3, h - 2, 2); G.rect(x + 2, by - h + 4, 1, Math.max(1, h - 5), 1);
      }
    }
    function bolt(x, y0, y1) {
      let x0 = x;
      for (let y = y0; y < y1; y += 4) { const nx = x0 + G.rand(7) - 3; G.rect(Math.min(x0, nx), y, Math.abs(nx - x0) + 2, 4, 3); G.rect(Math.min(x0, nx) + 1, y + 1, 1, 2, 0); x0 = nx; }
    }
    function sparkle(x, y, t) { const s = t & 4 ? 1 : 2; G.rect(x - s, y, s * 2 + 1, 1, 3); G.rect(x, y - s, 1, s * 2 + 1, 3); }
    function star(x, y, r, c) { G.rect(x - r, y - 1, r * 2 + 1, 3, c); G.rect(x - 1, y - r, 3, r * 2 + 1, c); G.rect(x - r / 2, y - r / 2, r + 1, r + 1, c); }
    function drawOrb(x, y, open) {
      x = Math.round(x - 4); y = Math.round(y - 4);
      G.rect(x + 2, y, 4, 1, 3); G.rect(x + 1, y + 1, 6, 6, 3); G.rect(x, y + 2, 8, 4, 3); G.rect(x + 2, y + 7, 4, 1, 3);
      G.rect(x + 2, y + 1, 4, 2, 1); G.rect(x + 1, y + 2, 6, 1, 1); G.rect(x + 2, y + 2, 1, 1, 0);
      G.rect(x + 1, y + 4, 6, 1, 3); G.rect(x + 2, y + 5, 4, 2, 0); G.rect(x + 3, y + 3, 2, 2, open ? 3 : 0);
    }

    function moveAnim(a) {
      const { mv, user, target } = a;
      const from = center(user), to = center(target), dir = user.side ? -1 : 1;
      if (a.kind === 'miss') return { dur: 16, upd(t) { user.v.dx = Math.sin((t / 16) * Math.PI) * 8 * dir; if (t === 15) user.v.dx = 0; } };
      const ef = mv.effect || {};
      const lerp = (k) => ({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k });
      if (mv.cat === 'status') {
        if (!(ef.foe || ef.status)) { // self buff / heal
          G.audio.sfx('select');
          return { dur: 30, upd(t) { user.v.map = t & 4 ? '0012' : null; if (t === 29) user.v.map = null; },
            drw(t) { for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2 + t / 6, r = 30 - t; sparkle(from.x + Math.cos(an) * r, from.y + Math.sin(an) * r * 0.8, t + i); } } };
        }
        G.audio.sfx('blip');
        return { dur: 30, drw(t) {
          for (let i = 0; i < 4; i++) {
            const k = G.clamp((t - i * 4) / 18, 0, 1); if (k <= 0 || k >= 1) continue;
            const p = lerp(k), wob = Math.sin(t / 2 + i) * 4;
            if (mv.type === 'ELECTRIC') bolt(p.x, p.y - 6, p.y + 6);
            else if (ef.status === 'SLP') G.text('z', p.x - 4, p.y - 4 + wob, 3);
            else { G.rect(p.x - 2, p.y - 2 + wob, 5, 5, 3); G.rect(p.x - 1, p.y - 1 + wob, 3, 3, i & 1 ? 1 : 0); }
          }
        } };
      }
      const phys = mv.cat === 'phys';
      const lunge = (t) => { if (phys) user.v.dx = t < 12 ? Math.sin((t / 12) * Math.PI) * 12 * dir : 0; };
      switch (mv.type) {
        case 'FIRE':
          return { dur: 40, upd: lunge, drw(t) {
            if (t < 16) for (let i = 0; i < 3; i++) { const p = lerp(G.clamp((t - i * 2) / 14, 0, 1)); G.rect(p.x - 2, p.y - 2, 5, 5, 3); G.rect(p.x - 1, p.y - 1, 3, 3, 1); }
            else flames(to.x, to.y + 18, t, 5);
          } };
        case 'WATER':
          return { dur: 38, upd: lunge, drw(t) {
            for (let i = 0; i < 5; i++) {
              const k = G.clamp((t - i * 3) / 18, 0, 1); if (k <= 0) continue;
              if (k < 1) { const p = lerp(k); const y = p.y - Math.sin(k * Math.PI) * 20; G.rect(p.x - 2, y - 2, 5, 5, 3); G.rect(p.x - 1, y - 1, 3, 3, 2); G.rect(p.x - 1, y - 1, 1, 1, 0); }
              else { const r = (t - i * 3 - 18) * 2; if (r < 16) for (let j = 0; j < 6; j++) { const an = (j / 6) * Math.PI * 2; G.rect(to.x + Math.cos(an) * r, to.y + 8 + Math.sin(an) * r * 0.5, 2, 2, 2); } }
            }
          } };
        case 'GRASS':
          return { dur: 40, upd: lunge, drw(t) {
            for (let i = 0; i < 5; i++) {
              const k = G.clamp((t - i * 4) / 20, 0, 1); if (k <= 0 || k >= 1) continue;
              const p = lerp(k), an = t / 3 + i * 2, ox = Math.cos(an) * 10 * (1 - k), oy = Math.sin(an) * 10 * (1 - k);
              const x = p.x + ox, y = p.y + oy;
              if ((t + i) & 2) { G.rect(x - 3, y, 6, 2, 3); G.rect(x - 2, y, 3, 1, 1); } else { G.rect(x, y - 3, 2, 6, 3); G.rect(x, y - 2, 1, 3, 1); }
            }
            if (t > 24) star(to.x, to.y, 4 + (t & 3), 3);
          } };
        case 'ELECTRIC':
          return { dur: 36, upd(t) { lunge(t); target.v.map = t > 6 && t & 2 ? '3330' : null; if (t === 35) target.v.map = null; },
            drw(t) { if (t > 4 && (t & 1)) { bolt(to.x - 6, 0, to.y + 10); bolt(to.x + 8, 4, to.y + 6); } if (t > 4 && t < 9) sc.flashCol = 3; else sc.flashCol = -1; } };
        case 'BUG':
          return { dur: 36, upd: lunge, drw(t) {
            for (let i = 0; i < 8; i++) { const an = t / 3 + (i / 8) * Math.PI * 2, r = 22 - t / 3; G.rect(to.x + Math.cos(an) * r + G.rand(3) - 1, to.y + Math.sin(an) * r * 0.7, 3, 2, 3); }
            if (t > 26) star(to.x, to.y, 5, 3);
          } };
        case 'FLYING':
          return { dur: 34, upd: lunge, drw(t) {
            for (let i = 0; i < 3; i++) { const k = (t - i * 5) / 14; if (k < 0 || k > 1) continue; const x = to.x - 30 + k * 60; for (let j = 0; j < 10; j++) G.rect(x - j * 2, to.y - 20 + i * 14 + j, 3, 1, j < 3 ? 3 : 2); }
          } };
        case 'ROCK':
          return { dur: 40, upd(t) { lunge(t); if (t === 18 || t === 26) sc.shake = 8; }, drw(t) {
            for (let i = 0; i < 4; i++) { const k = G.clamp((t - i * 5) / 16, 0, 1); if (k >= 1) continue; const x = to.x - 18 + i * 12, y = -10 + (to.y + 10) * k; G.rect(x - 4, y - 4, 9, 8, 3); G.rect(x - 3, y - 3, 6, 5, 2); G.rect(x - 2, y - 2, 2, 2, 1); }
            if (t > 18) star(to.x, to.y + 8, 3 + (t & 3), 3);
          } };
        case 'GHOST':
          return { dur: 44, upd(t) { lunge(t); target.v.map = t & 4 ? '1233' : '0123'; target.v.dx = Math.sin(t / 2) * 3; if (t === 43) { target.v.map = null; target.v.dx = 0; } },
            drw(t) { for (let i = 0; i < 4; i++) { const y = to.y - 24 + i * 14, w = 20 + Math.sin(t / 3 + i) * 12; G.rect(to.x - w, y, 6, 2, 3); G.rect(to.x + w - 6, y + 4, 6, 2, 3); }
              const gy = to.y + 10 - t; G.rect(to.x - 4, gy, 9, 8, 0); G.rect(to.x - 4, gy, 9, 1, 3); G.rect(to.x - 2, gy + 2, 1, 2, 3); G.rect(to.x + 2, gy + 2, 1, 2, 3); } };
        case 'PSYCHIC':
          return { dur: 42, upd(t) { target.v.dx = Math.sin(t / 2) * 4; if (t === 41) target.v.dx = 0; },
            drw(t) { for (let i = 0; i < 3; i++) { const r = ((t * 2 + i * 12) % 36); const c = i === 1 ? 2 : 3; G.rect(to.x - r, to.y - r, r * 2, 1, c); G.rect(to.x - r, to.y + r, r * 2, 1, c); G.rect(to.x - r, to.y - r, 1, r * 2, c); G.rect(to.x + r, to.y - r, 1, r * 2 + 1, c); } } };
        default: // NORMAL
          return { dur: 26, upd: lunge, drw(t) { if (t > 8 && t < 24) { const r = Math.min(8, (t - 8)); star(to.x, to.y, r, (t >> 1) & 1 ? 3 : 2); G.rect(to.x - 1, to.y - 1, 3, 3, 0); } } };
      }
    }

    function orbAnim(o) {
      const e = S.e.b, c = center(e), land = { x: c.x, y: 52 };
      G.audio.sfx('orbThrow');
      let shakeIdx = 0;
      const tShake0 = 52, per = 26, tEnd = tShake0 + o.shakes * per + 14;
      const a = { dur: tEnd + (o.caught ? 30 : 20), orbX: 0, orbY: 0, wob: 0, show: true,
        upd(t) {
          if (t < 22) { const k = t / 22; a.orbX = 16 + (c.x - 16) * k; a.orbY = 90 + (c.y - 90) * k - Math.sin(k * Math.PI) * 40; }
          if (t === 22) { G.audio.sfx('orbCatch'); }
          if (t >= 22 && t < 36) { e.v.map = '0000'; e.v.scale = 1 - (t - 22) / 14; }
          if (t === 36) e.v.show = false;
          if (t >= 36 && t < tShake0) { const k = (t - 36) / 16; a.orbX = c.x; a.orbY = c.y + (land.y - c.y) * Math.min(1, k * 1.4) - (k > 0.7 ? Math.sin(((k - 0.7) / 0.3) * Math.PI) * 4 : 0); }
          if (t >= tShake0 && shakeIdx < o.shakes) {
            const lt = (t - tShake0) % per; a.wob = lt < 12 ? Math.round(Math.sin((lt / 12) * Math.PI * 2) * 3) : 0;
            if (lt === 0) { G.audio.sfx('orbShake'); G.haptic('light'); }
            if (lt === per - 1) shakeIdx++;
          } else a.wob = 0;
          if (t === tEnd) {
            if (o.caught) { G.haptic('heavy'); G.audio.sfx('orbCatch'); }
            else { a.show = false; e.v.show = true; e.v.scale = 0.2; G.audio.sfx('hitWeak'); }
          }
          if (!o.caught && t > tEnd) { e.v.scale = Math.min(1, 0.2 + (t - tEnd) / 12); e.v.map = t > tEnd + 12 ? null : '0000'; }
          if (t === a.dur - 1) { if (!o.caught) { e.v.scale = 1; e.v.map = null; } }
        },
        drw(t) {
          if (!a.show) { if (t < tEnd + 10) for (let i = 0; i < 8; i++) { const an = (i * Math.PI) / 4, r = (t - tEnd) * 3; G.rect(c.x + Math.cos(an) * r, land.y + Math.sin(an) * r, 2, 2, 3); } return; }
          drawOrb(a.orbX + a.wob, a.orbY, t >= 22 && t < 36);
          if (o.caught && t > tEnd) for (let i = 0; i < 3; i++) sparkle(c.x - 12 + i * 12, land.y - 10 - ((t - tEnd) % 12), t + i);
        } };
      return a;
    }

    // ---------- Evolution ----------
    function evoUpdate() {
      const e = sc.evo; e.t++;
      const T = 300;
      if (e.t < T) {
        if (G.input.pressed('b') && e.t > 20) { G.audio.sfx('back'); e.running = false; e.show = 'from'; finishWait(false); return; }
        const period = Math.max(2, Math.round(40 * (1 - e.t / T) ** 2));
        e.show = Math.floor(e.t / period) % 2 ? 'into' : 'from';
        if (e.t % period === 0) G.audio.sfx('cursor');
      } else if (e.t === T) { e.show = 'into'; e.flash = 16; G.haptic('heavy'); G.audio.sfx('levelup'); }
      if (e.flash > 0) e.flash--;
      if (e.t >= T + 30) { e.running = false; e.done = true; finishWait(true); }
    }

    // ---------- Drawing ----------
    function drawMonSprite(b) {
      const v = b.v; if (!v.show) return;
      if (v.blink && (G.frame >> 1) & 1) return;
      const spr = (G.SPR.mons || {})[b.mon.id]; if (!spr) return;
      const rows = b.side ? spr.front : spr.back;
      const base = b.side ? EPOS : PPOS;
      const cv = G.sprCanvas(rows, false, v.map);
      const s = 2 * v.scale, w = Math.round(cv.width * s), h = Math.round(cv.height * s);
      const x = Math.round(base.x + v.dx + (64 - w) / 2), y = Math.round(base.y + v.dy + 64 - h);
      if (w <= 0 || h <= 0) return;
      if (v.faintY) {
        G.ctx.save(); G.ctx.beginPath(); G.ctx.rect(base.x - 8, base.y, 80, b.side ? 60 : 64); G.ctx.clip();
        G.ctx.drawImage(cv, x, y + Math.round(v.faintY), w, h); G.ctx.restore();
      } else G.ctx.drawImage(cv, x, y, w, h);
    }
    function drawTrainer(side, dx) {
      const base = side ? EPOS : PPOS;
      let rows = side ? (S.trainer && Array.isArray(S.trainer.sprite) ? S.trainer.sprite : null) : null;
      if (!rows) rows = side ? G.SPR.battle && G.SPR.battle.trainer : G.SPR.battle && G.SPR.battle.player;
      if (!rows) return;
      const cv = G.sprCanvas(rows, false, null);
      const sc2 = Math.max(1, Math.floor(64 / Math.max(cv.width, cv.height)));
      const w = cv.width * sc2, h = cv.height * sc2;
      G.ctx.drawImage(cv, Math.round(base.x + dx + (64 - w) / 2), base.y + 64 - h, w, h);
    }
    function platform(x, y, w) {
      G.rect(x + 8, y, w - 16, 1, 2); G.rect(x + 2, y + 1, w - 4, 1, 2); G.rect(x, y + 2, w, 3, 1); G.rect(x + 2, y + 5, w - 4, 1, 2); G.rect(x + 8, y + 6, w - 16, 1, 2);
      G.rect(x + 3, y + 2, w - 6, 3, 1);
    }
    function hpBar(x, y, b) {
      const m = b.mon, f = G.clamp(b.disp / m.maxhp, 0, 1);
      G.text('HP', x, y - 2, 3);
      const bx = x + 16;
      G.rect(bx, y, 52, 6, 3); G.rect(bx + 1, y + 1, 50, 4, 0);
      const w = Math.ceil(48 * f);
      const col = f > 0.5 ? 3 : f > 0.2 ? 2 : 1;
      if (w > 0) G.rect(bx + 2, y + 2, w, 2, col);
    }
    function statusTag(m) { return m.hp <= 0 ? 'FNT' : m.status || ''; }
    function partyOrbs(x, y, party) {
      for (let i = 0; i < 6; i++) {
        const m = party[i], px = x + i * 9;
        if (!m) { G.rect(px + 2, y + 3, 3, 1, 2); continue; }
        G.rect(px + 1, y, 5, 7, 3); G.rect(px, y + 1, 7, 5, 3);
        if (m.hp > 0 && !m.status) { G.rect(px + 1, y + 1, 5, 2, 1); G.rect(px + 1, y + 4, 5, 2, 0); } else if (m.hp > 0) { G.rect(px + 1, y + 1, 5, 5, 2); } else { G.rect(px + 2, y + 2, 3, 3, 0); }
      }
    }
    function drawEnemyHud() {
      const b = S.e.b, m = b.mon;
      G.text(nm(m), 8, 2);
      const tag = statusTag(m);
      if (tag) G.text(tag, 16, 11);
      G.text('Lv' + m.lvl, 48, 11);
      hpBar(12, 21, b);
      G.rect(6, 12, 2, 18, 3); G.rect(6, 29, 76, 2, 3); G.rect(82, 28, 2, 2, 3); G.rect(84, 29, 2, 1, 3);
      if (S.kind === 'wild' && G.state.dex && G.state.dex.caught && G.state.dex.caught[m.id]) drawOrbMini(84, 3);
    }
    function drawOrbMini(x, y) { G.rect(x + 1, y, 4, 6, 3); G.rect(x, y + 1, 6, 4, 3); G.rect(x + 1, y + 1, 4, 2, 1); G.rect(x + 1, y + 3, 4, 2, 0); G.rect(x, y + 3, 6, 1, 3); }
    function drawPlayerHud() {
      const b = S.p.b, m = b.mon;
      G.text(nm(m), 80, 60);
      const tag = statusTag(m);
      if (tag) G.text(tag, 80, 69);
      G.textR('Lv' + m.lvl, 154, 69);
      hpBar(82, 79, b);
      G.textR(Math.ceil(b.disp) + '/' + m.maxhp, 154, 86);
      G.rect(80, 94, 74, 2, 2); G.rect(81, 94, 72, 1, 1);
      const xw = Math.round(72 * b.v.xp); if (xw > 0) G.rect(81, 94, xw, 2, 3);
      G.rect(154, 70, 2, 26, 3);
    }
    function drawLevelBox(lu) {
      const m = lu.mon, p = lu.prev;
      G.box(64, 0, 96, 92);
      const rows = [['HP', m.maxhp, m.maxhp - p.hp], ['ATK', m.stats.atk, m.stats.atk - p.atk], ['DEF', m.stats.def, m.stats.def - p.def], ['SPD', m.stats.spd, m.stats.spd - p.spd], ['SPC', m.stats.spc, m.stats.spc - p.spc]];
      rows.forEach((r, i) => { const y = 10 + i * 15; G.text(r[0], 72, y); G.textR(String(r[1]), 128, y); G.text('+' + r[2], 130, y, 2); });
    }
    function drawEvo() {
      const e = sc.evo, m = e.mon;
      G.clear(0);
      const id = e.done ? e.into : e.running ? (e.show === 'into' ? e.into : e.from) : m.id;
      const spr = G.SPR.mons[id]; if (!spr) return;
      const map = e.running && e.t < 300 ? (e.t > 30 ? '3333' : null) : e.flash > 0 ? '0000' : null;
      const cv = G.sprCanvas(spr.front, false, map);
      G.ctx.drawImage(cv, 48, 16, 64, 64);
      if (e.running && e.t > 30 && e.t < 300) for (let i = 0; i < 10; i++) { const an = i * 0.63 + e.t / 20, r = 40 + Math.sin(e.t / 9 + i) * 6; sparkle(80 + Math.cos(an) * r, 48 + Math.sin(an) * r * 0.7, e.t + i); }
      G.box(0, 96, 160, 48);
    }

    function drawScene() {
      if (sc.hide) { // intro over the world
        for (const a of sc.anims) a.drw && a.drw(a.t);
        return;
      }
      if (sc.evo) { drawEvo(); if (sc.lastText) sc.lastText.forEach((l, i) => G.text(l, 8, 104 + i * 16)); return; }
      G.clear(0);
      const sx = sc.shake ? ((sc.shake & 2 ? 1 : -1) * Math.ceil(sc.shake / 4)) : 0;
      G.ctx.save(); G.ctx.translate(sx, 0);
      platform(88, 52, 72); platform(0, 90, 84);
      if (sc.eTrainer) drawTrainer(1, sc.eTx);
      else if (S.e.b) { S.e.b.v.dx += sc.eTx; drawMonSprite(S.e.b); S.e.b.v.dx -= sc.eTx; }
      if (sc.pTrainer) drawTrainer(0, sc.pTx);
      else if (S.p.b) drawMonSprite(S.p.b);
      if (sc.eHud && S.e.b) drawEnemyHud();
      if (sc.pHud && S.p.b) drawPlayerHud();
      if (sc.eTrainer && S.kind === 'trainer' && !sc.hide && sc.eTx > -20) partyOrbs(8, 22, S.e.party);
      if (sc.pTrainer && !sc.hide && sc.pTx < 20) partyOrbs(96, 78, S.p.party);
      for (const a of sc.anims) a.drw && a.drw(a.t);
      G.ctx.restore();
      if (sc.flashCol >= 0) { G.rect(0, 0, 160, 96, sc.flashCol); sc.flashCol = -1; }
      if (sc.levelBox) drawLevelBox(sc.levelBox);
      if (sc.ui) sc.ui.draw();
      else {
        G.box(0, 96, 160, 48);
        if (sc.lastText && G.top() === sc) sc.lastText.forEach((l, i) => G.text(l, 8, 104 + i * 16));
      }
    }

    G.push(sc);
    return sc;
  };
})();
