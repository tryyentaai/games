import { GameEngine } from './engine.js';

const game = new GameEngine();
const $ = (id) => document.getElementById(id);
const board = $('board');
const playArea = document.querySelector('.play-area');
const card = document.querySelector('.game-card');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const colors = ['#f25b9f', '#9562df', '#39c7bd'];
const names = ['pink heart', 'purple star', 'teal circle'];
const shapes = [
  '<path class="shape" d="M32 56S6 39 6 22C6 7 25 5 32 18 39 5 58 7 58 22 58 39 32 56 32 56Z"/><path class="shine" d="M14 17c3-5 8-5 11-2 2 2-1 3-4 2-3-1-4 3-6 3-2 0-2-1-1-3Z"/>',
  '<path class="shape" d="m32 4 8.5 17.2 19 2.8-13.8 13.4L49 56.3l-17-9-17 9 3.3-18.9L4.5 24l19-2.8L32 4Z" stroke-linejoin="round"/><path class="shine" d="m31 14-6 13-9 2 12 2 6-16c.5-2-2-2-3-1Z"/>',
  '<circle class="shape" cx="32" cy="32" r="24"/><path class="shine" d="M16 25c2-6 7-10 13-10 3 0 3 3 0 4-5 1-7 3-9 7-1 3-5 2-4-1Z"/>'
];
let soundOn = false;
let paused = false;
let pointerDown = false;
let activePointerId = null;
let pointerMoved = false;
let initialIndex = -1;
let lastPointer = null;
let focusedIndex = 0;
let hintTimer;
let celebrationTimer;
let audioContext;
let lastIds = [];
try { game.bestChain = Math.max(game.bestChain || 0, Number(localStorage.getItem('glitter-dot-best') || 0)); soundOn = localStorage.getItem('glitter-dot-sound') === 'true'; } catch {}

function renderBoard(animate = false) {
  const path = game.path || [];
  const frag = document.createDocumentFragment();
  game.board.forEach((dot, i) => {
    const button = document.createElement('button');
    button.className = 'dot';
    if (animate && lastIds[i] !== dot.id) button.classList.add('new-dot');
    button.dataset.index = i;
    button.dataset.type = dot.type;
    button.style.setProperty('--delay', `${(i % game.cols) * 23}ms`);
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `${names[dot.type]}, row ${Math.floor(i / game.cols) + 1}, column ${i % game.cols + 1}`);
    button.setAttribute('aria-selected', path.includes(i));
    button.tabIndex = i === focusedIndex ? 0 : -1;
    button.innerHTML = `<svg class="candy" viewBox="0 0 64 64" aria-hidden="true">${shapes[dot.type]}</svg>`;
    frag.appendChild(button);
  });
  board.replaceChildren(frag);
  lastIds = game.board.map(dot => dot.id);
  updatePath();
}

function updatePath() {
  const path = game.path || [];
  board.querySelectorAll('.dot').forEach((dot, i) => {
    const order = path.indexOf(i);
    dot.classList.toggle('selected', order >= 0);
    const last = path[path.length - 1];
    dot.classList.toggle('eligible', path.length > 0 && order < 0 && game.matches(last, i) && game.adjacent(last, i));
    dot.setAttribute('aria-selected', order >= 0 ? 'true' : 'false');
    if (order >= 0) dot.dataset.chainNumber = order + 1;
    else delete dot.dataset.chainNumber;
  });
  const bounds = playArea.getBoundingClientRect();
  const points = path.map(i => {
    const rect = board.children[i].getBoundingClientRect();
    return `${rect.left + rect.width / 2 - bounds.left},${rect.top + rect.height / 2 - bounds.top}`;
  });
  $('connections').setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  $('chain-line').setAttribute('points', points.join(' '));
  $('chain-status').classList.toggle('active', path.length > 0);
  let guide = 'Find your first sparkle chain';
  if (path.length === 1) guide = '1 dot · find its matching neighbor';
  if (path.length === 2) guide = '2 dots · one more makes magic!';
  if (path.length >= 3) guide = `${path.length} dots · ${path.length >= 15 ? 'SPARKLE PARTY!' : path.length >= 10 ? 'rainbow storm!' : path.length >= 6 ? 'glitter burst!' : 'ready to pop!'}`;
  $('chain-guide').textContent = guide;
  $('pop-button').disabled = path.length < 3 || paused;
  $('pop-count').textContent = path.length >= 3 ? path.length : '';
}

