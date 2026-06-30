/* ===========================================================================
   VS — IDIOTSKÝ TURNAJ
   data.js — 16 zemí, barvy dresů a celé sestavy hráčů s "vadami"
   ===========================================================================*/

// Seznam vad — každý hráč dostane právě jednu (obličej nebo vlasy)
const DEFECTS = [
  { id: "blueHair",   label: "modré vlasy" },
  { id: "greenHair",  label: "zelené vlasy" },
  { id: "pinkHair",   label: "růžové vlasy" },
  { id: "rainbow",    label: "duhový čU",   text: "duhové vlasy" },
  { id: "bald",       label: "úplně holý" },
  { id: "oneEye",     label: "jedno oko" },
  { id: "threeEyes",  label: "tři oči" },
  { id: "bigNose",    label: "obří nos" },
  { id: "crossEyed",  label: "šilhá" },
  { id: "bigEars",    label: "uši jako Shrek" },
  { id: "noTooth",    label: "chybí zub" },
  { id: "moustache",  label: "fialový knír" },
  { id: "scar",       label: "jizva přes oko" },
  { id: "unibrow",    label: "jedno obří obočí" },
  { id: "tinyHead",   label: "mrňavá hlava" },
  { id: "bigChin",    label: "obří brada" },
  { id: "redFace",    label: "úplně rudý obličej" },
  { id: "greenFace",  label: "zelený obličej" },
  { id: "thirdEar",   label: "třetí ucho na čele" },
  { id: "wonkyMouth", label: "křivá pusa" },
];

// Vlastní hlavní barva vlasů pokud vada neurčuje barvu
const HAIR_COLORS = ["#3a2a1a", "#0a0a0a", "#6b4423", "#caa472", "#888", "#d97"];

// Pseudonáhodný generátor (deterministický podle seedu) — ať jsou sestavy
// pokaždé stejné a vtipné, ne pokaždé jiné.
function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Komické křestní jména a příjmení (mix, ať to zní idiotsky)
const FIRST = [
  "Bohouš", "Pepa", "Lojza", "Standa", "Mirek", "Ferda", "Toník", "Kuba",
  "Honza", "Vašek", "Zdenál", "Borek", "Cyril", "Drahoš", "Emil", "Fanda",
  "Géza", "Hugo", "Ivoš", "Jarda", "Karlos", "Luboš", "Méďa", "Nácek",
  "Olda", "Péťos", "Radek", "Sváťa", "Tomáš", "Ujo", "Venca", "Žarko",
];
const LAST = [
  "Bramborák", "Tlučhuba", "Nudlička", "Pažout", "Kotrmelec", "Šťoura",
  "Drbálek", "Cmrkal", "Pšouk", "Vyžírka", "Klobása", "Mrkvička",
  "Hrnec", "Šidlo", "Tvaroh", "Žížala", "Kečup", "Brokolice", "Pingl",
  "Čmelák", "Pukavec", "Salám", "Trumbera", "Vrták", "Žvanil", "Křeček",
  "Buřtík", "Lízátko", "Šnek", "Pavouk", "Knedlík", "Frťan",
];

const POSITIONS = ["GK", "OBR", "OBR", "OBR", "OBR", "ZAL", "ZAL", "ZAL", "ZAL", "ÚT", "ÚT", "ÚT", "ZAL", "OBR"];

// Definice zemí: jméno, krátký kód, barvy dresu, síla (1-10), seed
const COUNTRY_DEFS = [
  { name: "DR KONGO",    code: "COD", shirt: "#1aa64b", shorts: "#0d5", skin: "#5a3a22", strength: 5, seed: 101 },
  { name: "BELGIE",      code: "BEL", shirt: "#e10000", shorts: "#111", skin: "#e8c0a0", strength: 8, seed: 102 },
  { name: "ŠPANĚLSKO",   code: "ESP", shirt: "#c60b1e", shorts: "#003", skin: "#e0b48f", strength: 9, seed: 103 },
  { name: "BRAZÍLIE",    code: "BRA", shirt: "#ffdf00", shorts: "#0033a0", skin: "#8a5a3a", strength: 9, seed: 104 },
  { name: "PARAGUAY",    code: "PAR", shirt: "#d52b1e", shorts: "#0038a8", skin: "#c89a76", strength: 5, seed: 105 },
  { name: "EGYPT",       code: "EGY", shirt: "#d40000", shorts: "#fff", skin: "#b07c50", strength: 6, seed: 106 },
  { name: "PANAMA",      code: "PAN", shirt: "#d21034", shorts: "#005293", skin: "#a9784f", strength: 4, seed: 107 },
  { name: "ČESKO",       code: "CZE", shirt: "#d7141a", shorts: "#11457e", skin: "#e6bd9a", strength: 6, seed: 108 },
  { name: "ANGLIE",      code: "ENG", shirt: "#ffffff", shorts: "#11457e", skin: "#e8c0a0", strength: 8, seed: 109 },
  { name: "MAROKO",      code: "MAR", shirt: "#c1272d", shorts: "#006233", skin: "#b07c50", strength: 7, seed: 110 },
  { name: "TUNISKO",     code: "TUN", shirt: "#e70013", shorts: "#fff", skin: "#b88652", strength: 5, seed: 111 },
  { name: "ŠVÉDSKO",     code: "SWE", shirt: "#005293", shorts: "#fecb00", skin: "#f0d0b0", strength: 6, seed: 112 },
  { name: "USA",         code: "USA", shirt: "#ffffff", shorts: "#0a3161", skin: "#dcae8a", strength: 6, seed: 113 },
  { name: "PORTUGALSKO", code: "POR", shirt: "#c8102e", shorts: "#006600", skin: "#d8a878", strength: 9, seed: 114 },
  { name: "MEXIKO",      code: "MEX", shirt: "#006847", shorts: "#fff", skin: "#b98a5e", strength: 7, seed: 115 },
  { name: "URUGUAY",     code: "URU", shirt: "#7bb0e0", shorts: "#111", skin: "#d8b48f", strength: 7, seed: 116 },
];

function buildSquad(def) {
  const r = rng(def.seed);
  const players = [];
  const usedNames = new Set();
  for (let i = 0; i < 14; i++) {
    let name;
    do {
      name = FIRST[Math.floor(r() * FIRST.length)] + " " +
             LAST[Math.floor(r() * LAST.length)];
    } while (usedNames.has(name));
    usedNames.add(name);

    const defect = DEFECTS[Math.floor(r() * DEFECTS.length)];
    const hair = HAIR_COLORS[Math.floor(r() * HAIR_COLORS.length)];
    players.push({
      name,
      number: i === 0 ? 1 : i + 1,
      pos: POSITIONS[i],
      defect: defect.id,
      defectLabel: defect.text || defect.label,
      hair,
      // herní atributy
      speed: 0.7 + r() * 0.6,
      skill: 0.5 + r() * 0.5,
    });
  }
  return players;
}

// Sestavíme finální seznam zemí se sestavami
const COUNTRIES = COUNTRY_DEFS.map((def) => ({
  ...def,
  squad: buildSquad(def),
}));

function getCountry(name) {
  return COUNTRIES.find((c) => c.name === name);
}
