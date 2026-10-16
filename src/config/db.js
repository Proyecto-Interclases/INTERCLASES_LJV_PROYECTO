const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const envPath = path.resolve(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const CONNECTION_OPTIONS = {
  connectTimeoutMS: 5000,
  serverSelectionTimeoutMS: 8000,
  retryReads: true,
  retryWrites: true
};
const DNS_OR_REFUSED_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ESERVFAIL',
  'ETIMEOUT'
]);

if (process.env.DEBUG_ENV === 'true') {
  console.log('[env] Diagnóstico seguro:', {
    envPath,
    envExists: fs.existsSync(envPath),
    mongoUriDefined: Boolean(process.env.MONGO_URI),
    mongoUriProtocol: process.env.MONGO_URI?.split('://')[0] || null
  });
}

function isDnsOrRefusedError(error, seen = new Set()) {
  if (!error || typeof error !== 'object' || seen.has(error)) return false;
  seen.add(error);

  if (DNS_OR_REFUSED_ERROR_CODES.has(error.code)) return true;
  if (/query(?:srv|txt)|dns|econnrefused|enotfound|eai_again|eservfail/i.test(error.message || '')) return true;

  const nestedErrors = [
    error.cause,
    error.reason,
    error.originalError,
    ...(Array.isArray(error.errors) ? error.errors : [])
  ];
  return nestedErrors.some((nestedError) => isDnsOrRefusedError(nestedError, seen));
}

function getMongoErrorSummary(error) {
  const code = error?.code ? ` (${error.code})` : '';
  return `${error?.name || 'Error'}${code}: ${error?.message || 'Error sin detalle'}`.replace(
    /mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi,
    '[URI MongoDB oculta]'
  );
}

async function connectDB() {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    const error = new Error('Falta MONGO_URI. Verifica que el archivo .env exista en la raíz del proyecto, junto a package.json y server.js.');
    console.error(error.message);
    throw error;
  }

  try {
    mongoose.set('bufferCommands', false);
    try {
      const connection = await mongoose.connect(mongoUri, CONNECTION_OPTIONS);
      console.log(`MongoDB conectado correctamente: ${connection.connection.host}/${connection.connection.name}`);
      return connection;
    } catch (primaryError) {
      const directUri = process.env.MONGO_URI_DIRECT?.trim();
      const canUseDirectUri = mongoUri.startsWith('mongodb+srv://')
        && directUri
        && directUri.startsWith('mongodb://')
        && isDnsOrRefusedError(primaryError);

      if (canUseDirectUri) {
        console.warn('No se pudo resolver o alcanzar MongoDB Atlas mediante la URI SRV.');
        console.warn('Se intentará conectar con MONGO_URI_DIRECT usando la URI nodo a nodo configurada.');
        try {
          const connection = await mongoose.connect(directUri, CONNECTION_OPTIONS);
          console.log(`MongoDB conectado mediante URI directa: ${connection.connection.host}/${connection.connection.name}`);
          return connection;
        } catch (directError) {
          console.error('Fallaron tanto la conexión SRV como la conexión directa a MongoDB.');
          console.error('Error de la conexión directa:', getMongoErrorSummary(directError));
          console.error('Comprueba MONGO_URI_DIRECT, la lista de acceso de IP de Atlas y la conectividad de red.');
          console.error('Si la red bloquea las consultas DNS, prueba servidores DNS de Google (8.8.8.8) o conéctate a una red no restringida.');
          throw directError;
        }
      }

      if (mongoUri.startsWith('mongodb+srv://') && isDnsOrRefusedError(primaryError)) {
        console.error('No se pudo resolver la URI mongodb+srv:// y no hay una MONGO_URI_DIRECT válida configurada.');
        console.error('Configura MONGO_URI_DIRECT con una URI mongodb:// nodo a nodo de Atlas, verifica la red o prueba DNS de Google (8.8.8.8).');
      }
      throw primaryError;
    }
  } catch (error) {
    console.error('Error al conectar con MongoDB Atlas:', getMongoErrorSummary(error));
    throw error;
  }
}

module.exports = { connectDB };