function updateStats() {
  $('score').textContent = game.score.toLocaleString();
  $('best-chain').innerHTML = `${game.bestChain} <small>dots</small>`;
  $('stars').textContent = game.stars ?? Math.floor(game.score / 500);
  $('level').textContent = Math.floor(game.score / 500) + 1;
  const progress = game.score % 500;
  $('level-fill').style.width = `${progress / 5}%`;
  document.querySelector('.level-track').setAttribute('aria-valuenow', progress);
  try { localStorage.setItem('glitter-dot-best', String(game.bestChain)); } catch {}
}

function clearHint() {
  clearTimeout(hintTimer);
  board.querySelectorAll('.hinted').forEach(dot => dot.classList.remove('hinted'));
}

function startOrExtend(index) {
  if (index < 0 || paused) return false;
  clearHint();
  const before = game.path.length;
  let changed = game.path.length ? game.extend(index) : game.begin(index);
  if (changed) {
    updatePath();
    if (game.path.length > before) playTone(280 + game.path.length * 45, .08, .045);
  }
  return changed;
}

function indexAtPoint(x, y) {
  const element = document.elementFromPoint(x, y)?.closest('.dot');
  return element && board.contains(element) ? Number(element.dataset.index) : -1;
}

board.addEventListener('pointerdown', event => {
  if (paused || event.button > 0 || activePointerId !== null) return;
  const dot = event.target.closest('.dot');
  if (!dot) return;
  event.preventDefault();
  pointerDown = true;
  activePointerId = event.pointerId;
  pointerMoved = false;
  initialIndex = Number(dot.dataset.index);
  lastPointer = {x:event.clientX,y:event.clientY};
  focusedIndex = initialIndex;
  board.setPointerCapture(event.pointerId);
  clearHint();
  if (game.path.length && !game.path.includes(initialIndex) && !game.extend(initialIndex)) game.cancel();
  if (!game.path.length) game.begin(initialIndex);
  updatePath();
  playTone(330 + game.path.length * 45, .07, .04);
});
board.addEventListener('pointermove', event => {
  if (!pointerDown || paused || event.pointerId !== activePointerId) return;
  const from = lastPointer || {x:event.clientX,y:event.clientY};
  const dx = event.clientX - from.x;
  const dy = event.clientY - from.y;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx,dy) / Math.max(8,board.children[0].getBoundingClientRect().width / 3)));
  for (let step = 1; step <= steps; step++) {
    const index = indexAtPoint(from.x + dx * step / steps, from.y + dy * step / steps);
    if (index !== initialIndex && index >= 0) pointerMoved = true;
    if (index >= 0 && index !== game.path[game.path.length - 1]) startOrExtend(index);
  }
  lastPointer = {x:event.clientX,y:event.clientY};
});
board.addEventListener('pointerup', event => {
  if (!pointerDown || event.pointerId !== activePointerId) return;
  pointerDown = false;
  activePointerId = null;
  if (board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
  if (pointerMoved) popChain();
  else updatePath();
});
function endPointer() {
  const pointerId = activePointerId;
  pointerDown = false;
  activePointerId = null;
  if (pointerId !== null && board.hasPointerCapture(pointerId)) board.releasePointerCapture(pointerId);
}
board.addEventListener('pointercancel', event => { if (event.pointerId !== activePointerId) return; endPointer(); game.cancel(); updatePath(); });
board.addEventListener('lostpointercapture', event => { if (event.pointerId !== activePointerId) return; endPointer(); game.cancel(); updatePath(); });

board.addEventListener('keydown', event => {
  if (paused) return;
  const current = Number(event.target.closest('.dot')?.dataset.index ?? focusedIndex);
  let next = current;
  if (event.key === 'ArrowRight') next = current % game.cols < game.cols - 1 ? current + 1 : current;
  else if (event.key === 'ArrowLeft') next = current % game.cols > 0 ? current - 1 : current;
  else if (event.key === 'ArrowDown') next = current + game.cols < game.board.length ? current + game.cols : current;
  else if (event.key === 'ArrowUp') next = current - game.cols >= 0 ? current - game.cols : current;
  else if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    if (event.key === 'Enter' && game.path.length >= 3) popChain();
    else { if (game.path.length && !game.extend(current) && !game.path.includes(current)) { game.cancel(); game.begin(current); } else if (!game.path.length) game.begin(current); updatePath(); }
    return;
  } else if (event.key === 'Escape') { event.preventDefault(); game.cancel(); updatePath(); return; }
  else return;
  event.preventDefault();
  focusedIndex = next;
  board.children[current].tabIndex = -1;
  board.children[next].tabIndex = 0;
  board.children[next].focus();
});

