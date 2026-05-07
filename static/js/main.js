import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { drawSkyCanvas } from '/static/js/skyview.js';

const CURRENT_YEAR = 2025;

// ─── Globe Mode state ─────────────────────────────────────────────────────────
const GLOBE_RADIUS   = 28;
let globeMode        = false;
let globeEarth       = null;
let globePin         = null;
let selectedLocation = null; // { lat, lon, name }

// ─── Sky View state ───────────────────────────────────────────────────────────
let ALL_STARS       = [];   // populated in loadNamedStars()
let skyViewActive   = false;
let skyInterval     = null;

// Equirectangular ↔ Three.js sphere (consistent with Three.js SphereGeometry UV)
function geoToVec3(lon, lat, r = GLOBE_RADIUS) {
  const phi   = (lon + 180) * (Math.PI / 180);
  const theta = (90 - lat)  * (Math.PI / 180);
  return new THREE.Vector3(
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.cos(theta),
    r * Math.sin(theta) * Math.sin(phi)
  );
}

function vec3ToGeo(point) {
  const n      = point.clone().normalize();
  const lat    = 90 - Math.acos(Math.max(-1, Math.min(1, n.y))) * (180 / Math.PI);
  const lonRaw = Math.atan2(n.z, n.x) * (180 / Math.PI);
  const lon    = lonRaw - 180;
  return { lat, lon: ((lon + 540) % 360) - 180 };
}

// ─── Western historical context ───────────────────────────────────────────────
function getWestContext(year) {
  if (year >= 2020) return "COVID-19 pandemic paralyzed economies; mRNA vaccines developed in record time; George Floyd's murder sparked global protests; Russia invaded Ukraine in 2022, reshaping European security.";
  if (year >= 2010) return "Arab Spring toppled autocrats across the Middle East; the Eurozone debt crisis nearly broke the EU; social media transformed politics; Barack Obama was US president.";
  if (year >= 2000) return "9/11 attacks triggered the War on Terror and reshaped global geopolitics; the US invaded Afghanistan and Iraq; the Euro launched as physical currency; social media was born.";
  if (year >= 1990) return "The Soviet Union dissolved, ending the Cold War; German reunification; Nelson Mandela released and elected president; the World Wide Web launched publicly.";
  if (year >= 1980) return "Reagan and Thatcher reshaped Western economics; the AIDS crisis emerged; Chernobyl shook confidence in nuclear power; the Berlin Wall fell in 1989.";
  if (year >= 1970) return "Nixon visited China and resigned over Watergate; the OPEC oil crisis reshaped the global economy; the Vietnam War ended; Roe v. Wade decided in the US.";
  if (year >= 1960) return "JFK assassinated in Dallas; the Civil Rights Act passed in the US; the Cuban Missile Crisis; Neil Armstrong walked on the Moon in 1969; the Beatles transformed global music.";
  if (year >= 1950) return "Korean War; NATO formed against the Soviet threat; DNA's double-helix structure discovered by Watson and Crick (1953); McCarthyism; decolonization reshaped Africa and Asia.";
  if (year >= 1945) return "World War II ended — 70–85 million dead; the Holocaust revealed to the world; atomic bombs dropped on Hiroshima and Nagasaki; the UN and Bretton Woods system established.";
  if (year >= 1939) return "World War II began with Germany's invasion of Poland; the Battle of Britain; the Holocaust began in Nazi-occupied Europe; Pearl Harbor brought the US into the war.";
  if (year >= 1929) return "The Great Depression collapsed Western economies following the 1929 Wall Street crash; Hitler rose to power in Germany; the Spanish Civil War became a proxy war.";
  if (year >= 1914) return "World War I: 20 million killed in industrial-scale trench warfare; the Russian Revolution ended the Romanov dynasty; the Austro-Hungarian and Ottoman Empires dissolved.";
  if (year >= 1900) return "The Belle Époque: automobiles, electricity, and telephones transformed life; Einstein published Special Relativity (1905); the Wright Brothers flew (1903); Picasso launched Cubism.";
  if (year >= 1860) return "American Civil War ended slavery; Darwin's evolution theory transformed biology; Italian and German unification; the Suez Canal opened; germ theory revolutionized medicine.";
  if (year >= 1800) return "Napoleon conquered Europe before defeat at Waterloo (1815); the Congress of Vienna redrew borders; Britain industrialized with steam power; abolitionism gained momentum.";
  if (year >= 1760) return "The Enlightenment: Voltaire, Rousseau, Kant challenged tradition; American Revolution and independence (1776); the Industrial Revolution began in Britain; Adam Smith published The Wealth of Nations.";
  if (year >= 1680) return "Newton published Principia Mathematica (1687), laying the laws of physics; Louis XIV built Versailles as Europe's power center; the Glorious Revolution in England established constitutional monarchy.";
  if (year >= 1600) return "Shakespeare wrote his greatest plays; Galileo confirmed heliocentrism with his telescope; the Thirty Years' War devastated Central Europe (1618–1648); the Pilgrims sailed to North America.";
  if (year >= 1490) return "Columbus reached the Americas in 1492, permanently linking the Old and New Worlds; the Italian Renaissance peaked; Michelangelo painted the Sistine Chapel; Magellan's crew circumnavigated the globe.";
  if (year >= 1440) return "Constantinople fell to the Ottomans in 1453, ending the Byzantine Empire; Gutenberg's printing press democratized knowledge; the Wars of the Roses in England.";
  if (year >= 1340) return "The Black Death (1347–1351) killed one-third of Europe's population; the Hundred Years' War between England and France; the Western Schism divided the Papacy.";
  if (year >= 1200) return "Magna Carta limited royal power in England (1215); Gothic cathedrals rose across Europe; the Crusades continued; the Mongols invaded Eastern Europe; universities founded at Oxford, Cambridge, and Paris.";
  if (year >= 1000) return "The Norman Conquest reshaped England (1066); the First Crusade (1096); the Great Schism split Christianity into Catholic and Orthodox; Leif Erikson reached North America.";
  if (year >= 600) return "Charlemagne unified Western Europe and was crowned Emperor (800 CE); the Carolingian Renaissance; the Viking Age brought raids and settlements across Europe and into the North Atlantic.";
  if (year >= 300) return "The Western Roman Empire fell (476 CE); Germanic kingdoms replaced Rome; Christianity became the dominant European religion; St. Augustine wrote Confessions.";
  if (year >= -50) return "The Roman Empire rose under Augustus (27 BCE); Pax Romana brought 200 years of Mediterranean stability; Jesus of Nazareth born and crucified; Roman law and engineering defined Western civilization.";
  if (year >= -500) return "Athens' Golden Age: Socrates, Plato, Aristotle defined Western philosophy; the Persian Wars (Marathon, Thermopylae); Greek democracy invented; the Parthenon built on the Acropolis.";
  if (year >= -800) return "Homer composed the Iliad and Odyssey; Greek city-states rose; the first Olympic Games held (776 BCE); Phoenicians spread the alphabet across the Mediterranean; Rome founded.";
  if (year >= -3000) return "Egyptian Old Kingdom: the Great Pyramids of Giza built (c.2560 BCE); Sumerian city-states with cuneiform writing; the Bronze Age trade network connected the Mediterranean.";
  if (year >= -10000) return "The Neolithic Revolution in the Fertile Crescent: humans began farming wheat and barley; first permanent settlements; pottery, weaving, and animal domestication developed.";
  return "Before recorded history — early homo sapiens lived as nomadic hunter-gatherers in Europe and the Middle East, painting caves and developing early language.";
}

