const test = require('node:test');
const assert = require('node:assert/strict');
const { after, before } = require('node:test');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');

const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');
const { registerUser, loginUser } = require('../src/services/auth.service');

const testEmails = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({ email: { $in: testEmails } });
    await mongoose.disconnect();
  }
});

test('registerUser guarda un usuario y loginUser valida la contraseña', async () => {
  const email = `ana-${randomUUID()}@ejemplo.com`;
  testEmails.push(email);
  const user = await registerUser({
    name: 'Ana Ejemplo',
    email,
    password: 'PruebaSegura1!',
    role: 'student',
    teamName: 'Los Halcones'
  });

  assert.equal(user.name, 'Ana Ejemplo');
  assert.equal(user.role, 'student');
  assert.ok(user.id);

  const sessionUser = await loginUser({ email, password: 'PruebaSegura1!' });

  assert.equal(sessionUser.email, email);
  assert.equal(sessionUser.role, 'student');
});

test('loginUser infiere el rol desde la cuenta registrada', async () => {
  const email = `admin-${randomUUID()}@ejemplo.com`;
  testEmails.push(email);
  await registerUser({
    name: 'Admin Ejemplo',
    email,
    password: 'PruebaSegura1!',
    role: 'admin'
  });

  const sessionUser = await loginUser({ email, password: 'PruebaSegura1!' });

  assert.equal(sessionUser.role, 'admin');
});
