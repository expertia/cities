/* ===========================================================================
   main.js — řízení obrazovek, výběr země, soupiska, průběh turnaje
   ===========================================================================*/

let tournament = null;
let currentMatch = null;
let selectedCountry = null;

const screens = {};
["menu", "select", "roster", "tournament", "match", "result", "end"].forEach((s) => {
  screens[s] = document.getElementById("screen-" + s);
});

function show(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
  window.scrollTo(0, 0);
}

// ---------- MENU ----------
document.getElementById("btn-play").addEventListener("click", () => {
  buildCountrySelect();
  show("select");
});

// ---------- VÝBĚR ZEMĚ ----------
function flagDataURL(c) {
  // jednoduchá "vlajka" = dva pruhy z barev dresu/trenýrek
  const cv = document.createElement("canvas");
  cv.width = 120; cv.height = 70;
  const x = cv.getContext("2d");
  x.fillStyle = c.shirt; x.fillRect(0, 0, 120, 35);
  x.fillStyle = c.shorts; x.fillRect(0, 35, 120, 35);
  x.fillStyle = c.skin; x.fillRect(48, 18, 24, 34);
  x.strokeStyle = "rgba(0,0,0,.3)"; x.strokeRect(0, 0, 120, 70);
  return cv.toDataURL();
}

function buildCountrySelect() {
  const grid = document.getElementById("country-grid");
  grid.innerHTML = "";
  COUNTRIES.forEach((c) => {
    const card = document.createElement("div");
    card.className = "country-card";
    card.innerHTML = `
      <img class="country-flag" src="${flagDataURL(c)}" alt="">
      <div class="country-name">${c.name}</div>
      <div class="country-code">${c.code}</div>`;
    card.addEventListener("click", () => {
      selectedCountry = c.name;
      buildRoster(c);
      show("roster");
    });
    grid.appendChild(card);
  });
}

// ---------- SOUPISKA ----------
function buildRoster(country) {
  document.getElementById("roster-title").textContent = "SOUPISKA — " + country.name;
  const grid = document.getElementById("roster-grid");
  grid.innerHTML = "";
  country.squad.forEach((pl) => {
    const card = document.createElement("div");
    card.className = "player-card";
    const cv = document.createElement("canvas");
    cv.width = 80; cv.height = 80;
    const ctx = cv.getContext("2d");
    drawFace(ctx, 40, 38, 26, pl, country.skin);
    card.appendChild(cv);
    const info = document.createElement("div");
    info.innerHTML = `
      <div class="player-name">#${pl.number} ${pl.name}</div>
      <div class="player-meta">${pl.pos}</div>
      <div class="player-defect">${pl.defectLabel}</div>`;
    card.appendChild(info);
    grid.appendChild(card);
  });
}

document.getElementById("btn-back-select").addEventListener("click", () => show("select"));
document.getElementById("btn-start-tournament").addEventListener("click", () => {
  tournament = new Tournament(selectedCountry);
  renderTournament();
  show("tournament");
});

// ---------- TURNAJ: přehled ----------
function phaseTitle() {
  switch (tournament.phase) {
    case "group": return "SKUPINOVÁ FÁZE";
    case "qf": return "ČTVRTFINÁLE";
    case "sf": return "SEMIFINÁLE";
    case "final": return "FINÁLE";
    default: return "TURNAJ";
  }
}

function renderTournament() {
  document.getElementById("tour-phase-title").textContent = phaseTitle();
  const c = document.getElementById("tour-content");
  c.innerHTML = "";
  const btn = document.getElementById("btn-next-match");

  if (tournament.phase === "group") {
    renderGroupView(c);
    btn.textContent = tournament.nextPlayerFixture() ? "ODEHRÁT SVŮJ ZÁPAS" : "DOHRÁT SKUPINU";
    btn.style.display = "inline-block";
  } else if (["qf", "sf", "final"].includes(tournament.phase)) {
    renderBracketView(c);
    const m = tournament.nextPlayerKnockout();
    btn.textContent = m ? "ODEHRÁT " + phaseTitle() : "POKRAČOVAT";
    btn.style.display = "inline-block";
  }
}