// ─── Eastern historical context ───────────────────────────────────────────────
function getEastContext(year) {
  if (year >= 2020) return "China emerged from COVID with authoritarian controls and confrontational posture toward Taiwan; India surpassed China as the world's most populous nation; K-pop and Korean cinema (Parasite, Squid Game) achieved unprecedented global influence.";
  if (year >= 2010) return "Xi Jinping rose to power in China, concentrating authority; Japan's Tōhoku earthquake and Fukushima nuclear disaster; India's rapid growth under Modi; the Arab Spring swept the Middle East; South Korea became a global cultural force.";
  if (year >= 2000) return "China joined the WTO (2001) and hosted the 2008 Beijing Olympics, announcing its return as a global power; India's IT boom transformed its economy; the Second Intifada reignited Israel-Palestine conflict.";
  if (year >= 1990) return "Deng Xiaoping's Southern Tour (1992) accelerated China's market reforms; Tiananmen Square (1989) was crushed; Hong Kong returned to China (1997); Japan entered its 'Lost Decade' of economic stagnation.";
  if (year >= 1980) return "Deng Xiaoping's Reform and Opening Up transformed China; the Iran-Iraq War; Japan became the world's second-largest economy; Indira Gandhi and later Rajiv Gandhi assassinated in India.";
  if (year >= 1965) return "Mao's Cultural Revolution (1966–1976) destroyed heritage and killed hundreds of thousands; the Vietnam War escalated; South Korea and Taiwan began their economic miracles; Indira Gandhi led India.";
  if (year >= 1945) return "Japan surrendered (1945), ending WWII in Asia; China's civil war ended with Communist victory (1949); Mao's Great Leap Forward caused 30–55 million deaths from famine; India gained independence from Britain (1947).";
  if (year >= 1900) return "Japan defeated Russia in 1905 — Asia's first modern victory over a European power; the Qing Dynasty fell (1912) ending 2,000 years of imperial rule; Meiji Japan industrialized in one generation.";
  if (year >= 1840) return "Opium Wars (1839–1842) forced China to cede Hong Kong to Britain; the Taiping Rebellion killed 20–30 million in China; Japan was forced open by the US Navy (1853); the Meiji Restoration modernized Japan rapidly.";
  if (year >= 1600) return "The Qing Dynasty replaced the Ming in China (1644); Tokugawa Japan unified the country and entered 250 years of peace and isolation; Mughal India peaked under Akbar and Shah Jahan (Taj Mahal, 1632–1653).";
  if (year >= 1400) return "Ming China built the Forbidden City and restored the Great Wall; Zheng He's massive treasure fleets explored as far as East Africa (1405–1433); the Ottoman Empire under Mehmed II captured Constantinople (1453).";
  if (year >= 1200) return "Genghis Khan unified Mongols and launched the largest land empire in history — from China to Eastern Europe; the Song Dynasty China was the world's most technologically advanced civilization; Kamakura shogunate ruled Japan.";
  if (year >= 900) return "Song Dynasty China: world leader in printing, gunpowder, compass, and urban commerce; Tang/Song literature and poetry flourished; Japan's Heian period produced The Tale of Genji (world's first novel, c.1010 CE).";
  if (year >= 600) return "Tang Dynasty: China's cosmopolitan golden age with Silk Road trade, poetry, and Buddhist art; Islam spread rapidly from Arabia across Persia and Central Asia; Prince Shōtoku introduced Buddhism to Japan.";
  if (year >= 200) return "Han Dynasty China was the world's most powerful empire, linked to Rome by the Silk Road; paper invented in China (105 CE); Buddhism spread across East Asia; the Gupta Empire brought India's classical golden age.";
  if (year >= -300) return "Qin Shi Huang unified China for the first time (221 BCE), creating the Terracotta Army; the Han Dynasty established Confucianism as state philosophy; the Maurya Empire under Ashoka unified India and spread Buddhism.";
  if (year >= -500) return "Confucius (551–479 BCE) and Laozi laid the philosophical foundations of East Asian civilization; the Persian Achaemenid Empire dominated the Middle East; India's Vedic age produced the Upanishads.";
  if (year >= -1200) return "Shang Dynasty China used oracle bones and developed early writing; Egypt under Ramesses II fought the Hittites (Battle of Kadesh, 1274 BCE); early Vedic civilization developed in the Indian subcontinent.";
  if (year >= -3000) return "Yellow River civilization emerged in China; Harappan civilization in the Indus Valley built planned cities with sewers; Sumerian city-states in Mesopotamia; Egyptian Old Kingdom and pyramid construction.";
  if (year >= -10000) return "Rice cultivation began in China's Yangtze River region; millet farming in northern China; early settlements along the Indus River; nomadic cultures across the Central Asian steppe.";
  return "Before organized civilization — early homo sapiens spread across Asia and the Pacific from Africa, developing distinct languages, tools, and cultures.";
}

