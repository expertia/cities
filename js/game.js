/* ============================================================
   VS — IDIOTSKÝ TURNAJ  —  game.js
   Hlavní logika: menu, výběr, turnaj, zápas, penalty
   ============================================================ */
"use strict";

/* ----------------- pomocné UI funkce ----------------- */
const $ = (id) => document.getElementById(id);
const screens = ["menu", "select", "squad", "hub", "matchWrap"];
function showScreen(id) {
  screens.forEach(s => $(s).classList.toggle("active", s === id));
}

/* ----------------- globální stav turnaje ----------------- */
const G = {
  userTeam: null,
  groups: null,          // [4][4] týmů
  userGroup: -1,
  groupResults: [[], [], [], []], // per skupina: {i,j,gi,gj}
  userFixtures: [],      // [{round, oppIndexInGroup}]
  userFixtureIdx: 0,
  stage: "group",        // group | ko
  koRound: null,         // pole {a,b,winner,score}
  koName: "",            // čtvrtfinále / semifinále / finále
  pendingMatch: null,    // {opp, isKO}
  onMatchDone: null,     // callback(result)
};

/* ==========================================================
   MENU
   ========================================================== */
$("playBtn").onclick = () => { buildCountryGrid(); showScreen("select"); };
$("howBtn").onclick = () => $("howto").classList.toggle("hidden");

/* ==========================================================
   VÝBĚR ZEMĚ
   ========================================================== */
function buildCountryGrid() {
  const grid = $("countryGrid");
  grid.innerHTML = "";
  TEAMS.forEach((t, i) => {
    const el = document.createElement("div");
    el.className = "country";
    el.innerHTML = `
      <div class="flag"><i style="background:${t.c1}"></i><i style="background:${t.c2}"></i></div>
      <div class="cname">${t.name}</div>
      <div class="cstr">síla ${t.strength}</div>`;
    el.onclick = () => openSquad(i);
    grid.appendChild(el);
  });
}

function openSquad(i) {
  G.userTeam = TEAMS[i];
  $("squadTitle").innerHTML = `SESTAVA: <span style="color:var(--acc2)">${G.userTeam.name}</span>`;
  const list = $("squadList");
  list.innerHTML = "";
  G.userTeam.players.forEach(p => {
    const card = document.createElement("div");
    card.className = "pcard";
    const cv = document.createElement("canvas");
    cv.width = 110; cv.height = 110;
    const ctx = cv.getContext("2d");
    drawFace(ctx, 55, 60, 34, p);
    card.appendChild(cv);
    const info = document.createElement("div");
    info.innerHTML = `<div class="pname">${p.num}. ${p.name}</div>
      <div class="ppos">${p.pos}</div>
      <div class="pdef">⚠ ${p.defectLabel}</div>`;
    card.appendChild(info);
    list.appendChild(card);
  });
  showScreen("squad");
}

$("backToSelect").onclick = () => showScreen("select");
$("confirmTeam").onclick = () => startTournament();

/* ==========================================================
   TURNAJ — losování a hub
   ========================================================== */
function startTournament() {
  G.groups = createGroups(TEAMS);
  G.groupResults = [[], [], [], []];
  G.stage = "group";
  // najdi skupinu uživatele
  G.userGroup = G.groups.findIndex(g => g.includes(G.userTeam));
  // rozpis – vyber zápasy, kde hraje uživatel
  const grp = G.groups[G.userGroup];
  const uIdx = grp.indexOf(G.userTeam);
  const fixtures = groupFixtures(grp);
  G.userFixtures = [];
  fixtures.forEach((f, round) => {
    if (f[0] === uIdx || f[1] === uIdx) {
      const opp = f[0] === uIdx ? f[1] : f[0];
      G.userFixtures.push({ opp, round });
    }
  });
  G.userFixtureIdx = 0;
  renderGroupHub();
  showScreen("hub");
}

function renderGroupHub(message) {
  const grp = G.groups[G.userGroup];
  const standings = computeStandings(grp, G.groupResults[G.userGroup]);
  const groupLetter = "ABCD"[G.userGroup];
  let html = `<div class="hubhead">
      <div class="stage">SKUPINOVÁ FÁZE</div>
      <div class="info">Hraješ za <b style="color:var(--acc2)">${G.userTeam.name}</b> ve skupině ${groupLetter}</div>
    </div>`;

  if (message) html += `<div class="center mt" style="color:var(--acc2);font-size:18px">${message}</div>`;

  // další zápas uživatele?
  if (G.userFixtureIdx < G.userFixtures.length) {
    const fx = G.userFixtures[G.userFixtureIdx];
    const opp = grp[fx.opp];
    html += `<div class="nextmatch">
      <div>Zápas ${G.userFixtureIdx + 1}/3 ve skupině</div>
      <div class="vs"><span class="teamn">${G.userTeam.name}</span> &nbsp;VS&nbsp; <span class="teamn">${opp.name}</span></div>
      <button class="bigbtn small" id="playMatchBtn">▶ HRÁT ZÁPAS</button>
    </div>`;
  } else {
    html += `<div class="nextmatch">
      <div>Skupina dohrána!</div>
      <button class="bigbtn small" id="toKoBtn">POKRAČOVAT DO PAVOUKA ▶</button>
    </div>`;
  }

  // tabulky všech skupin
  html += `<div class="groups">`;
  for (let g = 0; g < 4; g++) {
    const st = computeStandings(G.groups[g], G.groupResults[g]);
    html += `<div class="gtable"><h4>Skupina ${"ABCD"[g]}</h4>
      <table><tr><th>Tým</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>Skóre</th><th>B</th></tr>`;
    st.forEach((r, pos) => {
      const cls = (pos < 2 ? "qual " : "") + (r.team === G.userTeam ? "you" : "");
      html += `<tr class="${cls}"><td>${r.team.name}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}:${r.GA}</td><td>${r.Pts}</td></tr>`;
    });
    html += `</table></div>`;
  }
  html += `</div>`;

  $("hubContent").innerHTML = html;
  if ($("playMatchBtn")) $("playMatchBtn").onclick = playGroupMatch;
  if ($("toKoBtn")) $("toKoBtn").onclick = startKnockout;
}

