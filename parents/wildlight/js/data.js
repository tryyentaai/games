// WILDLIGHT — creature, move, item and type data + mon factory. Owner: battle module.
(function () {
  'use strict';
  const G = window.G;
  const D = (G.DATA = G.DATA || {});

  D.TYPES = ['NORMAL', 'FIRE', 'WATER', 'GRASS', 'ELECTRIC', 'BUG', 'FLYING', 'ROCK', 'GHOST', 'PSYCHIC'];

  // ---------- Type chart: typeChart[attack][defend] = multiplier (missing = 1) ----------
  D.typeChart = {
    NORMAL: { ROCK: 0.5, GHOST: 0 },
    FIRE: { FIRE: 0.5, WATER: 0.5, GRASS: 2, BUG: 2, ROCK: 0.5 },
    WATER: { FIRE: 2, WATER: 0.5, GRASS: 0.5, ROCK: 2 },
    GRASS: { FIRE: 0.5, WATER: 2, GRASS: 0.5, BUG: 0.5, FLYING: 0.5, ROCK: 2 },
    ELECTRIC: { WATER: 2, GRASS: 0.5, ELECTRIC: 0.5, FLYING: 2 },
    BUG: { FIRE: 0.5, GRASS: 2, FLYING: 0.5, GHOST: 0.5, PSYCHIC: 2 },
    FLYING: { GRASS: 2, BUG: 2, ELECTRIC: 0.5, ROCK: 0.5 },
    ROCK: { FIRE: 2, BUG: 2, FLYING: 2, ROCK: 0.5 },
    GHOST: { NORMAL: 0, GHOST: 2, PSYCHIC: 2 },
    PSYCHIC: { PSYCHIC: 0.5, BUG: 0.5 },
  };
  D.typeMult = function (atkType, defTypes) {
    let m = 1;
    for (const t of defTypes) { const r = (D.typeChart[atkType] || {})[t]; if (r != null) m *= r; }
    return m;
  };

  // ---------- Moves ----------
  // effect fields: status, chance(%), foe:{stat:delta}, self:{stat:delta}, heal(frac), rest, hits:[min,max],
  // recoil(frac), drain(frac), flinch(%), crit(high crit). prio = priority bracket (default 0).
  const M = (name, type, power, acc, pp, cat, effect, prio) => ({ name, type, power, acc, pp, cat, effect: effect || null, prio: prio || 0 });
  D.moves = {
    // NORMAL
    nip: M('NIP', 'NORMAL', 40, 100, 35, 'phys'),
    bump: M('HEADBUMP', 'NORMAL', 40, 100, 35, 'phys'),
    dartdash: M('DART DASH', 'NORMAL', 40, 100, 30, 'phys', null, 1),
    gnawdown: M('GNAW DOWN', 'NORMAL', 60, 100, 25, 'phys', { flinch: 10 }),
    heavyflop: M('HEAVY FLOP', 'NORMAL', 85, 100, 15, 'phys', { status: 'PAR', chance: 30 }),
    flurry: M('FLURRY', 'NORMAL', 18, 85, 15, 'phys', { hits: [2, 5] }),
    recklessram: M('RECKLESS RAM', 'NORMAL', 90, 100, 15, 'phys', { recoil: 0.25 }),
    snarl: M('SNARL', 'NORMAL', 0, 100, 40, 'status', { foe: { atk: -1 } }),
    waggle: M('WAGGLE', 'NORMAL', 0, 100, 30, 'status', { foe: { def: -1 } }),
    bristle: M('BRISTLE', 'NORMAL', 0, 0, 30, 'status', { self: { def: 1 } }),
    windup: M('WIND UP', 'NORMAL', 0, 0, 20, 'status', { self: { atk: 2 } }),
    catnap: M('CATNAP', 'NORMAL', 0, 0, 10, 'status', { rest: true }),
    ruffle: M('RUFFLE', 'NORMAL', 0, 100, 20, 'status', { foe: { atk: -2 } }),
    lastgasp: M('LAST GASP', 'NORMAL', 50, 0, 1, 'phys', { recoil: 0.25 }), // used when out of PP
    // FIRE
    cinderspit: M('CINDER SPIT', 'FIRE', 40, 100, 25, 'spec', { status: 'BRN', chance: 10 }),
    hotpaw: M('HOT PAW', 'FIRE', 55, 95, 25, 'phys', { status: 'BRN', chance: 10 }),
    blazeroll: M('BLAZE ROLL', 'FIRE', 75, 90, 15, 'phys', { status: 'BRN', chance: 10 }),
    furnaceroar: M('FURNACE ROAR', 'FIRE', 95, 85, 10, 'spec', { status: 'BRN', chance: 20 }),
    sootcloud: M('SOOT CLOUD', 'FIRE', 0, 100, 20, 'status', { foe: { acc: -1 } }),
    // WATER
    dripshot: M('DRIP SHOT', 'WATER', 40, 100, 25, 'spec'),
    fizzburst: M('FIZZ BURST', 'WATER', 50, 100, 25, 'spec', { foe: { spd: -1 }, chance: 10 }),
    tideslap: M('TIDE SLAP', 'WATER', 70, 100, 15, 'phys'),
    deluge: M('DELUGE', 'WATER', 95, 85, 10, 'spec'),
    shellup: M('SHELL UP', 'WATER', 0, 0, 20, 'status', { self: { def: 2 } }),
    // GRASS
    leafflick: M('LEAF FLICK', 'GRASS', 40, 100, 25, 'spec'),
    vinelash: M('VINE LASH', 'GRASS', 55, 100, 25, 'phys'),
    sapsip: M('SAP SIP', 'GRASS', 40, 100, 15, 'spec', { drain: 0.5 }),
    snoozespore: M('SNOOZE SPORE', 'GRASS', 0, 75, 15, 'status', { status: 'SLP' }),
    thornvolley: M('THORN VOLLEY', 'GRASS', 25, 90, 10, 'phys', { hits: [2, 5] }),
    bloomburst: M('BLOOM BURST', 'GRASS', 90, 100, 10, 'spec'),
    // ELECTRIC
    spark: M('SPARKLET', 'ELECTRIC', 40, 100, 30, 'spec', { status: 'PAR', chance: 10 }),
    zapdash: M('ZAP DASH', 'ELECTRIC', 40, 100, 30, 'phys', null, 1),
    buzzwave: M('BUZZ WAVE', 'ELECTRIC', 0, 90, 20, 'status', { status: 'PAR' }),
    boltpounce: M('BOLT POUNCE', 'ELECTRIC', 85, 95, 15, 'phys', { recoil: 0.25, status: 'PAR', chance: 10 }),
    stormcall: M('STORM CALL', 'ELECTRIC', 95, 85, 10, 'spec', { status: 'PAR', chance: 20 }),
    chargeup: M('CHARGE UP', 'ELECTRIC', 0, 0, 20, 'status', { self: { spc: 2 } }),
    // BUG
    stingjab: M('STING JAB', 'BUG', 30, 100, 35, 'phys', { status: 'PSN', chance: 30 }),
    silkspray: M('SILK SPRAY', 'BUG', 0, 95, 40, 'status', { foe: { spd: -2 } }),
    pincerbite: M('PINCER BITE', 'BUG', 60, 100, 25, 'phys', { flinch: 10 }),
    swarmrush: M('SWARM RUSH', 'BUG', 22, 90, 20, 'phys', { hits: [2, 5] }),
    dazedust: M('DAZE DUST', 'BUG', 0, 75, 15, 'status', { status: 'SLP' }),
    hivebeam: M('HIVE BEAM', 'BUG', 80, 100, 15, 'spec', { foe: { spc: -1 }, chance: 10 }),
    // FLYING
    breezecut: M('BREEZE CUT', 'FLYING', 40, 100, 35, 'spec'),
    beakrap: M('BEAK RAP', 'FLYING', 35, 100, 35, 'phys'),
    divebomb: M('DIVE BOMB', 'FLYING', 75, 95, 15, 'phys', { crit: true }),
    galeburst: M('GALE BURST', 'FLYING', 90, 90, 10, 'spec'),
    // ROCK
    pebbletoss: M('PEBBLE TOSS', 'ROCK', 40, 100, 30, 'phys'),
    gravelshot: M('GRAVEL SHOT', 'ROCK', 15, 90, 20, 'phys', { hits: [2, 5] }),
    stoneskin: M('STONE SKIN', 'ROCK', 0, 0, 15, 'status', { self: { def: 2 } }),
    rubblerain: M('RUBBLE RAIN', 'ROCK', 70, 90, 10, 'phys', { flinch: 30 }),
    boulderslam: M('BOULDER SLAM', 'ROCK', 95, 85, 10, 'phys', { flinch: 20 }),
    geodegleam: M('GEODE GLEAM', 'ROCK', 70, 100, 15, 'spec'),
    // GHOST
    spooktap: M('SPOOK TAP', 'GHOST', 30, 100, 30, 'phys', { status: 'PAR', chance: 30 }),
    gloomclaw: M('GLOOM CLAW', 'GHOST', 55, 100, 20, 'phys', { crit: true }),
    wispfire: M('WISP FIRE', 'GHOST', 65, 100, 15, 'spec', { status: 'BRN', chance: 20 }),
    fadeout: M('FADE OUT', 'GHOST', 0, 0, 20, 'status', { self: { eva: 1 } }),
    hexstare: M('HEX STARE', 'GHOST', 0, 90, 20, 'status', { foe: { atk: -1, spc: -1 } }),
    phantomrush: M('PHANTOM RUSH', 'GHOST', 90, 100, 10, 'phys'),
    // PSYCHIC
    mindpulse: M('MIND PULSE', 'PSYCHIC', 50, 100, 25, 'spec'),
    hypnohoot: M('HYPNO HOOT', 'PSYCHIC', 0, 60, 20, 'status', { status: 'SLP' }),
    psiburst: M('PSI BURST', 'PSYCHIC', 90, 100, 10, 'spec', { foe: { spc: -1 }, chance: 10 }),
    stillmind: M('STILL MIND', 'PSYCHIC', 0, 0, 20, 'status', { self: { spc: 1, def: 1 } }),
    mend: M('MEND', 'PSYCHIC', 0, 0, 10, 'status', { heal: 0.5 }),
    auroralance: M('AURORA LANCE', 'PSYCHIC', 100, 90, 5, 'spec', { status: 'FRZ', chance: 10 }),
  };

  // ---------- Creatures ----------
  const mon = (name, types, b, learn, evo, catchRate, xpYield, dex) => ({
    name, types, base: { hp: b[0], atk: b[1], def: b[2], spd: b[3], spc: b[4] }, learn, evo, catchRate, xpYield, dex,
  });
  D.mons = {
    voltkit: mon('VOLTKIT', ['ELECTRIC'], [55, 62, 50, 95, 74],
      [[1, 'nip'], [1, 'snarl'], [4, 'spark'], [9, 'zapdash'], [11, 'buzzwave'], [17, 'chargeup'], [23, 'boltpounce'], [30, 'stormcall']],
      null, 45, 90, { kind: 'KIT', ht: '0.4m', wt: '3.8kg', text: 'Its tail crackles when it is happy. It picks one partner and follows them for life.' }),
    sproutle: mon('SPROUTLE', ['GRASS'], [56, 57, 62, 42, 64],
      [[1, 'bump'], [1, 'waggle'], [7, 'leafflick'], [11, 'sapsip'], [15, 'snoozespore'], [19, 'vinelash'], [24, 'thornvolley'], [30, 'bloomburst']],
      { lvl: 16, into: 'thornback' }, 45, 64, { kind: 'SEEDLING', ht: '0.5m', wt: '6.2kg', text: 'It naps in sunny spots to feed the bud on its back. The bud hums softly at dawn.' }),
    thornback: mon('THORNBACK', ['GRASS', 'ROCK'], [82, 86, 105, 52, 82],
      [[1, 'bump'], [1, 'leafflick'], [1, 'sapsip'], [16, 'pebbletoss'], [20, 'vinelash'], [24, 'stoneskin'], [28, 'rubblerain'], [33, 'bloomburst']],
      null, 45, 160, { kind: 'BRAMBLE', ht: '1.3m', wt: '74.0kg', text: 'Moss and stone grow together on its shell. Old ones are mistaken for hillsides.' }),
    cindercub: mon('CINDERCUB', ['FIRE'], [46, 62, 42, 60, 52],
      [[1, 'nip'], [1, 'snarl'], [6, 'cinderspit'], [11, 'hotpaw'], [15, 'windup'], [20, 'blazeroll'], [27, 'furnaceroar']],
      { lvl: 18, into: 'blazebear' }, 45, 65, { kind: 'EMBER', ht: '0.6m', wt: '11.5kg', text: 'Its paws are warm as fresh bread. It hugs cold travelers until they thaw.' }),
    blazebear: mon('BLAZEBEAR', ['FIRE'], [88, 105, 72, 74, 82],
      [[1, 'nip'], [1, 'cinderspit'], [1, 'hotpaw'], [1, 'windup'], [18, 'heavyflop'], [22, 'blazeroll'], [28, 'recklessram'], [33, 'furnaceroar']],
      null, 45, 170, { kind: 'FURNACE', ht: '1.9m', wt: '140.0kg', text: 'The flame on its back roars when it is angry. In winter it sleeps inside volcanoes.' }),
    puddlet: mon('PUDDLET', ['WATER'], [50, 46, 50, 56, 62],
      [[1, 'bump'], [1, 'waggle'], [5, 'dripshot'], [9, 'fizzburst'], [13, 'tideslap'], [17, 'catnap'], [23, 'deluge']],
      { lvl: 18, into: 'torrentoad' }, 120, 62, { kind: 'TADPOLE', ht: '0.3m', wt: '2.9kg', text: 'It blows bubbles when it is nervous. Rainy days make it dance in circles.' }),
    torrentoad: mon('TORRENTOAD', ['WATER'], [90, 80, 82, 66, 96],
      [[1, 'bump'], [1, 'dripshot'], [1, 'fizzburst'], [1, 'tideslap'], [18, 'heavyflop'], [22, 'catnap'], [27, 'deluge']],
      null, 45, 165, { kind: 'FLOODTOAD', ht: '1.2m', wt: '61.0kg', text: 'One croak can flood a valley. It guards still ponds and the creatures in them.' }),
    pebbit: mon('PEBBIT', ['ROCK'], [40, 64, 80, 26, 30],
      [[1, 'bump'], [1, 'bristle'], [5, 'pebbletoss'], [9, 'gravelshot'], [13, 'stoneskin'], [17, 'rubblerain'], [24, 'boulderslam']],
      { lvl: 20, into: 'bouldurr' }, 150, 60, { kind: 'PEBBLE', ht: '0.3m', wt: '18.0kg', text: 'It sits so still that birds land on it. When poked, it rolls away giggling.' }),
    bouldurr: mon('BOULDURR', ['ROCK'], [70, 85, 100, 40, 45],
      [[1, 'bump'], [1, 'pebbletoss'], [1, 'bristle'], [9, 'gravelshot'], [16, 'rubblerain'], [21, 'heavyflop'], [26, 'boulderslam'], [32, 'geodegleam']],
      null, 60, 150, { kind: 'BOULDER', ht: '1.4m', wt: '210.0kg', text: 'It eats gravel and grows a new layer each year. Its punch can split a cliff.' }),
    fluffin: mon('FLUFFIN', ['NORMAL', 'FLYING'], [42, 46, 40, 58, 36],
      [[1, 'beakrap'], [1, 'snarl'], [5, 'breezecut'], [9, 'dartdash'], [12, 'ruffle'], [16, 'divebomb'], [22, 'galeburst']],
      { lvl: 14, into: 'galewing' }, 255, 52, { kind: 'PUFFBIRD', ht: '0.3m', wt: '1.2kg', text: 'Mostly feathers. A strong wind can carry it for miles, and it does not mind.' }),
    galewing: mon('GALEWING', ['NORMAL', 'FLYING'], [72, 78, 66, 96, 66],
      [[1, 'beakrap'], [1, 'breezecut'], [1, 'dartdash'], [1, 'ruffle'], [14, 'divebomb'], [20, 'heavyflop'], [26, 'galeburst'], [32, 'recklessram']],
      null, 90, 140, { kind: 'GALE', ht: '1.1m', wt: '24.0kg', text: 'It rides storm fronts across the region. Its cry sounds like a kettle.' }),
    nibblet: mon('NIBBLET', ['NORMAL'], [32, 56, 35, 72, 25],
      [[1, 'nip'], [1, 'waggle'], [4, 'dartdash'], [8, 'gnawdown'], [12, 'flurry'], [16, 'windup'], [21, 'recklessram']],
      { lvl: 16, into: 'gnashrat' }, 255, 50, { kind: 'GNAWER', ht: '0.2m', wt: '2.0kg', text: 'Its front teeth never stop growing, so it chews on everything. Hide your shoes.' }),
    gnashrat: mon('GNASHRAT', ['NORMAL'], [56, 84, 60, 100, 50],
      [[1, 'nip'], [1, 'dartdash'], [1, 'gnawdown'], [1, 'flurry'], [16, 'windup'], [22, 'recklessram'], [28, 'gloomclaw'], [34, 'heavyflop']],
      null, 120, 130, { kind: 'GNAWER', ht: '0.7m', wt: '19.0kg', text: 'It can chew through a fence post in one night. Packs of them follow the rival.' }),
    fuzzbug: mon('FUZZBUG', ['BUG'], [40, 32, 36, 46, 22],
      [[1, 'stingjab'], [1, 'silkspray'], [5, 'bump'], [10, 'swarmrush']],
      { lvl: 7, into: 'cocoonix' }, 255, 40, { kind: 'FUZZ', ht: '0.3m', wt: '2.5kg', text: 'Its fuzz tickles. It munches leaves all day and dreams of flying.' }),
    cocoonix: mon('COCOONIX', ['BUG'], [50, 22, 70, 30, 26],
      [[1, 'bump'], [1, 'stingjab'], [1, 'silkspray'], [7, 'bristle'], [13, 'swarmrush']],
      { lvl: 10, into: 'lumimoth' }, 120, 70, { kind: 'COCOON', ht: '0.6m', wt: '9.9kg', text: 'It hangs from branches and barely moves. Faint light shines through its shell.' }),
    lumimoth: mon('LUMIMOTH', ['BUG', 'FLYING'], [62, 46, 52, 72, 86],
      [[1, 'breezecut'], [1, 'silkspray'], [1, 'stingjab'], [10, 'dazedust'], [14, 'mindpulse'], [19, 'hivebeam'], [25, 'galeburst'], [31, 'mend']],
      null, 45, 155, { kind: 'GLOWMOTH', ht: '1.0m', wt: '30.0kg', text: 'Its wings glow on moonless nights. Lost hikers follow the light home.' }),
    sparkfly: mon('SPARKFLY', ['BUG', 'ELECTRIC'], [54, 50, 46, 92, 72],
      [[1, 'stingjab'], [1, 'spark'], [8, 'buzzwave'], [12, 'swarmrush'], [16, 'zapdash'], [21, 'hivebeam'], [27, 'stormcall']],
      null, 120, 110, { kind: 'FIREFLY', ht: '0.4m', wt: '4.0kg', text: 'Swarms of them blink in rhythm over the forest. Touching one gives a tingle.' }),
    mossprite: mon('MOSSPRITE', ['GRASS'], [62, 46, 66, 56, 82],
      [[1, 'leafflick'], [1, 'bristle'], [6, 'sapsip'], [10, 'snoozespore'], [15, 'thornvolley'], [20, 'mend'], [26, 'bloomburst']],
      null, 90, 120, { kind: 'MOSS', ht: '0.5m', wt: '5.5kg', text: 'It hides by curling up on a stump. Where it sleeps, mushrooms sprout overnight.' }),
    wispurr: mon('WISPURR', ['GHOST'], [52, 62, 46, 92, 86],
      [[1, 'spooktap'], [1, 'fadeout'], [8, 'gloomclaw'], [13, 'hexstare'], [18, 'wispfire'], [24, 'mindpulse'], [30, 'phantomrush']],
      null, 45, 140, { kind: 'WISPCAT', ht: '0.5m', wt: '0.1kg', text: 'It purrs from empty rooms. If you hear it, leave a saucer of milk by the door.' }),
    hootlet: mon('HOOTLET', ['PSYCHIC', 'FLYING'], [56, 42, 46, 56, 72],
      [[1, 'beakrap'], [1, 'hypnohoot'], [6, 'mindpulse'], [11, 'breezecut'], [15, 'stillmind'], [22, 'psiburst']],
      { lvl: 20, into: 'hootrix' }, 190, 64, { kind: 'OWLET', ht: '0.4m', wt: '3.0kg', text: 'It turns its head all the way around. It always seems to know what you will do.' }),
    hootrix: mon('HOOTRIX', ['PSYCHIC', 'FLYING'], [82, 62, 70, 82, 102],
      [[1, 'beakrap'], [1, 'hypnohoot'], [1, 'mindpulse'], [1, 'breezecut'], [20, 'stillmind'], [24, 'divebomb'], [29, 'psiburst'], [34, 'galeburst']],
      null, 75, 158, { kind: 'SEER OWL', ht: '1.3m', wt: '35.0kg', text: 'Its eyes glow when it reads minds. Villages once asked it about the harvest.' }),
    shellop: mon('SHELLOP', ['WATER', 'ROCK'], [52, 72, 100, 36, 62],
      [[1, 'bump'], [1, 'shellup'], [6, 'dripshot'], [11, 'pebbletoss'], [16, 'tideslap'], [22, 'rubblerain'], [28, 'deluge']],
      null, 120, 120, { kind: 'SHELL', ht: '0.5m', wt: '28.0kg', text: 'It snaps its shell shut to make a loud clap. Divers hear it from far away.' }),
    auroryx: mon('AURORYX', ['PSYCHIC', 'ELECTRIC'], [96, 90, 90, 108, 126],
      [[1, 'mindpulse'], [1, 'spark'], [10, 'buzzwave'], [18, 'mend'], [24, 'psiburst'], [30, 'auroralance'], [34, 'stormcall']],
      null, 3, 230, { kind: 'AURORA', ht: '2.4m', wt: '88.0kg', text: 'It is said to bring the northern lights. Its mane shimmers in every color at once.' }),
  };
  D.dexOrder = ['voltkit', 'sproutle', 'thornback', 'cindercub', 'blazebear', 'puddlet', 'torrentoad', 'pebbit', 'bouldurr', 'fluffin', 'galewing',
    'nibblet', 'gnashrat', 'fuzzbug', 'cocoonix', 'lumimoth', 'sparkfly', 'mossprite', 'wispurr', 'hootlet', 'hootrix', 'shellop', 'auroryx'];
  D.dexOrder.forEach((id, i) => { D.mons[id].no = i + 1; });

  // ---------- Items ----------
  // use: {heal:n} {cure:'PSN'|'all'} {revive:frac} {catch:mult} {repel:steps}
  D.items = {
    potion: { name: 'POTION', price: 300, desc: 'Restores 20 HP.', use: { heal: 20 } },
    superpotion: { name: 'SUPER POTION', price: 700, desc: 'Restores 50 HP.', use: { heal: 50 } },
    antidote: { name: 'ANTIDOTE', price: 100, desc: 'Cures poison.', use: { cure: 'PSN' } },
    awaken: { name: 'AWAKEN', price: 250, desc: 'Wakes a sleeping mon.', use: { cure: 'SLP' } },
    fullheal: { name: 'FULL HEAL', price: 600, desc: 'Cures any status.', use: { cure: 'all' } },
    revive: { name: 'REVIVE', price: 1500, desc: 'Revives a fainted mon to half HP.', use: { revive: 0.5 } },
    orb: { name: 'ORB', price: 200, desc: 'A capsule for catching wild mons.', use: { catch: 1 } },
    greatorb: { name: 'GREAT ORB', price: 600, desc: 'A better orb. Catches more easily.', use: { catch: 1.5 } },
    repel: { name: 'REPEL', price: 350, desc: 'Keeps weak wild mons away for 100 steps.', use: { repel: 100 } },
  };
  // Is the item usable on this mon? (heal/cure/revive types)
  D.canUse = function (m, itemId) {
    const u = (D.items[itemId] || {}).use || {};
    if (u.heal) return m.hp > 0 && m.hp < m.maxhp;
    if (u.cure) return m.hp > 0 && !!m.status && (u.cure === 'all' || u.cure === m.status);
    if (u.revive) return m.hp <= 0;
    return false;
  };
  // Apply the item to the mon. Returns a message, or null if it would have no effect. Does not consume.
  D.applyItem = function (m, itemId) {
    if (!D.canUse(m, itemId)) return null;
    const u = D.items[itemId].use, nm = m.nick || D.mons[m.id].name;
    if (u.heal) { const before = m.hp; m.hp = Math.min(m.maxhp, m.hp + u.heal); return nm + ' recovered ' + (m.hp - before) + ' HP!'; }
    if (u.cure) {
      const s = m.status; m.status = null; m.slpT = 0;
      return nm + ({ PSN: ' was cured of poison!', SLP: ' woke up!', BRN: "'s burn was healed!", PAR: ' is no longer paralyzed!', FRZ: ' thawed out!' }[s] || ' is healthy!');
    }
    if (u.revive) { m.hp = Math.max(1, Math.floor(m.maxhp * u.revive)); m.status = null; return nm + ' is revitalized!'; }
    return null;
  };

  // ---------- Stats / XP ----------
  G.xpForLevel = function (n) { return n <= 1 ? 0 : n * n * n; }; // medium-fast
  function calcStat(base, dv, lvl) { return Math.floor(((base + dv) * 2 * lvl) / 100) + 5; }
  function calcHP(base, dv, lvl) { return Math.floor(((base + dv) * 2 * lvl) / 100) + lvl + 10; }

  G.recalc = function (m) {
    const s = D.mons[m.id], b = s.base, dv = m.dv;
    const oldMax = m.maxhp || 0;
    m.stats = { atk: calcStat(b.atk, dv.atk, m.lvl), def: calcStat(b.def, dv.def, m.lvl), spd: calcStat(b.spd, dv.spd, m.lvl), spc: calcStat(b.spc, dv.spc, m.lvl) };
    m.maxhp = calcHP(b.hp, dv.hp, m.lvl);
    if (m.hp == null) m.hp = m.maxhp;
    else if (m.hp > 0) m.hp = G.clamp(m.hp + (m.maxhp - oldMax), 1, m.maxhp);
    return m;
  };

  // Moves known at a level: the last 4 distinct moves learned at or below lvl.
  G.movesAt = function (id, lvl) {
    const out = [];
    D.mons[id].learn.forEach(([l, mv]) => { if (l <= lvl && !out.includes(mv)) out.push(mv); });
    return out.slice(-4);
  };

  G.makeMon = function (id, lvl) {
    if (!D.mons[id]) throw new Error('Unknown mon ' + id);
    lvl = G.clamp(lvl | 0, 1, 100);
    const dv = { atk: G.rand(16), def: G.rand(16), spd: G.rand(16), spc: G.rand(16) };
    dv.hp = ((dv.atk & 1) << 3) | ((dv.def & 1) << 2) | ((dv.spd & 1) << 1) | (dv.spc & 1);
    const m = { id, nick: null, lvl, xp: G.xpForLevel(lvl), hp: null, maxhp: 0, stats: null,
      moves: G.movesAt(id, lvl).map((mv) => ({ id: mv, pp: D.moves[mv].pp })),
      status: null, bond: id === 'voltkit' ? 70 : 0, dv };
    G.recalc(m);
    m.hp = m.maxhp;
    return m;
  };

  G.healMon = function (m) {
    m.hp = m.maxhp; m.status = null; m.slpT = 0;
    m.moves.forEach((mv) => { mv.pp = D.moves[mv.id].pp; });
  };
  G.healParty = function () { ((G.state && G.state.party) || []).forEach(G.healMon); };
  G.monName = function (m) { return m.nick || D.mons[m.id].name; };
})();
