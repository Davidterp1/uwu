import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ====== UTILIDAD PARA RUTAS ======
function getAssetUrl(path) {
  return new URL(path, import.meta.url).href;
}

// ====== CARGADORES ======
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

// ====== DATOS (sin cambios funcionales) ======
const planets = [
  { name: 'sol', mass: '1.989 × 10^30 kg', radius: '696,340 km', color: 0xFFFF00, size: 10, description: 'La estrella en el centro de nuestro sistema solar, compuesta principalmente de hidrógeno y helio.', rotationSpeed: 0.05, texture: getAssetUrl('./sun.jpg') },
  { name: 'Mercurio', mass: '3.301 × 10^23 kg', radius: '2,439.7 km', color: 0x808080, size: 0.38, orbitRadius: 12, eccentricity: 0.4, description: 'El planeta más pequeño y cercano al Sol.', orbitalSpeed: 4.15, rotationSpeed: 0.1, texture: getAssetUrl('./mercury.jpg'), axialTilt: 0.03, composition: 'Rocoso', temperature: '167°C', atmosphere: 'Muy delgada (oxígeno, sodio, hidrógeno)', funFact: 'Un día en Mercurio (176 días terrestres) es más largo que su año (88 días terrestres).', exploration: 'Mariner 10, MESSENGER, BepiColombo.' },
  { name: 'Venus', mass: '4.867 × 10^24 kg', radius: '6,051.8 km', color: 0xF8E473, size: 0.95, orbitRadius: 15, eccentricity: 0.2, description: 'Planeta con una atmósfera densa y efecto invernadero extremo.', orbitalSpeed: 1.62, rotationSpeed: -0.05, texture: getAssetUrl('./venus.jpg'), axialTilt: 177.4, composition: 'Rocoso', temperature: '464°C', atmosphere: 'Densa (dióxido de carbono)', funFact: 'Gira en sentido contrario a la mayoría de los planetas (rotación retrógrada).', exploration: 'Venera, Magellan, Venus Express.' },
  { name: 'Tierra', mass: '5.972 × 10^24 kg', radius: '6,371 km', color: 0x4682B4, size: 1.0, orbitRadius: 18, eccentricity: 0.3, description: 'Nuestro hogar, con vida y agua líquida.', orbitalSpeed: 1, rotationSpeed: 1, texture: getAssetUrl('./earth.jpg'), axialTilt: 23.44, composition: 'Rocoso', temperature: '15°C', atmosphere: 'Nitrógeno, Oxígeno', funFact: 'Es el único planeta conocido con vida.', satellites: '1 (La Luna)', exploration: '¡Estamos aquí!' },
  { name: 'Marte', mass: '6.39 × 10^23 kg', radius: '3,389.5 km', color: 0xB22222, size: 0.53, orbitRadius: 22, eccentricity: 0.4, description: 'El Planeta Rojo, con casquetes polares y óxido de hierro.', orbitalSpeed: 0.53, rotationSpeed: 0.97, texture: getAssetUrl('./mars.jpg'), axialTilt: 25.19, composition: 'Rocoso', temperature: '-65°C', atmosphere: 'Delgada (dióxido de carbono)', funFact: 'Tiene el volcán más grande del sistema solar, el Monte Olimpo.', satellites: '2 (Fobos y Deimos)', exploration: 'Rovers (Curiosity, Perseverance), Viking.' },
  { name: 'Jupiter', mass: '1.898 × 10^27 kg', radius: '69,911 km', color: 0xD2B48C, size: 4.0, orbitRadius: 36, eccentricity: 0.2, description: 'El gigante gaseoso más grande, con su Gran Mancha Roja.', orbitalSpeed: 0.084, rotationSpeed: 2.4, texture: getAssetUrl('./Jupiter.png'), axialTilt: 3.13, composition: 'Gaseoso', temperature: '-110°C (nubes)', atmosphere: 'Hidrógeno, Helio', funFact: 'La Gran Mancha Roja es una tormenta más grande que la Tierra.', satellites: 'Más de 80 (Ío, Europa, Ganimedes, Calisto)', exploration: 'Voyager, Galileo, Juno.' },
  { name: 'Saturno', mass: '5.683 × 10^26 kg', radius: '58,232 km', color: 0xDAA520, size: 3.5, orbitRadius: 48, eccentricity: 0.3, description: 'Famoso por sus anillos de hielo y roca.', ring: { innerRadius: 0.2, outerRadius: 1.2 }, orbitalSpeed: 0.034, rotationSpeed: 2.2, texture: getAssetUrl('./saturn.jpg'), ringTexture: getAssetUrl('./sring.png'), axialTilt: 26.73, composition: 'Gaseoso', temperature: '-140°C (nubes)', atmosphere: 'Hidrógeno, Helio', funFact: 'Es menos denso que el agua; si hubiera una bañera lo suficientemente grande, flotaría.', satellites: 'Más de 80 (Titán, Encélado)', exploration: 'Pioneer 11, Voyager, Cassini.' },
  { name: 'Urano', mass: '8.681 × 10^25 kg', radius: '25,362 km', color: 0xADD8E6, size: 2.0, orbitRadius: 57, eccentricity: 0.4, description: 'Un gigante de hielo con rotación lateral.', ring: { innerRadius: 0.1, outerRadius: 0.4 }, orbitalSpeed: 0.012, rotationSpeed: -1.4, texture: getAssetUrl('./uranus.jpg'), ringTexture: getAssetUrl('./uring.png'), axialTilt: 97.77, composition: 'Gigante de hielo', temperature: '-195°C (nubes)', atmosphere: 'Hidrógeno, Helio, Metano', funFact: 'Gira de lado, con su eje de rotación casi paralelo al plano de su órbita.', satellites: '27 conocidos', exploration: 'Voyager 2.' },
  { name: 'Neptuno', mass: '1.024 × 10^26 kg', radius: '24,622 km', color: 0x00008B, size: 1.9, orbitRadius: 67, eccentricity: 0.2, description: 'El planeta más distante, frío y ventoso.', orbitalSpeed: 0.006, rotationSpeed: 1.5, texture: getAssetUrl('./neptune.jpg'), axialTilt: 28.32, composition: 'Gigante de hielo', temperature: '-200°C (nubes)', atmosphere: 'Hidrógeno, Helio, Metano', funFact: 'Tiene los vientos más rápidos del sistema solar (hasta 2,100 km/h).', satellites: '14 conocidos', exploration: 'Voyager 2.' },
  { name: 'Pluton', mass: '1.309 × 10^22 kg', radius: '1,188.3 km', color: 0xA52A2A, size: 0.2, orbitRadius: 77, eccentricity: 0.6, description: 'Planeta enano helado del Cinturón de Kuiper.', orbitalSpeed: 0.004, rotationSpeed: 0.15, texture: getAssetUrl('./pluto.png'), axialTilt: 122.53, composition: 'Helado', temperature: '-229°C', atmosphere: 'Delgada (nitrógeno, metano)', funFact: 'Tiene una gran región en forma de corazón en su superficie.', satellites: '5 (Caronte)', exploration: 'New Horizons.' },
];

