import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ====== ESCENA, CÁMARA, RENDERER y CONTROLES ======
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000); // Aumentamos la distancia de visión
camera.position.set(0, 50, 200);

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2; // Permitimos un zoom más cercano
export const originalMinDistance = controls.minDistance;
controls.maxDistance = 500;
export const originalMaxDistance = controls.maxDistance;

// ====== LUCES ======
export const pointLight = new THREE.PointLight(0xffffff, 3);
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 1024; // calidad/ram balanceada
pointLight.shadow.mapSize.height = 1024;
pointLight.position.set(0, 0, 0);
scene.add(pointLight);
scene.add(new THREE.AmbientLight(0x333333));

// ====== CARGADORES y CACHE ======
export const loadingManager = new THREE.LoadingManager();
export const textureLoader = new THREE.TextureLoader(loadingManager);
export const gltfLoader = new GLTFLoader(loadingManager);

const textureCache = new Map();
export function loadTextureCached(url) {
    if (!url) return null;
    if (textureCache.has(url)) return textureCache.get(url);
    const tex = textureLoader.load(url);
    textureCache.set(url, tex);
    return tex;
}

export function getAssetUrl(path) {
    return new URL(path, import.meta.url).href;
}