// Word Grove's four arcade rounds. Each owns its DOM, timers and end-of-round guard.
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const VOWELS = 'aeiou';
const CONSONANTS = 'bcdfghjklmnprstvwxyz';
const GRAPHEMES = ['tch', 'igh', 'dge', 'sh', 'ch', 'th', 'wh', 'ph', 'ck', 'ng', 'qu', 'ee', 'ea', 'ai', 'ay', 'oa', 'ow', 'oo', 'ou', 'oi', 'oy', 'ar', 'or', 'er'];

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function chunksOf(word, limit) {
  const pieces = [];
  for (let i = 0; i < word.length;) {
    const piece = GRAPHEMES.find(g => word.startsWith(g, i)) || word[i];
    pieces.push(piece);
    i += piece.length;
  }
  if (pieces.length === 1 && word.length > 1) return [...word];
  while (pieces.length > limit) {
    let at = 0;
    for (let i = 1; i < pieces.length - 1; i++) {
      if ((pieces[i] + pieces[i + 1]).length < (pieces[at] + pieces[at + 1]).length) at = i;
    }
    pieces.splice(at, 2, pieces[at] + pieces[at + 1]);
  }
  return pieces;
}

function choicesFor(answer, word, count) {
  const useful = shuffle([...new Set(Array.from(word + (VOWELS.includes(answer) ? VOWELS : CONSONANTS)))]);
  const candidates = [...new Set([answer, ...useful, ...shuffle(LETTERS)])];
  return shuffle(candidates.slice(0, count));
}

function node(tag, cls, label) {
  const el = document.createElement(tag);
  el.className = cls;
  if (label !== undefined) el.textContent = label;
  return el;
}

function button(cls, label, action, aria) {
  const el = node('button', cls, label);
  el.type = 'button';
  if (aria) el.setAttribute('aria-label', aria);
  el.addEventListener('click', event => action(el, event));
  return el;
}

const CUE = {
  catch: 'Catch the letters in order.',
  pairs: 'Find two cards with the same letters.',
  train: 'Build the word from left to right.',
  missing: 'Which letter fills the gap?'
};