function renderGroupView(container) {
  const myGi = tournament.groupIndexOf(tournament.playerCountry);

  // moje skupina – tabulka
  const gp = document.createElement("div");
  gp.className = "panel";
  gp.innerHTML = `<h3>TVOJE SKUPINA ${String.fromCharCode(65 + myGi)}</h3>`;
  gp.appendChild(standingsTable(myGi));
  container.appendChild(gp);

  // moje zápasy
  const fp = document.createElement("div");
  fp.className = "panel";
  fp.innerHTML = `<h3>TVOJE ZÁPASY VE SKUPINĚ</h3>`;
  const fl = document.createElement("div");
  fl.className = "fixtures";
  const next = tournament.nextPlayerFixture();
  tournament.fixtures
    .filter((f) => f.home === tournament.playerCountry || f.away === tournament.playerCountry)
    .forEach((f) => {
      const div = document.createElement("div");
      div.className = "fixture" + (f === next ? " next" : "");
      const res = f.played ? `<span class="res">${f.hs} : ${f.as}</span>` : (f === next ? "‹ DALŠÍ" : "—");
      div.innerHTML = `<span>${f.home} vs ${f.away}</span>${res}`;
      fl.appendChild(div);
    });
  fp.appendChild(fl);
  container.appendChild(fp);

  // ostatní skupiny
  const op = document.createElement("div");
  op.className = "panel";
  op.innerHTML = `<h3>OSTATNÍ SKUPINY</h3>`;
  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = "repeat(auto-fit,minmax(220px,1fr))";
  wrap.style.gap = "14px";
  tournament.groups.forEach((g, gi) => {
    if (gi === myGi) return;
    const box = document.createElement("div");
    box.innerHTML = `<div style="color:#9fc7ad;font-size:13px;margin-bottom:4px;">Skupina ${String.fromCharCode(65 + gi)}</div>`;
    box.appendChild(standingsTable(gi));
    wrap.appendChild(box);
  });
  op.appendChild(wrap);
  container.appendChild(op);
}

function standingsTable(gi) {
  const table = document.createElement("table");
  table.className = "standings";
  table.innerHTML = `<tr><th>Tým</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>Skóre</th><th>B</th></tr>`;
  tournament.groupTable(gi).forEach((t, idx) => {
    const tr = document.createElement("tr");
    if (t.name === tournament.playerCountry) tr.classList.add("me");
    if (idx < 2) tr.classList.add("adv");
    tr.innerHTML = `<td>${t.name}</td><td>${t.P}</td><td>${t.W}</td><td>${t.D}</td><td>${t.L}</td><td>${t.GF}:${t.GA}</td><td>${t.Pts}</td>`;
    table.appendChild(tr);
  });
  return table;
}

function renderBracketView(container) {
  const p = document.createElement("div");
  p.className = "panel";
  p.innerHTML = `<h3>PAVOUK O TITUL</h3>`;
  const br = document.createElement("div");
  br.className = "bracket";

  const col = (title, matches) => {
    const c = document.createElement("div");
    c.className = "bracket-col";
    c.innerHTML = `<h4>${title}</h4>`;
    matches.forEach((m) => c.appendChild(bracketMatch(m)));
    return c;
  };

  br.appendChild(col("Čtvrtfinále", tournament.bracket.qf));
  br.appendChild(col("Semifinále", tournament.bracket.sf));
  const fc = document.createElement("div");
  fc.className = "bracket-col";
  fc.innerHTML = `<h4>Finále</h4>`;
  fc.appendChild(bracketMatch(tournament.bracket.final));
  if (tournament.bracket.champion) {
    const ch = document.createElement("div");
    ch.className = "champ";
    ch.innerHTML = `🏆 ${tournament.bracket.champion}`;
    fc.appendChild(ch);
  }
  br.appendChild(fc);

  p.appendChild(br);
  container.appendChild(p);
}

function bracketMatch(m) {
  const d = document.createElement("div");
  d.className = "bmatch";
  const me = tournament.playerCountry;
  const row = (name, score, isW) => {
    if (!name) return `<div><span>—</span><span></span></div>`;
    const cls = (isW ? "w " : "") + (name === me ? "me-team" : "");
    return `<div class="${cls}"><span>${name}</span><span>${score}</span></div>`;
  };
  const hs = m.played ? m.hs : "";
  const as = m.played ? m.as : "";
  let pTag = m.pens ? ` <span style="font-size:10px;color:#9fc7ad">(pen ${m.pens[0]}:${m.pens[1]})</span>` : "";
  d.innerHTML =
    row(m.home, hs, m.played && m.winner === m.home) +
    row(m.away, as, m.played && m.winner === m.away);
  if (pTag) d.innerHTML += `<div style="justify-content:center">${pTag}</div>`;
  return d;
}

