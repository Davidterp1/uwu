const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001; // Usaremos un puerto diferente al de tu servidor de desarrollo principal
const DB_PATH = path.join(__dirname, 'users.json');
const JWT_SECRET = 'tu-secreto-super-secreto-cambiar-en-produccion'; // ¡Cambia esto por algo seguro!

// --- Middlewares ---
app.use(cors()); // Permite peticiones desde otros orígenes (tu frontend)
app.use(express.json()); // Permite al servidor entender JSON en el body de las peticiones

// --- Funciones de Ayuda para la "Base de Datos" ---

function readUsers() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({}));
    }
    const data = fs.readFileSync(DB_PATH);
    return JSON.parse(data);
}

function writeUsers(users) {
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

// --- Rutas de la API ---

/**
 * @route   POST /api/register
 * @desc    Registra un nuevo usuario
 */
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Todos los campos son requeridos.' });
    }

    const users = readUsers();

    if (users[username]) {
        return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
    }

    // Hashear la contraseña antes de guardarla
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    users[username] = {
        password: hashedPassword,
        email: email,
        favorites: [] // Inicializamos los favoritos
    };

    writeUsers(users);

    res.status(201).json({ message: 'Usuario registrado con éxito.' });
});

/**
 * @route   POST /api/login
 * @desc    Inicia sesión y devuelve un token JWT
 */
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
    }

    const users = readUsers();
    const user = users[username];

    if (!user) {
        return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    // Comparar la contraseña enviada con la hasheada en la "BD"
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    // Si las credenciales son correctas, creamos un token
    const payload = {
        user: {
            username: username
        }
    };

    jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: '1h' }, // El token expira en 1 hora
        (err, token) => {
            if (err) throw err;
            res.json({ token });
        }
    );
});


// --- Iniciar el servidor ---
app.listen(PORT, () => {
    console.log(`Servidor de autenticación corriendo en http://localhost:${PORT}`);
});