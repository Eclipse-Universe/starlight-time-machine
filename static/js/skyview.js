// Sky view: astronomical calculations + canvas rendering

const J2000_JD = 2451545.0;
const toRad = d => d * Math.PI / 180;
const toDeg = r => r * 180 / Math.PI;

function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function gmstDeg(date) {
  const jd = julianDate(date);
  const g  = 280.46061837 + 360.98564736629 * (jd - J2000_JD);
  return ((g % 360) + 360) % 360;
}

// RA/Dec (degrees) → Altitude/Azimuth (degrees) for observer at lat/lon
export function raDecToAltAz(raDeg, decDeg, latDeg, lonDeg, date) {
  const lstD = ((gmstDeg(date) + lonDeg) % 360 + 360) % 360;
  const ha   = toRad(((lstD - raDeg) % 360 + 360) % 360);
  const dec  = toRad(decDeg);
  const lat  = toRad(latDeg);

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt    = toDeg(Math.asin(Math.max(-1, Math.min(1, sinAlt))));

  const cosAlt = Math.cos(toRad(alt));
  const cosAz  = Math.abs(cosAlt) < 1e-9
    ? 0
    : (Math.sin(dec) - Math.sin(toRad(alt)) * Math.sin(lat)) / (cosAlt * Math.cos(lat));
  let az = toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  if (Math.sin(ha) > 0) az = 360 - az;

  return { alt, az };
}

const SPECTRAL_HEX = {
  O: '#9bb0ff', B: '#aabfff', A: '#cad7ff',
  F: '#fff4ea', G: '#ffd2a1', K: '#ff9f4a', M: '#ff6030',
};

function starColor(type)  { return SPECTRAL_HEX[type?.[0]] ?? '#ffffff'; }
function starRadius(mag) {
  if (mag < 0) return 5.5;
  if (mag < 1) return 4.5;
  if (mag < 2) return 3.5;
  if (mag < 3) return 2.5;
  return 2.0;
}
function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

// Draws the sky map onto canvas; returns count of stars above horizon
export function drawSkyCanvas(canvas, stars, location, now) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const R  = Math.min(W, H) / 2 - 52;

  ctx.clearRect(0, 0, W, H);

  // ── Background (clipped to circle) ──────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  bg.addColorStop(0,   '#070d22');
  bg.addColorStop(0.65,'#030a14');
  bg.addColorStop(1,   '#010609');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // ── Altitude rings ───────────────────────────────────────
  ctx.setLineDash([3, 8]);
  for (const alt of [30, 60]) {
    const r = R * (90 - alt) / 90;
    ctx.strokeStyle = 'rgba(74,158,255,0.13)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(74,158,255,0.28)';
    ctx.font = '10px "DM Mono"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${alt}°`, cx + r + 4, cy - 5);
    ctx.setLineDash([3, 8]);
  }
  ctx.setLineDash([]);

  // ── Horizon circle ───────────────────────────────────────
  ctx.strokeStyle = 'rgba(74,158,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // ── Cardinal / intercardinal labels ─────────────────────
  const DIR = [
    ['N', 0], ['NE', 45], ['E', 90], ['SE', 135],
    ['S', 180], ['SW', 225], ['W', 270], ['NW', 315],
  ];
  ctx.textBaseline = 'middle';
  for (const [lbl, az] of DIR) {
    const major = lbl.length === 1;
    const rr = R + (major ? 22 : 15);
    ctx.fillStyle = major ? 'rgba(74,158,255,0.85)' : 'rgba(74,158,255,0.38)';
    ctx.font      = major ? '600 14px "Space Grotesk"' : '11px "Space Grotesk"';
    ctx.textAlign = 'center';
    ctx.fillText(lbl,
      cx + rr * Math.sin(toRad(az)),
      cy - rr * Math.cos(toRad(az))
    );
  }

  // ── Stars ────────────────────────────────────────────────
  const visible = [];
  for (const star of stars) {
    const { alt, az } = raDecToAltAz(
      star.ra_deg, star.dec_deg, location.lat, location.lon, now
    );
    if (alt < -0.5) continue;

    const r   = R * (90 - alt) / 90;
    const x   = cx + r * Math.sin(toRad(az));
    const y   = cy - r * Math.cos(toRad(az));
    const sz  = starRadius(star.apparent_magnitude);
    const col = starColor(star.spectral_type);
    const [rr, gg, bb] = hexToRgb(col);

    // glow halo
    const grd = ctx.createRadialGradient(x, y, 0, x, y, sz * 4.5);
    grd.addColorStop(0, `rgba(${rr},${gg},${bb},0.55)`);
    grd.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, sz * 4.5, 0, Math.PI * 2);
    ctx.fill();

    // core
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, Math.PI * 2);
    ctx.fill();

    if (alt >= 0) visible.push({ star, alt, az, x, y, sz });
  }

  // ── Name labels for bright stars ─────────────────────────
  ctx.font = '11px "Space Grotesk"';
  ctx.textBaseline = 'middle';
  for (const { star, x, y, sz } of visible) {
    if (star.apparent_magnitude > 2.5) continue;
    ctx.fillStyle = 'rgba(180,200,240,0.78)';
    ctx.textAlign = 'left';
    ctx.fillText(star.name, x + sz + 5, y);
  }

  // ── Zenith crosshair ─────────────────────────────────────
  ctx.strokeStyle = 'rgba(74,158,255,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
  ctx.stroke();

  return visible.length;
}
