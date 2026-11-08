// Four short, replayable ways to practice the active spelling word.
const letters = Array.from;
const splitWord = word => letters(word.normalize("NFC"));
const folded = text => text.trim().normalize("NFC").replace(/[’‘]/g, "'").toLocaleLowerCase();
function mix(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const substitutions = {
  a: "eu", b: "dp", c: "ks", d: "bt", e: "ia", f: "v", g: "jk", h: "n",
  i: "ey", j: "g", k: "cg", l: "r", m: "n", n: "m", o: "ua", p: "b",
  q: "k", r: "l", s: "zc", t: "d", u: "oa", v: "f", w: "v", x: "z", y: "ie", z: "s"
};
function choicesFor(word) {
  const chars = splitWord(word);
  const decoys = new Set();
  const add = candidate => {
    if (candidate && folded(candidate) !== folded(word)) decoys.add(candidate);
  };
  const writable = chars.map((ch, i) => /\p{L}/u.test(ch) ? i : -1).filter(i => i >= 0);
  for (const i of mix(writable)) {
    const ch = chars[i];
    const replacement = mix(letters(substitutions[ch.toLowerCase()] || "aeiou"))[0];
    const alternate = ch !== ch.toLowerCase() ? replacement.toUpperCase() : replacement;
    add(chars.toSpliced(i, 1, alternate).join(""));
    if (chars.length > 2) {
      add(chars.toSpliced(i, 1).join(""));
      add(chars.toSpliced(i, 0, ch).join(""));
    }
    if (i + 1 < chars.length && /\p{L}/u.test(chars[i + 1])) {
      add(chars.toSpliced(i, 2, chars[i + 1], ch).join(""));
    }
  }
  // One-letter words and repeated letters still need two unique choices.
  for (const suffix of ["e", "s", "a"]) add(word + suffix);
  return mix([word, ...mix([...decoys]).slice(0, 2)]);
}

const shapes = {
  speaker: '<path d="M3 9v6h4l5 4V5L7 9H3Z"/><path d="M16 8c2.5 2 2.5 6 0 8m3-11c4.5 4 4.5 10 0 14"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  undo: '<path d="M8 5 3 10l5 5m-5-5h10a6 6 0 0 1 0 12" transform="translate(1 -2)"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  star: '<path d="m12 3 2.7 5.6 6.2.9-4.5 4.4 1.1 6.2-5.5-3-5.5 3 1.1-6.2-4.5-4.4 6.2-.9Z"/>',
  radio: '<path d="m43 33 41-20"/><rect x="21" y="33" width="89" height="51" rx="12" fill="#ffbe74"/><rect x="29" y="41" width="75" height="35" rx="7" fill="#fff1c9"/><circle cx="49" cy="58" r="12" fill="#58ab9a"/><path d="M71 48h23m-23 6h23m-23 7h13m-13 6h13"/><circle cx="94" cy="65" r="4" fill="#df7959"/><path d="M13 42c-5 7-5 14 0 21m105-21c5 7 5 14 0 21"/>',
  tiles: '<g transform="rotate(-10 39 54)"><rect x="15" y="32" width="39" height="42" rx="8" fill="#95cbb6"/><path d="m26 62 8-20 8 20m-13-6h10"/></g><rect x="49" y="22" width="39" height="42" rx="8" fill="#fff0bf"/><path d="M62 32v22h7c10 0 10-12 0-12h-7m0-10h6c9 0 9 10 0 10"/><g transform="rotate(12 96 64)"><rect x="78" y="45" width="39" height="38" rx="8" fill="#ffa677"/><path d="M104 54c-13-8-19 19-3 18l4-2"/></g>',
  ladder: '<path d="M12 77c16-16 35-15 54-7 19 6 39-2 54-12v28H12Z" fill="#a5cdb0" stroke="none"/><path d="M44 81 68 22m-9 61 22-59" stroke-width="6"/><path d="m50 69 13 2m-9-15 14 2m-9-15 14 2m-8-15 13 2"/><path d="m78 23 3-15 19 8-21 4Z" fill="#ff9d76"/><path d="m19 31 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" stroke="none" fill="#d99736"/>',
  lens: '<g transform="rotate(-12 68 52)"><rect x="29" y="19" width="57" height="57" rx="8" fill="#fff1c7"/><path d="M39 33h31m-31 9h24m-24 9h13m-13 9h13"/><path d="m80 62 15 17" stroke-width="12"/><path d="m80 62 15 17" stroke="#d98058" stroke-width="7"/><circle cx="71" cy="51" r="18" fill="#9ddbc7"/><circle cx="71" cy="51" r="12" fill="#dbf3dd"/><path d="m65 51 4 4 8-9"/></g>'
};
function icon(name, art = false) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.setAttribute("viewBox", art ? "0 0 132 94" : "0 0 24 24");
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("focusable", "false");
  el.setAttribute("fill", "none");
  el.setAttribute("stroke", art ? "#2f5049" : "currentColor");
  el.setAttribute("stroke-width", art ? "3.2" : "2");
  el.setAttribute("stroke-linecap", "round");
  el.setAttribute("stroke-linejoin", "round");
  el.innerHTML = shapes[name];
  return el;
}
function node(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}
function button(text, action, cls = "", symbol) {
  const el = node("button", "pr-btn " + cls);
  el.type = "button";
  if (symbol) el.append(icon(symbol));
  el.append(document.createTextNode(text));
  el.addEventListener("click", action);
  return el;
}
function visuallySpaced(char) { return char === " " ? "␣" : char; }

