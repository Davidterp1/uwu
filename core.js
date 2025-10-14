import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
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

export const controls = new PointerLockControls(camera, renderer.domElement);
// Para activar los controles, el usuario deberá hacer clic en la pantalla.
// Añadimos el objeto de los controles a la escena para que la cámara se mueva con él.
scene.add(controls.getObject());

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