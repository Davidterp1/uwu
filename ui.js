import * as THREE from 'three';
import { camera, controls, originalMinDistance, originalMaxDistance } from './core.js';
import { sun, planetGroups, planetMeshes, pickableObjects, scene } from './celestialObjects.js';
import { constellationGroup, constellationLinesStore } from './constellations.js'; export { constellationLinesStore };

const modal = document.getElementById('info-modal');
const closeBtn = document.querySelector('#info-modal .close');
const statsNameEl = document.getElementById('stats-name');
const statsDistanceEl = document.getElementById('stats-distance');
const statsSpeedEl = document.getElementById('stats-speed');
const planetNameEl = document.getElementById('planet-name');
const planetInfoEl = document.getElementById('planet-info');

const constellationModal = document.getElementById('constellation-modal');
const constellationNameEl = document.getElementById('constellation-name');
const constellationInfoEl = document.getElementById('constellation-info');
const constellationImageEl = document.getElementById('constellation-image');
const constellationCloseBtn = document.querySelector('#constellation-modal .close');

let followTarget = null;

export function getFollowTarget() {
    return followTarget;
}

export function updatePlanetStats(planetMesh, planetData) {
    if (!planetMesh || !planetData) {
        statsNameEl.textContent = 'Sistema Solar';
        statsDistanceEl.textContent = 'Distancia al Sol: -';
        statsSpeedEl.textContent = 'Velocidad orbital: -';
        return;
    }
    const sunPos = new THREE.Vector3(); sun.getWorldPosition(sunPos);
    const planetPos = new THREE.Vector3(); planetMesh.getWorldPosition(planetPos);
    const distance = planetPos.distanceTo(sunPos);
    const speed = (planetData.orbitalSpeed || 0) * (planetData.orbitRadius || 1);
    statsNameEl.textContent = planetData.name;
    statsDistanceEl.textContent = `Distancia al Sol: ${distance.toFixed(2)} unidades`;
    statsSpeedEl.textContent = `Velocidad orbital: ${speed.toFixed(3)} rad/unidad de tiempo`;
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

async function onSceneClick(event) {
    event.preventDefault(); // Previene que aparezca el menú contextual del navegador.

    // Si ya hay un modal abierto, no hacemos nada más. Esto obliga al usuario a cerrarlo primero.
    if (modal.style.display === 'block' || constellationModal.style.display === 'block') {
        return;
    }

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(pickableObjects, true);
    if (intersects.length === 0) return;

    const clicked = intersects[0].object;
    const planetData = clicked.userData || {};

    let targetGroup = null;
    if (clicked === sun) targetGroup = sun;
    else if (scene.userData._moon && clicked === scene.userData._moon) {
        targetGroup = scene.userData._moonGroup;
    } else {
        const idx = planetMeshes.indexOf(clicked);
        if (idx >= 0) targetGroup = planetGroups[idx];
    }

    if (targetGroup) {
        followTarget = targetGroup;
        controls.enabled = false;

        planetNameEl.textContent = planetData.name || 'Objeto';
        planetInfoEl.innerHTML = `
      <strong>Mass:</strong> ${planetData.mass || '-'}<br>
      <strong>Radius:</strong> ${planetData.radius || '-'}<br>
      <br><span class="description">${planetData.description || ''}</span><br><br>
      ${formatExtraInfo(planetData)}
    `;
        modal.style.display = 'block';
    } else if (clicked.userData && clicked.userData.isConstellation) {
        const constName = clicked.userData.name;
        constellationNameEl.textContent = constName;
        constellationInfoEl.innerHTML = 'Aquí podría ir información local sobre la constelación.';
        constellationImageEl.style.display = 'none';
        constellationImageEl.src = '';
        constellationModal.style.display = 'block';
    }
}

function exitFollowMode(event) {
    if (event) event.stopPropagation(); // Detiene la propagación del clic
    modal.style.display = 'none';
    followTarget = null;
    controls.enabled = true;
    updatePlanetStats(null, null);
}

function closeConstellationModal(event) {
    if (event) event.stopPropagation(); // Detiene la propagación del clic
    constellationModal.style.display = 'none';
}

function enterFreeCameraMode() {
    const freeCamBtn = document.getElementById('free-cam-btn');
    if (followTarget) {
        exitFollowMode();
    }
    controls.minDistance = 1;
    controls.maxDistance = Infinity;
    freeCamBtn.classList.add('active-cam-btn');
}

function returnToSun() {
    const freeCamBtn = document.getElementById('free-cam-btn');
    followTarget = sun;
    controls.enabled = false;
    controls.minDistance = originalMinDistance;
    controls.maxDistance = originalMaxDistance;
    freeCamBtn.classList.remove('active-cam-btn');
}

function createConstellationMenuUI() {
    const container = document.querySelector('.constellation-menu-container');
    const toggleBtn = container.querySelector('.constellation-menu-toggle');
    const optionsList = container.querySelector('.constellation-options');

    const famousConstellations = ['Orion', 'Ursa Major', 'Ursa Minor', 'Cassiopeia', 'Crux', 'Scorpius', 'Sagittarius', 'Leo', 'Taurus', 'Gemini', 'Aries', 'Virgo'];

    const options = [
        { text: 'Mostrar Famosas (12)', action: () => {
            constellationGroup.visible = true;
            constellationLinesStore.forEach(line => { line.visible = famousConstellations.includes(line.userData.name); });
        }},
        { text: 'Mostrar Todas', action: () => {
            constellationGroup.visible = true;
            constellationLinesStore.forEach(line => { line.visible = true; });
        }},
        { text: 'Ocultar Todas', action: () => { constellationGroup.visible = false; }}
    ];

    options.forEach(opt => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.textContent = opt.text;
        btn.addEventListener('click', () => {
            opt.action();
            optionsList.style.display = 'none';
        });
        li.appendChild(btn);
        optionsList.appendChild(li);
    });

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        optionsList.style.display = optionsList.style.display === 'block' ? 'none' : 'block';
    });

    // Listener global para cerrar el menú de constelaciones si se hace clic en cualquier otro lugar
    window.addEventListener('click', () => {
        if (optionsList.style.display === 'block') {
            optionsList.style.display = 'none';
        }
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
    window.addEventListener('contextmenu', onSceneClick); // Cambiado a clic derecho.
    if (closeBtn) closeBtn.addEventListener('click', exitFollowMode);
    if (constellationCloseBtn) constellationCloseBtn.addEventListener('click', closeConstellationModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) exitFollowMode(e);
        if (e.target === constellationModal) closeConstellationModal(e);
    });

    document.getElementById('free-cam-btn').addEventListener('click', enterFreeCameraMode);
    document.getElementById('home-btn').addEventListener('click', returnToSun);

    createConstellationMenuUI();
    setupMainMenu();
}