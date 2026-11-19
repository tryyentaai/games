// WILDLIGHT — overworld, maps, story & cutscenes (world engineer).
// G.World.start({newGame}) · G.World.openOptions() · data for tools: G.World.MAPS (compiled), G.World.LEG, G.World.STAMPS
(function () {
  'use strict';
  const G = window.G;
  const World = (G.World = {});

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const DCH = { U: 'up', D: 'down', L: 'left', R: 'right' };
  const CHD = { up: 'U', down: 'D', left: 'L', right: 'R' };

  // =====================================================================
  // TILE LEGEND  (char -> tile def). base '@' = the map's ground tile.
  // kind: grass (encounters) · water · ledge (hop south) · door · mat (exit) · counter (talk across)
  // =====================================================================
  const LEG = {
    '.': { t: 'grass' },
    ',': { t: 'path' },
    'g': { t: 'tallgrass', kind: 'grass' },
    'h': { t: 'darkgrass', kind: 'grass' },
    'f': { t: 'flower', anim: 1 },
    'T': { t: 'tree', base: 'grass', solid: 1 },
    'D': { t: 'pine', base: 'darkfloor', solid: 1 },
    'd': { t: 'darkfloor' },
    'w': { t: 'water', anim: 1, solid: 1, kind: 'water' },
    'L': { t: 'ledge', solid: 1, kind: 'ledge' },
    '#': { t: 'fence', base: '@', solid: 1 },
    's': { t: 'sand' },
    'R': { t: 'boulder', base: '@', solid: 1 },
    'm': { t: 'cliff', solid: 1 },
    'n': { t: 'rocky' },
    'c': { t: 'cavefloor' },
    'r': { t: 'cavewall', solid: 1 },
    'j': { t: 'crystal', base: 'cavefloor', solid: 1, look: 'A cluster of glowing crystal. It feels faintly warm, like a sleeping animal.' },
    'X': { t: 'sign', base: '@', solid: 1, kind: 'sign' },
    'z': { t: 'dock' },
    'E': { t: 'cavemouth', kind: 'door' },
    '_': { t: 'floor' },
    '=': { t: 'iwall', solid: 1 },
    '|': { t: 'iwall_win', solid: 1, look: 'Sunlight pours through the window. Perfect adventure weather.' },
    'B': { t: 'bed', base: 'floor', solid: 1, look: 'A cozy bed. It is very tempting... but adventure calls!' },
    'V': { t: 'tv', base: 'floor', solid: 1, look: ['A quiz show is on.', '"Which creature naps twenty hours a day?" ...You shout "COCOONIX!" at the screen.'] },
    'P': { t: 'pc', base: 'floor', solid: 1, look: 'A humming PC. Someone left a game of solitaire running. It is losing.' },
    't': { t: 'table', base: 'floor', solid: 1 },
    'C': { t: 'counter', base: 'floor', solid: 1, kind: 'counter' },
    'k': { t: 'bookshelf', solid: 1, look: ['Rows of creature books.', 'One is titled "Fluff, Flight & Feelings".'] },
    'p': { t: 'plant', base: 'floor', solid: 1, look: 'A leafy plant. It looks well-watered and a little smug.' },
    'u': { t: 'rug' },
    'M': { t: 'mat', kind: 'mat' },
    '+': { t: 'cavefloor', kind: 'mat' },
    'x': { t: 'void', solid: 1 },
    'Q': { t: 'machine', base: 'floor', solid: 1, look: ['A research machine hums and blinks.', 'A sticky note on it says: DO NOT LICK.'] },
    'H': { t: 'hallfloor' },
    'O': { t: 'boulder', base: 'hallfloor', solid: 1 },
    'Y': { t: 'statue', base: 'hallfloor', solid: 1 },
    'S': { t: 'stairs', solid: 1, look: 'The stairs lead up to PROF. WREN\'s study. Better not snoop.' },
  };
  // Buildings: rows of tile names; door = [col,row] inside the stamp.
  const STAMPS = {
    house: { door: [1, 2], rows: [['roof_tl', 'roof_t', 'roof_t', 'roof_tr'], ['roof_bl', 'roof_b', 'roof_b', 'roof_br'], ['wall_win', 'door', 'wall', 'wall_win']] },
    lab: { door: [2, 2], rows: [['lab_roof_l', 'lab_roof', 'lab_roof_v', 'lab_roof', 'lab_roof_v', 'lab_roof_r'], ['lab_eave_l', 'lab_eave', 'lab_eave', 'lab_eave', 'lab_eave', 'lab_eave_r'], ['lab_wall_l', 'lab_win', 'lab_door', 'lab_win', 'lab_win', 'lab_wall_r']] },
    care: { door: [2, 2], rows: [['care_roof_l', 'care_roof', 'care_emblem', 'care_roof', 'care_roof_r'], ['care_eave_l', 'care_eave', 'care_eave', 'care_eave', 'care_eave_r'], ['care_win', 'care_wall', 'care_door', 'care_wall', 'care_win']] },
    mart: { door: [2, 2], rows: [['mart_roof_l', 'mart_roof', 'mart_emblem', 'mart_roof', 'mart_roof_r'], ['mart_eave_l', 'mart_eave', 'mart_eave', 'mart_eave', 'mart_eave_r'], ['mart_win', 'mart_wall', 'mart_door', 'mart_wall', 'mart_win']] },
    hall: { door: [2, 2], rows: [['hall_roof_l', 'hall_roof', 'hall_emblem', 'hall_roof', 'hall_roof_r'], ['hall_eave_l', 'hall_eave', 'hall_eave', 'hall_eave', 'hall_eave_r'], ['hall_pillar', 'hall_wall', 'hall_door', 'hall_wall', 'hall_pillar']] },
  };

  // =====================================================================
  // SMALL HELPERS (used by map scripts; defined as function declarations so maps can reference them)
  // =====================================================================
  const flag = (k) => !!(G.state.flags && G.state.flags[k]);
  const setFlag = (k, v) => { G.state.flags[k] = v === undefined ? true : v; };
  const pname = () => (G.state.player && G.state.player.name) || 'SAM';
  const rname = () => (G.state.rival && G.state.rival.name) || 'KAI';
  function vkMon() { return (G.state.party || []).find((m) => m && m.id === 'voltkit') || null; }
  function vkName() { const m = vkMon(); return (m && m.nick) || 'VOLTKIT'; }
  function addBond(n) { const m = vkMon(); if (!m) return; m.bond = G.clamp((m.bond == null ? 70 : m.bond) + n, 0, 255); }
  const ITEM_FALLBACK = { potion: ['POTION', 300], superpotion: ['SUPER POTION', 700], antidote: ['ANTIDOTE', 100], awaken: ['AWAKEN', 250], fullheal: ['FULL HEAL', 600], revive: ['REVIVE', 1500], orb: ['ORB', 200], greatorb: ['GREAT ORB', 600], repel: ['REPEL', 350] };
  function itemName(id) { const d = G.DATA.items && G.DATA.items[id]; return (d && d.name) || (ITEM_FALLBACK[id] ? ITEM_FALLBACK[id][0] : String(id).toUpperCase()); }
  function itemPrice(id) { const d = G.DATA.items && G.DATA.items[id]; if (d && d.price != null) return d.price; return ITEM_FALLBACK[id] ? ITEM_FALLBACK[id][1] : 0; }
  function itemDesc(id) { const d = G.DATA.items && G.DATA.items[id]; return (d && d.desc) || ''; }
  function giveItem(id, n) { G.state.bag[id] = (G.state.bag[id] || 0) + (n || 1); }
  function aOrAn(s) { return /^[AEIOU]/i.test(s) ? 'an' : 'a'; }
  function healAll() {
    if (G.healParty) G.healParty();
    else (G.state.party || []).forEach((m) => { m.hp = m.maxhp; m.status = null; (m.moves || []).forEach((mv) => { const md = G.DATA.moves && G.DATA.moves[mv.id]; if (md) mv.pp = md.pp; }); });
  }
  function makeMon(id, lvl) {
    if (G.makeMon) return G.makeMon(id, lvl);
    return { id, nick: null, lvl, xp: 0, hp: 20, maxhp: 20, stats: { atk: 10, def: 10, spd: 10, spc: 10 }, moves: [], status: null, bond: 70, dv: {} };
  }
  function chr(n) { return (G.SPR.chars && G.SPR.chars[n]) || null; }
  const PRIZE = { SCOUT: 15, LASS: 15, 'BUG KID': 10, HIKER: 25, SAILOR: 25, SWIMMER: 20, RANGER: 25, RIVAL: 35, WARDEN: 100 };
  function trainerOpts(name, cls, spr, party, lose) {
    const top = Math.max(...party.map((p) => p[1]));
    const c = chr(spr);
    return { name, cls, sprite: c ? c.down[0] : null, prize: top * (PRIZE[cls] || 20), loseText: lose };
  }

  // =====================================================================
  // MAPS
  // =====================================================================
  const MAPS = {};

  // ---------- HOME ----------
  MAPS.home = {
    name: 'HOME', music: 'town', indoor: true, border: 'x',
    rows: [
      '==|==|==',
      '______VB',
      '________',
      '________',
      '__tt____',
      '__tt____',
      'p______p',
      '___M____',
    ],
    warps: [{ x: 3, y: 7, to: 'hollowbrook', tx: 3, ty: 7, dir: 'down' }],
    npcs: [
      { id: 'mom', spr: 'mom', x: 4, y: 5, dir: 'left', move: 'look', talk: momTalk },
    ],
    look: [{ x: 2, y: 4, text: 'Breakfast leftovers. Mom made toast shaped like a star. It is slightly burnt. You love it.' }, { x: 3, y: 4, text: 'A note on the table: "Proud of you already. -Mom"' }],
  };

  // ---------- HOLLOWBROOK ----------
  MAPS.hollowbrook = {
    name: 'HOLLOWBROOK', music: 'town', border: 'T',
    rows: [
      'TTTTTTTTT,,TTTTTTTTT',
      'T........,,........T',
      'T.ff.....,,.....ff.T',
      'T........,,........T',
      'T........,,........T',
      'T........,,........T',
      'T........,,........T',
      'T..,,,,,,,,,,,,,...T',
      'T.......X,,........T',
      'T.f...,,,,,,,,..f..T',
      'T.....,......,.wwwwT',
      'Tmmmm.,......,.wwwwT',
      'Tmmmm.,......,.wwwwT',
      'TmmEm.,......,.wwwwT',
      'T..,,,,,,,,,,,.....T',
      'T..f.......X..f....T',
      'T........f.........T',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    stamps: [
      { s: 'house', x: 2, y: 4, to: 'home', tx: 3, ty: 7 },
      { s: 'house', x: 14, y: 4, to: 'cottage', tx: 3, ty: 7, ret: true },
      { s: 'lab', x: 7, y: 11, to: 'lab', tx: 4, ty: 11 },
    ],
    warps: [{ x: 3, y: 13, to: 'aurora', tx: 6, ty: 15, dir: 'up' }],
    conn: { n: { to: 'route1', off: 0 } },
    signs: [
      { x: 8, y: 8, text: ['HOLLOWBROOK TOWN', 'Where small steps start big journeys.'] },
      { x: 11, y: 15, text: ['WREN LAB', 'Creature Research & Very Strong Coffee'] },
    ],
    npcs: [
      { id: 'kid', spr: 'kid', x: 6, y: 2, move: 'wander', talk: () => flag('got_starter')
        ? ['Whoa, is that a VOLTKIT? It follows you like a puppy!', 'A crackly, sparky puppy!']
        : ['PROF. WREN\'s LAB is the big building down south.', 'She has a whole room of blinking gizmos!'] },
      { id: 'gran', spr: 'lass', x: 16, y: 9, move: 'wander', talk: () => flag('game_clear')
        ? ['They say you climbed all the way up SKYRIDGE!', 'When I was your age, I climbed... the stairs. Twice!']
        : ['A family of FLUFFIN hatched by the pond this spring.', 'Ah, to be young and fluffy.'] },
      { id: 'crystal', img: 'crystal', x: 3, y: 13, cond: () => !flag('aurora_open'), talk: ['A wall of pale crystal seals the cave.', 'It hums softly... like it is waiting for something.'] },
      { id: 'fisher', spr: 'sailor', x: 14, y: 11, dir: 'right', move: 'still', talk: () => flag('aurora_open')
        ? ['Did you see? The crystal by the cliffs melted into light!', 'Something is glowing in that cave...']
        : ['Not a single bite all morning.', 'The pond FLUFFIN keep stealing my bait. I think they are laughing at me.'] },
    ],
    triggers: [
      { x: 9, y: 1, w: 2, h: 1, cond: () => !flag('got_starter'), run: profStop },
    ],
  };

  // ---------- COTTAGE (shared house interior; who's home depends on the town you came from) ----------
  const fromTown = (t) => () => G.state.ret && G.state.ret.map === t;
  MAPS.cottage = {
    name: 'HOUSE', music: 'town', indoor: true, border: 'x',
    rows: [
      '=k=|=|==',
      'p______V',
      '________',
      '__tt____',
      '__tt____',
      '________',
      'B______p',
      '___M____',
    ],
    warps: [{ x: 3, y: 7, to: '@ret' }],
    npcs: [
      { id: 'sis', spr: 'lass', x: 5, y: 2, move: 'look', cond: fromTown('hollowbrook'), talk: () => flag('game_clear')
        ? ['{RIVAL} says you two are friends now.', 'He smiled when he said it. Gross!']
        : flag('got_starter')
          ? ['{RIVAL} mails home postcards. Every single one says "I\'m winning."', 'Mom pins them all up anyway.']
          : ['{RIVAL} left at sunrise.', 'He ate breakfast standing up so he could be first to the LAB!'] },
      { id: 'oldman', spr: 'hiker', x: 2, y: 2, move: 'look', cond: fromTown('fernhaven'), talk: oldManTalk },
      { id: 'fishlady', spr: 'sailor', x: 5, y: 4, move: 'look', cond: fromTown('lumenbay'), talk: fishLadyTalk },
    ],
  };

  // ---------- LAB ----------
  MAPS.lab = {
    name: 'WREN LAB', music: 'lab', indoor: true, border: 'x',
    rows: [
      'kk=||=|=kk',
      'QQ______QQ',
      '__________',
      '_______tt_',
      '__________',
      '__________',
      'kk______kk',
      '__________',
      'p________p',
      '__________',
      'S_________',
      '____MM____',
    ],
    warps: [{ x: 4, y: 11, to: 'hollowbrook', tx: 9, ty: 14, dir: 'down' }, { x: 5, y: 11, to: 'hollowbrook', tx: 9, ty: 14, dir: 'down' }],
    npcs: [
      { id: 'prof', spr: 'prof', x: 4, y: 2, dir: 'down', move: 'still', talk: profTalk },
      { id: 'kai', spr: 'rival', x: 5, y: 3, dir: 'up', move: 'still', cond: () => !flag('got_starter'), talk: ['{RIVAL}: Gramps says I was born impatient.', 'I say the PROF is just slow!'] },
      { id: 'aide', spr: 'lass', x: 8, y: 9, move: 'wander', talk: () => flag('got_starter')
        ? ['I\'m sweeping up window glass.', 'VOLTKIT sure knows how to make an entrance!']
        : ['PROF. WREN has been up since four.', 'She was so excited she sorted every book by color. Twice.'] },
    ],
    look: [{ x: 7, y: 3, text: 'An empty spot where an ORB was resting. A note says: "SPROUTLE - for a patient trainer."' }, { x: 8, y: 3, text: 'A mug of very strong coffee. It is somehow still steaming.' }],
    onEnter: () => { if (!flag('got_starter')) cut(labScene); },
  };

  // ---------- ROUTE 1 ----------
  MAPS.route1 = {
    name: 'ROUTE 1', music: 'route', border: 'T',
    rows: [
      'TTTTTTTTT,,TTTTTTTTT',
      'T........,,.......TT',
      'T.ggggg..,,..gggg.TT',
      'T.ggggg..,,..gggg..T',
      'T.ggggg..,,........T',
      'T........,,..X.....T',
      'TLLLLLLL.,,.LLLLLLLT',
      'T........,,........T',
      'T..TT....,,....gg..T',
      'T..TT..gg,,gg..gg..T',
      'T......gg,,gg......T',
      'T......gg,,gg...R..T',
      'T........,,........T',
      'TTTTTT...,,...TTTTTT',
      'T........,,........T',
      'T.gggggg.,,........T',
      'T.gggggg.,,..ff..f.T',
      'T.gggggg.,,........T',
      'T........,,,,,,,...T',
      'TLLLLLLLL.....,LLLLT',
      'T.............,....T',
      'T..gggg.......,.ggTT',
      'T..gggg.......,.ggTT',
      'T..gggg..,,,,,,.ggTT',
      'T........,.........T',
      'T..TT....,....TT...T',
      'T..TT....,....TT...T',
      'T........,,........T',
      'TLLLLLL..,,..LLLLLLT',
      'T........,,........T',
      'T.gggg...,,...gggg.T',
      'T.gggg...,,...gggg.T',
      'T........,,........T',
      'T..f.....,,.....f..T',
      'T........,,........T',
      'TTTTTTTTT,,TTTTTTTTT',
    ],
    conn: { n: { to: 'fernhaven', off: 2 }, s: { to: 'hollowbrook', off: 0 } },
    enc: { rate: 10, grass: [['nibblet', 2, 4, 35], ['fluffin', 2, 5, 35], ['fuzzbug', 3, 5, 30]] },
    signs: [{ x: 13, y: 5, text: ['ROUTE 1', 'North: FERNHAVEN CITY  South: HOLLOWBROOK TOWN'] }],
    npcs: [
      { id: 'ledgekid', spr: 'kid', x: 5, y: 12, move: 'wander', talk: ['If you hop down a ledge, you can\'t climb back up.', 'Ledges are one-way. Like birthdays!'] },
      { id: 'tiplass', spr: 'lass', x: 12, y: 33, move: 'look', talk: ['Wild creatures hide in tall grass.', 'Wear one down first, THEN toss an ORB. Patience is half the catch!'] },
      { id: 'toby', spr: 'kid', x: 17, y: 20, dir: 'left', move: 'still',
        trainer: { cls: 'SCOUT', name: 'TOBY', party: [['nibblet', 4], ['fuzzbug', 3]], intro: 'Hey! You\'ve got a creature too? Let\'s battle! I\'ve been practicing my battle face.', lose: 'My battle face... needs work.', after: ['I\'m gonna train by the ledges.', 'Did you know running is faster if you hold B? I just found out today.'] } },
    ],
    items: [{ id: 'orb', x: 17, y: 1, item: 'orb' }, { id: 'potion', x: 2, y: 15, item: 'potion' }, { id: 'hid1', x: 16, y: 11, item: 'antidote', hidden: true }],
  };

  // ---------- FERNHAVEN ----------
  MAPS.fernhaven = {
    name: 'FERNHAVEN', music: 'town', border: 'T',
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTT',
      'T.ff..................fT',
      'T......................T',
      'T......................T',
      'T..........,,..........T',
      'T..........,,..........T',
      'T..........,,..........T',
      'T..........,,..........T',
      'T..........,,..........T',
      'T...,......,,....,.....T',
      'T,,,,,,,,,,,,,,,,,,,,,,,',
      'T..........,,X.........T',
      'T.f........,,.......f..T',
      'T..........,,..........T',
      'T..........,,..........T',
      'T..........,,..........T',
      'T..,.......,,.....,....T',
      'T..,,,,,,,,,,,,,,,,....T',
      'T.ff.......,,.......ff.T',
      'TTTTTTTTTTT,,TTTTTTTTTTT',
    ],
    stamps: [
      { s: 'hall', x: 9, y: 1, to: 'hall_basalt', tx: 4, ty: 13 },
      { s: 'care', x: 2, y: 6, to: 'care', tx: 4, ty: 7, ret: true },
      { s: 'mart', x: 15, y: 6, to: 'mart', tx: 4, ty: 7, ret: true },
      { s: 'house', x: 2, y: 13, to: 'cottage', tx: 3, ty: 7, ret: true },
      { s: 'house', x: 17, y: 13, locked: ['The door is locked.', 'A note: "GONE FISHING IN LUMEN BAY. BACK WHEN THEY BITE."'] },
    ],
    conn: { s: { to: 'route1', off: -2 }, e: { to: 'whisperwood', off: -8 } },
    signs: [{ x: 13, y: 11, text: ['FERNHAVEN CITY', 'Green roofs, stone hearts.'] }],
    npcs: [
      { id: 'ranger', spr: 'hiker', x: 22, y: 10, dir: 'left', move: 'still', cond: () => !flag('badge_stone'), talk: ['RANGER: Hold on there!', 'WHISPERWOOD twists and turns. Folks get lost for days.', 'WARDEN BASALT asks that only STONE BADGE holders go in. His HALL is up north.'] },
      { id: 'ranger2', spr: 'hiker', x: 22, y: 9, dir: 'down', move: 'still', cond: () => flag('badge_stone'), talk: ['RANGER: A STONE BADGE! Then the woods are open to you.', 'Mind the whispering trees. They give terrible directions.'] },
      { id: 'cheer', spr: 'lass', x: 7, y: 12, move: 'wander', talk: ['BASALT\'s HALL is at the top of town.', 'He\'s tough, but he gives the BEST pep talks. I cried a little.'] },
      { id: 'orbkid', spr: 'kid', x: 19, y: 4, move: 'wander', talk: ['The MART sells ORBS! I bought ten.', 'Then I tripped down the steps. Now I have zero ORBS and one bruise.'] },
      { id: 'boatman', spr: 'sailor', x: 14, y: 17, move: 'look', talk: ['I\'m saving up for a boat.', 'So far I have one oar and a very good attitude.'] },
    ],
    triggers: [{ x: 21, y: 10, w: 2, h: 1, cond: () => flag('badge_stone') && !flag('beat_rival2'), run: rival2Scene }],
  };

  // ---------- CARE CENTER (shared) ----------
  MAPS.care = {
    name: 'CARE CENTER', music: 'town', indoor: true, border: 'x',
    rows: [
      '=|==kk==|=',
      'p_____Q__P',
      '__CCCCCC__',
      '__________',
      '__________',
      '__u____u__',
      'p________p',
      '____MM____',
    ],
    warps: [{ x: 4, y: 7, to: '@ret' }, { x: 5, y: 7, to: '@ret' }],
    npcs: [
      { id: 'nurse', spr: 'nurse', x: 4, y: 1, dir: 'down', move: 'still', talk: nurseTalk },
      { id: 'visitor', spr: 'kid', x: 7, y: 4, move: 'wander', cond: fromTown('fernhaven'), talk: ['The NURSE healed my NIBBLET in three seconds flat.', 'I timed it. I time everything.'] },
      { id: 'visitor2', spr: 'sailor', x: 1, y: 4, move: 'look', cond: fromTown('lumenbay'), talk: ['CORAL\'s HALL is full of pools.', 'Bring something that doesn\'t mind getting splashed!'] },
    ],
    look: [{ x: 6, y: 1, text: 'A healing machine. Six little ORB slots glow a gentle gold.' }, { x: 9, y: 1, text: ['A public PC.', 'Your storage box is safe and sound. (Party is managed from the START menu.)'] }],
  };

  // ---------- MART (shared) ----------
  MAPS.mart = {
    name: 'MART', music: 'town', indoor: true, border: 'x',
    rows: [
      '=|==|=kk',
      '_C____kk',
      '_C______',
      'CC______',
      '________',
      '__kk__kk',
      '________',
      '____M___',
    ],
    warps: [{ x: 4, y: 7, to: '@ret' }],
    npcs: [
      { id: 'clerk', spr: 'clerk', x: 0, y: 2, dir: 'right', move: 'still', talk: clerkTalk },
      { id: 'shopper', spr: 'lass', x: 5, y: 3, move: 'wander', talk: () => G.state.ret && G.state.ret.map === 'lumenbay'
        ? ['GREAT ORBS catch better than plain ones.', 'I use them on very important creatures. Like my cat.']
        : ['POTIONS heal 20 HP. I always carry five.', 'My mom says six. We are negotiating.'] },
    ],
    look: [{ x: 2, y: 5, text: 'Shelves stacked with ORBS, POTIONS and snacks with suspicious mascots.' }, { x: 6, y: 1, text: 'Neat rows of POTIONS. One is turned the wrong way. You fix it. Much better.' }],
  };

  // ---------- WARDEN HALL: BASALT ----------
  MAPS.hall_basalt = {
    name: 'BASALT HALL', music: 'town', indoor: true, border: 'x',
    rows: [
      '==========',
      'OHHHHHHHHO',
      'OHHHHHHHHO',
      'OOOHHHHOOO',
      'HHHHHHHHHH',
      'HOOHHHHOOH',
      'HHHHHHHHHH',
      'OOHHHHHHOO',
      'HHHHHHHHHH',
      'HHOOHHOOHH',
      'HHHHHHHHHH',
      'OHHHHHHHHO',
      'HHHYHHYHHH',
      'HHHHMMHHHH',
    ],
    warps: [{ x: 4, y: 13, to: 'fernhaven', tx: 11, ty: 4, dir: 'down' }, { x: 5, y: 13, to: 'fernhaven', tx: 11, ty: 4, dir: 'down' }],
    npcs: [
      { id: 'basalt', spr: 'warden_basalt', x: 4, y: 1, dir: 'down', move: 'still', talk: basaltTalk },
      { id: 'dell', spr: 'hiker', x: 8, y: 8, dir: 'left', move: 'still',
        trainer: { cls: 'HIKER', name: 'DELL', party: [['pebbit', 9]], intro: 'Halt! To reach BASALT, you must first climb... ME!', lose: 'I have been... summited.', after: ['BASALT once arm-wrestled a BOULDURR.', 'It was a tie. They\'re best friends now.'] } },
      { id: 'guide', spr: 'kid', x: 1, y: 12, dir: 'right', move: 'still', talk: ['Hey, challenger! BASALT\'s ROCK creatures are tough as old boots.', 'GRASS or WATER moves crack them best.', 'Got neither? Train up on ROUTE 1 and hit hard. Believe in your buddy!'] },
    ],
    look: [{ x: 3, y: 12, text: () => ['FERNHAVEN WARDEN HALL', 'WARDEN: BASALT', flag('badge_stone') ? 'Recent challengers: {RIVAL}, {PLAYER}' : 'Recent challengers: {RIVAL}'] }, { x: 6, y: 12, text: ['"Stand firm. Grow slow. Never crumble."', '- BASALT'] }],
  };

  // ---------- WHISPERWOOD (forest maze) ----------
  MAPS.whisperwood = {
    name: 'WHISPERWOOD', music: 'forest', border: 'D', ground: 'darkfloor',
    rows: [
      'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      'DddddddXdDDDDDhhhhhhhhhDDDDDDD',
      'dddddddddDDDDDhhhhhhhhhDDDDDDD',
      'DddddddddddddddddddddddDDDDDDD',
      'DDDDDDdddddddddddddddddDDDDDDD',
      'DDDDDDDDDDDDDDDDDDDDDddDDDDDDD',
      'DDDDDDDDDDDDDDDDDDDDDddDDDDDDD',
      'DDDDDDDDDDDdddhhhhdddddDDDDDDD',
      'DDDDDDDDDDDdddhhhhdddddDDDDDDD',
      'DDDDDDDDDDDDDDDDDDDDDddDDDDDDD',
      'DDDDDDDDDDDDDDDDDDDDDddDDDDDDD',
      'DDDdddddhhhhhhdddddddddDDDDDDD',
      'DDDdddddhhhhhhdddddddddDDDDDDD',
      'DDDddDDDDDDDDDDDDDDDDDDDDDDDDD',
      'DDDddDdddddddDDDDDDddhhhhhhDDD',
      'DDDddDdhhhdddDDDDDDhhhhhhhhDDD',
      'DDDddDdhhhdddDDDDDDhhhhhhhhDDD',
      'DDDddDDDDddDDDDDDDDhhhhhhhhDDD',
      'DDDddDDDDddDDDDDDDDDDDddDDDDDD',
      'DDDdddhhhhhdddddDDDDDDddDDDDDD',
      'DDDdddhhhhhdddddDDDDDDddDddddD',
      'DDDDDDDDDDDDDDddDDDDDDddDdhhdD',
      'DDDDDDDDDDDDDDddDDDDDDddddhhdD',
      'DDDDDDDDDDDDDDddDDDDDDddDddddD',
      'DDDDDDDDDDDDDDddDDDDDDddDDDDDD',
      'DDDDDDDDDDDDDDddDDDDDDddDDDDDD',
      'DDDDDDDDDDDDDDdddhhhhddddddddd',
      'DDDDDDDDDDDDDDdddhhhhddddddddd',
      'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
    ],
    conn: { w: { to: 'fernhaven', off: 8 }, e: { to: 'lumenbay', off: -21 } },
    enc: { rate: 9, grass: [['fuzzbug', 8, 10, 22], ['cocoonix', 9, 11, 20], ['sparkfly', 9, 12, 20], ['mossprite', 10, 12, 30], ['wispurr', 11, 13, 8]] },
    signs: [{ x: 7, y: 1, text: ['WHISPERWOOD', 'If the trees start giving you directions, do NOT listen.'] }],
    npcs: [
      { id: 'lost', spr: 'lass', x: 4, y: 2, move: 'look', talk: ['I\'ve walked past this same tree six times.', 'I\'ve named it GERALD. GERALD is my friend now.'] },
      { id: 'pip', spr: 'bugkid', x: 20, y: 4, dir: 'left', move: 'still',
        trainer: { cls: 'BUG KID', name: 'PIP', party: [['fuzzbug', 9], ['cocoonix', 10]], intro: 'My net caught something big today... YOU! Battle!', lose: 'Aww, my bugs need a snack break.', after: 'COCOONIX looks sleepy, but inside it\'s working super hard on becoming something amazing.' } },
      { id: 'nell', spr: 'bugkid', x: 4, y: 14, dir: 'down', move: 'still',
        trainer: { cls: 'BUG KID', name: 'NELL', party: [['sparkfly', 11]], intro: 'Bzzt! My SPARKFLY saw your VOLTKIT\'s tail. They\'re basically cousins! Let\'s battle!', lose: 'Bzzt... bzzzzt. That means "good game."', after: 'At night SPARKFLY swarms light up the whole forest. It\'s the prettiest thing ever.' } },
      { id: 'bram', spr: 'hiker', x: 15, y: 24, dir: 'up', move: 'still',
        trainer: { cls: 'HIKER', name: 'BRAM', party: [['mossprite', 10], ['pebbit', 11]], intro: 'I came to the forest to find myself. Instead I found YOU. Battle!', lose: 'I found... a lesson.', after: ['LUMEN BAY is just east of here.', 'Follow the path, and you\'ll smell the sea before you see it.'] } },
    ],
    items: [
      { id: 'potion', x: 22, y: 1, item: 'potion' }, { id: 'antidote', x: 6, y: 14, item: 'antidote' },
      { id: 'revive', x: 19, y: 17, item: 'revive' }, { id: 'awaken', x: 27, y: 21, item: 'awaken' }, { id: 'greatorb', x: 28, y: 22, item: 'greatorb' },
      { id: 'hid1', x: 11, y: 7, item: 'superpotion', hidden: true }, { id: 'hid2', x: 1, y: 3, item: 'orb', hidden: true },
    ],
  };

  // ---------- LUMEN BAY ----------
  MAPS.lumenbay = {
    name: 'LUMEN BAY', music: 'town', border: 'T', edge: { s: 'w', e: 'w' },
    rows: [
      'TTTTTTTTTTT,,TTTTTTTTTTT',
      'T..........,,..........T',
      'T.ff.......,,.......f..T',
      'T..........,,..........T',
      'T..........,,...,......T',
      ',,,,,,,,,,,,,,,,,......T',
      ',..........,,..........T',
      'T..........,,.....X....T',
      'T..........,,..........T',
      'T..........,,..........T',
      'T..........,,..........T',
      'T....,.....,,...,...,..T',
      'T,,,,,,,,,,,,,,,,,,,,,,T',
      'Tsssssssssssssssssssssss',
      'Tsssssssssszzsssssssssss',
      'Twwwwwwwwwwzzwwwwwwwwwww',
      'Twwwwwwwwwwzzwwwwwwwwwww',
      'Twwwwwwwwwwzzwwwwwwwwwww',
      'Twwwwwwwwwwwwwwwwwwwwwww',
      'Twwwwwwwwwwwwwwwwwwwwwww',
    ],
    stamps: [
      { s: 'hall', x: 14, y: 1, to: 'hall_coral', tx: 4, ty: 13 },
      { s: 'care', x: 3, y: 8, to: 'care', tx: 4, ty: 7, ret: true },
      { s: 'mart', x: 14, y: 8, to: 'mart', tx: 4, ty: 7, ret: true },
      { s: 'house', x: 19, y: 8, to: 'cottage', tx: 3, ty: 7, ret: true },
    ],
    conn: { w: { to: 'whisperwood', off: 21 }, n: { to: 'skyridge', off: -2 } },
    signs: [{ x: 18, y: 7, text: ['LUMEN BAY', 'Where the tide sings you home.'] }],
    npcs: [
      { id: 'guard', spr: 'hiker', x: 11, y: 1, dir: 'down', move: 'still', cond: () => !flag('badge_tide'), talk: ['Whoa there! SKYRIDGE trail is closed. Rockslides.', 'WARDEN CORAL only lets TIDE BADGE holders climb. Her HALL is just over there.'] },
      { id: 'rope', img: 'fence', x: 12, y: 1, cond: () => !flag('badge_tide'), talk: ['A rope barrier with a sign:', '"SKYRIDGE TRAIL - TIDE BADGE HOLDERS ONLY."'] },
      { id: 'guard2', spr: 'hiker', x: 10, y: 1, dir: 'right', move: 'still', cond: () => flag('badge_tide'), talk: ['The TIDE BADGE! Up you go.', 'Wild creatures on SKYRIDGE are tough. Stock up on POTIONS first!'] },
      { id: 'dock', spr: 'sailor', x: 12, y: 17, dir: 'down', move: 'still', talk: ['The sea\'s calm today.', 'One day I\'ll sail past the horizon. Right after I finish my sandwich.'] },
      { id: 'beach', spr: 'lass', x: 7, y: 13, move: 'wander', talk: ['At night the waves glow gold. That\'s why it\'s called LUMEN BAY.', 'Or maybe it\'s the lighthouse. Nobody remembers!'] },
      { id: 'shellkid', spr: 'kid', x: 20, y: 5, move: 'wander', talk: ['I found a shell that looks exactly like a SHELLOP.', '...It was a SHELLOP. It bit me. We\'re friends now.'] },
    ],
    items: [{ id: 'hid1', x: 22, y: 14, item: 'superpotion', hidden: true }],
  };

  // ---------- WARDEN HALL: CORAL ----------
  MAPS.hall_coral = {
    name: 'CORAL HALL', music: 'town', indoor: true, border: 'x',
    rows: [
      '==========',
      'wHHHHHHHHw',
      'wHHHHHHHHw',
      'wwwHHHHwww',
      'HHHHHHHHHH',
      'HwwwHHwwwH',
      'HwwwHHwwwH',
      'HHHHHHHHHH',
      'wwHHHHHHww',
      'wwHHHHHHww',
      'HHHHHHHHHH',
      'HHwwHHwwHH',
      'HHHYHHYHHH',
      'HHHHMMHHHH',
    ],
    warps: [{ x: 4, y: 13, to: 'lumenbay', tx: 16, ty: 4, dir: 'down' }, { x: 5, y: 13, to: 'lumenbay', tx: 16, ty: 4, dir: 'down' }],
    npcs: [
      { id: 'coral', spr: 'warden_coral', x: 4, y: 1, dir: 'down', move: 'still', talk: coralTalk },
      { id: 'gus', spr: 'sailor', x: 8, y: 7, dir: 'left', move: 'still',
        trainer: { cls: 'SAILOR', name: 'GUS', party: [['puddlet', 13], ['shellop', 14]], intro: 'Ahoy! Nobody reaches CORAL without getting a little wet!', lose: 'Man overboard! ...That\'s me. I\'m the man.', after: 'CORAL taught me to swim. I taught her to tie knots. Fair trade!' } },
      { id: 'marina', spr: 'lass', x: 1, y: 10, dir: 'right', move: 'still',
        trainer: { cls: 'SWIMMER', name: 'MARINA', party: [['puddlet', 13], ['puddlet', 15]], intro: 'I swim forty laps a day! Battling you will be lap forty-one!', lose: 'Ugh, I need a towel AND a nap.', after: 'Electric moves zap water types extra hard. Just saying. I never said it.' } },
    ],
    look: [{ x: 3, y: 12, text: () => ['LUMEN BAY WARDEN HALL', 'WARDEN: CORAL', flag('badge_tide') ? 'Recent challengers: {RIVAL}, {PLAYER}' : 'Recent challengers: {RIVAL}'] }, { x: 6, y: 12, text: ['"Be like the tide. Patient, then unstoppable."', '- CORAL'] }],
  };

  // ---------- SKYRIDGE PATH ----------
  MAPS.skyridge = {
    name: 'SKYRIDGE', music: 'route', border: 'm', ground: 'rocky',
    rows: [
      'mmmmmmmmmnnmmmmmmmmm',
      'mmnnnnnnnnnnnnnnnnmm',
      'mmnggggnnnnnnggggnmm',
      'mmnggggnnnnnnggggnmm',
      'mmnnnnnnnnnnnnnnnnmm',
      'mmLLLLLLLnnLLLLLLLmm',
      'mmnnnnnnnnnnnnnnnnmm',
      'mmmmmmnnnnnnnnmmmmmm',
      'mmwwwmnnnnnnnnmgggmm',
      'mmwwwnnnnnnnnnngggmm',
      'mmwwwnnnmmmmnnngggmm',
      'mmnnnnnnmmmmnnnnnnmm',
      'mmggggnnmmmmnnnnnnmm',
      'mmggggnnnnnnnnnnnnmm',
      'mmLLLLLLLLLLLLnnnnmm',
      'mmnnnnnnnnnnnnnnnnmm',
      'mmnnnngggggggnnnnnmm',
      'mmnnnngggggggnnmmmmm',
      'mmnnnngggggggnnmmmmm',
      'mmnnnnnnnnnnnnnmmmmm',
      'mmmmmmmmmmnnnnnmmmmm',
      'mmgggnnnnnnnnnnnnnmm',
      'mmgggnnnnnnnnnnnnnmm',
      'mmnnnnnLLLLLLLLLLLmm',
      'mmnnnnnnnnnnnnnnnnmm',
      'mmnnnnnnnnmmmmmnnnmm',
      'mmggggnnnnmmmmmnnnmm',
      'mmggggnnnnmmmmmgggmm',
      'mmggggnnnnnnnnngggmm',
      'mmnnnnnnnnnnnnngggmm',
      'mmLLLLLLnnnnLLLLLLmm',
      'mmnnnnnnnnnnnnnnnnmm',
      'mmnnnnnnnnnnnXnnnnmm',
      'mmmmmmmnnnnnnmmmmmmm',
      'mmmmmmmnnnnnnmmmmmmm',
      'mmmmmmmmmnnmmmmmmmmm',
    ],
    conn: { s: { to: 'lumenbay', off: 2 }, n: { to: 'summit', off: -2 } },
    enc: { rate: 9, grass: [['pebbit', 15, 18, 25], ['hootlet', 15, 18, 25], ['puddlet', 15, 17, 15], ['shellop', 16, 18, 25], ['cindercub', 16, 18, 10]] },
    signs: [{ x: 13, y: 32, text: ['SKYRIDGE PATH', 'Summit ahead. Wind: strong. Views: stronger.'] }],
    npcs: [
      { id: 'roc', spr: 'hiker', x: 16, y: 15, dir: 'left', move: 'still',
        trainer: { cls: 'HIKER', name: 'ROC', party: [['pebbit', 17], ['bouldurr', 20]], intro: 'You climb, I climb, we all climb! But only one of us wins!', lose: 'I\'ve hit rock bottom. On a mountain. Impressive.', after: 'Ledges up here are shortcuts DOWN. Going up, you gotta take the long way. Like life!' } },
      { id: 'ivy', spr: 'lass', x: 3, y: 19, dir: 'right', move: 'still',
        trainer: { cls: 'LASS', name: 'IVY', party: [['hootlet', 17], ['galewing', 18]], intro: 'My birds ride these winds every day. Can you keep up?', lose: 'Blown away... literally.', after: 'HOOTLET can see your feelings. Mine says you\'re nervous about the summit. Don\'t be!' } },
      { id: 'dev', spr: 'kid', x: 12, y: 28, dir: 'left', move: 'still',
        trainer: { cls: 'SCOUT', name: 'DEV', party: [['cindercub', 17], ['gnashrat', 18]], intro: 'I climbed all this way to find a CINDERCUB. I found one! Wanna see? BATTLE!', lose: 'At least CINDERCUB kept my hands warm.', after: 'Your rival passed by earlier. He said, and I quote, "Tell {PLAYER} to hurry up."' } },
    ],
    items: [{ id: 'potion', x: 2, y: 2, item: 'superpotion' }, { id: 'fullheal', x: 17, y: 8, item: 'fullheal' }, { id: 'revive', x: 2, y: 21, item: 'revive' }, { id: 'hid1', x: 3, y: 12, item: 'greatorb', hidden: true }],
  };

  // ---------- SKYRIDGE SUMMIT ----------
  MAPS.summit = {
    name: 'SUMMIT', music: 'route', border: 'm', ground: 'rocky',
    rows: [
      'mmmmmmmmmmmmmmmm',
      'mmmmnnnnnnnnmmmm',
      'mmmnnnnnnnnnXmmm',
      'mmnnnnnnnnnnnnmm',
      'mmnnnnnnnnnnnnmm',
      'mmnnnnnnnnnnnnmm',
      'mmnnnnnnnnnnnnmm',
      'mmnnnnnnnnnnnnmm',
      'mmnfnnnnnnnnfnmm',
      'mmnnnnnnnnnnnnmm',
      'mmmnnnnnnnnnnmmm',
      'mmmmnnnnnnnnmmmm',
      'mmmmmmnnnnmmmmmm',
      'mmmmmmmnnmmmmmmm',
    ],
    conn: { s: { to: 'skyridge', off: 2 } },
    signs: [{ x: 12, y: 2, text: () => flag('game_clear') ? ['SKYRIDGE SUMMIT', 'Scratched below: "{RIVAL} + {PLAYER} + VOLTKIT were here."'] : ['SKYRIDGE SUMMIT', 'The sky is close enough to touch.'] }],
    npcs: [
      { id: 'kai', spr: 'rival', x: 7, y: 3, dir: 'down', move: 'still', cond: () => !flag('beat_rival_final'), talk: finalScene },
    ],
    triggers: [{ x: 2, y: 9, w: 12, h: 1, cond: () => !flag('beat_rival_final'), run: finalScene }],
  };

  // ---------- AURORA CAVE (post-game) ----------
  MAPS.aurora = {
    name: 'AURORA CAVE', music: 'cave', indoor: true, border: 'r', ground: 'cavefloor',
    rows: [
      'rrrrrrrrrrrrrr',
      'rrrrcccccrrrrr',
      'rrrcccccccrrrr',
      'rrcccccccccrrr',
      'rrcjcccccjcrrr',
      'rrrcccccccrrrr',
      'rwwrrcccrrrwwr',
      'rwwccccccccwwr',
      'rrcccccccccccr',
      'rrcccrrrrccccr',
      'rcccccrrccccrr',
      'rccccccccccrrr',
      'rrrcccccccrrrr',
      'rrrrcccccrrrrr',
      'rrrrrcccrrrrrr',
      'rrrrrr++rrrrrr',
    ],
    warps: [{ x: 6, y: 15, to: 'hollowbrook', tx: 3, ty: 14, dir: 'down' }, { x: 7, y: 15, to: 'hollowbrook', tx: 3, ty: 14, dir: 'down' }],
    npcs: [{ id: 'auroryx', img: 'mon:auroryx', x: 6, y: 3, dir: 'down', move: 'still', cond: () => !flag('caught_auroryx'), talk: auroryxTalk }],
    items: [{ id: 'hid1', x: 12, y: 8, item: 'revive', hidden: true }, { id: 'greatorb', x: 2, y: 10, item: 'greatorb' }],
  };

  // =====================================================================
  // COMPILE
  // =====================================================================
  function tileDef(src, ground) {
    const d = Object.assign({}, src);
    if (d.base === '@') d.base = ground || 'grass';
    return d;
  }
  function compile(id, m) {
    const ground = m.ground || 'grass';
    const h = m.rows.length, w = m.rows[0].length;
    const grid = m.rows.map((r) => [...r].map((ch) => (LEG[ch] ? tileDef(LEG[ch], ground) : null)));
    const warps = (m.warps || []).map((o) => Object.assign({}, o));
    (m.stamps || []).forEach((s) => {
      const st = STAMPS[s.s];
      st.rows.forEach((row, j) => row.forEach((tn, i) => {
        if (grid[s.y + j]) grid[s.y + j][s.x + i] = { t: tn, solid: 1 };
      }));
      const dx = s.x + st.door[0], dy = s.y + st.door[1];
      const doorT = st.rows[st.door[1]][st.door[0]];
      if (s.locked) grid[dy][dx] = { t: doorT, solid: 1, look: s.locked };
      else { grid[dy][dx] = { t: doorT, kind: 'door' }; warps.push({ x: dx, y: dy, to: s.to, tx: s.tx, ty: s.ty, dir: 'up', ret: !!s.ret }); }
    });
    const border = tileDef(LEG[m.border || 'T'], ground);
    return Object.assign({}, m, { id, w, h, grid, warps, borderDef: border, conn: Object.assign({}, m.conn || {}) });
  }
  const CM = {};
  for (const id in MAPS) CM[id] = compile(id, MAPS[id]);
  // auto-reverse missing connections
  const REVS = { n: 's', s: 'n', e: 'w', w: 'e' };
  for (const id in CM) for (const side in CM[id].conn) {
    const c = CM[id].conn[side], o = CM[c.to];
    if (o && !o.conn[REVS[side]]) o.conn[REVS[side]] = { to: id, off: -c.off };
  }
  World.MAPS = CM; World.LEG = LEG; World.STAMPS = STAMPS; World.RAW = MAPS;

  // =====================================================================
  // RUNTIME STATE
  // =====================================================================
  let map = CM.home;
  const mkEnt = (o) => Object.assign({ x: 0, y: 0, dir: 'down', moving: false, prog: 0, dist: 16, speed: 2, mdir: 'down', stepCount: 0, path: [], pathSpeed: 2, pathDone: null, emote: null, emoteT: 0, jumpT: 0, hop: false, bumpT: 0 }, o);
  let P = mkEnt({ spr: 'player' });
  let F = mkEnt({ spr: 'voltkit_follow', stacked: true });
  let ents = [], groundItems = [];
  let tasks = [], resumeQ = [];
  let busy = 0, popup = null, shakeT = 0, flashT = 0, auroraT = 0, rustle = null, lastBump = 0;
  let curMusic = null, menuIndex = 0, started = false, worldScene = null, encounterCooldown = 0;

  function inb(x, y, m) { m = m || map; return x >= 0 && y >= 0 && x < m.w && y < m.h; }
  // tile lookup with connections: returns {def, map, x, y} or null (blocked edge) — border defs only for drawing
  function tileInfo(x, y) {
    if (inb(x, y)) return { def: map.grid[y][x], map, x, y };
    const c = map.conn; let side = null, nx, ny, nm;
    if (y < 0 && c.n) { side = c.n; nm = CM[side.to]; nx = x + side.off; ny = nm.h + y; }
    else if (y >= map.h && c.s) { side = c.s; nm = CM[side.to]; nx = x + side.off; ny = y - map.h; }
    else if (x < 0 && c.w) { side = c.w; nm = CM[side.to]; nx = nm.w + x; ny = y + side.off; }
    else if (x >= map.w && c.e) { side = c.e; nm = CM[side.to]; nx = x - map.w; ny = y + side.off; }
    if (!side || !inb(nx, ny, nm)) return null;
    return { def: nm.grid[ny][nx], map: nm, x: nx, y: ny };
  }
  function drawDef(x, y) {
    const t = tileInfo(x, y); if (t) return t.def;
    const ed = map.edge; // optional per-side border, e.g. open sea
    if (ed) { if (y >= map.h && ed.s) return LEG[ed.s]; if (x >= map.w && ed.e) return LEG[ed.e]; }
    return map.borderDef;
  }
  function entAt(x, y) { return ents.find((e) => !e.hidden && e.x === x && e.y === y) || null; }
  function followerOn() { const m = vkMon(); return !!(m && m.hp > 0 && flag('got_starter')); }
  function canWalk(x, y, who) {
    const t = tileInfo(x, y);
    if (!t || !t.def || t.def.solid) return false;
    if (who !== P) {
      if (t.map !== map) return false;
      if (t.def.kind === 'door' || t.def.kind === 'mat') return false;
      if (P.x === x && P.y === y) return false;
      if (followerOn() && !F.stacked && F.x === x && F.y === y) return false;
    }
    if (entAt(x, y)) return false;
    return true;
  }
  function warpAt(x, y) { return map.warps.find((w) => w.x === x && w.y === y) || null; }

  // =====================================================================
  // MOVEMENT
  // =====================================================================
  function startStep(e, dir, speed, dist) {
    const [dx, dy] = DIRS[dir];
    const n = (dist || 16) / 16;
    e.dir = dir; e.mdir = dir; e.moving = true; e.prog = 0; e.dist = dist || 16; e.speed = speed || 2;
    e.x += dx * n; e.y += dy * n; e.stepCount++; e.hop = n > 1;
  }
  function advance(e) { if (!e.moving) return false; e.prog += e.speed; if (e.prog >= e.dist) { e.moving = false; e.prog = 0; e.hop = false; return true; } return false; }
  function parsePath(p) {
    if (Array.isArray(p)) return p.slice();
    const out = []; const re = /([UDLR])(\d*)/g; let m;
    while ((m = re.exec(p))) { const n = m[2] ? +m[2] : 1; for (let i = 0; i < n; i++) out.push(DCH[m[1]]); }
    return out;
  }
  function followerStep(ox, oy, speed) {
    if (!followerOn()) return;
    if (F.stacked) { F.stacked = false; F.x = ox; F.y = oy; F.moving = false; F.dir = P.dir; return; }
    const dx = ox - F.x, dy = oy - F.y, ad = Math.abs(dx) + Math.abs(dy);
    if (ad === 0) return;
    if ((ad === 1 || (ad === 2 && (dx === 0 || dy === 0)))) {
      const dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
      startStep(F, dir, ad === 2 ? speed * 2 : speed, ad * 16);
      if (ad === 2) F.hop = true;
    } else { F.x = ox; F.y = oy; F.moving = false; }
  }
  function placeFollower() { // re-snap behind the player after warps
    F.moving = false; F.emote = null;
    const [dx, dy] = DIRS[OPP[P.dir]];
    const bx = P.x + dx, by = P.y + dy;
    const t = tileInfo(bx, by);
    if (t && t.map === map && t.def && !t.def.solid && t.def.kind !== 'mat' && t.def.kind !== 'door' && !entAt(bx, by)) { F.x = bx; F.y = by; F.stacked = false; F.dir = P.dir; }
    else { F.x = P.x; F.y = P.y; F.stacked = true; F.dir = P.dir; }
  }
  function startPlayerStep(dir, speed, scripted, dist) {
    const ox = P.x, oy = P.y;
    startStep(P, dir, speed, dist);
    P.scripted = !!scripted;
    followerStep(ox, oy, speed);
    const t = tileInfo(P.x, P.y);
    if (t && t.def && t.def.kind === 'grass') rustle = { x: P.x, y: P.y, t: 14 };
  }
  function tryMove(d) {
    const [dx, dy] = DIRS[d];
    const here = warpAt(P.x, P.y);
    if (here && d === 'down' && map.grid[P.y][P.x].kind === 'mat') { P.dir = d; doWarp(here); return; }
    const nx = P.x + dx, ny = P.y + dy;
    const t = tileInfo(nx, ny);
    if (t && t.def && t.def.kind === 'ledge' && d === 'down') {
      if (canWalk(nx, ny + 1, P)) { G.audio.sfx('ledge'); startPlayerStep('down', 2, false, 32); return; }
    }
    if (!canWalk(nx, ny, P) || (followerOn() && !F.stacked && F.moving && F.x === nx && F.y === ny)) { // bump
      P.dir = d; P.bumpT++;
      if (G.frame - lastBump > 18) { G.audio.sfx('bump'); lastBump = G.frame; }
      return;
    }
    const dash = G.input.down('b');
    startPlayerStep(d, dash ? 4 : 2, false);
  }
  function crossEdge() {
    const c = map.conn; let side, nm, nx = P.x, ny = P.y, fdx = 0, fdy = 0;
    if (P.y < 0) { side = c.n; nm = CM[side.to]; fdx = side.off; fdy = nm.h; }
    else if (P.y >= map.h) { side = c.s; nm = CM[side.to]; fdx = side.off; fdy = -map.h; }
    else if (P.x < 0) { side = c.w; nm = CM[side.to]; fdx = nm.w; fdy = side.off; }
    else { side = c.e; nm = CM[side.to]; fdx = -map.w; fdy = side.off; }
    nx += fdx; ny += fdy;
    const fx = F.x + fdx, fy = F.y + fdy, fst = F.stacked, fmov = F.moving, fprog = F.prog;
    loadMap(nm.id, nx, ny, P.dir);
    F.x = fx; F.y = fy; F.stacked = fst; F.moving = fmov; F.prog = fprog;
  }
  function onStepEnd() {
    P.justStepped = true;
    if (!inb(P.x, P.y)) crossEdge();
    G.state.x = P.x; G.state.y = P.y; G.state.dir = P.dir;
    stepTick();
    const w = warpAt(P.x, P.y);
    const def = map.grid[P.y][P.x];
    if (w && def.kind !== 'mat') { doWarp(w); return; }
    if (w && def.kind === 'mat' && P.dir === 'down' && !P.scripted) { doWarp(w); return; }
    if (P.scripted) return;
    const tr = (map.triggers || []).find((t) => P.x >= t.x && P.x < t.x + t.w && P.y >= t.y && P.y < t.y + t.h && (!t.cond || t.cond()));
    if (tr) { cut(tr.run); return; }
    if (checkTrainers()) return;
    if (def.kind === 'grass') maybeEncounter();
  }
  function stepTick() {
    G.state.steps = (G.state.steps || 0) + 1;
    if (G.state.steps % 48 === 0 && followerOn()) addBond(1);
    if (encounterCooldown > 0) encounterCooldown--;
    if (G.state.repel > 0) {
      G.state.repel--;
      if (G.state.repel === 0) cut(() => say('The REPEL wore off.'));
    }
  }

  // =====================================================================
  // MAP LOADING / WARPS
  // =====================================================================
  function playMusic(track, force) {
    if (!track) return;
    if (force || track !== curMusic) { curMusic = track; G.audio.play(track); }
  }
  function resolveImg(img) {
    if (!img) return null;
    if (Array.isArray(img)) return img;
    if (img.startsWith('mon:')) { const id = img.slice(4); const s = G.SPR.mons && G.SPR.mons[id]; return (s && s.icon) || G.SPR.tiles.crystal; }
    return G.SPR.tiles[img] || null;
  }
  function spawnFromDef(d) {
    const e = mkEnt({ def: d, id: d.id, x: d.x, y: d.y, dir: d.dir || 'down', spr: d.spr, img: resolveImg(d.img), homeX: d.x, homeY: d.y, timer: 30 + G.rand(90) });
    return e;
  }
  function loadMap(id, x, y, dir) {
    const prevName = map && map.name;
    map = CM[id] || CM.home;
    G.state.map = map.id; P.x = x; P.y = y; P.dir = dir || P.dir; P.moving = false; P.path = []; P.pathDone = null;
    G.state.x = x; G.state.y = y; G.state.dir = P.dir;
    ents = (map.npcs || []).filter((d) => !d.cond || d.cond()).map(spawnFromDef);
    groundItems = (map.items || []).filter((it) => !it.hidden && !flag('it_' + map.id + '_' + it.id));
    playMusic(map.music);
    if (!map.indoor && map.name !== prevName) popup = { text: map.name, t: 110 };
    rustle = null;
  }
  function doWarp(w) {
    let to = w.to, tx = w.tx, ty = w.ty, dir = w.dir || 'down';
    if (to === '@ret') { const r = G.state.ret || { map: 'hollowbrook', x: 3, y: 7, dir: 'down' }; to = r.map; tx = r.x; ty = r.y; dir = 'down'; }
    if (w.ret) G.state.ret = { map: map.id, x: w.x, y: w.y + 1, dir: 'down' };
    if (CM[to] && CM[to].indoor && dir === 'down' && !w.dir) dir = 'up';
    busy++;
    G.audio.sfx('door');
    G.fade(() => { loadMap(to, tx, ty, dir); placeFollower(); }, { onDone: () => { busy--; if (map.onEnter) map.onEnter(); } });
  }

  // =====================================================================
  // SCRIPT HELPERS (promise based)
  // =====================================================================
  function cut(fn) { if (isSafe()) G.autosave(); busy++; return Promise.resolve().then(fn).catch((e) => console.error('[world script]', e)).finally(() => { busy--; }); }
  function say(t, o) { return new Promise((r) => { G.say(typeof t === 'function' ? t() : t, Object.assign({}, o || {}, { onDone: r })); }); }
  function ask(t, choices) { return say(t, { choices: choices || ['YES', 'NO'] }); }
  function wait(n) { return new Promise((r) => tasks.push({ t: n, f: r })); }
  function walk(e, path, speed) { return new Promise((r) => { e.path = e.path.concat(parsePath(path)); e.pathSpeed = speed || 2; e.pathDone = r; }); }
  function face(e, dir) { e.dir = dir; }
  function emote(e, kind, n) { e.emote = kind; e.emoteT = n || 40; return wait(n || 40); }
  function spawn(d) { const e = spawnFromDef(Object.assign({ move: 'still' }, d)); ents.push(e); return e; }
  function despawn(e) { ents = ents.filter((x) => x !== e); }
  function npc(id) { return ents.find((e) => e.id === id) || null; }
  function fade(mid) { return new Promise((r) => G.fade(mid, { onDone: r })); }
  function towards(from, to) { const dx = to.x - from.x, dy = to.y - from.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
  function shake(n) { shakeT = n; return wait(n); }
  function sfx(n) { G.audio.sfx(n); }
  function jingle(track, frames) { G.audio.play(track); curMusic = track; return wait(frames || 90).then(() => playMusic(map.music, true)); }

  function battle(opts) {
    return new Promise((res) => {
      const done = (r) => { resumeQ.push(() => { playMusic(map.music, true); res(r || 'win'); }); };
      const go = () => {
        if (G.Battle && G.Battle.start) G.Battle.start(Object.assign({ canRun: opts.kind === 'wild' }, opts, { onEnd: done }));
        else G.say(opts.kind === 'wild' ? 'A wild battle happened! (battle module missing)' : 'A battle happened! (battle module missing)', { onDone: () => done('win') });
      };
      // flashy transition
      sfx('encounter');
      let t = 0;
      tasks.push({ tick: () => { t++; flashT = (t >> 2) & 1 ? 1 : 0; if (t >= 28) { flashT = 0; go(); return true; } return false; } });
    });
  }
  async function trainerBattle(name, cls, spr, party, lose, extra) {
    return battle(Object.assign({ kind: 'trainer', enemy: party, trainer: trainerOpts(name, cls, spr, party, lose), canRun: false }, extra || {}));
  }

  async function blackout() {
    const black = { opaque: true, update() {}, draw() { G.clear(3); } };
    G.push(black);
    if (G.audio.stop) G.audio.stop();
    curMusic = null;
    await say(['{PLAYER} has nobody left who can fight!', '{PLAYER} hurried back to safety, clutching an empty ORB belt...']);
    const lost = Math.floor((G.state.money || 0) / 2);
    G.state.money = (G.state.money || 0) - lost;
    healAll();
    const lh = G.state.lastHeal;
    await fade(() => {
      G.pop(black);
      if (lh && CM[lh.map]) { if (lh.ret) G.state.ret = lh.ret; loadMap(lh.map, lh.x, lh.y, lh.dir || 'up'); }
      else loadMap('home', 4, 4, 'down');
      placeFollower();
    });
    if (lh && lh.map === 'care') await say(['NURSE: Oh my, you look exhausted!', 'Your team is healed. Please be careful out there.', lost ? '(You dropped $' + lost + ' in the rush.)' : '']);
    else await say(['MOM: {PLAYER}! Come here, you look wiped out.', 'Everyone\'s rested now. Go easy on yourself, OK?', lost ? '(You dropped $' + lost + ' in the rush.)' : '']);
  }

  // =====================================================================
  // TRAINERS & ENCOUNTERS
  // =====================================================================
  function trFlag(e) { return 'tr_' + map.id + '_' + e.id; }
  function checkTrainers() {
    for (const e of ents) {
      const t = e.def && e.def.trainer;
      if (!t || flag(trFlag(e)) || e.moving) continue;
      const [dx, dy] = DIRS[e.dir];
      for (let i = 1; i <= (t.sight || 4); i++) {
        const x = e.x + dx * i, y = e.y + dy * i;
        if (x === P.x && y === P.y) { cut(() => engage(e, false)); return true; }
        const ti = tileInfo(x, y);
        if (!ti || !ti.def || ti.def.solid || entAt(x, y)) break;
      }
    }
    return false;
  }
  async function engage(e, talked) {
    const t = e.def.trainer;
    if (!talked) {
      P.moving = false;
      await emote(e, 'excl', 36);
      const dist = Math.abs(P.x - e.x) + Math.abs(P.y - e.y) - 1;
      if (dist > 0) await walk(e, CHD[e.dir].repeat(dist));
      P.dir = OPP[e.dir];
    } else e.dir = OPP[P.dir];
    await say(t.intro);
    const r = await trainerBattle(t.name, t.cls, e.spr, t.party, t.lose);
    if (r === 'lose') { await blackout(); return; }
    setFlag(trFlag(e));
  }
  function maybeEncounter() {
    const enc = map.enc;
    if (!enc || !enc.grass || encounterCooldown > 0 || busy) return;
    if (!(G.state.party || []).some((m) => m.hp > 0)) return;
    if (!G.chance(1 / (enc.rate || 10))) return;
    const tot = enc.grass.reduce((s, e) => s + e[3], 0); let r = G.rand(tot), pick = enc.grass[0];
    for (const e of enc.grass) { if ((r -= e[3]) < 0) { pick = e; break; } }
    const lvl = pick[1] + G.rand(pick[2] - pick[1] + 1);
    const lead = (G.state.party || []).find((m) => m.hp > 0);
    if (G.state.repel > 0 && lead && lvl < lead.lvl) return;
    encounterCooldown = 3;
    cut(async () => {
      const res = await battle({ kind: 'wild', enemy: [[pick[0], lvl]], canRun: true });
      if (res === 'lose') await blackout();
    });
  }

  // =====================================================================
  // INTERACTION
  // =====================================================================
  function interact() {
    const [dx, dy] = DIRS[P.dir];
    const fx = P.x + dx, fy = P.y + dy;
    if (followerOn() && !F.stacked && F.x === fx && F.y === fy && !F.moving) { cut(followerTalk); return; }
    let e = entAt(fx, fy);
    const ti = tileInfo(fx, fy);
    if (!e && ti && ti.def && ti.def.kind === 'counter') e = entAt(fx + dx, fy + dy);
    if (e) { talkTo(e); return; }
    const it = groundItems.find((i) => i.x === fx && i.y === fy);
    if (it) { cut(() => pickUp(it, false)); return; }
    const sg = (map.signs || []).find((s) => s.x === fx && s.y === fy);
    if (sg) { cut(() => say(sg.text)); return; }
    const hid = (map.items || []).find((i) => i.hidden && i.x === fx && i.y === fy && !flag('it_' + map.id + '_' + i.id));
    if (hid) { cut(() => pickUp(hid, true)); return; }
    const lk = (map.look || []).find((l) => l.x === fx && l.y === fy);
    if (lk) { cut(() => say(lk.text)); return; }
    if (ti && ti.def && ti.def.look && ti.map === map) { cut(() => say(ti.def.look)); return; }
  }
  function talkTo(e) {
    const d = e.def || {};
    if (e.spr && d.move !== 'fixed') e.dir = OPP[P.dir];
    if (d.trainer && !flag(trFlag(e))) { cut(() => engage(e, true)); return; }
    let t = d.trainer ? d.trainer.after : d.talk;
    if (typeof t === 'function') {
      cut(async () => { const r = await t(e); if (typeof r === 'string' || Array.isArray(r)) await say(r); });
      return;
    }
    if (t) cut(() => say(t));
  }
  async function pickUp(it, hidden) {
    setFlag('it_' + map.id + '_' + it.id);
    groundItems = groundItems.filter((g) => g !== it);
    const n = it.n || 1, nm = itemName(it.item);
    giveItem(it.item, n);
    sfx('item');
    await say(hidden ? ['Huh? Something\'s tucked away here...', '{PLAYER} found ' + (n > 1 ? n + ' ' + nm + 'S' : aOrAn(nm) + ' ' + nm) + '!'] : '{PLAYER} found ' + (n > 1 ? n + ' ' + nm + 'S' : aOrAn(nm) + ' ' + nm) + '!');
  }
  async function followerTalk() {
    const m = vkMon(); if (!m) return;
    const b = m.bond == null ? 70 : m.bond, nm = vkName();
    F.dir = OPP[P.dir];
    let em, line;
    if (m.status === 'SLP') { em = 'zz'; line = nm + ' is dozing on its feet. Tiny sparks pop with each snore.'; }
    else if (m.status) { em = 'dots'; line = nm + ' doesn\'t feel well. Maybe some medicine would help?'; }
    else if (m.hp < m.maxhp / 4) { em = 'dots'; line = nm + ' looks worn out. A rest would do it good.'; }
    else if (b < 60) { em = 'dots'; line = G.pick([nm + ' glances at you, a little shy.', nm + ' is sniffing your shoe. It\'s still figuring you out.']); }
    else if (b < 120) { em = 'note'; line = G.pick([nm + ' is happy!', nm + ' hums a crackly little tune.', nm + ' is chasing its own lightning tail!']); }
    else if (b < 180) { em = 'excl'; line = G.pick([nm + '\'s tail sparks happily!', nm + ' is happy! It hops in a little circle.', nm + ' spotted a bug and is VERY proud of itself.']); }
    else if (b < 230) { em = 'heart'; line = G.pick([nm + ' nuzzles your hand. It really trusts you!', nm + ' is happy to be by your side.']); }
    else { em = 'heart'; line = G.pick([nm + ' is bursting with joy! Its tail glows like a tiny star.', nm + ' leaps into your arms. You\'re its favorite person in the world!']); F.jumpT = 24; }
    if (G.audio.cry) G.audio.cry('voltkit');
    await emote(F, em, 40);
    await say(line);
  }

  // =====================================================================
  // NPC SCRIPTS
  // =====================================================================
  async function momTalk(e) {
    if (!flag('got_starter')) { await say(['MOM: PROF. WREN came by at dawn. She\'s waiting at her LAB, just south of the square.', 'And no wandering into tall grass without a partner, OK?']); return; }
    await say(flag('game_clear') ? 'MOM: My champion! Sit down, sit down. Let me take care of you two.' : ['MOM: {PLAYER}! And VOLTKIT! You both look tired.', 'Take a little rest.']);
    await jingle('heal', 100);
    healAll(); addBond(1);
    await say(flag('game_clear') ? ['MOM: There. Good as new.', 'PROF. WREN said something about strange lights in the cliffs by the pond...'] : ['MOM: There we go! Good as new.', 'Be safe out there. And give VOLTKIT a scratch behind the ears for me.']);
  }
  async function profTalk(e) {
    if (!flag('got_starter')) { await say('PROF. WREN: Ah, {PLAYER}! Come closer, today\'s the big day!'); return; }
    const lines = ['PROF. WREN: How\'s VOLTKIT? Bonds grow with every step you take together.'];
    if (!flag('badge_stone')) lines.push('WARDEN BASALT is in FERNHAVEN, north up ROUTE 1. Earn his STONE BADGE!');
    else if (!flag('badge_tide')) lines.push('Next is WARDEN CORAL in LUMEN BAY, east through WHISPERWOOD.');
    else if (!flag('beat_rival_final')) lines.push('Both badges! SKYRIDGE is open to you. {RIVAL} went up there yesterday...');
    else lines.push('That aurora on the summit... Old books say a creature of light lives where it touches the ground.');
    const caught = Object.keys(G.state.dex.caught || {}).length;
    lines.push('Your DEX shows ' + caught + ' caught. ' + (caught < 5 ? 'Keep exploring!' : caught < 12 ? 'Wonderful progress!' : 'Remarkable! You\'re a natural.'));
    await say(lines);
  }
  async function oldManTalk(e) {
    if (!flag('gift_oldman')) {
      await say(['Eh? A young trainer! BASALT used to carry boulders up SKYRIDGE for fun.', 'Here. My knees say you should have this more than me.']);
      giveItem('superpotion', 1); setFlag('gift_oldman'); sfx('item');
      await say('{PLAYER} received a SUPER POTION!');
    } else await say(['Back in my day, we didn\'t have ORBS.', 'We just asked creatures politely. It rarely worked.']);
  }
  async function fishLadyTalk(e) {
    if (!flag('gift_fish')) {
      await say(['My husband\'s off fishing in FERNHAVEN. He calls it "fishing." I call it napping.', 'You look like you\'ll be climbing SKYRIDGE soon. Take this, dear.']);
      giveItem('fullheal', 1); setFlag('gift_fish'); sfx('item');
      await say('{PLAYER} received a FULL HEAL!');
    } else await say('The mountain air is cold! Bring layers. And snacks. Mostly snacks.');
  }
  async function nurseTalk(e) {
    const i = await ask(['NURSE: Welcome to the CARE CENTER!', 'Shall I restore your team to full health?']);
    if (i !== 0) { await say('NURSE: Come back anytime!'); return; }
    await say('NURSE: Okay, I\'ll take your team for a few seconds.');
    e.dir = 'right';
    await jingle('heal', 110);
    healAll(); addBond(1);
    G.state.lastHeal = { map: 'care', x: 4, y: 3, dir: 'up', ret: G.state.ret ? Object.assign({}, G.state.ret) : null };
    e.dir = 'down';
    await say(['NURSE: Thank you for waiting!', 'Your team is fighting fit. Take care out there!']);
  }
  const STOCK = { fernhaven: ['orb', 'potion', 'antidote', 'awaken', 'repel'], lumenbay: ['orb', 'greatorb', 'potion', 'superpotion', 'antidote', 'awaken', 'fullheal', 'revive', 'repel'] };
  async function clerkTalk(e) {
    e.dir = 'right';
    const town = (G.state.ret && G.state.ret.map) || 'fernhaven';
    const stock = (STOCK[town] || STOCK.fernhaven).filter((id) => itemPrice(id) > 0);
    let first = true;
    for (;;) {
      const c = await ask(first ? ['CLERK: Hi there!', 'What can I get you today?'] : 'CLERK: Anything else?', ['BUY', 'SELL', 'QUIT']);
      first = false;
      if (c === 0) await martBuy(stock);
      else if (c === 1) await martSell();
      else break;
    }
    await say('CLERK: Thanks! Come again soon!');
  }
  async function martBuy(stock) {
    for (;;) {
      const rows = stock.map((id) => ({ l: itemName(id), r: '$' + itemPrice(id), id })).concat([{ l: 'CANCEL' }]);
      const i = await pickList({ rows, money: true });
      if (i < 0 || i >= stock.length) return;
      const id = stock[i], price = itemPrice(id);
      const max = Math.min(99, Math.floor(G.state.money / price));
      if (max < 1) { await say('CLERK: Sorry, you don\'t have enough money for that.'); continue; }
      const q = await pickQty(max, price);
      if (!q) continue;
      const ok = await ask(itemName(id) + ', and you want ' + q + '? That\'ll be $' + q * price + '. OK?');
      if (ok !== 0) continue;
      G.state.money -= q * price; giveItem(id, q); sfx('item');
      await say(id === 'orb' && q >= 10 ? ['CLERK: Here you go!', 'Buying in bulk? Have a free ORB on the house!'] : 'CLERK: Here you go! Thank you!');
      if (id === 'orb' && q >= 10) giveItem('orb', 1);
    }
  }
  async function martSell() {
    for (;;) {
      const ids = Object.keys(G.state.bag).filter((id) => G.state.bag[id] > 0);
      if (!ids.length) { await say('CLERK: Looks like your bag is empty!'); return; }
      const rows = ids.map((id) => ({ l: itemName(id), r: 'x' + G.state.bag[id], id })).concat([{ l: 'CANCEL' }]);
      const i = await pickList({ rows, money: true });
      if (i < 0 || i >= ids.length) return;
      const id = ids[i], price = Math.floor(itemPrice(id) / 2);
      if (!price) { await say('CLERK: Oh, I couldn\'t possibly buy that. It looks important!'); continue; }
      const q = await pickQty(G.state.bag[id], price);
      if (!q) continue;
      const ok = await ask('I can pay $' + q * price + ' for that. OK?');
      if (ok !== 0) continue;
      G.state.bag[id] -= q; if (G.state.bag[id] <= 0) delete G.state.bag[id];
      G.state.money += q * price; sfx('item');
    }
  }

  async function basaltTalk(e) {
    if (flag('badge_stone')) { await say(['BASALT: Ho! The STONE BADGE suits you.', 'Remember: a mountain is just a lot of small rocks that refused to give up.', 'CORAL waits in LUMEN BAY, past WHISPERWOOD. She\'s calm as a lagoon... until she isn\'t.']); return; }
    await say(['BASALT: So! {PROF}\'s new trainer, eh? And a VOLTKIT at your heels! Ha!'.replace('{PROF}', 'WREN'),
      'I am BASALT, WARDEN of FERNHAVEN. My creatures are carved from the bones of SKYRIDGE itself.',
      'Show me your footing, young one. Can you stand firm when the ground shakes?']);
    const party = [['pebbit', 10], ['bouldurr', 12]];
    const r = await trainerBattle('BASALT', 'WARDEN', 'warden_basalt', party, 'HA! I\'ve been knocked flat! What a feeling!');
    if (r === 'lose') { await blackout(); return; }
    setFlag('badge_stone'); if (!G.state.badges.includes('STONE')) G.state.badges.push('STONE');
    await say(['BASALT: Hah! Solid as bedrock, the two of you!', 'Take this. You\'ve earned it.']);
    sfx('item'); await jingle('victory', 80);
    await say(['{PLAYER} received the STONE BADGE!', 'BASALT: With it, the RANGER will let you into WHISPERWOOD.', 'CORAL waits on the far side, in LUMEN BAY. Give her my regards. And my fudge recipe. She keeps asking.']);
  }
  async function coralTalk(e) {
    if (flag('badge_tide')) { await say(['CORAL: The tide always comes back. So will I, stronger.', 'SKYRIDGE waits to the north. The guard will let you pass now.', 'Watch the sky up there. Sometimes it glows.']); return; }
    await say(['CORAL: Welcome. Listen... hear the water? It never hurries, and it never stops.',
      'I am CORAL, WARDEN of LUMEN BAY. Your rival splashed through here yesterday. Loudly.',
      'Let\'s see if your bond runs deeper. Come, ride the current with me!']);
    const party = [['shellop', 16], ['puddlet', 15], ['torrentoad', 18]];
    const r = await trainerBattle('CORAL', 'WARDEN', 'warden_coral', party, 'Swept away... how wonderful. You move like a storm!');
    if (r === 'lose') { await blackout(); return; }
    setFlag('badge_tide'); if (!G.state.badges.includes('TIDE')) G.state.badges.push('TIDE');
    await say(['CORAL: Beautiful. You and VOLTKIT move as one.', 'This is yours.']);
    sfx('item'); await jingle('victory', 80);
    await say(['{PLAYER} received the TIDE BADGE!', 'CORAL: With two badges, SKYRIDGE is open to you.', 'Your rival went up ahead. He looked... worried. Be kind to him, alright?']);
  }
  async function auroryxTalk(e) {
    await say(['A creature of shimmering light stands perfectly still.', 'It looks at VOLTKIT... then at you.']);
    if (G.audio.cry) G.audio.cry('auroryx');
    await emote(e, 'excl', 40);
    const r = await battle({ kind: 'wild', enemy: [['auroryx', 30]], canRun: true });
    if (r === 'lose') { await blackout(); return; }
    if (r === 'caught') { setFlag('caught_auroryx'); despawn(e); await say('The cave\'s glow softens, as if the whole mountain just sighed happily.'); }
    else if (r === 'win') { despawn(e); await say(['AURORYX dissolved into ribbons of light...', 'Something tells you it will return when you come back.']); }
    else await say('AURORYX watches you go, calm and curious.');
  }

  // =====================================================================
  // STORY
  // =====================================================================
  async function introScene() {
    const mom = npc('mom');
    await wait(40);
    if (mom) { mom.dir = 'right'; await emote(mom, 'note', 40); }
    await say(['MOM: {PLAYER}! Rise and shine, sleepyhead!', 'PROF. WREN stopped by at dawn. She wants to see you at her LAB today.', 'Something about a very big day! The LAB is just south of the square.', 'Go on, sweetie. I\'ll be right here.']);
    if (mom) mom.dir = 'left';
  }
  async function profStop() {
    P.moving = false;
    await say('???: {PLAYER}! Psst! Over here! Mind the hedge!');
    P.dir = 'down';
    await emote(P, 'excl', 30);
    const prof = spawn({ id: 'prof_tmp', spr: 'prof', x: P.x, y: P.y + 6, dir: 'up' });
    await walk(prof, 'U5');
    await say(['PROF. WREN: Phew! I jogged here. I do not jog.', 'Route 1 is buzzing this morning. The WILDS out there are feisty after the storm.', 'Walk out there empty-handed and they\'ll steal your shoelaces. Come on, the LAB first!']);
    prof.dir = 'down';
    await Promise.all([walk(prof, 'D2'), walk(P, 'D2')]);
    await fade(() => { despawn(prof); loadMap('lab', 4, 10, 'up'); F.stacked = true; });
    await labScene();
  }
  async function labScene() {
    const prof = npc('prof'), kai = npc('kai');
    let p = '';
    if (P.x > 4) p += 'L' + (P.x - 4); else if (P.x < 4) p += 'R' + (4 - P.x);
    if (P.y > 3) p += 'U' + (P.y - 3);
    if (p) await walk(P, p);
    P.dir = 'up';
    if (kai) { kai.dir = 'left'; await say(['{RIVAL}: Finally! Took you long enough, {PLAYER}.', 'I\'ve been here since sunrise. I even beat the PROF here!']); kai.dir = 'up'; }
    await say(['PROF. WREN: Good morning, you two! You both came of age this season...', 'So today, each of you will meet a partner creature.', 'I have a SPROUTLE ready on the table. And for the other one of you, I was going to—']);
    // CRASH
    sfx('hit'); G.haptic && G.haptic('heavy');
    await shake(24);
    const vk = spawn({ id: 'vk', spr: 'voltkit_follow', x: 3, y: 1, dir: 'down' });
    if (kai) kai.dir = 'left'; prof.dir = 'left'; P.dir = 'left';
    await Promise.all([emote(P, 'excl', 30), emote(prof, 'excl', 30), kai ? emote(kai, 'excl', 30) : null]);
    if (G.audio.cry) G.audio.cry('voltkit');
    await walk(vk, 'D2', 4);
    vk.dir = 'right';
    await say(['{RIVAL}: WHOA! What IS that thing?!', 'PROF. WREN: A wild VOLTKIT! They live high on SKYRIDGE... I\'ve never seen one come down to town!']);
    await emote(vk, 'heart', 50);
    prof.dir = 'down';
    await say(['PROF. WREN: Look at it... it\'s sparking, but it isn\'t angry.', 'It\'s staring right at you, {PLAYER}.', 'In all my years... I believe this VOLTKIT has chosen YOU.']);
    despawn(vk);
    const mon = makeMon('voltkit', 5);
    if (mon.bond == null) mon.bond = 70;
    G.state.party.push(mon); G.dexSee('voltkit'); G.dexCatch('voltkit');
    setFlag('got_starter');
    F.x = 3; F.y = 3; F.dir = 'right'; F.stacked = false; F.moving = false;
    await jingle('caught', 90);
    await say(['VOLTKIT leaped into {PLAYER}\'s arms!', '{PLAYER} and VOLTKIT became partners!']);
    if (kai) {
      kai.dir = 'left';
      await say('{RIVAL}: No fair! It just... picked you?! Fine. Then SPROUTLE is mine!');
      await walk(kai, 'R'); kai.dir = 'right';
      sfx('item');
      await say('{RIVAL} received SPROUTLE!');
      await walk(kai, 'L'); kai.dir = 'left'; P.dir = 'right';
      await say(['{RIVAL}: PROF says partners grow stronger by battling, right?', 'C\'mon, {PLAYER}! Let\'s see what that fuzzball can do!']);
      const r = await trainerBattle(rname(), 'RIVAL', 'rival', [['sproutle', 5]], 'Wha--? No way! Beginner\'s luck!', { canRun: false, noBlackout: true });
      healAll();
      if (r === 'win') { setFlag('beat_rival1'); await say(['{RIVAL}: Hmph! Beginner\'s luck, that\'s all.', 'Next time SPROUTLE and I will flatten you!']); }
      else await say(['{RIVAL}: Yes! See? SPROUTLE and I are a perfect team!', 'Don\'t feel bad, {PLAYER}. Not everyone can be me.']);
      await say('{RIVAL}: I\'m gonna train like crazy. See you on the trail, {PLAYER}!');
      kai.dir = 'down';
      await walk(kai, 'D8', 3);
      despawn(kai); sfx('door');
    }
    prof.dir = 'down'; P.dir = 'up';
    await say(['PROF. WREN: Goodness, what a morning! My poor window...', 'Anyway! {PLAYER}, take these.']);
    sfx('item'); setFlag('got_dex');
    await say(['{PLAYER} received the DEX!', 'PROF. WREN: It records every creature you see and catch.']);
    sfx('item'); giveItem('orb', 5);
    await say(['{PLAYER} received 5 ORBS!', 'PROF. WREN: ORBS catch wild creatures. Weaken them first!']);
    await say(['VOLTKIT doesn\'t like being cooped up in an ORB. It wants to walk beside you.', 'Turn and face it, then press A to see how it feels.',
      'Amberleaf has two WARDENS who test young trainers: BASALT in FERNHAVEN and CORAL in LUMEN BAY.',
      'Earn their badges, and the trail up SKYRIDGE will open. Now go on! Say goodbye to your mom first.']);
    G.state.lastHeal = null;
  }
  async function rival2Scene() {
    P.moving = false;
    const kai = spawn({ id: 'kai2', spr: 'rival', x: P.x + 2, y: P.y, dir: 'left' });
    await say('{RIVAL}: Hey! {PLAYER}! Wait up!');
    P.dir = 'right';
    await walk(kai, 'L');
    await say(['{RIVAL}: You got BASALT\'s badge too? Hmph. I beat him in, like, two turns.', 'Okay, four turns. FIVE, max.', 'I caught a new partner on ROUTE 1. Let\'s see how you handle a full team!']);
    const r = await trainerBattle(rname(), 'RIVAL', 'rival', [['nibblet', 8], ['sproutle', 10]], 'What?! Again?! Ugh, NIBBLET, we need more snacks.');
    if (r === 'lose') { despawn(kai); await blackout(); return; }
    setFlag('beat_rival2');
    await say(['{RIVAL}: Tch. Fine. You\'re... not bad.', 'But WHISPERWOOD is a maze, and I memorized it. See you in LUMEN BAY, slowpo--', 'Er. See you in LUMEN BAY, {PLAYER}!']);
    await walk(kai, 'R2', 3);
    despawn(kai);
  }
  async function finalScene() {
    P.moving = false;
    const kai = npc('kai');
    if (!kai) return;
    await say('{RIVAL}: ...There you are.');
    if (P.y !== 9 || P.x !== 7) { // line up at (7,9), facing the rival
      let p = '';
      if (P.y < 9) { if (P.x === 7) p += 'L'; p += 'D' + (9 - P.y); }
      const sx = P.y < 9 && P.x === 7 ? 6 : P.x;
      if (sx > 7) p += 'L' + (sx - 7); else if (sx < 7) p += 'R' + (7 - sx);
      if (p) await walk(P, p);
    }
    P.dir = 'up';
    await emote(kai, 'dots', 40);
    if (kai.y < 8) await walk(kai, 'D' + (8 - kai.y));
    kai.dir = 'down';
    await say(['{RIVAL}: Ever since the LAB, I\'ve been trying to catch up to you.', 'Trained every day. Caught a whole team. Climbed this whole mountain first.', 'And you STILL walked up here like it was nothing, with that VOLTKIT bouncing at your heels.', 'This is it, {PLAYER}. One last battle. Everything I\'ve got!']);
    const r = await trainerBattle(rname(), 'RIVAL', 'rival', [['gnashrat', 20], ['galewing', 21], ['thornback', 23]], '...Yeah. Yeah, I figured. You\'re really something.');
    if (r === 'lose') { await blackout(); return; }
    setFlag('beat_rival_final');
    await ending(kai);
  }
  async function ending(kai) {
    await say(['{RIVAL}: ...Wow.', 'You actually did it. You and that little VOLTKIT.']);
    // tidy the follower beside the player
    F.x = 6; F.y = 9; F.dir = 'right'; F.stacked = false; F.moving = false;
    const prof = spawn({ id: 'prof_end', spr: 'prof', x: 7, y: 13, dir: 'up' });
    const mom = spawn({ id: 'mom_end', spr: 'mom', x: 8, y: 13, dir: 'up' });
    await say('???: {PLAYER}! {RIVAL}!');
    P.dir = 'down'; kai.dir = 'down';
    await Promise.all([walk(prof, 'U3'), walk(mom, 'U3')]);
    await say(['PROF. WREN: Phew! These old knees...', 'We saw sparks flying all the way down in HOLLOWBROOK!', 'MOM: {PLAYER}! Look at you, all grown up on top of a mountain!']);
    P.dir = 'up';
    await say(['{RIVAL}: {PLAYER}... back at the LAB, I was jealous.', 'VOLTKIT came crashing in, and it picked you. Not me.', 'I thought it picked the strongest kid. That I just had to prove it wrong.', 'But it didn\'t pick the strongest. It picked the one who\'d walk beside it.', 'So... truce? Rivals, still. But friends, too.']);
    await emote(kai, 'note', 40);
    await say('{PLAYER} and {RIVAL} shook hands. SPROUTLE... er, THORNBACK, grumbled approvingly.');
    // aurora
    G.haptic && G.haptic('heavy');
    auroraT = 260;
    await say('PROF. WREN: Look! The sky! Is that... an AURORA?');
    const m = vkMon();
    if (m) m.bond = 255;
    F.dir = 'right';
    await wait(30);
    if (G.audio.cry) G.audio.cry('voltkit');
    F.jumpT = 24; await emote(F, 'heart', 40);
    F.jumpT = 24; await wait(30);
    P.dir = 'left';
    await say(['VOLTKIT\'s tail glows as bright as the sky above.', 'It hops into your arms and holds on tight.', 'The bond between {PLAYER} and VOLTKIT is unbreakable!']);
    await say(['MOM: Let\'s go home, everyone. I\'m making berry stew.', '{RIVAL}: ...Can I come? Gramps can\'t cook.', 'MOM: Of course, dear. Everyone is welcome.']);
    G.audio.play('ending'); curMusic = 'ending';
    let cs = null;
    await fade(() => { cs = pushCredits(); });
    await cs.done;
    await fade(() => {
      G.pop(cs);
      setFlag('game_clear'); setFlag('aurora_open');
      healAll();
      G.state.lastHeal = null;
      curMusic = null;
      loadMap('home', 5, 4, 'left');
      placeFollower();
    });
    const momH = npc('mom');
    if (momH) momH.dir = 'right';
    await say(['MOM: Welcome home, champion. That stew was a hit. Even {RIVAL} had thirds!', 'Oh! PROF. WREN called earlier.', 'The crystal by the pond cliffs melted away when the aurora appeared. There\'s a cave behind it, glowing...', 'Go take a look, if you like. Just be home for dinner!']);
  }

  // =====================================================================
  // UI: start menu, trainer card, lists, credits
  // =====================================================================
  function openStartMenu() {
    sfx('select');
    const items = [], acts = [];
    const add = (l, f) => { items.push(l); acts.push(f); };
    if (flag('got_dex')) add('DEX', () => { if (G.Dex && G.Dex.open) G.Dex.open(); else cut(() => say('The DEX is still booting up...')); });
    if ((G.state.party || []).length) add('PARTY', () => { if (G.Menus && G.Menus.party) G.Menus.party({ mode: 'view' }); else cut(() => say('Party screen unavailable.')); });
    add('BAG', () => { if (G.Menus && G.Menus.bag) G.Menus.bag({ mode: 'field' }); else cut(() => say('Your bag: ' + (Object.keys(G.state.bag).map((k) => itemName(k) + ' x' + G.state.bag[k]).join(', ') || 'empty'))); });
    add(pname().slice(0, 7), () => openCard());
    add('SAVE', (sc) => cut(async () => {
      const i = await ask('Your journey saves on its own. Save right now too?');
      if (i === 0) { const ok = G.saveGame(); sfx('save'); await say(ok ? '{PLAYER} saved the game!' : 'Hmm... the save failed. Is storage full?'); G.pop(sc); }
    }));
    add('OPTIONS', () => World.openOptions());
    add('EXIT', (sc) => G.pop(sc));
    const w = Math.max(...items.map((s) => s.length)) * 8 + 24;
    G.menu({ items, x: 160 - w, y: 0, w, keep: true, index: Math.min(menuIndex, items.length - 1),
      onSelect: (i, sc) => { menuIndex = i; acts[i](sc); }, onCancel: (sc) => G.pop(sc) });
  }
  World.openOptions = function () {
    if (G.Title && G.Title.options) G.Title.options();
    else cut(() => say('Options are available from the title screen.'));
  };
  function fmtTime(s) { s = s | 0; const h = (s / 3600) | 0, m = ((s % 3600) / 60) | 0; return h + ':' + String(m).padStart(2, '0'); }
  const BADGE_ICON = {
    STONE: ['....3333....', '..33111133..', '.3110000113.', '.3100110013.', '311011110113', '310111111013', '310111111013', '311011110113', '.3100110013.', '.3110000113.', '..33111133..', '....3333....'],
    TIDE: ['....3333....', '..33222233..', '.3220000223.', '.3200000023.', '320003300023', '320030030023', '320300003023', '323000000323', '.3200000023.', '.3220000223.', '..33222233..', '....3333....'],
    EMPTY: ['....3333....', '..33....33..', '.3........3.', '.3........3.', '3..........3', '3..........3', '3..........3', '3..........3', '.3........3.', '.3........3.', '..33....33..', '....3333....'],
  };
  function openCard() {
    const sc = {
      opaque: true,
      update() { if (G.input.pressed('a') || G.input.pressed('b')) { sfx('back'); G.pop(sc); } },
      draw() {
        G.clear(0); G.box(0, 0, 160, 144);
        G.textC('TRAINER CARD', 10, 3);
        G.rect(8, 22, 144, 1, 2);
        G.text('NAME', 12, 30, 2); G.text(pname(), 60, 30);
        G.text('MONEY', 12, 44, 2); G.text('$' + (G.state.money || 0), 60, 44);
        G.text('TIME', 12, 58, 2); G.text(fmtTime(G.state.playTime), 60, 58);
        G.text('DEX', 12, 72, 2); G.text(String(Object.keys(G.state.dex.caught || {}).length), 60, 72);
        const pc = chr('player'); if (pc) G.drawSpr(pc.down[(G.frame >> 5) & 1], 128, 40);
        G.rect(8, 88, 144, 1, 2);
        G.text('BADGES', 12, 96, 2);
        ['STONE', 'TIDE'].forEach((b, i) => {
          const has = (G.state.badges || []).includes(b);
          G.drawSpr(BADGE_ICON[has ? b : 'EMPTY'], 24 + i * 56, 112);
          G.text(has ? b : '----', 40 + i * 56, 114, has ? 3 : 1);
        });
      },
    };
    G.push(sc);
  }
  function pickList(o) {
    return new Promise((res) => {
      const rows = o.rows, n = rows.length, vis = Math.min(5, n);
      let idx = 0, top = 0;
      const sc = {
        update() {
          if (G.input.repeat('up')) { idx = (idx + n - 1) % n; sfx('cursor'); }
          if (G.input.repeat('down')) { idx = (idx + 1) % n; sfx('cursor'); }
          if (idx < top) top = idx; if (idx >= top + vis) top = idx - vis + 1;
          if (G.input.pressed('a')) { sfx('select'); G.pop(sc); res(idx); }
          else if (G.input.pressed('b')) { sfx('back'); G.pop(sc); res(-1); }
        },
        draw() {
          const h = vis * 16 + 8;
          G.box(0, 0, 160, h);
          for (let i = 0; i < vis; i++) {
            const k = top + i; if (k >= n) break;
            G.text(rows[k].l.slice(0, 12), 16, 8 + i * 16);
            if (rows[k].r) G.textR(rows[k].r, 154, 8 + i * 16);
          }
          G.text('▶', 6, 8 + (idx - top) * 16);
          if (top > 0 && (G.frame >> 4) & 1) G.text('^', 144, 0);
          if (top + vis < n && (G.frame >> 4) & 1) G.text('▼', 144, h - 9);
          if (o.money) {
            G.box(0, 96, 160, 48);
            G.text('MONEY $' + G.state.money, 8, 104);
            const it = rows[idx] && rows[idx].id;
            const d = it ? G.wrap(itemDesc(it), 18).slice(0, 2) : [];
            d.forEach((l, j) => G.text(l, 8, 120 + j * 10 - (d.length > 1 ? 4 : 0), 2));
          }
        },
      };
      G.push(sc);
    });
  }
  function pickQty(max, unit) {
    return new Promise((res) => {
      let q = 1;
      const sc = {
        update() {
          if (G.input.repeat('up')) { q = q >= max ? 1 : q + 1; sfx('cursor'); }
          if (G.input.repeat('down')) { q = q <= 1 ? max : q - 1; sfx('cursor'); }
          if (G.input.repeat('right')) { q = Math.min(max, q + 10); sfx('cursor'); }
          if (G.input.repeat('left')) { q = Math.max(1, q - 10); sfx('cursor'); }
          if (G.input.pressed('a')) { sfx('select'); G.pop(sc); res(q); }
          else if (G.input.pressed('b')) { sfx('back'); G.pop(sc); res(0); }
        },
        draw() {
          G.box(56, 64, 104, 32);
          G.text('x' + String(q).padStart(2, '0'), 64, 76);
          G.textR('$' + q * unit, 152, 76);
        },
      };
      G.push(sc);
    });
  }
  function pushCredits() {
    const L = [
      { t: '' }, { t: 'WILDLIGHT', c: 3 }, { t: 'AMBER EDITION', c: 2 }, { t: '' }, { t: '' },
      { t: 'a small game' }, { t: 'made with love' }, { t: '' }, { t: '' },
      { t: 'Design · World' }, { t: 'Battle · Sound' }, { t: '- the Wildlight team', c: 2 }, { t: '' }, { t: '' },
      { t: 'STARRING', c: 2 }, { t: '' },
      { t: '{PLAYER}', s: 'player' }, { t: 'VOLTKIT', s: 'voltkit_follow' }, { t: '{RIVAL}', s: 'rival' }, { t: 'PROF. WREN', s: 'prof' }, { t: 'MOM', s: 'mom' },
      { t: 'BASALT', s: 'warden_basalt' }, { t: 'CORAL', s: 'warden_coral' }, { t: 'NURSE', s: 'nurse' }, { t: 'and everyone', s: 'kid' }, { t: 'in Amberleaf', s: 'lass' },
      { t: '' }, { t: '' }, { t: 'Thank you', c: 3 }, { t: 'for playing!', c: 3 }, { t: '' }, { t: '' }, { t: '' },
    ];
    const ROW = 18, total = L.length * ROW;
    let y = 144, endT = 0, resolve;
    const done = new Promise((r) => (resolve = r));
    const sc = {
      opaque: true, done,
      update() {
        if (y > -total + 56) y -= G.input.down('a') || G.input.down('b') ? 2 : 0.5;
        else { endT++; if (endT > 90 && (G.input.pressed('a') || G.input.pressed('start'))) { const r = resolve; resolve = null; r && r(); } }
      },
      draw() {
        G.clear(3);
        L.forEach((l, i) => {
          const ly = Math.round(y + i * ROW); if (ly < -16 || ly > 144) return;
          const txt = G.fmt(l.t);
          if (l.s && chr(l.s)) { G.drawSpr(chr(l.s).down[(G.frame >> 4) & 1], 24, ly - 4); G.text(txt, 48, ly, 0); }
          else G.textC(txt, ly, l.c == null ? 0 : (l.c === 3 ? 0 : 1));
        });
        if (endT > 0) {
          G.textC('THE END', 64, 0);
          const vk = chr('voltkit_follow'); if (vk) G.drawSpr(vk.down[(G.frame >> 4) & 1], 72, 84);
          if (endT > 90 && (G.frame >> 5) & 1) G.textC('PRESS A', 120, 1);
        } else {
          const vk = chr('voltkit_follow');
          if (vk) { const x = ((G.frame * 0.75) % 200) - 20; G.drawSpr(vk.right[(G.frame >> 3) & 1], x, 126); }
        }
      },
    };
    G.push(sc);
    return sc;
  }

  // =====================================================================
  // WORLD SCENE
  // =====================================================================
  function sprFor(e) {
    if (e.img) return { rows: e.img, flip: false };
    const s = chr(e.spr); if (!s) return null;
    let idx = 0;
    if ((e.moving && e.prog < e.dist / 2 && !e.hop) || (e.bumpT && (e.bumpT >> 3) & 1)) idx = 1;
    const flip = (e.dir === 'down' || e.dir === 'up') && idx === 1 && (e.stepCount & 1) === 1;
    return { rows: s[e.dir][idx], flip };
  }
  function pix(e) {
    let x = e.x * 16, y = e.y * 16;
    if (e.moving) { const [dx, dy] = DIRS[e.mdir]; const back = e.dist - e.prog; x -= dx * back; y -= dy * back; }
    return { x, y };
  }
  const overlayCache = {};
  function grassOverlay(name) {
    if (overlayCache[name]) return overlayCache[name];
    const rows = G.SPR.tiles[name]; if (!rows) return null;
    return (overlayCache[name] = rows.map((r, i) => (i < 9 ? '................' : r)));
  }
  function drawTileAt(def, sx, sy, tx, ty) {
    if (!def) return;
    const T = G.SPR.tiles;
    if (def.base && T[def.base]) G.drawSpr(T[def.base], sx, sy);
    let name = def.t;
    if (def.anim && (G.frame >> 5) & 1 && T[name + '2']) name += '2';
    if (rustle && rustle.x === tx && rustle.y === ty && T[name + '2']) name += '2';
    if (T[name]) G.drawSpr(T[name], sx, sy);
    if (def.kind === 'water') {
      const n = drawDef(tx, ty - 1), s = drawDef(tx, ty + 1), w = drawDef(tx - 1, ty), e = drawDef(tx + 1, ty);
      const land = (d) => d && d.kind !== 'water' && d.t !== 'water';
      if (land(n)) G.drawSpr(T.shore_n, sx, sy);
      if (land(s)) G.drawSpr(T.shore_s, sx, sy);
      if (land(w)) G.drawSpr(T.shore_w, sx, sy);
      if (land(e)) G.drawSpr(T.shore_e, sx, sy);
    }
  }
  function drawWorld() {
    const T = G.SPR.tiles;
    const pp = pix(P);
    let camX = pp.x - 64, camY = pp.y - 64;
    if (shakeT > 0) camX += (shakeT & 2) ? 2 : -2;
    G.clear(map.indoor ? 3 : 0);
    const tx0 = Math.floor(camX / 16), ty0 = Math.floor(camY / 16);
    for (let ty = ty0; ty <= ty0 + 9; ty++) for (let tx = tx0; tx <= tx0 + 10; tx++) drawTileAt(drawDef(tx, ty), tx * 16 - camX, ty * 16 - camY, tx, ty);
    groundItems.forEach((it) => G.drawSpr(T.itemball, it.x * 16 - camX, it.y * 16 - camY));
    // entities, sorted by y
    const list = ents.filter((e) => !e.hidden).slice();
    if (followerOn() && !F.stacked) list.push(F);
    list.push(P);
    list.sort((a, b) => pix(a).y - pix(b).y || (a === P ? 1 : 0) - (b === P ? 1 : 0));
    for (const e of list) {
      const p = pix(e), sx = p.x - camX, sy = p.y - camY;
      let lift = e.img ? 0 : 4;
      if (e.hop) { lift += Math.round(Math.sin(Math.PI * e.prog / e.dist) * 10); G.drawSpr(T.shadow, sx, sy); }
      if (e.jumpT > 0) lift += Math.round(Math.abs(Math.sin(e.jumpT / 24 * Math.PI * 2)) * 5);
      const s = sprFor(e);
      if (s) G.drawSpr(s.rows, sx, sy - lift, { flip: s.flip });
      // tall grass covers feet
      if (!e.hop && (!e.moving || e.prog >= e.dist / 2)) {
        const d = drawDef(e.x, e.y);
        if (d && d.kind === 'grass') { const nm = rustle && rustle.x === e.x && rustle.y === e.y && T[d.t + '2'] ? d.t + '2' : d.t; const ov = grassOverlay(nm); if (ov) G.drawSpr(ov, e.x * 16 - camX, e.y * 16 - camY); }
      }
      if (e.emote && e.emoteT > 0 && G.SPR.emotes && G.SPR.emotes[e.emote]) G.drawSpr(G.SPR.emotes[e.emote], sx, sy - lift - 15);
    }
    if (rustle && rustle.t > 8) G.drawSpr(T.rustle, rustle.x * 16 - camX, rustle.y * 16 - camY - (14 - rustle.t));
    // aurora shimmer
    if (auroraT > 0) {
      for (let i = 0; i < 6; i++) {
        const yy = 4 + i * 6 + Math.round(Math.sin(G.frame / 12 + i) * 3);
        for (let x = 0; x < 160; x += 4) if (((x >> 2) + i + (G.frame >> 3)) % 3 === 0) G.rect(x, yy + Math.round(Math.sin(x / 14 + G.frame / 20) * 3), 3, 2, i % 2 ? 0 : 1);
      }
    }
    if (flashT) G.rect(0, 0, 160, 144, 0);
    if (popup && popup.t > 0) {
      const w = popup.text.length * 8 + 16, yOff = popup.t < 12 ? (popup.t - 12) * 2 : popup.t > 98 ? (98 - popup.t) * 2 : 0;
      G.box(0, yOff, w, 24); G.text(popup.text, 8, yOff + 8);
    }
    drawSaveIcon();
  }
  function tick() {
    // tasks (timers & tickers)
    for (let i = tasks.length - 1; i >= 0; i--) {
      const t = tasks[i];
      if (t.tick) { if (t.tick()) tasks.splice(i, 1); }
      else if (--t.t <= 0) { tasks.splice(i, 1); t.f(); }
    }
    if (popup && popup.t > 0) popup.t--;
    if (shakeT > 0) shakeT--;
    if (auroraT > 0) auroraT--;
    if (rustle && --rustle.t <= 0) rustle = null;
    for (const e of ents.concat([F, P])) { if (e.emoteT > 0 && --e.emoteT <= 0) e.emote = null; if (e.jumpT > 0) e.jumpT--; }
  }
  function updNPC(e) {
    if (e.moving) { advance(e); return; }
    if (e.path.length) { startStep(e, e.path.shift(), e.pathSpeed || 2); return; }
    if (e.pathDone) { const cb = e.pathDone; e.pathDone = null; cb(); return; }
    if (busy) return;
    const mv = e.def && e.def.move;
    if (mv === 'wander' || mv === 'look') {
      if (--e.timer > 0) return;
      e.timer = 60 + G.rand(120);
      const d = G.pick(['up', 'down', 'left', 'right']);
      if (mv === 'look') { e.dir = d; return; }
      const [dx, dy] = DIRS[d], nx = e.x + dx, ny = e.y + dy;
      if (Math.abs(nx - e.homeX) <= 2 && Math.abs(ny - e.homeY) <= 2 && canWalk(nx, ny, e)) startStep(e, d, 1);
      else e.dir = d;
    }
  }
  function updPlayer() {
    if (P.moving) {
      if (advance(P)) onStepEnd();
      return;
    }
    if (P.path.length) { startPlayerStep(P.path.shift(), P.pathSpeed || 2, true); return; }
    if (P.pathDone) { const cb = P.pathDone; P.pathDone = null; cb(); return; }
    if (busy) { P.bumpT = 0; return; }
    if (G.input.pressed('start')) { openStartMenu(); return; }
    if (G.input.pressed('a')) { interact(); return; }
    const d = G.input.dir();
    const js = P.justStepped; P.justStepped = false;
    if (!d) { P.turnT = 0; P.bumpT = 0; return; }
    if (d !== P.dir && !js) { P.dir = d; P.turnT = 7; P.bumpT = 0; return; }
    if (P.turnT > 0) { P.turnT--; return; }
    tryMove(d);
  }
  function update() {
    if (resumeQ.length) { const f = resumeQ.shift(); f(); return; }
    autosaveTick();
    tick();
    for (const e of ents) updNPC(e);
    if (followerOn()) { if (F.moving) advance(F); }
    updPlayer();
  }

  // =====================================================================
  // AUTOSAVE
  // A "safe point" is when the overworld is on top and no script, warp or battle is running, so G.state is
  // consistent. Progress is written when the game comes back to a safe point (after a battle, cutscene, menu,
  // shop, heal or warp), right before any script starts, every couple of seconds while exploring, and when the
  // app is hidden or closed. Mid-battle or mid-cutscene the last safe snapshot on disk is kept as is.
  // =====================================================================
  let wasSafe = false, safeT = 0, saveIconT = 0, lastTick = -1;
  function isSafe() { return World.active() && G.top() === worldScene && busy === 0 && !resumeQ.length; }
  function autosaveTick() {
    if (saveIconT > 0) saveIconT--;
    // update() only runs while the world is the top scene, so a gap in frames means a menu, dialog or battle was on top.
    if (lastTick >= 0 && G.frame - lastTick > 1) wasSafe = false;
    lastTick = G.frame;
    if (!isSafe()) { wasSafe = false; return; }
    if (!wasSafe) { wasSafe = true; safeT = 0; if (G.autosave()) saveIconT = 50; return; }
    if (++safeT >= 120) { safeT = 0; G.autosave(); }
  }
  function drawSaveIcon() {
    if (saveIconT <= 0 || (saveIconT < 12 && (saveIconT & 2))) return;
    const x = 146, y = 4; // small disk glyph, palette indices only
    G.rect(x, y, 10, 10, 3); G.rect(x + 2, y + 1, 6, 3, 0); G.rect(x + 6, y + 1, 1, 2, 3); G.rect(x + 2, y + 6, 6, 3, 1);
  }
  World.safe = isSafe;

  function makeScene() {
    return { opaque: true, world: true, update, draw: drawWorld };
  }

  // =====================================================================
  // PUBLIC API
  // =====================================================================
  World.start = function (o) {
    o = o || {};
    G.clearScenes();
    tasks = []; resumeQ = []; busy = 0; popup = null; curMusic = null; auroraT = 0; flashT = 0; shakeT = 0;
    P = mkEnt({ spr: 'player' }); F = mkEnt({ spr: 'voltkit_follow', stacked: true });
    const st = G.state;
    st.flags = st.flags || {}; st.bag = st.bag || {}; st.party = st.party || []; st.badges = st.badges || [];
    st.dex = st.dex || { seen: {}, caught: {} }; st.money = st.money == null ? 3000 : st.money; st.playTime = st.playTime || 0;
    worldScene = makeScene();
    wasSafe = false; safeT = 0; saveIconT = 0; lastTick = -1;
    G.push(worldScene);
    if (o.newGame) {
      map = null;
      loadMap('home', 6, 2, 'down');
      placeFollower();
      cut(introScene);
    } else {
      map = null;
      const id = CM[st.map] ? st.map : 'home';
      loadMap(id, st.x == null ? 4 : st.x, st.y == null ? 4 : st.y, st.dir || 'down');
      placeFollower();
    }
    if (!started) {
      started = true;
      // Leaving the app (home button, tab switch, lock screen, close): write now if the state is consistent.
      const flush = () => { if (isSafe()) G.autosave(true); };
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
        document.addEventListener('freeze', flush);
      }
      if (typeof addEventListener === 'function') { addEventListener('pagehide', flush); addEventListener('beforeunload', flush); }
      setInterval(() => { if (World.active() && !(typeof document !== 'undefined' && document.hidden)) G.state.playTime = (G.state.playTime || 0) + 1; }, 1000);
    }
  };
  World.active = function () { return !!worldScene && G.scenes.includes(worldScene); };
  World.warp = function (id, x, y, dir) { loadMap(id, x, y, dir || 'down'); placeFollower(); }; // debug helper
  World.blackout = () => cut(blackout);
  World.debug = () => ({ map: map.id, x: P.x, y: P.y, dir: P.dir, busy, moving: P.moving, follower: followerOn() && !F.stacked ? [F.x, F.y] : null, ents: ents.map((e) => e.id + '@' + e.x + ',' + e.y) });
})();
