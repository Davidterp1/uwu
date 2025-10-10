import * as THREE from 'three';
import { scene, gltfLoader, loadTextureCached, getAssetUrl } from './core.js';
import { planets, moonData, stationData } from './config.js';

const commonSphereGeoCache = new Map();
function getSphereGeometry(size, detail = 32) {
    const key = `${size}_${detail}`;
    if (!commonSphereGeoCache.has(key)) {
        commonSphereGeoCache.set(key, new THREE.SphereGeometry(size, detail, detail));
    }
    return commonSphereGeoCache.get(key);
}

export const pickableObjects = [];

// ====== CREAR SOL ======
const sunMat = new THREE.MeshBasicMaterial({ map: loadTextureCached(planets[0].texture) });
export const sun = new THREE.Mesh(getSphereGeometry(planets[0].size), sunMat);
sun.castShadow = false;
sun.receiveShadow = false;
sun.userData = planets[0];
scene.add(sun);
pickableObjects.push(sun);

// ====== CREAR PLANETAS ======
export const planetMeshes = [];
export const planetGroups = [];

function createOrbitLine(radius, color = 0xffffff, opacity = 0.15, segments = 128) {
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
    const sphereGeom = getSphereGeometry(p.size, 32);
    const mat = new THREE.MeshStandardMaterial({ map: loadTextureCached(p.texture) });

    const mesh = new THREE.Mesh(sphereGeom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = p;

    const group = new THREE.Group();
    scene.add(group);

    const pivot = new THREE.Group();
    pivot.rotation.z = THREE.MathUtils.degToRad(p.axialTilt || 0);
    group.add(pivot);
    pivot.add(mesh);

    if (p.ring) {
        const ringTexture = p.ringTexture ? loadTextureCached(p.ringTexture) : null;
        const ringGeom = new THREE.RingGeometry(p.size + p.ring.innerRadius, p.size + p.ring.outerRadius, 64);
        const ringMat = new THREE.MeshStandardMaterial({
            map: ringTexture, alphaMap: ringTexture, side: THREE.DoubleSide,
            transparent: true, depthWrite: false, alphaTest: 0.1
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.receiveShadow = true;
        if (p.name !== 'Uranus') ringMesh.rotation.x = -0.5 * Math.PI;
        pivot.add(ringMesh);
        if (p.name === 'Saturn' || p.name === 'Uranus') {
            mesh.renderOrder = 0;
            ringMesh.renderOrder = 1;
        }
    }

    scene.add(createOrbitLine(p.orbitRadius || 10));

    planetMeshes.push(mesh);
    planetGroups.push(group);
    pickableObjects.push(mesh);
}

// ====== LUNA ======
const earthIndex = planets.findIndex(pl => pl.name === 'Earth');
if (earthIndex >= 0 && planetGroups[earthIndex - 1]) {
    const earthGroup = planetGroups[earthIndex - 1];
    const moon = new THREE.Mesh(getSphereGeometry(moonData.size, 16), new THREE.MeshStandardMaterial({ map: loadTextureCached(moonData.texture) }));
    moon.userData = moonData;
    const moonGroup = new THREE.Group();
    moonGroup.add(moon);
    earthGroup.add(moonGroup);

    scene.userData._moon = moon;
    scene.userData._moonGroup = moonGroup;

    pickableObjects.push(moon);
}

// ====== ESTACION (GLTF) ======
export const stationGroup = new THREE.Group();
scene.add(stationGroup);
gltfLoader.load(getAssetUrl('models/estacion.glb'), gltf => {
    const model = gltf.scene;
    model.scale.set(0.01, 0.01, 0.01);
    stationGroup.add(model);
}, undefined, err => console.error(err));
pickableObjects.push(stationGroup);

// ====== CINTURÓN DE ASTEROIDES (InstancedMesh) ======
const asteroidCount = 1800;
const asteroidGeo = new THREE.SphereGeometry(0.05, 4, 4);
const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
export const asteroidsInstanced = new THREE.InstancedMesh(asteroidGeo, asteroidMat, asteroidCount);
asteroidsInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(asteroidsInstanced);

export const asteroidMetas = new Array(asteroidCount);
for (let i = 0; i < asteroidCount; i++) {
    const radius = 24 + Math.random() * 7;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.001 + Math.random() * 0.002;
    asteroidMetas[i] = { radius, angle, speed };
    const m = new THREE.Matrix4();
    m.makeTranslation(Math.cos(angle) * radius, (Math.random() - 0.5) * 1, Math.sin(angle) * radius);
    asteroidsInstanced.setMatrixAt(i, m);
}
asteroidsInstanced.instanceMatrix.needsUpdate = true;

// ====== COMETAS ======
const cometCount = 8;
const cometGeometry = new THREE.SphereGeometry(0.1, 6, 6);
const cometMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
export const comets = [];

for (let i = 0; i < cometCount; i++) {
    const comet = new THREE.Mesh(cometGeometry, cometMaterial);
    const distance = 60 + Math.random() * 100;
    const angle = Math.random() * Math.PI * 2;
    comet.position.set(Math.cos(angle) * distance, (Math.random() - 0.5) * 20, Math.sin(angle) * distance);
    comet.userData = { angle, radius: distance, speed: 0.001 + Math.random() * 0.002, direction: Math.random() < 0.5 ? 1 : -1 };

    const particleCount = 12;
    const tailGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    tailGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    comet.userData.tailIndex = 0;
    comet.userData.tailPositions = positions;
    comet.userData.tailParticleCount = particleCount;

    const tailMat = new THREE.PointsMaterial({ size: 0.08, transparent: true, opacity: 0.9 });
    const tail = new THREE.Points(tailGeom, tailMat);
    tail.frustumCulled = true;
    comet.add(tail);
    comet.userData.tail = tail;

    scene.add(comet);
    comets.push(comet);
}

export { scene };