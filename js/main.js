/* ==========================================================================
   VS - IDIOTSKÝ TURNAJ
   main.js  ->  obrazovky, průběh turnaje, penalty, hlavní smyčka
   ========================================================================== */

const GAME = {
  state: 'menu',
  match: null,
  penalty: null,
  tournament: null,
};

/* ---------- vstup z klávesnice ------------------------------------------- */
const INPUT = { left: false, right: false, up: false, down: false, pass: false, shoot: false };
const KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  KeyI: 'pass', KeyL: 'shoot',
};
window.addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (k === 'pass' || k === 'shoot') {
    if (!INPUT[k + '_held']) INPUT[k] = true; // edge
    INPUT[k + '_held'] = true;
  } else INPUT[k] = true;
});
window.addEventListener('keyup', e => {
  const k = KEYMAP[e.code];
  if (!k) return;
  if (k === 'pass' || k === 'shoot') INPUT[k + '_held'] = false;
  else INPUT[k] = false;
});

/* ---------- DOM helpers --------------------------------------------------- */
const $ = sel => document.querySelector(sel);
const screens = {};
function showScreen(name) {
  for (const s in screens) screens[s].style.display = (s === name) ? 'flex' : 'none';
  $('#game').style.display = (name === 'canvas') ? 'block' : 'none';
}
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/* ==========================================================================
   INIT obrazovek
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  screens.menu = $('#screen-menu');
  screens.select = $('#screen-select');
  screens.squad = $('#screen-squad');
  screens.info = $('#screen-info');
  buildMenu();
  resizeCanvas();
  showScreen('menu');
  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(loop);
});

const canvas = () => $('#game');
function resizeCanvas() {
  const c = canvas();
  const maxW = Math.min(window.innerWidth - 20, 1000);
  const maxH = Math.min(window.innerHeight - 20, 640);
  c.width = maxW; c.height = maxH;
}

/* ---------- MENU ---------------------------------------------------------- */
function buildMenu() {
  const m = screens.menu;
  m.innerHTML = '';
  const logo = el('div', 'logo', `<span class="vs">VS</span>`);
  const sub = el('div', 'subtitle', 'IDIOTSKÝ&nbsp;TURNAJ');
  const playBtn = el('button', 'big-btn', '▶ HRÁT IDIOT TURNAJ');
  playBtn.onclick = () => showSelect();
  const hint = el('div', 'menu-hint',
    'Vyber zemi → vylosuje se skupina → projdi skupinu, čtvrtfinále, semifinále a finále.<br>' +
    'Ovládání: <b>šipky</b> pohyb · <b>I</b> přihrávka · <b>L</b> střela / penalta');
  m.append(logo, sub, playBtn, hint);
}

/* ---------- VÝBĚR ZEMĚ ---------------------------------------------------- */
function showSelect() {
  const s = screens.select;
  s.innerHTML = '';
  s.append(el('h2', 'screen-title', 'ZA KOHO BUDEŠ HRÁT?'));
  const grid = el('div', 'country-grid');
  for (const c of COUNTRIES) {
    const card = el('button', 'country-card');
    card.innerHTML = `<span class="cflag">${c.flag}</span><span class="cname">${c.name}</span>`;
    card.style.borderColor = c.shirt;
    const swatch = el('span', 'swatch');
    swatch.style.background = c.shirt;
    card.appendChild(swatch);
    card.onclick = () => showSquad(c.name);
    grid.appendChild(card);
  }
  s.append(grid);
  const back = el('button', 'back-btn', '← Zpět do menu');
  back.onclick = () => showScreen('menu');
  s.append(back);
  showScreen('select');
}