const moonData = { name: 'Moon', mass: '7.342 × 10^22 kg', radius: '1,737.4 km', color: 0xD3D3D3, size: 0.27, orbitRadius: 1.5, description: 'El satélite natural de la Tierra.', texture: getAssetUrl('./moon.jpg'), composition: 'Rocoso', temperature: '-20°C', atmosphere: 'Casi inexistente', funFact: 'No tiene luz propia, refleja la del Sol.', exploration: 'Misiones Apolo, Luna, Chang\'e.' };

// ====== ESCENA, CÁMARA, RENDERER y CONTROLES ======
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 5000);
camera.position.set(0, 50, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Habilitar sombras
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 500;

// ====== LUCES ======
const pointLight = new THREE.PointLight(0xffffff, 3);
pointLight.castShadow = true; // El sol proyecta sombras
pointLight.shadow.mapSize.width = 2048; pointLight.shadow.mapSize.height = 2048; // Mejor calidad de sombra
pointLight.position.set(0, 0, 0);
scene.add(pointLight);
scene.add(new THREE.AmbientLight(0x333333));

// ====== ESTRELLAS (usar BufferGeometry una sola vez) ======
(function createStars() {
  const starCount = 15000;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[3 * i] = (Math.random() - 0.5) * 4000;
    positions[3 * i + 1] = (Math.random() - 0.5) * 4000;
    positions[3 * i + 2] = (Math.random() - 0.5) * 4000;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ size: 0.7, transparent: true, opacity: 0.8 });
  scene.add(new THREE.Points(geom, mat));
})();

