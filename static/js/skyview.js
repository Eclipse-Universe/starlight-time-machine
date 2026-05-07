// Sky view: astronomical calculations + canvas rendering

let _lastVisible = []; // [{star, x, y, alt, az, sz}] — updated each draw

// Returns the nearest star/planet to a canvas click position, or null
export function getNearestStar(clickX, clickY, threshold = 28) {
  let best = null, bestDist = threshold;
  for (const v of _lastVisible) {
    const d = Math.hypot(v.x - clickX, v.y - clickY);
    if (d < bestDist) { bestDist = d; best = v; }
  }
  return best;
}

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

// RA/Dec (degrees) → Altitude/Azimuth (degrees)
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

// ─── Simplified planet positions (Jean Meeus low-precision) ──────────────────
// Returns { ra, dec } in degrees for each planet at given date
function planetPositions(date) {
  const jd = julianDate(date);
  const T  = (jd - J2000_JD) / 36525; // Julian centuries since J2000

  // Orbital elements (simplified, good to ~1°)
  const planets = [
    { name: 'Mercury', a: 0.387,  e: 0.2056, i: 7.005,  L0: 252.251, dL: 149472.675, w: 77.456,  W: 48.331 },
    { name: 'Venus',   a: 0.723,  e: 0.0068, i: 3.395,  L0: 181.980, dL: 58517.816,  w: 131.564, W: 76.680 },
    { name: 'Mars',    a: 1.524,  e: 0.0934, i: 1.850,  L0: 355.433, dL: 19140.300,  w: 336.060, W: 49.558 },
    { name: 'Jupiter', a: 5.203,  e: 0.0489, i: 1.304,  L0: 34.396,  dL: 3034.906,   w: 14.331,  W: 100.464 },
    { name: 'Saturn',  a: 9.537,  e: 0.0542, i: 2.486,  L0: 50.077,  dL: 1222.114,   w: 93.057,  W: 113.665 },
  ];

  const results = [];
  for (const p of planets) {
    // Mean longitude
    const L = ((p.L0 + p.dL * T / 36525) % 360 + 360) % 360;
    // Mean anomaly
    const M = toRad(((L - p.w) % 360 + 360) % 360);
    // Equation of centre (approximate)
    const v = M + (2 * p.e - 0.25 * p.e ** 3) * Math.sin(M)
                + 1.25 * p.e ** 2 * Math.sin(2 * M)
                + (13/12) * p.e ** 3 * Math.sin(3 * M);
    // Heliocentric longitude (ecliptic)
    const lon_ec = ((toDeg(v) + p.w) % 360 + 360) % 360;
    // Distance
    const r = p.a * (1 - p.e ** 2) / (1 + p.e * Math.cos(v));

    // Heliocentric rectangular coordinates (ecliptic plane)
    const x_h = r * Math.cos(toRad(lon_ec));
    const y_h = r * Math.sin(toRad(lon_ec)) * Math.cos(toRad(p.i));
    const z_h = r * Math.sin(toRad(lon_ec)) * Math.sin(toRad(p.i));

    // Earth position (same method)
    const Le = ((100.466 + 36000.770 * T) % 360 + 360) % 360;
    const Me = toRad(((Le - 102.938) % 360 + 360) % 360);
    const ve = Me + (2 * 0.0167 - 0.25 * 0.0167 ** 3) * Math.sin(Me);
    const re = 1.000 * (1 - 0.0167 ** 2) / (1 + 0.0167 * Math.cos(ve));
    const lon_e = ((toDeg(ve) + 102.938) % 360 + 360) % 360;
    const x_e = re * Math.cos(toRad(lon_e));
    const y_e = re * Math.sin(toRad(lon_e));

    // Geocentric ecliptic coordinates
    const dx = x_h - x_e;
    const dy = y_h - y_e;
    const dz = z_h;

    // Ecliptic longitude / latitude
    const lam = ((toDeg(Math.atan2(dy, dx)) % 360) + 360) % 360;
    const bet = toDeg(Math.atan2(dz, Math.sqrt(dx*dx + dy*dy)));

    // Convert ecliptic → equatorial (J2000 obliquity ≈ 23.439°)
    const eps = toRad(23.439 - 0.0000004 * T);
    const ra  = ((toDeg(Math.atan2(
      Math.sin(toRad(lam)) * Math.cos(eps) - Math.tan(toRad(bet)) * Math.sin(eps),
      Math.cos(toRad(lam))
    )) % 360) + 360) % 360;
    const dec = toDeg(Math.asin(
      Math.sin(toRad(bet)) * Math.cos(eps) +
      Math.cos(toRad(bet)) * Math.sin(eps) * Math.sin(toRad(lam))
    ));

    results.push({ name: p.name, ra, dec });
  }
  return results;
}

// ─── Rendering helpers ────────────────────────────────────────────────────────
const SPECTRAL_HEX = {
  O: '#9bb0ff', B: '#aabfff', A: '#cad7ff',
  F: '#fff4ea', G: '#ffd2a1', K: '#ff9f4a', M: '#ff6030',
};
const PLANET_COLORS = {
  Mercury: '#b0b0b0', Venus: '#ffcc88', Mars: '#ff6644',
  Jupiter: '#cc9966', Saturn: '#e8cc88',
};

