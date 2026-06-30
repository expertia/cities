/* ===========================================================================
   match.js — herní engine jednoho zápasu (pohled shora, kamera za míčem)
   Ovládání: šipky = pohyb, I = nahrávka, L = střela / penalta
   ===========================================================================*/

const WORLD_W = 1280;
const WORLD_H = 800;
const MARGIN = 70;                 // okraj kolem hřiště
const FIELD_L = MARGIN;
const FIELD_R = WORLD_W - MARGIN;
const FIELD_T = MARGIN;
const FIELD_B = WORLD_H - MARGIN;
const FIELD_W = FIELD_R - FIELD_L;
const FIELD_H = FIELD_B - FIELD_T;
const GOAL_HALF = 80;              // půlka výšky branky
const GOAL_Y = (FIELD_T + FIELD_B) / 2;

const HALF_SECONDS = 90;           // délka jednoho poločasu (reálné sekundy) -> zápas 3 min
const DRIBBLE_DIST = 26;
const POSSESS_DIST = 22;

// formace (normalizované 0..1 v polovině hřiště útoku doprava)
const FORMATION = [
  { x: 0.05, y: 0.5, gk: true },   // brankář
  { x: 0.22, y: 0.2 },
  { x: 0.22, y: 0.4 },
  { x: 0.22, y: 0.6 },
  { x: 0.22, y: 0.8 },
  { x: 0.45, y: 0.3 },
  { x: 0.45, y: 0.5 },
  { x: 0.45, y: 0.7 },
  { x: 0.70, y: 0.25 },
  { x: 0.70, y: 0.5 },
  { x: 0.70, y: 0.75 },
];

class Match {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.homeName = opts.home;
    this.awayName = opts.away;
    this.home = getCountry(opts.home);
    this.away = getCountry(opts.away);
    this.playerTeam = opts.playerTeam; // 0 = home, 1 = away (kterou tým ovládá hráč)
    this.isKnockout = !!opts.isKnockout;
    this.onFinish = opts.onFinish;
    this.label = opts.label || "";

    this.score = [0, 0];
    this.time = 0;          // sekundy v aktuálním poločase
    this.half = 1;
    this.state = "kickoff"; // kickoff | play | goal | halftime | fulltime | pens | done
    this.stateTimer = 0;
    this.message = "";

    this.keys = {};
    this.players = [];
    this.controlled = null;
    this.lastShootBy = null;

    this.cam = { x: WORLD_W / 2, y: WORLD_H / 2, zoom: 1.0 };

    this.pens = { active: false, h: 0, a: 0, shot: 0, turn: 0, log: [], waiting: false, anim: null };

    this.setupTeams();
    this.resetKickoff(this.playerTeam);

    this._boundKeyDown = (e) => this.onKey(e, true);
    this._boundKeyUp = (e) => this.onKey(e, false);
    window.addEventListener("keydown", this._boundKeyDown);
    window.addEventListener("keyup", this._boundKeyUp);

