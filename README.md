# LJV Interclases

Sitio web oficial del torneo deportivo institucional de la Institución Educativa Lucrecio Jaramillo Vélez. Permite consultar la programación y los resultados, conocer los equipos participantes y administrar el contenido del torneo.

**Tecnologías:** Node.js, Express 5, EJS, MongoDB, Mongoose y Multer.

## Características

- Sitio público adaptable a móviles y escritorio.
- Calendario de partidos y resultados.
- Tabla de posiciones calculada automáticamente a partir de los partidos finalizados.
- Listado de equipos, plantillas y goleadores.
- Carrusel de fotografías administrable.
- Panel de administración protegido por inicio de sesión y rol de administrador.
- Recuperación de contraseña por correo (requiere configurar SMTP).
- Sesiones almacenadas en MongoDB para mantenerlas entre reinicios y ejecuciones en varias instancias.
- Calendario, posiciones y plantillas separados por fútbol, baloncesto y voleibol; solicitudes públicas de inscripción moderadas por administración.

## Requisitos previos

- Node.js 20.8 o posterior y npm.
- Una base de datos MongoDB Atlas con acceso de red habilitado para el servicio que ejecutará la aplicación.

## Instalación y ejecución local

1. Clona el repositorio y entra en la carpeta:

   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd INTERCLASES_LJV_PROYECTO
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Crea `.env` a partir de la plantilla:

   En PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   En macOS o Linux:

   ```bash
   cp .env.example .env
   ```

4. Edita `.env` y reemplaza `MONGO_URI` por la URI de conexión de MongoDB Atlas. Genera un secreto de sesión criptográficamente aleatorio:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Pega el resultado en `SESSION_SECRET`. Debe tener al menos 32 caracteres. No compartas ni publiques el archivo `.env`; Git lo ignora.

5. Crea el primer administrador una sola vez. Proporciona `ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD` como variables de entorno y ejecuta:

   ```bash
   npm run seed:admin
   ```

   Usa una contraseña única y segura. El servidor ya no crea ni vuelve a promover cuentas de administrador automáticamente al arrancar.

6. Para cargar los equipos oficiales de Mundialito 2026, primero verifica que `MONGO_URI` apunte a la base correcta y que exista una copia de seguridad. El seed borra todos los equipos, jugadores y partidos, y limpia las asignaciones `teamName` de las cuentas; conserva las cuentas y los demás datos. La carga sólo se ejecuta con la confirmación explícita:

   ```bash
   npm run seed:mundialito -- --confirm-reset
   ```

   No ejecutes este comando si necesitas conservar plantillas o historial de partidos.

7. Inicia la aplicación:

   ```bash
   npm run dev
   ```

   Para iniciarla sin el modo de desarrollo:

   ```bash
   npm start
   ```

   Abre `http://localhost:3000`. El puerto local predeterminado es `3000`; si se define `PORT`, la aplicación usa ese valor.

## Variables de entorno

La plantilla `.env.example` incluye sólo las variables base:

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP. Las plataformas suelen asignarlo automáticamente. |
| `MONGO_URI` | URI privada de conexión a MongoDB Atlas. |
| `MONGO_URI_DIRECT` | URI opcional `mongodb://` con los nodos de Atlas; se intenta sólo si la URI `mongodb+srv://` falla por DNS o conexión rechazada. |
| `SESSION_SECRET` | Secreto aleatorio de al menos 32 caracteres para firmar sesiones. |

Configura `MONGO_URI_DIRECT` sólo con la URI estándar nodo a nodo que proporciona Atlas, y mantenla privada igual que `MONGO_URI`. Si ambas conexiones fallan por DNS, prueba servidores DNS de Google (8.8.8.8) o una red no restringida; verifica también la lista de acceso de IP de Atlas. Para crear el administrador se usan `ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD` al ejecutar `npm run seed:admin`; no son necesarias para cada arranque. Para habilitar la recuperación por correo, configura además `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` y `APP_URL`. En producción, define `NODE_ENV=production`.

## Despliegue en Render o Railway

