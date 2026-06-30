/* ==========================================================================
   VS - IDIOTSKÝ TURNAJ
   match.js  ->  herní engine jednoho zápasu (canvas, fyzika, AI, kamera)
   Ovládání: šipky = pohyb, I = přihrávka, L = střela / penalta
   ========================================================================== */

const FIELD = { w: 1150, h: 720, goalW: 200, wallY: 20 };
const POSTS = {
  top: FIELD.h / 2 - FIELD.goalW / 2,
  bot: FIELD.h / 2 + FIELD.goalW / 2,
};
const HALF_LEN = 180;          // délka jednoho poločasu v sekundách (3:00)
const PLAYER_R = 15;
const BALL_R = 8;
const CONTROL_DIST = 26;       // získání volného míče
const STEAL_DIST = 22;         // odebrání míče

/* formace 1 GK + 5 hráčů v poli; x relativně 0..1 (0=vlastní brána) */
const FORMATION = [
  { role: 'GK',  x: 0.05, y: 0.50 },
  { role: 'DEF', x: 0.22, y: 0.27 },
  { role: 'DEF', x: 0.22, y: 0.73 },
  { role: 'MID', x: 0.45, y: 0.50 },
  { role: 'FWD', x: 0.68, y: 0.30 },
  { role: 'FWD', x: 0.68, y: 0.70 },
];

class MatchPlayer {
  constructor(team, idx, formSlot, squadPlayer) {
    this.team = team;            // ref na MatchTeam
    this.idx = idx;
    this.role = formSlot.role;
    this.isGK = formSlot.role === 'GK';
    this.formX = formSlot.x;     // 0..1 v útočném směru týmu
    this.formY = formSlot.y;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.facing = team.attackDir > 0 ? 0 : Math.PI; // 0 = doprava
    this.squad = squadPlayer;
  }
  // domácí pozice ve světových souřadnicích
  homePos() {
    const t = this.team;
    let fx = t.attackDir > 0 ? this.formX : 1 - this.formX;
    return { x: fx * FIELD.w, y: this.formY * FIELD.h };
  }
}

class MatchTeam {
  constructor(countryName, attackDir, isHuman) {
    this.country = countryByName(countryName);
    this.name = countryName;
    this.attackDir = attackDir;   // +1 útočí doprava, -1 doleva
    this.isHuman = isHuman;
    this.jersey = { shirt: this.country.shirt, shorts: this.country.shorts };
    this.gkJersey = { shirt: this.country.gk, shorts: this.country.shorts };
    this.goals = 0;
    const squad = getSquad(countryName);
    // GK = squad[0], pak vybereme hráče z pole napříč pozicemi
    const outfield = squad.slice(1);
    const order = [outfield[0], outfield[1], outfield[4], outfield[7], outfield[9]];
    this.players = FORMATION.map((slot, i) => {
      const sp = i === 0 ? squad[0] : (order[i - 1] || outfield[i - 1]);
      return new MatchPlayer(this, i, slot, sp);
    });
    this.gk = this.players[0];
  }
  goalX() { return this.attackDir > 0 ? FIELD.w : 0; }       // kam útočí
  ownGoalX() { return this.attackDir > 0 ? 0 : FIELD.w; }
}

class Match {
  constructor(homeName, awayName, opts) {
    this.opts = opts || {};
    this.home = new MatchTeam(homeName, +1, true);
    this.away = new MatchTeam(awayName, -1, false);
    this.ball = { x: FIELD.w / 2, y: FIELD.h / 2, vx: 0, vy: 0 };
    this.owner = null;          // hráč držící míč
    this.kickCooldown = 0;      // bránění okamžitému přebrání po kopu
    this.time = 0;              // herní čas v sekundách
    this.running = true;
    this.knockout = !!this.opts.knockout;
    this.title = this.opts.title || 'ZÁPAS';
    this.onFinish = this.opts.onFinish || function () {};
    this.controlled = null;
    this.message = null;        // hláška ("GÓÓÓL")
    this.messageT = 0;
    this.cam = { x: FIELD.w / 2, y: FIELD.h / 2, scale: 1.7 };
    this.finished = false;
    this.kickoff(+1); // míč rozehrává náhodný směr
    this.resetPositions();
  }