// ====== NEBULOSAS (función reutilizable) ======
function createColoredNebula({ particleCount, particleSize, texture, color }) {
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  const base = new THREE.Color(color.r, color.g, color.b);
  for (let i = 0; i < particleCount; i++) {
    positions[3 * i] = (Math.random() - 0.5) * 4000;
    positions[3 * i + 1] = (Math.random() - 0.5) * 2000;
    positions[3 * i + 2] = (Math.random() - 0.5) * 4000;

    const factor = 0.4 + Math.random() * 0.4;
    const c = base.clone().multiplyScalar(factor);
    colors[3 * i] = c.r; colors[3 * i + 1] = c.g; colors[3 * i + 2] = c.b;

    sizes[i] = particleSize * (0.5 + Math.random() * 0.5);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    size: particleSize,
    map: texture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    vertexColors: true
  });

  scene.add(new THREE.Points(geom, mat));
}

const nebulaTexture1 = textureLoader.load(getAssetUrl('./smoke.png'));
const nebulaTexture2 = textureLoader.load(getAssetUrl('./smokeA.png'));

const nebulaColors = [
  new THREE.Color(0.8, 0.2, 0.9),
  new THREE.Color(0.2, 0.4, 0.9),
  new THREE.Color(0.9, 0.4, 0.2),
  new THREE.Color(1, 0.4, 0.6),
  new THREE.Color(0.4, 1, 0.8),
  new THREE.Color(0.6, 0.8, 1),
  new THREE.Color(0.9, 0.9, 0.5)
];

for (let i = 0; i < nebulaColors.length; i++) {
  createColoredNebula({
    particleCount: 350,
    particleSize: 200,
    texture: i % 2 === 0 ? nebulaTexture1 : nebulaTexture2,
    color: nebulaColors[i]
  });
}

// ====== CREAR SOL ======
const commonSphereGeoCache = new Map(); // caché de geometrías por tamaño
function getSphereGeometry(size, detail = 32) {
  const key = `${size}_${detail}`;
  if (!commonSphereGeoCache.has(key)) {
    commonSphereGeoCache.set(key, new THREE.SphereGeometry(size, detail, detail));
  }
  return commonSphereGeoCache.get(key);
}

const sunMat = new THREE.MeshBasicMaterial({ map: textureLoader.load(planets[0].texture) });
const sun = new THREE.Mesh(getSphereGeometry(planets[0].size), sunMat);
sun.castShadow = false; // El sol es la fuente de luz, no proyecta sombra sobre sí mismo
sun.receiveShadow = false;
sun.userData = planets[0];
scene.add(sun);

// ====== CREAR PLANETAS (reutilizando geometrias/materiales) ======
const planetMeshes = [];
const planetGroups = [];

function createOrbitLine(radius, color = 0xffffff, opacity = 0.2, segments = 128) {
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    pts[3 * i] = Math.cos(theta) * radius;
    pts[3 * i + 1] = 0;
    pts[3 * i + 2] = Math.sin(theta) * radius;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.LineLoop(geom, mat);
}

