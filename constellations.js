import * as THREE from 'three';
import { CONSTELLATION_RADIUS } from './config.js';
import { pickableObjects, scene } from './celestialObjects.js';
import { getAssetUrl } from './core.js';

export const constellationGroup = new THREE.Group();
constellationGroup.name = 'Constellations';
scene.add(constellationGroup);

export const constellationLinesStore = [];

function deg2rad(d) { return d * Math.PI / 180; }

function celestialToCartesian(raDeg, decDeg, radius = CONSTELLATION_RADIUS) {
    const ra = deg2rad(raDeg);
    const dec = deg2rad(decDeg);
    const x = radius * Math.cos(dec) * Math.cos(ra);
    const y = radius * Math.sin(dec);
    const z = radius * Math.cos(dec) * Math.sin(ra);
    return new THREE.Vector3(x, y, z);
}

async function loadConstellationsJSON(url = getAssetUrl('recursos/constellations.json')) {
    const fallback = [
        {
            "name": "Orion", "lines": [
                [{ "ra": 83.822, "dec": -5.391 }, { "ra": 78.634, "dec": -8.201 }],
                [{ "ra": 78.634, "dec": -8.201 }, { "ra": 81.282, "dec": 6.350 }],
                [{ "ra": 81.282, "dec": 6.350 }, { "ra": 88.793, "dec": 7.407 }],
                [{ "ra": 88.793, "dec": 7.407 }, { "ra": 83.822, "dec": -5.391 }]
            ]
        },
    ];

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('No se pudo cargar constellations.json: ' + res.status);
        return await res.json();
    } catch (err) {
        console.warn('Fallo al cargar constellations.json, usando fallback. Error:', err);
        return fallback;
    }
}

function createConstellationLines(constellations) {
    while (constellationGroup.children.length) constellationGroup.remove(constellationGroup.children[0]);
    constellationLinesStore.length = 0;

    constellations.forEach(constObj => {
        const lines = constObj.lines || [];
        const positions = new Float32Array(lines.length * 2 * 3);
        let ptr = 0;
        for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            const p1 = l[0]; const p2 = l[1];
            const v1 = celestialToCartesian(p1.ra, p1.dec);
            const v2 = celestialToCartesian(p2.ra, p2.dec);

            positions[ptr++] = v1.x; positions[ptr++] = v1.y; positions[ptr++] = v1.z;
            positions[ptr++] = v2.x; positions[ptr++] = v2.y; positions[ptr++] = v2.z;
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.LineBasicMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.6, // Increased base opacity for better visibility
            depthWrite: false
        });

        const linesMesh = new THREE.LineSegments(geom, mat);
        linesMesh.userData = { name: constObj.name, isConstellation: true };
        linesMesh.frustumCulled = false;

        // Creamos una caja invisible y más grande para facilitar el clic.
        geom.computeBoundingBox();
        const boundingBox = geom.boundingBox;
        const boxSize = new THREE.Vector3();
        boundingBox.getSize(boxSize);
        
        // Hacemos la caja un poco más grande para que sea más fácil de clickear
        boxSize.multiplyScalar(1.2); 

        const clickableBoxGeo = new THREE.BoxGeometry(boxSize.x, boxSize.y, boxSize.z);
        const clickableBoxMat = new THREE.MeshBasicMaterial({ visible: false });
        const clickableBox = new THREE.Mesh(clickableBoxGeo, clickableBoxMat);
        
        boundingBox.getCenter(clickableBox.position);
        clickableBox.userData = { name: constObj.name, isConstellation: true };

        constellationGroup.add(linesMesh, clickableBox);
        constellationLinesStore.push(linesMesh);
        pickableObjects.push(clickableBox); // Solo la caja invisible será clickeable
    });
}

export async function initConstellations() {
    try {
        const data = await loadConstellationsJSON(getAssetUrl('recursos/constellations.json'));
        createConstellationLines(data);
    } catch (error) {
        console.error("No se pudieron inicializar las constelaciones:", error);
    }
}