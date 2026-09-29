require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { connectDB } = require('../config/db');
const User = require('../models/User');

const ADMIN_EMAIL = 'anjelitoxk@gmail.com';
const NEW_PASSWORD = process.env.NEW_ADMIN_PASSWORD;

async function changePassword() {
  if (!NEW_PASSWORD || !/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(NEW_PASSWORD)) {
    throw new Error('Define NEW_ADMIN_PASSWORD con al menos 8 caracteres, una mayúscula, un número y un carácter especial.');
  }

  await connectDB();

  const user = await User.findOne({ email: ADMIN_EMAIL });

  if (!user) {
    throw new Error(`No existe un usuario con el correo ${ADMIN_EMAIL}.`);
  }
  if (user.role !== 'admin') {
    throw new Error(`La cuenta ${ADMIN_EMAIL} no tiene rol de administrador.`);
  }

  user.password = await bcrypt.hash(NEW_PASSWORD, 10);
  await user.save();

  console.log(`Contraseña actualizada correctamente para ${user.email}.`);
}

changePassword()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('No se pudo cambiar la contraseña:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  });