  allPlayers() { return this.home.players.concat(this.away.players); }

  resetPositions() {
    for (const p of this.allPlayers()) {
      const h = p.homePos();
      p.x = h.x; p.y = h.y; p.vx = 0; p.vy = 0;
    }
    this.ball.x = FIELD.w / 2; this.ball.y = FIELD.h / 2;
    this.ball.vx = 0; this.ball.vy = 0;
    this.owner = null;
  }

  kickoff() { this.resetPositions(); }

  /* ----------------------------------------------------------------- UPDATE */
  update(dt, input) {
    if (this.finished) return;
    this.time += dt;
    if (this.time >= HALF_LEN) { this.endMatch(); return; }
    if (this.messageT > 0) this.messageT -= dt;
    if (this.kickCooldown > 0) this.kickCooldown -= dt;

    this.pickControlled();
    this.handleInput(input, dt);
    this.updateAI(dt);
    this.integratePlayers(dt);
    this.updateBall(dt);
    this.updateCamera(dt);
  }

  pickControlled() {
    // hráč ovládá domácího nejblíže míči (ne GK, pokud to jde)
    if (this.owner && this.owner.team === this.home && !this.owner.isGK) {
      this.controlled = this.owner; return;
    }
    let best = null, bd = Infinity;
    for (const p of this.home.players) {
      if (p.isGK) continue;
      const d = dist2(p, this.ball);
      if (d < bd) { bd = d; best = p; }
    }
    this.controlled = best;
  }

  handleInput(input, dt) {
    const p = this.controlled;
    if (!p) return;
    let ax = 0, ay = 0;
    if (input.left) ax -= 1;
    if (input.right) ax += 1;
    if (input.up) ay -= 1;
    if (input.down) ay += 1;
    const sp = 235; // px/s
    if (ax || ay) {
      const l = Math.hypot(ax, ay);
      p.vx = (ax / l) * sp;
      p.vy = (ay / l) * sp;
      p.facing = Math.atan2(ay, ax);
    } else {
      p.vx *= 0.6; p.vy *= 0.6;
    }
    // přihrávka I
    if (input.pass && this.owner === p && this.kickCooldown <= 0) {
      this.doPass(p);
    }
    // střela L
    if (input.shoot && this.owner === p && this.kickCooldown <= 0) {
      this.doShoot(p);
    }
  }