function playGroupMatch() {
  const grp = G.groups[G.userGroup];
  const fx = G.userFixtures[G.userFixtureIdx];
  const opp = grp[fx.opp];
  startMatch(opp, false, (res) => {
    // ulož výsledek uživatele
    const uIdx = grp.indexOf(G.userTeam);
    G.groupResults[G.userGroup].push({ i: uIdx, j: fx.opp, gi: res.ga, gj: res.gb });
    G.userFixtureIdx++;
    // odehraj jeden "kolo" ostatních zápasů (zjednoduše: po posledním zápase dosimuluj vše)
    if (G.userFixtureIdx >= G.userFixtures.length) {
      simulateRemainingGroups();
    }
    renderGroupHub(`Výsledek: ${G.userTeam.name} ${res.ga}:${res.gb} ${opp.name}`);
    showScreen("hub");
  });
}

/* dosimuluje všechny dosud neodehrané zápasy ve všech skupinách */
function simulateRemainingGroups() {
  for (let g = 0; g < 4; g++) {
    const grp = G.groups[g];
    const fixtures = groupFixtures(grp);
    const done = G.groupResults[g];
    fixtures.forEach(f => {
      const exists = done.some(r =>
        (r.i === f[0] && r.j === f[1]) || (r.i === f[1] && r.j === f[0]));
      if (!exists) {
        const [ga, gb] = simulateScore(grp[f[0]], grp[f[1]]);
        done.push({ i: f[0], j: f[1], gi: ga, gj: gb });
      }
    });
  }
}

/* ==========================================================
   PAVOUK (knockout)
   ========================================================== */
function startKnockout() {
  // postupující: vítěz a druhý z každé skupiny
  const adv = [];
  for (let g = 0; g < 4; g++) {
    const st = computeStandings(G.groups[g], G.groupResults[g]);
    adv.push({ first: st[0].team, second: st[1].team });
  }
  // čtvrtfinále
  const qf = [
    { a: adv[0].first, b: adv[1].second },
    { a: adv[2].first, b: adv[3].second },
    { a: adv[1].first, b: adv[0].second },
    { a: adv[3].first, b: adv[2].second },
  ];
  G.stage = "ko";
  G.bracket = { qf, sf: [], final: null, champion: null };
  // zjisti zda uživatel postoupil
  const userAdvanced = qf.some(m => m.a === G.userTeam || m.b === G.userTeam);
  G.koName = "ČTVRTFINÁLE";
  G.koRound = qf;
  G.koTargetKey = "qf";
  if (!userAdvanced) {
    // uživatel vypadl – dosimuluj celý turnaj
    finishKnockoutSimulated();
    renderBracket(`Bohužel, ${G.userTeam.name} nepostoupilo ze skupiny. 😢`, true);
  } else {
    renderBracket();
  }
  showScreen("hub");
}

function renderBracket(message, eliminated) {
  const b = G.bracket;
  const userIn = (m) => m.a === G.userTeam || m.b === G.userTeam;
  const matchHtml = (m, label) => {
    if (!m) return "";
    const cls = userIn(m) ? "bmatch youm" : "bmatch";
    const wa = m.winner === m.a ? "win" : "";
    const wb = m.winner === m.b ? "win" : "";
    const sa = m.score ? m.score.ga : "";
    const sb = m.score ? m.score.gb : "";
    const pen = m.score && m.score.pens ? ` (pen ${m.score.pens[0]}:${m.score.pens[1]})` : "";
    return `<div class="${cls}">
      <div class="bt ${wa}"><span>${m.a.name}</span><span>${sa}</span></div>
      <div class="bt ${wb}"><span>${m.b.name}</span><span>${sb}${pen}</span></div>
    </div>`;
  };

  let html = `<div class="hubhead"><div class="stage">PAVOUK O TITUL</div>`;
  if (message) html += `<div class="info" style="color:var(--acc2)">${message}</div>`;
  html += `</div><div class="bracket">`;

  html += `<div class="bround"><h5>Čtvrtfinále</h5>${b.qf.map(m => matchHtml(m)).join("")}</div>`;
  if (b.sf.length) html += `<div class="bround"><h5>Semifinále</h5>${b.sf.map(m => matchHtml(m)).join("")}</div>`;
  if (b.final) html += `<div class="bround"><h5>Finále</h5>${matchHtml(b.final)}</div>`;
  html += `</div>`;

  if (b.champion) {
    const won = b.champion === G.userTeam;
    html += `<div class="center mt" style="font-size:26px;color:var(--acc2);font-weight:800">
      🏆 MISTR IDIOTSKÉHO TURNAJE: ${b.champion.name} ${won ? "— to jsi TY! 🎉" : ""}</div>`;
    html += `<div class="center mt"><button class="bigbtn small" id="againBtn">HRÁT ZNOVU</button></div>`;
  } else if (eliminated) {
    html += `<div class="center mt"><button class="bigbtn small" id="againBtn">ZPĚT DO MENU</button></div>`;
  } else {
    // tlačítko na další zápas uživatele
    const m = G.koRound.find(userIn);
    if (m) {
      const opp = m.a === G.userTeam ? m.b : m.a;
      html += `<div class="nextmatch"><div>${G.koName}</div>
        <div class="vs"><span class="teamn">${G.userTeam.name}</span> VS <span class="teamn">${opp.name}</span></div>
        <button class="bigbtn small" id="playKoBtn">▶ HRÁT ZÁPAS</button></div>`;
    }
  }

  $("hubContent").innerHTML = html;
  if ($("playKoBtn")) $("playKoBtn").onclick = playKoMatch;
  if ($("againBtn")) $("againBtn").onclick = () => location.reload();
}

