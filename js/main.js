/* ============================================================
   VS — IDIOTSKÝ TURNAJ
   main.js : obrazovky (menu, výběr, turnaj) + herní smyčka
   ============================================================ */
(function (VS) {
  "use strict";

  var cv, ctx, ui, W, H, dpr;
  var tour = null;
  var humanCode = null;
  var match = null;
  var raf = null;
  var lastTs = 0;

  window.addEventListener("load", init);

  function init() {
    cv = document.getElementById("cv");
    ctx = cv.getContext("2d");
    ui = document.getElementById("ui");
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    showMenu();
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function onKeyDown(e) {
    if (match && (match.state !== "done")) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyI", "KeyL"].indexOf(e.code) >= 0) {
        e.preventDefault();
        match.keydown(e.code);
      }
    }
  }
  function onKeyUp(e) { if (match) match.keyup(e.code); }

  // ---------- pomocné: vlajka & portrét -----------------------------------
  function flagCanvas(country, w, h) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var x = c.getContext("2d");
    x.fillStyle = country.jersey; x.fillRect(0, 0, w, h / 2);
    x.fillStyle = country.shorts; x.fillRect(0, h / 2, w, h / 2);
    x.fillStyle = country.accent; x.fillRect(w * 0.4, 0, w * 0.2, h);
    return c;
  }

  function portraitCanvas(player, jersey, size) {
    var c = document.createElement("canvas");
    c.width = size; c.height = size;
    var x = c.getContext("2d");
    VS.drawFace(x, size / 2, size * 0.42, size * 0.28, player, jersey);
    return c;
  }

  function clearUI() { ui.innerHTML = ""; ui.classList.remove("hidden"); }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }

  // ---------- MENU ---------------------------------------------------------
  function showMenu() {
    stopMatch();
    clearUI();
    var p = el('<div class="panel center"></div>');
    p.appendChild(el('<div class="title-vs">VS</div>'));
    p.appendChild(el('<div class="subtitle">IDIOTSKÝ TURNAJ</div>'));
    p.appendChild(el('<div class="tag">Fotbalové MS, ale každý hráč má jednu pořádnou vadu na kráse 🤪⚽</div>'));
    var btn = el('<button class="btn">▶ HRÁT IDIOT TURNAJ</button>');
    btn.onclick = showSelect;
    var rw = el('<div class="row"></div>'); rw.appendChild(btn);
    p.appendChild(rw);
    p.appendChild(el('<div class="tag" style="margin-top:22px">Ovládání: <b>šipky</b> = pohyb · <b>I</b> = nahrávka · <b>L</b> = střela / penalta</div>'));
    ui.appendChild(p);
  }

  // ---------- VÝBĚR ZEMĚ ---------------------------------------------------
  var selected = null;
  function showSelect() {
    clearUI();
    selected = null;
    var p = el('<div class="panel"></div>');
    p.appendChild(el('<div class="h1">VYBER SI ZEMI</div>'));
    p.appendChild(el('<div class="h2">Za koho povedeš výpravu na IDIOTSKÝ TURNAJ?</div>'));
    var grid = el('<div class="grid"></div>');
    VS.allCountryCodes().forEach(function (code) {
      var c = VS.COUNTRIES[code];
      var card = el('<div class="country" data-code="' + code + '"></div>');
      card.appendChild(flagCanvas(c, 150, 46)).className = "flag";
      card.appendChild(el('<div class="nm">' + c.name + '</div>'));
      card.appendChild(el('<div class="st">síla ' + c.strength + '/10</div>'));
      card.onclick = function () { previewCountry(code); };
      grid.appendChild(card);
    });
    p.appendChild(grid);
    var rw = el('<div class="row" style="margin-top:18px"></div>');
    var back = el('<button class="btn sm gray">← Zpět</button>'); back.onclick = showMenu;
    rw.appendChild(back);
    p.appendChild(rw);
    ui.appendChild(p);
  }

  function previewCountry(code) {
    clearUI();
    var c = VS.COUNTRIES[code];
    var squad = VS.buildSquad(c);
    var p = el('<div class="panel"></div>');
    var head = el('<div class="row" style="justify-content:space-between"></div>');
    var left = el('<div></div>');
    left.appendChild(el('<div class="h1" style="text-align:left">' + c.name + '</div>'));
    left.appendChild(el('<div class="h2" style="text-align:left">Tvoje banda šílenců — síla ' + c.strength + '/10</div>'));
    head.appendChild(left);
    var fc = flagCanvas(c, 120, 70); fc.style.borderRadius = "8px";
    head.appendChild(fc);
    p.appendChild(head);

    var sq = el('<div class="squad"></div>');
    squad.forEach(function (pl) {
      var card = el('<div class="pl"></div>');
      card.appendChild(portraitCanvas(pl, c.jersey, 86));
      card.appendChild(el('<div class="pn">' + pl.num + '. ' + pl.name + '</div>'));
      card.appendChild(el('<div class="pr">' + pl.label + ' · ' + pl.rating + '/10</div>'));
      card.appendChild(el('<div class="pq">vada: ' + VS.quirkLabel(pl.quirk) + '</div>'));
      sq.appendChild(card);
    });
    p.appendChild(sq);

    var rw = el('<div class="row" style="margin-top:20px"></div>');
    var back = el('<button class="btn sm gray">← Jiná země</button>'); back.onclick = showSelect;
    var go = el('<button class="btn">✔ HRÁT ZA ' + c.name + '</button>');
    go.onclick = function () { startTournament(code); };
    rw.appendChild(back); rw.appendChild(go);
    p.appendChild(rw);
    ui.appendChild(p);
  }

  // ---------- ZAČÁTEK TURNAJE / LOSOVÁNÍ -----------------------------------
  function startTournament(code) {
    humanCode = code;
    tour = new VS.Tournament(code);
    showGroupDraw();
  }

  function groupTable(g) {
    var order = g.ranking || g.teams;
    var rows = "";
    order.forEach(function (code, i) {
      var r = g.table[code];
      var cls = (code === humanCode ? "me" : "");
      if (g.done && i < 2) cls += " adv";
      var name = VS.COUNTRIES[code].name;
      rows += '<tr class="' + cls + '"><td class="team">' + name + '</td><td>' + r.P + '</td><td>' + r.W +
        '</td><td>' + r.D + '</td><td>' + r.L + '</td><td>' + r.GF + ':' + r.GA + '</td><td><b>' + r.Pts + '</b></td></tr>';
    });
    return el(
      '<div class="gbox"><h3>Skupina ' + g.name + '</h3>' +
      '<table><tr><th>Tým</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>Skóre</th><th>B</th></tr>' +
      rows + '</table></div>'
    );
  }

  function showGroupDraw() {
    clearUI();
    var p = el('<div class="panel"></div>');
    p.appendChild(el('<div class="h1">LOSOVÁNÍ SKUPIN</div>'));
    p.appendChild(el('<div class="h2">4 skupiny po 4 — postupují vždy 2 dál do čtvrtfinále</div>'));
    var gr = el('<div class="groups"></div>');
    tour.groups.forEach(function (g) { gr.appendChild(groupTable(g)); });
    p.appendChild(gr);
    p.appendChild(el('<div class="note">Hraješ ve skupině ' + tour.humanGroup.name + ' za ' + VS.COUNTRIES[humanCode].name + '.</div>'));
    var rw = el('<div class="row" style="margin-top:14px"></div>');
    var go = el('<button class="btn">⚽ ZAČÍT SKUPINU</button>');
    go.onclick = playNextGroupMatch;
    rw.appendChild(go);
    p.appendChild(rw);
    ui.appendChild(p);
  }

  // ---------- SKUPINOVÁ FÁZE ----------------------------------------------
  function playNextGroupMatch() {
    var cfg = tour.nextGroupMatch();
    if (cfg) {
      preMatch(cfg, function (res) {
        tour.recordHumanGroupResult(cfg.home, cfg.away, res.home, res.away);
        showGroupInterim();
      });
    } else {
      tour.finishGroups();
      showGroupFinal();
    }
  }

  function showGroupInterim() {
    clearUI();
    var p = el('<div class="panel"></div>');
    p.appendChild(el('<div class="h1">PRŮBĚŽNÁ TABULKA — Skupina ' + tour.humanGroup.name + '</div>'));
    var gr = el('<div class="groups"></div>');
    gr.appendChild(groupTable(tour.humanGroup));
    p.appendChild(gr);
    p.appendChild(el('<div class="h2" style="margin-top:12px"><small class="dim">Ostatní skupiny se dolosují po skončení tvojí.</small></div>'));
    var rw = el('<div class="row"></div>');
    var more = tour.nextGroupMatch();
    var btn = el('<button class="btn">' + (more ? "⚽ DALŠÍ ZÁPAS" : "➡ DOHRÁT SKUPINY") + '</button>');
    btn.onclick = playNextGroupMatch;
    rw.appendChild(btn);
    p.appendChild(rw);
    ui.appendChild(p);
  }

  function showGroupFinal() {
    clearUI();
    var p = el('<div class="panel"></div>');
    p.appendChild(el('<div class="h1">KONEČNÉ TABULKY SKUPIN</div>'));
    p.appendChild(el('<div class="h2">✓ = postupuje do čtvrtfinále</div>'));
    var gr = el('<div class="groups"></div>');
    tour.groups.forEach(function (g) { gr.appendChild(groupTable(g)); });
    p.appendChild(gr);
    var adv = tour.humanGroup.ranking.indexOf(humanCode) < 2;
    if (adv) p.appendChild(el('<div class="note" style="color:#69f0ae">Postoupil jsi do vyřazovací fáze! 🎉</div>'));
    else p.appendChild(el('<div class="note">Vypadl jsi už ve skupině... 😬 Můžeš ale dokoukat, kdo vyhraje.</div>'));
    var rw = el('<div class="row"></div>');
    var btn = el('<button class="btn">🏆 LOSOVÁNÍ PAVOUKA</button>');
    btn.onclick = showKnockout;
    rw.appendChild(btn);
    p.appendChild(rw);
    ui.appendChild(p);
  }

  // ---------- VYŘAZOVACÍ FÁZE ---------------------------------------------
  function tieBox(t, roundLabel) {
    var box = el('<div class="tie"></div>');
    function line(code) {
      if (!code) return el('<div class="t"><span>—</span><span></span></div>');
      var cls = "t" + (t.winner === code ? " win" : "") + (code === humanCode ? " me" : "");
      var sc = "";
      return el('<div class="' + cls + '"><span>' + VS.COUNTRIES[code].name + '</span><span></span></div>');
    }
    box.appendChild(line(t.a));
    box.appendChild(line(t.b));
    if (t.score) box.appendChild(el('<div class="t" style="opacity:.7;justify-content:center">' + t.score + '</div>'));
    return box;
  }

  function showKnockout() {
    clearUI();
    var ko = tour.knockout;
    var p = el('<div class="panel"></div>');
    p.appendChild(el('<div class="h1">PAVOUK — IDIOTSKÝ TURNAJ</div>'));
    p.appendChild(el('<div class="h2">8 týmů · čtvrtfinále → semifinále → finále</div>'));

    var br = el('<div class="bracket"></div>');
    var c1 = el('<div class="bcol"><h4>Čtvrtfinále</h4></div>');
    ko.qf.forEach(function (t) { c1.appendChild(tieBox(t)); });
    var c2 = el('<div class="bcol"><h4>Semifinále</h4></div>');
    ko.sf.forEach(function (t) { c2.appendChild(tieBox(t)); });
    var c3 = el('<div class="bcol"><h4>Finále</h4></div>');
    c3.appendChild(tieBox(ko.final));
    if (tour.champion) c3.appendChild(el('<div class="note" style="color:#ffe259">🏆 ' + VS.COUNTRIES[tour.champion].name + '</div>'));
    br.appendChild(c1); br.appendChild(c2); br.appendChild(c3);
    p.appendChild(br);

    var rw = el('<div class="row" style="margin-top:18px"></div>');

    if (tour.stage === "done") {
      showChampionInline(p);
      var menu = el('<button class="btn">↺ ZPĚT DO MENU</button>'); menu.onclick = showMenu;
      rw.appendChild(menu);
    } else if (tour.humanOut) {
      p.appendChild(el('<div class="note">Jsi venku — ale turnaj musí mít vítěze.</div>'));
      var sim = el('<button class="btn">⏩ DOHRÁT TURNAJ</button>');
      sim.onclick = function () { while (tour.stage !== "done") tour.finishRound(); showKnockout(); };
      rw.appendChild(sim);
    } else {
      var next = tour.nextKnockoutMatch();
      if (next) {
        var btn = el('<button class="btn">⚽ HRÁT ' + next.label + '</button>');
        btn.onclick = function () {
          preMatch(next, function (res) {
            var winner = res.winner === "home" ? humanCode : next.away;
            tour.recordHumanKnockout(next.tie, next.home, next.away, res.home, res.away, winner);
            tour.finishRound();
            showKnockout();
          });
        };
        rw.appendChild(btn);
      } else {
        // hráč je dál, ale jeho zápas v tomto kole už proběhl? dohraj kolo
        var cont = el('<button class="btn">➡ POKRAČOVAT</button>');
        cont.onclick = function () { tour.finishRound(); showKnockout(); };
        rw.appendChild(cont);
      }
    }
    p.appendChild(rw);
    ui.appendChild(p);
  }

  function showChampionInline(p) {
    var champ = tour.champion;
    var won = champ === humanCode;
    p.insertBefore(el('<div class="champ">' + (won ? "🏆 VYHRÁL JSI CELÝ TURNAJ! 🏆" : "Vítěz turnaje:") + '</div>'), p.children[2]);
    if (!won) p.insertBefore(el('<div class="champ" style="font-size:30px">' + VS.COUNTRIES[champ].name + '</div>'), p.children[3]);
    else p.insertBefore(el('<div class="champ" style="font-size:30px">' + VS.COUNTRIES[champ].name + '</div>'), p.children[3]);
  }

  // ---------- PRE-MATCH + ZÁPAS -------------------------------------------
  function preMatch(cfg, onDone) {
    clearUI();
    var h = VS.COUNTRIES[cfg.home], a = VS.COUNTRIES[cfg.away];
    var p = el('<div class="panel center"></div>');
    p.appendChild(el('<div class="h2">' + cfg.label + '</div>'));
    var vs = el('<div class="row" style="gap:28px; align-items:center; margin:14px 0"></div>');
    var hb = el('<div></div>'); var hf = flagCanvas(h, 130, 78); hf.style.borderRadius = "8px"; hb.appendChild(hf);
    hb.appendChild(el('<div class="h1" style="font-size:22px">' + h.name + '</div>'));
    var mid = el('<div class="title-vs" style="font-size:60px">VS</div>');
    var ab = el('<div></div>'); var af = flagCanvas(a, 130, 78); af.style.borderRadius = "8px"; ab.appendChild(af);
    ab.appendChild(el('<div class="h1" style="font-size:22px">' + a.name + '</div>'));
    vs.appendChild(hb); vs.appendChild(mid); vs.appendChild(ab);
    p.appendChild(vs);
    p.appendChild(el('<div class="tag">Šipky = pohyb · I = nahrávka · L = střela' + (cfg.knockout ? ' · při remíze PENALTY (L)' : '') + '</div>'));
    var rw = el('<div class="row"></div>');
    var go = el('<button class="btn">⚽ ZAČÍT ZÁPAS</button>');
    go.onclick = function () { runMatch(cfg, onDone); };
    rw.appendChild(go);
    p.appendChild(rw);
    ui.appendChild(p);
  }

  function runMatch(cfg, onDone) {
    ui.classList.add("hidden");
    match = new VS.Match(VS.COUNTRIES[cfg.home], VS.COUNTRIES[cfg.away], "home", {
      knockout: cfg.knockout, label: cfg.label,
      onEnd: function (result) {
        stopMatch();
        showMatchResult(cfg, result, onDone);
      }
    });
    lastTs = 0;
    raf = requestAnimationFrame(loop);
  }

  function loop(ts) {
    if (!match) return;
    var dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    match.update(dt);
    match.tickEnd(dt);
    match.render(ctx, W, H);
    raf = requestAnimationFrame(loop);
  }

  function stopMatch() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    match = null;
  }

  function showMatchResult(cfg, result, onDone) {
    clearUI();
    var h = VS.COUNTRIES[cfg.home], a = VS.COUNTRIES[cfg.away];
    var p = el('<div class="panel center"></div>');
    p.appendChild(el('<div class="h2">' + cfg.label + '</div>'));
    var scoreTxt = h.name + "  " + result.home + " : " + result.away + "  " + a.name;
    p.appendChild(el('<div class="champ" style="font-size:34px">' + scoreTxt + '</div>'));
    if (result.pens) {
      p.appendChild(el('<div class="note">Penalty: ' + result.pens.home + " : " + result.pens.away + '</div>'));
    }
    var outcome;
    if (result.winner === "home") outcome = "🎉 Výhra!";
    else if (result.winner === "away") outcome = "😵 Prohra.";
    else outcome = "🤝 Remíza.";
    p.appendChild(el('<div class="h1">' + outcome + '</div>'));
    var rw = el('<div class="row"></div>');
    var btn = el('<button class="btn">➡ POKRAČOVAT</button>');
    btn.onclick = function () { onDone(result); };
    rw.appendChild(btn);
    p.appendChild(rw);
    ui.appendChild(p);
  }

})(window.VS = window.VS || {});