for (let i = 1; i < planets.length; i++) {
  const p = planets[i];
  const sphereGeom = getSphereGeometry(p.size);
  const mat = new THREE.MeshStandardMaterial({ map: textureLoader.load(p.texture) });

  const mesh = new THREE.Mesh(sphereGeom, mat);
  mesh.castShadow = true;    // El planeta proyecta sombras
  mesh.receiveShadow = true; // El planeta recibe sombras
  mesh.userData = p; // El planeta en sí

  const group = new THREE.Group();
  scene.add(group);

  // Pivot para la inclinación axial. El planeta y los anillos rotarán juntos.
  const pivot = new THREE.Group();
  pivot.rotation.z = THREE.MathUtils.degToRad(p.axialTilt || 0);
  group.add(pivot);
  pivot.add(mesh);

  if (p.ring) {
    const ringTexture = p.ringTexture ? textureLoader.load(p.ringTexture, undefined, () => {
      // Si la textura falla en cargar, no hacemos nada especial, el material usará el color.
      console.warn(`No se pudo cargar la textura del anillo para ${p.name}: ${p.ringTexture}`);
    }) : null;

    // Usamos RingGeometry para todos los anillos. Es la forma correcta.
    const ringGeom = new THREE.RingGeometry(p.size + p.ring.innerRadius, p.size + p.ring.outerRadius, 64);

    const ringMat = new THREE.MeshStandardMaterial({
      map: ringTexture,
      alphaMap: ringTexture, // Usar la misma textura para la transparencia
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.1 // Ayuda a definir los bordes
    });

    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.receiveShadow = true;
    // Para Urano, no aplicamos la rotación para que sus anillos se mantengan horizontales
    if (p.name !== 'Uranus') {
      ringMesh.rotation.x = -0.5 * Math.PI;
    }
    pivot.add(ringMesh); // Añadir los anillos al pivot para que se inclinen con el planeta

    // Asignar capas para controlar el orden de renderizado
    if (p.name === 'Saturn' || p.name === 'Uranus') {
      mesh.renderOrder = 0;
      ringMesh.renderOrder = 1; // Dibuja los anillos después del planeta
    }
  }

  const orbitRadius = p.orbitRadius || 10;
  scene.add(createOrbitLine(orbitRadius));

  planetMeshes.push(mesh);
  planetGroups.push(group);
}

// ====== LUNA (añadir a Earth group) ======
const earthIndex = planets.findIndex(pl => pl.name === 'Earth');
if (earthIndex >= 0 && planetGroups[earthIndex - 1]) {
  const earthGroup = planetGroups[earthIndex - 1];
  const moon = new THREE.Mesh(getSphereGeometry(moonData.size, 16), new THREE.MeshStandardMaterial({ map: textureLoader.load(moonData.texture) }));
  moon.userData = moonData;
  const moonGroup = new THREE.Group();
  moonGroup.add(moon);
  earthGroup.add(moonGroup);

  // Exponer referencias
  scene.userData._moon = moon;
  scene.userData._moonGroup = moonGroup;
}

// ====== ESTACION (GLTF) ======
const stationGroup = new THREE.Group();
scene.add(stationGroup);
gltfLoader.load('./models/estacion.glb', gltf => {
  const model = gltf.scene;
  model.scale.set(0.01, 0.01, 0.01);
  model.position.set(0, 0, 0);
  stationGroup.add(model);
}, undefined, err => console.error(err));
const stationData = { orbitRadius: 20, orbitalSpeed: 0.9 };

// ====== CINTURÓN DE ASTEROIDES (reusar geometría y material) ======
const asteroidCount = 1800;
const asteroidGeometry = new THREE.SphereGeometry(0.05, 4, 4);
const asteroidMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
const asteroids = [];
for (let i = 0; i < asteroidCount; i++) {
  const a = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
  const radius = 24 + Math.random() * 7;
  const angle = Math.random() * Math.PI * 2;
  a.position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 1, Math.sin(angle) * radius);
  a.userData = { radius, angle, speed: 0.001 + Math.random() * 0.002 };
  scene.add(a);
  asteroids.push(a);
}

