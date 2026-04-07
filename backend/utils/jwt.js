// backend/utils/jwt.js
// DEPRECADO:
// Este archivo NO define una política JWT propia.
// Se mantiene únicamente por compatibilidad transitoria.
// La autoridad oficial de autenticación está en:
//   - backend/controllers/authController.js
//   - backend/middleware/auth.js
//
// No agregar lógica nueva acá.

const { signToken, verifyToken } = require("../middleware/auth");

let warned = false;

function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    "[DEPRECATION] backend/utils/jwt.js está deprecado. Usar backend/middleware/auth.js"
  );
}

function signAuthToken(user) {
  warnOnce();
  return signToken(user);
}

function verifyAuthToken(token) {
  warnOnce();
  return verifyToken(token);
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
};