function playKoMatch() {
  const userIn = (m) => m.a === G.userTeam || m.b === G.userTeam;
  const m = G.koRound.find(userIn);
  const opp = m.a === G.userTeam ? m.b : m.a;
  startMatch(opp, true, (res) => {
    // urči vítěze (penalty řeší startMatch při remíze)
    let winner;
    if (res.ga > res.gb) winner = G.userTeam;
    else if (res.gb > res.ga) winner = opp;
    else winner = res.pens[0] > res.pens[1] ? G.userTeam : opp;
    // zapiš do uživatelova zápasu (orientace a/b)
    m.score = (m.a === G.userTeam)
      ? { ga: res.ga, gb: res.gb, pens: res.pens }
      : { ga: res.gb, gb: res.ga, pens: res.pens ? [res.pens[1], res.pens[0]] : null };
    m.winner = winner;
    // dosimuluj ostatní zápasy kola
    G.koRound.forEach(mm => {
      if (mm === m || mm.winner) return;
      const r = simulateKnockout(mm.a, mm.b);
      mm.score = { ga: r.ga, gb: r.gb, pens: r.pens };
      mm.winner = r.winner;
    });
    advanceKnockout();
  });
}

function advanceKnockout() {
  const b = G.bracket;
  if (G.koTargetKey === "qf") {
    b.sf = [
      makeMatch(b.qf[0].winner, b.qf[1].winner),
      makeMatch(b.qf[2].winner, b.qf[3].winner),
    ];
    G.koRound = b.sf; G.koName = "SEMIFINÁLE"; G.koTargetKey = "sf";
  } else if (G.koTargetKey === "sf") {
    b.final = makeMatch(b.sf[0].winner, b.sf[1].winner);
    G.koRound = [b.final]; G.koName = "FINÁLE"; G.koTargetKey = "final";
  } else if (G.koTargetKey === "final") {
    b.champion = b.final.winner;
    G.koRound = [];
  }
  // pokud uživatel v dalším kole není (vypadl), dosimuluj zbytek
  const userStillIn = b.champion ? false :
    G.koRound.some(m => m.a === G.userTeam || m.b === G.userTeam);
  if (!b.champion && !userStillIn) {
    finishKnockoutSimulated();
    const lost = G.userTeam !== b.champion;
    renderBracket(lost ? `${G.userTeam.name} vypadlo. Turnaj dohrán bez tebe.` : "", !b.champion);
  } else {
    renderBracket();
  }
  showScreen("hub");
}

function makeMatch(a, b) { return { a, b, winner: null, score: null }; }

/* dosimuluje zbývající kola pavouka až do vítěze */
function finishKnockoutSimulated() {
  const b = G.bracket;
  const simRound = (round) => round.forEach(m => {
    if (m.winner) return;
    const r = simulateKnockout(m.a, m.b);
    m.score = { ga: r.ga, gb: r.gb, pens: r.pens };
    m.winner = r.winner;
  });
  simRound(b.qf);
  if (!b.sf.length) b.sf = [makeMatch(b.qf[0].winner, b.qf[1].winner), makeMatch(b.qf[2].winner, b.qf[3].winner)];
  simRound(b.sf);
  if (!b.final) b.final = makeMatch(b.sf[0].winner, b.sf[1].winner);
  simRound([b.final]);
  b.champion = b.final.winner;
}

/* ==========================================================
   ZÁPAS — engine
   ========================================================== */
const canvas = $("game");
const ctx = canvas.getContext("2d");
const VIEW_W = canvas.width, VIEW_H = canvas.height;

// rozměry hřiště (svět)
const W = 1080, H = 700;
const R_BALL = 8, R_PLAYER = 13;
const GOAL_H = 150;
const GOAL_Y0 = H / 2 - GOAL_H / 2, GOAL_Y1 = H / 2 + GOAL_H / 2;
const MATCH_SECONDS = 180; // 3 minuty = jeden poločas

let match = null;
let rafId = null;
let lastTs = 0;

const keys = {};
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  handleActionKey(e.key.toLowerCase());
});
window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