    this.running = true;
    this.lastT = null;
    this._loop = (t) => this.loop(t);
    requestAnimationFrame(this._loop);
  }

  destroy() {
    this.running = false;
    window.removeEventListener("keydown", this._boundKeyDown);
    window.removeEventListener("keyup", this._boundKeyUp);
  }

  onKey(e, down) {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "i", "l"].includes(k)) {
      e.preventDefault();
      this.keys[k] = down;
      if (down) {
        if (this.pens.active) {
          if (k === "l") this.penPlayerShoot();
        } else {
          if (k === "i") this.tryPass();
          if (k === "l") this.tryShoot();
        }
      }
    }
  }

  setupTeams() {
    this.players = [];
    for (let team = 0; team < 2; team++) {
      const country = team === 0 ? this.home : this.away;
      for (let i = 0; i < 11; i++) {
        const f = FORMATION[i];
        // tým 0 útočí doprava, tým 1 doleva (zrcadlení x)
        const fx = team === 0 ? f.x : 1 - f.x;
        const px = FIELD_L + fx * FIELD_W;
        const py = FIELD_T + f.y * FIELD_H;
        this.players.push({
          team, idx: i, isGK: !!f.gk,
          x: px, y: py, vx: 0, vy: 0,
          fx, fy: f.y,
          face: 8 + i, // velikost hlavy
          sp: country.squad[i] || country.squad[0],
          shirt: country.shirt, shorts: country.shorts, skin: country.skin,
          dir: team === 0 ? 0 : Math.PI,
          cooldown: 0,
        });
      }
    }
    this.ball = { x: WORLD_W / 2, y: WORLD_H / 2, vx: 0, vy: 0, owner: null, ownerCd: 0 };
  }

  resetKickoff(kickTeam) {
    for (const p of this.players) {
      const fx = p.team === 0 ? p.fx : p.fx; // už zrcadleno
      const realFx = p.team === 0 ? FORMATION[p.idx].x : 1 - FORMATION[p.idx].x;
      p.x = FIELD_L + realFx * FIELD_W;
      p.y = FIELD_T + p.fy * FIELD_H;
      p.vx = p.vy = 0;
    }
    this.ball.x = WORLD_W / 2;
    this.ball.y = WORLD_H / 2;
    this.ball.vx = this.ball.vy = 0;
    this.ball.owner = null;
    this.ball.ownerCd = 0;
    this.state = "kickoff";
    this.stateTimer = 1.0;
    this.message = this.half === 1 && this.time === 0 ? "VÝKOP" : "";
  }

  // ---- smyčka ----
  loop(t) {
    if (!this.running) return;
    if (this.lastT === null) this.lastT = t;
    let dt = (t - this.lastT) / 1000;
    this.lastT = t;
    if (dt > 0.05) dt = 0.05;

    if (this.pens.active) this.updatePens(dt);
    else this.update(dt);

    this.render();
    requestAnimationFrame(this._loop);
  }

  update(dt) {
    // časování stavů
    if (this.state === "kickoff") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) { this.state = "play"; this.message = ""; }
    } else if (this.state === "goal") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        const concede = this._lastScorer === 0 ? 1 : 0;
        this.resetKickoff(concede);
      }
      this.updatePhysicsOnly(dt);
      return;
    } else if (this.state === "halftime") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.half = 2; this.time = 0;
        this.resetKickoff(this.playerTeam === 0 ? 1 : 0);
      }
      return;
    }

    if (this.state === "play") {
      this.time += dt;
      if (this.time >= HALF_SECONDS) {
        if (this.half === 1) {
          this.state = "halftime"; this.stateTimer = 2.2;
          this.message = "POLOČAS";
        } else {
          this.endRegulation();
          return;
        }
      }
    }

    this.handleInput(dt);
    this.updateAI(dt);
    this.updatePlayers(dt);
    this.updateBall(dt);
    this.updateCamera(dt);
  }

  updatePhysicsOnly(dt) {
    this.updateBall(dt);
    this.updateCamera(dt);
  }

  endRegulation() {
    if (this.score[0] === this.score[1] && this.isKnockout) {
      // penalty
      this.startPens();
    } else {
      this.finish(null);
    }
  }

  finish(pens) {
    this.state = "done";
    this.running = false;
    this.destroy();
    const hs = this.score[0], as = this.score[1];
    let winner;
    if (pens) winner = pens[0] > pens[1] ? this.homeName : this.awayName;
    else winner = hs > as ? this.homeName : as > hs ? this.awayName : null;
    setTimeout(() => this.onFinish({ hs, as, pens, winner }), 50);
  }

  // ---- vstup hráče ----
  selectControlled() {
    // ovládáme hráče našeho týmu nejblíže míči (kromě GK pokud možno)
    let best = null, bd = Infinity;
    for (const p of this.players) {
      if (p.team !== this.playerTeam) continue;
      if (p.isGK) continue;
      const d = dist2(p, this.ball);
      if (d < bd) { bd = d; best = p; }
    }
    this.controlled = best;
  }

  handleInput(dt) {
    this.selectControlled();
    const p = this.controlled;
    if (!p) return;
    let dx = 0, dy = 0;
    if (this.keys["arrowleft"]) dx -= 1;
    if (this.keys["arrowright"]) dx += 1;
    if (this.keys["arrowup"]) dy -= 1;
    if (this.keys["arrowdown"]) dy += 1;
    const sp = 185 * (p.sp.speed || 1);
    if (dx || dy) {
      const m = Math.hypot(dx, dy);
      p.vx = (dx / m) * sp;
      p.vy = (dy / m) * sp;
      p.dir = Math.atan2(dy, dx);
    } else {
      p.vx *= 0.7; p.vy *= 0.7;
    }
  }

  attackDir(team) { return team === 0 ? 1 : -1; }
  oppGoalX(team) { return team === 0 ? FIELD_R : FIELD_L; }

  tryPass() {
    if (this.state !== "play") return;
    const p = this.controlled;
    if (!p || this.ball.owner !== p) return;
    // najdi nejlepšího spoluhráče dopředu
    const dir = this.attackDir(p.team);
    let best = null, bscore = -Infinity;
    for (const m of this.players) {
      if (m === p || m.team !== p.team || m.isGK) continue;
      const ahead = (m.x - p.x) * dir;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d < 40 || d > 420) continue;
      const s = ahead * 1.5 - d * 0.3;
      if (s > bscore) { bscore = s; best = m; }
    }
    if (!best) return;
    const ang = Math.atan2(best.y - p.y, best.x - p.x);
    const power = Math.min(560, 180 + Math.hypot(best.x - p.x, best.y - p.y) * 1.1);
    this.kickBall(ang, power, p);
  }

  tryShoot() {
    if (this.state !== "play") return;
    const p = this.controlled;
    if (!p || this.ball.owner !== p) return;
    const gx = this.oppGoalX(p.team);
    // mírné míření podle šipek nahoru/dolů
    let aimY = GOAL_Y;
    if (this.keys["arrowup"]) aimY = GOAL_Y - GOAL_HALF * 0.7;
    if (this.keys["arrowdown"]) aimY = GOAL_Y + GOAL_HALF * 0.7;
    const ang = Math.atan2(aimY - p.y, gx - p.x);
    this.kickBall(ang, 640, p);
    this.lastShootBy = p;
  }

  kickBall(ang, power, by) {
    this.ball.vx = Math.cos(ang) * power;
    this.ball.vy = Math.sin(ang) * power;
    this.ball.owner = null;
    this.ball.ownerCd = 0.35;
    this.ball.x = by.x + Math.cos(ang) * 18;
    this.ball.y = by.y + Math.sin(ang) * 18;
  }

  // ---- AI ----
  updateAI(dt) {
    for (let team = 0; team < 2; team++) {
      const mates = this.players.filter((p) => p.team === team);
      // kdo je nejblíž míči (toho pošleme na míč)
      let chaser = null, cd = Infinity;
      for (const p of mates) {
        if (p.isGK) continue;
        if (team === this.playerTeam && p === this.controlled) { chaser = p; continue; }
        const d = dist2(p, this.ball);
        if (d < cd) { cd = d; chaser = p; }
      }
      const dir = this.attackDir(team);

      for (const p of mates) {
        if (team === this.playerTeam && p === this.controlled) continue;

        if (p.isGK) { this.updateGK(p, dt); continue; }

        const sp = 150 * (p.sp.speed || 1);
        let tx, ty;

        const hasBall = this.ball.owner === p;
        if (hasBall) {
          // veď míč k brance, u branky vystřel / nahraj
          const gx = this.oppGoalX(team);
          const distGoal = Math.abs(gx - p.x);
          if (distGoal < 240 && Math.random() < 0.05) {
            const ang = Math.atan2(GOAL_Y + (Math.random() - 0.5) * GOAL_HALF - p.y, gx - p.x);
            this.kickBall(ang, 600, p);
          } else if (Math.random() < 0.012) {
            // občas nahraj
            this.aiPass(p, team);
          }
          tx = gx; ty = GOAL_Y + (p.y - GOAL_Y) * 0.4;
        } else if (p === chaser) {
          tx = this.ball.x; ty = this.ball.y;
        } else {
          // drž formaci posunutou podle míče
          const baseX = FIELD_L + (team === 0 ? p.fx : p.fx) * FIELD_W;
          const realFx = team === 0 ? FORMATION[p.idx].x : 1 - FORMATION[p.idx].x;
          const shift = (this.ball.x - WORLD_W / 2) * 0.35;
          tx = FIELD_L + realFx * FIELD_W + shift;
          ty = FIELD_T + p.fy * FIELD_H + (this.ball.y - WORLD_H / 2) * 0.18;
        }

        const ang = Math.atan2(ty - p.y, tx - p.x);
        const d = Math.hypot(tx - p.x, ty - p.y);
        const s = d < 6 ? 0 : sp;
        p.vx = Math.cos(ang) * s;
        p.vy = Math.sin(ang) * s;
        if (s > 0) p.dir = ang;
      }
    }
  }

  aiPass(p, team) {
    const dir = this.attackDir(team);
    let best = null, score = -Infinity;
    for (const m of this.players) {
      if (m === p || m.team !== team || m.isGK) continue;
      const ahead = (m.x - p.x) * dir;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d < 50 || d > 380) continue;
      const s = ahead - d * 0.2;
      if (s > score) { score = s; best = m; }
    }
    if (best) {
      const ang = Math.atan2(best.y - p.y, best.x - p.x);
      this.kickBall(ang, 200 + Math.hypot(best.x - p.x, best.y - p.y), p);
    }
  }

  updateGK(p, dt) {
    const team = p.team;
    const goalX = team === 0 ? FIELD_L + 20 : FIELD_R - 20;
    // sleduj y míče, drž se na čáře, vyběhni když je míč blízko
    const closeToGoal = Math.abs(this.ball.x - goalX) < 180;
    let tx = goalX + (closeToGoal ? (this.ball.x - goalX) * 0.25 : 0);
    let ty = clamp(this.ball.y, GOAL_Y - GOAL_HALF, GOAL_Y + GOAL_HALF);
    const ang = Math.atan2(ty - p.y, tx - p.x);
    const d = Math.hypot(tx - p.x, ty - p.y);
    const s = d < 4 ? 0 : 170;
    p.vx = Math.cos(ang) * s;
    p.vy = Math.sin(ang) * s;
  }

  // ---- pohyb hráčů a míče ----
  updatePlayers(dt) {
    for (const p of this.players) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.x = clamp(p.x, FIELD_L - 10, FIELD_R + 10);
      p.y = clamp(p.y, FIELD_T - 10, FIELD_B + 10);
      if (p.cooldown > 0) p.cooldown -= dt;
    }
    // jednoduché odstrkávání
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i], b = this.players[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < 18) {
          const push = (18 - d) / 2;
          const nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
        }
      }
    }
  }

  updateBall(dt) {
    const b = this.ball;
    if (b.ownerCd > 0) b.ownerCd -= dt;

    // získání míče / driblink
    if (this.state === "play") {
      if (b.owner) {
        // drž míč před hráčem
        const o = b.owner;
        b.x = o.x + Math.cos(o.dir) * 16;
        b.y = o.y + Math.sin(o.dir) * 16;
        b.vx = b.vy = 0;
        // odebrání míče soupeřem
        for (const p of this.players) {
          if (p.team === o.team) continue;
          if (dist(p, b) < 16 && p.cooldown <= 0) {
            if (Math.random() < 0.06 + (p.sp.skill || 0.5) * 0.04) {
              b.owner = p; o.cooldown = 0.4;
              break;
            }
          }
        }
      } else {
        // pohyb volného míče
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vx *= 0.985;
        b.vy *= 0.985;
        if (Math.abs(b.vx) < 4) b.vx = 0;
        if (Math.abs(b.vy) < 4) b.vy = 0;

        // sebrání volného míče
        if (b.ownerCd <= 0) {
          let best = null, bd = POSSESS_DIST;
          for (const p of this.players) {
            const d = dist(p, b);
            if (d < bd) { bd = d; best = p; }
          }
          if (best) { b.owner = best; b.vx = b.vy = 0; }
        }
      }
    } else {
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.vx *= 0.985; b.vy *= 0.985;
    }

    // mantinely + branky
    // boční čáry
    if (b.y < FIELD_T) { b.y = FIELD_T; b.vy = Math.abs(b.vy) * 0.6; }
    if (b.y > FIELD_B) { b.y = FIELD_B; b.vy = -Math.abs(b.vy) * 0.6; }

    // brankové čáry
    if (b.x < FIELD_L) {
      if (Math.abs(b.y - GOAL_Y) < GOAL_HALF) { this.scoreGoal(1); return; } // tým 1 dal do levé branky
      b.x = FIELD_L; b.vx = Math.abs(b.vx) * 0.6;
    }
    if (b.x > FIELD_R) {
      if (Math.abs(b.y - GOAL_Y) < GOAL_HALF) { this.scoreGoal(0); return; } // tým 0 dal do pravé branky
      b.x = FIELD_R; b.vx = -Math.abs(b.vx) * 0.6;
    }
  }

  scoreGoal(team) {
    if (this.state !== "play") return;
    this.score[team]++;
    this._lastScorer = team;
    this.state = "goal";
    this.stateTimer = 2.0;
    const who = team === 0 ? this.homeName : this.awayName;
    this.message = "GÓÓÓL! " + who + "  " + this.score[0] + ":" + this.score[1];
    this.ball.owner = null;
  }

  // ---- kamera ----
  updateCamera(dt) {
    const targetX = clamp(this.ball.x, WORLD_W * 0.28, WORLD_W * 0.72);
    const targetY = clamp(this.ball.y, WORLD_H * 0.3, WORLD_H * 0.7);
    this.cam.x += (targetX - this.cam.x) * Math.min(1, dt * 4);
    this.cam.y += (targetY - this.cam.y) * Math.min(1, dt * 4);
    // mírné přiblížení když je míč u branky (šance)
    const nearGoal = Math.min(Math.abs(this.ball.x - FIELD_L), Math.abs(this.ball.x - FIELD_R));
    const wantZoom = nearGoal < 220 ? 1.22 : 1.08;
    this.cam.zoom += (wantZoom - this.cam.zoom) * Math.min(1, dt * 2);
  }

  // ===================== PENALTY ROZSTŘEL =====================
  startPens() {
    this.pens.active = true;
    this.state = "pens";
    this.message = "PENALTOVÝ ROZSTŘEL";
    this.pens.h = 0; this.pens.a = 0; this.pens.shot = 0;
    this.pens.turn = 0; this.pens.log = [];
    this.pens.phase = "intro"; this.pens.timer = 1.6;
    this.pens.anim = null;
    // postav scénu: míč na puntíku u pravé branky
    this.ball.x = FIELD_R - 130; this.ball.y = GOAL_Y;
    this.ball.vx = this.ball.vy = 0; this.ball.owner = null;
  }

  penShooterIsPlayer() {
    // turn 0 = home, 1 = away se střídá; hráč kope, když je na řadě jeho tým
    const team = this.pens.turn % 2; // 0 home,1 away
    return team === this.playerTeam;
  }

  updatePens(dt) {
    const P = this.pens;
    this.updateCamera(dt);
    if (P.phase === "intro") {
      P.timer -= dt;
      if (P.timer <= 0) { this.nextPenKick(); }
      return;
    }
    if (P.phase === "shot") {
      // anim letu míče
      const a = P.anim;
      a.t += dt;
      this.ball.x = a.x0 + (a.x1 - a.x0) * Math.min(1, a.t / a.dur);
      this.ball.y = a.y0 + (a.y1 - a.y0) * Math.min(1, a.t / a.dur);
      if (a.t >= a.dur) {
        P.phase = "result"; P.timer = 1.1;
        this.message = a.scored ? "GÓÓL!" : "CHYCENO! / VEDLE!";
      }
      return;
    }
    if (P.phase === "result") {
      P.timer -= dt;
      if (P.timer <= 0) {
        if (this.penDecided()) { this.finishPens(); return; }
        this.nextPenKick();
      }
      return;
    }
    if (P.phase === "ai") {
      P.timer -= dt;
      if (P.timer <= 0) this.penDoAI();
      return;
    }
    if (P.phase === "aim") {
      // míření šipkami nahoru/dolů, čekáme na L (penPlayerShoot)
      if (this.keys["arrowup"]) P.aimY = clamp(P.aimY - 220 * dt, GOAL_Y - GOAL_HALF, GOAL_Y + GOAL_HALF);
      if (this.keys["arrowdown"]) P.aimY = clamp(P.aimY + 220 * dt, GOAL_Y - GOAL_HALF, GOAL_Y + GOAL_HALF);
      return;
    }
  }

  penPlayerShoot() {
    const P = this.pens;
    if (P.phase !== "aim") return;
    const team = P.turn % 2;
    // brankář náhodně chytá: shoda zóny = chycení
    const aimOff = (P.aimY - GOAL_Y);
    const keeperZone = (Math.random() - 0.5) * GOAL_HALF * 2;
    const caught = Math.abs(aimOff - keeperZone) < 22;
    const onTarget = Math.abs(aimOff) < GOAL_HALF - 4;
    const scored = onTarget && !caught;
    this.executePen(team, scored, aimOff);
  }

  nextPenKick() {
    const P = this.pens;
    const team = P.turn % 2;
    // umísti míč
    if (team === 0) { this.ball.x = FIELD_R - 130; this.ball.y = GOAL_Y; }
    else { this.ball.x = FIELD_L + 130; this.ball.y = GOAL_Y; }
    this.ball.vx = this.ball.vy = 0;
    this.message = (team === 0 ? this.homeName : this.awayName) + " kope • " +
      this.homeName + " " + P.h + ":" + P.a + " " + this.awayName;

    if (this.penShooterIsPlayer()) {
      P.phase = "aim";
      P.aimY = GOAL_Y;
    } else {
      // AI kope po krátké pauze
      P.phase = "ai"; P.timer = 0.9;
      setTimeout(() => {}, 0);
      P.aiPending = true;
    }
  }

  // při AI fázi voláme z updatePens? zjednodušíme: v updatePens zpracujeme "ai"
  penDoAI() {
    const team = this.pens.turn % 2;
    const scored = Math.random() < 0.72;
    this.executePen(team, scored, (Math.random() - 0.5) * GOAL_HALF * 1.3);
  }

  executePen(team, scored, targetY) {
    const P = this.pens;
    const goalX = team === 0 ? FIELD_L + 18 : FIELD_R - 18;
    P.anim = {
      x0: this.ball.x, y0: this.ball.y,
      x1: scored ? goalX : goalX + (team === 0 ? 30 : -30),
      y1: GOAL_Y + (scored ? targetY : (targetY > 0 ? GOAL_HALF + 30 : -GOAL_HALF - 30)),
      t: 0, dur: 0.55, scored,
    };
    if (scored) { if (team === 0) P.h++; else P.a++; }
    P.log.push({ team, scored });
    P.turn++;
    P.phase = "shot";
  }

  penDecided() {
    const P = this.pens;
    const kicks = P.turn;
    const hKicks = Math.ceil(kicks / 2);
    const aKicks = Math.floor(kicks / 2);
    const hRem = Math.max(0, 5 - hKicks);
    const aRem = Math.max(0, 5 - aKicks);
    if (kicks < 10) {
      if (P.h > P.a + aRem) return true;
      if (P.a > P.h + hRem) return true;
      return false;
    }
    // po 5 kolech: rozhoduje se po dvojicích
    if (kicks % 2 === 0 && P.h !== P.a) return true;
    return false;
  }

  finishPens() {
    this.pens.active = false;
    this.finish([this.pens.h, this.pens.a]);
  }

  // ---- vykreslení ----
  render() {
    const ctx = this.ctx;
    const cw = this.canvas.width, ch = this.canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const z = this.cam.zoom;
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.scale(z, z);
    // mírný pohled "z výšky" — drobné svislé zploštění
    ctx.scale(1, 0.94);
    ctx.translate(-this.cam.x, -this.cam.y);

    this.drawField(ctx);
    this.drawBallShadow(ctx);
    // hráči seřazení podle y kvůli překryvu
    const sorted = this.players.slice().sort((a, b) => a.y - b.y);
    for (const p of sorted) this.drawPlayer(ctx, p);
    this.drawBall(ctx);

    // zaměřovač penalty
    if (this.pens.active && this.pens.phase === "aim" && this.penShooterIsPlayer()) {
      const team = this.pens.turn % 2;
      const gx = team === 0 ? FIELD_L : FIELD_R;
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(gx, this.pens.aimY, 12, 0, Math.PI * 2);
      ctx.moveTo(gx - 12, this.pens.aimY); ctx.lineTo(gx + 12, this.pens.aimY);
      ctx.moveTo(gx, this.pens.aimY - 12); ctx.lineTo(gx, this.pens.aimY + 12);
      ctx.stroke();
    }

    ctx.restore();

    this.drawHUD(ctx, cw, ch);
    if (this.pens.active) this.drawPensHUD(ctx, cw, ch);
  }

  drawField(ctx) {
    // tráva s pruhy
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#2f9e44" : "#2b9540";
      const x = FIELD_L + (FIELD_W / 12) * i;
      ctx.fillRect(x, FIELD_T - 30, FIELD_W / 12 + 1, FIELD_H + 60);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.strokeRect(FIELD_L, FIELD_T, FIELD_W, FIELD_H);
    // půlící čára
    ctx.beginPath();
    ctx.moveTo(WORLD_W / 2, FIELD_T);
    ctx.lineTo(WORLD_W / 2, FIELD_B);
    ctx.stroke();
    // střed
    ctx.beginPath();
    ctx.arc(WORLD_W / 2, GOAL_Y, 60, 0, Math.PI * 2);
    ctx.stroke();
    // velká vápna
    const boxW = 130, boxH = GOAL_HALF * 2 + 80;
    ctx.strokeRect(FIELD_L, GOAL_Y - boxH / 2, boxW, boxH);
    ctx.strokeRect(FIELD_R - boxW, GOAL_Y - boxH / 2, boxW, boxH);
    // branky
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(FIELD_L - 14, GOAL_Y - GOAL_HALF, 14, GOAL_HALF * 2);
    ctx.fillRect(FIELD_R, GOAL_Y - GOAL_HALF, 14, GOAL_HALF * 2);
    ctx.strokeRect(FIELD_L - 14, GOAL_Y - GOAL_HALF, 14, GOAL_HALF * 2);
    ctx.strokeRect(FIELD_R, GOAL_Y - GOAL_HALF, 14, GOAL_HALF * 2);
  }

  drawBallShadow(ctx) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(this.ball.x + 3, this.ball.y + 6, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPlayer(ctx, p) {
    // stín
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(p.x + 2, p.y + 10, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // tělo (dres)
    ctx.fillStyle = p.isGK ? "#222" : p.shirt;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // zvýraznění ovládaného hráče
    if (p === this.controlled && p.team === this.playerTeam) {
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
      ctx.stroke();
    }

    // hlava s vadou (malá)
    drawFace(ctx, p.x, p.y - 6, 7, p.sp, p.skin);

    // číslo
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.sp.number, p.x, p.y + 16);
  }

  drawBall(ctx) {
    const b = this.ball;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // černé fleky
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(b.x - 1.5, b.y - 1, 1.6, 0, Math.PI * 2);
    ctx.arc(b.x + 2, b.y + 1.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  displayMinute() {
    const base = this.half === 1 ? 0 : 45;
    return Math.min(45, Math.floor((this.time / HALF_SECONDS) * 45)) + base;
  }

  drawHUD(ctx, cw, ch) {
    // panel vlevo nahoře: stav + minuty
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    roundRect(ctx, 12, 12, 250, 46, 8);
    ctx.fill();

    ctx.fillStyle = this.home.shirt === "#ffffff" ? "#ddd" : this.home.shirt;
    ctx.fillRect(20, 22, 8, 26);
    ctx.fillStyle = this.away.shirt === "#ffffff" ? "#ddd" : this.away.shirt;
    ctx.fillRect(170, 22, 8, 26);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(this.home.code, 32, 33);
    ctx.fillText(this.away.code, 182, 33);
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.score[0] + " : " + this.score[1], 131, 36);

    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#ffe600";
    ctx.textAlign = "center";
    const mm = this.pens.active ? "PEN" : (this.displayMinute() + "'");
    ctx.fillText(mm + "  •  " + (this.half === 1 ? "1. pol." : "2. pol."), 131, 52);

    // titulek kola
    if (this.label) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      roundRect(ctx, cw - 12 - 180, 12, 180, 26, 8);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.label, cw - 12 - 90, 29);
    }

    // velká zpráva uprostřed
    if (this.message && !this.pens.active) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.font = "bold 34px sans-serif";
      ctx.textAlign = "center";
      const w = ctx.measureText(this.message).width;
      roundRect(ctx, cw / 2 - w / 2 - 20, ch / 2 - 34, w + 40, 56, 10);
      ctx.fill();
      ctx.fillStyle = "#ffe600";
      ctx.fillText(this.message, cw / 2, ch / 2 + 4);
    }

    // nápověda ovládání
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("šipky = pohyb   I = nahrávka   L = střela", cw - 14, ch - 12);
  }

  drawPensHUD(ctx, cw, ch) {
    const P = this.pens;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    roundRect(ctx, cw / 2 - 160, 70, 320, 40, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PENALTY  " + this.homeName + " " + P.h + " : " + P.a + " " + this.awayName, cw / 2, 95);

    if (P.phase === "aim" && this.penShooterIsPlayer()) {
      ctx.fillStyle = "#ffe600";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("Zaměř ↑/↓ a vystřel L !", cw / 2, ch - 40);
    }
  }
}

// ---- pomocné ----
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function dist2(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
