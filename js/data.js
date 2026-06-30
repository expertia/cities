/* ============================================================
   VS — IDIOTSKÝ TURNAJ
   data.js : země, soupisky hráčů a jejich "vady"
   ============================================================ */
(function (VS) {
  "use strict";

  // Seznam možných "vad" (každý hráč má právě jednu).
  // Použito při kreslení obličeje (viz draw.js).
  VS.QUIRKS = [
    "modreVlasy", "zelene Vlasy", "ruzoveVlasy", "fialoveVlasy",
    "jednoOko", "triOci", "silhave", "krivaOci",
    "velkyNos", "obriUsi", "knir", "obrvi",
    "plesatyLesk", "zelenaKuze", "modraKuze", "zlatyZub",
    "maleHlavicka", "obriHlava", "rohyVlasy", "vejcitaHlava",
    "dlouhyJazyk", "monobrew", "bledy", "cervenyOblicej"
  ].map(function (s) { return s.replace(/\s+/g, ""); });

  // Sdílený fond křestních jmen (komediálně laděný)
  var FIRST = [
    "Bořek", "Pepa", "Standa", "Mirek", "Lojza", "Kuba", "Tonda",
    "Zdenál", "Béďa", "Ferda", "Vašek", "Honza", "Áda", "Cyril",
    "Norbert", "Bohouš", "Květoš", "Drahoš", "Slávek", "Igor",
    "Olda", "Rudla", "Gusta", "Emil", "Toník", "Venca", "Karlos"
  ];

  // Pro každou zemi: kód, jméno, barvy dresu, síla (1-10) a fond příjmení.
  var C = VS.COUNTRIES = {};

  function mk(code, name, jersey, shorts, accent, strength, surnames) {
    C[code] = {
      code: code, name: name,
      jersey: jersey, shorts: shorts, accent: accent,
      strength: strength, surnames: surnames, squad: null
    };
  }

  mk("KONGO", "DR KONGO", "#1565c0", "#c62828", "#ffeb3b", 6,
    ["Mbongo", "Kabila", "Lukaku", "Tshibola", "Mokwa", "Bakambu", "Ndombe", "Kalala", "Mubele", "Zulu", "Kongolo", "Ngoma"]);
  mk("BELGIE", "BELGIE", "#d32f2f", "#212121", "#ffd600", 9,
    ["DeBruyne", "Lukoš", "Hazardus", "Vermaelo", "Mertska", "Witsko", "Tielens", "Carrasco", "Doku", "Onana", "Praet", "Batshu"]);
  mk("SPAN", "ŠPANĚLSKO", "#c62828", "#1a237e", "#ffca28", 9,
    ["Rodrigez", "Pedrito", "Gavča", "Moráto", "Olmoš", "Yamalka", "Merino", "Fabián", "Asensiš", "Carvajo", "Llorenš", "Torres"]);
  mk("BRAZIL", "BRAZÍLIE", "#fdd835", "#1565c0", "#2e7d32", 10,
    ["Neymárek", "Vinícek", "Rodrygó", "Casemíro", "Marquinš", "Danilho", "Raphínha", "Antonyš", "Brunoš", "Ederzon", "Gabigól", "Paquetá"]);
  mk("PARAG", "PARAGUAY", "#c62828", "#eceff1", "#1565c0", 5,
    ["Almirón", "Sanabria", "Romeral", "Gómez", "Cubas", "Bareiro", "Espínola", "Villasanti", "Enciso", "Alderete", "Balbuena", "Morel"]);
  mk("EGYPT", "EGYPT", "#d32f2f", "#eceff1", "#212121", 6,
    ["Saláh", "Trezegé", "Elneny", "Hegazi", "Marmúš", "Zizó", "Kahraba", "Fathy", "Sobhi", "Gabaski", "Hamdy", "Mostafa"]);
  mk("PANAMA", "PANAMA", "#c62828", "#1a237e", "#eceff1", 4,
    ["Barceník", "Murillo", "Carrasquel", "Davis", "Fajardo", "Quintero", "Godoy", "Tanner", "Rodríguez", "Mosquera", "Waterman", "Cox"]);
  mk("CESKO", "ČESKO", "#d32f2f", "#0d47a1", "#eceff1", 7,
    ["Schicková", "Součas", "Krejčál", "Hložek", "Provod", "Barák", "Coufík", "Holeš", "Černý", "Jurásek", "Doudera", "Šulc"]);
  mk("ANGLIE", "ANGLIE", "#fafafa", "#1a237e", "#d32f2f", 9,
    ["Kaňový", "Bellingham", "Foden", "Sterlík", "Riceš", "Stones", "Walkr", "Saka", "Maguájr", "Pickfo", "Trippí", "Mount"]);
  mk("MAROKO", "MAROKO", "#c62828", "#2e7d32", "#eceff1", 8,
    ["Hakímál", "Ziyech", "Amrabš", "En-Nesyri", "Ounahí", "Mazraúí", "Saísš", "Boufál", "Aguerd", "Bono", "Cheddíra", "Adlí"]);
  mk("TUNIS", "TUNISKO", "#d32f2f", "#eceff1", "#212121", 5,
    ["Khazrí", "Msakní", "Sliti", "Maaloul", "Skhiri", "Laidouní", "Jebalí", "Bronn", "Talbí", "Dahmen", "Hannibal", "Drager"]);
  mk("SVED", "ŠVÉDSKO", "#fbc02d", "#1565c0", "#eceff1", 7,
    ["Ibrahimál", "Isaak", "Forsbergš", "Kuluseski", "Lindelöf", "Olsenš", "Elanga", "Gyökeres", "Bergval", "Olsson", "Svensbík", "Claesson"]);
  mk("USA", "USA", "#fafafa", "#1a237e", "#c62828", 7,
    ["Pulišič", "McKennie", "Reyna", "Weah", "Adams", "Robinson", "Dest", "Musálek", "Balogun", "Turner", "Aaronson", "Richards"]);
  mk("PORT", "PORTUGALSKO", "#c62828", "#2e7d32", "#ffd600", 10,
    ["Ronaldós", "Bruno", "Lého", "Bernardó", "Cancela", "Diasš", "Joáo", "Vitínha", "Neves", "Costa", "Ramoš", "Pepál"]);
  mk("MEXIKO", "MEXIKO", "#2e7d32", "#eceff1", "#c62828", 6,
    ["Lozáno", "Chuchál", "Vega", "Álvarez", "Antuna", "Giménez", "Pineda", "Sánchez", "Arteaga", "Ochovský", "Romo", "Gallardo"]);
  mk("URUG", "URUGUAY", "#4fc3f7", "#212121", "#eceff1", 8,
    ["Suárál", "Núňez", "Valverde", "Bentancur", "Pellistri", "Aráujo", "Olivera", "DeLaCruz", "Cavanál", "Rochet", "Giménez", "Ugarte"]);

  // Pozice ve formaci 4-3-3
  VS.FORMATION = [
    { role: "GK", label: "Brankář" },
    { role: "DEF", label: "Obránce" }, { role: "DEF", label: "Obránce" },
    { role: "DEF", label: "Obránce" }, { role: "DEF", label: "Obránce" },
    { role: "MID", label: "Záložník" }, { role: "MID", label: "Záložník" },
    { role: "MID", label: "Záložník" },
    { role: "FWD", label: "Útočník" }, { role: "FWD", label: "Útočník" },
    { role: "FWD", label: "Útočník" }
  ];

  // Deterministický mini-generátor (aby byly soupisky stejné po reloadu)
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }

  // Vytvoří soupisku pro zemi: 11 hráčů, každý 1 vada.
  VS.buildSquad = function (country) {
    if (country.squad) return country.squad;
    var seed = hashStr(country.code);
    var squad = [];
    for (var i = 0; i < 11; i++) {
      var fn = FIRST[(seed + i * 7) % FIRST.length];
      var sn = country.surnames[i % country.surnames.length];
      var quirk = VS.QUIRKS[(seed + i * 5 + 3) % VS.QUIRKS.length];
      var skin = ["#f4c89a", "#e0a877", "#caa472", "#a87543", "#7a5230"][(seed + i * 3) % 5];
      var hair = ["#2b1b0e", "#4a2c12", "#161616", "#6d4c2f", "#8a8a8a"][(seed + i * 2) % 5];
      squad.push({
        num: i + 1,
        name: fn + " " + sn,
        role: VS.FORMATION[i].role,
        label: VS.FORMATION[i].label,
        quirk: quirk,
        skin: skin,
        hair: hair,
        rating: Math.max(2, Math.min(10, country.strength + ((seed + i) % 5) - 2))
      });
    }
    country.squad = squad;
    return squad;
  };

  VS.allCountryCodes = function () { return Object.keys(C); };

})(window.VS = window.VS || {});
