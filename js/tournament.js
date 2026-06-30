/* ============================================================
   VS — IDIOTSKÝ TURNAJ
   tournament.js : losování skupin, tabulky, pavouk, simulace
   ============================================================ */
(function (VS) {
  "use strict";

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Nasimuluje skóre zápasu podle síly týmů
  function simScore(a, b) {
    var ca = VS.COUNTRIES[a], cb = VS.COUNTRIES[b];
    var ea = ca.strength + (Math.random() * 6 - 3);
    var eb = cb.strength + (Math.random() * 6 - 3);
    var ga = Math.max(0, Math.round((ea / 3.2) - 1 + Math.random() * 2));
    var gb = Math.max(0, Math.round((eb / 3.2) - 1 + Math.random() * 2));
    return [ga, gb];
  }

  function simWinner(a, b) {
    var s = simScore(a, b);
    if (s[0] === s[1]) {
      // penalty rozstřel -> rozhodne síla + náhoda
      var wa = VS.COUNTRIES[a].strength + Math.random() * 6;
      var wb = VS.COUNTRIES[b].strength + Math.random() * 6;
      return { a: a, b: b, ga: s[0], gb: s[1], winner: wa >= wb ? a : b, pens: true };
    }
    return { a: a, b: b, ga: s[0], gb: s[1], winner: s[0] > s[1] ? a : b, pens: false };
  }

  VS.Tournament = function (humanCode) {
    this.human = humanCode;
    this.stage = "group";
    this._drawGroups();
    this.humanGroupMatchIndex = 0;   // který zápas hráče ve skupině hrajeme
    this.knockout = null;
    this.humanOut = false;
    this.champion = null;
  };

  var T = VS.Tournament.prototype;

  T._drawGroups = function () {
    var codes = shuffle(VS.allCountryCodes());
    // hráče dáme náhodně do jedné skupiny, ostatní rozlosujeme
    this.groups = [];
    var names = ["A", "B", "C", "D"];
    for (var g = 0; g < 4; g++) {
      var teams = codes.slice(g * 4, g * 4 + 4);
      this.groups.push({
        name: names[g],
        teams: teams,
        table: {},
        matches: [],
        done: false
      });
      for (var i = 0; i < teams.length; i++) {
        this.groups[g].table[teams[i]] = { code: teams[i], P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 };
      }
    }
    // najdi skupinu hráče
    for (var k = 0; k < 4; k++) {
      if (this.groups[k].teams.indexOf(this.human) >= 0) { this.humanGroup = this.groups[k]; this.humanGroupIdx = k; break; }
    }
    // sestav pořadí soupeřů hráče
    this.humanOpponents = this.humanGroup.teams.filter(function (t) { return t !== this.human; }, this);
  };

  // Vrátí konfiguraci dalšího zápasu hráče ve skupině, nebo null
  T.nextGroupMatch = function () {
    if (this.humanGroupMatchIndex >= this.humanOpponents.length) return null;
    var opp = this.humanOpponents[this.humanGroupMatchIndex];
    return { home: this.human, away: opp, knockout: false,
      label: "Skupina " + this.humanGroup.name + " — zápas " + (this.humanGroupMatchIndex + 1) + "/3" };
  };

  // Zapíše výsledek zápasu hráče ve skupině
  T.recordHumanGroupResult = function (homeCode, awayCode, gh, ga) {
    this._applyResult(this.humanGroup, homeCode, awayCode, gh, ga);
    this.humanGroupMatchIndex++;
  };

  T._applyResult = function (group, a, b, ga, gb) {
    var ta = group.table[a], tb = group.table[b];
    ta.P++; tb.P++; ta.GF += ga; ta.GA += gb; tb.GF += gb; tb.GA += ga;
    if (ga > gb) { ta.W++; tb.L++; ta.Pts += 3; }
    else if (gb > ga) { tb.W++; ta.L++; tb.Pts += 3; }
    else { ta.D++; tb.D++; ta.Pts += 1; tb.Pts += 1; }
    group.matches.push({ a: a, b: b, ga: ga, gb: gb });
  };

  // Dohraje (nasimuluje) zbytek skupin a vytvoří pořadí
  T.finishGroups = function () {
    var self = this;
    // ostatní zápasy v hráčově skupině (mezi nehumánními)
    var hg = this.humanGroup;
    var others = hg.teams.filter(function (t) { return t !== self.human; });
    for (var i = 0; i < others.length; i++) {
      for (var j = i + 1; j < others.length; j++) {
        var s = simScore(others[i], others[j]);
        this._applyResult(hg, others[i], others[j], s[0], s[1]);
      }
    }
    // ostatní skupiny celé
    this.groups.forEach(function (g) {
      if (g === hg) return;
      for (var a = 0; a < g.teams.length; a++) {
        for (var b = a + 1; b < g.teams.length; b++) {
          var s = simScore(g.teams[a], g.teams[b]);
          self._applyResult(g, g.teams[a], g.teams[b], s[0], s[1]);
        }
      }
    });
    // spočítej pořadí
    this.groups.forEach(function (g) {
      g.ranking = g.teams.slice().sort(function (x, y) {
        var tx = g.table[x], ty = g.table[y];
        if (ty.Pts !== tx.Pts) return ty.Pts - tx.Pts;
        if ((ty.GF - ty.GA) !== (tx.GF - tx.GA)) return (ty.GF - ty.GA) - (tx.GF - tx.GA);
        if (ty.GF !== tx.GF) return ty.GF - tx.GF;
        return Math.random() - 0.5;
      });
      g.done = true;
    });
    this.stage = "knockout";
    this._drawKnockout();
  };

  // Postupují 2 z každé skupiny = 8 týmů -> náhodný pavouk
  T._drawKnockout = function () {
    var qualifiers = [];
    this.groups.forEach(function (g) {
      qualifiers.push(g.ranking[0]);
      qualifiers.push(g.ranking[1]);
    });
    var draw = shuffle(qualifiers);
    this.knockout = {
      qf: [
        { a: draw[0], b: draw[1], winner: null, score: null },
        { a: draw[2], b: draw[3], winner: null, score: null },
        { a: draw[4], b: draw[5], winner: null, score: null },
        { a: draw[6], b: draw[7], winner: null, score: null }
      ],
      sf: [{ a: null, b: null, winner: null, score: null }, { a: null, b: null, winner: null, score: null }],
      final: { a: null, b: null, winner: null, score: null },
      round: "qf"   // qf | sf | final | done
    };
    this.humanOut = qualifiers.indexOf(this.human) < 0;
  };

  // Vrátí další zápas hráče v aktuálním kole pavouka, nebo null
  T.nextKnockoutMatch = function () {
    var ko = this.knockout;
    if (!ko || this.humanOut || ko.round === "done") return null;
    var ties = this._currentTies();
    for (var i = 0; i < ties.length; i++) {
      var t = ties[i];
      if (t.winner) continue;
      if (t.a === this.human || t.b === this.human) {
        var opp = t.a === this.human ? t.b : t.a;
        return { home: this.human, away: opp, knockout: true, tie: t,
          label: this._roundLabel(ko.round) + (t.a === this.human ? "" : "") };
      }
    }
    return null;
  };

  T._currentTies = function () {
    var ko = this.knockout;
    if (ko.round === "qf") return ko.qf;
    if (ko.round === "sf") return ko.sf;
    if (ko.round === "final") return [ko.final];
    return [];
  };

  T._roundLabel = function (r) {
    return r === "qf" ? "ČTVRTFINÁLE" : r === "sf" ? "SEMIFINÁLE" : r === "final" ? "FINÁLE" : "";
  };

  // Zapíše výsledek hráčova vyřazovacího zápasu
  T.recordHumanKnockout = function (tie, homeCode, awayCode, gh, ga, winnerCode) {
    tie.score = gh + ":" + ga;
    tie.winner = winnerCode;
    if (winnerCode !== this.human) this.humanOut = true;
  };

  // Dohraje aktuální kolo (nasimuluje zbývající zápasy) a postoupí dál
  T.finishRound = function () {
    var ko = this.knockout;
    var ties = this._currentTies();
    ties.forEach(function (t) {
      if (t.winner) return;
      var r = simWinner(t.a, t.b);
      t.winner = r.winner;
      t.score = r.ga + ":" + r.gb + (r.pens ? " (pen)" : "");
    });
    // posuň vítěze
    if (ko.round === "qf") {
      ko.sf[0].a = ko.qf[0].winner; ko.sf[0].b = ko.qf[1].winner;
      ko.sf[1].a = ko.qf[2].winner; ko.sf[1].b = ko.qf[3].winner;
      ko.round = "sf";
    } else if (ko.round === "sf") {
      ko.final.a = ko.sf[0].winner; ko.final.b = ko.sf[1].winner;
      ko.round = "final";
    } else if (ko.round === "final") {
      this.champion = ko.final.winner;
      ko.round = "done";
      this.stage = "done";
    }
  };

})(window.VS = window.VS || {});