/* ---------- SESTAVA (potvrzení) ------------------------------------------ */
function showSquad(countryName) {
  const c = countryByName(countryName);
  const squad = getSquad(countryName);
  const s = screens.squad;
  s.innerHTML = '';
  s.append(el('h2', 'screen-title', `${c.flag} ${countryName} — bláznivá sestava`));
  const grid = el('div', 'squad-grid');
  for (const p of squad) {
    const card = el('div', 'pl-card');
    const cv = document.createElement('canvas');
    cv.width = 86; cv.height = 110; cv.className = 'pl-canvas';
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 86, 110);
    drawPlayerAvatar(ctx, 43, 96, 2.0, p.look,
      p.pos === 'GK' ? { shirt: c.gk, shorts: c.shorts } : { shirt: c.shirt, shorts: c.shorts },
      { number: p.number });
    card.appendChild(cv);
    card.append(el('div', 'pl-name', `${p.number}. ${p.name}`));
    card.append(el('div', 'pl-pos', p.pos + ' · ' + p.rating));
    card.append(el('div', 'pl-defect', '⚠ ' + p.look.defectLabel));
    grid.appendChild(card);
  }
  s.append(grid);
  const row = el('div', 'btn-row');
  const back = el('button', 'back-btn', '← Jiná země');
  back.onclick = () => showSelect();
  const go = el('button', 'big-btn small', '✔ HRÁT ZA ' + countryName);
  go.onclick = () => startTournament(countryName);
  row.append(back, go);
  s.append(row);
  showScreen('squad');
}

/* ==========================================================================
   TURNAJ
   ========================================================================== */
