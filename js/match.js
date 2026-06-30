/* ============================================================
   VS — IDIOTSKÝ TURNAJ
   match.js : herní engine jednoho zápasu (arkádový fotbal)
   ============================================================ */
(function (VS) {
  "use strict";

  // Rozměry hřiště ("svět")
  var FW = 1180, FH = 740;
  var GOAL_H = 200;                       // výška branky
  var GOAL_TOP = (FH - GOAL_H) / 2;
  var GOAL_BOT = GOAL_TOP + GOAL_H;

  var HALF_LENGTH = 180;                  // 3 minuty na poločas (reálné sekundy)
  var POSSESS = 30;                       // vzdálenost pro držení míče
  var TACKLE = 34;
  var SHOOT_RANGE = 360;

  // Formace 4-3-3 jako podíly hřiště (tým útočící doprava)
  var SLOTS = [
    [0.05, 0.50], // GK
    [0.22, 0.20], [0.22, 0.40], [0.22, 0.60], [0.22, 0.80],
    [0.45, 0.30], [0.45, 0.50], [0.45, 0.70],
    [0.70, 0.25], [0.70, 0.50], [0.70, 0.75]
  ];

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

  // ---- Konstruktor zápasu --------------------------------------------------
  // homeC / awayC : objekty zemí (VS.COUNTRIES[...])
  // humanSide : "home" | "away"
  // opts : { knockout:bool, label:string, onEnd:function(result) }
  VS.Match = function (homeC, awayC, humanSide, opts) {
    this.home = homeC; this.away = awayC;
    this.humanSide = humanSide;
    this.knockout = !!(opts && opts.knockout);
    this.label = (opts && opts.label) || "";
    this.onEnd = (opts && opts.onEnd) || function () {};

    VS.buildSquad(homeC); VS.buildSquad(awayC);

    this.scoreH = 0; this.scoreA = 0;
    this.half = 1;
    this.clock = 0;
    this.state = "kickoff";       // kickoff|play|goal|halftime|fulltime|penalties|done
    this.stateTimer = 1.2;
    this.message = "";
    this.keys = {};
    this.activeHuman = null;
    this.cam = { x: FW / 2, y: FH / 2, zoom: 1.55 };
    this.flash = 0;

    // penalty stav
    this.pen = null;

    this._buildPlayers();
    this._resetPositions(true);
  };

  var M = VS.Match.prototype;

  M._buildPlayers = function () {
    this.players = [];
    var self = this;
    function team(country, side) {
      var squad = country.squad;
      for (var i = 0; i < 11; i++) {
        var s = squad[i];
        self.players.push({
          side: side, idx: i, role: s.role, num: s.num, name: s.name,
          quirk: s.quirk, rating: s.rating,
          color: country.jersey, accent: country.accent, shorts: country.shorts,
          x: 0, y: 0, vx: 0, vy: 0, faceX: 1, faceY: 0,
          isGK: s.role === "GK", cool: 0
        });
      }
    }
    team(this.home, "home");
    team(this.away, "away");
    this.ball = { x: FW / 2, y: FH / 2, vx: 0, vy: 0, owner: null, lastTouch: null };
  };

  // Směr útoku týmu v daném poločase: home útočí doprava v 1. půli
  M.attackDir = function (side) {
    var homeRight = (this.half === 1);
    var homeDir = homeRight ? 1 : -1;
    return side === "home" ? homeDir : -homeDir;
  };
  // X branky, do které tým střílí
  M.targetGoalX = function (side) { return this.attackDir(side) > 0 ? FW : 0; };
  M.ownGoalX = function (side) { return this.attackDir(side) > 0 ? 0 : FW; };

  M._resetPositions = function (kickoffHome) {
    var self = this;
    this.players.forEach(function (p) {
      var dir = self.attackDir(p.side);
      var slot = SLOTS[p.idx];
      var fx = dir > 0 ? slot[0] : (1 - slot[0]);
      p.homeX = fx * FW;
      p.homeY = slot[1] * FH;
      p.x = p.homeX; p.y = p.homeY;
      p.vx = p.vy = 0;
      // u výkopu posuň útočníky lehce dozadu, ať nestojí přes půlku
      if (p.role !== "GK") {
        if (dir > 0) p.x = Math.min(p.x, FW / 2 - 30);
        else p.x = Math.max(p.x, FW / 2 + 30);
      }
    });
    this.ball.x = FW / 2; this.ball.y = FH / 2;
    this.ball.vx = this.ball.vy = 0; this.ball.owner = null; this.ball.lastTouch = null;
    this.cam.x = FW / 2; this.cam.y = FH / 2;
  };

  // ---- vstup ---------------------------------------------------------------
  M.keydown = function (code) {
    this.keys[code] = true;
    if (this.state === "penalties") { this._penKey(code); return; }
    if (this.state === "fulltime" || this.state === "done") return;
    if (code === "KeyI") this._pass();
    if (code === "KeyL") this._shoot();
  };
  M.keyup = function (code) { this.keys[code] = false; };

  M._humanInputVec = function () {
    var x = 0, y = 0;
    if (this.keys["ArrowLeft"]) x -= 1;
    if (this.keys["ArrowRight"]) x += 1;
    if (this.keys["ArrowUp"]) y -= 1;
    if (this.keys["ArrowDown"]) y += 1;
    var l = Math.hypot(x, y);
    if (l > 0) { x /= l; y /= l; }
    return { x: x, y: y, mag: l };
  };

  // ---- update --------------------------------------------------------------
  M.update = function (dt) {
    dt = Math.min(dt, 0.05);
    if (this.flash > 0) this.flash -= dt;

    if (this.state === "penalties") { this._penUpdate(dt); this._updateCamera(dt, true); return; }

    if (this.state === "kickoff") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) { this.state = "play"; this.message = ""; }
      this._updateCamera(dt); return;
    }
    if (this.state === "goal" || this.state === "halftime") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (this.state === "halftime") { this.half = 2; this.clock = 0; }
        this._resetPositions(); this.state = "kickoff"; this.stateTimer = 1.0; this.message = "";
      }
      this._updateCamera(dt); return;
    }
    if (this.state === "fulltime" || this.state === "done") { this._updateCamera(dt); return; }

    // -- hrací čas
    this.clock += dt;
    if (this.clock >= HALF_LENGTH) {
      if (this.half === 1) { this.state = "halftime"; this.stateTimer = 2.0; this.message = "POLOČAS"; this._updateCamera(dt); return; }
      else { this._endRegulation(); this._updateCamera(dt); return; }
    }

    this._updatePlayers(dt);
    this._updateBall(dt);
    this._checkGoal();
    this._updateCamera(dt);
  };

  M._endRegulation = function () {
    if (this.scoreH === this.scoreA && this.knockout) {
      this.state = "penalties";
      this._startPenalties();
    } else {
      this.state = "fulltime";
      this.stateTimer = 2.5;
      this.message = "KONEC ZÁPASU";
      this._finish(null);
    }
  };

  M._finish = function (pens) {
    var winner = null;
    if (this.scoreH > this.scoreA) winner = "home";
    else if (this.scoreA > this.scoreH) winner = "away";
    else if (pens) winner = pens.home > pens.away ? "home" : "away";
    this._result = { home: this.scoreH, away: this.scoreA, winner: winner, pens: pens };
    var self = this;
    this._endDelay = 2.2;
  };

  // ---- hráči ---------------------------------------------------------------
  M._nearestToBall = function (side) {
    var best = null, bd = 1e9, b = this.ball;
    for (var i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      if (p.side !== side || p.isGK) continue;
      var d = dist(p.x, p.y, b.x, b.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };

  M._updatePlayers = function (dt) {
    var b = this.ball;
    var homeChaser = this._nearestToBall("home");
    var awayChaser = this._nearestToBall("away");

    // aktivní lidský hráč: vlastník (pokud lidský tým) nebo nejbližší k míči
    var humanChaser = this.humanSide === "home" ? homeChaser : awayChaser;
    if (b.owner && b.owner.side === this.humanSide && !b.owner.isGK) this.activeHuman = b.owner;
    else this.activeHuman = humanChaser;

    var input = this._humanInputVec();

    for (var i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      if (p.cool > 0) p.cool -= dt;
      var speed = 150 + p.rating * 9;

      if (p === this.activeHuman) {
        // ovládaný hráč
        if (input.mag > 0) {
          p.vx = input.x * speed; p.vy = input.y * speed;
          p.faceX = input.x; p.faceY = input.y;
        }
        // bez vstupu: jen dobrzdí (řeší tlumení níže)
      } else if (p.isGK) {
        this._gkAI(p, dt, speed * 0.8);
        continue;
      } else {
        this._outfieldAI(p, dt, speed, (p.side === "home" ? homeChaser : awayChaser));
      }

      p.x += p.vx * dt; p.y += p.vy * dt;
      p.x = clamp(p.x, 8, FW - 8); p.y = clamp(p.y, 8, FH - 8);
      p.vx *= 0.8; p.vy *= 0.8;

      // získání míče
      if (!b.owner && dist(p.x, p.y, b.x, b.y) < POSSESS && p.cool <= 0) {
        b.owner = p; b.lastTouch = p;
      }
    }

    // dribling vlastníka + souboj
    if (b.owner) {
      var o = b.owner;
      var fx = o.faceX, fy = o.faceY;
      if (fx === 0 && fy === 0) { fx = this.attackDir(o.side); fy = 0; }
      var fl = Math.hypot(fx, fy) || 1;
      b.x = o.x + (fx / fl) * 22;
      b.y = o.y + (fy / fl) * 22;
      b.vx = o.vx; b.vy = o.vy;

      // souboj o míč
      for (var j = 0; j < this.players.length; j++) {
        var d2 = this.players[j];
        if (d2.side === o.side || d2.isGK) continue;
        if (dist(d2.x, d2.y, o.x, o.y) < TACKLE) {
          // šance na odebrání podle ratingu
          var chance = (0.6 + (d2.rating - o.rating) * 0.04) * dt * 2.4;
          if (this._rand() < chance) {
            b.owner = null; b.lastTouch = d2;
            o.cool = 0.5;
            var ang = this._rand() * Math.PI * 2;
            b.vx = Math.cos(ang) * 120; b.vy = Math.sin(ang) * 120;
            break;
          }
        }
      }

      // AI vlastníka (pokud není lidský): dribluj k brance, střílej/přihraj
      if (o !== this.activeHuman) this._ownerAI(o, dt);
    }
  };

  M._outfieldAI = function (p, dt, speed, chaser) {
    var b = this.ball;
    var teamOwns = b.owner && b.owner.side === p.side;
    if (p === chaser && !teamOwns) {
      // honič běží na míč
      var dx = b.x - p.x, dy = b.y - p.y, l = Math.hypot(dx, dy) || 1;
      p.vx = dx / l * speed; p.vy = dy / l * speed;
      p.faceX = dx / l; p.faceY = dy / l;
      return;
    }
    // jinak drž formaci, posunutou podle pozice míče
    var dir = this.attackDir(p.side);
    var ballShift = (b.x - FW / 2) * 0.35;
    var tx = p.homeX + (this.half === 1 ? ballShift : ballShift); // posuv linií za míčem
    if (teamOwns) tx += dir * 70; // při držení postup výš
    var ty = p.homeY + (b.y - FH / 2) * 0.2;
    tx = clamp(tx, 20, FW - 20);
    var dx2 = tx - p.x, dy2 = ty - p.y, l2 = Math.hypot(dx2, dy2);
    if (l2 > 6) {
      p.vx = dx2 / l2 * speed * 0.8; p.vy = dy2 / l2 * speed * 0.8;
    }
  };

  M._ownerAI = function (o, dt) {
    var goalX = this.targetGoalX(o.side);
    var goalY = FH / 2;
    var toGoal = dist(o.x, o.y, goalX, goalY);
    var dir = this.attackDir(o.side);

    // míří k brance
    var dx = goalX - o.x, dy = goalY - o.y, l = Math.hypot(dx, dy) || 1;
    var spd = 130 + o.rating * 8;
    o.vx = dx / l * spd; o.vy = dy / l * spd;
    o.faceX = dx / l; o.faceY = dy / l;

    // střela při dosahu
    if (toGoal < SHOOT_RANGE && this._rand() < 0.04) {
      this._doShot(o, goalX, goalY + (this._rand() - 0.5) * GOAL_H * 0.7, 520);
      return;
    }
    // přihrávka pod tlakem
    var pressured = false;
    for (var i = 0; i < this.players.length; i++) {
      var e = this.players[i];
      if (e.side === o.side || e.isGK) continue;
      if (dist(e.x, e.y, o.x, o.y) < 55) { pressured = true; break; }
    }
    if (pressured && this._rand() < 0.06) {
      var mate = this._bestPassTarget(o);
      if (mate) this._doPass(o, mate);
    }
  };

  M._gkAI = function (p, dt, speed) {
    var b = this.ball;
    var goalX = this.ownGoalX(p.side);
    var lineX = goalX > FW / 2 ? FW - 28 : 28;
    var ty = clamp(b.y, GOAL_TOP + 18, GOAL_BOT - 18);
    var tx = lineX;
    // vyběhne kousek, pokud je míč blízko
    if (dist(b.x, b.y, lineX, b.y) < 220) tx = lineX + (goalX > FW / 2 ? -40 : 40);
    var dx = tx - p.x, dy = ty - p.y, l = Math.hypot(dx, dy);
    if (l > 4) { p.vx = dx / l * speed; p.vy = dy / l * speed; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.7; p.vy *= 0.7;
    // chytí míč
    if (!b.owner && dist(p.x, p.y, b.x, b.y) < POSSESS + 6) {
      // vykopne dopředu
      var dir = this.attackDir(p.side);
      b.owner = null; b.lastTouch = p;
      b.vx = dir * 420 + (this._rand() - 0.5) * 120;
      b.vy = (this._rand() - 0.5) * 220;
      b.x = p.x + dir * 24; b.y = p.y;
      p.cool = 0.4;
    }
  };

  M._bestPassTarget = function (o) {
    var dir = this.attackDir(o.side);
    var best = null, bs = -1e9;
    for (var i = 0; i < this.players.length; i++) {
      var m = this.players[i];
      if (m.side !== o.side || m === o || m.isGK) continue;
      var d = dist(m.x, m.y, o.x, o.y);
      if (d < 40 || d > 480) continue;
      var forward = (m.x - o.x) * dir;
      var score = forward - d * 0.4;
      if (score > bs) { bs = score; best = m; }
    }
    return best;
  };

  // ---- akce lidského hráče -------------------------------------------------
  M._pass = function () {
    var b = this.ball;
    if (!b.owner || b.owner.side !== this.humanSide) return;
    var o = b.owner;
    var mate = this._bestPassTarget(o);
    // pokud drží směr, preferuj hráče v daném směru
    var inp = this._humanInputVec();
    if (inp.mag > 0) {
      var best = null, bs = -1e9;
      for (var i = 0; i < this.players.length; i++) {
        var m = this.players[i];
        if (m.side !== o.side || m === o || m.isGK) continue;
        var dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy) || 1;
        if (d > 520) continue;
        var dot = (dx / d) * inp.x + (dy / d) * inp.y;
        var score = dot * 2 - d * 0.002;
        if (score > bs) { bs = score; best = m; }
      }
      if (best) mate = best;
    }
    if (mate) this._doPass(o, mate);
  };

  M._doPass = function (o, mate) {
    var b = this.ball;
    var dx = mate.x - o.x, dy = mate.y - o.y, l = Math.hypot(dx, dy) || 1;
    var pw = clamp(l * 2.2, 260, 620);
    b.owner = null; b.lastTouch = o; o.cool = 0.18;
    b.vx = dx / l * pw; b.vy = dy / l * pw;
    b.x = o.x + dx / l * 24; b.y = o.y + dy / l * 24;
  };

  M._shoot = function () {
    var b = this.ball;
    if (!b.owner || b.owner.side !== this.humanSide) return;
    var o = b.owner;
    var goalX = this.targetGoalX(o.side);
    var aimY = FH / 2;
    var inp = this._humanInputVec();
    if (inp.mag > 0) aimY = clamp(o.y + inp.y * 120, GOAL_TOP + 12, GOAL_BOT - 12);
    this._doShot(o, goalX, aimY, 620);
  };

  M._doShot = function (o, gx, gy, power) {
    var b = this.ball;
    var dx = gx - o.x, dy = gy - o.y, l = Math.hypot(dx, dy) || 1;
    // lehká nepřesnost podle ratingu
    var err = (10 - o.rating) * 0.012;
    var ang = Math.atan2(dy, dx) + (this._rand() - 0.5) * err;
    b.owner = null; b.lastTouch = o; o.cool = 0.2;
    b.vx = Math.cos(ang) * power; b.vy = Math.sin(ang) * power;
    b.x = o.x + Math.cos(ang) * 24; b.y = o.y + Math.sin(ang) * 24;
  };

  // ---- míč -----------------------------------------------------------------
  M._updateBall = function (dt) {
    var b = this.ball;
    if (b.owner) return;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.vx *= 0.985; b.vy *= 0.985;
    if (Math.abs(b.vx) < 4) b.vx = 0;
    if (Math.abs(b.vy) < 4) b.vy = 0;

    // odraz od horní/dolní strany
    if (b.y < 10) { b.y = 10; b.vy = Math.abs(b.vy) * 0.6; }
    if (b.y > FH - 10) { b.y = FH - 10; b.vy = -Math.abs(b.vy) * 0.6; }
    // odraz od bočních stran mimo branku
    if (b.x < 10 && (b.y < GOAL_TOP || b.y > GOAL_BOT)) { b.x = 10; b.vx = Math.abs(b.vx) * 0.6; }
    if (b.x > FW - 10 && (b.y < GOAL_TOP || b.y > GOAL_BOT)) { b.x = FW - 10; b.vx = -Math.abs(b.vx) * 0.6; }
  };

  M._checkGoal = function () {
    var b = this.ball;
    if (b.owner) return;
    var scored = null;
    if (b.x <= 6 && b.y > GOAL_TOP && b.y < GOAL_BOT) {
      // gól do levé branky => skóroval tým útočící doleva
      scored = this.attackDir("home") < 0 ? "home" : "away";
    } else if (b.x >= FW - 6 && b.y > GOAL_TOP && b.y < GOAL_BOT) {
      scored = this.attackDir("home") > 0 ? "home" : "away";
    }
    if (scored) {
      if (scored === "home") this.scoreH++; else this.scoreA++;
      this.flash = 0.6;
      this.state = "goal"; this.stateTimer = 1.8;
      this.message = "GÓÓÓL!  " + (scored === "home" ? this.home.name : this.away.name);
    }
  };

  // ---- kamera --------------------------------------------------------------
  M._updateCamera = function (dt, slow) {
    var t = this.state === "penalties" ? { x: this._penFocusX(), y: FH / 2 } : { x: this.ball.x, y: this.ball.y };
    var k = slow ? 3 : 6;
    this.cam.x += (t.x - this.cam.x) * Math.min(1, k * dt);
    this.cam.y += (t.y - this.cam.y) * Math.min(1, k * dt);
  };

  // ---- PENALTY -------------------------------------------------------------
  M._startPenalties = function () {
    this.pen = {
      round: 0, turn: "home", homeGoals: 0, awayGoals: 0,
      homeShots: 0, awayShots: 0, sudden: false,
      phase: "ready",          // ready|aim|result|done
      timer: 1.2, kicker: null, aim: 1, keeperDive: 1,
      result: "", suddenStart: false
    };
    this.message = "PENALTY ROZSTŘEL";
    this._penSetup();
  };

  M._penFocusX = function () { return (this._penGoalX !== undefined && this._penGoalX > FW / 2) ? FW - 150 : 150; };

  M._penSetup = function () {
    var p = this.pen;
    // kdo má kopat -> ke které brance
    var shooting = p.turn; // tým, který kope
    var gx = this.targetGoalX(shooting);
    var keeperSide = shooting === "home" ? "away" : "home";
    // postav střelce a brankáře
    this._penGoalX = gx;
    this._penGY = FH / 2;
    this.ball.x = gx > FW / 2 ? FW - 180 : 180;
    this.ball.y = FH / 2; this.ball.vx = this.ball.vy = 0; this.ball.owner = null;
    this._penKeeperX = gx > FW / 2 ? FW - 24 : 24;
    this._penKeeperY = FH / 2;
    this._penZone = 0; // -1 levo,0 střed,1 pravo (mířidlo)
    this._penKeeperZone = 0;
    p.phase = "ready"; p.timer = 1.0; p.result = "";
    this._penHumanKicks = (shooting === this.humanSide);
  };

  M._penUpdate = function (dt) {
    var p = this.pen;
    p.timer -= dt;
    if (p.phase === "ready") {
      if (p.timer <= 0) { p.phase = "aim"; this._penZone = 0; this._penAnim = 0; }
    } else if (p.phase === "aim") {
      // hráč je vždy zapojený: buď kope (L = střela), nebo chytá (L = skok)
      this._penAnim = (this._penAnim || 0) + dt;
      if (this._penHumanKicks) {
        if (this._penAnim > 6) { this._penZone = 0; this._penResolve(false); }
      } else {
        if (this._penAnim > 6) { this._penZone = [-1, 0, 1][Math.floor(this._rand() * 3)]; this._penResolve(true); }
      }
    } else if (p.phase === "fly") {
      this._penFlyT += dt * 2.2;
      var t = Math.min(1, this._penFlyT);
      this.ball.x = this._penFromX + (this._penToX - this._penFromX) * t;
      this.ball.y = this._penFromY + (this._penToY - this._penFromY) * t;
      // brankář skočí
      this._penKeeperY = FH / 2 + this._penKeeperZone * (GOAL_H * 0.4) * Math.min(1, t * 1.5);
      if (t >= 1) { p.phase = "result"; p.timer = 1.3; }
    } else if (p.phase === "result") {
      if (p.timer <= 0) this._penNext();
    }
  };

  M._penKey = function (code) {
    var p = this.pen;
    if (!p || p.phase !== "aim") return;
    if (!this._penHumanKicks) {
      // lidský hráč chytá: vybírá směr skoku
      if (code === "ArrowUp" || code === "ArrowLeft") this._penKeeperPick = -1;
      else if (code === "ArrowDown" || code === "ArrowRight") this._penKeeperPick = 1;
      // ale fakticky kope AI; reaguje na L? Pro chytání použijeme L = "skoč"
      if (code === "KeyL") {
        this._penZone = [-1, 0, 1][Math.floor(this._rand() * 3)]; // AI střelec
        this._penResolve(true);
      }
      return;
    }
    if (code === "ArrowUp") this._penZone = -1;
    else if (code === "ArrowDown") this._penZone = 1;
    else if (code === "ArrowLeft" || code === "ArrowRight") this._penZone = 0;
    if (code === "KeyL") this._penResolve(false);
  };

  M._penResolve = function (humanSaving) {
    var p = this.pen;
    // brankářův skok
    if (humanSaving && this._penKeeperPick !== undefined) this._penKeeperZone = this._penKeeperPick;
    else this._penKeeperZone = [-1, 0, 1][Math.floor(this._rand() * 3)];

    var zone = this._penZone;
    var saved = (zone === this._penKeeperZone) && (this._rand() < 0.7);
    p._saved = saved;

    // letová animace
    var gx = this._penGoalX;
    var gy = FH / 2 + zone * (GOAL_H * 0.32);
    this._penFromX = this.ball.x; this._penFromY = this.ball.y;
    this._penToX = gx > FW / 2 ? FW - 14 : 14;
    this._penToY = gy;
    this._penFlyT = 0;
    p.phase = "fly"; p.timer = 1.0;

    if (!saved) {
      if (p.turn === "home") p.homeGoals++; else p.awayGoals++;
      this.flash = 0.4;
    }
    p.result = saved ? "CHYŤ! Brankář to vytáhl!" : "GÓÓL!";
    if (p.turn === "home") p.homeShots++; else p.awayShots++;
  };

  M._penNext = function () {
    var p = this.pen;
    this._penKeeperPick = undefined;
    // konec rozstřelu?
    if (this._penDecided()) {
      this.state = "fulltime";
      this.message = "KONEC — PENALTY";
      this._finish({ home: p.homeGoals, away: p.awayGoals });
      return;
    }
    // další kop
    p.turn = p.turn === "home" ? "away" : "home";
    if (p.turn === "home") p.round++;
    if (p.round >= 5) p.sudden = true;
    this._penSetup();
  };

  M._penDecided = function () {
    var p = this.pen;
    var hs = p.homeShots, as = p.awayShots, hg = p.homeGoals, ag = p.awayGoals;
    if (!p.sudden) {
      var hRem = 5 - hs, aRem = 5 - as;
      if (hg > ag + aRem) return true;
      if (ag > hg + hRem) return true;
      if (hs >= 5 && as >= 5 && hg !== ag) return true;
      return false;
    } else {
      // náhlá smrt: po dokončení páru
      if (hs === as && hs > 5 && hg !== ag) return true;
      return false;
    }
  };

  // ---- pseudonáhoda (per-zápas seed pro plynulost) -------------------------
  M._rand = function () {
    this._seed = (this._seed || ((this.home.code.length + this.away.code.length) * 2654435761) >>> 0);
    this._seed = (this._seed * 1664525 + 1013904223) >>> 0;
    return this._seed / 4294967296;
  };

  // ---- vykreslení ----------------------------------------------------------
  M.render = function (ctx, W, H) {
    ctx.save();
    ctx.fillStyle = "#0a5a1e"; ctx.fillRect(0, 0, W, H);

    var zoom = this.cam.zoom;
    var camX = clamp(this.cam.x, W / (2 * zoom), FW - W / (2 * zoom));
    var camY = clamp(this.cam.y, H / (2 * zoom), FH - H / (2 * zoom));
    if (FW * zoom < W) camX = FW / 2;
    if (FH * zoom < H) camY = FH / 2;

    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    this._drawPitch(ctx);
    // hráči
    var self = this;
    var ordered = this.players.slice().sort(function (a, b) { return a.y - b.y; });
    ordered.forEach(function (p) { self._drawPlayer(ctx, p); });
    this._drawBall(ctx);
    if (this.state === "penalties") this._drawPen(ctx);

    ctx.restore();

    // HUD
    this._drawHUD(ctx, W, H);
    if (this.state === "penalties") this._drawPenHUD(ctx, W, H);

    if (this.flash > 0) {
      ctx.fillStyle = "rgba(255,255,255," + (this.flash * 0.5) + ")";
      ctx.fillRect(0, 0, W, H);
    }
  };

  M._drawPitch = function (ctx) {
    // pruhy trávy
    for (var i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? "#0c6322" : "#0a5a1e";
      ctx.fillRect(i * (FW / 12), 0, FW / 12, FH);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, FW - 20, FH - 20);
    // půlící čára
    ctx.beginPath(); ctx.moveTo(FW / 2, 10); ctx.lineTo(FW / 2, FH - 10); ctx.stroke();
    ctx.beginPath(); ctx.arc(FW / 2, FH / 2, 70, 0, Math.PI * 2); ctx.stroke();
    // pokutová území
    [10, FW - 10].forEach(function (gx) {
      var sign = gx < FW / 2 ? 1 : -1;
      ctx.strokeRect(gx, FH / 2 - 150, sign * 150, 300);
      ctx.strokeRect(gx, FH / 2 - 70, sign * 55, 140);
    });
    // branky
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(-6, GOAL_TOP, 16, GOAL_H);
    ctx.fillRect(FW - 10, GOAL_TOP, 16, GOAL_H);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
    ctx.strokeRect(-6, GOAL_TOP, 16, GOAL_H);
    ctx.strokeRect(FW - 10, GOAL_TOP, 16, GOAL_H);
  };

  M._drawPlayer = function (ctx, p) {
    var r = 15;
    // stín
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 14, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    // tělo (dres)
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.shorts; ctx.lineWidth = 3; ctx.stroke();
    // náznak vady – barevný vršek (vlasy)
    var hint = this._quirkColor(p.quirk);
    if (hint) { ctx.fillStyle = hint; ctx.beginPath(); ctx.arc(p.x, p.y - r * 0.4, r * 0.6, Math.PI, 0); ctx.fill(); }
    // číslo
    ctx.fillStyle = this._contrast(p.color);
    ctx.font = "bold 13px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(p.num, p.x, p.y + 1);

    // zvýraznění aktivního lidského hráče
    if (p === this.activeHuman && this.state === "play") {
      ctx.strokeStyle = "#ffeb3b"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#ffeb3b";
      ctx.beginPath(); ctx.moveTo(p.x, p.y - r - 10); ctx.lineTo(p.x - 6, p.y - r - 18); ctx.lineTo(p.x + 6, p.y - r - 18); ctx.fill();
    }
  };

  M._quirkColor = function (q) {
    if (q === "modreVlasy") return "#1e88e5";
    if (q === "zeleneVlasy") return "#43a047";
    if (q === "ruzoveVlasy") return "#ec407a";
    if (q === "fialoveVlasy") return "#8e24aa";
    if (q === "rohyVlasy") return "#d32f2f";
    if (q === "zelenaKuze") return "#7cb342";
    if (q === "modraKuze") return "#5c9ce0";
    return null;
  };

  M._contrast = function (hex) {
    var c = hex.replace("#", "");
    var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 150 ? "#111" : "#fff";
  };

  M._drawPen = function (ctx) {
    var gx = this._penGoalX;
    if (gx === undefined) return;
    // zvýraznění branky
    ctx.strokeStyle = "rgba(255,255,0,0.4)"; ctx.lineWidth = 4;
    ctx.strokeRect(gx > FW / 2 ? FW - 10 : -6, GOAL_TOP, 16, GOAL_H);
    // brankář
    var kx = this._penKeeperX, ky = this._penKeeperY;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(kx, ky + 16, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(kx, ky, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffeb3b"; ctx.font = "bold 12px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("GK", kx, ky);
    // mířidlo (když lidský hráč kope)
    if (this.pen.phase === "aim" && this._penHumanKicks) {
      var ay = FH / 2 + this._penZone * (GOAL_H * 0.32);
      ctx.strokeStyle = "#ff5252"; ctx.lineWidth = 3;
      var tx = gx > FW / 2 ? FW - 14 : 14;
      ctx.beginPath(); ctx.arc(tx, ay, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx - 24, ay); ctx.lineTo(tx, ay); ctx.stroke();
    }
  };

  M._drawBall = function (ctx) {
    var b = this.ball;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 8, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
  };

  M._drawHUD = function (ctx, W, H) {
    // skóre + minuty vlevo nahoře
    var minute = Math.floor(((this.half - 1) * 45) + (this.clock / HALF_LENGTH) * 45);
    if (this.state === "fulltime" || this.state === "penalties") minute = 90;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(12, 12, 250, 56);
    ctx.fillStyle = "#fff"; ctx.font = "bold 20px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(this.home.code + " " + this.scoreH + " : " + this.scoreA + " " + this.away.code, 24, 30);
    ctx.fillStyle = "#ffeb3b"; ctx.font = "bold 16px Arial";
    var half = this.half === 1 ? "1. poločas" : "2. poločas";
    ctx.fillText(minute + "'   (" + half + ")", 24, 54);

    if (this.label) {
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(W - 232, 12, 220, 30);
      ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial"; ctx.textAlign = "right";
      ctx.fillText(this.label, W - 22, 28);
    }

    // ovládací nápověda
    if (this.state === "play" || this.state === "kickoff") {
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(12, H - 38, 470, 28);
      ctx.fillStyle = "#fff"; ctx.font = "13px Arial"; ctx.textAlign = "left";
      ctx.fillText("Šipky = pohyb    I = nahrávka    L = střela", 22, H - 24);
    }

    // velká hláška
    if (this.message && this.state !== "penalties") {
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, H / 2 - 44, W, 88);
      ctx.fillStyle = "#ffeb3b"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(this.message, W / 2, H / 2);
    }
  };

  M._drawPenHUD = function (ctx, W, H) {
    var p = this.pen;
    ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 0, W, 70);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 24px Arial";
    ctx.fillText("PENALTY  " + this.home.code + "  " + p.homeGoals + " : " + p.awayGoals + "  " + this.away.code, W / 2, 26);
    ctx.font = "16px Arial"; ctx.fillStyle = "#ffeb3b";
    ctx.fillText(p.sudden ? "NÁHLÁ SMRT" : ("Kolo " + (p.round + 1) + " / 5"), W / 2, 52);

    var bottom = H - 60;
    ctx.font = "bold 18px Arial"; ctx.fillStyle = "#fff";
    if (p.phase === "aim") {
      if (this._penHumanKicks) {
        ctx.fillText("Miř ↑ nahoru / ↓ dolů / ← → na střed,  pak L = vystřel", W / 2, bottom);
      } else {
        ctx.fillText("Soupeř kope! ↑/↓ vyber stranu skoku, L = skoč (chytej!)", W / 2, bottom);
      }
    } else if (p.phase === "result") {
      ctx.fillStyle = p._saved ? "#ff5252" : "#69f0ae";
      ctx.font = "bold 30px Arial";
      ctx.fillText(p.result, W / 2, bottom);
    } else if (p.phase === "ready") {
      ctx.fillText((p.turn === this.humanSide ? "Tvůj kop připraven..." : "Soupeř se chystá..."), W / 2, bottom);
    }
  };

  // krok dokončení (vrácení výsledku ven)
  M.tickEnd = function (dt) {
    if (this._result && this._endDelay !== undefined) {
      this._endDelay -= dt;
      if (this._endDelay <= 0 && !this._ended) {
        this._ended = true; this.state = "done";
        this.onEnd(this._result);
      }
    }
  };

})(window.VS = window.VS || {});