1. Sube el repositorio a GitHub sin incluir `.env` ni credenciales.
2. Crea un servicio web Node.js en Render o Railway y conecta el repositorio.
3. Configura:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Node.js:** versión 20.8 o posterior
4. En el panel de variables de entorno del servicio, define `MONGO_URI`, `SESSION_SECRET` y `NODE_ENV=production`. No es necesario fijar `PORT` si la plataforma lo proporciona.
5. En MongoDB Atlas, permite las conexiones desde el servicio desplegado y verifica que la URI y el usuario de base de datos sean correctos.
6. Crea el administrador una sola vez desde el entorno del servicio: define temporalmente `ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD`, ejecuta `npm run seed:admin` (consola/shell del servicio o una ejecución puntual) y elimina `ADMIN_PASSWORD` del entorno cuando termine si ya no lo necesitas.
7. Comprueba la URL pública, el inicio de sesión y las rutas del sitio. Si habilitas recuperación de contraseña, configura las variables SMTP y `APP_URL` con la URL HTTPS pública.

La aplicación configura cookies seguras detrás del proxy HTTPS y guarda las sesiones en MongoDB. Las imágenes que se suben se escriben en `src/public/uploads/galeria`, `src/public/uploads/anuncios` y `src/public/uploads/jugadores`; los sistemas de archivos de muchos servicios en la nube son efímeros. Para conservarlas después de un redeploy, monta un volumen persistente en esas carpetas o integra un servicio de almacenamiento de objetos. Sin ello, las imágenes cargadas localmente pueden perderse al recrear la instancia.

## Rutas útiles

- `/` — página principal.
- `/calendario` — calendario y resultados.
- `/posiciones` — tabla de posiciones.
- `/equipos` — equipos y goleadores.
- `/inscripciones` — formulario público disponible cuando las inscripciones globales están abiertas.
- `/admin` — panel de administración (requiere cuenta de administrador).
- `/api/equipos` y `/api/partidos` — datos JSON públicos.

## Deportes e inscripción

Las inscripciones comienzan cerradas. Un administrador puede abrirlas o cerrarlas desde el interruptor global de **Panel → Inscripciones**; cuando están abiertas, los estudiantes pueden elegir fútbol, baloncesto o voleibol. El estado se guarda en `TournamentConfig` y los tres deportes están habilitados por defecto. Si aún no existe esa configuración global, el sistema conserva la disponibilidad anterior considerando abiertas las inscripciones si había algún deporte abierto. Las solicitudes públicas no crean cuentas ni capitanes; al aprobar una solicitud se crea el equipo y su plantilla. Los equipos y partidos antiguos se consideran fútbol aunque todavía no tengan `deporte`.

Después de respaldar la base correcta, revisa la cantidad de registros que el script migrará. El modo predeterminado no conecta con MongoDB. Sólo ejecuta la migración con las dos confirmaciones explícitas:

```bash
npm run migrate:sports -- --apply --confirm-safe-migration
```

El script asigna `deporte: "futbol"` únicamente a equipos/partidos sin deporte y crea disponibilidades cerradas sólo cuando aún no existen; conserva cualquier disponibilidad ya configurada y no elimina ni reemplaza documentos. También puedes aplicar manualmente esas operaciones `$set` / `$setOnInsert` después de una copia de seguridad. No ejecutes el seed de Mundialito como migración: ese seed reinicia datos del torneo.

### Importar fotos de jugadores desde un ZIP

El importador acepta un ZIP organizado como `equipo/nombre del jugador.png` (también JPG y WebP), normaliza acentos, mayúsculas y puntuación, y exige coincidencia tanto del nombre del equipo como del jugador. El comando no se ejecuta al iniciar la aplicación. Primero revisa que `.env` apunte a la base de datos correcta y ejecuta el modo de simulación:

```powershell
npm run import:player-photos -- --zip "C:\Users\annje\Downloads\ANGEL\PROYECTO_INTERCLASES\IMAGENES TARJETAS\EQUIPOS FOTOS POR NOMBRE\fotos_por_equipo.zip"
```

La simulación lee los jugadores para comprobar las coincidencias, pero no escribe imágenes ni cambia documentos; informa los archivos sin coincidencia, ambiguos o inválidos. Verifica la salida y respalda la base antes de volver a ejecutar con `--apply` para guardar las fotos administradas en `src/public/uploads/jugadores` y actualizar `Player.fotoUrl`:

```powershell
npm run import:player-photos -- --zip "C:\Users\annje\Downloads\ANGEL\PROYECTO_INTERCLASES\IMAGENES TARJETAS\EQUIPOS FOTOS POR NOMBRE\fotos_por_equipo.zip" --apply
```

La importación no realiza detección de rostros ni altera el archivo de imagen. Las tarjetas presentan las fotos en un recuadro cuadrado con recorte visual centrado (`object-fit: cover`); revisa manualmente los retratos que necesiten otro encuadre.

## Pruebas

```bash
npm test
```

Las pruebas de autenticación y gestión requieren una base MongoDB configurada mediante `.env`.
