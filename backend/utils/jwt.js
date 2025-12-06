// utils/jwt.js
// Utilidades JWT para autenticación en ZN98 (RS256)

const jwt = require('jsonwebtoken');

// Las claves deben venir de variables de entorno
// JWT_PRIVATE_KEY y JWT_PUBLIC_KEY en formato PEM
// (si están con \n, las normalizamos)
function getPrivateKey() {
  const key = process.env.JWT_PRIVATE_KEY;
  if (!key) {
    throw new Error('JWT_PRIVATE_KEY no está definida en el entorno');
  }
  return key.replace(/\\n/g, '\n');
}

function getPublicKey() {
  const key = process.env.JWT_PUBLIC_KEY;
  if (!key) {
    throw new Error('JWT_PUBLIC_KEY no está definida en el entorno');
  }
  return key.replace(/\\n/g, '\n');
}

// Crea el token de autenticación para un usuario
function signAuthToken(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    matricula: user.matricula,
    email: user.email,
  };

  return jwt.sign(payload, getPrivateKey(), {
    algorithm: 'RS256',
    expiresIn: '1d', // 1 día, ajustable
  });
}

// Verifica un token y devuelve el payload
function verifyAuthToken(token) {
  return jwt.verify(token, getPublicKey(), {
    algorithms: ['RS256'],
  });
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
};