// ─── Spectral color ───────────────────────────────────────────────────────────
const SPECTRAL_COLOR = {
  O: new THREE.Color(0x9bb0ff),
  B: new THREE.Color(0xaabfff),
  A: new THREE.Color(0xcad7ff),
  F: new THREE.Color(0xfff4ea),
  G: new THREE.Color(0xffd2a1),
  K: new THREE.Color(0xff9f4a),
  M: new THREE.Color(0xff6030),
};
const spectralColor = t => SPECTRAL_COLOR[t?.[0]] ?? new THREE.Color(0xffffff);

// ─── Star 3-D position (log scale) ───────────────────────────────────────────
function starPosition(ra_deg, dec_deg, distance_ly) {
  const r   = Math.log10(distance_ly + 1) * 80;
  const ra  = (ra_deg  * Math.PI) / 180;
  const dec = (dec_deg * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(dec) * Math.cos(ra),
    r * Math.sin(dec),
    r * Math.cos(dec) * Math.sin(ra)
  );
}

// ─── Glow texture (rgba-safe) ─────────────────────────────────────────────────
function makeGlowTexture(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const size = 128, cx = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const grad = ctx.createRadialGradient(cx,cx,0, cx,cx,cx);
  grad.addColorStop(0,   `rgba(${r},${g},${b},1.0)`);
  grad.addColorStop(0.2, `rgba(${r},${g},${b},0.8)`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.25)`);
  grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,size,size);
  return new THREE.CanvasTexture(cv);
}

// ─── Text sprite ──────────────────────────────────────────────────────────────
function makeTextSprite(text, { color='#fff', fontSize=22, fontWeight='500', scaleX=28, scaleY=4.4 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 80;
  const ctx = cv.getContext('2d');
  ctx.font = `${fontWeight} ${fontSize}px "Space Grotesk",sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 40);
  const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false });
  const sp  = new THREE.Sprite(mat);
  sp.scale.set(scaleX, scaleY, 1);
  return sp;
}

// ─── Orbit ring (RingGeometry — guaranteed visibility vs. WebGL lines) ────────
function makeOrbitRing(radius, hexColor, opacity = 0.45) {
  const w   = Math.max(0.22, radius * 0.012);
  const geo = new THREE.RingGeometry(radius - w, radius + w, 128);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(hexColor), side: THREE.DoubleSide,
    transparent: true, opacity,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;   // lay flat in XZ ecliptic plane
  return mesh;
}

