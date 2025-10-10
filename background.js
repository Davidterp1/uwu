import * as THREE from 'three';
import { scene, loadTextureCached, getAssetUrl } from './core.js';

export const nebulaGroups = [];
export const blackHoles = [];
export const activeSupernovas = [];

// ====== ESTRELLAS (usando BufferGeometry una sola vez) ======
function createStars() {
    const starCount = 20000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        positions[3 * i] = (Math.random() - 0.5) * 5000;
        positions[3 * i + 1] = (Math.random() - 0.5) * 5000;
        positions[3 * i + 2] = (Math.random() - 0.5) * 5000;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ size: 0.6, transparent: true, opacity: 0.8 });
    mat.fog = false;
    scene.add(new THREE.Points(geom, mat));
}

// ====== CAMPO DE ESTRELLAS INFERIOR (para llenar el vacío) ======
function createLowerStarfield() {
    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        positions[3 * i] = (Math.random() - 0.5) * 5000;
        positions[3 * i + 1] = -Math.random() * 2500; // Solo en la parte de abajo
        positions[3 * i + 2] = (Math.random() - 0.5) * 5000;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ size: 0.5, transparent: true, opacity: 0.7 });
    mat.fog = false;
    scene.add(new THREE.Points(geom, mat));
}

// ====== POLVO GALÁCTICO (nueva capa de profundidad) ======
function createGalacticDust() {
    const dustCount = 50000;
    const positions = new Float32Array(dustCount * 3);
    const radius = 4000;
    const thickness = 200;

    for (let i = 0; i < dustCount; i++) {
        const r = Math.random() * radius;
        const theta = Math.random() * 2 * Math.PI;

        positions[3 * i] = Math.cos(theta) * r;
        positions[3 * i + 1] = (Math.random() - 0.5) * thickness;
        positions[3 * i + 2] = Math.sin(theta) * r;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
        size: 0.8,
        color: 0xaaaaee,
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    scene.add(new THREE.Points(geom, mat));
}

// ====== NEBULOSAS ======
function createColoredNebula({ particleCount, baseSize, texture, color, center, radius, shape = 'sphere' }) { // eslint-disable-line no-unused-vars
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const base = new THREE.Color(color.r, color.g, color.b); // eslint-disable-line no-unused-vars
    for (let i = 0; i < particleCount; i++) {
        let x, y, z, r;

        switch (shape) {
            case 'disk':
                r = Math.random() * radius;
                const theta = Math.random() * 2 * Math.PI;
                x = center.x + r * Math.cos(theta);
                y = center.y + (Math.random() - 0.5) * (radius * 0.1);
                z = center.z + r * Math.sin(theta);
                break;
            case 'box':
                x = center.x + (Math.random() - 0.5) * radius * 2;
                y = center.y + (Math.random() - 0.5) * radius * 2;
                z = center.z + (Math.random() - 0.5) * radius * 2;
                r = Math.sqrt(Math.pow(x - center.x, 2) + Math.pow(y - center.y, 2) + Math.pow(z - center.z, 2));
                break;
            case 'sphere':
            default:
                r = Math.random() * radius;
                const s_theta = Math.random() * 2 * Math.PI;
                const s_phi = Math.acos(2 * Math.random() - 1);
                x = center.x + r * Math.sin(s_phi) * Math.cos(s_theta);
                y = center.y + r * Math.sin(s_phi) * Math.sin(s_theta);
                z = center.z + r * Math.cos(s_phi);
                break;
        }
        positions[3 * i] = x; positions[3 * i + 1] = y; positions[3 * i + 2] = z;

        const effectiveRadius = (shape === 'box') ? radius * 1.414 : radius;
        const distFactor = Math.max(0, 1.0 - (r / effectiveRadius)); // 1 en el centro, 0 en el borde
        const factor = 0.6 + distFactor * 0.4; // eslint-disable-line no-unused-vars
        const c = base.clone().multiplyScalar(factor); // eslint-disable-line no-unused-vars
        colors[3 * i] = c.r; colors[3 * i + 1] = c.g; colors[3 * i + 2] = c.b; // eslint-disable-line no-unused-vars

        sizes[i] = baseSize * (0.1 + Math.random() * 0.9) * distFactor;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3)); // eslint-disable-line no-unused-vars
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1)); // eslint-disable-line no-unused-vars
    geom.computeBoundingSphere();
 
    const mat = new THREE.PointsMaterial({
        size: baseSize,
        map: texture,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.15, // Un poco más opaco
        depthWrite: false,
        vertexColors: true
    });

    const points = new THREE.Points(geom, mat);
    points.frustumCulled = true;

    const group = new THREE.Group();
    group.add(points);
    nebulaGroups.push(group);
    scene.add(group);
}

