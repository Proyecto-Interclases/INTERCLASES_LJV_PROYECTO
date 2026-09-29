require('dotenv').config();

// Carga las variables definidas en el archivo .env antes de importar módulos locales.

// Importa la funcion de Node.js que permite ejecutar comandos del sistema.
const { exec } = require('child_process');
// Importa la aplicacion Express configurada en la capa principal.
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const seedAdminMongo = require('./src/seeds/seedAdminMongo');

// Obtiene el puerto del entorno o utiliza el puerto 3000 por defecto.
const PORT = process.env.PORT || 3000;
// Construye la direccion que se mostrara y abrira en el navegador.
const URL = `http://localhost:${PORT}`;

// Define una funcion para abrir automaticamente la pagina principal.
function openBrowser(url) {
  // Permite desactivar la apertura automatica mediante OPEN_BROWSER=false.
  if (process.env.OPEN_BROWSER === 'false') return;

  // Selecciona el comando adecuado segun el sistema operativo.
  const command = process.platform === 'win32'
    // Usa start en Windows.
    ? `start "" "${url}"`
    // Usa open en macOS.
    : process.platform === 'darwin'
      ? `open "${url}"`
      // Usa xdg-open en Linux.
      : `xdg-open "${url}"`;

  // Ejecuta el comando para abrir la URL en el navegador predeterminado.
  exec(command);
}

async function startServer() {
  try {
    await connectDB();
    await seedAdminMongo();

    // Inicia el servidor únicamente después de conectar y sembrar el administrador.
    app.listen(PORT, () => {
      console.log(`Servidor LJV ejecutandose en ${URL}`);
      openBrowser(URL);
    });
  } catch (error) {
    console.error('No fue posible iniciar el servidor:', error);
    process.exitCode = 1;
  }
}

startServer();
