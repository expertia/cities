/* ============================================================
   VS — IDIOTSKÝ TURNAJ
   teams.js  —  data 16 zemí + generátor bláznivých sestav
   ============================================================ */

/* Seznam možných "vad" (každý hráč dostane právě jednu).
   id se používá při kreslení obličeje ve funkci drawFace(). */
const DEFECTS = [
  { id: "blueHair",   label: "modré vlasy" },
  { id: "oneEye",     label: "jedno oko" },
  { id: "threeEyes",  label: "tři oči" },
  { id: "bigHead",    label: "obří hlava" },
  { id: "tinyHead",   label: "malinká hlava" },
  { id: "greenSkin",  label: "zelená kůže" },
  { id: "bigEar",     label: "jedno obří ucho" },
  { id: "clownNose",  label: "červený klaunský nos" },
  { id: "oneHair",    label: "plešoun s jedním vlasem" },
  { id: "crookTeeth", label: "křivé zuby" },
  { id: "horn",       label: "jednorožčí roh" },
  { id: "unibrow",    label: "obří monobrv" },
  { id: "mustache",   label: "fialový knír" },
  { id: "stalkEyes",  label: "oči na stopkách" },
  { id: "bigNose",    label: "obří nos" },
  { id: "pinkHair",   label: "růžové vlasy" },
  { id: "longNeck",   label: "žirafí krk" },
  { id: "crookMouth", label: "křivá pusa" },
  { id: "thirdEar",   label: "ucho na čele" },
  { id: "starEye",    label: "hvězdné oko" },
];

/* Definice 16 zemí: jméno, barvy dresu, síla (0-100),
   a pooly jmen pro generování sestavy. */
const COUNTRY_DATA = [
  { name: "DR KONGO",   short:"COD", c1:"#1675d1", c2:"#f7d417", strength:62,
    first:["Cédric","Yannick","Dieumerci","Chancel","Gaël","Arthur","Neeskens","Théo","Britt","Aaron","Jonathan"],
    last:["Bakambu","Mbemba","Mpeko","Wissa","Kakuta","Masuaku","Bongonda","Mubele","Ngonda","Lukoki","Tisserand"] },
  { name: "BELGIE",     short:"BEL", c1:"#e30613", c2:"#000000", strength:84,
    first:["Kevin","Romelu","Eden","Thibaut","Jan","Toby","Youri","Leandro","Jérémy","Thorgan","Axel"],
    last:["De Bruyne","Lukaku","Hazard","Courtois","Vertonghen","Alderweireld","Tielemans","Trossard","Doku","Mertens","Witsel"] },
  { name: "ŠPANĚLSKO",  short:"ESP", c1:"#c60b1e", c2:"#ffc400", strength:86,
    first:["Pedri","Gavi","Álvaro","Lamine","Rodri","Dani","Nico","Ferran","Mikel","Unai","Aymeric"],
    last:["Morata","Olmo","Williams","Yamal","Ruiz","Olmo","Torres","Merino","Oyarzabal","Simón","Laporte"] },
  { name: "BRAZÍLIE",   short:"BRA", c1:"#ffdf00", c2:"#009b3a", strength:88,
    first:["Vinícius","Rodrygo","Neymar","Casemiro","Marquinhos","Raphinha","Endrick","Bruno","Éder","Lucas","Antony"],
    last:["Júnior","Silva","Santos","Guimarães","Militão","Paquetá","Martinelli","Pereira","Telles","Fabinho","Bremer"] },
  { name: "PARAGUAY",   short:"PAR", c1:"#d52b1e", c2:"#0038a8", strength:58,
    first:["Miguel","Ángel","Gustavo","Antonio","Julio","Richard","Mathías","Omar","Robert","Diego","Junior"],
    last:["Almirón","Romero","Gómez","Sanabria","Enciso","Ortiz","Villasanti","Alderete","Morínigo","Gamarra","Cubas"] },
  { name: "EGYPT",      short:"EGY", c1:"#ce1126", c2:"#ffffff", strength:70,
    first:["Mohamed","Ahmed","Omar","Mahmoud","Trezeguet","Mostafa","Ramadan","Emam","Hamdi","Tarek","Karim"],
    last:["Salah","Hegazi","Marmoush","Trezeguet","Sobhi","Mohamed","Ashour","Fathi","Hamdy","Hassan","El-Sherif"] },
  { name: "PANAMA",     short:"PAN", c1:"#da121a", c2:"#005293", strength:52,
    first:["Adalberto","Aníbal","Michael","José","Édgar","Fidel","Cecilio","Harold","Ismael","Eric","Roderick"],
    last:["Carrasquilla","Godoy","Murillo","Fajardo","Bárcenas","Escobar","Waterman","Cummings","Díaz","Davis","Miller"] },
  { name: "ČESKO",      short:"CZE", c1:"#d7141a", c2:"#11457e", strength:68,
    first:["Patrik","Tomáš","Adam","Vladimír","Ladislav","Antonín","Pavel","Lukáš","Mojmír","Tomáš","David"],
    last:["Schick","Souček","Hložek","Coufal","Krejčí","Barák","Šulc","Provod","Chytil","Holeš","Doudera"] },
  { name: "ANGLIE",     short:"ENG", c1:"#ffffff", c2:"#cf081f", strength:87,
    first:["Harry","Jude","Bukayo","Phil","Declan","Marcus","Cole","Jordan","John","Kyle","Trent"],
    last:["Kane","Bellingham","Saka","Foden","Rice","Rashford","Palmer","Pickford","Stones","Walker","Alexander-Arnold"] },
  { name: "MAROKO",     short:"MAR", c1:"#c1272d", c2:"#006233", strength:74,
    first:["Achraf","Hakim","Youssef","Sofyan","Noussair","Romain","Azzedine","Bilal","Yassine","Brahim","Sofiane"],
    last:["Hakimi","Ziyech","En-Nesyri","Amrabat","Mazraoui","Saïss","Ounahi","El Khannouss","Bounou","Díaz","Boufal"] },
  { name: "TUNISKO",    short:"TUN", c1:"#e70013", c2:"#ffffff", strength:60,
    first:["Wahbi","Aïssa","Youssef","Hannibal","Montassar","Ali","Ellyes","Dylan","Mohamed","Naïm","Anis"],
    last:["Khazri","Laidouni","Msakni","Mejbri","Talbi","Maâloul","Skhiri","Bronn","Dräger","Sliti","Ben Slimane"] },
  { name: "ŠVÉDSKO",    short:"SWE", c1:"#fecc00", c2:"#005293", strength:66,
    first:["Alexander","Dejan","Viktor","Emil","Anthony","Victor","Jesper","Ludwig","Mattias","Robin","Isak"],
    last:["Isak","Kulusevski","Gyökeres","Forsberg","Elanga","Lindelöf","Karlström","Augustinsson","Svanberg","Olsen","Hien"] },
  { name: "USA",        short:"USA", c1:"#1c3f95", c2:"#b31942", strength:72,
    first:["Christian","Weston","Tyler","Gio","Tim","Yunus","Folarin","Antonee","Sergiño","Matt","Brenden"],
    last:["Pulisic","McKennie","Adams","Reyna","Weah","Musah","Balogun","Robinson","Dest","Turner","Aaronson"] },
  { name: "PORTUGALSKO",short:"POR", c1:"#006600", c2:"#da291c", strength:85,
    first:["Cristiano","Bruno","Bernardo","Rafael","Diogo","João","Rúben","Vitinha","Gonçalo","Nuno","Pedro"],
    last:["Ronaldo","Fernandes","Silva","Leão","Jota","Félix","Dias","Vitinha","Ramos","Mendes","Neto"] },
  { name: "MEXIKO",     short:"MEX", c1:"#006847", c2:"#ce1126", strength:71,
    first:["Hirving","Raúl","Edson","Santiago","Guillermo","César","Luis","Orbelín","Alexis","Jorge","Héctor"],
    last:["Lozano","Jiménez","Álvarez","Giménez","Ochoa","Montes","Chávez","Pineda","Vega","Sánchez","Moreno"] },
  { name: "URUGUAY",    short:"URU", c1:"#5aa9e6", c2:"#001489", strength:78,
    first:["Federico","Darwin","Ronald","Rodrigo","Giorgian","Nicolás","Manuel","Facundo","José","Sebastián","Maxi"],
    last:["Valverde","Núñez","Araújo","Bentancur","De Arrascaeta","De La Cruz","Ugarte","Pellistri","Giménez","Coates","Araújo"] },
];