// ====== COMETAS ======
const cometCount = 10;
const cometGeometry = new THREE.SphereGeometry(0.1, 6, 6);
const cometMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const comets = [];

for (let i = 0; i < cometCount; i++) {
  const comet = new THREE.Mesh(cometGeometry, cometMaterial);
  const distance = 50 + Math.random() * 100;
  const angle = Math.random() * Math.PI * 2;
  comet.position.set(Math.cos(angle) * distance, (Math.random() - 0.5) * 20, Math.sin(angle) * distance);
  comet.userData = { angle, radius: distance, speed: 0.001 + Math.random() * 0.002, direction: Math.random() < 0.5 ? 1 : -1 };

  // Tail: un Points con BufferGeometry reutilizable por cometa
  const particleCount = 30;
  const tailGeom = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3); // inicialmente zeros
  tailGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const tailMat = new THREE.PointsMaterial({ size: 0.05, transparent: true, opacity: 0.8 });
  const tail = new THREE.Points(tailGeom, tailMat);
  comet.add(tail);
  comet.userData.tail = tail;

  scene.add(comet);
  comets.push(comet);
}

// ====== INTERACCIÓN Y DOM (cacheo) ======
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const modal = document.getElementById('info-modal');
const closeBtn = document.querySelector('.modal .close');
const statsNameEl = document.getElementById('stats-name');
const statsDistanceEl = document.getElementById('stats-distance');
const statsSpeedEl = document.getElementById('stats-speed');
const planetNameEl = document.getElementById('planet-name');
const planetInfoEl = document.getElementById('planet-info');

let followTarget = null;
const zoomOffset = new THREE.Vector3(0, 2, 10);

// Actualizar estadísticas (más compacto)
function updatePlanetStats(planetMesh, planetData) {
  if (!planetMesh || !planetData) {
    statsNameEl.textContent = 'Sistema Solar';
    statsDistanceEl.textContent = 'Distancia al Sol: -';
    statsSpeedEl.textContent = 'Velocidad orbital: -';
    return;
  }
  const sunPos = new THREE.Vector3(); sun.getWorldPosition(sunPos);
  const planetPos = new THREE.Vector3(); planetMesh.getWorldPosition(planetPos);
  const distance = planetPos.distanceTo(sunPos);
  const speed = (planetData.orbitalSpeed || 0) * (planetData.orbitRadius || 1);
  statsNameEl.textContent = planetData.name;
  statsDistanceEl.textContent = `Distancia al Sol: ${distance.toFixed(2)} unidades astronomicas`;
  statsSpeedEl.textContent = `Velocidad orbital: ${speed.toFixed(3)} rad/unidad de tiempo`;
}

function formatExtraInfo(planetData) {
  let out = '';
  if (planetData.composition) out += `<strong>Composición:</strong> ${planetData.composition}<br>`;
  if (planetData.temperature) out += `<strong>Temperatura:</strong> ${planetData.temperature}<br>`;
  if (planetData.atmosphere) out += `<strong>Atmósfera:</strong> ${planetData.atmosphere}<br>`;
  if (planetData.satellites) out += `<strong>Satélites notables:</strong> ${planetData.satellites}<br>`;
  if (planetData.funFact) out += `<br><strong>Dato curioso:</strong> ${planetData.funFact}<br>`;
  if (planetData.exploration) out += `<strong>Exploración:</strong> ${planetData.exploration}<br>`;
  return out;
}

function onPlanetClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  // objetos clicables: planetMeshes, sun y la luna si existe
  const clickable = planetMeshes.slice();
  clickable.push(sun);
  if (scene.userData._moon) clickable.push(scene.userData._moon);

  const intersects = raycaster.intersectObjects(clickable);
  if (intersects.length === 0) return;

  const clicked = intersects[0].object;
  const planetData = clicked.userData || {};

  let targetGroup = null;
  if (clicked === sun) targetGroup = sun;
  else if (scene.userData._moon && clicked === scene.userData._moon) targetGroup = scene.userData._moonGroup;
  else {
    const idx = planetMeshes.indexOf(clicked);
    if (idx >= 0) targetGroup = planetGroups[idx];
  }

  if (targetGroup) {
    followTarget = targetGroup;
    controls.enabled = false;
  }

  planetNameEl.textContent = planetData.name || 'Objeto';
  planetInfoEl.innerHTML = `
    <strong>Mass:</strong> ${planetData.mass || '-'}<br>
    <strong>Radius:</strong> ${planetData.radius || '-'}<br>
    <br><span class="description">${planetData.description || ''}</span><br><br>
    ${formatExtraInfo(planetData)}
  `;
  modal.style.display = 'block';
}

window.addEventListener('click', onPlanetClick);

function exitFollowMode() {
  modal.style.display = 'none';
  followTarget = null;
  controls.enabled = true;
  updatePlanetStats(null, null);
}
closeBtn.addEventListener('click', exitFollowMode);
window.addEventListener('click', (e) => { if (e.target === modal) exitFollowMode(); });

// ====== CONSTELACIONES ======
const CONSTELLATION_RADIUS = 2000; // radio de la "esfera celeste" (ajústalo si quieres)
const constellationGroup = new THREE.Group();
constellationGroup.name = 'Constellations';
scene.add(constellationGroup);
let constellationVisible = true;
const constellationLinesStore = []; // referencias a los LineSegments creados

function deg2rad(d){ return d * Math.PI / 180; }

function celestialToCartesian(raDeg, decDeg, radius = CONSTELLATION_RADIUS){
  // Asumimos RA en grados (0-360). Si tu dataset usa horas, convierte: raHours * 15 = raDeg
  const ra = deg2rad(raDeg);
  const dec = deg2rad(decDeg);
  const x = radius * Math.cos(dec) * Math.cos(ra);
  const y = radius * Math.sin(dec);
  const z = radius * Math.cos(dec) * Math.sin(ra);
  return new THREE.Vector3(x, y, z);
}

/**
 * Espera un JSON con la forma:
 * [
 *   { "name": "Orion", "lines": [ [ {ra,dec}, {ra,dec} ], ... ] },
 *   ...
 * ]
 */
async function loadConstellationsJSON(url = getAssetUrl('./constellations.json')) {
  // fallback simple si falla la carga
  const fallback = [
    {
      "name": "Orion",
      "lines": [
        [ { "ra": 83.822, "dec": -5.391 }, { "ra": 78.634, "dec": -8.201 } ],
        [ { "ra": 78.634, "dec": -8.201 }, { "ra": 81.282, "dec": 6.350 } ],
        [ { "ra": 81.282, "dec": 6.350 }, { "ra": 88.793, "dec": 7.407 } ],
        [ { "ra": 88.793, "dec": 7.407 }, { "ra": 83.822, "dec": -5.391 } ]
      ]
    },
    {
      "name": "Ursa Major",
      "lines": [
        [ { "ra": 165.460, "dec": 56.382 }, { "ra": 165.932, "dec": 61.751 } ],
        [ { "ra": 165.932, "dec": 61.751 }, { "ra": 177.264, "dec": 65.716 } ],
        [ { "ra": 177.264, "dec": 65.716 }, { "ra": 183.856, "dec": 57.032 } ]
      ]
    },
    {
      "name": "Scorpius",
      "lines": [
        [ { "ra": 263.402, "dec": -37.103 }, { "ra": 252.784, "dec": -34.705 } ],
        [ { "ra": 252.784, "dec": -34.705 }, { "ra": 247.351, "dec": -26.431 } ]
      ]
    }
  ];

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudo cargar constellations.json: ' + res.status);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Fallo al cargar constellations.json, usando fallback. Error:', err);
    return fallback;
  }
}

