// middleware/auth.js
// Autenticación y autorización centralizada — Sistema ZN98

const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

const TOKEN_COOKIE_NAME = 'zn98_token';

// Claves RSA (RS256)
// En producción deben venir de variables de entorno y estar FUERA del repo.
const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;

if (!JWT_PRIVATE_KEY || !JWT_PUBLIC_KEY) {
  console.warn(
    '[auth] JWT_PRIVATE_KEY o JWT_PUBLIC_KEY no están definidas en variables de entorno.'
  );
}

// Opciones de cookie — en producción ajustamos Secure y SameSite.
function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction, // true en producción (HTTPS)
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/', // cookie válida para toda la app
  };
}

// Firma un token JWT para un usuario
function signToken(user) {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    activo: user.activo,
  };

  return jwt.sign(payload, JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: '1h',
  });
}

// Setea cookie de autenticación
function setAuthCookie(res, token) {
  res.cookie(TOKEN_COOKIE_NAME, token, getCookieOptions());
}

// Limpia cookie de autenticación
function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE_NAME, getCookieOptions());
}

// Middleware: requiere usuario autenticado
async function authRequired(req, res, next) {
  try {
    const tokenFromCookie = req.cookies?.[TOKEN_COOKIE_NAME];
    const authHeader = req.headers.authorization;
    let token = tokenFromCookie;

    // Permite opcionalmente "Bearer <token>" por header
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'No autenticado.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ['RS256'] });
    } catch (err) {
      return res.status(401).json({ message: 'Token inválido o expirado.' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado.' });
    }

    if (!user.activo || user.bloqueado) {
      return res
        .status(403)
        .json({ message: 'Usuario inactivo o bloqueado.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[authRequired] Error:', err);
    res.status(500).json({ message: 'Error en autenticación.' });
  }
}

// Middleware: requiere uno de los roles indicados
function requireRole(...rolesPermitidos) {
  const rolesNormalizados = rolesPermitidos.map((r) => r.toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }

    const roleUsuario = (req.user.role || '').toUpperCase();

    if (!rolesNormalizados.includes(roleUsuario)) {
      return res.status(403).json({ message: 'Acceso denegado.' });
    }

    next();
  };
}

module.exports = {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  authRequired,
  requireRole,
  TOKEN_COOKIE_NAME,
};
