// backend/controllers/registerPostulanteController.js

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const User = require("../models/user");
const ROLES = require("../middleware/roles");

const MATRICULAS_CSV_PATH = path.join(
  __dirname,
  "../data/matriculas.csv"
);

// Carga matriculas autorizadas en un Set (en memoria)
function cargarMatriculasAutorizadas() {
  if (!fs.existsSync(MATRICULAS_CSV_PATH)) {
    console.error(
      "[REGISTER] No se encontró el archivo matriculas.csv en backend/data."
    );
    return new Set();
  }

  const contenido = fs.readFileSync(MATRICULAS_CSV_PATH, "utf8");
  const lineas = contenido.split(/\r?\n/);

  const set = new Set();
  for (const linea of lineas) {
    const limpia = linea.trim();
    if (!limpia) continue;

    // Soporta CSV tipo "MATRICULA;APELLIDO;NOMBRE;..."
    const [mat] = limpia.split(";");
    if (mat) {
      set.add(mat.trim().toUpperCase());
    }
  }

  return set;
}

// Validación de campos con express-validator
const validarRegistro = [
  body("email").isEmail().withMessage("Email inválido."),
  body("matricula")
    .trim()
    .notEmpty()
    .withMessage("La matrícula es obligatoria."),
  body("clave")
    .isLength({ min: 8 })
    .withMessage("La clave debe tener al menos 8 caracteres."),
  body("confirmarClave")
    .custom((value, { req }) => value === req.body.clave)
    .withMessage("Las claves no coinciden."),
];

// Handler principal
async function registerPostulante(req, res) {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({
        ok: false,
        msg: "Datos inválidos.",
        errors: errores.array(),
      });
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    const matricula = String(req.body.matricula || "").trim().toUpperCase();
    const clave = String(req.body.clave || "");

    // 1) Validar matrícula contra CSV
    const matriculasAutorizadas = cargarMatriculasAutorizadas();

    if (!matriculasAutorizadas.has(matricula)) {
      // Mensaje genérico, no filtramos más detalles
      return res.status(403).json({
        ok: false,
        msg: "NO AUTORIZADO EL REGISTRO",
      });
    }

    // 2) Verificar que el email no exista
    const existente = await User.findOne({ email });
    if (existente) {
      return res.status(400).json({
        ok: false,
        msg: "Ya existe un usuario registrado con ese correo.",
      });
    }

    // 3) Hashear la clave
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(clave, salt);

    // 4) Crear usuario con rol POSTULANTE
    const nuevoUsuario = new User({
      email,
      password: passwordHash,
      role: ROLES.POSTULANTE || "POSTULANTE",
      activo: true,
    });

    await nuevoUsuario.save();

    return res.status(201).json({
      ok: true,
      msg: "Registro exitoso. Ya puede iniciar sesión como POSTULANTE.",
    });
  } catch (err) {
    console.error("[REGISTER POSTULANTE] Error:", err);
    return res.status(500).json({
      ok: false,
      msg: "Error interno al registrar el usuario.",
    });
  }
}

module.exports = {
  validarRegistro,
  registerPostulante,
};