function createConstellationLines(constellations) {
  // limpiar previo
  while (constellationGroup.children.length) constellationGroup.remove(constellationGroup.children[0]);
  constellationLinesStore.length = 0;

  constellations.forEach(constObj => {
    const lines = constObj.lines || [];
    // contador de vértices: 2 vértices por línea
    const positions = new Float32Array(lines.length * 2 * 3);
    let ptr = 0;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      // l puede ser [p1, p2] o una estructura diferente; asumimos lo explicado anteriormente
      const p1 = l[0];
      const p2 = l[1];
      const v1 = celestialToCartesian(p1.ra, p1.dec);
      const v2 = celestialToCartesian(p2.ra, p2.dec);

      positions[ptr++] = v1.x;
      positions[ptr++] = v1.y;
      positions[ptr++] = v1.z;

      positions[ptr++] = v2.x;
      positions[ptr++] = v2.y;
      positions[ptr++] = v2.z;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // Material sutil (puedes ajustar color/opacidad)
    const mat = new THREE.LineBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.25,
      depthWrite: false
      // linewidth no funciona en la mayoría de contextos WebGL: cuidado
    });

    // Usamos LineSegments: cada par de vértices es una línea independiente
    const linesMesh = new THREE.LineSegments(geom, mat);
    linesMesh.userData = { name: constObj.name };
    // renderOrder y frustumCulling false para que siempre se vea (si quieres)
    linesMesh.renderOrder = 0;
    linesMesh.frustumCulled = false;

    constellationGroup.add(linesMesh);
    constellationLinesStore.push(linesMesh);
  });
}

async function initConstellations() {
  const data = await loadConstellationsJSON(getAssetUrl('./constellations.json'));
  createConstellationLines(data);
}
initConstellations();

// ====== ANIMACIÓN (optimizada) ======
function animate() {
  requestAnimationFrame(animate);
  const now = Date.now();

  const timeSmall = now * 0.0001; // para órbitas lentas
  const timeFast = now * 0.001;   // para luna / rotaciones más rápidas

  // Seguimiento de objetivo: interpolación suave
  if (followTarget) {
    const targetPos = new THREE.Vector3();
    followTarget.getWorldPosition(targetPos);

    const targetSize = (followTarget.children[0]?.userData?.size) || followTarget.userData?.size || 1;
    const desiredPos = targetPos.clone().add(zoomOffset.clone().multiplyScalar(targetSize));

    camera.position.lerp(desiredPos, 0.05);
    controls.target.lerp(targetPos, 0.05);

    // determinar planetMesh y datos para stats
    let planetData = null, planetMesh = null;
    if (followTarget === sun) { planetData = sun.userData; planetMesh = sun; }
    else if (followTarget === scene.userData._moonGroup) { planetData = scene.userData._moon.userData; planetMesh = scene.userData._moon; }
    else {
      const idx = planetGroups.indexOf(followTarget);
      planetData = planets[idx + 1];
      planetMesh = followTarget.children[0];
    }
    updatePlanetStats(planetMesh, planetData);
  }

  // Planetas: rotación y órbitas
  for (let i = 0; i < planetGroups.length; i++) {
    const group = planetGroups[i];
    const data = planets[i + 1];
    if (!data) continue;
    // rotación del planeta (hijo 0)
    const mesh = group.children[0];
    mesh.rotation.y += (data.rotationSpeed || 0) * 0.005;
    // posición orbital
    const angle = timeSmall * (data.orbitalSpeed || 0);
    const r = data.orbitRadius || 10;
    group.position.x = Math.cos(angle) * r;
    group.position.z = Math.sin(angle) * r;
  }

  // Luna
  if (scene.userData._moon && scene.userData._moonGroup) {
    const moon = scene.userData._moon;
    const moonGroup = scene.userData._moonGroup;
    moon.rotation.y += 0.005;
    const moonAngle = timeFast;
    moonGroup.position.x = Math.cos(moonAngle) * moonData.orbitRadius;
    moonGroup.position.z = Math.sin(moonAngle) * moonData.orbitRadius;
  }

  // Estación
  const stationAngle = timeSmall * stationData.orbitalSpeed;
  stationGroup.position.x = Math.cos(stationAngle) * stationData.orbitRadius;
  stationGroup.position.z = Math.sin(stationAngle) * stationData.orbitRadius;
  stationGroup.rotation.y += 0.005;

  // Asteroides
  for (let i = 0; i < asteroids.length; i++) {
    const a = asteroids[i];
    a.userData.angle += a.userData.speed;
    a.position.x = Math.cos(a.userData.angle) * a.userData.radius;
    a.position.z = Math.sin(a.userData.angle) * a.userData.radius;
  }

  // Cometas y sus colas
  for (let i = 0; i < comets.length; i++) {
    const c = comets[i];
    c.userData.angle += c.userData.speed * c.userData.direction;
    c.position.x = Math.cos(c.userData.angle) * c.userData.radius;
    c.position.z = Math.sin(c.userData.angle) * c.userData.radius;

    const tail = c.userData.tail;
    const positions = tail.geometry.attributes.position.array;
    // correr buffer hacia atrás
    for (let j = positions.length - 3; j >= 3; j--) {
      positions[j] = positions[j - 3];
      positions[j + 1] = positions[j - 2];
      positions[j + 2] = positions[j - 1];
    }
    positions[0] = c.position.x;
    positions[1] = c.position.y;
    positions[2] = c.position.z;
    tail.geometry.attributes.position.needsUpdate = true;
  }

  controls.update();

  renderer.render(scene, camera);

}

