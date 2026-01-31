import * as THREE from 'three';
import { scene, loadTextureCached } from './threeCore.js';
import { getAssetUrl } from './utils.js';

export const nebulaGroups = [];
export const blackHoles = [];
export const pulsars = [];

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

// ====== SISTEMA DE SUPERNOVAS OPTIMIZADO (GPU) ======
export let supernovaSystem = null;
const MAX_SUPERNOVAS = 100; // Máximo de supernovas activas a la vez
let currentSupernovaIndex = 0;

function createSupernovaSystem() {
    const geometry = new THREE.BufferGeometry();

    // Atributos por cada supernova (vértice)
    const positions = new Float32Array(MAX_SUPERNOVAS * 3);
    const startTimes = new Float32Array(MAX_SUPERNOVAS);
    const durations = new Float32Array(MAX_SUPERNOVAS);
    const startColors = new Float32Array(MAX_SUPERNOVAS * 3);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // Atributos personalizados para la animación en el shader
    geometry.setAttribute('a_startTime', new THREE.Float32BufferAttribute(startTimes, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('a_duration', new THREE.Float32BufferAttribute(durations, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('a_startColor', new THREE.Float32BufferAttribute(startColors, 3).setUsage(THREE.DynamicDrawUsage));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            u_time: { value: 0.0 },
            u_timeScale: { value: 1.0 },
            u_texture: { value: loadTextureCached(getAssetUrl('recursos/smokeA.png')) }
        },
        vertexShader: `
            attribute float a_startTime;
            attribute float a_duration;
            attribute vec3 a_startColor;

            uniform float u_time;
            uniform float u_timeScale;

            varying float v_lifeRatio;
            varying vec3 v_color;

            void main() {
                // El tiempo de vida de la supernova también se ve afectado por la escala de tiempo del juego
                float elapsedTime = (u_time - a_startTime) * u_timeScale;
                float lifeRatio = clamp(elapsedTime / a_duration, 0.0, 1.0);

                // Si la supernova ha "muerto" (lifeRatio >= 1), la hacemos de tamaño 0 para que desaparezca.
                // La reutilizaremos más tarde.
                if (lifeRatio >= 1.0) {
                    gl_PointSize = 0.0;
                } else {
                    // Curva de animación (rápida al inicio, lenta al final) para la expansión
                    float easeOutRatio = sin(lifeRatio * (3.14159 / 2.0));

                    // 1. Destello inicial (primer 5% de vida)
                    float flashLife = lifeRatio * 20.0; // 1.0 / 0.05 = 20.0
                    float flashSize = 0.0;
                    if (flashLife < 1.0) {
                        flashSize = sin(flashLife * (3.14159 / 2.0)) * 200.0;
                    }

                    // 2. Expansión del núcleo/onda
                    float shellSize = easeOutRatio * 800.0;

                    // Combinamos tamaños y ajustamos por la distancia a la cámara
                    float finalSize = max(flashSize, shellSize);
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = finalSize * (300.0 / -mvPosition.z);
                }

                v_lifeRatio = lifeRatio;
                v_color = a_startColor;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D u_texture;
            varying float v_lifeRatio;
            varying vec3 v_color;

            void main() {
                if (v_lifeRatio >= 1.0) {
                    discard; // No dibujamos pixeles de supernovas muertas
                }

                // Textura base de la explosión
                vec4 texColor = texture2D(u_texture, gl_PointCoord);

                // 1. Opacidad del destello inicial (muy rápido)
                float flashLife = v_lifeRatio * 20.0;
                float flashOpacity = 0.0;
                if (flashLife < 1.0) {
                    flashOpacity = cos(flashLife * (3.14159 / 2.0));
                }

                // 2. Opacidad del núcleo/onda (se desvanece durante toda la vida)
                float easeOutRatio = sin(v_lifeRatio * (3.14159 / 2.0));
                float shellOpacity = cos(easeOutRatio * (3.14159 / 2.0)) * 0.8;

                // Combinamos opacidades y color
                float finalOpacity = max(flashOpacity, shellOpacity);
                vec3 finalColor = mix(v_color, vec3(0.6, 0.1, 0.0), v_lifeRatio); // Evoluciona a rojo oscuro

                gl_FragColor = vec4(finalColor, finalOpacity * texColor.a);
            }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
    });

    supernovaSystem = new THREE.Points(geometry, material);
    supernovaSystem.frustumCulled = false; // Importante para que no desaparezca si el centro está fuera de la vista
    scene.add(supernovaSystem);
}

export function createSupernova(position, time) {
    if (!supernovaSystem) return;

    const coreColors = [new THREE.Color(0xffffff), new THREE.Color(0xffdcb1), new THREE.Color(0xb1c9ff)];
    const startColor = coreColors[Math.floor(Math.random() * coreColors.length)];
    const duration = 9000 + Math.random() * 6000;

    // Actualizamos los datos en el índice actual (que es circular)
    const i = currentSupernovaIndex;
    const attributes = supernovaSystem.geometry.attributes;

    attributes.position.setXYZ(i, position.x, position.y, position.z);
    attributes.a_startTime.setX(i, time);
    attributes.a_duration.setX(i, duration);
    attributes.a_startColor.setXYZ(i, startColor.r, startColor.g, startColor.b);

    // Marcamos los atributos como "sucios" para que Three.js los suba a la GPU
    attributes.position.needsUpdate = true;
    attributes.a_startTime.needsUpdate = true;
    attributes.a_duration.needsUpdate = true;
    attributes.a_startColor.needsUpdate = true;

    // Movemos el índice al siguiente slot, de forma circular
    currentSupernovaIndex = (currentSupernovaIndex + 1) % MAX_SUPERNOVAS;
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

// ====== PÚLSARES ======
/**
 * Crea un púlsar (estrella de neutrones en rotación) en una posición específica.
 * Consiste en una estrella central, dos haces de partículas y un disco de acreción.
 * @param {object} options - Opciones para configurar el púlsar.
 * @param {THREE.Vector3} options.position - La posición del púlsar.
 * @param {number} [options.color=0x99aaff] - El color del púlsar.
 * @param {number} [options.size=5] - El tamaño del núcleo de la estrella.
 * @param {number} [options.beamLength=2000] - La longitud de los haces de luz.
 */
export function createPulsar({ position, color = 0x99aaff, size = 5, beamLength = 2000 }) {
    const pulsarGroup = new THREE.Group();
    pulsarGroup.position.copy(position);

    // 1. Núcleo de la estrella de neutrones
    const starGeometry = new THREE.SphereGeometry(size, 32, 32);
    const starMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 10 });
    const neutronStar = new THREE.Mesh(starGeometry, starMaterial);
    pulsarGroup.add(neutronStar);

    // 2. Haces de partículas (jets)
    const beamTexture = loadTextureCached(getAssetUrl('recursos/smokeA.png'));
    beamTexture.wrapS = beamTexture.wrapT = THREE.RepeatWrapping;

    const beamGeometry = new THREE.CylinderGeometry(size * 0.5, size * 6, beamLength, 32, 64, true);
    const beamMaterial = new THREE.ShaderMaterial({
        uniforms: {
            'time': { value: 0.0 },
            'beamColor': { value: new THREE.Color(color) },
            'noiseTexture': { value: beamTexture },
        },
        vertexShader: `
            varying float vUvY;
            void main() {
                vUvY = uv.y;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 beamColor;
            uniform sampler2D noiseTexture;
            varying float vUvY;

            void main() {
                vec2 uv = vec2(vUvY * 2.0, time * 0.2);
                float noise = texture2D(noiseTexture, uv).r;
                float falloff = pow(1.0 - abs(vUvY * 2.0 - 1.0), 1.5);
                float intensity = falloff * (0.6 + noise * 0.4);
                gl_FragColor = vec4(beamColor, intensity * 0.6);
            }
        `,
        transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    });

    const beam1 = new THREE.Mesh(beamGeometry, beamMaterial);
    beam1.position.y = beamLength / 2;
    const beam2 = new THREE.Mesh(beamGeometry, beamMaterial.clone()); // Clonamos material para que no compartan uniforms si es necesario
    beam2.position.y = -beamLength / 2;
    beam2.rotation.x = Math.PI;
    pulsarGroup.add(beam1, beam2);

    // 3. Disco de acreción
    const diskGeometry = new THREE.RingGeometry(size * 2.5, size * 20, 64);
    const diskMaterial = new THREE.MeshBasicMaterial({ map: beamTexture, color: color, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
    const accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
    accretionDisk.rotation.x = Math.PI / 2;
    pulsarGroup.add(accretionDisk);

    pulsarGroup.userData = { isPulsar: true, starMaterial, beamMaterial, disk: accretionDisk, baseIntensity: starMaterial.emissiveIntensity };
    pulsarGroup.rotation.set( (Math.random() * 0.5 - 0.25) * Math.PI, 0, (Math.random() * 0.5 - 0.25) * Math.PI );

    scene.add(pulsarGroup);
    pulsars.push(pulsarGroup);
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
    createSupernovaSystem();
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