function popChain() {
  if (paused) return;
  endPointer();
  const chain = [...game.path];
  const oldRects = chain.map(i => board.children[i].getBoundingClientRect());
  const keyboardFocus = board.contains(document.activeElement);
  const result = game.commit();
  if (!result.valid) {
    game.cancel();
    updatePath();
    $('announcer').textContent = 'Connect at least 3 matching neighbors to make magic.';
    return;
  }
  clearHint();
  renderBoard(true);
  if (keyboardFocus) board.children[focusedIndex]?.focus();
  updateStats();
  burst(oldRects, result.count);
  playPop(result.count);
  $('board-title').textContent = result.count >= 10 ? 'You’re a sparkle superstar!' : result.count >= 6 ? 'Look at all that glitter!' : 'That was magical!';
  $('announcer').textContent = `${result.count} dots! ${result.points} sparkle points. ${result.leveledUp ? 'You earned a new star!' : ''}`;
  if (result.count >= 6) celebrate(result.count >= 15 ? 'Sparkle party!' : result.count >= 10 ? 'Rainbow storm!' : 'Glitter burst!', `+${result.points.toLocaleString()} sparkle points`, result.count >= 15 ? '🌟' : result.count >= 10 ? '🌈' : '✨');
  else if (result.leveledUp) celebrate('A star for you!', `Hello, level ${Math.floor(game.score / 500) + 1}!`, '⭐');
  else {
    const rect = oldRects[Math.floor(oldRects.length / 2)];
    floatingPoints(result.points, rect);
  }
}

function celebrate(title, detail, emoji) {
  clearTimeout(celebrationTimer);
  $('celebration-title').textContent = title;
  $('celebration-detail').textContent = detail;
  $('celebration-emoji').textContent = emoji;
  $('celebration').classList.add('show');
  celebrationTimer = setTimeout(() => $('celebration').classList.remove('show'), 1500);
}

function floatingPoints(points, rect) {
  const label = document.createElement('span');
  label.textContent = `+${points}`;
  Object.assign(label.style, { position:'fixed', left:`${rect.left + rect.width / 2}px`, top:`${rect.top}px`, zIndex:'22', color:'#a05dca', fontWeight:'900', fontSize:'24px', textShadow:'0 2px white,2px 0 white,-2px 0 white', pointerEvents:'none', transform:'translateX(-50%)' });
  document.body.append(label);
  if (!reducedMotion) label.animate([{transform:'translate(-50%,0)',opacity:1},{transform:'translate(-50%,-50px)',opacity:0}], {duration:900,easing:'ease-out'});
  setTimeout(() => label.remove(), 900);
}

$('pop-button').addEventListener('click', popChain);
$('hint-button').addEventListener('click', () => {
  if (paused) return;
  endPointer();
  game.cancel();
  updatePath();
  clearHint();
  const hint = game.getHint();
  hint.forEach(i => board.children[i]?.classList.add('hinted'));
  $('chain-guide').textContent = 'These little friends match. Connect them!';
  $('announcer').textContent = `Hint: ${hint.length} matching ${names[game.board[hint[0]]?.type ?? 0]} dots are glowing.`;
  hintTimer = setTimeout(() => { clearHint(); updatePath(); }, 6000);
  playTone(650, .18, .04);
});
$('mix-button').addEventListener('click', () => {
  if (paused) return;
  endPointer();
  clearHint();
  game.cancel();
  game.shuffle();
  renderBoard();
  card.classList.remove('mix-animation');
  void card.offsetWidth;
  card.classList.add('mix-animation');
  $('board-title').textContent = 'A fresh sprinkle of possibilities!';
  $('announcer').textContent = 'All mixed up! Find a new sparkle chain.';
  playTone(420, .15, .04);
  setTimeout(() => card.classList.remove('mix-animation'), 550);
});