function shuffle(arr, rnd) {
  rnd = rnd || Math.random;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startTournament(playerCountry) {
  // losování 16 zemí do 4 skupin po 4
  const pool = shuffle(COUNTRIES.map(c => c.name));
  const groups = { A: [], B: [], C: [], D: [] };
  const keys = ['A', 'B', 'C', 'D'];
  pool.forEach((name, i) => groups[keys[i % 4]].push(name));
  // najdi skupinu hráče
  let pg = 'A';
  for (const k of keys) if (groups[k].includes(playerCountry)) pg = k;
  const opponents = groups[pg].filter(n => n !== playerCountry);

  GAME.tournament = {
    player: playerCountry,
    groups,
    playerGroup: pg,
    groupOpponents: opponents,
    groupMatchIdx: 0,
    groupResults: [],   // výsledky hráčových zápasů
    standings: null,
    stage: 'g1',
    bracket: null,
    pqf: null,
    eliminated: false,
    champion: null,
  };
  showGroupDrawScreen();
}

function showGroupDrawScreen() {
  const t = GAME.tournament;
  const body = el('div', 'info-body');
  body.append(el('h2', 'screen-title', '🎲 LOSOVÁNÍ SKUPIN'));
  const wrap = el('div', 'groups-wrap');
  for (const k of ['A', 'B', 'C', 'D']) {
    const g = el('div', 'group-box');
    g.append(el('div', 'group-title', 'SKUPINA ' + k));
    for (const n of t.groups[k]) {
      const c = countryByName(n);
      const row = el('div', 'group-row' + (n === t.player ? ' me' : ''),
        `${c.flag} ${n}` + (n === t.player ? ' <b>(TY)</b>' : ''));
      g.append(row);
    }
    wrap.append(g);
  }
  body.append(wrap);
  body.append(el('p', 'info-note',
    `Jsi ve skupině <b>${t.playerGroup}</b>. První soupeř: <b>${t.groupOpponents[0]}</b>.`));
  infoScreen(body, 'PRVNÍ ZÁPAS ▶', () => playNextPlayerMatch());
}

/* ---------- spuštění dalšího hráčova zápasu ------------------------------- */
function playNextPlayerMatch() {
  const t = GAME.tournament;
  let opp, knockout = false, title = '';
  if (t.stage.startsWith('g')) {
    opp = t.groupOpponents[t.groupMatchIdx];
    title = `SKUPINA ${t.playerGroup} · ${t.groupMatchIdx + 1}. zápas`;
  } else if (t.stage === 'qf') {
    opp = knockoutOpponent('qf'); knockout = true; title = 'ČTVRTFINÁLE';
  } else if (t.stage === 'sf') {
    opp = knockoutOpponent('sf'); knockout = true; title = 'SEMIFINÁLE';
  } else if (t.stage === 'final') {
    opp = knockoutOpponent('final'); knockout = true; title = 'FINÁLE';
  }
  t.currentOpponent = opp;
  startMatch(t.player, opp, knockout, title);
}

function startMatch(homeName, awayName, knockout, title) {
  GAME.match = new Match(homeName, awayName, {
    knockout, title,
    onFinish: res => onMatchFinish(res),
  });
  showScreen('canvas');
  GAME.state = 'match';
}

function onMatchFinish(res) {
  if (res.needPenalties) {
    startPenalties(GAME.match.home.name, GAME.match.away.name);
    return;
  }
  recordPlayerResult(res.homeGoals, res.awayGoals, res.winner);
}

/* zaznamená výsledek hráčova zápasu a posune turnaj */
function recordPlayerResult(hg, ag, winner) {
  const t = GAME.tournament;
  if (t.stage.startsWith('g')) {
    t.groupResults.push({ opp: t.currentOpponent, hg, ag });
    t.groupMatchIdx++;
    if (t.groupMatchIdx < 3) {
      t.stage = 'g' + (t.groupMatchIdx + 1);
      showGroupMatchResult(hg, ag);
    } else {
      finishGroupStage();
    }
  } else {
    // pavouk
    const advanced = winner === t.player;
    showKnockoutResult(hg, ag, advanced);
  }
}

function showGroupMatchResult(hg, ag) {
  const t = GAME.tournament;
  const body = el('div', 'info-body');
  body.append(el('h2', 'screen-title', 'KONEC ZÁPASU'));
  body.append(scoreLine(t.player, hg, ag, t.currentOpponent));
  body.append(el('p', 'info-note', resultWord(hg, ag) +
    ` · Další soupeř: <b>${t.groupOpponents[t.groupMatchIdx]}</b>`));
  infoScreen(body, 'DALŠÍ ZÁPAS ▶', () => playNextPlayerMatch());
}

/* ---------- konec skupiny: simulace + tabulka ---------------------------- */
function finishGroupStage() {
  const t = GAME.tournament;
  // tabulka skupiny hráče: hráčovy 3 zápasy + 3 simulované mezi soupeři
  const teams = t.groups[t.playerGroup];
  const table = {};
  teams.forEach(n => table[n] = { name: n, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 });
  const apply = (a, b, ga, gb) => {
    const A = table[a], B = table[b];
    A.P++; B.P++; A.GF += ga; A.GA += gb; B.GF += gb; B.GA += ga;
    if (ga > gb) { A.W++; B.L++; A.Pts += 3; }
    else if (gb > ga) { B.W++; A.L++; B.Pts += 3; }
    else { A.D++; B.D++; A.Pts++; B.Pts++; }
  };
  // hráčovy zápasy
  t.groupResults.forEach(r => apply(t.player, r.opp, r.hg, r.ag));
  // zápasy mezi 3 soupeři
  const o = t.groupOpponents;
  simPairs(o).forEach(([a, b]) => { const r = simMatch(a, b, false); apply(a, b, r.a, r.b); });

  const standings = Object.values(table).sort(cmpStandings);
  t.standings = standings;
  // simuluj ostatní skupiny pro pavouka
  t.allGroupResults = {};
  for (const k of ['A', 'B', 'C', 'D']) {
    if (k === t.playerGroup) { t.allGroupResults[k] = standings; continue; }
    t.allGroupResults[k] = simGroup(t.groups[k]);
  }
  const playerPos = standings.findIndex(s => s.name === t.player); // 0-based
  t.qualified = playerPos < 2;
  buildBracket();
  showGroupTable();
}

function simPairs(arr) {
  const res = [];
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++) res.push([arr[i], arr[j]]);
  return res;
}
function simGroup(teams) {
  const table = {};
  teams.forEach(n => table[n] = { name: n, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 });
  simPairs(teams).forEach(([a, b]) => {
    const r = simMatch(a, b, false);
    const A = table[a], B = table[b];
    A.P++; B.P++; A.GF += r.a; A.GA += r.b; B.GF += r.b; B.GA += r.a;
    if (r.a > r.b) { A.W++; B.L++; A.Pts += 3; }
    else if (r.b > r.a) { B.W++; A.L++; B.Pts += 3; }
    else { A.D++; B.D++; A.Pts++; B.Pts++; }
  });
  return Object.values(table).sort(cmpStandings);
}
function cmpStandings(a, b) {
  if (b.Pts !== a.Pts) return b.Pts - a.Pts;
  if ((b.GF - b.GA) !== (a.GF - a.GA)) return (b.GF - b.GA) - (a.GF - a.GA);
  if (b.GF !== a.GF) return b.GF - a.GF;
  return Math.random() - 0.5;
}

