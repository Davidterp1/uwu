import * as THREE from 'three';
import { CONSTELLATION_RADIUS, famousConstellations } from './config.js';
import { pickableObjects, scene } from './celestialObjects.js';
import { getAssetUrl, loadTextureCached } from './core.js';

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

function createConstellationLines(constellations) {
    while (constellationGroup.children.length) constellationGroup.remove(constellationGroup.children[0]);
    constellationLinesStore.length = 0;

    // Filtramos para solo incluir las constelaciones famosas
    const filteredConstellations = constellations.filter(constObj => famousConstellations.includes(constObj.name));
    filteredConstellations.forEach(constObj => { // eslint-disable-line no-unused-vars
        // Creamos las estrellas individuales de la constelación
        const starPositions = new Float32Array(constObj.stars.length * 3);
        const starSizes = new Float32Array(constObj.stars.length);
        const starOpacities = new Float32Array(constObj.stars.length);

        constObj.stars.forEach((star, i) => {
            const v = celestialToCartesian(star.ra, star.dec);
            starPositions[i * 3] = v.x;
            starPositions[i * 3 + 1] = v.y;
            starPositions[i * 3 + 2] = v.z;

            // El tamaño y la opacidad se basan en la magnitud (magnitudes más bajas son más brillantes)
            const magnitude = star.mag || 3; // Usamos 3 como magnitud por defecto
            starSizes[i] = Math.max(0.5, 5 - magnitude) * 2.5; // Ajusta el multiplicador para el tamaño
            starOpacities[i] = Math.max(0.4, 1.0 - magnitude / 6.0);
        });

        const starsGeom = new THREE.BufferGeometry();
        starsGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starsGeom.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
        starsGeom.setAttribute('opacity', new THREE.BufferAttribute(starOpacities, 1));

        const starsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0xadc8ff) }, // Un azul estelar más pálido
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
        constellationGroup.add(starsMesh);
        constellationLinesStore.push(starsMesh); // Añadimos para el pulso

        // Creamos las líneas que unen las estrellas
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
            opacity: 0.3, // Hacemos las líneas aún más tenues
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
    // Datos de constelaciones mejorados. Incluyen estrellas con magnitud para brillo/tamaño.
    const constellationData = [
        {
            "name": "Orion",
            "stars": [
                {"ra": 88.793, "dec": 7.407, "mag": 0.5}, // Betelgeuse
                {"ra": 81.283, "dec": 6.350, "mag": 1.6}, // Bellatrix
                {"ra": 78.634, "dec": -8.201, "mag": 0.1}, // Rigel
                {"ra": 80.357, "dec": -9.669, "mag": 2.2}, // Saiph
                {"ra": 83.822, "dec": -1.202, "mag": 1.7}, // Alnilam (Cinturón)
                {"ra": 84.588, "dec": -1.940, "mag": 2.0}, // Alnitak (Cinturón)
                {"ra": 82.978, "dec": -0.299, "mag": 1.6}  // Mintaka (Cinturón)
            ],
            "lines": [
                [{ "ra": 88.793, "dec": 7.407 }, { "ra": 84.588, "dec": -1.940 }],
                [{ "ra": 81.283, "dec": 6.350 }, { "ra": 82.978, "dec": -0.299 }],
                [{ "ra": 84.588, "dec": -1.940 }, { "ra": 83.822, "dec": -1.202 }],
                [{ "ra": 83.822, "dec": -1.202 }, { "ra": 82.978, "dec": -0.299 }],
                [{ "ra": 84.588, "dec": -1.940 }, { "ra": 80.357, "dec": -9.669 }],
                [{ "ra": 82.978, "dec": -0.299 }, { "ra": 78.634, "dec": -8.201 }]
            ]
        },
        {
            "name": "Ursa Major",
            "stars": [
                {"ra": 165.80, "dec": 61.75, "mag": 1.8}, // Dubhe
                {"ra": 167.05, "dec": 56.38, "mag": 2.4}, // Merak
                {"ra": 179.45, "dec": 57.03, "mag": 2.4}, // Phecda
                {"ra": 192.95, "dec": 53.69, "mag": 3.3}, // Megrez
                {"ra": 201.30, "dec": 49.31, "mag": 1.8}, // Alioth
                {"ra": 206.90, "dec": 54.92, "mag": 2.2}, // Mizar
                {"ra": 210.80, "dec": 51.48, "mag": 1.9}  // Alkaid
            ],
            "lines": [
                [{ "ra": 165.80, "dec": 61.75 }, { "ra": 167.05, "dec": 56.38 }],
                [{ "ra": 167.05, "dec": 56.38 }, { "ra": 179.45, "dec": 57.03 }],
                [{ "ra": 179.45, "dec": 57.03 }, { "ra": 192.95, "dec": 53.69 }],
                [{ "ra": 192.95, "dec": 53.69 }, { "ra": 201.30, "dec": 49.31 }],
                [{ "ra": 201.30, "dec": 49.31 }, { "ra": 206.90, "dec": 54.92 }],
                [{ "ra": 206.90, "dec": 54.92 }, { "ra": 210.80, "dec": 51.48 }]
            ]
        },        
        {
            "name": "Cassiopeia",
            "stars": [
                {"ra": 11.97, "dec": 59.15, "mag": 2.2}, // Schedar
                {"ra": 1.42, "dec": 60.23, "mag": 2.3},  // Caph
                {"ra": 7.34, "dec": 60.71, "mag": 2.4},  // Gamma Cassiopeiae
                {"ra": 21.65, "dec": 63.67, "mag": 2.7}, // Ruchbah
                {"ra": 27.97, "dec": 56.53, "mag": 2.1}  // Epsilon Cassiopeiae
            ],
            "lines": [
                [{ "ra": 21.65, "dec": 63.67 }, { "ra": 11.97, "dec": 59.15 }],
                [{ "ra": 11.97, "dec": 59.15 }, { "ra": 7.34, "dec": 60.71 }],
                [{ "ra": 7.34, "dec": 60.71 }, { "ra": 1.42, "dec": 60.23 }],
                [{ "ra": 7.34, "dec": 60.71 }, { "ra": 27.97, "dec": 56.53 }]
            ]
        },
        {
            "name": "Scorpius",
            "stars": [
                {"ra": 247.35, "dec": -26.43, "mag": 0.9}, // Antares
                {"ra": 241.83, "dec": -19.80, "mag": 2.3}, // Dschubba
                {"ra": 240.00, "dec": -22.62, "mag": 2.9}, // Acrab
                {"ra": 255.85, "dec": -37.10, "mag": 1.6}, // Sargas
                {"ra": 263.15, "dec": -43.00, "mag": 1.8}  // Shaula
            ],
            "lines": [
                [{ "ra": 241.83, "dec": -19.80 }, { "ra": 240.00, "dec": -22.62 }],
                [{ "ra": 240.00, "dec": -22.62 }, { "ra": 247.35, "dec": -26.43 }],
                [{ "ra": 247.35, "dec": -26.43 }, { "ra": 255.85, "dec": -37.10 }],
                [{ "ra": 255.85, "dec": -37.10 }, { "ra": 263.15, "dec": -43.00 }]
            ]
        },
        {
            "name": "Ursa Minor",
            "stars": [
                {"ra": 42.9, "dec": 89.26, "mag": 2.0}, // Polaris
                {"ra": 222.0, "dec": 86.59, "mag": 4.3},
                {"ra": 237.3, "dec": 82.2, "mag": 4.9},
                {"ra": 253.2, "dec": 77.79, "mag": 4.2},
                {"ra": 242.3, "dec": 74.15, "mag": 2.1}, // Kochab
                {"ra": 230.1, "dec": 71.83, "mag": 3.0}, // Pherkad
                {"ra": 253.2, "dec": 77.79, "mag": 4.2}
            ],
            "lines": [
                [{ "ra": 42.9, "dec": 89.26 }, { "ra": 222.0, "dec": 86.59 }],
                [{ "ra": 222.0, "dec": 86.59 }, { "ra": 237.3, "dec": 82.2 }],
                [{ "ra": 237.3, "dec": 82.2 }, { "ra": 253.2, "dec": 77.79 }],
                [{ "ra": 253.2, "dec": 77.79 }, { "ra": 242.3, "dec": 74.15 }],
                [{ "ra": 242.3, "dec": 74.15 }, { "ra": 230.1, "dec": 71.83 }],
                [{ "ra": 230.1, "dec": 71.83 }, { "ra": 253.2, "dec": 77.79 }]
            ]
        },
        {
            "name": "Crux",
            "stars": [
                {"ra": 186.5, "dec": -63.09, "mag": 0.8}, // Acrux
                {"ra": 190.0, "dec": -57.11, "mag": 1.6}, // Gacrux
                {"ra": 182.3, "dec": -60.37, "mag": 1.3}, // Becrux (Mimosa)
                {"ra": 187.3, "dec": -58.75, "mag": 2.8}  // Decrux
            ],
            "lines": [
                [{ "ra": 186.5, "dec": -63.09 }, { "ra": 190.0, "dec": -57.11 }],
                [{ "ra": 182.3, "dec": -60.37 }, { "ra": 187.3, "dec": -58.75 }]
            ]
        },
        {
            "name": "Sagittarius", // La Tetera
            "stars": [
                {"ra": 279.5, "dec": -34.38, "mag": 2.0}, // Kaus Australis
                {"ra": 275.3, "dec": -30.43, "mag": 2.7}, // Nunki
                {"ra": 271.7, "dec": -29.88, "mag": 2.8}, // Ascella
                {"ra": 275.3, "dec": -25.42, "mag": 2.6}, // Kaus Media
                {"ra": 281.7, "dec": -21.0, "mag": 2.0},  // Kaus Borealis
                {"ra": 270.4, "dec": -27.7, "mag": 3.0}   // Tau Sagittarii
            ],
            "lines": [
                [{ "ra": 279.5, "dec": -34.38 }, { "ra": 275.3, "dec": -30.43 }],
                [{ "ra": 275.3, "dec": -30.43 }, { "ra": 271.7, "dec": -29.88 }],
                [{ "ra": 271.7, "dec": -29.88 }, { "ra": 270.4, "dec": -27.7 }],
                [{ "ra": 270.4, "dec": -27.7 }, { "ra": 275.3, "dec": -25.42 }],
                [{ "ra": 275.3, "dec": -25.42 }, { "ra": 281.7, "dec": -21.0 }],
                [{ "ra": 275.3, "dec": -30.43 }, { "ra": 275.3, "dec": -25.42 }]
            ]
        },
        {
            "name": "Leo",
            "stars": [
                {"ra": 152.1, "dec": 19.84, "mag": 1.4}, // Regulus
                {"ra": 173.0, "dec": 11.97, "mag": 2.1}, // Denebola
                {"ra": 168.9, "dec": 14.57, "mag": 2.6}, // Zosma
                {"ra": 155.0, "dec": 26.0, "mag": 2.9},  // Algieba
                {"ra": 148.8, "dec": 22.52, "mag": 3.5}   // Adhafera
            ],
            "lines": [
                [{ "ra": 152.1, "dec": 19.84 }, { "ra": 155.0, "dec": 26.0 }],
                [{ "ra": 155.0, "dec": 26.0 }, { "ra": 148.8, "dec": 22.52 }],
                [{ "ra": 152.1, "dec": 19.84 }, { "ra": 168.9, "dec": 14.57 }],
                [{ "ra": 168.9, "dec": 14.57 }, { "ra": 173.0, "dec": 11.97 }]
            ]
        },
        {
            "name": "Taurus",
            "stars": [
                {"ra": 68.8, "dec": 15.87, "mag": 0.8}, // Aldebaran
                {"ra": 87.0, "dec": 28.6, "mag": 1.6},  // Elnath
                {"ra": 82.3, "dec": 23.42, "mag": 3.0},
                {"ra": 76.7, "dec": 17.55, "mag": 3.4},
                {"ra": 66.0, "dec": 9.02, "mag": 3.8}
            ],
            "lines": [
                [{ "ra": 76.7, "dec": 17.55 }, { "ra": 68.8, "dec": 15.87 }],
                [{ "ra": 68.8, "dec": 15.87 }, { "ra": 66.0, "dec": 9.02 }],
                [{ "ra": 68.8, "dec": 15.87 }, { "ra": 87.0, "dec": 28.6 }]
            ]
        },
        {
            "name": "Gemini",
            "stars": [
                {"ra": 116.3, "dec": 31.89, "mag": 1.6}, // Castor
                {"ra": 113.7, "dec": 28.03, "mag": 1.1}, // Pollux
                {"ra": 108.7, "dec": 22.5, "mag": 2.9},  // Alhena
                {"ra": 91.9, "dec": 16.4, "mag": 3.5}
            ],
            "lines": [
                [{ "ra": 116.3, "dec": 31.89 }, { "ra": 108.7, "dec": 22.5 }],
                [{ "ra": 108.7, "dec": 22.5 }, { "ra": 91.9, "dec": 16.4 }],
                [{ "ra": 113.7, "dec": 28.03 }, { "ra": 108.7, "dec": 22.5 }]
            ]
        },
        {
            "name": "Aries",
            "stars": [
                {"ra": 41.9, "dec": 29.31, "mag": 2.6}, // Sheratan
                {"ra": 39.3, "dec": 23.63, "mag": 2.0}, // Hamal
                {"ra": 31.9, "dec": 20.81, "mag": 3.6}  // Mesarthim
            ],
            "lines": [
                [{ "ra": 39.3, "dec": 23.63 }, { "ra": 41.9, "dec": 29.31 }],
                [{ "ra": 39.3, "dec": 23.63 }, { "ra": 31.9, "dec": 20.81 }]
            ]
        },
        {
            "name": "Virgo",
            "stars": [
                {"ra": 199.9, "dec": -1.15, "mag": 1.0}, // Spica
                {"ra": 192.6, "dec": -11.16, "mag": 2.8}, // Porrima
                {"ra": 182.4, "dec": 17.53, "mag": 3.4},
                {"ra": 218.3, "dec": 3.4, "mag": 2.8}   // Vindemiatrix
            ],
            "lines": [
                [{ "ra": 199.9, "dec": -1.15 }, { "ra": 192.6, "dec": -11.16 }],
                [{ "ra": 192.6, "dec": -11.16 }, { "ra": 182.4, "dec": 17.53 }],
                [{ "ra": 182.4, "dec": 17.53 }, { "ra": 218.3, "dec": 3.4 }],
                [{ "ra": 218.3, "dec": 3.4 }, { "ra": 199.9, "dec": -1.15 }]
            ]
        }
    ];

    createConstellationLines(constellationData);
    return Promise.resolve();
}