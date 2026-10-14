export class GameEngine {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.cols = 6;
    this.rows = 7;
    this.score = 0;
    this.bestChain = 0;
    this.stars = 0;
    this.moves = 0;
    this.path = [];
    this._nextId = 1;
    this._neighbors = Array.from({ length: this.cols * this.rows }, (_, index) => {
      const x = index % this.cols;
      const y = Math.floor(index / this.cols);
      const result = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if ((dx || dy) && nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
            result.push(ny * this.cols + nx);
          }
        }
      }
      return result;
    });
    this.board = Array.from({ length: this.cols * this.rows }, () => this._newDot());
    this.ensurePlayable();
  }

  get level() {
    return Math.floor(this.score / 500) + 1;
  }

  _newDot() {
    return { id: this._nextId++, type: this._randomType() };
  }

  _randomType() {
    return Math.max(0, Math.min(2, Math.floor(this.random() * 3)));
  }

  _validIndex(index) {
    return Number.isInteger(index) && index >= 0 && index < this.board.length;
  }

  matches(a, b) {
    return this._validIndex(a) && this._validIndex(b) && this.board[a].type === this.board[b].type;
  }

  adjacent(a, b) {
    return this._validIndex(a) && this._validIndex(b) && this._neighbors[a].includes(b);
  }

  begin(index) {
    if (!this._validIndex(index)) return false;
    this.path = [index];
    return true;
  }

  extend(index) {
    if (!this._validIndex(index) || !this.path.length) return false;
    const last = this.path[this.path.length - 1];
    if (index === last) return false;
    if (this.path.length > 1 && index === this.path[this.path.length - 2]) {
      this.path.pop();
      return true;
    }
    if (this.path.includes(index) || !this.adjacent(last, index) || !this.matches(last, index)) return false;
    this.path.push(index);
    return true;
  }

  cancel() {
    this.path = [];
  }

  commit() {
    const indices = [...this.path];
    const count = indices.length;
    this.cancel();
    const valid = count >= 3 && new Set(indices).size === count && indices.every((index, position) =>
      this._validIndex(index) && (position === 0 || (this.adjacent(indices[position - 1], index) && this.matches(indices[0], index)))
    );
    if (!valid) {
      return { valid: false, indices, count, points: 0, bonus: null, level: this.level, leveledUp: false };
    }
    const previousLevel = this.level;
    const points = count * count * 10;
    this.score += points;
    this.moves++;
    this.bestChain = Math.max(this.bestChain, count);
    this.stars = Math.floor(this.score / 500);
    const removed = new Set(indices);
    for (let col = 0; col < this.cols; col++) {
      const survivors = [];
      for (let row = 0; row < this.rows; row++) {
        const index = row * this.cols + col;
        if (!removed.has(index)) survivors.push(this.board[index]);
      }
      const refillCount = this.rows - survivors.length;
      const nextColumn = Array.from({ length: refillCount }, () => this._newDot()).concat(survivors);
      for (let row = 0; row < this.rows; row++) {
        this.board[row * this.cols + col] = nextColumn[row];
      }
    }
    this.ensurePlayable();
    return {
      valid: true, indices, count, points,
      bonus: count >= 10 ? 'huge' : count >= 6 ? 'big' : null,
      level: this.level,
      leveledUp: this.level > previousLevel,
    };
  }

  _hasMove() {
    // Any three-dot path can be detected by looking for a matching pair of neighbors.
    return this.board.some((_, index) => this._neighbors[index].filter(next => this.matches(index, next)).length >= 2);
  }

  ensurePlayable() {
    if (this._hasMove()) return false;
    this.cancel();
    // A deterministic fallback guarantees progress even with an unusual random source.
    const type = this._randomType();
    for (const index of [0, 1, 2]) this.board[index] = { ...this.board[index], type };
    return true;
  }

  shuffle() {
    this.cancel();
    for (let index = this.board.length - 1; index > 0; index--) {
      const other = Math.max(0, Math.min(index, Math.floor(this.random() * (index + 1))));
      [this.board[index], this.board[other]] = [this.board[other], this.board[index]];
    }
    this.ensurePlayable();
  }

  getHint() {
    // Bound the search so densely connected boards remain responsive on phones.
    const budget = 16000;
    let visits = 0;
    let best = [];
    const occupied = new Set();
    const path = [];
    const walk = index => {
      if (visits++ >= budget || best.length === this.board.length) return;
      occupied.add(index);
      path.push(index);
      if (path.length > best.length) best = [...path];
      const candidates = this._neighbors[index].filter(next => !occupied.has(next) && this.matches(index, next));
      // Visiting less-connected dots first avoids marooning a corner dot.
      candidates.sort((a, b) => {
        const degree = point => this._neighbors[point].filter(next => !occupied.has(next) && this.matches(point, next)).length;
        return degree(a) - degree(b);
      });
      for (const next of candidates) {
        walk(next);
        if (visits >= budget || best.length === this.board.length) break;
      }
      path.pop();
      occupied.delete(index);
    };
    const starts = this.board.map((_, index) => index).sort((a, b) =>
      this._neighbors[a].filter(next => this.matches(a, next)).length - this._neighbors[b].filter(next => this.matches(b, next)).length
    );
    for (const start of starts) {
      walk(start);
      if (visits >= budget || best.length === this.board.length) break;
    }
    return best.length >= 3 ? best : [];
  }
}
