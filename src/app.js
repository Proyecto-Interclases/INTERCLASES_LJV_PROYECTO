// Importa Express para crear y configurar el servidor web.
const express = require('express');
// Importa path para construir rutas compatibles con el sistema operativo.
const path = require('path');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const mongoose = require('mongoose');
// Importa las rutas que renderizan las paginas web.
const webRoutes = require('./routes/web.routes');
// Importa las rutas que devuelven datos en formato JSON.
const apiRoutes = require('./routes/api.routes');
const adminRoutes = require('./routes/admin.routes');
// Importa el middleware global para manejar errores.
const errorHandler = require('./middlewares/error-handler');

// Crea la instancia principal de la aplicacion Express.
const app = express();
const sessionSecret = String(process.env.SESSION_SECRET || '').trim();
const mongoUri = String(process.env.MONGO_URI || '').trim();

if (sessionSecret.length < 32 || /^CAMBIA_/i.test(sessionSecret)) {
  throw new Error('Configura SESSION_SECRET con al menos 32 caracteres aleatorios antes de iniciar la aplicación.');
}
if (!mongoUri) {
  throw new Error('MONGO_URI es obligatorio para iniciar la aplicación.');
}
if (mongoose.connection.readyState !== 1) {
  throw new Error('MongoDB debe estar conectado antes de iniciar la aplicación.');
}

// Indica que las vistas utilizaran plantillas EJS.
app.set('view engine', 'ejs');
// Define la carpeta donde se encuentran las vistas.
app.set('views', path.join(__dirname, 'views'));

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(session({
  secret: sessionSecret,
  store: MongoStore.create({
    clientPromise: Promise.resolve(mongoose.connection.getClient()),
    collectionName: 'sessions',
    ttl: 60 * 60 * 8,
    autoRemove: 'native'
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Permite recibir solicitudes con cuerpos JSON.
app.use(express.json());
// Permite recibir datos enviados desde formularios HTML.
app.use(express.urlencoded({ extended: true }));
// Publica archivos estaticos como CSS, imagenes y JavaScript del navegador.
app.use(express.static(path.join(__dirname, 'public')));

// Registra las rutas de las paginas web desde la raiz del sitio.
app.use('/admin', adminRoutes);
app.use('/', webRoutes);
// Registra las rutas de la API con el prefijo /api.
app.use('/api', apiRoutes);

// Responde cuando ninguna ruta registrada coincide con la solicitud.
app.use((req, res) => {
  // Devuelve el codigo HTTP 404 y un mensaje en JSON.
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Registra el middleware que procesa los errores de la aplicacion.
app.use(errorHandler);

// Exporta la aplicacion para utilizarla desde server.js y las pruebas.
module.exports = app;