// ====== Menú de Constelaciones ======
function createConstellationMenuUI() {
  const container = document.createElement('div');
  container.className = 'constellation-menu-container';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'constellation-menu-toggle';
  toggleBtn.textContent = 'Constelaciones';

  const optionsList = document.createElement('ul');
  optionsList.className = 'constellation-options';

  const famousConstellations = [
    'Orion', 'Ursa Major', 'Ursa Minor', 'Cassiopeia', 'Crux', 'Scorpius',
    'Sagittarius', 'Leo', 'Taurus', 'Gemini', 'Aries', 'Virgo'
  ];

  const options = [
    { text: 'Mostrar Famosas (12)', action: () => {
      constellationGroup.visible = true;
      constellationLinesStore.forEach(line => {
        line.visible = famousConstellations.includes(line.userData.name);
      });
    }},
    { text: 'Mostrar Todas', action: () => {
      constellationGroup.visible = true;
      constellationLinesStore.forEach(line => { line.visible = true; });
    }},
    { text: 'Ocultar Todas', action: () => {
      constellationGroup.visible = false;
    }}
  ];

  options.forEach(opt => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = opt.text;
    btn.addEventListener('click', () => {
      opt.action();
      optionsList.style.display = 'none'; // Ocultar menú tras selección
    });
    li.appendChild(btn);
    optionsList.appendChild(li);
  });

  container.appendChild(optionsList);
  container.appendChild(toggleBtn);
  document.body.appendChild(container);

  // Lógica para mostrar/ocultar el menú
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Evita que el click se propague al window
    optionsList.style.display = optionsList.style.display === 'block' ? 'none' : 'block';
  });

  // Ocultar el menú si se hace clic en cualquier otro lugar
  window.addEventListener('click', () => {
    if (optionsList.style.display === 'block') {
      optionsList.style.display = 'none';
    }
  });

  // atajo tecla 'C'
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'c' && document.activeElement.tagName !== 'INPUT' && !e.ctrlKey && !e.metaKey) {
      // Simula la acción de "Ocultar Todas" si están visibles, o "Mostrar Todas" si no.
      const isCurrentlyVisible = constellationGroup.visible;
      constellationGroup.visible = !isCurrentlyVisible;
    }
  });
}
createConstellationMenuUI();

// ====== FIN CONSTELACIONES ======
animate();

// ====== REDIMENSION ======
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