  doPass(p) {
    // najdi nejlepšího spoluhráče ve směru útoku
    let best = null, bs = -Infinity;
    for (const m of p.team.players) {
      if (m === p || m.isGK) continue;
      const towardGoal = (m.x - p.x) * p.team.attackDir;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d < 30) continue;
      const score = towardGoal - d * 0.3;
      if (score > bs) { bs = score; best = m; }
    }
    if (!best) return;
    const a = Math.atan2(best.y - p.y, best.x - p.x);
    const power = Math.min(520, 180 + Math.hypot(best.x - p.x, best.y - p.y) * 1.1);
    this.kickBall(a, power, p);
  }

  doShoot(p) {
    const gx = p.team.goalX();
    const gy = FIELD.h / 2 + (Math.random() - 0.5) * (FIELD.goalW - 30);
    const a = Math.atan2(gy - p.y, gx - p.x);
    this.kickBall(a, 640, p);
  }

  kickBall(angle, power, kicker) {
    this.ball.vx = Math.cos(angle) * power;
    this.ball.vy = Math.sin(angle) * power;
    this.owner = null;
    this.kickCooldown = 0.28;
    this.lastKicker = kicker;
  }

  /* -------------------------------------------------------------------- AI  */
  updateAI(dt) {
    // pro každý tým: nejbližší k míči chase, ostatní drží formaci vůči míči
    for (const team of [this.home, this.away]) {
      let chaser = null, cd = Infinity;
      for (const p of team.players) {
        if (p.isGK) continue;
        const d = dist2(p, this.ball);
        if (d < cd) { cd = d; chaser = p; }
      }
      for (const p of team.players) {
        if (p.isGK) { this.gkAI(p, dt); continue; }
        // domácí ovládaný hráč řízen vstupem
        if (team === this.home && p === this.controlled) continue;

        if (this.owner === p) {
          this.dribbleAI(p, dt);
        } else if (p === chaser) {
          this.moveTo(p, this.ball.x, this.ball.y, 210, dt);
        } else {
          // formace posunutá podle míče
          const h = p.homePos();
          const bias = (this.ball.x - FIELD.w / 2) * 0.35;
          this.moveTo(p, clamp(h.x + bias, 20, FIELD.w - 20), (h.y + this.ball.y) / 2, 170, dt);
        }
      }
    }
  }

  dribbleAI(p, dt) {
    const gx = p.team.goalX();
    const distGoal = Math.abs(gx - p.x);
    // střelba pokud blízko brány
    if (distGoal < 230 && this.kickCooldown <= 0) {
      const gy = FIELD.h / 2 + (Math.random() - 0.5) * (FIELD.goalW - 40);
      const a = Math.atan2(gy - p.y, gx - p.x);
      this.kickBall(a, 600, p);
      return;
    }
    // občas přihraj
    if (Math.random() < 0.012 && this.kickCooldown <= 0) {
      this.doPass(p);
      return;
    }
    // dribluj k bráně
    const ty = clamp(p.y + (FIELD.h / 2 - p.y) * 0.02, 60, FIELD.h - 60);
    this.moveTo(p, gx, ty, 195, dt);
  }

  gkAI(gk, dt) {
    const gx = gk.team.ownGoalX();
    const lineX = gx + gk.team.attackDir * 40;
    let ty = clamp(this.ball.y, POSTS.top + 10, POSTS.bot - 10);
    // pokud míč daleko, drž střed
    if (Math.abs(this.ball.x - gx) > FIELD.w * 0.45) ty = FIELD.h / 2;
    this.moveTo(gk, lineX, ty, 200, dt);
    // chytení míče
    if (this.owner == null && dist2(gk, this.ball) < CONTROL_DIST * CONTROL_DIST && this.kickCooldown <= 0) {
      this.owner = gk;
      // odkop dopředu po krátké chvíli zařídí dribbleAI? -> rovnou vykopni
      const a = gk.team.attackDir > 0 ? (-0.4 + Math.random() * 0.8) : (Math.PI - 0.4 + Math.random() * 0.8);
      setTimeout(() => {}, 0);
      this.kickBall(a, 560, gk);
    }
  }

  moveTo(p, tx, ty, sp, dt) {
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 3) { p.vx *= 0.5; p.vy *= 0.5; return; }
    p.vx = (dx / d) * sp;
    p.vy = (dy / d) * sp;
    if (Math.abs(p.vx) + Math.abs(p.vy) > 20) p.facing = Math.atan2(p.vy, p.vx);
  }

  integratePlayers(dt) {
    for (const p of this.allPlayers()) {
      p.x = clamp(p.x + p.vx * dt, 10, FIELD.w - 10);
      p.y = clamp(p.y + p.vy * dt, FIELD.wallY + 6, FIELD.h - FIELD.wallY - 6);
    }
    // jednoduchá kolize mezi hráči
    const all = this.allPlayers();
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = PLAYER_R * 1.6;
        if (d > 0 && d < min) {
          const push = (min - d) / 2;
          const nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
        }
      }
    }
  }

  updateBall(dt) {
    if (this.owner) {
      // míč drží hráč -> před nohama ve směru pohledu
      const off = PLAYER_R + BALL_R + 2;
      this.ball.x = this.owner.x + Math.cos(this.owner.facing) * off;
      this.ball.y = this.owner.y + Math.sin(this.owner.facing) * off;
      this.ball.vx = this.owner.vx; this.ball.vy = this.owner.vy;
    } else {
      this.ball.x += this.ball.vx * dt;
      this.ball.y += this.ball.vy * dt;
      this.ball.vx *= 0.985; this.ball.vy *= 0.985;
      if (Math.abs(this.ball.vx) < 4) this.ball.vx = 0;
      if (Math.abs(this.ball.vy) < 4) this.ball.vy = 0;

      // odraz od horní/dolní stěny
      if (this.ball.y < FIELD.wallY + BALL_R) { this.ball.y = FIELD.wallY + BALL_R; this.ball.vy *= -0.7; }
      if (this.ball.y > FIELD.h - FIELD.wallY - BALL_R) { this.ball.y = FIELD.h - FIELD.wallY - BALL_R; this.ball.vy *= -0.7; }

      // boční stěny / branky
      this.checkGoalsAndWalls();

      // získání volného míče
      if (this.kickCooldown <= 0) {
        let best = null, bd = CONTROL_DIST * CONTROL_DIST;
        for (const p of this.allPlayers()) {
          const d = dist2(p, this.ball);
          if (d < bd) { bd = d; best = p; }
        }
        if (best) this.owner = best;
      }
    }

    // odebrání míče soupeřem
    if (this.owner && this.kickCooldown <= 0) {
      for (const p of this.allPlayers()) {
        if (p.team === this.owner.team) continue;
        if (dist2(p, this.owner) < STEAL_DIST * STEAL_DIST) {
          if (Math.random() < 0.08) { this.owner = p; break; }
        }
      }
    }
  }

  checkGoalsAndWalls() {
    const b = this.ball;
    // pravá brána (domácí skóruje)
    if (b.x > FIELD.w - BALL_R) {
      if (b.y > POSTS.top && b.y < POSTS.bot) { this.scoreGoal(this.home); return; }
      b.x = FIELD.w - BALL_R; b.vx *= -0.7;
    }
    // levá brána (hosté skórují)
    if (b.x < BALL_R) {
      if (b.y > POSTS.top && b.y < POSTS.bot) { this.scoreGoal(this.away); return; }
      b.x = BALL_R; b.vx *= -0.7;
    }
  }

  scoreGoal(team) {
    team.goals++;
    this.message = (team.isHuman ? 'GÓÓÓL!' : 'GÓL SOUPEŘE');
    this.messageT = 1.8;
    this.resetPositions();
    this.kickCooldown = 0.4;
  }

  updateCamera(dt) {
    // kamera sleduje míč, mírně předbíhá ve směru pohybu (šance)
    const lead = 0.25;
    const tx = clampCam(this.ball.x + this.ball.vx * lead, FIELD.w, this.viewW);
    const ty = clampCam(this.ball.y + this.ball.vy * lead, FIELD.h, this.viewH);
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 4);
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 4);
  }

  endMatch() {
    if (this.finished) return;
    this.finished = true;
    const hg = this.home.goals, ag = this.away.goals;
    if (hg === ag && this.knockout) {
      // remíza v pavouku -> penalty
      this.onFinish({ draw: true, needPenalties: true, homeGoals: hg, awayGoals: ag });
    } else {
      this.onFinish({
        homeGoals: hg, awayGoals: ag,
        winner: hg > ag ? this.home.name : (ag > hg ? this.away.name : null),
      });
    }
  }

  /* ----------------------------------------------------------------- RENDER */
  render(ctx, cw, ch) {
    this.viewW = cw; this.viewH = ch;
    ctx.save();
    ctx.fillStyle = '#0a5c1f';
    ctx.fillRect(0, 0, cw, ch);

    // transform kamery (mírná perspektiva: svislé zmáčknutí 0.86)
    const sc = this.cam.scale;
    const persp = 0.9;
    ctx.translate(cw / 2, ch / 2);
    ctx.scale(sc, sc * persp);
    ctx.translate(-this.cam.x, -this.cam.y);

    this.drawField(ctx);

    // seřaď podle y pro hloubku
    const all = this.allPlayers().slice().sort((a, b) => a.y - b.y);
    // míč stín + entity prokládáme jednoduše: nejdřív hráči, míč navrch s ohledem na y
    for (const p of all) {
      const isGoalie = p.isGK;
      drawPlayerAvatar(ctx, p.x, p.y, 0.62, p.squad.look,
        isGoalie ? p.team.gkJersey : p.team.jersey,
        { number: p.squad.number });
      if (p === this.controlled) {
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 12, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    this.drawBall(ctx);
    ctx.restore();

    this.drawHUD(ctx, cw, ch);
  }

  drawField(ctx) {
    const w = FIELD.w, h = FIELD.h;
    // pruhy trávy
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#0c6a24' : '#0a5c1f';
      ctx.fillRect(i * (w / 12), 0, w / 12, h);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    // okraj
    ctx.strokeRect(6, FIELD.wallY, w - 12, h - FIELD.wallY * 2);
    // půlící čára
    ctx.beginPath(); ctx.moveTo(w / 2, FIELD.wallY); ctx.lineTo(w / 2, h - FIELD.wallY); ctx.stroke();
    // střed
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    // pokutová území
    const pen = 150, ph = 320;
    ctx.strokeRect(6, h / 2 - ph / 2, pen, ph);
    ctx.strokeRect(w - 6 - pen, h / 2 - ph / 2, pen, ph);
    // branky
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(-6, POSTS.top, 12, FIELD.goalW);
    ctx.fillRect(w - 6, POSTS.top, 12, FIELD.goalW);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    for (let yy = POSTS.top; yy < POSTS.bot; yy += 12) {
      ctx.beginPath(); ctx.moveTo(-14, yy); ctx.lineTo(0, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w, yy); ctx.lineTo(w + 14, yy); ctx.stroke();
    }
  }

  drawBall(ctx) {
    const b = this.ball;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 2, BALL_R, BALL_R * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.stroke();
  }

  drawHUD(ctx, cw, ch) {
    // panel vlevo nahoře: stav + minuty
    const min = Math.floor(this.time / 60);
    const sec = Math.floor(this.time % 60);
    const clk = `${min}:${sec < 10 ? '0' : ''}${sec}`;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    roundRect(ctx, 14, 14, 300, 56, 10); ctx.fill();
    // barevné odznaky
    ctx.fillStyle = this.home.jersey.shirt; ctx.fillRect(26, 26, 16, 16);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(26, 26, 16, 16);
    ctx.fillStyle = this.away.jersey.shirt; ctx.fillRect(26, 46, 16, 16);
    ctx.strokeRect(26, 46, 16, 16);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`${this.home.country.short}`, 50, 39);
    ctx.fillText(`${this.away.country.short}`, 50, 59);
    ctx.font = 'bold 22px Arial'; ctx.textAlign = 'right';
    ctx.fillText(`${this.home.goals}`, 150, 40);
    ctx.fillText(`${this.away.goals}`, 150, 60);
    // hodiny
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 26px monospace'; ctx.textAlign = 'right';
    ctx.fillText(clk, 302, 50);
    ctx.restore();

    // titulek zápasu nahoře uprostřed
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText(this.title, cw / 2, 28);

    // hláška o gólu
    if (this.messageT > 0 && this.message) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.messageT);
      ctx.fillStyle = '#ffe600';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
      ctx.font = 'bold 64px Arial Black, Arial';
      ctx.textAlign = 'center';
      ctx.strokeText(this.message, cw / 2, ch / 2 - 40);
      ctx.fillText(this.message, cw / 2, ch / 2 - 40);
      ctx.restore();
    }

    // nápověda ovládání dole
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '12px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Šipky = pohyb   •   I = přihrávka   •   L = střela', cw / 2, ch - 12);
  }
}

/* ---- pomocné ------------------------------------------------------------- */
function dist2(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function clampCam(v, fieldSize, viewSize) {
  // ponecháme jednoduché: nech kameru blízko míče, mírně držme v poli
  return clamp(v, fieldSize * 0.12, fieldSize * 0.88);
}