function setPaused(value) {
  paused = value;
  board.inert = value;
  endPointer();
  game.cancel();
  updatePath();
  $('pause-overlay').hidden = !paused;
  $('pause-button').setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
  $('pause-button').setAttribute('aria-pressed', paused ? 'true' : 'false');
  $('hint-button').disabled = paused;
  $('mix-button').disabled = paused;
  if (paused) $('resume-button').focus();
  else $('pause-button').focus();
}
$('pause-button').addEventListener('click', () => setPaused(!paused));
$('resume-button').addEventListener('click', () => setPaused(false));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && paused) setPaused(false); });

function updateSoundButton() {
  $('sound-button').setAttribute('aria-pressed', String(soundOn));
  $('sound-button').setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
  $('sound-button').title = soundOn ? 'Sound on' : 'Sound off';
  $('sound-lines').setAttribute('d', soundOn ? 'M15 8c3 2 3 6 0 8M18 5c5 4 5 10 0 14' : 'm16 9 5 6m0-6-5 6');
}
$('sound-button').addEventListener('click', () => {
  soundOn = !soundOn;
  try { localStorage.setItem('glitter-dot-sound', String(soundOn)); } catch {}
  updateSoundButton();
  if (soundOn) playTone(600, .16, .04);
});
function playTone(frequency, duration, volume, delay = 0) {
  if (!soundOn) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + delay);
    gain.gain.setValueAtTime(0, audioContext.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + delay + .015);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + delay + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(audioContext.currentTime + delay);
    oscillator.stop(audioContext.currentTime + delay + duration);
  } catch {}
}
function playPop(count) { [523,659,784,...(count >= 6 ? [1047,1319] : [])].forEach((frequency, i) => playTone(frequency, .24, .045, i * .06)); }

const canvas = $('particles');
const ctx = canvas.getContext('2d');
let particles = [];
let animationFrame;
let lastTime;
function resizeCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  updatePath();
}
function burst(rects, count) {
  if (reducedMotion) return;
  const perDot = count >= 10 ? 13 : count >= 6 ? 10 : 6;
  rects.forEach((rect, index) => {
    for (let i = 0; i < perDot; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * (count >= 10 ? 6 : 3);
      particles.push({x:rect.left + rect.width/2,y:rect.top + rect.height/2,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-2,size:3+Math.random()*4,color:count>=10 ? ['#f6bf4f','#ee72a8','#9d76ed','#48cfbd','#7dbcf7'][i%5] : colors[index%3],life:1,decay:.008+Math.random()*.009,rotation:Math.random()*6,star:i%3===0});
    }
  });
  if (!animationFrame) { lastTime = performance.now(); animationFrame = requestAnimationFrame(drawParticles); }
}
function drawParticles(time) {
  const delta = Math.min((time-lastTime)/16.67, 2);
  lastTime = time;
  ctx.clearRect(0,0,innerWidth,innerHeight);
  particles = particles.filter(particle => particle.life>0);
  particles.forEach(particle => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += .085 * delta;
    particle.life -= particle.decay * delta;
    particle.rotation += .04 * delta;
    ctx.save();
    ctx.translate(particle.x,particle.y);
    ctx.rotate(particle.rotation);
    ctx.globalAlpha = Math.max(0,particle.life);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    if (particle.star) for (let i=0;i<8;i++) { const a=i*Math.PI/4; const r=i%2?particle.size*.3:particle.size; ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r); }
    else ctx.arc(0,0,particle.size*.65,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  });
  if (particles.length) animationFrame=requestAnimationFrame(drawParticles);
  else { animationFrame=null; ctx.clearRect(0,0,innerWidth,innerHeight); }
}
window.addEventListener('resize', resizeCanvas);
renderBoard();
updateStats();
updateSoundButton();
resizeCanvas();
