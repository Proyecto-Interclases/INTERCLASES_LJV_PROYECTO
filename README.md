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
| `SESSION_SECRET` | Secreto aleatorio de al menos 32 caracteres para firmar sesiones. |

Para crear el administrador se usan `ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD` al ejecutar `npm run seed:admin`; no son necesarias para cada arranque. Para habilitar la recuperación por correo, configura además `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` y `APP_URL`. En producción, define `NODE_ENV=production`.

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

La aplicación configura cookies seguras detrás del proxy HTTPS y guarda las sesiones en MongoDB. Las imágenes que se suben se escriben en `src/public/uploads/galeria` y `src/public/uploads/anuncios`; los sistemas de archivos de muchos servicios en la nube son efímeros. Para conservarlas después de un redeploy, monta un volumen persistente en esas carpetas o integra un servicio de almacenamiento de objetos. Sin ello, las imágenes cargadas localmente pueden perderse al recrear la instancia.

## Rutas útiles

- `/` — página principal.
- `/calendario` — calendario y resultados.
- `/posiciones` — tabla de posiciones.
- `/equipos` — equipos y goleadores.
- `/inscripciones` — formulario público disponible cuando haya al menos un deporte abierto.
- `/admin` — panel de administración (requiere cuenta de administrador).
- `/api/equipos` y `/api/partidos` — datos JSON públicos.

## Deportes e inscripción

Las inscripciones comienzan cerradas para fútbol, baloncesto y voleibol. Un administrador puede abrir/cerrar cada deporte desde **Panel → Inscripciones**. Las solicitudes públicas no crean cuentas ni capitanes; al aprobar una solicitud se crea el equipo y su plantilla. Los equipos y partidos antiguos se consideran fútbol aunque todavía no tengan `deporte`.

Después de respaldar la base correcta, revisa la cantidad de registros que el script migrará. El modo predeterminado no conecta con MongoDB. Sólo ejecuta la migración con las dos confirmaciones explícitas:

```bash
npm run migrate:sports -- --apply --confirm-safe-migration
```

El script asigna `deporte: "futbol"` únicamente a equipos/partidos sin deporte y crea disponibilidades cerradas sólo cuando aún no existen; conserva cualquier disponibilidad ya configurada y no elimina ni reemplaza documentos. También puedes aplicar manualmente esas operaciones `$set` / `$setOnInsert` después de una copia de seguridad. No ejecutes el seed de Mundialito como migración: ese seed reinicia datos del torneo.

## Pruebas

```bash
npm test
```

Las pruebas de autenticación y gestión requieren una base MongoDB configurada mediante `.env`.
