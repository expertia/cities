/* ===========================================================================
   tournament.js — IDIOTSKÝ TURNAJ: skupiny, tabulky, pavouk, simulace
   ===========================================================================*/

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class Tournament {
  constructor(playerCountryName) {
    this.playerCountry = playerCountryName;
    this.groups = [];        // 4 skupiny po 4 týmech (jména zemí)
    this.standings = {};     // jméno -> {P,W,D,L,GF,GA,Pts}
    this.fixtures = [];      // všechny zápasy skupin
    this.phase = "group";    // group | qf | sf | final | done
    this.bracket = { qf: [], sf: [], final: null, champion: null };
    this.draw();
  }

  draw() {
    // Náhodné rozlosování 16 zemí do 4 skupin
    const names = shuffle(COUNTRIES.map((c) => c.name));
    this.groups = [
      names.slice(0, 4),
      names.slice(4, 8),
      names.slice(8, 12),
      names.slice(12, 16),
    ];
    // inicializace tabulek
    for (const n of names) {
      this.standings[n] = { name: n, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 };
    }
    // los zápasů ve skupinách (každý s každým)
    this.fixtures = [];
    this.groups.forEach((g, gi) => {
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) {
          this.fixtures.push({ group: gi, home: g[i], away: g[j], played: false, hs: 0, as: 0 });
        }
      }
    });
  }

  groupIndexOf(name) {
    return this.groups.findIndex((g) => g.includes(name));
  }

  // Najde další zápas hráče, který se ještě nehrál
  nextPlayerFixture() {
    return this.fixtures.find(
      (f) => !f.played && (f.home === this.playerCountry || f.away === this.playerCountry)
    );
  }

  // Simulace AI zápasu podle síly + náhody
  simulateScore(home, away) {
    const sh = getCountry(home).strength + Math.random() * 5;
    const sa = getCountry(away).strength + Math.random() * 5;
    let hs = Math.max(0, Math.round((sh - 3) / 2 + (Math.random() - 0.3) * 2));
    let as = Math.max(0, Math.round((sa - 3) / 2 + (Math.random() - 0.3) * 2));
    return [Math.min(hs, 6), Math.min(as, 6)];
  }

  recordResult(fixture, hs, as) {
    fixture.played = true;
    fixture.hs = hs;
    fixture.as = as;
    const H = this.standings[fixture.home];
    const A = this.standings[fixture.away];
    H.P++; A.P++;
    H.GF += hs; H.GA += as;
    A.GF += as; A.GA += hs;
    if (hs > as) { H.W++; H.Pts += 3; A.L++; }
    else if (hs < as) { A.W++; A.Pts += 3; H.L++; }
    else { H.D++; A.D++; H.Pts += 1; A.Pts += 1; }
  }

  // Po odehrání hráčova zápasu dosimuluje ostatní zápasy téhož "kola" pocitově
  // (zde jednoduše dosimulujeme všechny ostatní zatím neodehrané AI zápasy,
  //  které neobsahují hráče — kromě těch, co teprve přijdou na řadu hráče).
  simulateOtherGroupFixturesUpTo() {
    // Dosimuluj všechny zápasy bez hráče, pokud už hráč svůj zápas v té chvíli odehrál.
    for (const f of this.fixtures) {
      if (f.played) continue;
      if (f.home === this.playerCountry || f.away === this.playerCountry) continue;
      const [hs, as] = this.simulateScore(f.home, f.away);
      this.recordResult(f, hs, as);
    }
  }

  groupTable(gi) {
    const teams = this.groups[gi].map((n) => this.standings[n]);
    teams.sort((a, b) =>
      b.Pts - a.Pts ||
      (b.GF - b.GA) - (a.GF - a.GA) ||
      b.GF - a.GF ||
      a.name.localeCompare(b.name)
    );
    return teams;
  }

  groupStageComplete() {
    return this.fixtures.every((f) => f.played);
  }

  // Sestaví čtvrtfinále z postupujících (1. a 2. ze skupin), klasické křížení
  buildKnockout() {
    const adv = this.groups.map((_, gi) => this.groupTable(gi)); // pole tabulek
    const W = (gi) => adv[gi][0].name; // vítěz skupiny
    const R = (gi) => adv[gi][1].name; // druhý

    // Standardní křížení: A1-B2, C1-D2, B1-A2, D1-C2
    this.bracket.qf = [
      { home: W(0), away: R(1), played: false, hs: 0, as: 0, winner: null },
      { home: W(2), away: R(3), played: false, hs: 0, as: 0, winner: null },
      { home: W(1), away: R(0), played: false, hs: 0, as: 0, winner: null },
      { home: W(3), away: R(2), played: false, hs: 0, as: 0, winner: null },
    ];
    this.bracket.sf = [
      { home: null, away: null, played: false, hs: 0, as: 0, winner: null, from: [0, 1] },
      { home: null, away: null, played: false, hs: 0, as: 0, winner: null, from: [2, 3] },
    ];
    this.bracket.final = { home: null, away: null, played: false, hs: 0, as: 0, winner: null, from: [0, 1] };
    this.phase = "qf";
  }

  // simulace knockout zápasu (s penaltami při remíze)
  simulateKnockout(home, away) {
    let [hs, as] = this.simulateScore(home, away);
    let pens = null;
    if (hs === as) {
      // penalty
      const sh = getCountry(home).strength, sa = getCountry(away).strength;
      let ph = 0, pa = 0;
      for (let i = 0; i < 5; i++) {
        if (Math.random() < 0.5 + (sh - sa) * 0.02) ph++;
        if (Math.random() < 0.5 + (sa - sh) * 0.02) pa++;
      }
      while (ph === pa) {
        if (Math.random() < 0.5 + (sh - sa) * 0.02) ph++;
        if (Math.random() < 0.5 + (sa - sh) * 0.02) pa++;
      }
      pens = [ph, pa];
    }
    const winner = hs > as ? home : as > hs ? away : (pens[0] > pens[1] ? home : away);
    return { hs, as, pens, winner };
  }

  // vrací aktuální knockout zápas hráče, který se ještě nehrál
  nextPlayerKnockout() {
    if (this.phase === "qf") {
      return this.bracket.qf.find((m) => !m.played && (m.home === this.playerCountry || m.away === this.playerCountry));
    }
    if (this.phase === "sf") {
      return this.bracket.sf.find((m) => !m.played && (m.home === this.playerCountry || m.away === this.playerCountry));
    }
    if (this.phase === "final") {
      const f = this.bracket.final;
      if (!f.played && (f.home === this.playerCountry || f.away === this.playerCountry)) return f;
    }
    return null;
  }

  playerStillIn() {
    if (this.phase === "done") return this.bracket.champion === this.playerCountry;
    // hráč je ve hře, pokud je v některém budoucím zápase
    const inQf = this.bracket.qf.some((m) => (m.home === this.playerCountry || m.away === this.playerCountry) && (!m.played || m.winner === this.playerCountry));
    return inQf;
  }

  // dosimuluje ostatní knockout zápasy daného kola (bez hráče) a posune kolo
  advanceRoundAfterPlayer() {
    const simRound = (matches) => {
      for (const m of matches) {
        if (m.played) continue;
        if (m.home === this.playerCountry || m.away === this.playerCountry) continue;
        const r = this.simulateKnockout(m.home, m.away);
        m.played = true; m.hs = r.hs; m.as = r.as; m.pens = r.pens; m.winner = r.winner;
      }
    };

    if (this.phase === "qf") {
      simRound(this.bracket.qf);
      // naplnit SF
      this.bracket.sf[0].home = this.bracket.qf[0].winner;
      this.bracket.sf[0].away = this.bracket.qf[1].winner;
      this.bracket.sf[1].home = this.bracket.qf[2].winner;
      this.bracket.sf[1].away = this.bracket.qf[3].winner;
      this.phase = "sf";
    } else if (this.phase === "sf") {
      simRound(this.bracket.sf);
      this.bracket.final.home = this.bracket.sf[0].winner;
      this.bracket.final.away = this.bracket.sf[1].winner;
      this.phase = "final";
    } else if (this.phase === "final") {
      const f = this.bracket.final;
      this.bracket.champion = f.winner;
      this.phase = "done";
    }
  }
}
