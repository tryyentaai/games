// The generators also work without a DOM, so their invariants can be tested directly.
const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const fillers = 'etaoinshrdlucmfbwyp';
const key = (r, c) => r + ',' + c;
const pick = (list, random) => list[Math.floor(random() * list.length)];
function shuffle(list, random = Math.random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
const letters = word => String(word || '').normalize('NFKD').toLowerCase().replace(/[^a-z]/g, '');
function randomGrid(rows, cols, random) {
  return Array.from({length: rows}, () => Array.from({length: cols}, () => pick(fillers, random)));
}
export function makeSearch(raw, random = Math.random) {
  const word = letters(raw);
  const cols = Math.max(5, word.length + (word.length < 7 ? 1 : 0));
  const rows = Math.min(7, cols);
  const grid = randomGrid(rows, cols, random);
  const [dr, dc] = word.length > rows ? [0, 1] : pick([[0,1],[1,0],[1,1]], random);
  const r = Math.floor(random() * (rows - dr * (word.length - 1)));
  const c = Math.floor(random() * (cols - dc * (word.length - 1)));
  const route = [...word].map((ch, i) => {
    grid[r + i * dr][c + i * dc] = ch;
    return [r + i * dr, c + i * dc];
  });
  return {grid, route, word};
}
function line(start, end) {
  const rd = end[0] - start[0], cd = end[1] - start[1];
  if (rd && cd && Math.abs(rd) !== Math.abs(cd)) return [];
  return Array.from({length: Math.max(Math.abs(rd), Math.abs(cd)) + 1}, (_, i) =>
    [start[0] + i * Math.sign(rd), start[1] + i * Math.sign(cd)]);
}
export function makePath(raw, random = Math.random) {
  const word = letters(raw), side = Math.max(3, Math.ceil(Math.sqrt(word.length + 2)));
  const grid = randomGrid(side, side, random);
  // Shuffle a Hamiltonian path by reversible backbite moves. This preserves
  // connectivity, but breaks up the predictable turns of the starting snake.
  let walk = [];
  for (let r = 0; r < side; r++)
    for (let i = 0; i < side; i++)
      walk.push([r, r % 2 ? side - 1 - i : i]);
  for (let i = 0; i < side * 8; i++) {
    if (random() < .5) walk.reverse();
    const [r,c] = walk[0];
    const alternatives = [];
    for (let j = 2; j < walk.length; j++)
      if (Math.abs(walk[j][0] - r) + Math.abs(walk[j][1] - c) === 1) alternatives.push(j);
    if (alternatives.length) {
      const j = pick(alternatives, random);
      walk = walk.slice(0,j).reverse().concat(walk.slice(j));
    }
  }
  const offset = Math.floor(random() * (walk.length - word.length + 1));
  const route = walk.slice(offset, offset + word.length);
  route.forEach(([r,c], i) => { grid[r][c] = word[i]; });
  return {grid, route, word};
}
function cellsOf(entry) {
  return [...entry.word].map((_, i) => [entry.r + i * entry.dr, entry.c + i * entry.dc]);
}
export function makeCross(raw, list, random = Math.random) {
  const target = letters(raw), entries = [], board = new Map();
  function add(entry) {
    entries.push(entry);
    cellsOf(entry).forEach(([r,c], i) => {
      const id = key(r,c);
      const cell = board.get(id) || {r,c,ch:entry.word[i], dirs:[]};
      cell.dirs.push(entry.dr);
      board.set(id, cell);
    });
  }
  add({word:target, r:0,c:0,dr:0,dc:1});
  const choices = shuffle([...new Set(list.map(letters))].filter(w => w && w !== target), random);
  for (const word of choices) {
    if (entries.length >= 3) break;
    const candidates = [];
    for (const cell of board.values()) for (let i=0;i<word.length;i++) {
      if (word[i] !== cell.ch || cell.dirs.length > 1) continue;
      const dr = 1 - cell.dirs[0], dc = 1-dr;
      const r = cell.r - i*dr, c=cell.c - i*dc;
      if (board.has(key(r-dr,c-dc)) || board.has(key(r+dr*word.length,c+dc*word.length))) continue;
      const entry = {word,r,c,dr,dc};
      const valid = cellsOf(entry).every(([rr,cc],j) => {
        const old = board.get(key(rr,cc));
        if (old) return old.ch === word[j] && !old.dirs.includes(dr);
        return !board.has(key(rr+dc,cc+dr)) && !board.has(key(rr-dc,cc-dr));
      });
      if(valid) candidates.push(entry);
    }
    if (candidates.length) add(pick(candidates,random));
  }
  // Shift coordinates into positive space and number entries in reading order.
  const positions=[...board.values()];
  const minR=Math.min(...positions.map(s=>s.r)), minC=Math.min(...positions.map(s=>s.c));
  const maxR=Math.max(...positions.map(s=>s.r)), maxC=Math.max(...positions.map(s=>s.c));
  const grid=Array.from({length:maxR-minR+1},()=>Array(maxC-minC+1).fill(''));
  for (const cell of positions) grid[cell.r-minR][cell.c-minC]=cell.ch;
  for(const e of entries){ e.r-=minR; e.c-=minC; }
  const starts=[...entries].sort((a,b)=>a.r-b.r||a.c-b.c), numbers=new Map();
  for(const e of starts) {
    const k=key(e.r,e.c); if(!numbers.has(k)) numbers.set(k,numbers.size+1);
    e.num=numbers.get(k);
  }
  return {grid,entries};
}
const clues = {
  cat:'A pet that meows.', dog:'A pet that barks.', sun:'It shines in the daytime sky.', moon:'It shines in the night sky.',
  star:'A tiny light that twinkles in the night sky.', fish:'An animal that swims and has fins.', bird:'An animal with feathers.',
  frog:'It hops and says ribbit.', ship:'A big boat.', shop:'A place to buy things.', shell:'A snail carries one on its back.',
  rain:'Water drops that fall from clouds.', tree:'A plant with a trunk and branches.', leaf:'A flat green part of a plant.',
  seed:'Plant one and it can grow.', book:'It has pages to read.', bee:'An insect that makes honey.', pond:'A small body of still water.',
  red:'The color of a ripe strawberry.', blue:'The color of a clear daytime sky.', green:'The color of fresh grass.',
  run:'Move faster than a walk.', jump:'Push off the ground with your feet.', play:'What you do with a toy.',
  cake:'A birthday treat with candles.', bike:'A ride with two wheels and pedals.', duck:'A bird that quacks.',
  fox:'A wild animal with a bushy tail.', map:'A drawing that helps you find places.', bed:'The place where you sleep.',
  pig:'A farm animal that oinks.', hat:'You wear it on your head.', nest:'A bird builds this for its eggs.',
  boat:'A ride that floats on water.', snow:'White flakes that fall in cold weather.', kite:'A toy you fly on a string.',
  light:'It helps you see in the dark.', night:'The time after sunset.', bright:'Giving off lots of light.',
  train:'A long line of cars that travels on tracks.', chair:'A seat with a back.', snail:'It crawls and carries a shell.',
  cloud:'A fluffy shape in the sky.', grass:'The green blades on a lawn.',
  whale:'A giant mammal that swims in the ocean.', twig:'A little stick from a tree.'
};
function node(tag, cls, text) {
  const n=document.createElement(tag);
  if(cls) n.className=cls; if(text!==undefined) n.textContent=text;
  return n;
}
function button(label, cls, action, aria) {
  const b=node('button',cls,label); b.type='button'; if(aria)b.setAttribute('aria-label',aria);
  if(action)b.addEventListener('click',action); return b;
}
function gridUI(data, label, render) {
  const wrap=node('div','wg-pz-frame'), grid=node('div','wg-pz-board');
  grid.setAttribute('role','group'); grid.setAttribute('aria-label',label);
  grid.style.setProperty('--pz-cols',data[0].length);
  grid.style.setProperty('--pz-min',data[0].length>8?'25px':'30px');
  const tiles=new Map();
  data.forEach((row,r)=>row.forEach((ch,c)=>{
    if(!ch) { grid.append(node('span','wg-pz-gap')); return; }
    const t=render(ch,r,c); t.dataset.r=r;t.dataset.c=c; grid.append(t); tiles.set(key(r,c),t);
  }));
  wrap.append(grid);
  return {wrap,grid,tiles};
}
const same=(a,b)=> a && b && a[0]===b[0] && a[1]===b[1];
function makeRoot(ctx) {
  const wrap=node('section','wg-pz'); ctx.el.append(wrap);
  const note=node('div','wg-pz-note'); note.setAttribute('role','status');
  return {wrap,note, say:s=>{note.textContent=s;}};
}
function toolbar(wrap) { const row=node('div','wg-pz-tools'); wrap.append(row); return row; }
function drawSearch(ctx) {
  const {wrap,note,say}=makeRoot(ctx), {word,grid,route}=makeSearch(ctx.target);
  wrap.append(node('p','wg-pz-lead','Find the hidden word'), node('div','wg-pz-word',word));
  const b=gridUI(grid,'Hidden word board',(ch,r,c)=>button(ch,'wg-pz-tile',undefined,ch+', row '+(r+1)+', column '+(c+1)));
  b.grid.classList.add('wg-pz-search');
  if(grid[0].length>8)b.grid.classList.add('wg-pz-wide');
  wrap.append(b.wrap,note);
  let first=null,pressed=null,done=false;
  function mark(points,end=false) {
    const selected=new Set(points.map(([r,c])=>key(r,c)));
    b.tiles.forEach((tile,k)=>{tile.classList.toggle('pz-active',selected.has(k));tile.classList.toggle('pz-solved',end&&selected.has(k));});
  }
  function select(p) {
    if(done)return;
    if(!first){first=p; mark([p]); if(word.length!==1){say('Now tap the last letter.');return;}}
    const route=line(first,p);
    const answer=route.map(([r,c])=>grid[r][c]).join('');
    if(answer===word || [...answer].reverse().join('')===word){
      done=true;mark(route,true);say('You found '+word+'!');ctx.win(ctx.target);
    }else{
      first=null;mark([]); say('Try again. Start on '+word[0].toUpperCase()+'.');
    }
  }
  function point(t) {
    const cell=t instanceof Element?t.closest('.wg-pz-tile'):null;
    return cell && b.grid.contains(cell)?[Number(cell.dataset.r),Number(cell.dataset.c)]:null;
  }
  b.grid.addEventListener('pointerdown',e=>{pressed=point(e.target);});
  b.grid.addEventListener('pointermove',e=>{
    if(!pressed || done || e.buttons===0)return;
    const end=point(document.elementFromPoint(e.clientX,e.clientY)); if(end&&!same(pressed,end))mark(line(pressed,end));
  });
  b.grid.addEventListener('pointercancel',()=>{pressed=null; if(!done)mark(first?[first]:[]);});
  b.grid.addEventListener('pointerup',e=>{
    const from=pressed, to=point(document.elementFromPoint(e.clientX,e.clientY)); pressed=null;
    if(!from||!to||done)return;
    if(!same(from,to)) first=from;
    select(to);
  });
  b.grid.addEventListener('click',e=>{if(e.detail===0){const p=point(e.target);if(p)select(p);}});
  say('Tap the first and last letters, or slide between them.');
  const bar=toolbar(wrap);
  bar.append(button('Hear word','wg-pz-tool',()=>ctx.speak(ctx.target)),
    button('Find my start','wg-pz-tool',()=>{if(done)return;first=route[0];mark([first]);say('Start here. Now tap the last letter.');}));
}
function drawPath(ctx) {
  const {wrap,note,say}=makeRoot(ctx), {word,grid,route}=makePath(ctx.target);
  wrap.append(node('p','wg-pz-lead','Follow the letters in order'));
  const progress=node('div','wg-pz-steps');
  [...word].forEach(ch=>progress.append(node('span','wg-pz-step',ch)));
  wrap.append(progress);
  const path=[];
  let done=false;
  const b=gridUI(grid,'Word trail board',(ch,r,c)=>button(ch,'wg-pz-tile',()=>move([r,c]),ch+', row '+(r+1)+', column '+(c+1)));
  b.grid.classList.add('wg-pz-path'); wrap.append(b.wrap,note);
  function paint() {
    const ids=new Set(path.map(p=>key(...p)));
    b.tiles.forEach((t,k)=>{t.classList.toggle('pz-solved',ids.has(k));t.classList.toggle('pz-active',k===key(...(path.at(-1)||[-1,-1])));});
    [...progress.children].forEach((n,i)=>{n.classList.toggle('pz-filled',i<path.length);n.classList.toggle('pz-current',i===path.length);});
  }
  function move(p) {
    if(done)return;
    const last=path.at(-1);
    if(path.some(q=>same(q,p))){say('Use each stepping stone once.');return;}
    if(last && Math.abs(last[0]-p[0])+Math.abs(last[1]-p[1])!==1){say('Hop one space up, down, left, or right.');return;}
    if(grid[p[0]][p[1]]!==word[path.length]){say('Look for '+word[path.length].toUpperCase()+' next.');return;}
    path.push(p);b.tiles.forEach(tile=>tile.classList.remove('pz-tip'));paint();
    if(path.length===word.length){done=true;say('You spelled '+word+'!');ctx.win(ctx.target);}
    else say('Next, hop to '+word[path.length].toUpperCase()+'.');
  }
  paint();say('Tap a '+word[0].toUpperCase()+' to start. Move one space at a time.');
  const bar=toolbar(wrap);
  bar.append(button('Undo','wg-pz-tool',()=>{if(done)return;path.pop();paint();say('Look for '+word[path.length].toUpperCase()+'.');}),
    button('Show next hop','wg-pz-tool',()=>{
      if(done)return;
      // Recover gently from a matching prefix that leads to a dead end.
      let i=0;while(i<path.length && same(path[i],route[i]))i++;
      if(i<path.length){path.splice(i);paint();say('Try this path from here.');}
      b.tiles.forEach(tile=>tile.classList.remove('pz-tip'));
      const t=b.tiles.get(key(...route[path.length]));t.classList.remove('pz-tip');void t.offsetWidth;t.classList.add('pz-tip');
      t.scrollIntoView?.({block:'nearest',inline:'nearest'});say('Tap the outlined '+word[path.length].toUpperCase()+'.');
    }));
}
function drawCross(ctx) {
  const {wrap,note,say}=makeRoot(ctx), {grid,entries}=makeCross(ctx.target,ctx.words);
  let current=0,done=false;
  const answers=new Map(), solved=new Set();
  const letterBanks=entries.map(e=>{
    const options=new Set(e.word);
    for(const ch of shuffle(alphabet)){
      if(options.size>=Math.min(6,Math.max(3,e.word.length+1)))break;
      options.add(ch);
    }
    return [...options].sort();
  });
  const intro=node('p','wg-pz-lead',entries.length>1?'Fill the crossing words':'Fill the word boxes');
  wrap.append(intro);
  const card=node('div','wg-pz-clue'), tag=node('span','wg-pz-tag'), clue=node('strong','wg-pz-clue-copy');
  card.append(tag,clue);wrap.append(card);
  const nums=new Map(entries.map(e=>[key(e.r,e.c),e.num]));
  const b=gridUI(grid,'Crossword board',(ch,r,c)=>{
    const t=button('','wg-pz-tile',()=>chooseCell(r,c));
    if(nums.has(key(r,c)))t.append(node('small','wg-pz-number',nums.get(key(r,c))));
    t.append(node('span','wg-pz-glyph'));return t;
  });
  b.grid.classList.add('wg-pz-cross');wrap.append(b.wrap);
  const bank=node('div','wg-pz-bank');wrap.append(bank,note);
  const bar=toolbar(wrap);
  const audio=button('Hear word','wg-pz-tool',()=>ctx.speak(entries[current].word));
  const peek=button('Peek at word','wg-pz-tool',()=>{const w=entries[current].word;say('Look, say, spell: '+w.toUpperCase());});
  bar.append(audio,peek);
  function chooseCell(r,c){
    if(done)return;
    const candidates=entries.map((e,i)=>[e,i]).filter(([e,i])=>!solved.has(i)&&cellsOf(e).some(p=>same(p,[r,c])));
    if(!candidates.length)return;
    const other=candidates.find(([,i])=>i!==current);
    current=(other||candidates[0])[1];render();
  }
  function nextLetter(e){return cellsOf(e).find(p=>!answers.has(key(...p)));}
  function input(ch){
    if(done)return;
    const e=entries[current], pos=nextLetter(e); if(!pos)return;
    const [r,c]=pos;
    if(grid[r][c]!==ch){say('Try a different letter. You can hear the word again.');return;}
    answers.set(key(r,c),ch);
    entries.forEach((item,i)=>{if(!nextLetter(item))solved.add(i);});
    if(solved.size===entries.length){
      done=true;render();say('Crossword complete!');ctx.win(ctx.target);return;
    }
    if(solved.has(current))current=entries.findIndex((_,i)=>!solved.has(i));render();
  }
  function render(){
    const e=entries[current], points=cellsOf(e), activeIds=new Set(points.map(p=>key(...p))), pos=nextLetter(e);
    tag.textContent='Clue '+e.num+' · '+(e.dr?'Down':'Across');
    clue.textContent=clues[e.word] || 'Listen to the word, then spell it.';
    b.tiles.forEach((t,k)=>{
      const val=answers.get(k); t.querySelector('.wg-pz-glyph').textContent=val||'';
      t.classList.toggle('pz-cross-selected',activeIds.has(k));
      t.classList.toggle('pz-solved',!!val);t.classList.toggle('pz-active',pos&&k===key(...pos));
      t.setAttribute('aria-label',(val||'Empty')+' square, row '+(+t.dataset.r+1)+', column '+(+t.dataset.c+1));
    });
    bank.replaceChildren(); if(done)return;
    // Keep the keyboard stable while the same word is active.
    letterBanks[current].forEach(ch=>bank.append(button(ch,'wg-pz-key',()=>input(ch),'Letter '+ch)));
    say('Choose a letter for the outlined square.');
  }
  render();
  const onKey=e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.isComposing||/^(input|textarea)$/i.test(e.target.tagName))return;
    if(/^[a-z]$/i.test(e.key)&&!done){e.preventDefault();input(e.key.toLowerCase());}};
  document.addEventListener('keydown',onKey);
  return ()=>document.removeEventListener('keydown',onKey);
}
export function playPuzzle(id,ctx) {
  if(!letters(ctx.target)){ctx.el.append(node('p','wg-pz-lead','Choose a word with letters to start.'));return;}
  if(id==='search')return drawSearch(ctx);
  if(id==='cross')return drawCross(ctx);
  if(id==='path')return drawPath(ctx);
  throw new Error('Unknown puzzle '+id);
}
