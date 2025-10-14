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
        startTime: performance.now(),
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
    horizon.name = 'horizon';
    blackHoleGroup.add(horizon);

    // 2. Lente Gravitacional (Shader para distorsionar el fondo)
    // Le asignamos una capa de renderizado diferente para poder controlarlo
    const LENSING_LAYER = 1;
    const lensingSphereGeo = new THREE.SphereGeometry(size * 1.1, 64, 64);
    const lensingMaterial = new THREE.ShaderMaterial({
        uniforms: {
            'sceneTexture': { value: null }, // La textura de la escena se pasará desde el bucle de render
            'screenResolution': { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            'blackHolePosition': { value: new THREE.Vector3() }, // La posición en pantalla del agujero negro
            'distortionStrength': { value: 0.05 } // Qué tan fuerte es la distorsión
        },
        vertexShader: `
            varying vec4 v_screenPosition;
            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                v_screenPosition = gl_Position;
            }
        `,
        fragmentShader: `
            uniform sampler2D sceneTexture;
            uniform vec2 screenResolution;
            uniform vec3 blackHolePosition;
            uniform float distortionStrength;
            varying vec4 v_screenPosition;

            void main() {
                // Coordenadas de pantalla del fragmento actual (de 0 a 1)
                vec2 screenUV = (v_screenPosition.xy / v_screenPosition.w) * 0.5 + 0.5;
                
                // Coordenadas de pantalla del centro del agujero negro (de 0 a 1)
                vec2 blackHoleUV = blackHolePosition.xy;

                vec2 toCenter = blackHoleUV - screenUV;
                float dist = length(toCenter);
                vec2 distortedUV = screenUV + normalize(toCenter) * (distortionStrength / (dist + 0.01));

                gl_FragColor = texture2D(sceneTexture, distortedUV);
            }
        `,
        side: THREE.BackSide, // Renderizamos la cara interna para que el efecto sea visible desde fuera.
        transparent: false, // No es necesario que sea transparente si solo dibuja negro.
        depthWrite: false, // No escribe en el buffer de profundidad para no ocultar el disco de acreción.
        blending: THREE.NormalBlending,
    });
    // Como no tenemos un mapa de entorno real, esta esfera simplemente creará una silueta oscura
    // que es ligeramente más grande que el horizonte, un primer paso hacia el lensing.
    // Para un efecto completo, se necesitaría un CubeCamera.
    const lensingSphere = new THREE.Mesh(lensingSphereGeo, lensingMaterial);
    lensingSphere.name = 'lensing';
    lensingSphere.layers.set(LENSING_LAYER); // Asignamos la esfera a su capa
    blackHoleGroup.add(lensingSphere);

    // 3. Disco de acreción realista con shaders
    const diskGroup = new THREE.Group();
    diskGroup.name = 'accretionDisk';

    const diskTexture = loadTextureCached(getAssetUrl('recursos/smokeA.png'));
    diskTexture.wrapS = diskTexture.wrapT = THREE.RepeatWrapping;

    const diskShaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            'time': { value: 0.0 },
            'diskTexture': { value: diskTexture },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform sampler2D diskTexture;
            varying vec2 vUv;

            void main() {
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(vUv, center);
                
                // Descartamos los fragmentos fuera del anillo para crear el agujero central
                if (dist > 0.5 || dist < 0.15) {
                    discard;
                }

                // Coordenadas polares para la rotación
                float angle = atan(vUv.y - center.y, vUv.x - center.x);
                float speed = 0.05 / (dist + 0.1); // Más rápido cerca del centro
                
                // Muestreamos la textura de ruido dos veces con diferente velocidad y escala para más detalle
                vec2 uv1 = vec2(angle / (2.0 * 3.14159), dist * 2.0);
                uv1.x += time * speed;
                vec4 noise1 = texture2D(diskTexture, uv1);

                vec2 uv2 = vec2(angle / (2.0 * 3.14159), dist * 3.0);
                uv2.x += time * speed * 0.7;
                vec4 noise2 = texture2D(diskTexture, uv2);

                float combinedNoise = noise1.r * 0.6 + noise2.r * 0.4;

                // Degradado de color desde el interior (amarillo/blanco) al exterior (rojo/naranja)
                vec3 innerColor = vec3(1.0, 0.8, 0.4); // Amarillo-blanco
                vec3 outerColor = vec3(1.0, 0.2, 0.0); // Rojo-naranja
                vec3 color = mix(innerColor, outerColor, smoothstep(0.15, 0.5, dist));

                // La intensidad del brillo es mayor en el centro
                float intensity = pow(1.0 - smoothstep(0.15, 0.5, dist), 2.0) * 2.0;
                
                gl_FragColor = vec4(color * combinedNoise * intensity, combinedNoise);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    const diskGeometry = new THREE.RingGeometry(size * 1.2, size * 4.0, 128);
    const mainDisk = new THREE.Mesh(diskGeometry, diskShaderMaterial);
    mainDisk.rotation.x = Math.PI / 2;
    diskGroup.add(mainDisk);

    // Inclinación general del disco
    diskGroup.rotation.x = 0.2;
    diskGroup.rotation.y = Math.random() * Math.PI;

    blackHoleGroup.add(diskGroup);    

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
    const nebulaCount = 80; // Aumentamos considerablemente el número de nebulosas
    const nebulaShapes = ['sphere', 'disk', 'box'];
    for (let i = 0; i < nebulaCount; i++) { 
        const r = 1500 + Math.random() * 3000;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const y_sign = (i < nebulaCount / 2) ? 1 : -1;

        let center = new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)
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