function startMatch(opp, isKO, onDone) {
  G.pendingMatch = { opp, isKO };
  G.onMatchDone = onDone;
  match = createMatch(G.userTeam, opp, isKO);
  $("matchOverlay").classList.add("hidden");
  showScreen("matchWrap");
  lastTs = performance.now();
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function createMatch(userTeam, oppTeam, isKO) {
  const m = {
    user: userTeam, opp: oppTeam, isKO,
    scoreU: 0, scoreO: 0,
    time: 0, phase: "kickoff", // kickoff|play|goal|end|pen
    msg: "VÝKOP!", msgTimer: 1.4,
    ball: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
    players: [],
    owner: null, lastKicker: null, lastKickerCD: 0, kickCD: 0,
    cam: { x: W / 2, y: H / 2, z: 1.7 },
    pen: null,
  };
  // vytvoř hráče: user útočí doprava, opp doleva
  m.players = [
    ...spawnTeam(userTeam, "user", false),
    ...spawnTeam(oppTeam, "opp", true),
  ];
  placeFormation(m, "all");
  m.ball.x = W / 2; m.ball.y = H / 2;
  return m;
}

const FORMATION = [
  { pos: "GK",  fx: 0.05, fy: 0.5 },
  { pos: "DEF", fx: 0.20, fy: 0.20 },
  { pos: "DEF", fx: 0.20, fy: 0.40 },
  { pos: "DEF", fx: 0.20, fy: 0.60 },
  { pos: "DEF", fx: 0.20, fy: 0.80 },
  { pos: "MID", fx: 0.42, fy: 0.30 },
  { pos: "MID", fx: 0.42, fy: 0.50 },
  { pos: "MID", fx: 0.42, fy: 0.70 },
  { pos: "FWD", fx: 0.64, fy: 0.28 },
  { pos: "FWD", fx: 0.64, fy: 0.52 },
  { pos: "FWD", fx: 0.64, fy: 0.75 },
];

function spawnTeam(team, side, mirror) {
  return team.players.map((p, i) => {
    const f = FORMATION[i];
    // pro 'opp' (mirror) útočí doleva → zrcadlíme x
    const fx = mirror ? 1 - f.fx : f.fx;
    return {
      ref: p, team: side, role: f.pos, num: p.num,
      homeFx: fx, homeFy: f.fy,
      x: fx * W, y: f.fy * H, vx: 0, vy: 0,
      fdir: mirror ? -1 : 1, // směr útoku v ose x
      color: side === "user" ? team.c1 : team.c2 === team.c1 ? "#ffffff" : team.c2,
      jersey: team.c1, jersey2: team.c2,
      isGK: f.pos === "GK",
    };
  });
}

function placeFormation(m, who) {
  m.players.forEach(p => {
    if (who !== "all" && p.team !== who) return;
    p.x = p.homeFx * W; p.y = p.homeFy * H; p.vx = p.vy = 0;
  });
}

/* ------- směr útoku: user → +x (pravá branka), opp → -x (levá) ------- */
function attackGoalX(side) { return side === "user" ? W : 0; }
function ownGoalX(side) { return side === "user" ? 0 : W; }

/* ==========================================================
   HERNÍ SMYČKA
   ========================================================== */
function loop(ts) {
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05; // clamp
  if (match.phase === "pen") {
    updatePen(dt);
    drawPen();
  } else {
    update(dt);
    draw();
  }
  // smyčku ukonči, jakmile je zápas u konce (čeká se na tlačítko v overlayi)
  if (match && match.phase !== "end") rafId = requestAnimationFrame(loop);
  else rafId = null;
}

function update(dt) {
  const m = match;
  if (m.phase === "end") return;

  if (m.phase === "kickoff" || m.phase === "goal") {
    m.msgTimer -= dt;
    if (m.msgTimer <= 0) { m.phase = "play"; m.msg = ""; }
    // během hlášky se nehýbe
    updateCamera(dt);
    return;
  }

  // čas
  m.time += dt;
  if (m.time >= MATCH_SECONDS) { endRegulation(); return; }

  // timery doteku
  if (m.kickCD > 0) m.kickCD -= dt;
  if (m.lastKickerCD > 0) m.lastKickerCD -= dt;

  // aktivní hráč uživatele
  m.active = pickActive(m);

  handleHumanMovement(dt);
  updateAI(dt);
  updateBall(dt);
  resolvePossession();
  checkGoals();
  updateCamera(dt);
}

function pickActive(m) {
  // pokud uživatel drží míč → ten hráč; jinak nejbližší k míči
  if (m.owner && m.owner.team === "user") return m.owner;
  let best = null, bd = Infinity;
  for (const p of m.players) {
    if (p.team !== "user") continue;
    const d = dist2(p, m.ball);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

/* ------- pohyb lidského hráče ------- */
function handleHumanMovement(dt) {
  const m = match, a = m.active;
  if (!a) return;
  const SPD = 195;
  let dx = 0, dy = 0;
  if (keys["arrowleft"]) dx -= 1;
  if (keys["arrowright"]) dx += 1;
  if (keys["arrowup"]) dy -= 1;
  if (keys["arrowdown"]) dy += 1;
  if (dx || dy) {
    const l = Math.hypot(dx, dy);
    dx /= l; dy /= l;
    a.x += dx * SPD * dt;
    a.y += dy * SPD * dt;
    a.fx = dx; a.fy = dy; // facing
  } else {
    a.fx = a.fdir; a.fy = 0;
  }
  clampToField(a);
}

/* ------- akční klávesy (hrana stisku) ------- */
function handleActionKey(k) {
  if (!match) return;
  if (match.phase === "pen") { handlePenKey(k); return; }
  if (match.phase !== "play") return;
  const m = match, a = m.active;
  if (!a) return;
  const hasBall = m.owner === a;

  if (k === "i" && hasBall) doPass(a);
  if (k === "l" && hasBall) doShoot(a);
}

function doPass(a) {
  const m = match;
  // najdi spoluhráče nejblíž ve směru útoku
  let best = null, bs = -Infinity;
  for (const p of m.players) {
    if (p.team !== "user" || p === a) continue;
    const dx = p.x - a.x, dy = p.y - a.y;
    const d = Math.hypot(dx, dy) + 1;
    const fdir = a.fdir;
    // skóre: preferuj hráče vpředu a blízko
    const forward = (dx * fdir) / d;
    const score = forward * 1.5 - d / 600;
    if (d < 420 && score > bs) { bs = score; best = p; }
  }
  if (!best) { doShoot(a); return; }
  const dx = best.x - a.x, dy = best.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  kickBall(a, dx / l, dy / l, 430);
}

function doShoot(a) {
  const m = match;
  const gx = attackGoalX(a.team);
  const gy = H / 2 + (Math.random() - 0.5) * (GOAL_H - 20);
  let dx = gx - a.x, dy = gy - a.y;
  const l = Math.hypot(dx, dy) || 1;
  // přimíchej trochu mířidla podle facing
  dx = dx / l; dy = dy / l;
  kickBall(a, dx, dy, 600);
}

function kickBall(p, dx, dy, speed) {
  const m = match;
  m.ball.vx = dx * speed;
  m.ball.vy = dy * speed;
  m.owner = null;
  m.lastKicker = p;
  m.lastKickerCD = 0.45;
  m.kickCD = 0.12;
}

/* ------- AI všech ne-lidských hráčů ------- */
function updateAI(dt) {
  const m = match;
  // urči chasera (nejbližší k míči) pro každý tým
  const chaser = { user: null, opp: null };
  const bd = { user: Infinity, opp: Infinity };
  for (const p of m.players) {
    const d = dist2(p, m.ball);
    if (d < bd[p.team]) { bd[p.team] = d; chaser[p.team] = p; }
  }

  for (const p of m.players) {
    if (p === m.active) continue; // lidský hráč
    if (p.isGK) { aiGoalkeeper(p, dt); continue; }

    if (m.owner === p) {
      aiWithBall(p, dt);
    } else if (p === chaser[p.team] && (!m.owner || m.owner.team !== p.team)) {
      // jdi po míči
      moveToward(p, m.ball.x, m.ball.y, p.team === "opp" ? 175 : 170, dt);
    } else {
      // drž formaci, posunutou podle míče
      aiFormation(p, dt);
    }
    clampToField(p);
  }
}

function aiWithBall(p, dt) {
  const m = match;
  const gx = attackGoalX(p.team);
  const distGoal = Math.abs(gx - p.x);
  // střela?
  if (distGoal < 260 && Math.random() < 0.045) {
    const gy = H / 2 + (Math.random() - 0.5) * GOAL_H;
    let dx = gx - p.x, dy = gy - p.y; const l = Math.hypot(dx, dy) || 1;
    kickBall(p, dx / l, dy / l, 560);
    return;
  }
  // přihrávka pod tlakem
  const pressure = nearestOpponentDist(p) < 60;
  if (pressure && Math.random() < 0.06) {
    const mate = bestMate(p);
    if (mate) {
      let dx = mate.x - p.x, dy = mate.y - p.y; const l = Math.hypot(dx, dy) || 1;
      kickBall(p, dx / l, dy / l, 420);
      return;
    }
  }
  // dribluj k brance s mírným vyhýbáním
  let ty = p.y + (H / 2 - p.y) * 0.02 + (Math.random() - 0.5) * 30;
  moveToward(p, gx, ty, 150, dt);
}

function aiFormation(p, dt) {
  const m = match;
  // posun formace ve směru míče
  const homeX = p.homeFx * W, homeY = p.homeFy * H;
  const shiftX = (m.ball.x - W / 2) * 0.25;
  const shiftY = (m.ball.y - H / 2) * 0.25;
  moveToward(p, homeX + shiftX, homeY + shiftY, 130, dt);
}

function aiGoalkeeper(p, dt) {
  const m = match;
  const gx = ownGoalX(p.team);
  const lineX = gx === 0 ? 40 : W - 40;
  let ty = Math.max(GOAL_Y0 + 5, Math.min(GOAL_Y1 - 5, m.ball.y));
  // vyběh, pokud je míč blízko a volný
  const close = Math.abs(m.ball.x - lineX) < 150 && (!m.owner || m.owner.team !== p.team);
  const tx = close ? Math.min(Math.max(m.ball.x, gx === 0 ? 30 : W - 160), gx === 0 ? 150 : W - 30) : lineX;
  moveToward(p, tx, ty, close ? 200 : 150, dt);
  clampToField(p);
}

function bestMate(p) {
  const m = match; let best = null, bs = -Infinity;
  for (const q of m.players) {
    if (q.team !== p.team || q === p || q.isGK) continue;
    const dx = q.x - p.x; const fwd = dx * p.fdir;
    const d = Math.hypot(q.x - p.x, q.y - p.y) + 1;
    const score = fwd / d - d / 800;
    if (d < 380 && score > bs) { bs = score; best = q; }
  }
  return best;
}

function nearestOpponentDist(p) {
  const m = match; let bd = Infinity;
  for (const q of m.players) {
    if (q.team === p.team) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bd) bd = d;
  }
  return bd;
}

function moveToward(p, tx, ty, spd, dt) {
  const dx = tx - p.x, dy = ty - p.y;
  const l = Math.hypot(dx, dy);
  if (l < 2) return;
  p.x += (dx / l) * spd * dt;
  p.y += (dy / l) * spd * dt;
  p.fx = dx / l; p.fy = dy / l;
}

/* ------- míč ------- */
function updateBall(dt) {
  const m = match, b = m.ball;
  if (m.owner) {
    const o = m.owner;
    const fx = o.fx || o.fdir, fy = o.fy || 0;
    const tx = o.x + fx * 18, ty = o.y + fy * 18;
    b.x += (tx - b.x) * Math.min(1, dt * 14);
    b.y += (ty - b.y) * Math.min(1, dt * 14);
    b.vx = b.vy = 0;
    return;
  }
  b.x += b.vx * dt; b.y += b.vy * dt;
  const fr = Math.pow(0.18, dt);
  b.vx *= fr; b.vy *= fr;
  if (Math.abs(b.vx) < 3) b.vx = 0;
  if (Math.abs(b.vy) < 3) b.vy = 0;
  // odraz horní/dolní mantinel
  if (b.y < R_BALL) { b.y = R_BALL; b.vy *= -0.55; }
  if (b.y > H - R_BALL) { b.y = H - R_BALL; b.vy *= -0.55; }
}

function resolvePossession() {
  const m = match;
  if (m.kickCD > 0) { m.owner = null; return; }
  let best = null, bd = 26 * 26; // dist2 vrací druhou mocninu vzdálenosti
  for (const p of m.players) {
    if (p === m.lastKicker && m.lastKickerCD > 0) continue;
    const d = dist2(p, m.ball);
    if (d < bd) { bd = d; best = p; }
  }
  m.owner = best;
}

function checkGoals() {
  const m = match, b = m.ball;
  const inMouth = b.y > GOAL_Y0 && b.y < GOAL_Y1;
  // levá branka (user brání) → gól pro opp
  if (b.x <= R_BALL + 2) {
    if (inMouth) { onGoal("opp"); return; }
    b.x = R_BALL + 2; b.vx *= -0.5;
  }
  // pravá branka (opp brání) → gól pro user
  if (b.x >= W - R_BALL - 2) {
    if (inMouth) { onGoal("user"); return; }
    b.x = W - R_BALL - 2; b.vx *= -0.5;
  }
}

function onGoal(scorer) {
  const m = match;
  if (scorer === "user") m.scoreU++; else m.scoreO++;
  m.phase = "goal";
  m.msg = scorer === "user" ? "GÓÓÓL! 🎉" : "Gól soupeře…";
  m.msgTimer = 1.6;
  m.owner = null; m.lastKicker = null;
  m.ball.vx = m.ball.vy = 0;
  placeFormation(m, "all");
  m.ball.x = W / 2; m.ball.y = H / 2;
}

function updateCamera(dt) {
  const m = match, c = m.cam;
  const tx = m.ball.x, ty = m.ball.y;
  c.x += (tx - c.x) * Math.min(1, dt * 4);
  c.y += (ty - c.y) * Math.min(1, dt * 4);
  // clamp aby kamera nevyjela mimo hřiště
  const halfW = VIEW_W / (2 * c.z), halfH = VIEW_H / (2 * c.z);
  c.x = Math.max(halfW, Math.min(W - halfW, c.x));
  c.y = Math.max(halfH, Math.min(H - halfH, c.y));
}

/* ------- konec poločasu ------- */
function endRegulation() {
  const m = match;
  if (m.scoreU === m.scoreO && m.isKO) {
    startPenalties();
  } else {
    endMatch();
  }
}

function endMatch() {
  const m = match;
  m.phase = "end";
  const res = { ga: m.scoreU, gb: m.scoreO, pens: m.penResult || null };
  let txt = `KONEC ZÁPASU\n${m.user.name} ${m.scoreU} : ${m.scoreO} ${m.opp.name}`;
  if (m.penResult) txt += `\n<small>Penalty ${m.penResult[0]} : ${m.penResult[1]}</small>`;
  showMatchOverlay(txt, "POKRAČOVAT", () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    const cb = G.onMatchDone;
    G.onMatchDone = null;
    if (cb) cb(res);
  });
}

function showMatchOverlay(text, btn, onClick) {
  $("moText").innerHTML = text;
  const b = $("moBtn");
  b.textContent = btn;
  b.onclick = onClick;
  $("matchOverlay").classList.remove("hidden");
}

/* ==========================================================
   PENALTY
   ========================================================== */
function startPenalties() {
  const m = match;
  m.phase = "pen";
  m.pen = {
    round: 0, max: 5,
    userScore: 0, oppScore: 0,
    userShots: [], oppShots: [],
    turn: "user",         // kdo kope
    state: "aim",         // aim | keeperPick | reveal
    aim: 0, aimDir: 1,    // pozice mířidla 0..1
    keeperZone: 1,        // dive zóna 0/1/2
    revealTimer: 0,
    result: null,         // 'goal' | 'save'
    msg: "Tvoje penalta — namiř (L = vystřel)",
  };
}

function handlePenKey(k) {
  const p = match.pen;
  if (!p) return;
  if (p.turn === "user" && p.state === "aim") {
    if (k === "l") {
      // zóna podle aim: 0..0.33 levá, .. pravá
      const zone = p.aim < 0.34 ? 0 : p.aim < 0.67 ? 1 : 2;
      p.userZone = zone;
      p.keeperZone = Math.floor(Math.random() * 3);
      p.result = (zone !== p.keeperZone) ? "goal" : (Math.random() < 0.25 ? "goal" : "save");
      p.state = "reveal"; p.revealTimer = 1.5;
      if (p.result === "goal") { p.userScore++; p.msg = "GÓL! 🎉"; }
      else p.msg = "Chycenoo! 🧤";
      p.userShots.push(p.result === "goal");
    }
  } else if (p.turn === "opp" && p.state === "keeperPick") {
    let zone = null;
    if (k === "arrowleft") zone = 0;
    if (k === "arrowup") zone = 1;
    if (k === "arrowright") zone = 2;
    if (zone !== null) {
      p.keeperZone = zone;
      const shotZone = Math.floor(Math.random() * 3);
      p.oppZone = shotZone;
      // gól pokud brankář (ty) chytil špatnou zónu
      const saved = (zone === shotZone) && (Math.random() < 0.85);
      p.result = saved ? "save" : "goal";
      p.state = "reveal"; p.revealTimer = 1.5;
      if (p.result === "goal") { p.oppScore++; p.msg = "Soupeř dal gól…"; }
      else p.msg = "CHYTILS TO! 🧤🎉";
      p.oppShots.push(p.result === "goal");
    }
  }
}

function updatePen(dt) {
  const p = match.pen;
  if (p.state === "aim") {
    p.aim += p.aimDir * dt * 0.9;
    if (p.aim > 1) { p.aim = 1; p.aimDir = -1; }
    if (p.aim < 0) { p.aim = 0; p.aimDir = 1; }
  } else if (p.state === "keeperPick") {
    // čekání na vstup brankáře (ty) – nic
  } else if (p.state === "reveal") {
    p.revealTimer -= dt;
    if (p.revealTimer <= 0) nextPenKick();
  }
}

function nextPenKick() {
  const p = match.pen;
  // přepni kopajícího
  if (p.turn === "user") {
    p.turn = "opp"; p.state = "keeperPick";
    p.msg = "Soupeř kope — chyť! (← prostřed ↑ vpravo →)";
    p.result = null;
  } else {
    p.turn = "user"; p.state = "aim";
    p.round++;
    p.aim = 0; p.aimDir = 1; p.result = null;
    p.msg = "Tvoje penalta — namiř (L = vystřel)";
  }
  // vyhodnoť konec
  if (checkPenEnd()) return;
}

function checkPenEnd() {
  const p = match.pen;
  const ku = p.userShots.length, ko = p.oppShots.length;
  const remainU = Math.max(0, p.max - ku);
  const remainO = Math.max(0, p.max - ko);
  // předčasné rozhodnutí v základních 5
  if (ku <= p.max && ko <= p.max) {
    if (p.userScore > p.oppScore + remainO) return finishPen();
    if (p.oppScore > p.userScore + remainU) return finishPen();
  }
  // po 5 kolech
  if (ku >= p.max && ko >= p.max && p.userScore !== p.oppScore) return finishPen();
  // náhlá smrt: po stejném počtu kop nad 5 a rozdílu
  if (ku > p.max && ku === ko && p.userScore !== p.oppScore) return finishPen();
  return false;
}

function finishPen() {
  const p = match.pen;
  match.penResult = [p.userScore, p.oppScore];
  // přepiš skóre tak, aby endMatch dal správného vítěze přes pens
  match.phase = "play"; // dovol endMatch
  endMatch();
  return true;
}

/* ==========================================================
   VYKRESLENÍ ZÁPASU
   ========================================================== */
function worldToScreen(m, x, y) {
  const c = m.cam;
  return {
    x: (x - c.x) * c.z + VIEW_W / 2,
    y: (y - c.y) * c.z + VIEW_H / 2,
  };
}

function draw() {
  const m = match;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawField(m);
  // míč stín + entity
  drawBall(m);
  // hráči seřazení podle y (kvůli mírnému 3D)
  const sorted = m.players.slice().sort((a, b) => a.y - b.y);
  for (const p of sorted) drawPlayer(m, p);
  drawHUD(m);
  if (m.phase === "kickoff" || m.phase === "goal") drawBigMsg(m.msg);
}

function drawField(m) {
  const c = m.cam, z = c.z;
  const ox = VIEW_W / 2 - c.x * z, oy = VIEW_H / 2 - c.y * z;
  // tráva s pruhy
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i % 2 ? "#1e8c3e" : "#1b7f37";
    const sx = ox + (i * (W / 14)) * z;
    ctx.fillRect(sx, oy, (W / 14) * z + 1, H * z);
  }
  ctx.strokeStyle = "rgba(255,255,255,.85)";
  ctx.lineWidth = 3 * z;
  // hranice
  strokeRectW(ox, oy, W * z, H * z);
  // půlící čára
  line(ox + (W / 2) * z, oy, ox + (W / 2) * z, oy + H * z);
  // střední kruh
  ctx.beginPath();
  ctx.arc(ox + (W / 2) * z, oy + (H / 2) * z, 70 * z, 0, Math.PI * 2);
  ctx.stroke();
  // pokutová území + branky
  drawBox(ox, oy, z, true);
  drawBox(ox, oy, z, false);
}

