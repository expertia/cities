/* ===========================================================================
   faces.js — kreslení vtipných obličejů s vadami
   drawFace(ctx, x, y, r, player, skin)  — velký obličej do soupisky
   ===========================================================================*/

function defectHairColor(player) {
  switch (player.defect) {
    case "blueHair":  return "#1e90ff";
    case "greenHair": return "#2ecc40";
    case "pinkHair":  return "#ff4fc3";
    case "rainbow":   return "rainbow";
    case "bald":      return null;
    default:          return player.hair;
  }
}

function drawFace(ctx, x, y, r, player, skin) {
  ctx.save();
  ctx.translate(x, y);

  // velikost hlavy (mrňavá hlava = vada)
  let scale = 1;
  if (player.defect === "tinyHead") scale = 0.6;
  r = r * scale;

  // barva obličeje
  let face = skin || "#e8c0a0";
  if (player.defect === "redFace") face = "#e74c3c";
  if (player.defect === "greenFace") face = "#7ec850";

  // krk
  ctx.fillStyle = face;
  ctx.fillRect(-r * 0.25, r * 0.6, r * 0.5, r * 0.6);

  // hlava
  ctx.beginPath();
  ctx.fillStyle = face;
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // obří brada
  if (player.defect === "bigChin") {
    ctx.beginPath();
    ctx.fillStyle = face;
    ctx.ellipse(0, r * 0.7, r * 0.7, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // uši
  const earR = player.defect === "bigEars" ? r * 0.5 : r * 0.22;
  ctx.beginPath();
  ctx.fillStyle = face;
  ctx.arc(-r * 0.95, 0, earR, 0, Math.PI * 2);
  ctx.arc(r * 0.95, 0, earR, 0, Math.PI * 2);
  ctx.fill();

  // třetí ucho na čele
  if (player.defect === "thirdEar") {
    ctx.beginPath();
    ctx.fillStyle = face;
    ctx.arc(0, -r * 0.85, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // vlasy
  const hc = defectHairColor(player);
  if (hc) {
    if (hc === "rainbow") {
      const cols = ["#e74c3c", "#f39c12", "#f1c40f", "#2ecc40", "#1e90ff", "#9b59b6"];
      for (let i = 0; i < cols.length; i++) {
        ctx.beginPath();
        ctx.fillStyle = cols[i];
        const a0 = Math.PI + (Math.PI / cols.length) * i;
        const a1 = Math.PI + (Math.PI / cols.length) * (i + 1);
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r * 1.15, a0, a1);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.fillStyle = hc;
      ctx.arc(0, -r * 0.15, r * 1.05, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
    }
  }

  // obočí / jednočáří
  ctx.strokeStyle = "#222";
  ctx.lineWidth = Math.max(2, r * 0.08);
  if (player.defect === "unibrow") {
    ctx.beginPath();
    ctx.lineWidth = r * 0.18;
    ctx.moveTo(-r * 0.55, -r * 0.35);
    ctx.lineTo(r * 0.55, -r * 0.35);
    ctx.stroke();
    ctx.lineWidth = Math.max(2, r * 0.08);
  }

  // oči
  const eyeY = -r * 0.1;
  const drawEye = (ex, cross) => {
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(ex, eyeY, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#111";
    const px = cross ? ex + r * 0.1 * (ex < 0 ? 1 : -1) : ex;
    ctx.arc(px, eyeY, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  };

  if (player.defect === "oneEye") {
    drawEye(0, false);
  } else if (player.defect === "threeEyes") {
    drawEye(-r * 0.45, false);
    drawEye(r * 0.45, false);
    drawEye(0, false); // třetí uprostřed dole/nahoře
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(0, -r * 0.5, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#111";
    ctx.arc(0, -r * 0.5, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const cross = player.defect === "crossEyed";
    drawEye(-r * 0.4, cross);
    drawEye(r * 0.4, cross);
  }

  // monokl / jizva
  if (player.defect === "scar") {
    ctx.beginPath();
    ctx.strokeStyle = "#a33";
    ctx.lineWidth = r * 0.08;
    ctx.moveTo(-r * 0.55, -r * 0.45);
    ctx.lineTo(-r * 0.25, r * 0.2);
    ctx.stroke();
  }

  // nos
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  if (player.defect === "bigNose") {
    ctx.beginPath();
    ctx.fillStyle = face;
    ctx.strokeStyle = "#222";
    ctx.lineWidth = r * 0.05;
    ctx.ellipse(0, r * 0.15, r * 0.3, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.strokeStyle = "#222";
    ctx.lineWidth = r * 0.06;
    ctx.moveTo(0, eyeY + r * 0.05);
    ctx.lineTo(0, r * 0.2);
    ctx.stroke();
  }

  // knír
  if (player.defect === "moustache") {
    ctx.beginPath();
    ctx.fillStyle = "#9b59b6";
    ctx.ellipse(0, r * 0.4, r * 0.45, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // pusa
  ctx.strokeStyle = "#922";
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  if (player.defect === "wonkyMouth") {
    ctx.moveTo(-r * 0.35, r * 0.5);
    ctx.lineTo(0, r * 0.35);
    ctx.lineTo(r * 0.35, r * 0.55);
  } else if (player.defect === "noTooth") {
    ctx.moveTo(-r * 0.35, r * 0.5);
    ctx.quadraticCurveTo(0, r * 0.7, r * 0.35, r * 0.5);
    ctx.stroke();
    // chybějící zub
    ctx.fillStyle = "#fff";
    ctx.fillRect(-r * 0.05, r * 0.5, r * 0.12, r * 0.12);
    ctx.fillStyle = "#000";
    ctx.fillRect(r * 0.07, r * 0.5, r * 0.06, r * 0.12);
  } else {
    ctx.moveTo(-r * 0.35, r * 0.5);
    ctx.quadraticCurveTo(0, r * 0.7, r * 0.35, r * 0.5);
  }
  ctx.stroke();

  ctx.restore();
}
