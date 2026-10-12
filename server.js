require('dotenv').config();

// Carga las variables definidas en el archivo .env antes de importar módulos locales.

// Importa la funcion de Node.js que permite ejecutar comandos del sistema.
const { exec } = require('child_process');
// Importa la aplicacion Express configurada en la capa principal.
const { connectDB } = require('./src/config/db');

// Obtiene el puerto del entorno o utiliza el puerto 3000 por defecto.
const PORT = process.env.PORT || 3000;
// Construye la direccion que se mostrara y abrira en el navegador.
const URL = process.env.APP_URL || `http://localhost:${PORT}`;

// Define una funcion para abrir automaticamente la pagina principal.
function openBrowser(url) {
  // Abrir un navegador es sólo una comodidad local y nunca se hace por defecto.
  if (process.env.OPEN_BROWSER !== 'true') return;

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
  exec(command, (error) => {
    if (error) console.warn('No se pudo abrir el navegador automáticamente:', error.message);
  });
}

async function startServer() {
  try {
    await connectDB();
    const app = require('./src/app');

    // Inicia el servidor únicamente después de conectar con MongoDB.
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
