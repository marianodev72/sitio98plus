// utils/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const NODE_ENV = process.env.NODE_ENV || 'development';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function setAuthCookie(res, token) {
  const isProd = NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,     // en prod debe ir detrás de HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie('token', { path: '/' });
}

function authRequired(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'No autenticado' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'No autenticado' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ message: 'No autorizado' });
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
};
