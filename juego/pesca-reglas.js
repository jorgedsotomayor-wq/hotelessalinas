/* Rules of "Pesca en Salinas": tap a group of 2+ touching animals of the same kind to catch it; a Spondylus shell clears its row and column. */
(function (root) {
  "use strict";
  var COLS = 7, ROWS = 8, SHELL = 9;
  var cfg = { kinds: 6, nets: 18, shell: 0.03, mult: 5, bonus1: 7, bonus2: 10 };

  function makeRng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  function Game(seed) {
    this.rng = makeRng(seed || (Date.now() & 0xffffffff));
    this.grid = [];
    this.score = 0; this.nets = cfg.nets; this.caught = 0; this.biggest = 0; this.over = false;
    for (var c = 0; c < COLS; c++) { this.grid.push([]); for (var r = 0; r < ROWS; r++) this.grid[c].push(this.spawn(false)); }
    this.ensureMoves();
  }

  Game.prototype.spawn = function (allowShell) {
    if (allowShell && this.rng() < cfg.shell) return SHELL;
    return Math.floor(this.rng() * cfg.kinds);
  };

  Game.prototype.group = function (c, r) {
    var k = this.grid[c][r], seen = {}, out = [], stack = [[c, r]];
    if (k === SHELL) return [[c, r]];
    while (stack.length) {
      var p = stack.pop(), key = p[0] * 100 + p[1];
      if (seen[key]) continue; seen[key] = 1;
      if (p[0] < 0 || p[0] >= COLS || p[1] < 0 || p[1] >= ROWS || this.grid[p[0]][p[1]] !== k) continue;
      out.push(p);
      stack.push([p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]);
    }
    return out;
  };

  Game.prototype.hasMove = function () {
    for (var c = 0; c < COLS; c++) for (var r = 0; r < ROWS; r++) {
      var k = this.grid[c][r];
      if (k === SHELL) return true;
      if (c + 1 < COLS && this.grid[c + 1][r] === k) return true;
      if (r + 1 < ROWS && this.grid[c][r + 1] === k) return true;
    }
    return false;
  };

  Game.prototype.ensureMoves = function () {
    var tries = 0;
    while (!this.hasMove() && tries++ < 50) {
      for (var c = 0; c < COLS; c++) for (var r = 0; r < ROWS; r++) this.grid[c][r] = this.spawn(false);
    }
    return tries > 0;
  };

  /* Returns null if the tap does nothing, else what happened (for the animations). */
  Game.prototype.tap = function (c, r) {
    if (this.over) return null;
    var k = this.grid[c][r], cells, points, shell = k === SHELL, bonusNets = 0;
    if (shell) {
      cells = [];
      for (var i = 0; i < COLS; i++) cells.push([i, r]);
      for (var j = 0; j < ROWS; j++) if (j !== r) cells.push([c, j]);
      points = 100 + cells.length * 10;
    } else {
      cells = this.group(c, r);
      if (cells.length < 2) return null;
      points = cells.length * cells.length * cfg.mult;
      if (cells.length >= cfg.bonus2) bonusNets = 2; else if (cells.length >= cfg.bonus1) bonusNets = 1;
    }
    var removed = cells.map(function (p) { return { c: p[0], r: p[1], k: this.grid[p[0]][p[1]] }; }, this);
    cells.forEach(function (p) { this.grid[p[0]][p[1]] = -1; }, this);
    /* Gravity: animals sink toward the bottom row (row ROWS-1); new ones enter from the top. */
    var moves = [];
    for (var cc = 0; cc < COLS; cc++) {
      var col = this.grid[cc], keep = [];
      for (var rr = ROWS - 1; rr >= 0; rr--) if (col[rr] !== -1) keep.push({ k: col[rr], from: rr });
      var fresh = ROWS - keep.length;
      for (var n = 0; n < ROWS; n++) {
        var target = ROWS - 1 - n;
        if (n < keep.length) { col[target] = keep[n].k; if (keep[n].from !== target) moves.push({ c: cc, from: keep[n].from, to: target }); }
        else { col[target] = this.spawn(true); moves.push({ c: cc, from: target - fresh, to: target, fresh: true }); }
      }
    }
    this.score += points;
    this.caught += removed.length;
    if (!shell) this.biggest = Math.max(this.biggest, cells.length);
    this.nets += bonusNets - 1;
    var shuffled = this.ensureMoves();
    if (this.nets <= 0) this.over = true;
    return { removed: removed, moves: moves, points: points, shell: shell, bonusNets: bonusNets, shuffled: shuffled };
  };

  root.Pesca = { Game: Game, COLS: COLS, ROWS: ROWS, SHELL: SHELL, cfg: cfg };
})(typeof window !== "undefined" ? window : globalThis);