function showGroupTable() {
  const t = GAME.tournament;
  const body = el('div', 'info-body');
  body.append(el('h2', 'screen-title', `TABULKA SKUPINY ${t.playerGroup}`));
  body.append(standingsTable(t.standings, t.player));
  if (t.qualified) {
    body.append(el('p', 'info-note ok', '✔ POSTUPUJEŠ DO ČTVRTFINÁLE!'));
    infoScreen(body, 'PAVOUK ▶', () => showBracketScreen('qf'));
  } else {
    body.append(el('p', 'info-note bad', '✘ Skončil jsi ve skupině. Konec turnaje.'));
    infoScreen(body, 'ZPĚT DO MENU', () => { showScreen('menu'); });
  }
}

/* ---------- PAVOUK -------------------------------------------------------- */
function buildBracket() {
  const t = GAME.tournament;
  const gr = t.allGroupResults;
  const w = k => gr[k][0].name, r = k => gr[k][1].name;
  // standardní párování
  t.qfPairs = [
    [w('A'), r('B')],
    [w('C'), r('D')],
    [w('B'), r('A')],
    [w('D'), r('C')],
  ];
  // najdi hráčovo QF
  t.pqf = t.qfPairs.findIndex(p => p.includes(t.player));
  if (t.pqf < 0) t.pqf = null;
  t.stage = t.qualified ? 'qf' : t.stage;
}

function knockoutOpponent(stage) {
  const t = GAME.tournament;
  if (stage === 'qf') {
    return t.qfPairs[t.pqf].find(n => n !== t.player);
  }
  if (stage === 'sf') {
    const sibling = t.pqf ^ 1;
    return simQFWinner(sibling);
  }
  if (stage === 'final') {
    const playerSF = t.pqf >> 1;       // 0 nebo 1
    const otherSF = playerSF ^ 1;
    const a = simQFWinner(otherSF * 2);
    const b = simQFWinner(otherSF * 2 + 1);
    return simMatch(a, b, true).winner;
  }
}
function simQFWinner(i) {
  const t = GAME.tournament;
  if (!t._qfCache) t._qfCache = {};
  if (t._qfCache[i]) return t._qfCache[i];
  const [a, b] = t.qfPairs[i];
  const w = simMatch(a, b, true).winner;
  t._qfCache[i] = w;
  return w;
}

function showBracketScreen(stage) {
  const t = GAME.tournament;
  const body = el('div', 'info-body');
  const stageName = { qf: 'ČTVRTFINÁLE', sf: 'SEMIFINÁLE', final: 'FINÁLE' }[stage];
  body.append(el('h2', 'screen-title', '🏆 ' + stageName));
  const opp = knockoutOpponent(stage);
  t.currentOpponent = opp;
  const c1 = countryByName(t.player), c2 = countryByName(opp);
  const vs = el('div', 'vs-box',
    `<span class="vs-team">${c1.flag}<br>${t.player}</span>` +
    `<span class="vs-mid">VS</span>` +
    `<span class="vs-team">${c2.flag}<br>${opp}</span>`);
  body.append(vs);
  body.append(el('p', 'info-note', 'Vyhraj, nebo končíš! Remíza = penalty (kop klávesou L).'));
  infoScreen(body, 'HRÁT ' + stageName + ' ▶', () => playNextPlayerMatch());
}

function showKnockoutResult(hg, ag, advanced) {
  const t = GAME.tournament;
  const body = el('div', 'info-body');
  const stageName = { qf: 'ČTVRTFINÁLE', sf: 'SEMIFINÁLE', final: 'FINÁLE' }[t.stage];
  if (advanced) {
    if (t.stage === 'final') {
      // mistr!
      body.append(el('h2', 'screen-title win', '🏆 MISTR IDIOTSKÉHO TURNAJE! 🏆'));
      body.append(scoreLine(t.player, hg, ag, t.currentOpponent));
      body.append(el('p', 'info-note ok', `${t.player} vyhrává celý IDIOTSKÝ TURNAJ! 🎉`));
      infoScreen(body, 'ZPĚT DO MENU', () => showScreen('menu'));
      fireConfetti();
      return;
    }
    body.append(el('h2', 'screen-title', 'POSTUP! ✔'));
    body.append(scoreLine(t.player, hg, ag, t.currentOpponent));
    const next = t.stage === 'qf' ? 'sf' : 'final';
    body.append(el('p', 'info-note ok', 'Postupuješ do dalšího kola!'));
    t.stage = next;
    infoScreen(body, 'DÁL ▶', () => showBracketScreen(next));
  } else {
    body.append(el('h2', 'screen-title bad', 'VYPADL JSI'));
    body.append(scoreLine(t.player, hg, ag, t.currentOpponent));
    // odhal vítěze turnaje
    const champ = simRestOfTournament();
    body.append(el('p', 'info-note', `Vypadl jsi ve fázi: <b>${stageName}</b>.<br>` +
      `Turnaj nakonec vyhrál: <b>${champ}</b>.`));
    infoScreen(body, 'ZPĚT DO MENU', () => showScreen('menu'));
  }
}

