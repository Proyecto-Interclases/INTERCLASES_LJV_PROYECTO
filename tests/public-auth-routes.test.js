const test = require('node:test');
const assert = require('node:assert/strict');

const webRoutes = require('../src/routes/web.routes');
const authController = require('../src/controllers/auth.controller');
const homeController = require('../src/controllers/home.controller');

function getRoute(path, method) {
  const layer = webRoutes.stack.find((entry) => (
    entry.route?.path === path && entry.route.methods[method]
  ));
  return layer ? layer.route.stack.map((handler) => handler.handle) : null;
}

test('registro y login son rutas públicas y ofrecen los alias clásicos de registro', () => {
  for (const path of ['/registro', '/register']) {
    assert.deepEqual(getRoute(path, 'get'), [homeController.showRegister]);
    assert.deepEqual(getRoute(path, 'post'), [authController.register]);
  }

  assert.deepEqual(getRoute('/login', 'get'), [homeController.showLogin]);
  assert.deepEqual(getRoute('/login', 'post'), [authController.login]);
});
