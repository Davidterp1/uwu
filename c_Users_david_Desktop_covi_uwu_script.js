import * as THREE from 'three';
import { scene, camera, renderer, controls, loadingManager } from './core.js';
import { sun, planetGroups, stationGroup, asteroidMetas, asteroidsInstanced, comets, pickableObjects } from './celestialObjects.js';
import { nebulaGroups, createBlackHole, activeSupernovas, blackHoles } from './background.js';
import { planets, moonData, stationData, CONSTELLATION_RADIUS } from './config.js';
import { initUI, updatePlanetStats, getFollowTarget, getIsZoomingOut, setZoomingOut, constellationLinesStore } from './ui.js'; // Actualizado el import
import { initConstellations, constellationGroup } from './constellations.js';
import { initBackground, createSupernova, activeSupernovas, blackHoles, createBlackHole } from './background.js';
// ====== GESTOR DE CARGA ======
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

// Creamos una promesa que se resolverá cuando el LoadingManager termine.
const assetsLoadedPromise = new Promise(resolve => {
  loadingManager.onLoad = resolve;
});

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = (itemsLoaded / itemsTotal) * 100;
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    if (progressText) {
        progressText.textContent = `${Math.round(progress)}%`;
    }
};
const hideLoadingScreen = () => {
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  }, 500);
};

// ====== CONTROLES DE MOVIMIENTO ======
const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false
};
const moveSpeed = 300.0; // Unidades por segundo
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW': moveState.forward = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyS': moveState.backward = true; break;
        case 'KeyD': moveState.right = true; break;
        case 'Space': moveState.up = true; break;
        case 'ShiftLeft': moveState.down = true; break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW': moveState.forward = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyS': moveState.backward = false; break;
        case 'KeyD': moveState.right = false; break;
        case 'Space': moveState.up = false; break;
        case 'ShiftLeft': moveState.down = false; break;
    }
});

// ====== ANIMACIÓN (optimizada) ======
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = performance.now();
  const timeSmall = time * 0.0001;
  const timeFast = time * 0.001;

  // Actualizar movimiento de la cámara si los controles están activos
  if (controls.isLocked === true) {
    // Deceleración suave
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= velocity.y * 10.0 * delta;

    direction.z = Number(moveState.forward) - Number(moveState.backward);
    direction.x = Number(moveState.right) - Number(moveState.left);
    direction.normalize(); // Asegura un movimiento consistente en diagonal

    if (moveState.forward || moveState.backward) velocity.z -= direction.z * moveSpeed * delta;
    if (moveState.left || moveState.right) velocity.x -= direction.x * moveSpeed * delta;
    if (moveState.up) velocity.y += moveSpeed * delta;
    if (moveState.down) velocity.y -= moveSpeed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    controls.getObject().position.y += velocity.y * delta;
  }

  // Planetas: rotación y órbitas (optimizado: evitar crear vectores temporales dentro del loop)
  for (let i = 0; i < planetGroups.length; i++) {
    const group = planetGroups[i];
    const data = planets[i + 1];
    if (!data) continue;
    const mesh = group.children[0].children[0]; // El mesh está dentro del pivot
    mesh.rotation.y += (data.rotationSpeed || 0) * 0.005;
    
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

  // Asteroides (instanced) - actualizamos matrices de instancias
  for (let i = 0; i < asteroidMetas.length; i++) { // asteroidMetas is not defined
    const mdata = asteroidMetas[i];
    mdata.angle += mdata.speed;
    const x = Math.cos(mdata.angle) * mdata.radius;
    const z = Math.sin(mdata.angle) * mdata.radius;
    const y = (Math.sin(mdata.angle * 3 + i) * 0.2); // little bob
    const m = new THREE.Matrix4();
    m.makeTranslation(x, y, z);
    asteroidsInstanced.setMatrixAt(i, m);
  }
  asteroidsInstanced.instanceMatrix.needsUpdate = true;

  // Cometas y sus colas (cola circular write, menos operación de copia)
  for (let i = 0; i < comets.length; i++) {
    const c = comets[i];
    c.userData.angle += c.userData.speed * c.userData.direction;
    c.position.x = Math.cos(c.userData.angle) * c.userData.radius;
    c.position.z = Math.sin(c.userData.angle) * c.userData.radius;

    const tail = c.userData.tail;
    const positions = c.userData.tailPositions;
    const idx = c.userData.tailIndex;
    // posicionamos la cabeza en idx (circular)
    const pidx = idx * 3;
    positions[pidx] = c.position.x;
    positions[pidx + 1] = c.position.y;
    positions[pidx + 2] = c.position.z;
    // incrementamos índice circular
    c.userData.tailIndex = (idx + 1) % c.userData.tailParticleCount;
    tail.geometry.attributes.position.needsUpdate = true;
  }
  
  // Rotación sutil de las nebulosas para dar vida al fondo
  nebulaGroups.forEach((group, i) => {
      group.rotation.y += 0.000005 * (i % 2 === 0 ? 1 : -1); // Reducimos la velocidad de rotación
      group.rotation.x += 0.000002 * (i % 2 === 0 ? -1 : 1); // Reducimos la velocidad de rotación
  });

  // Pulsing effect for constellations
  if (constellationGroup.visible) {
    const pulse = Math.sin(now * 0.001) * 0.15 + 0.75; // Pulso más sutil (0.6 a 0.9)
    constellationLinesStore.forEach(line => {
      if (line.visible) {
        if (line.userData.isStars) { // Si es el objeto de estrellas (ShaderMaterial)
          line.material.uniforms.globalPulse.value = pulse;
        } else { // Si es el objeto de líneas (LineBasicMaterial)
          line.material.opacity = pulse * 0.5; // Las líneas pulsan más suavemente
        }
      }
    });
  }

  // Rotación lenta de los agujeros negros
  blackHoles.forEach(bh => {
    // Rotación del disco de acreción
    const diskGroup = bh.getObjectByName('accretionDisk');
    if (diskGroup) {
      diskGroup.children.forEach(disk => {
        disk.rotation.z += disk.userData.rotationSpeed;
      });
    }
  });

  // Disparador y animación de supernovas
  if (Math.random() < 0.002) { // Probabilidad baja en cada fotograma
      // Generar la supernova a una distancia mínima para que aparezca "lejos"
      const minDistance = CONSTELLATION_RADIUS * 1.0; // Un poco más allá de las constelaciones
      const maxDistance = CONSTELLATION_RADIUS * 2.5; // Mucho más lejos
      
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      
      // Generar un punto aleatorio en una esfera (compatible con r128)
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * 2 * Math.PI;
      const position = new THREE.Vector3();
      position.setFromSphericalCoords(distance, phi, theta);

      createSupernova(position);
  }

  // Animar supernovas activas
  for (let i = activeSupernovas.length - 1; i >= 0; i--) {
      const supernova = activeSupernovas[i];
      const elapsedTime = time - supernova.userData.startTime;
      const lifeRatio = elapsedTime / supernova.userData.duration;

      if (lifeRatio > 1) {
          // La supernova ha terminado, la eliminamos
          scene.remove(supernova);
          activeSupernovas.splice(i, 1);
      } else {
          // La animamos: se expande y se desvanece
          const flash = supernova.children[0];
          const core = supernova.children[1];
          const shell = supernova.children[2];
          const light = supernova.userData.light;

          // Curva de animación (rápida al inicio, lenta al final)
          const easeOutRatio = Math.sin(lifeRatio * (Math.PI / 2));

          // Animación del destello inicial: muy rápido y corto
          const flashLife = lifeRatio * 10; // Vive solo el 10% de la vida total
          if (flashLife < 1) {
              const flashScale = 1 + Math.sin(flashLife * (Math.PI / 2)) * 100;
              flash.scale.set(flashScale, flashScale, flashScale);
              flash.material.opacity = Math.cos(flashLife * (Math.PI / 2));
          } else {
              flash.material.opacity = 0;
          }

          // Animación del núcleo
          const coreScale = 1 + easeOutRatio * 200;
          core.scale.set(coreScale, coreScale, coreScale);
          core.material.opacity = Math.cos(easeOutRatio * (Math.PI / 2)) * 0.8;
          core.material.rotation += 0.001;

          // Animación de la onda expansiva
          const shellScale = 1 + easeOutRatio * 500;
          shell.scale.set(shellScale, shellScale, shellScale);
          shell.material.opacity = (1.0 - lifeRatio) * 0.6;
          shell.material.rotation -= 0.0007;

          // Ambas capas evolucionan su color hacia un rojo oscuro
          const endColor = new THREE.Color(0x661100);
          core.material.color.lerpColors(supernova.userData.startColor, endColor, lifeRatio);
          shell.material.color.lerpColors(supernova.userData.startColor, endColor, lifeRatio);

          // Animación de la luz: pico rápido y caída lenta
          light.intensity = Math.sin(Math.min(lifeRatio * 2, 1) * Math.PI) * 25;
          light.color = core.material.color;
      }
  }

  renderer.render(scene, camera);
}

