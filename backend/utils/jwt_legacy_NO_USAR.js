// utils/jwt.js
// Utilidades para firmar y verificar JWT en ZN98

const jwt = require("jsonwebtoken");

// Clave y expiración desde variables de entorno, con valores por defecto de desarrollo
const JWT_SECRET = process.env.JWT_SECRET || "cambia-esta-clave-en-produccion";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Firma un token JWT con el payload indicado.
 * @param {object} payload - Datos a guardar en el token (id, email, role, etc.)
 * @param {object} [options] - Opciones extras para jwt.sign
 * @returns {string} token JWT
 */
function signToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    ...options,
  });
}

/**
 * Verifica un token JWT y devuelve el payload decodificado.
 * Lanza error si el token es inválido o expiró.
 * @param {string} token
 * @returns {object} payload
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  signToken,
  verifyToken,
};
