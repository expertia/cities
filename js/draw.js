/* ============================================================
   VS — IDIOTSKÝ TURNAJ
   draw.js : kreslení obličejů hráčů (portréty) + jejich vad
   ============================================================ */
(function (VS) {
  "use strict";

  // Nakreslí "portrét" hráče se zvolenou vadou.
  // ctx, cx, cy = střed hlavy, R = poloměr hlavy
  VS.drawFace = function (ctx, cx, cy, R, player, jersey) {
    var quirk = player.quirk;
    var skin = player.skin;
    var hair = player.hair;

    // ---- velikost hlavy podle vady
    var headR = R;
    if (quirk === "maleHlavicka") headR = R * 0.6;
    if (quirk === "obriHlava") headR = R * 1.35;
    if (quirk === "greenVlasy") {} // no-op

    // ---- dres / krk
    ctx.fillStyle = jersey || "#cccccc";
    ctx.beginPath();
    ctx.arc(cx, cy + headR * 1.5, headR * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // ---- skin / hlava
    var faceSkin = skin;
    if (quirk === "zelenaKuze") faceSkin = "#7cb342";
    if (quirk === "modraKuze") faceSkin = "#5c9ce0";
    if (quirk === "bledy") faceSkin = "#eceae0";
    ctx.fillStyle = faceSkin;
    if (quirk === "vejcitaHlava") {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(0.85, 1.25);
      ctx.beginPath(); ctx.arc(0, 0, headR, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(cx, cy, headR, 0, Math.PI * 2); ctx.fill();
    }

    // ---- uši (obří uši)
    var earR = quirk === "obriUsi" ? headR * 0.6 : headR * 0.25;
    ctx.fillStyle = faceSkin;
    ctx.beginPath(); ctx.arc(cx - headR, cy, earR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + headR, cy, earR, 0, Math.PI * 2); ctx.fill();

    // ---- vlasy
    var hairColor = hair;
    if (quirk === "modreVlasy") hairColor = "#1e88e5";
    if (quirk === "zeleneVlasy") hairColor = "#43a047";
    if (quirk === "ruzoveVlasy") hairColor = "#ec407a";
    if (quirk === "fialoveVlasy") hairColor = "#8e24aa";

    if (quirk === "plesatyLesk") {
      // lesklá pleš
      var g = ctx.createRadialGradient(cx - headR * 0.3, cy - headR * 0.6, 2, cx, cy, headR);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(0.3, faceSkin);
      g.addColorStop(1, faceSkin);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy - headR * 0.1, headR * 0.95, Math.PI, 0);
      ctx.fill();
    } else if (quirk === "rohyVlasy") {
      // špičaté rohy
      ctx.fillStyle = hairColor;
      for (var k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(cx + k * headR * 0.32 - headR * 0.12, cy - headR * 0.7);
        ctx.lineTo(cx + k * headR * 0.32, cy - headR * 1.5);
        ctx.lineTo(cx + k * headR * 0.32 + headR * 0.12, cy - headR * 0.7);
        ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(cx, cy - headR * 0.15, headR * 1.02, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
    }

    // ---- oči
    var eyeY = cy - headR * 0.05;
    var eyeOff = headR * 0.4;
    var eyeR = headR * 0.22;

    function eye(ex, ey, er, pupilDx) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath(); ctx.arc(ex + (pupilDx || 0), ey, er * 0.5, 0, Math.PI * 2); ctx.fill();
    }

    if (quirk === "jednoOko") {
      eye(cx, eyeY, eyeR * 1.6, 0); // jedno velké uprostřed
    } else if (quirk === "triOci") {
      eye(cx - eyeOff, eyeY, eyeR, 0);
      eye(cx + eyeOff, eyeY, eyeR, 0);
      eye(cx, eyeY - headR * 0.5, eyeR * 0.9, 0); // třetí na čele
    } else if (quirk === "silhave") {
      eye(cx - eyeOff, eyeY, eyeR, eyeR * 0.4);
      eye(cx + eyeOff, eyeY, eyeR, -eyeR * 0.4);
    } else if (quirk === "krivaOci") {
      eye(cx - eyeOff, eyeY - headR * 0.12, eyeR * 1.2, 0);
      eye(cx + eyeOff, eyeY + headR * 0.15, eyeR * 0.7, 0);
    } else {
      eye(cx - eyeOff, eyeY, eyeR, 0);
      eye(cx + eyeOff, eyeY, eyeR, 0);
    }

    // ---- obočí (unibrow / monobrew)
    if (quirk === "obrvi" || quirk === "monobrew") {
      ctx.strokeStyle = hairColor;
      ctx.lineWidth = headR * 0.18;
      ctx.beginPath();
      ctx.moveTo(cx - eyeOff - eyeR, eyeY - headR * 0.35);
      ctx.lineTo(cx + eyeOff + eyeR, eyeY - headR * 0.35);
      ctx.stroke();
    }

    // ---- nos
    ctx.fillStyle = quirk === "cervenyOblicej" ? "#e53935" : faceSkin;
    var noseR = quirk === "velkyNos" ? headR * 0.38 : headR * 0.14;
    ctx.beginPath(); ctx.arc(cx, eyeY + headR * 0.4, noseR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.arc(cx, eyeY + headR * 0.4, noseR, 0, Math.PI * 2); ctx.stroke();

    // ---- knír
    if (quirk === "knir") {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.ellipse(cx, eyeY + headR * 0.62, headR * 0.55, headR * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- pusa
    var mouthY = cy + headR * 0.55;
    if (quirk === "zlatyZub") {
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.ellipse(cx, mouthY, headR * 0.35, headR * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(cx - headR * 0.06, mouthY - headR * 0.1, headR * 0.12, headR * 0.22);
    } else if (quirk === "dlouhyJazyk") {
      ctx.strokeStyle = "#7a3b2e"; ctx.lineWidth = headR * 0.08;
      ctx.beginPath(); ctx.arc(cx, mouthY, headR * 0.3, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      ctx.fillStyle = "#e57373";
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + headR * 0.45, headR * 0.13, headR * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (quirk === "cervenyOblicej") {
      ctx.strokeStyle = "#7a3b2e"; ctx.lineWidth = headR * 0.08;
      ctx.beginPath(); ctx.arc(cx, mouthY + headR * 0.1, headR * 0.28, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke();
    } else {
      ctx.strokeStyle = "#7a3b2e"; ctx.lineWidth = headR * 0.08;
      ctx.beginPath(); ctx.arc(cx, mouthY, headR * 0.28, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    }
  };

  // Lidsky čitelný popisek vady (do soupisky)
  VS.quirkLabel = function (q) {
    var m = {
      modreVlasy: "modré vlasy", zeleneVlasy: "zelené vlasy",
      ruzoveVlasy: "růžové vlasy", fialoveVlasy: "fialové vlasy",
      jednoOko: "jen jedno oko", triOci: "tři oči", silhave: "šilhá",
      krivaOci: "křivé oči", velkyNos: "obří nos", obriUsi: "plachtí uši",
      knir: "absurdní knír", obrvi: "srostlé obočí", plesatyLesk: "lesklá pleš",
      zelenaKuze: "zelená kůže", modraKuze: "modrá kůže", zlatyZub: "zlatý zub",
      maleHlavicka: "mrňavá hlava", obriHlava: "obří hlava", rohyVlasy: "rohy z vlasů",
      vejcitaHlava: "vejčitá hlava", dlouhyJazyk: "vyplazený jazyk",
      monobrew: "srostlé obočí", bledy: "průsvitně bledý", cervenyOblicej: "rudý obličej"
    };
    return m[q] || q;
  };

})(window.VS = window.VS || {});
