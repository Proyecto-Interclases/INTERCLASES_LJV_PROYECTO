const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { connectDB } = require('../config/db');
const User = require('../models/User');

async function seedAdminMongo() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB no está conectado. Ejecuta connectDB() antes del seed.');
  }

  const email = (process.env.ADMIN_EMAIL || 'anjelitoxk@gmail.com').toLowerCase();
  const name = process.env.ADMIN_NAME || 'Ángel Orlando Briceño Chacón';
  const password = process.env.ADMIN_PASSWORD || 'Admin12345*';
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    existingUser.role = 'admin';
    await existingUser.save();
    console.log(`Administrador verificado: ${existingUser.email}`);
    return existingUser;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = await User.create({
    nombre: name,
    email,
    password: hashedPassword,
    role: 'admin'
  });

  console.log(`Administrador creado: ${admin.email}`);
  return admin;
}

if (require.main === module) {
  require('dotenv').config();

  async function runSeedAdmin() {
    try {
      await connectDB();
      await seedAdminMongo();
    } catch (error) {
      console.error('Error al sembrar administrador:', error);
      process.exitCode = 1;
    } finally {
      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.disconnect();
        } catch (error) {
          console.error('No se pudo cerrar la conexión con MongoDB:', error);
          process.exitCode = 1;
        }
      }
    }
  }

  runSeedAdmin();
}

module.exports = seedAdminMongo;