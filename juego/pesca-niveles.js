/* Rules of "Pesca en Salinas": tap 2+ touching animals of the same kind to catch them. Levels set goals:
   points, a number of one animal, anchors brought down to the bottom row, rocks broken by catching next to them. */
(function (root) {
  "use strict";
  var COLS = 7, ROWS = 8, KINDS = 6, SHELL = 9, ANCHOR = 10, ROCK = 11;
  var cfg = { shell: 0.03, mult: 5, bonus1: 7, bonus2: 10, leftover: 20, rockPts: 20, anchorPts: 100 };
  /* goal keys: score (points this level), kind [k, n], anchors n, rocks n */
  var LEVELS = [
    { nets: 10, score: 250 },
    { nets: 12, kind: [2, 8] },
    { nets: 14, anchors: 2, kinds: 5 },
    { nets: 15, rocks: 5 },
    { nets: 14, score: 900 },
    { nets: 16, anchors: 3, kinds: 5, kind: [3, 10] },
    { nets: 16, rocks: 10, score: 700 },
    { nets: 18, anchors: 4, kinds: 5, rocks: 6 }
  ];
  function level(n) {
    if (n <= LEVELS.length) return LEVELS[n - 1];
    var extra = n - LEVELS.length, pick = extra % 3;
    if (pick === 1) return { nets: 16, score: 900 + extra * 100, rocks: 8 };
    if (pick === 2) return { nets: 17, anchors: 4, kinds: 5, kind: [extra % 5, 12 + extra] };
    return { nets: 17, rocks: 10, anchors: 3, kinds: 5, score: 500 + extra * 80 };
  }

  function makeRng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function normal(k) { return k >= 0 && k < KINDS; }

  function Game(seed) {
    this.rng = makeRng(seed || (Date.now() & 0xffffffff));
    this.score = 0; this.caught = 0; this.biggest = 0; this.over = false;
    this.startLevel(1);
  }

  Game.prototype.startLevel = function (n) {
    var L = level(n);
    this.level = n; this.L = L; this.nets = L.nets; this.won = false; this.kinds = L.kinds || KINDS;
    this.got = { score: 0, kind: 0, anchors: 0, rocks: 0 };
    this.anchorsOut = 0;                                   // anchors that have entered the board
    this.grid = [];
    for (var c = 0; c < COLS; c++) { this.grid.push([]); for (var r = 0; r < ROWS; r++) this.grid[c].push(this.spawn(false)); }
    var rocks = L.rocks || 0, cells = [];
    for (c = 0; c < COLS; c++) for (r = ROWS - 3; r < ROWS; r++) cells.push([c, r]);
    for (var i = 0; i < rocks && cells.length; i++) { var p = cells.splice(Math.floor(this.rng() * cells.length), 1)[0]; this.grid[p[0]][p[1]] = ROCK; }
    var first = Math.min(2, L.anchors || 0), cols = [1, 5, 3, 0, 6, 2, 4];
    for (i = 0; i < first; i++) { this.grid[cols[i]][L.anchorRow || 3] = ANCHOR; this.anchorsOut++; }
    this.ensureMoves();
  };

  Game.prototype.spawn = function (allowShell) {
    if (allowShell && this.rng() < cfg.shell) return SHELL;
    return Math.floor(this.rng() * (this.kinds || KINDS));
  };

  Game.prototype.group = function (c, r) {
    var k = this.grid[c][r], seen = {}, out = [], stack = [[c, r]];
    if (k === SHELL) return [[c, r]];
    if (!normal(k)) return [];
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
      if (!normal(k)) continue;
      if (c + 1 < COLS && this.grid[c + 1][r] === k) return true;
      if (r + 1 < ROWS && this.grid[c][r + 1] === k) return true;
    }
    return false;
  };

  /* No group left: the animals swim around (anchors and rocks stay where they are). */
  Game.prototype.ensureMoves = function () {
    var tries = 0;
    while (!this.hasMove() && tries++ < 60) {
      for (var c = 0; c < COLS; c++) for (var r = 0; r < ROWS; r++) if (normal(this.grid[c][r])) this.grid[c][r] = this.spawn(false);
    }
    if (!this.hasMove()) {
      for (c = 0; c < COLS; c++) for (r = 0; r < ROWS; r++) if (normal(this.grid[c][r])) { this.grid[c][r] = SHELL; return true; }
    }
    return tries > 0;
  };

  Game.prototype.needAnchors = function () { return (this.L.anchors || 0) - this.got.anchors; };
  Game.prototype.onBoard = function (k) { var n = 0; for (var c = 0; c < COLS; c++) for (var r = 0; r < ROWS; r++) if (this.grid[c][r] === k) n++; return n; };

  /* Gravity. origin[c][r] = the row each tile came from this turn (negative = entered from above), for the animation. */
  Game.prototype.fall = function (origin, top) {
    for (var c = 0; c < COLS; c++) {
      var col = this.grid[c], keep = [];
      for (var r = ROWS - 1; r >= 0; r--) if (col[r] !== -1) keep.push({ k: col[r], o: origin[c][r] });
      var fresh = ROWS - keep.length, newO = [];
      for (var n = 0; n < ROWS; n++) {
        var t = ROWS - 1 - n;
        if (n < keep.length) { col[t] = keep[n].k; newO[t] = keep[n].o; }
        else {
          var wantAnchor = this.anchorsOut < (this.L.anchors || 0) && this.onBoard(ANCHOR) < 2;
          if (wantAnchor) { col[t] = ANCHOR; this.anchorsOut++; } else col[t] = this.spawn(true);
          newO[t] = top[c] - fresh + t;
        }
      }
      top[c] -= fresh;
      origin[c] = newO;
    }
  };

  Game.prototype.goalsDone = function () {
    var L = this.L, g = this.got;
    return (!L.score || g.score >= L.score) && (!L.kind || g.kind >= L.kind[1]) &&
      (!L.anchors || g.anchors >= L.anchors) && (!L.rocks || g.rocks >= L.rocks);
  };

  /* Returns null if the tap does nothing, else what happened (for the animations). */
  Game.prototype.tap = function (c, r) {
    if (this.over || this.won) return null;
    var k = this.grid[c][r], cells, points, shell = k === SHELL, bonusNets = 0, self = this;
    if (shell) {
      cells = [];
      for (var i = 0; i < COLS; i++) if (this.grid[i][r] !== ANCHOR) cells.push([i, r]);
      for (var j = 0; j < ROWS; j++) if (j !== r && this.grid[c][j] !== ANCHOR) cells.push([c, j]);
      points = 100 + cells.length * 10;
    } else {
      cells = this.group(c, r);
      if (cells.length < 2) return null;
      points = cells.length * cells.length * cfg.mult;
      if (cells.length >= cfg.bonus2) bonusNets = 2; else if (cells.length >= cfg.bonus1) bonusNets = 1;
    }
    var removed = [], rocks = 0, kindGot = 0, seen = {};
    function take(p, why) {
      var key = p[0] * 100 + p[1]; if (seen[key]) return; seen[key] = 1;
      var kk = self.grid[p[0]][p[1]];
      removed.push({ c: p[0], r: p[1], k: kk, why: why });
      if (kk === ROCK) rocks++;
      else if (self.L.kind && kk === self.L.kind[0]) kindGot++;
    }
    cells.forEach(function (p) { take(p, "net"); });
    if (!shell) cells.forEach(function (p) {      // rocks next to the catch break
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var x = p[0] + d[0], y = p[1] + d[1];
        if (x >= 0 && x < COLS && y >= 0 && y < ROWS && self.grid[x][y] === ROCK) take([x, y], "rock");
      });
    });
    var nudge = [];                                  // anchors touching the catch sink one row
    if (!shell) cells.forEach(function (p) {
      [[1, 0], [-1, 0], [0, -1]].forEach(function (d) {
        var x = p[0] + d[0], y = p[1] + d[1];
        if (x >= 0 && x < COLS && y >= 0 && y < ROWS && self.grid[x][y] === ANCHOR && nudge.indexOf(x * 100 + y) < 0) nudge.push(x * 100 + y);
      });
    });
    removed.forEach(function (p) { self.grid[p.c][p.r] = -1; });
    var origin = [], top = [];
    for (var cc = 0; cc < COLS; cc++) { origin.push([]); top.push(0); for (var rr = 0; rr < ROWS; rr++) origin[cc].push(rr); }
    nudge.forEach(function (key) {
      var x = Math.floor(key / 100), y = key % 100;
      if (y + 1 < ROWS && self.grid[x][y + 1] !== -1) {
        var b = self.grid[x][y + 1]; self.grid[x][y + 1] = ANCHOR; self.grid[x][y] = b;
        origin[x][y + 1] = y; origin[x][y] = y + 1;
      }
    });
    this.fall(origin, top);
    var anchors = [];
    for (var guard = 0; guard < 6; guard++) {          // anchors that reached the bottom are collected, then everything falls again
      var hit = false;
      for (cc = 0; cc < COLS; cc++) if (this.grid[cc][ROWS - 1] === ANCHOR) { anchors.push({ c: cc, r: ROWS - 1, k: ANCHOR, why: "anchor" }); this.grid[cc][ROWS - 1] = -1; hit = true; }
      if (!hit) break;
      this.fall(origin, top);
    }
    points += rocks * cfg.rockPts + anchors.length * cfg.anchorPts;
    this.score += points;
    this.got.score += points; this.got.rocks += rocks; this.got.kind += kindGot; this.got.anchors += anchors.length;
    this.caught += cells.length;
    if (!shell) this.biggest = Math.max(this.biggest, cells.length);
    this.nets += bonusNets - 1;
    var shuffled = this.ensureMoves(), leftover = 0;
    if (this.goalsDone()) { this.won = true; leftover = this.nets * cfg.leftover; this.score += leftover; }
    else if (this.nets <= 0) this.over = true;
    return { removed: removed, anchors: anchors, origin: origin, points: points, shell: shell, bonusNets: bonusNets,
      shuffled: shuffled, rocks: rocks, won: this.won, leftover: leftover };
  };

  Game.prototype.nextLevel = function () { if (this.won) this.startLevel(this.level + 1); };

  root.Pesca = { Game: Game, COLS: COLS, ROWS: ROWS, KINDS: KINDS, SHELL: SHELL, ANCHOR: ANCHOR, ROCK: ROCK, cfg: cfg, level: level };
})(typeof window !== "undefined" ? window : globalThis);