// ─── Scene ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00000f);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(18, 48, 82);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor  = 0.06;
controls.minDistance    = 3;
controls.maxDistance    = 800;
controls.target.set(0, 0, 0);
controls.autoRotate      = true;
controls.autoRotateSpeed = 0.2;

// ─── Background stars ─────────────────────────────────────────────────────────
(function createBgStars() {
  const count = 8000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const siz = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const r  = 400 + Math.random() * 600;
    pos[i*3]   = r * Math.sin(ph) * Math.cos(th);
    pos[i*3+1] = r * Math.sin(ph) * Math.sin(th);
    pos[i*3+2] = r * Math.cos(ph);
    const t = Math.random();
    col[i*3] = col[i*3+1] = 0.7 + t * 0.3;
    col[i*3+2] = 0.8 + t * 0.2;
    siz[i] = 0.5 + Math.random() * 1.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size',     new THREE.BufferAttribute(siz, 1));
  const mat = new THREE.ShaderMaterial({
    vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float size; varying vec3 vColor;
      void main(){
        vColor=color;
        vec4 mv=modelViewMatrix*vec4(position,1.);
        gl_PointSize=size*(300./-mv.z);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      void main(){
        float d=length(gl_PointCoord-.5);
        if(d>.5)discard;
        gl_FragColor=vec4(vColor,(1.-smoothstep(.2,.5,d))*.8);
      }`,
  });
  scene.add(new THREE.Points(geo, mat));
})();

// ─── Solar System ─────────────────────────────────────────────────────────────
// All planet positions are on an ARTISTIC scale — in reality the entire Solar
// System fits inside a single pixel at the inter-stellar distances shown.
const planetMeshes = [];   // clickable planet spheres
let   PLANET_DATA   = {};  // loaded from /api/planets

const SOLAR_PLANETS = [
  { id:'mercury', orbitR:4.5,  angle:30,  hex:'#b0b0b0', size:0.22 },
  { id:'venus',   orbitR:6.5,  angle:110, hex:'#ffcc88', size:0.38 },
  { id:'earth',   orbitR:9.0,  angle:200, hex:'#4488ff', size:0.42, moon:true },
  { id:'mars',    orbitR:12.5, angle:285, hex:'#ff6644', size:0.30 },
  { id:'jupiter', orbitR:18.5, angle:55,  hex:'#cc9966', size:0.88 },
  { id:'saturn',  orbitR:25.0, angle:148, hex:'#e8cc88', size:0.74, rings:true },
  { id:'uranus',  orbitR:31.0, angle:248, hex:'#88ccdd', size:0.55 },
  { id:'neptune', orbitR:37.0, angle:318, hex:'#4466dd', size:0.52 },
];

function buildPlanetMesh(hex, size, x, z, id) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 14, 14),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) })
  );
  mesh.position.set(x, 0, z);
  mesh.userData = { planetId: id };
  scene.add(mesh);
  planetMeshes.push(mesh);
  // Glow
  const glowMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(hex),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(size * 9);
  glow.position.set(x, 0, z);
  scene.add(glow);
  return mesh;
}

function createSolarSystem() {
  // Sun — kept deliberately small so it doesn't overwhelm nearby objects
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe080 })
  );
  sunMesh.userData = { planetId: 'sun' };
  scene.add(sunMesh);
  planetMeshes.push(sunMesh);

  // Sun glow — reduced from 24 to 9
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('#ffe060'),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.75,
  }));
  sunGlow.scale.set(9, 9, 1);
  scene.add(sunGlow);

  // Sun labels
  const lbl = makeTextSprite('Sun', { color:'#ffe080', fontSize:20, fontWeight:'600', scaleX:8, scaleY:1.3 });
  lbl.position.set(0, 2.8, 0);
  scene.add(lbl);

  const home = makeTextSprite('◉  Solar System  (You are here)', { color:'#88aacc', fontSize:15, fontWeight:'400', scaleX:18, scaleY:1.7 });
  home.position.set(0, -4.2, 0);
  scene.add(home);

  const region = makeTextSprite('Milky Way · Orion Spur', { color:'#3a5580', fontSize:13, fontWeight:'400', scaleX:15, scaleY:1.5 });
  region.position.set(0, -6.5, 0);
  scene.add(region);

  // Planets
  for (const p of SOLAR_PLANETS) {
    const rad = (p.angle * Math.PI) / 180;
    const px  = Math.cos(rad) * p.orbitR;
    const pz  = Math.sin(rad) * p.orbitR;

    // Orbit ring
    scene.add(makeOrbitRing(p.orbitR, p.hex, 0.45));

    // Planet mesh
    buildPlanetMesh(p.hex, p.size, px, pz, p.id);

    // Saturn rings
    if (p.rings) {
      const rm = new THREE.Mesh(
        new THREE.RingGeometry(p.size * 1.4, p.size * 2.5, 64),
        new THREE.MeshBasicMaterial({ color:0xddcc88, side:THREE.DoubleSide, transparent:true, opacity:0.55 })
      );
      rm.position.set(px, 0, pz);
      rm.rotation.x = Math.PI * 0.32;
      scene.add(rm);
    }

    // Planet label
    const pLabel = makeTextSprite(p.id.charAt(0).toUpperCase() + p.id.slice(1), {
      color: p.hex, fontSize:17, fontWeight:'500', scaleX:11, scaleY:1.75
    });
    pLabel.position.set(px, p.size + 1.7, pz);
    scene.add(pLabel);

    // Moon (Earth)
    if (p.moon) {
      const moonR = 1.5, moonA = (65 * Math.PI) / 180;
      const mx = px + Math.cos(moonA) * moonR;
      const mz = pz + Math.sin(moonA) * moonR;

      // Moon orbit ring
      const moonOrbit = makeOrbitRing(moonR, '#556688', 0.4);
      moonOrbit.position.set(px, 0, pz);
      scene.add(moonOrbit);

      // Moon mesh
      buildPlanetMesh('#bbbbcc', 0.13, mx, mz, 'moon');

      // Moon label
      const mLabel = makeTextSprite('Moon', { color:'#aaaacc', fontSize:13, fontWeight:'400', scaleX:7, scaleY:1.1 });
      mLabel.position.set(mx, 0.75, mz);
      scene.add(mLabel);
    }
  }
}
createSolarSystem();

// ─── Named stars ──────────────────────────────────────────────────────────────
const starMeshes = [];
const glowSprites = [];
let hoveredMesh  = null;
let selectedStar = null;

async function loadNamedStars() {
  const res   = await fetch('/api/stars');
  const stars = await res.json();
  ALL_STARS = stars;

  for (const star of stars) {
    const pos    = starPosition(star.ra_deg, star.dec_deg, star.distance_ly);
    const color  = spectralColor(star.spectral_type);
    const radius = star.apparent_magnitude < 0 ? 1.6
                 : star.apparent_magnitude < 1 ? 1.3
                 : star.apparent_magnitude < 2 ? 1.0 : 0.7;

    // Core sphere
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 12, 12),
      new THREE.MeshBasicMaterial({ color })
    );
    mesh.position.copy(pos);
    mesh.userData = star;
    scene.add(mesh);
    starMeshes.push(mesh);

    // Glow sprite
    const hexColor = '#' + color.getHexString();
    const glowMat  = new THREE.SpriteMaterial({
      map: makeGlowTexture(hexColor),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6,
    });
    const glowScale = radius * 10;
    const sprite    = new THREE.Sprite(glowMat);
    sprite.scale.set(glowScale, glowScale, 1);
    sprite.position.copy(pos);
    scene.add(sprite);
    glowSprites.push({ sprite, mat: glowMat, baseScale: glowScale, mesh });

    // Always-visible name label
    const nameLabel = makeTextSprite(star.name, {
      color:'#8899cc', fontSize:18, fontWeight:'400', scaleX:22, scaleY:3.4
    });
    nameLabel.position.set(pos.x, pos.y + radius + 3.2, pos.z);
    scene.add(nameLabel);
  }
}

// ─── Globe Mode functions ─────────────────────────────────────────────────────
async function enterGlobeMode() {
  globeMode = true;
  controls.autoRotate = false;
  panel.classList.add('hidden');

  scene.traverse(obj => {
    if (obj === scene) return;
    obj.userData._wasVisible = obj.visible;
    obj.visible = false;
  });

  const loader = new THREE.TextureLoader();
  const tex = await new Promise(res =>
    loader.load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r165/examples/textures/planets/earth_atmos_2048.jpg',
      res, undefined, () => res(null)
    )
  );
  globeEarth = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64),
    tex
      ? new THREE.MeshBasicMaterial({ map: tex })
      : new THREE.MeshBasicMaterial({ color: 0x1a5c8a })
  );
  globeEarth.rotation.y = Math.PI / 2; // Europe/Africa faces initial camera
  scene.add(globeEarth);

  await drawCountryBorders();

  animTarget = { pos: new THREE.Vector3(0, 0, 0), dist: 80, type: 'globe' };
  animating  = true;

  document.getElementById('globe-panel').classList.remove('hidden');
  document.getElementById('globe-hint-overlay').classList.remove('hidden');
  document.getElementById('hint').classList.add('hidden');
  document.getElementById('legend').classList.add('hidden');
  document.getElementById('title-block').classList.add('hidden');
}

async function drawCountryBorders() {
  try {
    const res   = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    const world = await res.json();
    const { arcs, transform: { scale: [sx, sy], translate: [tx, ty] } } = world;
    const positions = [];

    function walkArc(idx) {
      const rev = idx < 0;
      const raw = arcs[rev ? ~idx : idx];
      let ax = 0, ay = 0;
      const pts = raw.map(([dx, dy]) => {
        ax += dx; ay += dy;
        return { lon: ax * sx + tx, lat: ay * sy + ty };
      });
      return rev ? pts.reverse() : pts;
    }

    for (const geo of world.objects.countries.geometries) {
      const rings = geo.type === 'Polygon'      ? geo.arcs
                  : geo.type === 'MultiPolygon' ? geo.arcs.flat()
                  : [];
      for (const ring of rings) {
        const pts = ring.flatMap(walkArc);
        for (let i = 0; i < pts.length - 1; i++) {
          const v0 = geoToVec3(pts[i].lon,   pts[i].lat,   GLOBE_RADIUS + 0.08);
          const v1 = geoToVec3(pts[i+1].lon, pts[i+1].lat, GLOBE_RADIUS + 0.08);
          positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const borders = new THREE.LineSegments(geo,
      new THREE.LineBasicMaterial({ color: 0x88aacc, opacity: 0.55, transparent: true })
    );
    globeEarth.add(borders); // child of globe → rotates with it
  } catch (err) {
    console.warn('Country borders could not be loaded:', err);
  }
}

async function handleGlobeClick(lat, lon) {
  if (globePin) { globeEarth.remove(globePin); globePin = null; }

  globePin = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4444 })
  );
  globePin.position.copy(geoToVec3(lon, lat, GLOBE_RADIUS + 0.6));

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('#ff4444'),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85,
  }));
  glow.scale.setScalar(3.8);
  globePin.add(glow);
  globeEarth.add(globePin);

  const locEl = document.getElementById('globe-location-display');
  const btn   = document.getElementById('globe-observe-btn');
  locEl.textContent = `${lat.toFixed(2)}°, ${lon.toFixed(2)}° — 확인 중...`;
  btn.disabled = true;

  try {
    const r    = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko,en`,
      { headers: { 'User-Agent': 'StarlightTimeMachine/1.0' } }
    );
    const data = await r.json();
    const city    = data.address?.city || data.address?.town || data.address?.county || '';
    const country = data.address?.country || '';
    const name    = [city, country].filter(Boolean).join(', ') || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    selectedLocation = { lat, lon, name };
  } catch {
    selectedLocation = { lat, lon, name: `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E` };
  }

  locEl.textContent = `📍 ${selectedLocation.name}`;
  btn.disabled = false;
}

function exitGlobeMode() {
  globeMode = false;

  if (globeEarth) { scene.remove(globeEarth); globeEarth = null; }
  globePin = null;

  scene.traverse(obj => {
    if (obj === scene) return;
    if (obj.userData._wasVisible !== undefined) {
      obj.visible = obj.userData._wasVisible;
      delete obj.userData._wasVisible;
    }
  });

  animTarget = { pos: new THREE.Vector3(0, 0, 0), dist: 82, type: 'sun' };
  animating  = true;
  controls.autoRotate = true;
  selectedLocation = null;

  document.getElementById('globe-panel').classList.add('hidden');
  document.getElementById('globe-hint-overlay').classList.add('hidden');
  document.getElementById('hint').classList.remove('hidden');
  document.getElementById('legend').classList.remove('hidden');
  document.getElementById('title-block').classList.remove('hidden');
  document.getElementById('globe-location-display').textContent = '';
  document.getElementById('globe-observe-btn').disabled = true;
}

// ─── Sky View functions ───────────────────────────────────────────────────────
function startSkyView(location) {
  skyViewActive = true;

  const overlay = document.getElementById('sky-view');
  const canvas  = document.getElementById('sky-canvas');
  const size    = Math.floor(Math.min(window.innerWidth * 0.86, window.innerHeight * 0.76, 680));
  canvas.width  = size;
  canvas.height = size;

  document.getElementById('sky-location-name').textContent = `📍 ${location.name}`;
  overlay.classList.remove('hidden');

  function refresh() {
    const now     = new Date();
    const count   = drawSkyCanvas(canvas, ALL_STARS, location, now);
    const kstStr  = now.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });
    const utcStr  = now.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });
    document.getElementById('sky-time-display').textContent  = `KST ${kstStr}  ·  UTC ${utcStr}`;
    document.getElementById('sky-star-count').textContent    = `지평선 위 관측 가능 별: ${count}개`;
  }

  refresh();
  skyInterval = setInterval(refresh, 60000);
}

