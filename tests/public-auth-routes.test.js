const test = require('node:test');
const assert = require('node:assert/strict');

const webRoutes = require('../src/routes/web.routes');
const authController = require('../src/controllers/auth.controller');
const homeController = require('../src/controllers/home.controller');
const { requireEnrollmentAuth } = require('../src/middlewares/auth.middleware');

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

test('el formulario y el envío de inscripciones requieren autenticación', () => {
  assert.deepEqual(getRoute('/inscripciones', 'get'), [requireEnrollmentAuth, homeController.showEnrollments]);
  assert.deepEqual(getRoute('/inscripciones', 'post'), [requireEnrollmentAuth, homeController.submitEnrollment]);
});

test('el middleware de inscripciones explica el motivo de la redirección al login', () => {
  let redirectPath;
  let nextCalled = false;
  const response = { redirect: (path) => { redirectPath = path; } };

  requireEnrollmentAuth({ session: null }, response, () => { nextCalled = true; });
  assert.equal(redirectPath, '/login?error=registrate_para_inscribir');
  assert.equal(nextCalled, false);
});

test('el login muestra un mensaje claro para usuarios no autenticados al inscribir un equipo', () => {
  let renderedView;
  let renderedData;
  homeController.showLogin(
    { query: { error: 'registrate_para_inscribir' } },
    { render: (view, data) => { renderedView = view; renderedData = data; } }
  );

  assert.equal(renderedView, 'login');
  assert.equal(renderedData.error, 'Debes registrar e iniciar sesión antes de poder inscribir un equipo.');
});
