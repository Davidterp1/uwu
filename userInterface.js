/**
 * @file userInterface.js
 * @description Gestiona todos los elementos de la interfaz de usuario, como paneles de información,
 * menús, botones y la interacción del usuario con la escena (clics, toques).
 */

import * as THREE from 'three';
import { camera, controls } from './threeCore.js';
import { sun, planetMeshes, pickableObjects } from './celestialBodies.js';
import { setCameraFollowTarget } from './main.js';
import { constellationGroup } from './constellationManager.js';
import { initMenu, populateMainMenuWithFavorites, populateMenu } from './menu.js';
import { isUserLoggedIn, getCurrentUser, getUserData, updateUserData } from './auth.js'; // Módulo de autenticación

// Variable global para almacenar el planeta seleccionado en dispositivos móviles.
let selectedPlanet = null;

// Función simple para detectar si es un dispositivo táctil/móvil
const isMobile = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const planetStats = document.getElementById('planet-stats');
const statsNameEl = document.getElementById('stats-name');
const statsDistanceEl = document.getElementById('stats-distance');
const statsDescriptionEl = document.getElementById('stats-description');
const statsSpeedEl = document.getElementById('stats-speed');
const statsExtraInfoEl = document.getElementById('stats-extra-info');
const constellationModal = document.getElementById('constellation-modal');
const favoriteBtn = document.getElementById('favorite-btn');
const constellationNameEl = document.getElementById('constellation-name');
const constellationInfoEl = document.getElementById('constellation-info');
const constellationImageEl = document.getElementById('constellation-image');
const constellationCloseBtn = document.querySelector('#constellation-modal .close');
const planetStatsCloseBtn = document.querySelector('#planet-stats .close');

export function updatePlanetInfo(planetMesh) {
    // En móvil, si ya hay un planeta seleccionado, no hacemos nada con el hover.
    if (isMobile() && selectedPlanet && planetMesh) {
        return;
    }

    if (!planetMesh && !selectedPlanet) {
        // Si no hay planeta (ni por hover ni por selección), ocultamos el panel.
        planetStats.classList.remove('visible');
        return;
    }

    // Usamos el planeta del hover o el seleccionado en móvil
    const currentPlanet = planetMesh || selectedPlanet;
    const planetData = currentPlanet.userData;

    // Calculamos la distancia al sol para mostrarla.
    const sunPos = new THREE.Vector3();
    sun.getWorldPosition(sunPos);
    const planetPos = new THREE.Vector3();
    currentPlanet.getWorldPosition(planetPos);
    const distance = planetPos.distanceTo(sunPos);

    // Calculamos una velocidad orbital "representativa".
    const speed = (planetData.orbitalSpeed || 0) * (planetData.orbitRadius || 1);

    // Actualizamos los elementos del DOM con la información del planeta.
    statsNameEl.textContent = planetData.name;
    statsDistanceEl.innerHTML = `<span>Distancia al Sol</span><span>${distance.toFixed(0)}</span>`;
    statsSpeedEl.innerHTML = `<span>Velocidad orbital</span><span>${speed.toFixed(3)} rad/t</span>`;
    statsDescriptionEl.textContent = planetData.description || '';
    statsExtraInfoEl.innerHTML = formatExtraInfo(planetData);

    // Actualizamos el estado del botón de favoritos.
    updateFavoriteButtonState(planetData.name);

    // Mostramos el panel.
    planetStats.classList.add('visible');
}


function formatExtraInfo(planetData) {
    let out = '';
    if (planetData.composition) out += `<strong>Composición:</strong> ${planetData.composition}<br>`;
    if (planetData.rotationPeriod) out += `<strong>Periodo de Rotación:</strong> ${planetData.rotationPeriod}<br>`;
    if (planetData.temperature) out += `<strong>Temperatura:</strong> ${planetData.temperature}<br>`;
    if (planetData.atmosphere) out += `<strong>Atmósfera:</strong> ${planetData.atmosphere}<br>`;
    if (planetData.satellites) out += `<strong>Satélites notables:</strong> ${planetData.satellites}<br>`;
    if (planetData.funFact) out += `<br><strong>Dato curioso:</strong> ${planetData.funFact}<br>`;
    if (planetData.exploration) out += `<strong>Exploración:</strong> ${planetData.exploration}<br>`;
    return out;
}