function stopSkyView() {
  clearInterval(skyInterval);
  skyInterval   = null;
  skyViewActive = false;
  document.getElementById('sky-view').classList.add('hidden');
}

// ─── Raycasting ───────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();
const tooltip   = document.getElementById('tooltip');

let animTarget = null;   // { pos, dist, type: 'sun'|'planet'|'star' }
let animating  = false;

function onPointerMove(e) {
  pointer.x = (e.clientX / window.innerWidth)  * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  if (globeMode) {
    const hits = globeEarth ? raycaster.intersectObject(globeEarth) : [];
    document.body.style.cursor = hits.length > 0 ? 'crosshair' : 'grab';
    tooltip.classList.remove('visible');
    hoveredMesh = null;
    return;
  }

  const allClickable = [...starMeshes, ...planetMeshes];
  const hits = raycaster.intersectObjects(allClickable);

  if (hits.length > 0) {
    hoveredMesh = hits[0].object;
    const name  = hoveredMesh.userData.name
                ?? (hoveredMesh.userData.planetId
                    ? hoveredMesh.userData.planetId.charAt(0).toUpperCase() + hoveredMesh.userData.planetId.slice(1)
                    : '');
    tooltip.textContent  = name;
    tooltip.style.left   = e.clientX + 14 + 'px';
    tooltip.style.top    = e.clientY - 10 + 'px';
    tooltip.classList.add('visible');
    document.body.style.cursor = 'pointer';
  } else {
    hoveredMesh = null;
    tooltip.classList.remove('visible');
    document.body.style.cursor = 'default';
  }
}