function starColor(type)  { return SPECTRAL_HEX[type?.[0]] ?? '#ffffff'; }
function starRadius(mag) {
  if (mag < 0) return 5.5;
  if (mag < 1) return 4.5;
  if (mag < 2) return 3.5;
  if (mag < 3) return 2.5;
  if (mag < 4) return 1.8;
  if (mag < 5) return 1.3;
  return 1.0;
}
function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

// Sky projection: Alt/Az → canvas x,y
// North up, East right; zenith at center, horizon at radius R
function project(alt, az, cx, cy, R) {
  const r = R * (90 - alt) / 90;
  return {
    x: cx + r * Math.sin(toRad(az)),
    y: cy - r * Math.cos(toRad(az)),
  };
}

// ─── Main draw function ───────────────────────────────────────────────────────
export function drawSkyCanvas(canvas, brightStars, constLines, location, now) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const R  = Math.min(W, H) / 2 - 52;

  ctx.clearRect(0, 0, W, H);

  // ── Background ───────────────────────────────────────────
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
    ctx.strokeStyle = 'rgba(74,158,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(74,158,255,0.25)';
    ctx.font = '10px "DM Mono"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${alt}°`, cx + r + 4, cy - 5);
    ctx.setLineDash([3, 8]);
  }
  ctx.setLineDash([]);

  // ── Horizon circle ───────────────────────────────────────
  ctx.strokeStyle = 'rgba(74,158,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // ── Cardinal labels ──────────────────────────────────────
  const DIR = [
    ['N',0],['NE',45],['E',90],['SE',135],
    ['S',180],['SW',225],['W',270],['NW',315],
  ];
  ctx.textBaseline = 'middle';
  for (const [lbl, az] of DIR) {
    const major = lbl.length === 1;
    const rr = R + (major ? 22 : 15);
    ctx.fillStyle = major ? 'rgba(74,158,255,0.85)' : 'rgba(74,158,255,0.35)';
    ctx.font      = major ? '600 14px "Space Grotesk"' : '11px "Space Grotesk"';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, cx + rr * Math.sin(toRad(az)), cy - rr * Math.cos(toRad(az)));
  }

  // ── Constellation lines ──────────────────────────────────
  if (constLines) {
    ctx.strokeStyle = 'rgba(74,120,200,0.18)';
    ctx.lineWidth = 0.8;
    for (const seg of constLines) {
      let started = false;
      ctx.beginPath();
      for (const [ra, dec] of seg) {
        const { alt, az } = raDecToAltAz(ra, dec, location.lat, location.lon, now);
        if (alt < -15) { started = false; continue; } // skip if far below horizon
        const { x, y } = project(alt, az, cx, cy, R);
        started ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), (started = true));
      }
      ctx.stroke();
    }
  }

  // ── Stars ────────────────────────────────────────────────
  const visible = []; // stored for click detection
  const namedVisible = [];
  for (const star of brightStars) {
    const { alt, az } = raDecToAltAz(star.ra, star.dec, location.lat, location.lon, now);
    if (alt < -0.5) continue;

    const { x, y } = project(alt, az, cx, cy, R);
    const sz  = starRadius(star.mag);
    const col = starColor(star.type);
    const [rr, gg, bb] = hexToRgb(col);

    if (star.mag < 3) {
      const grd = ctx.createRadialGradient(x, y, 0, x, y, sz * 4);
      grd.addColorStop(0, `rgba(${rr},${gg},${bb},0.45)`);
      grd.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, sz * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, Math.PI * 2);
    ctx.fill();

    if (alt >= 0) {
      visible.push({ star, x, y, alt, az, sz });
      if (star.name) namedVisible.push({ star, x, y, sz });
    }
  }

  // ── Planets ──────────────────────────────────────────────
  const planetData = planetPositions(now);
  for (const p of planetData) {
    const { alt, az } = raDecToAltAz(p.ra, p.dec, location.lat, location.lon, now);
    if (alt < -0.5) continue;

    const { x, y } = project(alt, az, cx, cy, R);
    const col = PLANET_COLORS[p.name] ?? '#ffffff';
    const [rr, gg, bb] = hexToRgb(col);
    const sz = 4.5;

    const grd = ctx.createRadialGradient(x, y, 0, x, y, 10);
    grd.addColorStop(0, `rgba(${rr},${gg},${bb},0.6)`);
    grd.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = `rgba(${rr},${gg},${bb},0.9)`;
    ctx.font = '600 11px "Space Grotesk"';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(p.name, x + 7, y);

    if (alt >= 0) {
      visible.push({
        star: { name: p.name, ra: p.ra, dec: p.dec, mag: -2, type: 'G', isPlanet: true },
        x, y, alt, az, sz
      });
    }
  }

  // Store for click detection
  _lastVisible = visible;

  // ── Named star labels ────────────────────────────────────
  ctx.font = '11px "Space Grotesk"';
  ctx.textBaseline = 'middle';
  for (const { star, x, y, sz } of namedVisible) {
    if (star.mag > 2.5) continue;
    ctx.fillStyle = 'rgba(180,200,240,0.75)';
    ctx.textAlign = 'left';
    ctx.fillText(star.name, x + sz + 5, y);
  }

  // ── Zenith crosshair ─────────────────────────────────────
  ctx.strokeStyle = 'rgba(74,158,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
  ctx.stroke();

  // Count stars above horizon
  let visCount = 0;
  for (const s of brightStars) {
    const { alt } = raDecToAltAz(s.ra, s.dec, location.lat, location.lon, now);
    if (alt >= 0) visCount++;
  }
  return visCount;
}
