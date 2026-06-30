/* ============================================================
   VS — IDIOTSKÝ TURNAJ
   tournament.js  —  losování skupin, tabulky, pavouk
   ============================================================ */

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Rozlosuje 16 týmů do 4 skupin po 4 (A, B, C, D). */
function createGroups(teams) {
  const sh = shuffle(teams);
  const groups = [[], [], [], []];
  for (let i = 0; i < 16; i++) groups[i % 4].push(sh[i]);
  return groups; // groups[0]=A, [1]=B, [2]=C, [3]=D
}

/* Rozpis zápasů ve skupině (round robin, 6 zápasů). */
function groupFixtures(group) {
  return [
    [0, 1], [2, 3],
    [0, 2], [1, 3],
    [0, 3], [1, 2],
  ];
}

/* Nasimuluje skóre podle síly týmů + náhody. */
function simulateScore(a, b) {
  const diff = (a.strength - b.strength) / 22;
  const ga = Math.max(0, Math.round(rndPoisson(1.25 + diff)));
  const gb = Math.max(0, Math.round(rndPoisson(1.25 - diff)));
  return [ga, gb];
}

/* V knockoutu musí být vítěz – případně penalty. */
function simulateKnockout(a, b) {
  let [ga, gb] = simulateScore(a, b);
  let pens = null;
  if (ga === gb) {
    // penaltový rozstřel
    let pa = 0, pb = 0;
    for (let i = 0; i < 5; i++) {
      if (Math.random() < 0.75 + (a.strength - b.strength) / 400) pa++;
      if (Math.random() < 0.75 - (a.strength - b.strength) / 400) pb++;
    }
    while (pa === pb) { // sudden death
      if (Math.random() < 0.75) pa++;
      if (Math.random() < 0.75) pb++;
    }
    pens = [pa, pb];
  }
  return { ga, gb, pens, winner: ga > gb ? a : (gb > ga ? b : (pens[0] > pens[1] ? a : b)) };
}

function rndPoisson(lambda) {
  // jednoduchá Poisson aproximace přes Knuthův algoritmus
  if (lambda < 0) lambda = 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

/* Spočítá tabulku skupiny z výsledků.
   results: pole {i, j, gi, gj}  (indexy do group) */
function computeStandings(group, results) {
  const table = group.map((t, idx) => ({
    team: t, idx, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0,
  }));
  for (const r of results) {
    const A = table[r.i], B = table[r.j];
    A.P++; B.P++;
    A.GF += r.gi; A.GA += r.gj;
    B.GF += r.gj; B.GA += r.gi;
    if (r.gi > r.gj) { A.W++; B.L++; A.Pts += 3; }
    else if (r.gi < r.gj) { B.W++; A.L++; B.Pts += 3; }
    else { A.D++; B.D++; A.Pts++; B.Pts++; }
  }
  table.forEach(t => t.GD = t.GF - t.GA);
  table.sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || Math.random() - 0.5);
  return table;
}
