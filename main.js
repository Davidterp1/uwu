/**
 * @file main.js
 * @description Punto de entrada principal de la aplicación. Gestiona el bucle de animación,
 * los controles del usuario, la carga de assets y la inicialización de todos los módulos.
 * @author David <tu_email>
 * @see <a href="https://threejs.org/">Three.js</a>
 */

import * as THREE from 'three';
import { scene, camera, renderer, controls, loadingManager, raycaster } from './threeCore.js'; // Módulo principal de Three.js
import { sun, planetGroups, asteroidsInstanced, comets, pickableObjects, planetMeshes, asteroidMetas } from './celestialBodies.js'; // Módulo de cuerpos celestes
import { planets, moonData, CONSTELLATION_RADIUS } from './appConfig.js'; // Configuración de la aplicación
import { initUI, updatePlanetInfo, updateConstellationInfo } from './userInterface.js';
import { initConstellations, constellationGroup, constellationLinesStore } from './constellationManager.js'; // Módulo de constelaciones
import { initBackground, createSupernova, supernovaSystem, blackHoles, createBlackHole, nebulaGroups, pulsars, createPulsar } from './spaceBackground.js'; // Módulo del entorno espacial

// ====== GESTOR DE CARGA ======
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

/**
 * Promesa que se resuelve cuando el LoadingManager de Three.js ha cargado todos los assets.
 * @type {Promise<void>}
 */
const assetsLoadedPromise = new Promise(resolve => {
  loadingManager.onLoad = resolve;
});

/**
 * Actualiza la barra de progreso en la pantalla de carga.
 * @param {string} url - URL del asset que se está cargando.
 * @param {number} itemsLoaded - Número de assets cargados.
 * @param {number} itemsTotal - Número total de assets a cargar.
 */
loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = (itemsLoaded / itemsTotal) * 100;
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${Math.round(progress)}%`;
};

/** Oculta la pantalla de carga con una transición suave. */
const hideLoadingScreen = () => {
  setTimeout(() => {
    if (loadingScreen) loadingScreen.classList.add('hidden');
  }, 500);
};

// ====== CONTROLES DE MOVIMIENTO ======
const moveState = {
  forward: false, backward: false, left: false, right: false, up: false, down: false
};
const moveSpeed = 800.0; // Velocidad de desplazamiento base
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
        case 'Escape': {
            break;
        }
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
const hoverRaycaster = new THREE.Raycaster();

let lastHoveredPlanet = null;
let lastHoveredConstellation = null;
const crosshairOuter = document.querySelector('.crosshair-outer');
const crosshairInner = document.querySelector('.crosshair-inner');
const zoomIndicator = document.getElementById('zoom-indicator');
const zoomIndicatorProgress = document.querySelector('.zoom-indicator-progress');

// Se calcula la circunferencia del círculo para la animación del indicador de zoom
const circleRadius = zoomIndicatorProgress.r.baseVal.value;
const circumference = 2 * Math.PI * circleRadius;
zoomIndicatorProgress.style.strokeDasharray = `${circumference} ${circumference}`;

// --- Variables para el seguimiento de planetas ---
let followingPlanet = null; // El planeta que estamos siguiendo
let hoverFollowTimer = 0; // Temporizador para iniciar el seguimiento
const NORMAL_FOLLOW_DELAY = 1.0; // Retardo para planetas grandes
const FAST_FOLLOW_DELAY = 0.01;   // Retardo para planetas pequeños y lunas

const followOffset = new THREE.Vector3(0, 1, 2); // Offset base para la cámara al seguir un objeto

// --- Vectores y matrices reutilizables para optimización ---
const planetWorldPos = new THREE.Vector3();
const desiredPosition = new THREE.Vector3();
const targetQuaternion = new THREE.Quaternion();
const tempMatrix = new THREE.Matrix4();
const screenPos = new THREE.Vector3(); // Reutilizado para la posición del agujero negro
const randomPosition = new THREE.Vector3(); // Vector reutilizable para posiciones aleatorias

/**
 * Establece el objetivo que la cámara debe seguir.
 * @param {?THREE.Object3D} target - El objeto a seguir, o null para dejar de seguir.
 */
export function setCameraFollowTarget(target) {
    followingPlanet = target;
    // Reseteamos el temporizador de hover para evitar conflictos.
    hoverFollowTimer = 0;
}

// Variables para optimizar el hover
let hoverCheckTimer = 0;
const HOVER_CHECK_INTERVAL = 0.1; // segundos (10 veces por segundo)

// ====== VARIABLES DE CONTROL DE TIEMPO ======
let timeScale = 1.0; // Multiplicador para la velocidad del tiempo
let gameTime = 0; // Un tiempo de juego acumulado que podemos controlar
const MIN_LOG_SCALE = -2; // Corresponde a timeScale = 0.01 (10^-2)
const MAX_LOG_SCALE = 4;  // Corresponde a timeScale = 10000 (10^4)
// Creamos un Render Target para el efecto de lente gravitacional
const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

// Definimos las capas de renderizado
const DEFAULT_LAYER = 0; // Capa para la mayoría de objetos
const LENSING_LAYER = 1; // Capa exclusiva para el efecto de lente gravitacional

/**
 * El bucle principal de animación que se ejecuta en cada fotograma.
 * Se encarga de:
 * - Actualizar el tiempo y los controles.
 * - Gestionar la lógica de "hover" y seguimiento de objetos.
 * - Animar todos los cuerpos celestes y efectos de fondo.
 * - Renderizar la escena, aplicando efectos como el de lente gravitacional.
 */
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta(); // Tiempo real transcurrido
  const scaledDelta = delta * timeScale; // Tiempo de juego transcurrido
  gameTime += scaledDelta; // Acumulamos el tiempo de juego

  const time = performance.now(); // Mantenemos el tiempo real para animaciones de UI
  const isManualMoving = moveState.forward || moveState.backward || moveState.left || moveState.right || moveState.up || moveState.down;

  // Si el usuario se mueve manualmente mientras sigue a un planeta, se cancela el seguimiento.
  if (followingPlanet && isManualMoving) {
      setCameraFollowTarget(null);
      // Ocultamos el panel de información para no confundir al usuario.
      updatePlanetInfo(null);
  }

  // Lógica de Hover optimizada (se ejecuta 10 veces por segundo en lugar de en cada frame)
  if (controls.isLocked) {
    hoverCheckTimer += delta;
    if (hoverCheckTimer >= HOVER_CHECK_INTERVAL) {
      hoverCheckTimer = 0;
      // Usamos el raycaster importado y lo actualizamos desde el centro de la cámara.
      raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      const intersects = raycaster.intersectObjects(pickableObjects, true);
      
      let currentlyHoveredPlanet = null;
      let currentlyHoveredConstellation = null;

      if (intersects.length > 0) {
          const firstHit = intersects[0].object;
          const isPlanetOrSun = planetMeshes.includes(firstHit) || firstHit === sun || firstHit.userData.isMoon;
          
          if (isPlanetOrSun) {
              currentlyHoveredPlanet = firstHit;
          } else if (firstHit.userData.isConstellation) {
              currentlyHoveredConstellation = firstHit;
          }
      }

      // Si el objeto que miramos ha cambiado, actualizamos la UI y reiniciamos el temporizador.
      if (lastHoveredPlanet !== currentlyHoveredPlanet && !followingPlanet) {
          lastHoveredPlanet = currentlyHoveredPlanet;
          updatePlanetInfo(currentlyHoveredPlanet);
          // No reiniciamos el temporizador aquí para permitir que el foco continúe si se mueve ligeramente.
      }

      if (lastHoveredConstellation !== currentlyHoveredConstellation) {
          lastHoveredConstellation = currentlyHoveredConstellation;
          updateConstellationInfo(lastHoveredConstellation);
      }

      // Actualizar mirilla
      if (currentlyHoveredPlanet || currentlyHoveredConstellation) {
          crosshairOuter?.classList.add('target-hover');
          crosshairInner?.classList.add('target-hover');
      } else {
          crosshairOuter?.classList.remove('target-hover');
          crosshairInner?.classList.remove('target-hover');
      }
    }
  }

  // --- Lógica de Enfoque y Barra de Progreso (unificada) ---
  // Esta sección se ejecuta en cada frame para una animación fluida.
  const canStartFocus = lastHoveredPlanet && !followingPlanet && controls.isLocked && !isManualMoving;

  if (canStartFocus) {
      // Si podemos enfocar, incrementamos el temporizador.
      hoverFollowTimer += delta;

      // Mostramos el indicador si no está visible.
      if (zoomIndicator && !zoomIndicator.classList.contains('visible')) {
          zoomIndicator.classList.add('visible');
      }

      // Calculamos el tiempo necesario y actualizamos la barra de progreso.
      const planetData = lastHoveredPlanet.userData;
      const isSmallBody = planetData.isMoon || (planetData.size && planetData.size <= 0.6);
      const requiredTime = isSmallBody ? FAST_FOLLOW_DELAY : NORMAL_FOLLOW_DELAY;

      const progress = hoverFollowTimer / requiredTime;
      const offset = circumference - Math.min(progress, 1) * circumference;
      if(zoomIndicatorProgress) zoomIndicatorProgress.style.strokeDashoffset = offset;

      // Si el tiempo se ha cumplido, fijamos el objetivo.
      if (hoverFollowTimer > requiredTime) {
          setCameraFollowTarget(lastHoveredPlanet);
      }
  } else {
      // Si no se cumplen las condiciones para enfocar (nos movemos, no apuntamos a nada, etc.),
      // reiniciamos el temporizador y ocultamos el indicador.
      hoverFollowTimer = 0;
      if (zoomIndicator && zoomIndicator.classList.contains('visible')) {
          zoomIndicator.classList.remove('visible');
          if(zoomIndicatorProgress) zoomIndicatorProgress.style.strokeDashoffset = circumference;
      }
  }

  if (followingPlanet) {
    // --- MODO SEGUIMIENTO ORBITAL ---
    followingPlanet.getWorldPosition(planetWorldPos);

    // Calculamos la posición deseada de la cámara
    const offset = new THREE.Vector3().copy(followOffset).multiplyScalar(followingPlanet.userData.size * 2.5);
    desiredPosition.copy(planetWorldPos).add(offset);

    // Movemos la cámara suavemente (Lerp) hacia la posición deseada
    controls.getObject().position.lerp(desiredPosition, delta * 2.0);

    // Hacemos que la cámara mire suavemente al planeta (usando Slerp para evitar temblores)
    tempMatrix.lookAt(controls.getObject().position, planetWorldPos, camera.up);
    targetQuaternion.setFromRotationMatrix(tempMatrix);

    // Usamos slerp para una rotación más suave que `lookAt` directo en cada frame
    camera.quaternion.slerp(targetQuaternion, delta * 4.0);

  } else if (controls.isLocked) {
    // --- MODO VUELO LIBRE (WASD) ---
    // Eliminamos la deceleración (damping) para un control más directo y sin "balanceo".
    velocity.x = 0;
    velocity.z = 0;
    velocity.y = 0;
    
    direction.z = Number(moveState.forward) - Number(moveState.backward);
    direction.x = Number(moveState.right) - Number(moveState.left);
    direction.normalize();

    // Se usa directamente moveSpeed para una velocidad constante.
    if (moveState.forward || moveState.backward) velocity.z -= direction.z * moveSpeed * delta;
    if (moveState.left || moveState.right) velocity.x -= direction.x * moveSpeed * delta;
    if (moveState.up) velocity.y += moveSpeed * delta;
    if (moveState.down) velocity.y -= moveSpeed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    controls.getObject().position.y += velocity.y * delta;
  }

  // Animación de todos los cuerpos celestes principales.
  for (let i = 0; i < planets.length; i++) {
    const data = planets[i];
    if (!data) continue;

    if (i === 0) { // Es el Sol
      sun.rotation.y += (data.rotationSpeed || 0) * scaledDelta * 0.5;
    } else { // Es un planeta
      const group = planetGroups[i - 1];
      const mesh = planetMeshes[i - 1];
      mesh.rotation.y += (data.rotationSpeed || 0) * scaledDelta * 0.5;
      
      // Animación de la órbita del planeta
      const angle = gameTime * 0.1 * (data.orbitalSpeed || 0); // Usamos gameTime para que la velocidad dependa del slider
      const r = data.orbitRadius || 10; 
      group.position.x = Math.cos(angle) * r;
      group.position.z = Math.sin(angle) * r;

      // Animación de las lunas del planeta (si las tiene)
      // Buscamos los grupos de lunas dentro del pivote del planeta
      const pivot = mesh.parent; // El pivote es el padre directo del mesh del planeta
      if (pivot) {
        pivot.children.forEach(objectInPivot => {
          if (objectInPivot.userData.isMoonGroup) {
            const moonMesh = objectInPivot.children[0];
            const moonData = moonMesh.userData;
            const moonAngle = gameTime * (moonData.orbitalSpeed || 0);
            objectInPivot.position.set(Math.cos(moonAngle) * moonData.orbitRadius, 0, Math.sin(moonAngle) * moonData.orbitRadius);
            moonMesh.rotation.y += scaledDelta; // Rotación de la luna sobre sí misma
          }
        });
      }
    }
  }

  // Luna
  if (scene.userData._moon && scene.userData._moonGroup) {
    const moon = scene.userData._moon;
    const moonGroup = scene.userData._moonGroup;
    moon.rotation.y += 0.005 * scaledDelta * 100;
    const moonAngle = gameTime * 1;
    moonGroup.position.x = Math.cos(moonAngle) * moonData.orbitRadius;
    moonGroup.position.z = Math.sin(moonAngle) * moonData.orbitRadius;
  }

  // Asteroides (instanced) - actualizamos matrices de instancias
  for (let i = 0; i < asteroidMetas.length; i++) {
    const mdata = asteroidMetas[i];
    mdata.angle += mdata.speed * scaledDelta * 100; // Hacemos la velocidad dependiente del tiempo
    const x = Math.cos(mdata.angle) * mdata.radius;
    const z = Math.sin(mdata.angle) * mdata.radius;
    const y = (Math.sin(mdata.angle * 3 + i) * 0.2); // little bob
    const m = new THREE.Matrix4();
    m.makeTranslation(x, y, z);
    asteroidsInstanced.setMatrixAt(i, m);
  }
  asteroidsInstanced.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < comets.length; i++) {
    const c = comets[i];
    c.userData.angle += c.userData.speed * c.userData.direction * scaledDelta * 100;
    c.position.x = Math.cos(c.userData.angle) * c.userData.radius;
    c.position.z = Math.sin(c.userData.angle) * c.userData.radius;

    const tail = c.userData.tail;
    const positions = c.userData.tailPositions;
    const idx = c.userData.tailIndex;
    const pidx = idx * 3;
    positions[pidx] = c.position.x;
    positions[pidx + 1] = c.position.y;
    positions[pidx + 2] = c.position.z;
    c.userData.tailIndex = (idx + 1) % c.userData.tailParticleCount;
    tail.geometry.attributes.position.needsUpdate = true;
  }
  
  // Rotación sutil de las nebulosas para dar vida al fondo
  nebulaGroups.forEach((group, i) => {
      group.rotation.y += 0.000005 * (i % 2 === 0 ? 1 : -1) * timeScale;
      group.rotation.x += 0.000002 * (i % 2 === 0 ? -1 : 1) * timeScale;
  });

  // Efecto de pulso para las constelaciones
  if (constellationGroup.visible) {
    const pulse = Math.sin(time * 0.001) * 0.15 + 0.75; // Usamos 'time' para un pulso constante sin importar la escala de tiempo
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

  // Animación de los agujeros negros
  blackHoles.forEach(bh => {
    // Rotación del disco de acreción
    const diskGroup = bh.getObjectByName('accretionDisk');
    if (diskGroup?.children[0]?.material.uniforms) {
      // Actualizamos el uniform 'time' en el shader del disco para que se anime.
      diskGroup.children[0].material.uniforms.time.value = time * 0.0001;
    } 

    // Actualizamos los uniforms del shader de distorsión
    const lensingSphere = bh.getObjectByName('lensing');
    if (lensingSphere) {
        bh.getWorldPosition(screenPos);
        screenPos.project(camera); // Proyectamos la posición 3D a coordenadas de pantalla (-1 a 1)

        // Convertimos de -1 a 1 -> 0 a 1 para usar como UV
        screenPos.x = screenPos.x * 0.5 + 0.5;
        screenPos.y = screenPos.y * 0.5 + 0.5;

        lensingSphere.material.uniforms.blackHolePosition.value.copy(screenPos);
    }
  });

  // Animación de los púlsares
  pulsars.forEach(pulsar => {
      pulsar.rotation.y += 0.05 * scaledDelta; // Rotación del "faro"
      const data = pulsar.userData;
      if (data.isPulsar) {
          const pulseFactor = Math.pow((Math.sin(gameTime * 1.5) + 1) / 2, 2.0);
          data.starMaterial.emissiveIntensity = data.baseIntensity + pulseFactor * 15;
          data.beamMaterial.uniforms.time.value = gameTime;
          data.disk.rotation.z += 0.001 * scaledDelta;
      }
  });

  // Disparador aleatorio de supernovas
  if (Math.random() < 0.002) {
      const minDistance = CONSTELLATION_RADIUS * 1.0; // Un poco más allá de las constelaciones
      const maxDistance = CONSTELLATION_RADIUS * 2.5; // Mucho más lejos
      
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      
      // Generamos una posición aleatoria en una esfera
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * 2 * Math.PI;
      randomPosition.setFromSphericalCoords(distance, phi, theta);

      createSupernova(randomPosition, time); // Pasamos el tiempo actual para la animación en GPU
  }

  // Actualizamos el shader de las supernovas
  if (supernovaSystem) {
    supernovaSystem.material.uniforms.u_time.value = time;
    supernovaSystem.material.uniforms.u_timeScale.value = timeScale;
  }

  // ====== RENDERIZADO EN DOS PASES PARA LENTE GRAVITACIONAL ======

  // 1. Primer pase: Renderizamos la escena normal (capa DEFAULT_LAYER) a una textura (`renderTarget`).
  camera.layers.set(DEFAULT_LAYER); // Solo vemos la capa por defecto
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  // 2. Segundo pase: Renderizamos todo a la pantalla, incluyendo la capa de `LENSING_LAYER`.
  // El shader de la esfera de distorsión usará la textura que acabamos de crear.
  camera.layers.enableAll(); // Vemos todas las capas
  blackHoles.forEach(bh => {
      bh.getObjectByName('lensing').material.uniforms.sceneTexture.value = renderTarget.texture;
  });
  renderer.render(scene, camera);
}

/**
 * Función principal asíncrona que inicializa la aplicación.
 * - Inicia el bucle de animación.
 * - Espera a que se carguen todos los assets y se generen los elementos de fondo.
 * - Inicializa la interfaz de usuario y los elementos interactivos.
 * - Genera objetos procedurales como agujeros negros y púlsares.
 */
async function main() {
  animate(); 

  // Esperamos a que todo esté listo: assets, constelaciones y la generación del fondo.
  await Promise.all([
    assetsLoadedPromise,
    initConstellations(),
    initBackground()
  ]);

  initUI();

  // Genera varios agujeros negros en posiciones lejanas y aleatorias.
  const blackHoleCount = 2;
  for (let i = 0; i < blackHoleCount; i++) {
    const minDistance = CONSTELLATION_RADIUS * 1.0;
    const maxDistance = CONSTELLATION_RADIUS * 1.5;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * 2 * Math.PI;
    randomPosition.setFromSphericalCoords(distance, phi, theta);
    
    createBlackHole({
      position: randomPosition,
      size: 40 + Math.random() * 40
    });
  }

  // Genera algunos púlsares.
  const pulsarCount = 1;
  for (let i = 0; i < pulsarCount; i++) {
      const minDistance = CONSTELLATION_RADIUS * 1.5;
      const maxDistance = CONSTELLATION_RADIUS * 3.0;
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * 2 * Math.PI;
      randomPosition.setFromSphericalCoords(distance, phi, theta);

      createPulsar({ position: randomPosition });
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

  // ====== LÓGICA DEL DESLIZADOR DE TIEMPO CURVO ======
  /**
   * Configura los listeners y la lógica para el slider de control de tiempo.
   */
  function setupTimeSlider() {
    const handle = document.getElementById('time-slider-handle');
    const path = document.getElementById('time-slider-path');
    const display = document.getElementById('time-scale-display');
    const pathLength = path.getTotalLength();
    let isDragging = false;

    /**
     * Actualiza la posición del handle del slider y la escala de tiempo global.
     * @param {number} progress - Progreso del slider (0 a 1).
     */
    function updateHandlePosition(progress) {
        progress = Math.max(0, Math.min(1, progress)); // Clamp entre 0 y 1
        const point = path.getPointAtLength(progress * pathLength);
        handle.style.left = `${point.x}px`;
        handle.style.top = `${point.y}px`;

        // Mapeo logarítmico del progreso a la escala de tiempo
        if (progress < 0.01) { // Zona de pausa
            timeScale = 0;
        } else {
            const logProgress = MIN_LOG_SCALE + (progress * (MAX_LOG_SCALE - MIN_LOG_SCALE));
            timeScale = Math.pow(10, logProgress);
        }
        
        display.textContent = timeScale < 1 ? timeScale.toFixed(2) : Math.round(timeScale);
    }

    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.style.cursor = 'grabbing';
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const containerRect = path.ownerSVGElement.getBoundingClientRect();
        // El progreso se basa en la posición X del ratón relativa al contenedor
        const progress = (e.clientX - containerRect.left) / containerRect.width;
        updateHandlePosition(progress);
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = 'default';
        }
    });

    // Establecer posición inicial (tiempo normal = 1x)
    // Calculamos el progreso necesario para que timeScale sea 1.
    // La fórmula es: progress = (log10(targetScale) - MIN_LOG_SCALE) / (MAX_LOG_SCALE - MIN_LOG_SCALE)
    const targetLogScale = Math.log10(1); // log10(1) = 0
    const initialProgress = (targetLogScale - MIN_LOG_SCALE) / (MAX_LOG_SCALE - MIN_LOG_SCALE);

    updateHandlePosition(initialProgress);
  }

  setupTimeSlider();

  // Una vez que todo está cargado, ocultamos la pantalla de carga.
  hideLoadingScreen();
}
main();
/**
 * Listener para el evento de redimensionar la ventana.
 * Actualiza la relación de aspecto de la cámara, el tamaño del renderer y
 * las resoluciones en los shaders que lo necesiten.
 */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderTarget.setSize(window.innerWidth, window.innerHeight);

  // Actualizamos la resolución en los shaders de los agujeros negros
  blackHoles.forEach(bh => {
    const lensingSphere = bh.getObjectByName('lensing');
    if (lensingSphere) {
        lensingSphere.material.uniforms.screenResolution.value.set(window.innerWidth, window.innerHeight);
    }
  });
});