function onPointerClick(e) {
  raycaster.setFromCamera(pointer, camera);

  if (globeMode) {
    if (!globeEarth) return;
    const hits = raycaster.intersectObject(globeEarth);
    if (hits.length > 0) {
      const localPt = globeEarth.worldToLocal(hits[0].point.clone());
      const { lat, lon } = vec3ToGeo(localPt);
      handleGlobeClick(lat, lon);
    }
    return;
  }

  const allClickable = [...starMeshes, ...planetMeshes];
  const hits = raycaster.intersectObjects(allClickable);
  if (hits.length === 0) return;

  const obj = hits[0].object;
  controls.autoRotate = false;

  if (obj.userData.planetId === 'earth') {
    enterGlobeMode();
  } else if (obj.userData.planetId) {
    openPlanetPanel(obj.userData.planetId);
    const isSun = obj.userData.planetId === 'sun';
    flyTo(obj.position, isSun ? 55 : 20, isSun ? 'sun' : 'planet');
  } else {
    openStarPanel(obj);
    flyTo(obj.position, 55, 'star');
  }
}

function flyTo(targetPos, distance, type = 'star') {
  animTarget = { pos: targetPos.clone(), dist: distance, type };
  animating  = true;
}

// ─── Panel helpers ────────────────────────────────────────────────────────────
const panel       = document.getElementById('star-panel');
const starContent = document.getElementById('star-content');
const planetContent = document.getElementById('planet-content');
const closeBtn    = document.getElementById('close-panel');

