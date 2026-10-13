const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

const { registerUser, loginUser } = require('../services/auth.service');
const User = require('../models/User');
const { createMailer } = require('../config/mailer');

function renderAuthPage(res, viewName, title, viewData = {}) {
  res.status(viewData.error ? 400 : 200).render(viewName, {
    title,
    error: viewData.error || null,
    formData: viewData.formData || {},
    success: viewData.success || null
  });
}

function setAuthenticatedUser(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);

      req.session.user = {
        id: user.id,
        name: user.name,
        nombre: user.name,
        email: user.email,
        role: user.role === 'admin' ? 'admin' : 'student',
        teamName: user.teamName
      };

      return resolve();
    });
  });
}

async function register(req, res) {
  try {
    if (req.body.password !== req.body.confirmPassword) {
      throw new Error('Las contraseñas no coinciden.');
    }

    const user = await registerUser({
      name: req.body.nombre,
      email: req.body.email,
      password: req.body.password,
      role: 'student'
    });

    await setAuthenticatedUser(req, user);

    return res.redirect(user.role === 'admin' ? '/admin' : '/');
  } catch (error) {
    return renderAuthPage(res, 'register', 'Registro | Interclases LJV', {
      error: error.message,
      formData: req.body
    });
  }
}

async function login(req, res) {
  try {
    const user = await loginUser({
      email: req.body.email,
      password: req.body.password
    });

    await setAuthenticatedUser(req, user);

    return res.redirect(user.role === 'admin' ? '/admin' : '/');
  } catch (error) {
    return renderAuthPage(res, 'login', 'Iniciar sesión | Interclases LJV', {
      error: error.message,
      formData: req.body
    });
  }
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('connect.sid');
    return res.redirect('/login');
  });
}

function showForgotPassword(req, res) {
  return res.render('forgot-password', {
    title: 'Recuperar contraseña | Interclases LJV',
    error: null,
    success: null,
    formData: {}
  });
}

async function forgotPassword(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const genericMessage = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

  try {
    if (!email) {
      throw new Error('Ingresa tu correo electrónico.');
    }

    const user = await User.findOne({ email });

    if (user) {
      const token = crypto.randomBytes(20).toString('hex');
      user.resetPasswordToken = token;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const mailer = createMailer();
      const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
      const resetUrl = `${baseUrl}/reset-password/${token}`;

      await mailer.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Restablece tu contraseña | Interclases LJV',
        text: `Restablece tu contraseña usando este enlace: ${resetUrl}. El enlace vence en una hora.`,
        html: `<p>Solicitaste restablecer tu contraseña.</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>Este enlace vence en una hora.</p>`
      });
    }

    return res.render('forgot-password', {
      title: 'Recuperar contraseña | Interclases LJV',
      error: null,
      success: genericMessage,
      formData: { email }
    });
  } catch (error) {
    return res.status(400).render('forgot-password', {
      title: 'Recuperar contraseña | Interclases LJV',
      error: error.message,
      success: null,
      formData: { email }
    });
  }
}

async function showResetPassword(req, res) {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!user) {
    return res.status(400).render('reset-password', {
      title: 'Restablecer contraseña | Interclases LJV',
      error: 'El enlace no es válido o ya venció.',
      success: null,
      token: null
    });
  }

  return res.render('reset-password', {
    title: 'Restablecer contraseña | Interclases LJV',
    error: null,
    success: null,
    token: req.params.token
  });
}

async function resetPassword(req, res) {
  try {
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    if (password !== confirmPassword) {
      throw new Error('Las contraseñas no coinciden.');
    }

    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      throw new Error('La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial.');
    }

    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('El enlace no es válido o ya venció.');
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.redirect('/login?success=Contraseña+actualizada+correctamente');
  } catch (error) {
    return res.status(400).render('reset-password', {
      title: 'Restablecer contraseña | Interclases LJV',
      error: error.message,
      success: null,
      token: req.params.token
    });
  }
}

module.exports = {
  register,
  login,
  logout,
  showForgotPassword,
  forgotPassword,
  showResetPassword,
  resetPassword
};