const POSITIONS = ["GK","DEF","DEF","DEF","DEF","MID","MID","MID","FWD","FWD","FWD"];

/* deterministický pseudo-random podle seedu (aby sestavy byly pokaždé stejné) */
function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const SKIN_TONES = ["#f1c27d","#e0ac69","#c68642","#8d5524","#ffe0bd","#5a3a22"];
const HAIR_COLORS = ["#1a1a1a","#3b2a1a","#6b4423","#d4a017","#a83232","#2a2a2a"];

/* Vytvoří kompletní seznam týmů se sestavami */
function buildTeams() {
  return COUNTRY_DATA.map((cd, ci) => {
    const rnd = seededRand((ci + 1) * 97 + 13);
    const players = [];
    for (let i = 0; i < 11; i++) {
      const first = cd.first[i % cd.first.length];
      const last = cd.last[i % cd.last.length];
      // každému hráči přiřadíme jednu vadu, s rotací podle týmu pro pestrost
      const defect = DEFECTS[(ci * 7 + i * 3) % DEFECTS.length];
      players.push({
        name: first + " " + last,
        num: i === 0 ? 1 : i + 1,
        pos: POSITIONS[i],
        defect: defect.id,
        defectLabel: defect.label,
        skin: SKIN_TONES[Math.floor(rnd() * SKIN_TONES.length)],
        hair: HAIR_COLORS[Math.floor(rnd() * HAIR_COLORS.length)],
      });
    }
    return {
      name: cd.name,
      short: cd.short,
      c1: cd.c1,          // hlavní barva dresu
      c2: cd.c2,          // doplňková barva
      strength: cd.strength,
      players,
    };
  });
}

const TEAMS = buildTeams();