function drawBox(ox, oy, z, left) {
  const boxW = 160, boxH = 320;
  const x = left ? ox : ox + (W - boxW) * z;
  const y = oy + (H / 2 - boxH / 2) * z;
  strokeRectW(x, y, boxW * z, boxH * z);
  // branka
  const gy = oy + GOAL_Y0 * z;
  ctx.fillStyle = "rgba(255,255,255,.18)";
  if (left) ctx.fillRect(ox - 14 * z, gy, 14 * z, GOAL_H * z);
  else ctx.fillRect(ox + W * z, gy, 14 * z, GOAL_H * z);
  ctx.strokeStyle = "#fff";
  if (left) strokeRectW(ox - 14 * z, gy, 14 * z, GOAL_H * z);
  else strokeRectW(ox + W * z, gy, 14 * z, GOAL_H * z);
}

function strokeRectW(x, y, w, h) { ctx.strokeRect(x, y, w, h); }
function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

function drawBall(m) {
  const s = worldToScreen(m, m.ball.x, m.ball.y);
  const z = m.cam.z;
  // stín
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 5 * z, R_BALL * z, R_BALL * 0.6 * z, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(s.x, s.y, R_BALL * z, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#222"; ctx.lineWidth = 1.5 * z; ctx.stroke();
  // pentagon flek
  ctx.fillStyle = "#222";
  ctx.beginPath(); ctx.arc(s.x, s.y, R_BALL * 0.4 * z, 0, Math.PI * 2); ctx.fill();
}

function drawPlayer(m, p) {
  const s = worldToScreen(m, p.x, p.y);
  const z = m.cam.z;
  const r = R_PLAYER * z;
  // stín (mírné nadhledové 3D)
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath(); ctx.ellipse(s.x, s.y + r * 0.7, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();

  // tělo / dres
  ctx.fillStyle = p.jersey;
  ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 2 * z;
  ctx.strokeStyle = p.team === "user" ? "#0a2540" : "#3a0a0a";
  ctx.stroke();

  // hlava s vadou (malá verze) navrchu
  drawFace(ctx, s.x, s.y - r * 0.2, r * 0.78, p.ref);

  // číslo
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${10 * z}px sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 2.5 * z;
  ctx.strokeText(p.num, s.x, s.y + r * 1.25);
  ctx.fillText(p.num, s.x, s.y + r * 1.25);

  // indikátor aktivního lidského hráče
  if (p === m.active && p.team === "user") {
    ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 3 * z;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - r * 2.0);
    ctx.lineTo(s.x - 6 * z, s.y - r * 2.7);
    ctx.lineTo(s.x + 6 * z, s.y - r * 2.7);
    ctx.closePath();
    ctx.fillStyle = "#ffd23f"; ctx.fill();
  }
}

function drawHUD(m) {
  // panel vlevo nahoře: stav + minuty
  const minute = Math.min(90, Math.floor(m.time / MATCH_SECONDS * 90));
  ctx.fillStyle = "rgba(6,12,25,.78)";
  roundRect(12, 12, 250, 54, 10); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.font = "bold 20px Trebuchet MS, sans-serif";
  ctx.fillText(`${m.user.short} ${m.scoreU} : ${m.scoreO} ${m.opp.short}`, 24, 32);
  ctx.font = "16px Trebuchet MS, sans-serif";
  ctx.fillStyle = "#ffd23f";
  ctx.fillText(`⏱ ${minute}'`, 24, 54);

  // nápověda vpravo dole
  ctx.fillStyle = "rgba(6,12,25,.6)";
  roundRect(VIEW_W - 226, VIEW_H - 40, 214, 28, 8); ctx.fill();
  ctx.fillStyle = "#cfe"; ctx.font = "13px sans-serif"; ctx.textAlign = "left";
  ctx.fillText("Šipky=pohyb  I=přihrávka  L=střela", VIEW_W - 218, VIEW_H - 26);
}

function drawBigMsg(msg) {
  if (!msg) return;
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillRect(0, VIEW_H / 2 - 50, VIEW_W, 100);
  ctx.fillStyle = "#ffd23f";
  ctx.font = "bold 48px Trebuchet MS, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(msg, VIEW_W / 2, VIEW_H / 2);
}

/* ------- vykreslení penaltového rozstřelu ------- */
function drawPen() {
  const m = match, p = m.pen;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  // pozadí
  const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grd.addColorStop(0, "#1e8c3e"); grd.addColorStop(1, "#13632a");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // branka
  const gW = 420, gH = 150, gx = (VIEW_W - gW) / 2, gy = 80;
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 6;
  ctx.strokeRect(gx, gy, gW, gH);
  // síť
  ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1;
  for (let i = 1; i < 14; i++) { line(gx + i * gW / 14, gy, gx + i * gW / 14, gy + gH); }
  for (let i = 1; i < 6; i++) { line(gx, gy + i * gH / 6, gx + gW, gy + i * gH / 6); }

  // zóny
  const zoneW = gW / 3;
  // brankář
  let keeperZoneX;
  if (p.state === "reveal" || p.turn === "opp") {
    const kz = p.keeperZone;
    keeperZoneX = gx + kz * zoneW + zoneW / 2;
  } else {
    keeperZoneX = gx + gW / 2; // uprostřed čeká
  }
  // míč pozice
  let ballX = VIEW_W / 2, ballY = VIEW_H - 110;
  if (p.state === "reveal") {
    const z = (p.turn === "user") ? p.userZone : p.oppZone;
    ballX = gx + z * zoneW + zoneW / 2;
    ballY = (p.result === "goal") ? gy + gH / 2 : gy + gH + 20;
  }

  // mířidlo (jen tvoje penalta ve fázi aim)
  if (p.turn === "user" && p.state === "aim") {
    const ax = gx + p.aim * gW;
    ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 4;
    line(ax, gy, ax, gy + gH);
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath(); ctx.moveTo(ax, gy - 14); ctx.lineTo(ax - 8, gy - 2); ctx.lineTo(ax + 8, gy - 2); ctx.closePath(); ctx.fill();
  }

  // brankář (obdélník + hlava)
  ctx.fillStyle = "#ff5722";
  const kw = 46, kh = 70;
  ctx.fillRect(keeperZoneX - kw / 2, gy + gH - kh, kw, kh);
  ctx.beginPath(); ctx.arc(keeperZoneX, gy + gH - kh - 12, 16, 0, Math.PI * 2); ctx.fill();

  // míč
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(ballX, ballY, 14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.stroke();

  // HUD penalt
  ctx.fillStyle = "rgba(6,12,25,.8)";
  roundRect(VIEW_W / 2 - 160, 12, 320, 50, 10); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 22px Trebuchet MS, sans-serif";
  ctx.fillText(`PENALTY  ${m.user.short} ${p.userScore} : ${p.oppScore} ${m.opp.short}`, VIEW_W / 2, 37);

  // řada teček (kola)
  drawPenDots(p);

  // zpráva
  ctx.fillStyle = "#ffd23f"; ctx.font = "bold 26px Trebuchet MS, sans-serif";
  ctx.fillText(p.msg, VIEW_W / 2, VIEW_H - 50);
}

function drawPenDots(p) {
  const drawRow = (shots, y, label) => {
    ctx.fillStyle = "#fff"; ctx.font = "13px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(label, 16, y);
    for (let i = 0; i < Math.max(5, shots.length); i++) {
      const x = 70 + i * 22;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
      if (i < shots.length) { ctx.fillStyle = shots[i] ? "#3ddc84" : "#ff3b3b"; ctx.fill(); }
      else { ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
  };
  drawRow(p.userShots, 90, match.user.short);
  drawRow(p.oppShots, 116, match.opp.short);
}

/* ------- drobné utility ------- */
function dist2(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
function clampToField(p) {
  p.x = Math.max(R_PLAYER, Math.min(W - R_PLAYER, p.x));
  p.y = Math.max(R_PLAYER, Math.min(H - R_PLAYER, p.y));
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