closeBtn.addEventListener('click', () => {
  panel.classList.add('hidden');
  selectedStar = null;
  controls.autoRotate = true;
});

function showStarMode() {
  starContent.classList.remove('hidden');
  planetContent.classList.add('hidden');
}
function showPlanetMode() {
  starContent.classList.add('hidden');
  planetContent.classList.remove('hidden');
}

// ─── Star field image (CDS Hips2Fits — full-sky DSS2) ─────────────────────────
function loadStarFieldImage(star) {
  const wrap = document.getElementById('star-image-wrap');
  const img  = document.getElementById('star-field-image');
  wrap.classList.add('hidden');
  img.onload  = () => wrap.classList.remove('hidden');
  img.onerror = () => wrap.classList.add('hidden');
  const fov = star.distance_ly < 100 ? 1.2 : star.distance_ly < 1000 ? 0.6 : 0.35;
  img.src = `https://aladinlite.cds.unistra.fr/hips2fits/?hips=CDS%2FP%2FDSS2%2Fcolor&ra=${star.ra_deg}&dec=${star.dec_deg}&fov=${fov}&width=370&height=210&projection=TAN&coordsys=icrs&format=jpg`;
}

// ─── Star panel ───────────────────────────────────────────────────────────────
function openStarPanel(mesh) {
  selectedStar = mesh;
  const star   = mesh.userData;
  const dist   = star.distance_ly;
  const yearDep = Math.round(CURRENT_YEAR - dist);
  const yearStr = yearDep < 0 ? `${Math.abs(yearDep).toLocaleString()} BCE` : `${yearDep.toLocaleString()} CE`;

  document.getElementById('panel-object-name').textContent    = star.name;
  document.getElementById('panel-object-subtitle').textContent = `✦ ${star.constellation}`;
  document.getElementById('panel-distance').textContent        = `${dist.toLocaleString()} light years`;
  document.getElementById('panel-year').textContent            = `Year ${yearStr}`;
  document.getElementById('panel-history').textContent         = `When this light left, ${getWestContext(yearDep)}`;
  document.getElementById('panel-west').textContent            = getWestContext(yearDep);
  document.getElementById('panel-east').textContent            = getEastContext(yearDep);
  document.getElementById('panel-state').textContent           = star.state;
  document.getElementById('panel-fate').textContent            = star.fate;
  document.getElementById('panel-fact').textContent            = star.interesting_fact;

  const dw = document.getElementById('dead-warning');
  star.possibly_dead ? dw.classList.remove('hidden') : dw.classList.add('hidden');

  loadStarFieldImage(star);
  showStarMode();
  panel.classList.remove('hidden');
}

