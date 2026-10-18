function authorize(req, res, next, allowedRoles) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  if (allowedRoles && !allowedRoles.includes(req.session.user.role)) {
    return res.status(403).send('No tienes permisos para acceder a esta vista.');
  }

  return next();
}

function requireAuth(req, res, next) {
  return authorize(req, res, next);
}

function requireEnrollmentAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login?error=registrate_para_inscribir');
  }
  return next();
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    return authorize(req, res, next, allowedRoles);
  };
}

function esAdmin(req, res, next) {
  return requireRole(['admin'])(req, res, next);
}

module.exports = { requireAuth, requireEnrollmentAuth, requireRole, esAdmin };