function simRestOfTournament() {
  // jen pro zobrazení vítěze, hráč už nehraje
  const t = GAME.tournament;
  const qfW = [0, 1, 2, 3].map(i => simQFWinner(i));
  const sf0 = simMatch(qfW[0], qfW[1], true).winner;
  const sf1 = simMatch(qfW[2], qfW[3], true).winner;
  return simMatch(sf0, sf1, true).winner;
}

/* ==========================================================================
   SIMULACE zápasu (CPU vs CPU)
   ========================================================================== */
function poisson(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}
function simMatch(aName, bName, knockout) {
  const a = countryByName(aName), b = countryByName(bName);
  const total = a.str + b.str;
  const shareA = a.str / total, shareB = b.str / total;
  let ga = poisson(0.55 + 2.1 * shareA);
  let gb = poisson(0.55 + 2.1 * shareB);
  let winner = null;
  if (ga > gb) winner = aName;
  else if (gb > ga) winner = bName;
  else {
    if (knockout) {
      // penalty: vážená mince
      winner = Math.random() < shareA + (Math.random() - 0.5) * 0.2 ? aName : bName;
    }
  }
  return { a: ga, b: gb, winner };
}

/* ==========================================================================
   PENALTOVÝ ROZSTŘEL (lidský zápas v pavouku skončil remízou)
   ========================================================================== */
function startPenalties(homeName, awayName) {
  GAME.penalty = new PenaltyShootout(homeName, awayName);
  GAME.state = 'penalty';
  showScreen('canvas');
}

class PenaltyShootout {
  constructor(homeName, awayName) {
    this.home = countryByName(homeName);
    this.away = countryByName(awayName);
    this.homeName = homeName; this.awayName = awayName;
    this.homeScore = 0; this.awayScore = 0;
    this.homeShots = []; this.awayShots = [];
    this.round = 0;
    this.turn = 'home';      // home = hráč kope; away = soupeř (auto)
    this.phase = 'aim';      // aim -> shoot -> result -> next -> done
    this.aim = 1;            // 0 left,1 center,2 right
    this.t = 0;
    this.msg = 'Namiř šipkami ◀ ▶ a vystřel klávesou L';
    this.ballX = 0; this.ballY = 0; this.anim = 0;
    this.gkDir = 1;
    this.done = false;
    this.lastScored = null;
  }

  update(dt) {
    if (this.done) return;
    this.t += dt;
    if (this.phase === 'aim' && this.turn === 'home') {
      if (INPUT.left) { this.aim = 0; INPUT.left = false; }
      if (INPUT.right) { this.aim = 2; INPUT.right = false; }
      if (INPUT.up || INPUT.down) { this.aim = 1; }
      if (INPUT.shoot) { INPUT.shoot = false; this.shootHuman(); }
    } else if (this.phase === 'aim' && this.turn === 'away') {
      // automatický kop soupeře po krátké prodlevě
      if (this.t > 0.8) this.shootAway();
    } else if (this.phase === 'anim') {
      this.anim += dt;
      if (this.anim > 1.1) this.resolveShot();
    } else if (this.phase === 'pause') {
      if (this.t > 1.0) this.nextKick();
    }
  }

  shootHuman() {
    this.gkDir = Math.floor(Math.random() * 3);
    // GK chytí pokud trefí stejný směr (center má menší šanci chytit)
    const saved = (this.gkDir === this.aim) && (this.aim !== 1 || Math.random() < 0.6);
    this.lastScored = !saved;
    this.phase = 'anim'; this.anim = 0;
  }
  shootAway() {
    this.aim = Math.floor(Math.random() * 3);
    this.gkDir = Math.floor(Math.random() * 3);
    const scoreChance = 0.72;
    this.lastScored = Math.random() < scoreChance;
    this.phase = 'anim'; this.anim = 0;
  }