// ─── Planet panel ─────────────────────────────────────────────────────────────
function openPlanetPanel(id) {
  const p = PLANET_DATA[id];
  if (!p) return;

  document.getElementById('panel-object-name').textContent    = p.name;
  document.getElementById('panel-object-subtitle').textContent = p.subtitle;
  document.getElementById('planet-overview').textContent       = p.overview;

  // Stats grid
  const statsEl = document.getElementById('planet-stats');
  statsEl.innerHTML = p.stats.map(s =>
    `<div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div>`
  ).join('');

  // Feature list
  const featEl = document.getElementById('planet-features');
  featEl.innerHTML = p.features.map(f => `<li>${f}</li>`).join('');

  // Mission list
  const missionEl = document.getElementById('planet-missions');
  missionEl.innerHTML = p.missions.map(m => `<li>${m}</li>`).join('');

  document.getElementById('planet-fact').textContent = p.fact;

  showPlanetMode();
  panel.classList.remove('hidden');
}

// ─── Glow animation ───────────────────────────────────────────────────────────
function updateGlows() {
  for (const g of glowSprites) {
    const isHov = g.mesh === hoveredMesh;
    const isSel = g.mesh === selectedStar;
    const tScale = isSel ? g.baseScale * 2.5 : isHov ? g.baseScale * 1.8 : g.baseScale;
    const tOp    = isSel ? 0.9 : isHov ? 0.85 : 0.6;
    g.sprite.scale.lerp(new THREE.Vector3(tScale, tScale, 1), 0.1);
    g.mat.opacity += (tOp - g.mat.opacity) * 0.1;
  }
}

// ─── Camera animation ─────────────────────────────────────────────────────────
const camTargetPos  = new THREE.Vector3();
const camTargetLook = new THREE.Vector3();

function updateCamera() {
  if (!animating || !animTarget) return;

  const { pos, dist, type } = animTarget;

  if (type === 'sun') {
    // Fixed elevated angle looking down at Solar System
    camTargetPos.set(0, dist * 0.45, dist * 0.85);
    camTargetLook.set(0, 0, 0);

  } else if (type === 'planet') {
    // Camera goes BEHIND the planet from the Sun's perspective + elevation
    // This prevents the Sun from appearing between camera and planet.
    const len = pos.length();
    const dir = len > 0.01
      ? pos.clone().normalize()
      : new THREE.Vector3(0, 0, 1);
    // Place camera beyond the planet (away from Sun), elevated
    camTargetPos.copy(pos).addScaledVector(dir, dist);
    camTargetPos.y += dist * 0.6;
    camTargetLook.copy(pos);

  } else if (type === 'globe') {
    camTargetPos.set(0, 15, dist);
    camTargetLook.set(0, 0, 0);

  } else {
    // Star: stay between Solar System and star but keep at least 40% of
    // the star's distance from origin so we never fly into the Sun.
    const len = pos.length();
    const dir = pos.clone().normalize();
    const back = Math.min(dist, len * 0.52);
    camTargetPos.copy(pos).addScaledVector(dir, -back);
    camTargetPos.y += 22;
    camTargetLook.copy(pos);
  }

  camera.position.lerp(camTargetPos, 0.04);
  controls.target.lerp(camTargetLook, 0.04);
  if (camera.position.distanceTo(camTargetPos) < 0.5) animating = false;
}

// ─── Render loop ──────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  if (skyViewActive) return;
  controls.update();
  updateGlows();
  updateCamera();
  renderer.render(scene, camera);
}

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerdown', onPointerClick);

document.getElementById('globe-back-btn').addEventListener('click', exitGlobeMode);
document.getElementById('globe-observe-btn').addEventListener('click', () => {
  if (!selectedLocation) return;
  startSkyView(selectedLocation);
});
document.getElementById('sky-back-btn').addEventListener('click', stopSkyView);

// ─── APOD ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const res  = await fetch('/api/apod');
    const apod = await res.json();
    if (!apod.url) return; // placeholder — not yet fetched by Actions

    const trigger = document.getElementById('apod-trigger');
    const overlay = document.getElementById('apod-overlay');

    trigger.addEventListener('click', () => {
      document.getElementById('apod-date-display').textContent      = apod.date;
      document.getElementById('apod-title-display').textContent     = apod.title;
      document.getElementById('apod-explanation-display').textContent = apod.explanation;
      document.getElementById('apod-copyright-display').textContent =
        apod.copyright ? `© ${apod.copyright}` : '';

      const imgEl = document.getElementById('apod-image');
      imgEl.src = apod.hdurl || apod.url;
      overlay.classList.remove('hidden');
    });

    document.getElementById('apod-close').addEventListener('click',
      () => overlay.classList.add('hidden')
    );
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  } catch {
    document.getElementById('apod-trigger').style.display = 'none';
  }
})();

(async () => {
  // Load planets data
  const pRes = await fetch('/api/planets');
  const pArr = await pRes.json();
  PLANET_DATA = Object.fromEntries(pArr.map(p => [p.id, p]));

  await loadNamedStars();
  animate();

  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    ls.classList.add('fade-out');
    setTimeout(() => ls.remove(), 900);
  }, 2000);
})();
