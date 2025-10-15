import * as THREE from 'three';
import { camera, controls } from './core.js';
import { sun, planetGroups, planetMeshes, pickableObjects, scene } from './celestialObjects.js';
import { constellationGroup, constellationLinesStore } from './constellations.js';
import { famousConstellations } from './config.js';

// Variable para almacenar el planeta seleccionado en móvil
let selectedPlanet = null;

// Función simple para detectar si es un dispositivo táctil/móvil
const isMobile = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

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
const planetStatsCloseBtn = document.querySelector('#planet-stats .close');

export function updatePlanetInfo(planetMesh) {
    // En móvil, si ya hay un planeta seleccionado, no hacemos nada con el hover.
    if (isMobile() && selectedPlanet) {
        return;
    }

    if (!planetMesh && !selectedPlanet) {
        // Si no hay planeta, ocultamos el panel
        planetStats.classList.remove('visible');
        return;
    }

    // Usamos el planeta del hover o el seleccionado en móvil
    const currentPlanet = planetMesh || selectedPlanet;
    const planetData = currentPlanet.userData;
    const sunPos = new THREE.Vector3(); sun.getWorldPosition(sunPos);
    const planetPos = new THREE.Vector3(); currentPlanet.getWorldPosition(planetPos);
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

    // En PC, el clic izquierdo es para bloquear los controles, no para seleccionar.
    if (!isMobile() && event.button === 0) {
        controls.lock();
        return;
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // Usamos la posición del toque/clic en la pantalla
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(pickableObjects, true);
    
    const clickedObject = intersects.length > 0 ? intersects[0].object : null;
    const isPlanetOrSun = clickedObject && (planetMeshes.includes(clickedObject) || clickedObject === sun || (scene.userData._moon && clickedObject === scene.userData._moon));

    if (isPlanetOrSun) {
        // Si tocamos un planeta, lo seleccionamos y mostramos su info
        selectedPlanet = clickedObject;
        updatePlanetInfo(null); // Pasamos null para que use el `selectedPlanet`
    } else if (clickedObject === null) {
        // Si tocamos el espacio vacío, deseleccionamos y ocultamos el panel
        selectedPlanet = null;
        planetStats.classList.remove('visible');
    }
    // Si se toca otro objeto que no es un planeta (ej. constelación), no hacemos nada con el panel de planetas.
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
    // En móvil, usamos 'click' para seleccionar. En PC, para bloquear controles.
    window.addEventListener('click', (e) => {
        if (isMobile()) {
            onSceneClick(e);
        } else {
            // En PC, el clic bloquea los controles, excepto si se hace sobre un elemento UI
            if (e.target.tagName.toLowerCase() === 'canvas') {
                controls.lock();
            }
        }
    });

    planetStatsCloseBtn.addEventListener('click', () => {
        selectedPlanet = null;
        planetStats.classList.remove('visible');
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
    if (isMobile()) document.body.classList.add('is-mobile');
}