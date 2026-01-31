
import * as THREE from 'three';
import { CONSTELLATION_RADIUS, famousConstellations } from './appConfig.js';
import { scene } from './threeCore.js';
import { loadTextureCached, raycaster } from './threeCore.js';import { getAssetUrl } from './utils.js';

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

function createConstellationLines(constellationData) {
    // Limpieza más eficiente del grupo y del array de almacenamiento
    constellationGroup.clear();
    constellationLinesStore.length = 0;

    // Creamos materiales reutilizables para optimizar memoria
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.3,
        depthWrite: false
    });

    // Filtramos para solo incluir las constelaciones famosas definidas en appConfig.js
    const filteredConstellations = constellationData.filter(constObj => famousConstellations.includes(constObj.name));

    filteredConstellations.forEach(constObj => { // eslint-disable-line no-unused-vars
        const starPositions = new Float32Array(constObj.stars.length * 3);
        const starSizes = new Float32Array(constObj.stars.length);
        const starOpacities = new Float32Array(constObj.stars.length);
        const starPositionMap = new Map();
        constObj.stars.forEach((star, i) => {
            const v = celestialToCartesian(star.ra, star.dec);
            starPositions[i * 3] = v.x;
            starPositions[i * 3 + 1] = v.y;
            starPositions[i * 3 + 2] = v.z;

            // El tamaño y la opacidad se basan en la magnitud (magnitudes más bajas son más brillantes).
            const magnitude = star.mag || 3; // Usamos 3 como magnitud por defecto si no está definida.
            starSizes[i] = Math.max(0.5, 5 - magnitude) * 2.5;
            starOpacities[i] = Math.max(0.4, 1.0 - magnitude / 6.0);

            // Guardamos la posición cartesiana para reutilizarla al crear las líneas
            if (star.name) starPositionMap.set(star.name, v); // Usamos el nombre como clave
        });

        const starsGeom = new THREE.BufferGeometry();
        starsGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starsGeom.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
        starsGeom.setAttribute('opacity', new THREE.BufferAttribute(starOpacities, 1));

        const starsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0xadc8ff) },
                globalPulse: { value: 1.0 },
                pointTexture: { value: loadTextureCached(getAssetUrl('recursos/smokeA.png')) }
            },
            vertexShader: `
                attribute float size;
                attribute float opacity;
                varying float vOpacity;
                uniform float globalPulse;
                void main() {
                    vOpacity = opacity * globalPulse;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z) * globalPulse;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform sampler2D pointTexture;
                varying float vOpacity;
                void main() {
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    gl_FragColor = vec4(color * texColor.rgb, texColor.a * vOpacity);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true
        });

        const starsMesh = new THREE.Points(starsGeom, starsMaterial);
        starsMesh.userData = { name: constObj.name, isConstellation: true, isStars: true };
        constellationLinesStore.push(starsMesh); // Guardamos para la animación de pulso.

        // --- Creación de líneas ---
        const lines = constObj.lines || [];
        const linePositions = [];
        let ptr = 0;
        lines.forEach(line => {
            const v1 = starPositionMap.get(line[0]);
            const v2 = starPositionMap.get(line[1]);

            if (v1 && v2) {
                linePositions.push(v1.x, v1.y, v1.z);
                linePositions.push(v2.x, v2.y, v2.z);
            }
        });

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

        const linesMesh = new THREE.LineSegments(geom, lineMaterial);
        linesMesh.userData = { name: constObj.name, isConstellation: true };
        linesMesh.frustumCulled = false;

        constellationGroup.add(starsMesh, linesMesh);
        constellationLinesStore.push(linesMesh);
    });
}

export async function initConstellations() {
    // Aumentamos el umbral del raycaster para que sea más fácil hacer clic en las líneas.
    raycaster.params.Line.threshold = 0.5;
    
    try {
        const response = await fetch(getAssetUrl('recursos/constellationData.json'));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const constellationData = await response.json();
        createConstellationLines(constellationData);
    } catch (error) {
        console.error("Could not load or parse constellation data:", error);
    }
}