export function playPractice(id, ctx) {
  const word = String(ctx.target || "").trim();
  const chars = splitWord(word);
  const root = node("section", "pr-game pr-" + id);
  ctx.el.replaceChildren(root);
  if (!word) {
    root.append(node("p", "", "Add a spelling word to play."));
    return () => {};
  }
  const titles = {
    spell: ["radio", "Hear it. Spell it.", "Listen to the word, then type it below."],
    scramble: ["tiles", "Unmix the letters", "Tap the tiles in spelling order."],
    ladder: ["ladder", "Climb the word ladder", "Spell the same word on three rungs."],
    detective: ["lens", "Find the true word", "Hear the word. Pick its matching card."]
  };
  const [art, title, instruction] = titles[id];
  const head = node("div", "pr-head");
  head.append(icon(art, true));
  const copy = node("div", "pr-copy");
  copy.append(node("h3", "", title), node("p", "", instruction));
  head.append(copy);
  root.append(head);
  const body = node("div", "pr-body");
  const help = node("div", "pr-help");
  const feedback = node("p", "pr-feedback");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  root.append(body, help, feedback);
  let finished = false;
  let closed = false;
  let afterWin;
  const report = (message, kind = "") => {
    feedback.textContent = message;
    feedback.dataset.kind = kind;
  };
  const retry = message => { ctx.sound?.(false); report(message, "retry"); };
  const complete = () => {
    if (finished || closed) return;
    finished = true;
    root.classList.add("pr-complete");
    report("You spelled " + word + "!", "win");
    afterWin = setTimeout(() => { if (!closed) ctx.win(word); }, 350);
  };
  const speak = () => {
    if (ctx.speak?.(word) === false) {
      report(id === "ladder" ? "Sound is off. Follow the letters on the ladder." : "Sound is off or unavailable. Tap “Peek at word” for a clue.");
    }
  };
  function addClues(withPeek = true) {
    const listen = button("Hear word", speak, "pr-chip", "speaker");
    help.append(listen);
    if (!withPeek) return;
    const clue = node("div", "pr-peek", word);
    clue.hidden = true;
    const peek = button("Peek at word", () => {
      clue.hidden = !clue.hidden;
      peek.lastChild.textContent = clue.hidden ? "Peek at word" : "Hide word";
      peek.setAttribute("aria-expanded", String(!clue.hidden));
    }, "pr-chip", "eye");
    peek.setAttribute("aria-expanded", "false");
    help.append(peek, clue);
  }

  if (id === "spell") {
    const form = node("form", "pr-form");
    const field = node("input", "pr-input");
    field.type = "text";
    field.placeholder = "Type the word";
    field.autocapitalize = "none";
    field.autocomplete = "off";
    field.setAttribute("autocorrect", "off");
    field.spellcheck = false;
    field.setAttribute("aria-label", "Your spelling");
    field.enterKeyHint = "done";
    const check = button("Check spelling", () => {}, "pr-action", "check");
    check.type = "submit";
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (finished || closed) return;
      if (folded(field.value) === folded(word)) { field.blur(); complete(); }
      else {
        const typed = splitWord(folded(field.value));
        const correct = splitWord(folded(word));
        let matched = 0;
        while (matched < typed.length && matched < correct.length && typed[matched] === correct[matched]) matched++;
        if (!typed.length) report("Type the word first. You can hear it again.");
        else if (matched >= correct.length) retry("The word ends after “" + word + "”. Try again.");
        else if (matched) retry("You have “" + correct.slice(0, matched).join("") + "”. Look at the next letter.");
        else retry("Try the first letter “" + chars[0] + "”. You can do this.");
        field.focus();
      }
    });
    const pads = node("div", "pr-worddots");
    pads.setAttribute("aria-label", chars.length + " letters");
    chars.forEach(() => pads.append(node("i")));
    form.append(pads, field, check);
    body.append(form);
    addClues();
    speak();
  }

  if (id === "scramble") {
    const tray = node("div", "pr-tray");
    const pool = node("div", "pr-pool");
    const selected = [];
    const bank = mix(chars.map((char, index) => ({char, index})));
    if (bank.map(t => t.char).join("") === word) {
      const other = bank.findIndex(t => t.char !== bank[0].char);
      if (other > 0) [bank[0], bank[other]] = [bank[other], bank[0]];
    }
    const undo = button("Undo", () => { if (!finished) { selected.pop(); report(""); render(); } }, "pr-chip", "undo");
    const render = () => {
      tray.replaceChildren();
      pool.replaceChildren();
      undo.disabled = !selected.length || finished;
      chars.forEach((_, i) => {
        const value = selected[i]?.char;
        const slot = node("span", "pr-slot" + (value ? " pr-filled" : ""), value ? visuallySpaced(value) : "·");
        tray.append(slot);
      });
      bank.forEach((tile, i) => {
        const pick = button(visuallySpaced(tile.char), () => {
          if (selected.includes(tile) || finished) return;
          selected.push(tile);
          report("");
          if (selected.length === chars.length) {
            const firstWrong = selected.findIndex((entry, j) => entry.char !== chars[j]);
            if (firstWrong < 0) complete();
            else {
              selected.splice(firstWrong);
              retry("Keep going. Next comes “" + visuallySpaced(chars[firstWrong]) + "”.");
            }
          }
          render();
        }, "pr-tile");
        pick.style.setProperty("--tile-tilt", [1,-2,2,-1][i % 4] + "deg");
        pick.disabled = selected.includes(tile) || finished;
        pick.setAttribute("aria-label", "Letter " + tile.char);
        pool.append(pick);
      });
    };
    tray.setAttribute("aria-label", "Your word");
    body.append(tray, pool);
    addClues();
    help.insertBefore(undo, help.firstChild);
    render();
    speak();
  }

  if (id === "ladder") {
    let stage = 0, index = 0, studying = true;
    const rungs = node("div", "pr-rungs");
    const prompt = node("p", "pr-label");
    const slots = node("div", "pr-ladder-word");
    const options = node("div", "pr-options");
    body.append(rungs, prompt, slots, options);
    addClues(false);
    function draw() {
      rungs.replaceChildren();
      ["Look", "Remember", "Recall"].forEach((label, i) => {
        const rung = node("span", "pr-rung", label);
        rung.dataset.state = i < stage ? "done" : i === stage ? "active" : "next";
        rungs.append(rung);
      });
      slots.replaceChildren();
      options.replaceChildren();
      chars.forEach((ch, i) => {
        const hinted = studying || stage === 0 || (stage === 1 && i % 2 === 0);
        const slot = node("span", "pr-slot", hinted || i < index ? visuallySpaced(ch) : "·");
        if (!studying && i === index) slot.classList.add("pr-current");
        else if (i < index) slot.classList.add("pr-filled");
        slots.append(slot);
      });
      if (studying) {
        prompt.textContent = stage === 0 ? "Look at every letter." : "Take another look before you climb.";
        options.append(button(stage ? "Keep climbing" : "Start climbing", () => { studying = false; report(""); draw(); }, "pr-action", "arrow"));
        return;
      }
      prompt.textContent = "Pick letter " + (index + 1) + " of " + chars.length + ".";
      const correct = chars[index];
      const alternatives = [...new Set([...mix(chars), ...mix(letters("aeiourstlmnpb"))])].filter(c => folded(c) !== folded(correct));
      mix([correct, ...alternatives.slice(0,2)]).forEach(ch => {
        const answer = button(visuallySpaced(ch), () => {
          if (finished) return;
          if (ch !== correct) { answer.disabled = true; retry("Try another letter. You can hear the word again."); return; }
          index++;
          report("");
          if (index < chars.length) { draw(); return; }
          if (stage === 2) { drawEnd(); complete(); return; }
          stage++;
          index = 0;
          studying = true;
          report("Rung complete!", "win");
          draw();
        }, "pr-tile");
        answer.setAttribute("aria-label", "Choose letter " + ch);
        options.append(answer);
      });
    }
    function drawEnd() {
      slots.replaceChildren(...chars.map(ch => node("span", "pr-slot pr-filled", visuallySpaced(ch))));
      options.replaceChildren();
      prompt.textContent = "You reached the top!";
    }
    draw();
    speak();
  }

  if (id === "detective") {
    const cards = node("div", "pr-cards");
    choicesFor(word).forEach((candidate, i) => {
      const pick = button("", () => {
        if (finished) return;
        if (candidate === word) { pick.dataset.state = "correct"; complete(); }
        else {
          pick.disabled = true;
          pick.dataset.state = "miss";
          retry("That card is a near miss. Listen or peek, then try again.");
        }
      }, "pr-card");
      const mark = node("span", "pr-card-mark", ["◆","●","▲"][i]);
      mark.setAttribute("aria-hidden", "true");
      const label = node("span", "pr-card-word",candidate);
      pick.replaceChildren(mark, label, icon("arrow"));
      cards.append(pick);
    });
    body.append(cards);
    addClues();
    speak();
  }
  return () => { closed = true; clearTimeout(afterWin); };
}
