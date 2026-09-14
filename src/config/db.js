const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const envPath = path.resolve(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

if (process.env.DEBUG_ENV === 'true') {
  console.log('[env] Diagnóstico seguro:', {
    envPath,
    envExists: fs.existsSync(envPath),
    mongoUriDefined: Boolean(process.env.MONGO_URI),
    mongoUriProtocol: process.env.MONGO_URI?.split('://')[0] || null
  });
}

async function connectDB() {
  if (!process.env.MONGO_URI) {
    const error = new Error('MONGO_URI no está definido. Verifica que exista .env en la raíz del proyecto, junto a package.json y server.js.');
    console.error(error.message);
    throw error;
  }

  try {
    mongoose.set('bufferCommands', false);
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });

    console.log(`MongoDB conectado correctamente: ${connection.connection.host}/${connection.connection.name}`);
    return connection;
  } catch (error) {
    console.error('Error al conectar con MongoDB Atlas:', error);
    throw error;
  }
}

module.exports = { connectDB };
