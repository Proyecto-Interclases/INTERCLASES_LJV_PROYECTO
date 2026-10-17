const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const { listUsers, resetUserPassword } = require('../src/services/admin.service');

test('admin user listing selects safe account fields and never returns password', async () => {
  const originalFind = User.find;
  const userId = '507f1f77bcf86cd799439011';
  let selectedFields;

  User.find = (filter, projection) => {
    assert.deepEqual(filter, {});
    selectedFields = projection;
    return {
      sort(sort) {
        assert.deepEqual(sort, { creado_en: 1 });
        return this;
      },
      async lean() {
        return [{
          _id: { toString: () => userId },
          nombre: 'Ana Pérez',
          email: 'ana@example.com',
          role: 'student',
          creado_en: new Date('2026-01-01T00:00:00.000Z'),
          teamName: '5A'
        }];
      }
    };
  };

  try {
    const users = await listUsers();
    assert.match(selectedFields, /nombre email role creado_en activo teamName/);
    assert.doesNotMatch(selectedFields, /password/);
    assert.equal(users[0].id, userId);
    assert.equal(users[0].activo, true);
    assert.equal(Object.hasOwn(users[0], 'password'), false);
  } finally {
    User.find = originalFind;
  }
});

test('admin password reset stores a bcrypt hash and rejects weak passwords', async () => {
  const originalUpdateOne = User.updateOne;
  let update;
  User.updateOne = async (filter, values) => {
    update = { filter, values };
    return { matchedCount: 1 };
  };

  try {
    await resetUserPassword('507f1f77bcf86cd799439011', 'NuevaClave1!');
    assert.deepEqual(update.filter, { _id: '507f1f77bcf86cd799439011' });
    assert.equal(Object.hasOwn(update.values.$set, 'password'), true);
    assert.notEqual(update.values.$set.password, 'NuevaClave1!');
    assert.equal(await bcrypt.compare('NuevaClave1!', update.values.$set.password), true);
    await assert.rejects(
      resetUserPassword('507f1f77bcf86cd799439011', 'weakpass'),
      /mínimo 8 caracteres/
    );
    await assert.rejects(
      resetUserPassword('not-an-id', 'NuevaClave1!'),
      /no es válido/
    );
  } finally {
    User.updateOne = originalUpdateOne;
  }
});
