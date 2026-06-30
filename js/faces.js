/* ============================================================
   VS — IDIOTSKÝ TURNAJ
   faces.js  —  kreslení bláznivých obličejů podle "vady"
   drawFace(ctx, cx, cy, r, player)  — r = poloměr hlavy
   ============================================================ */

function drawFace(ctx, cx, cy, r, player) {
  const d = player.defect;
  let skin = player.skin;
  let headR = r;

  // ----- speciální tvary hlavy / kůže -----
  if (d === "greenSkin") skin = "#5bbf5b";
  if (d === "bigHead")  headR = r * 1.35;
  if (d === "tinyHead") headR = r * 0.62;

  ctx.save();

  // dlouhý žirafí krk
  if (d === "longNeck") {
    ctx.fillStyle = skin;
    ctx.fillRect(cx - r * 0.18, cy, r * 0.36, r * 1.6);
  }

  // ----- hlava -----
  ctx.beginPath();
  ctx.arc(cx, cy, headR, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.stroke();

  // ----- vlasy -----
  let hair = player.hair;
  if (d === "blueHair") hair = "#1e9bff";
  if (d === "pinkHair") hair = "#ff5fc4";

  if (d === "oneHair") {
    // plešoun s jediným vlasem
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - headR);
    ctx.quadraticCurveTo(cx + 6, cy - headR - 14, cx - 2, cy - headR - 20);
    ctx.stroke();
  } else {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(cx, cy - headR * 0.35, headR, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    // ofina
    ctx.fillRect(cx - headR, cy - headR * 0.9, headR * 2, headR * 0.5);
  }

  // jednorožčí roh
  if (d === "horn") {
    ctx.fillStyle = "#ffd54a";
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.2, cy - headR);
    ctx.lineTo(cx + headR * 0.2, cy - headR);
    ctx.lineTo(cx, cy - headR - headR * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  // ----- uši -----
  const earY = cy;
  if (d === "bigEar") {
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(cx + headR, earY, headR * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - headR, earY, headR * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (d === "thirdEar") {
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(cx, cy - headR * 0.7, headR * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(cx - headR, earY, headR * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + headR, earY, headR * 0.18, 0, Math.PI * 2); ctx.fill();
  }

  // ----- oči -----
  const eyeY = cy - headR * 0.1;
  const eo = headR * 0.4; // eye offset
  const eyeR = headR * 0.18;
  const drawEye = (ex, ey, rr) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(ex, ey, rr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath(); ctx.arc(ex, ey, rr * 0.5, 0, Math.PI * 2); ctx.fill();
  };

  if (d === "oneEye") {
    drawEye(cx, eyeY, eyeR * 1.6);
  } else if (d === "threeEyes") {
    drawEye(cx - eo, eyeY, eyeR);
    drawEye(cx + eo, eyeY, eyeR);
    drawEye(cx, eyeY - headR * 0.5, eyeR);
  } else if (d === "stalkEyes") {
    ctx.strokeStyle = skin; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx - eo, eyeY); ctx.lineTo(cx - eo, eyeY - headR * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + eo, eyeY); ctx.lineTo(cx + eo, eyeY - headR * 0.7); ctx.stroke();
    drawEye(cx - eo, eyeY - headR * 0.7, eyeR);
    drawEye(cx + eo, eyeY - headR * 0.7, eyeR);
  } else if (d === "starEye") {
    drawEye(cx - eo, eyeY, eyeR);
    // hvězdné oko
    ctx.fillStyle = "#ffd54a";
    drawStar(ctx, cx + eo, eyeY, 5, eyeR * 1.1, eyeR * 0.5);
  } else {
    drawEye(cx - eo, eyeY, eyeR);
    drawEye(cx + eo, eyeY, eyeR);
  }

  // monobrv
  if (d === "unibrow") {
    ctx.strokeStyle = "#2a1a0a"; ctx.lineWidth = headR * 0.18;
    ctx.beginPath();
    ctx.moveTo(cx - eo * 1.3, eyeY - headR * 0.35);
    ctx.lineTo(cx + eo * 1.3, eyeY - headR * 0.35);
    ctx.stroke();
  }

  // ----- nos -----
  if (d === "clownNose") {
    ctx.fillStyle = "#ff2b2b";
    ctx.beginPath(); ctx.arc(cx, cy + headR * 0.2, headR * 0.22, 0, Math.PI * 2); ctx.fill();
  } else if (d === "bigNose") {
    ctx.fillStyle = shade(skin, -20);
    ctx.beginPath(); ctx.arc(cx, cy + headR * 0.25, headR * 0.3, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = shade(skin, -30); ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy + headR * 0.25);
    ctx.stroke();
  }

  // fialový knír
  if (d === "mustache") {
    ctx.fillStyle = "#7b2fbf";
    ctx.beginPath();
    ctx.ellipse(cx, cy + headR * 0.45, headR * 0.5, headR * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ----- pusa -----
  ctx.strokeStyle = "#7a2a2a"; ctx.lineWidth = 2; ctx.fillStyle = "#7a2a2a";
  if (d === "crookMouth") {
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.4, cy + headR * 0.5);
    ctx.lineTo(cx + headR * 0.3, cy + headR * 0.62);
    ctx.stroke();
  } else if (d === "crookTeeth") {
    ctx.fillStyle = "#fff";
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(cx + i * headR * 0.22 - 3, cy + headR * 0.45 + (i === 0 ? 4 : 0), 6, 8);
    }
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy + headR * 0.42, headR * 0.3, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

function drawStar(ctx, cx, cy, spikes, outer, inner) {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  for (let i = 0; i < spikes; i++) {
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  }
  ctx.closePath();
  ctx.fill();
}

/* zesvětlení / ztmavení hex barvy */
function shade(hex, amt) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(x => x + x).join("");
  let r = Math.max(0, Math.min(255, parseInt(c.substr(0,2),16) + amt));
  let g = Math.max(0, Math.min(255, parseInt(c.substr(2,2),16) + amt));
  let b = Math.max(0, Math.min(255, parseInt(c.substr(4,2),16) + amt));
  return "#" + [r,g,b].map(x => x.toString(16).padStart(2,"0")).join("");
}