// ====== SUPERNOVAS ======
export function createSupernova(position) {
    const supernovaTexture = loadTextureCached(getAssetUrl('recursos/smokeA.png'));
    const coreColors = [new THREE.Color(0xffffff), new THREE.Color(0xffdcb1), new THREE.Color(0xb1c9ff)];
    const startColor = coreColors[Math.floor(Math.random() * coreColors.length)];

    // Capa 0: Destello inicial cegador
    const flashMaterial = new THREE.SpriteMaterial({
        map: supernovaTexture,
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
    });
    const flashSprite = new THREE.Sprite(flashMaterial);

    // Capa 1: El núcleo brillante
    const coreMaterial = new THREE.SpriteMaterial({
        map: supernovaTexture,
        color: startColor,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
        rotation: Math.random() * Math.PI * 2,
    });
    const coreSprite = new THREE.Sprite(coreMaterial);

    // Capa 2: La onda de choque de gas
    const shellMaterial = new THREE.SpriteMaterial({
        map: supernovaTexture,
        color: startColor,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        rotation: Math.random() * Math.PI * 2,
    });
    const shellSprite = new THREE.Sprite(shellMaterial);

    // Capa 3: La luz que emite la explosión
    const pointLight = new THREE.PointLight(startColor, 15, 2000); // color, intensidad, distancia

    // Agrupamos ambas capas en un solo objeto
    const supernovaGroup = new THREE.Group();
    supernovaGroup.add(flashSprite);
    supernovaGroup.add(coreSprite);
    supernovaGroup.add(shellSprite);
    supernovaGroup.add(pointLight);
    supernovaGroup.position.copy(position);

    // Guardamos datos para la animación
    supernovaGroup.userData = {
        isSupernova: true,
        startTime: Date.now(),
        duration: 9000 + Math.random() * 6000, // Duración entre 9 y 15 segundos
        startColor: startColor,
        light: pointLight,
    };

    scene.add(supernovaGroup);
    activeSupernovas.push(supernovaGroup);
}

// ====== AGUJEROS NEGROS ======
export function createBlackHole({ position, size }) {
    const blackHoleGroup = new THREE.Group();
    blackHoleGroup.position.copy(position);

    // 1. Horizonte de sucesos (la esfera negra)
    const horizonGeometry = new THREE.SphereGeometry(size, 64, 64);
    const horizonMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const horizon = new THREE.Mesh(horizonGeometry, horizonMaterial);
    blackHoleGroup.add(horizon);

    // 2. Disco de acreción brillante
    const diskTexture = loadTextureCached(getAssetUrl('recursos/smokeA.png'));
    const diskGeometry = new THREE.RingGeometry(size * 1.2, size * 4, 128); // Hacemos el disco más ancho
    const diskMaterial = new THREE.MeshBasicMaterial({
        map: diskTexture,
        color: 0xffaa33, // Tinte anaranjado para el gas caliente
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0, // Un poco más brillante
        depthWrite: false,
    });
    const disk = new THREE.Mesh(diskGeometry, diskMaterial);

    // Inclinar el disco aleatoriamente para darle un aspecto más natural
    disk.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    disk.rotation.y = (Math.random() - 0.5) * 0.4;

    blackHoleGroup.add(disk);

    scene.add(blackHoleGroup);
    blackHoles.push(blackHoleGroup);
}

// ====== GALAXIAS DISTANTES (Sprites) ======
function createDistantGalaxies() {
    const galaxyCount = 25;
    const galaxyTexture = loadTextureCached(getAssetUrl('recursos/smokeA.png'));
    const galaxyMaterial = new THREE.SpriteMaterial({
        map: galaxyTexture, color: 0xffffcc, blending: THREE.AdditiveBlending,
        opacity: 0.2, depthWrite: false, transparent: true
    });

    for (let i = 0; i < galaxyCount; i++) {
        const sprite = new THREE.Sprite(galaxyMaterial);
        const r = 3000 + Math.random() * 2000;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const y_sign = (i < galaxyCount / 2) ? 1 : -1;
        sprite.position.set(r * Math.sin(phi) * Math.cos(theta), y_sign * r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
        const scale = (100 + Math.random() * 150) * (1 - (r - 3000) / 2000);
        sprite.scale.set(scale, scale, 1);
        scene.add(sprite);
    }
}

// ====== INICIALIZACIÓN DEL FONDO (optimización de arranque) ======
export async function initBackground() {
    createStars();
    createLowerStarfield();
    createGalacticDust();
    createDistantGalaxies();

    const nebulaTextures = [
        loadTextureCached(getAssetUrl('recursos/smoke.png')),
        loadTextureCached(getAssetUrl('recursos/smokeA.png'))
    ];
    const nebulaColors = [
        new THREE.Color(0.8, 0.2, 0.9),
        new THREE.Color(0.2, 0.4, 0.9),
        new THREE.Color(0.9, 0.4, 0.2)
    ];
    const nebulaCount = 40; // Aumentamos aún más el número de nebulosas
    const nebulaShapes = ['sphere', 'disk', 'box'];
    for (let i = 0; i < nebulaCount; i++) { 
        const r = 1500 + Math.random() * 3000;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const y_sign = (i < nebulaCount / 2) ? 1 : -1;

        let center = new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
        center.y *= y_sign;

        createColoredNebula({
            particleCount: 100,
            baseSize: 200,
            texture: nebulaTextures[i % nebulaTextures.length],
            color: nebulaColors[i % nebulaColors.length],
            center: center,
            radius: 400 + Math.random() * 400,
            shape: nebulaShapes[i % nebulaShapes.length]
        });
    }

    return Promise.resolve();
}