/* ==========================================================================
   VS - IDIOTSKÝ TURNAJ
   teams.js  ->  data zemí, generování bláznivých sestav, kreslení hráčů
   ========================================================================== */

/* ---- deterministický random generátor (mulberry32) ---------------------- */
function hashStr(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- 16 zemí turnaje ----------------------------------------------------- */
/* shirt = dres, shorts = trenky, gk = dres brankáře, str = síla (0-100) */
const COUNTRIES = [
  { name: 'DR KONGO',    short: 'KON', flag: '🇨🇩', shirt: '#0b6cd4', shorts: '#e1132c', gk: '#f4d000', str: 71 },
  { name: 'BELGIE',      short: 'BEL', flag: '🇧🇪', shirt: '#e30613', shorts: '#111111', gk: '#f4c400', str: 83 },
  { name: 'ŠPANĚLSKO',   short: 'ESP', flag: '🇪🇸', shirt: '#c60b1e', shorts: '#0b2ec6', gk: '#1d8a32', str: 86 },
  { name: 'BRAZÍLIE',    short: 'BRA', flag: '🇧🇷', shirt: '#f7d600', shorts: '#0a4ca3', gk: '#1aa64a', str: 88 },
  { name: 'PARAGUAY',    short: 'PAR', flag: '🇵🇾', shirt: '#d52b1e', shorts: '#0038a8', gk: '#23272a', str: 68 },
  { name: 'EGYPT',       short: 'EGY', flag: '🇪🇬', shirt: '#d81e26', shorts: '#ffffff', gk: '#111111', str: 70 },
  { name: 'PANAMA',      short: 'PAN', flag: '🇵🇦', shirt: '#d21034', shorts: '#072357', gk: '#d8d8d8', str: 64 },
  { name: 'ČESKO',       short: 'CZE', flag: '🇨🇿', shirt: '#d7141a', shorts: '#11457e', gk: '#e0e0e0', str: 74 },
  { name: 'ANGLIE',      short: 'ENG', flag: '🏴', shirt: '#ffffff', shorts: '#11317a', gk: '#444444', str: 85 },
  { name: 'MAROKO',      short: 'MAR', flag: '🇲🇦', shirt: '#c1272d', shorts: '#0a6b3b', gk: '#1aa64a', str: 76 },
  { name: 'TUNISKO',     short: 'TUN', flag: '🇹🇳', shirt: '#e70013', shorts: '#ffffff', gk: '#23272a', str: 67 },
  { name: 'ŠVÉDSKO',     short: 'SWE', flag: '🇸🇪', shirt: '#f7d600', shorts: '#0a4ca3', gk: '#1d8a32', str: 75 },
  { name: 'USA',         short: 'USA', flag: '🇺🇸', shirt: '#ffffff', shorts: '#0a3161', gk: '#b31942', str: 77 },
  { name: 'PORTUGALSKO', short: 'POR', flag: '🇵🇹', shirt: '#7a0019', shorts: '#1a7a1a', gk: '#f4c400', str: 87 },
  { name: 'MEXIKO',      short: 'MEX', flag: '🇲🇽', shirt: '#1aa64a', shorts: '#ffffff', gk: '#d21034', str: 78 },
  { name: 'URUGUAY',     short: 'URU', flag: '🇺🇾', shirt: '#5aa9e6', shorts: '#23272a', gk: '#ffffff', str: 79 },
];

function countryByName(name) {
  return COUNTRIES.find(c => c.name === name);
}

/* ---- jména hráčů (komediální) ------------------------------------------- */
const FIRST_NAMES = ['Bořek', 'Mzee', 'Kwame', 'Diego', 'Youssef', 'Sven', 'Mateo',
  'Pepe', 'Hans', 'Tariq', 'Lars', 'Pavel', 'Honza', 'Hugo', 'Bongo', 'Mufasa',
  'Chad', 'Rico', 'Tonda', 'Vasil', 'Omar', 'Nils', 'Björn', 'Carlos', 'João',
  'Pedro', 'Cisco', 'Zlatko', 'Borna', 'Igor', 'Dragan', 'Fofo', 'Kiki', 'Bubu',
  'Nono', 'Lalo', 'Standa', 'Ferda', 'Aziz', 'Olaf'];
const LAST_NAMES = ['Brambora', 'Klobása', 'Vomáčka', 'Smradlavý', 'Kopačka',
  'Dlouhý', 'Křivonožka', 'Bezzubý', 'Modrý', 'Jednooký', 'Tlustý', 'Holohlavý',
  'Velkonos', 'Šišatý', 'Pivní', 'Buřtič', 'Nudlička', 'Mastný', 'Chrochta',
  'Pšoukal', 'Brepta', 'Cmrnda', 'Žvýkal', 'Kulhánek', 'Mrkva', 'Cibula',
  'Špekoun', 'Drchal', 'Trubka', 'Hovado', 'Lebka', 'Kostka', 'Šmudla',
  'Plešoun', 'Frňák', 'Ucho', 'Zíval', 'Pšenička', 'Koblih', 'Pařez'];

/* ---- katalog "vad" (každý hráč má přesně jednu) ------------------------- */
const DEFECTS = [
  { id: 'blueHair',  label: 'Modré vlasy' },
  { id: 'greenHair', label: 'Zelené vlasy' },
  { id: 'pinkHair',  label: 'Růžové vlasy' },
  { id: 'cyclops',   label: 'Jen jedno velké oko' },
  { id: 'threeEyes', label: 'Tři oči' },
  { id: 'bigNose',   label: 'Obří nos jak okurka' },
  { id: 'bigEars',   label: 'Uši jak slon' },
  { id: 'bald',      label: 'Úplně holá lesklá hlava' },
  { id: 'greenSkin', label: 'Zelená kůže' },
  { id: 'purpleSkin',label: 'Fialová kůže' },
  { id: 'crossEyed', label: 'Šilhavé oči' },
  { id: 'bigTeeth',  label: 'Obří přední zuby' },
  { id: 'monobrow',  label: 'Spojené obočí' },
  { id: 'mustache',  label: 'Knírek jak kartáč' },
  { id: 'scar',      label: 'Jizva přes celý obličej' },
  { id: 'alien',     label: 'Mimozemská hlava' },
];

const SKIN_TONES = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const HAIR_TONES = ['#2b2b2b', '#4a2c12', '#6b4423', '#111111', '#7a5230'];
const POSITIONS = ['GK', 'OBR', 'OBR', 'OBR', 'OBR', 'ZÁL', 'ZÁL', 'ZÁL', 'ÚT', 'ÚT', 'ÚT'];

/* vytvoří kompletní 11člennou sestavu pro zemi (deterministicky) */
function generateSquad(country) {
  const rnd = mulberry32(hashStr(country.name + '_squad'));
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const usedNames = new Set();
  const squad = [];
  for (let i = 0; i < 11; i++) {
    let nm;
    do { nm = pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES); } while (usedNames.has(nm));
    usedNames.add(nm);

    const defect = DEFECTS[Math.floor(rnd() * DEFECTS.length)];
    let skin = pick(SKIN_TONES);
    let hair = pick(HAIR_TONES);
    if (defect.id === 'blueHair') hair = '#1e6bff';
    if (defect.id === 'greenHair') hair = '#16c60c';
    if (defect.id === 'pinkHair') hair = '#ff4fd8';
    if (defect.id === 'greenSkin') skin = '#5fbf3a';
    if (defect.id === 'purpleSkin') skin = '#a85fd6';
    if (defect.id === 'alien') { skin = '#9ad96a'; hair = null; }
    if (defect.id === 'bald') hair = null;

    squad.push({
      name: nm,
      number: i === 0 ? 1 : i + (i < 5 ? 1 : 5), // jen kosmetika
      pos: POSITIONS[i],
      rating: Math.round(country.str - 10 + rnd() * 20),
      look: { skin, hair, hairStyle: Math.floor(rnd() * 3), defect: defect.id, defectLabel: defect.label },
    });
  }
  // čísla dresů 1..23 nahodile ale unikatní
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  squad.forEach((p, i) => { p.number = nums[i]; });
  return squad;
}

