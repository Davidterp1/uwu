import * as THREE from 'three';
import { camera, controls } from './core.js';
import { sun, planetGroups, planetMeshes, pickableObjects, scene } from './celestialObjects.js';
import { constellationGroup, constellationLinesStore } from './constellations.js'; export { constellationLinesStore };
import { famousConstellations } from './config.js';
const planetStats = document.getElementById('planet-stats');
const statsNameEl = document.getElementById('stats-name');
const statsDistanceEl = document.getElementById('stats-distance');
const statsSpeedEl = document.getElementById('stats-speed');
const statsDescriptionEl = document.getElementById('stats-description');
const statsExtraInfoEl = document.getElementById('stats-extra-info');

const constellationModal = document.getElementById('constellation-modal');
const constellationNameEl = document.getElementById('constellation-name');
const constellationInfoEl = document.getElementById('constellation-info');
const constellationImageEl = document.getElementById('constellation-image');
const constellationCloseBtn = document.querySelector('#constellation-modal .close');

export function updatePlanetInfo(planetMesh) {
    if (!planetMesh) {
        // Si no hay planeta, ocultamos el panel
        planetStats.classList.remove('visible');
        return;
    }
    const planetData = planetMesh.userData;
    const sunPos = new THREE.Vector3(); sun.getWorldPosition(sunPos);
    const planetPos = new THREE.Vector3(); planetMesh.getWorldPosition(planetPos);
    const distance = planetPos.distanceTo(sunPos);
    const speed = (planetData.orbitalSpeed || 0) * (planetData.orbitRadius || 1);
    statsNameEl.textContent = planetData.name;
    statsDistanceEl.innerHTML = `<span>Distancia al Sol</span><span>${distance.toFixed(0)}</span>`;
    statsSpeedEl.innerHTML = `<span>Velocidad orbital</span><span>${speed.toFixed(3)} rad/t</span>`;
    statsDescriptionEl.textContent = planetData.description || '';
    statsExtraInfoEl.innerHTML = formatExtraInfo(planetData);
    // Mostramos el panel con la nueva información
    planetStats.classList.add('visible');
}

function formatExtraInfo(planetData) {
    let out = '';
    if (planetData.composition) out += `<strong>Composición:</strong> ${planetData.composition}<br>`;
    if (planetData.temperature) out += `<strong>Temperatura:</strong> ${planetData.temperature}<br>`;
    if (planetData.atmosphere) out += `<strong>Atmósfera:</strong> ${planetData.atmosphere}<br>`;
    if (planetData.satellites) out += `<strong>Satélites notables:</strong> ${planetData.satellites}<br>`;
    if (planetData.funFact) out += `<br><strong>Dato curioso:</strong> ${planetData.funFact}<br>`;
    if (planetData.exploration) out += `<strong>Exploración:</strong> ${planetData.exploration}<br>`;
    return out;
}

export function updateConstellationInfo(constellationMesh) {
    if (constellationMesh && constellationMesh.userData.isConstellation) {
        const constName = constellationMesh.userData.name;
        constellationNameEl.textContent = constName;
        constellationInfoEl.innerHTML = 'Aquí podría ir información local sobre la constelación.';
        constellationImageEl.style.display = 'none';
        constellationImageEl.src = '';
        constellationModal.classList.add('visible');
    } else {
        constellationModal.classList.remove('visible');
    }
}

async function onSceneClick(event) {
    // Solo prevenimos el menú contextual si el clic es derecho.
    if (event.button === 2) event.preventDefault();

    const raycaster = new THREE.Raycaster();

    if (controls.isLocked) {
        // Si los controles están bloqueados (modo FPS), el rayo sale del centro de la pantalla.
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    } else {
        // Si los controles no están bloqueados, usamos la posición del ratón.
        raycaster.setFromCamera({ x: (event.clientX / window.innerWidth) * 2 - 1, y: -(event.clientY / window.innerHeight) * 2 + 1 }, camera);
    }

    const intersects = raycaster.intersectObjects(pickableObjects, true);
    if (intersects.length === 0) return;

    const clicked = intersects[0].object;
    const planetData = clicked.userData || {};

    // Verificamos si el objeto clickeado es parte de los planetas o el sol
    const isPlanetOrSun = planetMeshes.includes(clicked) || clicked === sun || (scene.userData._moon && clicked === scene.userData._moon);

    // La lógica de clic para constelaciones se ha movido a la función de hover.
}

function returnToSun() {
    // Movemos la cámara a la posición inicial cerca del sol.
    // La cámara ya está dentro del objeto de control, así que movemos ese objeto.
    controls.getObject().position.set(0, 50, 200);
    // Para mirar al sol, necesitamos desbloquear, mirar y volver a bloquear, o simplemente teletransportar.
}

function createConstellationMenuUI() {
    // Seleccionamos el contenido del menú desplegable principal
    const mainMenuContent = document.querySelector('.dropdown-content');
    if (!mainMenuContent) return;

    const options = [
        { text: 'Mostrar Constelaciones', action: () => {
            constellationGroup.visible = true;
        }},
        { text: 'Ocultar Constelaciones', action: () => { 
            constellationGroup.visible = false; 
        }}
    ];

    // Añadimos las opciones de constelaciones al menú principal
    options.forEach(opt => {
        const link = document.createElement('a');
        link.textContent = opt.text;
        link.href = '#'; // Para que parezca un enlace
        link.addEventListener('click', (e) => {
            e.preventDefault();
            opt.action();
            mainMenuContent.classList.remove('show'); // Cerramos el menú al hacer clic
        });
        mainMenuContent.appendChild(link);
    });
}

function setupMainMenu() {
    const toggleBtn = document.querySelector('.menu-toggle');
    const content = document.querySelector('.dropdown-content');
    if (!toggleBtn || !content) return;
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        content.classList.toggle('show');
    });
    window.addEventListener('click', (e) => {
        if (content.classList.contains('show') && !toggleBtn.contains(e.target)) {
            content.classList.remove('show');
        }
    });
}

export function initUI() {
    // El clic izquierdo se usa para seleccionar objetos.
    window.addEventListener('click', onSceneClick);

    // Listener para cerrar modales al hacer clic izquierdo fuera de ellos.
    // Al hacer clic en cualquier lugar, se activa el modo vuelo.
    document.body.addEventListener('click', (event) => {
        if (constellationModal.style.display !== 'block') {
            controls.lock();
        }
    });

    window.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    controls.addEventListener('lock', () => {
        // Cuando los controles se bloquean, el menú principal se oculta.
        document.querySelector('.dropdown-content').classList.remove('show');
    });

    // Mostramos u ocultamos la mirilla dependiendo del estado de los controles
    const crosshair = document.getElementById('crosshair');
    controls.addEventListener('lock', () => { crosshair.style.display = 'block'; });
    controls.addEventListener('unlock', () => { crosshair.style.display = 'none'; });


    // El navegador desbloquea el puntero automáticamente al soltar el clic o presionar ESC.
    // No necesitamos un listener para 'unlock' o 'mouseup'.
    document.getElementById('home-btn').addEventListener('click', returnToSun);

    createConstellationMenuUI();
    setupMainMenu();
}