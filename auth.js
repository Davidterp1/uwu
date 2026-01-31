/**
 * @file Gestiona la autenticación de usuarios y el almacenamiento de datos en localStorage.
 * @summary Este módulo proporciona funciones para registrar, iniciar sesión, cerrar sesión y gestionar los datos de los usuarios.
 * ¡ADVERTENCIA! Este sistema de autenticación es solo para fines de demostración.
 * No es seguro para producción, ya que la autenticación del lado del cliente es inherentemente vulnerable.
 */

const USERS_DB_KEY = 'solar_system_users'; // Clave para la "base de datos" de usuarios en localStorage.
const CURRENT_USER_KEY = 'solar_system_currentUser'; // Clave para el nombre del usuario que ha iniciado sesión.

/**
 * Lee la base de datos de usuarios desde localStorage.
 * @returns {object} Un objeto que contiene todos los usuarios. Si no hay datos, devuelve un objeto vacío.
 * @private
 */
function readUsers() {
    const users = localStorage.getItem(USERS_DB_KEY);
    return users ? JSON.parse(users) : {};
}

/**
 * Escribe el objeto de usuarios en localStorage.
 * @param {object} users - El objeto de usuarios para guardar.
 * @private
 */
function writeUsers(users) {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
}

// --- Funciones de Hashing con la API Web Crypto ---

/**
 * Convierte un string a un ArrayBuffer para usarlo con la API de criptografía.
 * @param {string} str - El string a convertir.
 * @returns {ArrayBuffer} El ArrayBuffer resultante.
 * @private
 */
function str2ab(str) {
    const buf = new ArrayBuffer(str.length * 2); // 2 bytes por carácter.
    const bufView = new Uint16Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

/**
 * Genera un hash SHA-256 para una contraseña combinada con un "salt".
 * @param {string} password - La contraseña a hashear.
 * @param {string} salt - El "salt" para añadir a la contraseña antes del hasheo.
 * @returns {Promise<string>} Una promesa que se resuelve con el hash en formato hexadecimal.
 * @private
 */
async function hashPassword(password, salt) {
    const passwordBuffer = str2ab(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Registra un nuevo usuario en el sistema.
 * @param {string} username - El nombre de usuario elegido.
 * @param {string} password - La contraseña del usuario.
 * @param {string} email - El correo electrónico del usuario.
 * @returns {Promise<object>} Un objeto con `success` (booleano) y `message` (string).
 */
export async function registerUser(username, password, email) {
    const users = readUsers();
 
    if (users[username]) {
        return { success: false, message: 'El nombre de usuario ya existe.' };
    }
 
    // Genera un "salt" aleatorio para este usuario.
    const salt = Math.random().toString(36).substring(2, 15);
 
    // Crea el hash de la contraseña con el salt.
    const hashedPassword = await hashPassword(password, salt);
 
    users[username] = {
        hash: hashedPassword, // Guarda el hash, no la contraseña.
        salt: salt,           // Guarda el salt para la verificación futura.
        email: email,
        favorites: []
    };
 
    writeUsers(users);
    return { success: true, message: 'Usuario registrado con éxito.' };
}

/**
 * Inicia la sesión de un usuario existente.
 * @param {string} username - El nombre de usuario.
 * @param {string} password - La contraseña para verificar.
 * @returns {Promise<object>} Un objeto con `success` (booleano) y `message` (string).
 */
export async function loginUser(username, password) {
    const users = readUsers();
    const user = users[username];
 
    if (!user) {
        return { success: false, message: 'Credenciales incorrectas.' };
    }
 
    // Verifica la contraseña hasheando la entrada con el salt guardado.
    const incomingHash = await hashPassword(password, user.salt);
    if (incomingHash !== user.hash) {
        return { success: false, message: 'Credenciales incorrectas.' };
    }
 
    // Si las credenciales son correctas, guarda el usuario actual.
    localStorage.setItem(CURRENT_USER_KEY, username);
    return { success: true, message: 'Inicio de sesión exitoso.' };
}

/**
 * Cierra la sesión del usuario actual.
 */
export function logoutUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
    // La redirección y la actualización de la UI se deben manejar donde se llama esta función.
}

/**
 * Obtiene el nombre del usuario que ha iniciado sesión.
 * @returns {string|null} El nombre de usuario o `null` si no hay nadie logueado.
 */
export function getCurrentUser() {
    return localStorage.getItem(CURRENT_USER_KEY);
}

/**
 * Comprueba si hay un usuario logueado.
 * @returns {boolean} `true` si un usuario ha iniciado sesión, `false` en caso contrario.
 */
export function isUserLoggedIn() {
    return getCurrentUser() !== null;
}

/**
 * Obtiene los datos completos de un usuario específico.
 * @param {string} username - El nombre del usuario a buscar.
 * @returns {object|null} El objeto de datos del usuario o `null` if the user does not exist.
 */
export function getUserData(username) {
    const users = readUsers();
    return users[username] || null;
}

/**
 * Actualiza los datos de un usuario específico.
 * @param {string} username - El nombre del usuario a actualizar.
 * @param {object} data - Un objeto con los campos a actualizar o añadir.
 */
export function updateUserData(username, data) {
    const users = readUsers();
    if (users[username]) {
        users[username] = { ...users[username], ...data };
        writeUsers(users);
    }
}