/* cache sestav */
const SQUAD_CACHE = {};
function getSquad(countryName) {
  if (!SQUAD_CACHE[countryName]) {
    SQUAD_CACHE[countryName] = generateSquad(countryByName(countryName));
  }
  return SQUAD_CACHE[countryName];
}

/* ==========================================================================
   Kreslení hráče (avatar čelem ke kameře) - sdílené squad obrazovkou i zápasem
   ctx, x,y = pozice nohou, s = měřítko, look, jersey={shirt,shorts}
   ========================================================================== */
function drawPlayerAvatar(ctx, x, y, s, look, jersey, opts) {
  opts = opts || {};
  const skin = look.skin;
  ctx.save();
  ctx.translate(x, y);

  // stín
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 9 * s, 3.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- nohy s animací běhu / kopací postoj ---
  const phase = opts.phase || 0;
  const moving = !!opts.moving;
  const faceX = Math.cos(opts.facing || 0);          // promítnutí směru do osy x
  const swing = moving ? Math.sin(phase) : 0;
  // hráč s míčem stojí v rozkročeném postoji, přední noha napřažená
  const rightFwd = opts.hasBall && faceX >= 0 ? 5 * s : 0;
  const leftFwd  = opts.hasBall && faceX < 0 ? -5 * s : 0;
  const lSwing = moving ? -swing : (opts.hasBall ? -0.35 : 0);
  const rSwing = moving ? swing : (opts.hasBall ? 0.35 : 0);
  drawLeg(ctx, -3 * s, -14 * s, s, lSwing, jersey.shorts, skin, leftFwd);
  drawLeg(ctx, 3 * s, -14 * s, s, rSwing, jersey.shorts, skin, rightFwd);

  // tělo (dres) - mírně realističtější tvar s rameny
  ctx.fillStyle = jersey.shirt;
  roundRect(ctx, -7.5 * s, -27 * s, 15 * s, 16 * s, 4 * s);
  ctx.fill();
  // límeček
  ctx.fillStyle = darken(jersey.shirt, 18);
  roundRect(ctx, -4 * s, -28 * s, 8 * s, 3 * s, 1.5 * s);
  ctx.fill();
  // číslo na dresu
  if (opts.number != null && s > 1.4) {
    ctx.fillStyle = pickReadable(jersey.shirt);
    ctx.font = `bold ${7 * s}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(opts.number, 0, -16 * s);
  }
  // ruce (rukáv dresu + předloktí)
  const armSwing = moving ? Math.sin(phase) * 2 * s : 0;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const sx = side * 8 * s;
    // rukáv
    ctx.strokeStyle = jersey.shirt; ctx.lineWidth = 3.4 * s;
    ctx.beginPath(); ctx.moveTo(side * 6.5 * s, -25 * s); ctx.lineTo(sx, -20 * s); ctx.stroke();
    // předloktí (kůže)
    ctx.strokeStyle = skin; ctx.lineWidth = 2.8 * s;
    ctx.beginPath(); ctx.moveTo(sx, -20 * s); ctx.lineTo(sx + side * 1 * s, -14 * s - armSwing * side); ctx.stroke();
  }

  // hlava
  const headY = -34 * s;
  const headR = (look.defect === 'alien' ? 9.5 : 7.5) * s;
  // uši (před hlavou pokud velké)
  if (look.defect === 'bigEars') {
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(-headR - 2 * s, headY, 4.5 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(headR + 2 * s, headY, 4.5 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(-headR + 1 * s, headY + 1 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(headR - 1 * s, headY + 1 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = skin;
  if (look.defect === 'alien') {
    ctx.beginPath(); ctx.ellipse(0, headY, headR, headR * 1.25, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI * 2); ctx.fill();
  }

  // vlasy
  if (look.hair) {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    if (look.hairStyle === 0) {
      // čupřina
      ctx.arc(0, headY - headR * 0.3, headR * 1.02, Math.PI, Math.PI * 2);
    } else if (look.hairStyle === 1) {
      // rozcuchané
      ctx.arc(0, headY - headR * 0.2, headR * 1.1, Math.PI * 0.92, Math.PI * 2.08);
    } else {
      // hladké
      ctx.arc(0, headY - headR * 0.45, headR * 0.98, Math.PI, Math.PI * 2);
    }
    ctx.fill();
  } else if (look.defect === 'bald') {
    // lesk na holé hlavě
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(-headR * 0.3, headY - headR * 0.4, headR * 0.35, headR * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
  }

  // obličej / vady
  const eyeY = headY;
  const eyeW = 1.5 * s, eyeDx = 3 * s;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000';
  function eye(ex, cross) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex, eyeY, eyeW, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    const px = cross ? ex + (ex < 0 ? eyeW * 0.6 : -eyeW * 0.6) : ex;
    ctx.beginPath(); ctx.arc(px, eyeY, eyeW * 0.55, 0, Math.PI * 2); ctx.fill();
  }

  if (look.defect === 'cyclops') {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, eyeY, 3.2 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(0, eyeY, 1.5 * s, 0, Math.PI * 2); ctx.fill();
  } else if (look.defect === 'threeEyes') {
    eye(-eyeDx, false); eye(eyeDx, false);
    eye(0, false);
  } else if (look.defect === 'crossEyed') {
    eye(-eyeDx, true); eye(eyeDx, true);
  } else if (look.defect === 'alien') {
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(-eyeDx, eyeY, 2 * s, 3 * s, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(eyeDx, eyeY, 2 * s, 3 * s, -0.3, 0, Math.PI * 2); ctx.fill();
  } else {
    eye(-eyeDx, false); eye(eyeDx, false);
  }

  // obočí (monobrow)
  if (look.defect === 'monobrow') {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(-eyeDx - eyeW, eyeY - 2.5 * s);
    ctx.lineTo(eyeDx + eyeW, eyeY - 2.5 * s);
    ctx.stroke();
  }

  // nos
  if (look.defect === 'bigNose') {
    ctx.fillStyle = darken(skin, 12);
    ctx.beginPath(); ctx.ellipse(0, eyeY + 3 * s, 2.2 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
  }

  // knírek
  if (look.defect === 'mustache') {
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(-3.2 * s, eyeY + 3 * s, 6.4 * s, 1.8 * s);
  }

  // zuby
  if (look.defect === 'bigTeeth') {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.5 * s;
    ctx.fillRect(-2.4 * s, eyeY + 4 * s, 2 * s, 3 * s);
    ctx.strokeRect(-2.4 * s, eyeY + 4 * s, 2 * s, 3 * s);
    ctx.fillRect(0.4 * s, eyeY + 4 * s, 2 * s, 3 * s);
    ctx.strokeRect(0.4 * s, eyeY + 4 * s, 2 * s, 3 * s);
  }

  // jizva
  if (look.defect === 'scar') {
    ctx.strokeStyle = '#b03030';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(-eyeDx - 1 * s, eyeY - 5 * s);
    ctx.lineTo(eyeDx + 1 * s, eyeY + 5 * s);
    ctx.stroke();
    // stehy
    ctx.lineWidth = 0.7 * s;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 1.6 * s - 1.5 * s, eyeY + i * 1.6 * s - 1 * s);
      ctx.lineTo(i * 1.6 * s + 1.5 * s, eyeY + i * 1.6 * s + 1 * s);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* noha: stehno (trenky) + lýtko (kůže) + kopačka, s animací */
function drawLeg(ctx, x, topY, s, swing, shorts, skin, footFwd) {
  footFwd = footFwd || 0;
  const hipY = topY, footY = 0;
  const kneeY = topY * 0.4;
  const footX = x + swing * 3 * s + footFwd;
  const kneeX = x + swing * 1.5 * s + footFwd * 0.5;
  ctx.lineCap = 'round';
  // stehno
  ctx.strokeStyle = shorts; ctx.lineWidth = 4.4 * s;
  ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(kneeX, kneeY); ctx.stroke();
  // lýtko
  ctx.strokeStyle = skin; ctx.lineWidth = 3.4 * s;
  ctx.beginPath(); ctx.moveTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
  // ponožka
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.4 * s;
  ctx.beginPath(); ctx.moveTo(footX, footY - 3 * s); ctx.lineTo(footX, footY - 0.5 * s); ctx.stroke();
  // kopačka
  ctx.fillStyle = '#161616';
  ctx.beginPath();
  ctx.ellipse(footX + Math.sign(footFwd || 0.001) * 1.4 * s, footY, 3.4 * s, 1.9 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* malé pomocné funkce */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function darken(hex, amt) {
  const c = hexToRgb(hex);
  return `rgb(${Math.max(0, c.r - amt * 2)},${Math.max(0, c.g - amt * 2)},${Math.max(0, c.b - amt * 2)})`;
}
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function pickReadable(bgHex) {
  const c = hexToRgb(bgHex);
  const lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b);
  return lum > 150 ? '#111' : '#fff';
}