// ---------- SPUŠTĚNÍ DALŠÍHO ZÁPASU ----------
document.getElementById("btn-next-match").addEventListener("click", onNextMatch);

function onNextMatch() {
  if (tournament.phase === "group") {
    const f = tournament.nextPlayerFixture();
    if (f) { playMatch(f, false); return; }
    // hráč odehrál vše ve skupině → dohraj zbytek a vyhodnoť postup
    tournament.simulateOtherGroupFixturesUpTo();
    const myGi = tournament.groupIndexOf(tournament.playerCountry);
    const table = tournament.groupTable(myGi);
    const pos = table.findIndex((t) => t.name === tournament.playerCountry);
    if (pos < 2) {
      tournament.buildKnockout();
      renderTournament();
    } else {
      endTournament(false, "Vypadl jsi už ve skupině. Skončil jsi " + (pos + 1) + ". v základní skupině.");
    }
    return;
  }

  // knockout
  const m = tournament.nextPlayerKnockout();
  if (m) { playMatch(m, true); return; }
  // hráč není v dalším zápase (už vypadl) – nemělo by nastat, ale pro jistotu
  renderTournament();
}

function playMatch(fixture, isKnockout) {
  const playerTeam = fixture.home === tournament.playerCountry ? 0 : 1;
  const canvas = document.getElementById("game-canvas");
  show("match");
  let label = isKnockout ? phaseTitle() : "SKUPINA " +
    String.fromCharCode(65 + tournament.groupIndexOf(tournament.playerCountry));
  currentMatch = new Match(canvas, {
    home: fixture.home,
    away: fixture.away,
    playerTeam,
    isKnockout,
    label,
    onFinish: (res) => onMatchFinish(fixture, isKnockout, res),
  });
}

function onMatchFinish(fixture, isKnockout, res) {
  currentMatch = null;
  let roundName = "";
  if (!isKnockout) {
    tournament.recordResult(fixture, res.hs, res.as);
  } else {
    roundName = phaseTitle(); // fáze PŘED posunem = kolo tohoto zápasu
    fixture.played = true;
    fixture.hs = res.hs; fixture.as = res.as;
    fixture.pens = res.pens; fixture.winner = res.winner;
    tournament.advanceRoundAfterPlayer();
  }
  showResult(fixture, isKnockout, res, roundName);
}

// ---------- VÝSLEDEK ----------
function showResult(fixture, isKnockout, res, roundName) {
  document.getElementById("result-title").textContent =
    isKnockout ? roundName : "KONEC ZÁPASU";
  document.getElementById("result-score").textContent =
    fixture.home + "  " + res.hs + " : " + res.as + "  " + fixture.away;
  let detail = "";
  if (res.pens) detail = "Penalty: " + res.pens[0] + " : " + res.pens[1] + " — postupuje " + res.winner;
  else if (isKnockout) detail = "Postupuje: " + res.winner;
  else {
    const me = tournament.playerCountry;
    const myGoals = fixture.home === me ? res.hs : res.as;
    const oppGoals = fixture.home === me ? res.as : res.hs;
    detail = myGoals > oppGoals ? "Výhra! +3 body" : myGoals < oppGoals ? "Prohra. 0 bodů" : "Remíza. +1 bod";
  }
  document.getElementById("result-detail").textContent = detail;
  show("result");

  // připrav akci pokračování
  const btn = document.getElementById("btn-result-continue");
  btn.onclick = () => {
    // konec turnaje pro hráče?
    if (isKnockout) {
      const me = tournament.playerCountry;
      if (res.winner !== me) {
        endTournament(false, "Vypadl jsi v kole " + roundName + ". Dál postoupil soupeř " +
          res.winner + ".");
        return;
      }
      if (tournament.phase === "done") {
        endTournament(true, "Vyhrál jsi celý IDIOTSKÝ TURNAJ!");
        return;
      }
    }
    renderTournament();
    show("tournament");
  };
}

// ---------- KONEC ----------
function endTournament(won, msg) {
  document.getElementById("end-title").textContent = won ? "🏆 MISTR SVĚTA IDIOTŮ! 🏆" : "KONEC TURNAJE";
  document.getElementById("end-detail").textContent = msg;
  show("end");
}

document.getElementById("btn-end-menu").addEventListener("click", () => {
  tournament = null; selectedCountry = null;
  show("menu");
});

document.getElementById("btn-result-continue").addEventListener("click", () => {});