/**
 * Muestra u oculta el modal de información de la constelación.
 * @param {?THREE.Object3D} constellationMesh - El objeto de la constelación sobre el que se hace hover.
 */
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

/**
 * Maneja los eventos de clic o toque en la escena.
 * En PC, se usa para bloquear los controles.
 * En móvil, se usa para seleccionar planetas.
 * @param {MouseEvent|TouchEvent} event - El evento de clic o toque.
 */
async function onSceneClick(event) {
    // En PC, el clic izquierdo es para bloquear los controles, no para seleccionar.
    if (!isMobile() && event.button === 0) {
        // Solo bloqueamos si el clic es sobre el canvas, no sobre la UI.
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
    const isPlanetOrSun = clickedObject && (planetMeshes.includes(clickedObject) || clickedObject === sun || clickedObject.userData.isMoon);

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

/**
 * Devuelve la cámara a una posición inicial cerca del Sol.
 */
function returnToSun() {
    setCameraFollowTarget(null); // Dejamos de seguir cualquier objeto.
    controls.getObject().position.set(0, 50, 200);
    controls.getObject().lookAt(0, 0, 0); // Miramos al centro del sistema.
}

/**
 * Obtiene la lista de planetas favoritos del usuario actual desde localStorage.
 * @returns {string[]} Un array con los nombres de los planetas favoritos.
 */
function getFavorites() {
    const username = getCurrentUser();
    if (!username) return [];
    const userData = getUserData(username);
    return userData ? userData.favorites : [];
}

/**
 * Guarda la lista de favoritos del usuario actual en localStorage.
 * @param {string[]} favorites - El array actualizado de favoritos.
 */
function setFavorites(favorites) {
    const username = getCurrentUser();
    if (!username) return;
    updateUserData(username, { favorites });
    updateFavoritesMenu(); // Actualizamos el menú cada vez que cambian los favoritos.
}

/**
 * Añade o elimina un planeta de la lista de favoritos del usuario.
 */
function toggleFavorite() {
    const planetName = statsNameEl.textContent;
    if (!planetName || !isUserLoggedIn()) return;

    let favorites = getFavorites();
    const isFavorite = favorites.includes(planetName);

    if (isFavorite) {
        favorites = favorites.filter(name => name !== planetName);
        favoriteBtn.classList.remove('is-favorite');
        favoriteBtn.textContent = '☆';
    } else {
        favorites.push(planetName);
        favoriteBtn.classList.add('is-favorite');
        favoriteBtn.textContent = '★';
    }
    setFavorites(favorites);
}

/**
 * Actualiza el estado visual del botón de favoritos (estrella)
 * para que coincida con si el planeta actual está en la lista de favoritos.
 * @param {string} planetName - El nombre del planeta que se está mostrando.
 */
function updateFavoriteButtonState(planetName) {
    if (!favoriteBtn) return;

    if (isUserLoggedIn()) {
        favoriteBtn.style.display = 'block';
        const favorites = getFavorites();
        if (favorites.includes(planetName)) {
            favoriteBtn.classList.add('is-favorite');
            favoriteBtn.textContent = '★';
        } else {
            favoriteBtn.classList.remove('is-favorite');
            favoriteBtn.textContent = '☆';
        }
    } else {
        favoriteBtn.style.display = 'none'; // Ocultar el botón si no hay nadie logueado
    }
}

/**
 * Actualiza el submenú de favoritos en el menú principal.
 */
function updateFavoritesMenu() {
    const favorites = getFavorites();
    
    // La función de callback que se ejecuta al hacer clic en un favorito
    const handleFavoriteClick = (planetName) => {
        const targetPlanet = planetMeshes.find(p => p.userData.name === planetName) || (planetName === 'Sun' ? sun : null);
        if (targetPlanet) {
            setCameraFollowTarget(targetPlanet);
            updatePlanetInfo(targetPlanet);
        }
    };

    // Limpiamos el menú antes de repoblar para evitar duplicados al cambiar de usuario
    populateMenu(); 
    populateMainMenuWithFavorites(favorites, handleFavoriteClick);
}

/**
 * Configura el botón para mostrar/ocultar las constelaciones.
 */
function setupConstellationToggle() {
    const toggleBtn = document.getElementById('constellation-toggle-btn');
    if (!toggleBtn) return;

    // Estado inicial (suponiendo que empiezan ocultas)
    constellationGroup.visible = false;

    toggleBtn.addEventListener('click', () => {
        constellationGroup.visible = !constellationGroup.visible;
        if (constellationGroup.visible) {
            toggleBtn.classList.add('active-btn');
        } else {
            toggleBtn.classList.remove('active-btn');
        }
    });
}

/**
 * Configura el control de volumen para el audio de fondo.
 */
function setupVolumeControl() {
    const toggleBtn = document.getElementById('volume-toggle-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const popup = document.getElementById('volume-slider-popup');
    const audio = document.querySelector('audio');

    if (!toggleBtn || !volumeSlider || !popup || !audio) return;

    // Cargar el volumen guardado o usar un valor por defecto (ej. 50%)
    const savedVolume = localStorage.getItem('audioVolume');
    const initialVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.5;
    audio.volume = initialVolume;
    volumeSlider.value = initialVolume * 100;

    // Lógica del slider
    volumeSlider.addEventListener('input', () => {
        const newVolume = volumeSlider.value / 100;
        audio.volume = newVolume;
        localStorage.setItem('audioVolume', newVolume);
    });

    // Lógica para mostrar/ocultar el popup
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.classList.toggle('show');
    });

    // Ocultar si se hace clic fuera
    window.addEventListener('click', (e) => {
        if (popup.classList.contains('show') && !popup.contains(e.target) && !toggleBtn.contains(e.target)) {
            popup.classList.remove('show');
        }
    });
}

/**
 * Inicializa todos los componentes de la interfaz de usuario y sus listeners.
 */
export function initUI() {
    // Inicializa el menú base (toggle, login/logout, etc.)
    initMenu();

    // En móvil, usamos 'click' para seleccionar. En PC, para bloquear controles.
    window.addEventListener('click', (e) => {
        if (isMobile()) {
            onSceneClick(e);
        } else {
            // En PC, el clic bloquea los controles, a menos que se haga clic en un elemento interactivo de la UI.
            const target = e.target;
            const isUIElement = target.closest('.menu-container, .modal, #help-icon-container, #volume-container, #time-slider-container, a, button');

            // Si el clic no fue en un elemento de la UI, activamos el modo vuelo.
            if (!isUIElement) {
                controls.lock();
            }
        }
    });

    // Cierra el panel de estadísticas del planeta.
    if (planetStatsCloseBtn) {
        planetStatsCloseBtn.addEventListener('click', () => {
            selectedPlanet = null;
            planetStats.classList.remove('visible');
        });
    }

    // Botón para añadir/quitar de favoritos.
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', toggleFavorite);
    }

    // Prevenimos el menú contextual del navegador para poder usar el clic derecho en el futuro.
    window.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    // Gestiona la visibilidad de la mirilla y el botón de volver al sol.
    if (controls) { // `controls` solo existe en la página principal
        const crosshair = document.getElementById('crosshair');
        if (crosshair) {
            controls.addEventListener('lock', () => { crosshair.style.display = 'block'; });
            controls.addEventListener('unlock', () => { crosshair.style.display = 'none'; });
        }
        document.getElementById('home-btn')?.addEventListener('click', returnToSun);
    }

    // Configura los botones de toggle.
    setupConstellationToggle();
    setupVolumeControl();

    // Poblamos el menú con los favoritos del usuario (si está logueado).
    updateFavoritesMenu();

    if (isMobile()) document.body.classList.add('is-mobile');
}