// Iniciar todo el proceso
async function main() {
  // Iniciamos el bucle de animación de inmediato.
  animate(); 

  // Esperamos a que todo esté listo: assets, constelaciones y la generación del fondo.
  await Promise.all([
    assetsLoadedPromise,
    initConstellations(),
    initBackground()
  ]);

  // Añadimos el listener para activar los controles con un clic
  document.body.addEventListener('click', () => {
    controls.lock();
  });

  initUI();

  // Generar varios agujeros negros en posiciones lejanas
  const blackHoleCount = 3;
  for (let i = 0; i < blackHoleCount; i++) {
    const minDistance = CONSTELLATION_RADIUS * 1.0; // Los traemos un poco más cerca
    const maxDistance = CONSTELLATION_RADIUS * 1.5;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * 2 * Math.PI;
    const position = new THREE.Vector3().setFromSphericalCoords(distance, phi, theta);
    
    createBlackHole({
      position,
      // scene, // Ya no es necesario pasar la escena
      size: 40 + Math.random() * 40 // Hacemos que sean más grandes
    });
  }

  // Mostrar el modal de ayuda si es la primera visita
  const helpModal = document.getElementById('help-modal');
  const closeHelpBtn = document.getElementById('close-help-btn');
  const helpModalCloseX = helpModal.querySelector('.close');
  const openHelpBtn = document.getElementById('open-help-btn');

  const closeHelpModal = () => {
    helpModal.style.display = 'none';
    localStorage.setItem('hasVisited', 'true'); // Marcar como visitado
  };

  const openHelpModal = () => {
    helpModal.style.display = 'block';
  };

  if (!localStorage.getItem('hasVisited')) {
    openHelpModal();
  }

  if (closeHelpBtn) {
    closeHelpBtn.addEventListener('click', closeHelpModal);
  }
  if (helpModalCloseX) {
    helpModalCloseX.addEventListener('click', closeHelpModal);
  }
  if (openHelpBtn) {
    openHelpBtn.addEventListener('click', openHelpModal);
  }

  // Una vez que todo está cargado, ocultamos la pantalla de carga.
  hideLoadingScreen();
}
main();

// ====== REDIMENSION ======
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