  resolveShot() {
    if (this.turn === 'home') {
      this.homeShots.push(this.lastScored);
      if (this.lastScored) this.homeScore++;
      this.msg = this.lastScored ? 'GÓÓL!' : 'CHYTIL TO! 🧤';
    } else {
      this.awayShots.push(this.lastScored);
      if (this.lastScored) this.awayScore++;
      this.msg = this.lastScored ? 'Soupeř dal gól' : 'Tvůj gólman chytil! 🧤';
    }
    this.phase = 'pause'; this.t = 0;
    // kontrola konce
    if (this.isDecided()) { this.finish(); }
  }

  isDecided() {
    const hs = this.homeShots.length, as = this.awayShots.length;
    const remHome = Math.max(0, 5 - hs), remAway = Math.max(0, 5 - as);
    if (hs <= 5 || as <= 5) {
      if (this.homeScore > this.awayScore + remAway) return true;
      if (this.awayScore > this.homeScore + remHome) return true;
    }
    // po 5 kolech a více: rozhodne rozdíl po stejném počtu kopů
    if (hs >= 5 && as >= 5 && hs === as && this.homeScore !== this.awayScore) return true;
    return false;
  }

  nextKick() {
    if (this.turn === 'home') { this.turn = 'away'; }
    else { this.turn = 'home'; this.round++; }
    this.phase = 'aim'; this.t = 0; this.aim = 1;
    this.msg = this.turn === 'home'
      ? 'Namiř šipkami ◀ ▶ a vystřel klávesou L'
      : 'Brání tvůj gólman...';
  }

  finish() {
    this.done = true;
    const winner = this.homeScore > this.awayScore ? this.homeName : this.awayName;
    setTimeout(() => {
      recordPlayerResult(GAME.match.home.goals, GAME.match.away.goals, winner);
      // skóre zápasu zůstává remíza, vítěz z penalt
      GAME.penalty = null;
    }, 1400);
  }

  render(ctx, cw, ch) {
    ctx.fillStyle = '#0a5c1f'; ctx.fillRect(0, 0, cw, ch);
    // tráva pruhy
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#0a5c1f' : '#0c6a24';
      ctx.fillRect(0, i * ch / 10, cw, ch / 10);
    }
    const goalW = Math.min(560, cw - 120), goalH = 170;
    const gx = (cw - goalW) / 2, gy = 80;
    // branka
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
    ctx.strokeRect(gx, gy, goalW, goalH);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
    for (let x = gx; x <= gx + goalW; x += 24) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + goalH); ctx.stroke(); }
    for (let y = gy; y <= gy + goalH; y += 24) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + goalW, y); ctx.stroke(); }

    // zóny míření
    const zoneX = [gx + goalW * 0.18, gx + goalW * 0.5, gx + goalW * 0.82];
    if (this.turn === 'home' && this.phase === 'aim') {
      ctx.strokeStyle = '#ffe600'; ctx.lineWidth = 4;
      ctx.strokeRect(zoneX[this.aim] - 55, gy + goalH * 0.3, 110, 90);
    }

    // gólman
    const gkX = zoneX[this.phase === 'aim' ? 1 : this.gkDir];
    const gkColor = this.turn === 'home' ? this.away.gk : this.home.gk;
    drawPlayerAvatar(ctx, gkX, gy + goalH - 6, 2.2,
      { skin: '#e0ac69', hair: '#222', hairStyle: 1, defect: 'bigEars' },
      { shirt: gkColor, shorts: '#222' }, {});

    // míč
    let bx = cw / 2, by = ch - 90;
    if (this.phase === 'anim') {
      const target = zoneX[this.aim];
      const ty = gy + goalH * 0.55;
      bx = lerp(cw / 2, target, Math.min(1, this.anim / 0.9));
      by = lerp(ch - 90, ty, Math.min(1, this.anim / 0.9));
    }
    drawSoccerBall(ctx, bx, by, 13, (this.phase === 'anim' ? this.anim * 12 : 0));

    // kdo kope - malý avatar dole
    const shooterColor = this.turn === 'home' ? this.home.shirt : this.away.shirt;
    drawPlayerAvatar(ctx, cw / 2, ch - 30, 2.0,
      { skin: '#f1c27d', hair: '#3a2410', hairStyle: 0, defect: 'mustache' },
      { shirt: shooterColor, shorts: '#222' }, {});

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    roundRect(ctx, 14, 14, 320, 56, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.font = '20px "Segoe UI Emoji", "Noto Color Emoji", Arial';
    ctx.fillText(`${this.home.flag}  ${this.homeScore} : ${this.awayScore}  ${this.away.flag}`, 28, 40);
    ctx.font = '13px Arial';
    ctx.fillText('PENALTOVÝ ROZSTŘEL', 28, 60);
    // ukazatele kopů
    drawShotDots(ctx, this.homeShots, 28, 78, this.home.shirt);
    drawShotDots(ctx, this.awayShots, 28, 96, this.away.shirt);

    // zpráva
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center';
    ctx.fillText(this.msg, cw / 2, ch - 130);

    if (this.done) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#ffe600'; ctx.font = 'bold 40px Arial';
      const win = this.homeScore > this.awayScore ? this.homeName : this.awayName;
      ctx.fillText('Penalty rozhodly: ' + win, cw / 2, ch / 2);
    }
  }
}
function drawShotDots(ctx, shots, x, y, color) {
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(x + i * 16, y, 5, 0, Math.PI * 2); ctx.fill();
  }
  shots.forEach((s, i) => {
    ctx.fillStyle = s ? '#3ad13a' : '#d13a3a';
    ctx.beginPath(); ctx.arc(x + i * 16, y, 5, 0, Math.PI * 2); ctx.fill();
  });
}
function lerp(a, b, t) { return a + (b - a) * t; }