export function playArcade(id, ctx) {
  const {el, speak, win, sound, hint} = ctx;
  const word = String(ctx.target || '').toLocaleLowerCase().trim();
  if (!CUE[id] || !word) {
    el.textContent = 'Choose a word to play.';
    return () => {};
  }
  let active = true, ended = false;
  const timers = new Set();
  function later(fn, ms) {
    const t = setTimeout(() => { timers.delete(t); if (active) fn(); }, ms);
    timers.add(t);
  }
  const panel = node('section', 'ga ga-' + id);
  const instructions = node('div', 'ga-cue', CUE[id]);
  const board = node('div', 'ga-board');
  const message = node('div', 'ga-status');
  message.setAttribute('role', 'status');
  const hear = button('ga-hear', 'Hear word', () => speak(word), 'Hear the word again');
  const ear = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ear.setAttribute('viewBox','0 0 24 24'); ear.setAttribute('fill','none'); ear.setAttribute('stroke','currentColor'); ear.setAttribute('stroke-width','2'); ear.setAttribute('stroke-linecap','round'); ear.setAttribute('stroke-linejoin','round'); ear.setAttribute('aria-hidden','true');
  const path = document.createElementNS(ear.namespaceURI,'path');
  path.setAttribute('d','M3 9h4l5-4v14l-5-4H3z M16 9a5 5 0 0 1 0 6 M19 6a9 9 0 0 1 0 12'); ear.append(path); hear.prepend(ear);
  const head = node('div', 'ga-head'); head.append(instructions, hear);
  panel.append(head, board, message);
  el.replaceChildren(panel);
  function progressLine(label) {
    const line = node('div','ga-progress');
    line.setAttribute('aria-label', label);
    return line;
  }
  function wrong(target, text) {
    sound?.(false); message.textContent = text;
    target.classList.remove('ga-wiggle');
    void target.offsetWidth;
    target.classList.add('ga-wiggle');
  }
  function finish() {
    if (ended || !active) return;
    ended = true;
    message.textContent = 'You spelled ' + word + '!';
    later(() => win(word), 350);
  }
  function choiceGroup() { return node('div','ga-choices'); }
  function keyboardFocus(event, scope) {
    if (event?.detail === 0 && !ended) {
      const next = scope.querySelector('button:not([disabled])');
      next?.focus({preventScroll:true});
    }
  }

  if (id === 'catch') {
    let index = 0;
    const letters = Array.from(word);
    const strip = progressLine('Word to catch: ' + word);
    const meadow = choiceGroup(); meadow.classList.add('ga-meadow');
    board.append(strip, meadow);
    function draw(event) {
      strip.replaceChildren(...letters.map((l, i) => node('span', 'ga-letter ' + (i < index ? 'ga-filled' : i === index ? 'ga-current' : ''), l)));
      if (index) strip.children[index - 1].classList.add('ga-landed');
      meadow.replaceChildren();
      if (index === letters.length) { finish(); return; }
      const answer = letters[index];
      message.textContent = 'Catch “' + answer + '”.';
      choicesFor(answer, word, 4).forEach((l, n) => {
        const acorn = button('ga-acorn', l, (self,e) => {
          if (ended || !active) return;
          if (l !== answer) return wrong(self, 'Look for “' + answer + '”.');
          sound?.(true); index++; draw(e);
        }, 'Catch letter ' + l);
        acorn.style.setProperty('--sway', String(n));
        meadow.append(acorn);
      });
      keyboardFocus(event, meadow);
    }
    draw();
  }

  if (id === 'pairs') {
    const chunks = chunksOf(word, 4);
    const keys = [...new Set(chunks)];
    const pool = shuffle([...keys, ...keys]);
    const matched = new Set();
    let first = null, locked = false;
    const strip = progressLine('Build the word: ' + word);
    const cards = node('div','ga-cards');
    cards.style.setProperty('--cols', String(pool.length < 5 ? 2 : pool.length === 6 ? 3 : 4));
    board.append(strip, cards);
    function showProgress() {
      strip.replaceChildren(...chunks.map(p => node('span','ga-piece ' + (matched.has(p) ? 'ga-filled' : ''), matched.has(p) ? p : '·'.repeat(p.length))));
    }
    function reveal(card, text) {
      card.textContent = text;
      card.classList.add('ga-open');
      card.setAttribute('aria-label', text);
    }
    function hide(card, index) {
      card.textContent = '✦';
      card.classList.remove('ga-open');
      card.setAttribute('aria-label','Turn over card ' + (index + 1));
    }
    pool.forEach((value,i) => {
      const card = button('ga-card', '', self => {
        if (ended || !active || locked || first?.index === i || matched.has(value)) return;
        reveal(self, value);
        if (!first) { first = {index:i, card:self}; message.textContent = 'Find another “' + value + '”.'; return; }
        const previous = first; first = null;
        if (pool[previous.index] === value) {
          matched.add(value); sound?.(true);
          [previous.card,self].forEach(k => {
            k.classList.add('ga-paired'); k.disabled = true; k.setAttribute('aria-label', 'Matched ' + value);
          });
          showProgress();
          message.textContent = 'You found the “' + value + '” pair.';
          if (matched.size === keys.length) finish();
        } else {
          locked = true; sound?.(false); message.textContent = 'Remember those letters. Try another pair.';
          later(() => { hide(previous.card, previous.index); hide(self,i); locked = false; }, 950);
        }
      });
      hide(card,i); cards.append(card);
    });
    showProgress(); message.textContent = 'Turn over any two cards.';
  }

  if (id === 'train') {
    const chunks = chunksOf(word, 6);
    const cars = shuffle([...chunks]);
    if (cars.length > 1 && cars.join('') === word) {
      const swap = cars.findIndex(v => v !== cars[0]);
      if (swap > 0) [cars[0],cars[swap]] = [cars[swap],cars[0]];
    }
    if (chunks.length === 1) cars.push(...shuffle(LETTERS.filter(l => l !== word)).slice(0,2));
    const spent = new Set(); let next = 0;
    const track = node('div','ga-track');
    const engine = node('i','ga-engine'); engine.setAttribute('aria-hidden','true');
    const assembled = progressLine('Your train');
    const yard = choiceGroup(); yard.classList.add('ga-yard');
    track.append(engine,assembled); board.append(track,yard);
    const peek = button('ga-peek','Peek at word',() => { message.textContent = 'The word is “' + word + '”.'; hint?.('The word is “' + word + '”.'); });
    board.append(peek);
    function paint(event) {
      assembled.replaceChildren(...chunks.map((p,i) => node('span','ga-wagon ' + (i < next ? 'ga-loaded' : ''), i < next ? p : '·')));
      if (next) assembled.children[next - 1].classList.add('ga-landed');
      yard.replaceChildren();
      if (next === chunks.length) { finish(); return; }
      message.textContent = next ? 'Which car goes next?' : 'Listen, then tap the first car.';
      cars.forEach((value,i) => {
        if (spent.has(i)) return;
        const carriage = button('ga-car',value,(self,e) => {
          if (ended || !active) return;
          if (value !== chunks[next]) return wrong(self, 'Try the car that says “' + chunks[next] + '”.');
          spent.add(i); next++; sound?.(true); paint(e);
        }, 'Add ' + value);
        yard.append(carriage);
      });
      keyboardFocus(event, yard);
    }
    paint();
  }

  if (id === 'missing') {
    const letters = Array.from(word);
    const blanks = shuffle(letters.map((_,i) => i)).slice(0,Math.min(3,Math.max(1,Math.floor(letters.length / 3))));
    let index = 0;
    const strip = progressLine('Fill in the missing letter');
    const choices = choiceGroup();
    board.append(strip,choices);
    function draw(event) {
      const pos = blanks[index], answer = letters[pos];
      strip.replaceChildren(...letters.map((l,i) => node('span','ga-letter ' + (i === pos ? 'ga-hole' : ''), i === pos ? '?' : l)));
      choices.replaceChildren();
      if (index === blanks.length) { finish(); return; }
      message.textContent = 'Listen to the word, then pick a letter.';
      choicesFor(answer, word, 3).forEach(l => {
        choices.append(button('ga-key',l,(self,e) => {
          if (ended || !active) return;
          if (l !== answer) return wrong(self, 'Try again. Listen for “' + answer + '”.');
          sound?.(true); index++; draw(e);
        }, 'Fill in ' + l));
      });
      keyboardFocus(event, choices);
    }
    draw();
  }
  return () => { active = false; timers.forEach(clearTimeout); timers.clear(); };
}
