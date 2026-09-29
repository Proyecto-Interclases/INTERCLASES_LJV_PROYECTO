function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  return next();
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).send('No tienes permisos para acceder a esta vista.');
    }

    return next();
  };
}

function esAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  if (req.session.user.role !== 'admin') {
    return res.redirect('/?error=No+tienes+permisos+para+acceder+al+panel+privado');
  }

  return next();
}

module.exports = { requireAuth, requireRole, esAdmin };