/* ==========================================================================
   info obrazovka (generická)
   ========================================================================== */
function infoScreen(bodyEl, btnLabel, onClick) {
  const s = screens.info;
  s.innerHTML = '';
  s.append(bodyEl);
  const btn = el('button', 'big-btn small', btnLabel);
  btn.onclick = onClick;
  s.append(btn);
  showScreen('info');
  GAME.state = 'info';
}
function scoreLine(home, hg, ag, away) {
  const c1 = countryByName(home), c2 = countryByName(away);
  return el('div', 'score-line',
    `<span>${c1.flag} ${home}</span><span class="score">${hg} : ${ag}</span><span>${away} ${c2.flag}</span>`);
}
function resultWord(hg, ag) {
  if (hg > ag) return '<b class="ok">VÝHRA · +3 body</b>';
  if (hg < ag) return '<b class="bad">PROHRA · 0 bodů</b>';
  return '<b>REMÍZA · +1 bod</b>';
}
function standingsTable(rows, me) {
  const tbl = el('table', 'stand');
  tbl.innerHTML = '<tr><th>#</th><th>Tým</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>Skóre</th><th>B</th></tr>';
  rows.forEach((r, i) => {
    const tr = el('tr', (i < 2 ? 'adv ' : '') + (r.name === me ? 'me' : ''));
    tr.innerHTML = `<td>${i + 1}</td><td>${countryByName(r.name).flag} ${r.name}</td>` +
      `<td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td>` +
      `<td>${r.GF}:${r.GA}</td><td><b>${r.Pts}</b></td>`;
    tbl.append(tr);
  });
  return tbl;
}

/* ==========================================================================
   HLAVNÍ SMYČKA
   ========================================================================== */
let lastT = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0);
  lastT = ts;
  const c = canvas();
  if (GAME.state === 'match' && GAME.match) {
    const inp = {
      left: INPUT.left, right: INPUT.right, up: INPUT.up, down: INPUT.down,
      pass: INPUT.pass, shoot: INPUT.shoot,
    };
    GAME.match.update(dt, inp);
    INPUT.pass = false; INPUT.shoot = false;
    if (GAME.match.finished) { /* onFinish přepne stav */ }
    else GAME.match.render(c.getContext('2d'), c.width, c.height);
  } else if (GAME.state === 'penalty' && GAME.penalty) {
    GAME.penalty.update(dt);
    GAME.penalty.render(c.getContext('2d'), c.width, c.height);
  }
  requestAnimationFrame(loop);
}

/* ---------- konfety ------------------------------------------------------- */
function fireConfetti() {
  const wrap = el('div', 'confetti');
  for (let i = 0; i < 80; i++) {
    const p = el('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = `hsl(${Math.random() * 360},90%,55%)`;
    p.style.animationDelay = (Math.random() * 2) + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    wrap.append(p);
  }
  document.body.append(wrap);
  setTimeout(() => wrap.remove(), 6000);
}
