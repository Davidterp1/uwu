import { isUserLoggedIn, logoutUser } from './auth.js';

/**
 * Configura la lógica para mostrar y ocultar el menú desplegable.
 */
function setupMenuToggle() {
    const toggleBtn = document.querySelector('.menu-toggle');
    const content = document.querySelector('.dropdown-content');

    if (!toggleBtn || !content) return;

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        content.classList.toggle('show');
    });

    window.addEventListener('click', () => {
        if (content.classList.contains('show')) {
            content.classList.remove('show');
        }
    });
}

/**
 * Crea y añade los enlaces al menú desplegable según el estado de autenticación.
 */
export function populateMenu() {
    const dropdown = document.querySelector('.dropdown-content');
    if (!dropdown) return;

    // Limpiamos el contenido anterior para evitar duplicados
    dropdown.innerHTML = '';

    // Enlace a Inicio (siempre presente)
    const homeLink = document.createElement('a');
    homeLink.href = 'landing.html';
    homeLink.textContent = 'Inicio';
    dropdown.appendChild(homeLink);

    // Enlace a Galería (siempre presente)
    const galleryLink = document.createElement('a');
    galleryLink.href = 'Galeria.html';
    galleryLink.textContent = 'Galería';
    dropdown.appendChild(galleryLink);

    if (isUserLoggedIn()) {
        // Si el usuario está logueado
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.textContent = 'Cerrar Sesión';
        logoutLink.onclick = (e) => {
            e.preventDefault();
            logoutUser();
            populateMenu(); // Actualizamos el menú para mostrar "Login/Register"
            window.location.href = 'index.html'; // Redirigimos a inicio
        };
        dropdown.appendChild(logoutLink);

    } else {
        // Si el usuario NO está logueado
        const registerLink = document.createElement('a');
        registerLink.href = 'registro.html';
        registerLink.textContent = 'Registro';
        dropdown.appendChild(registerLink);

        const loginLink = document.createElement('a');
        loginLink.href = 'inicioSesion.html';
        loginLink.textContent = 'Inicio de Sesión';
        dropdown.appendChild(loginLink);
    }
}

/**
 * Inicializa toda la funcionalidad del menú.
 * @param {boolean} isMainPage - Indica si estamos en la página principal (index.html).
 */
export function initMenu() {
    setupMenuToggle();
    populateMenu();
}

/**
 * Función específica para la página principal (index.html) que también
 * añade los favoritos al menú.
 * @param {Function} onFavoriteClick - Callback para manejar el clic en un favorito.
 */
export function populateMainMenuWithFavorites(favorites, onFavoriteClick) {
    const dropdown = document.querySelector('.dropdown-content');
    if (!dropdown || !isUserLoggedIn() || !favorites || favorites.length === 0) return;

    const separator = document.createElement('hr');
    dropdown.appendChild(separator);

    favorites.forEach(planetName => {
        const favLink = document.createElement('a');
        favLink.href = '#';
        favLink.textContent = `★ ${planetName}`;
        favLink.onclick = (e) => {
            e.preventDefault();
            onFavoriteClick(planetName);
            dropdown.classList.remove('show'); // Cierra el menú al hacer clic
        };
        dropdown.appendChild(favLink);
    });
}