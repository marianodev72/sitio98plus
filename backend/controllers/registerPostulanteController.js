// backend/controllers/registerPostulanteController.js
// Registro público de POSTULANTE (pendiente aprobación institucional)

const bcrypt = require("bcryptjs");

let User = null;
try {
  ({ User } = require("../models/User"));
} catch {
  try {
    ({ User } = require("../models/user"));
  } catch {
    User = null;
  }
}

const { findMatriculaRecord } = require("../utils/matriculas");

function up(v) {
  return String(v || "").toUpperCase().trim();
}
function norm(v) {
  return String(v || "").trim();
}

// Mensajes institucionales (opacos, sin develar motivo)
const MSG_PENDIENTE =
  "Su solicitud ha sido recibida y se encuentra en etapa de evaluación. Será notificado una vez aprobada.";

const MSG_NO_PROCESABLE =
  "No es posible procesar su solicitud en este momento, intente mas tarde o comuníquese con el Administrador";

// ✅ Respuesta NO PROCESABLE (única)
function noProcesable(res) {
  return res.status(200).json({
    status: "NO_PROCESABLE",
    message: MSG_NO_PROCESABLE,
  });
}

// ✅ Respuesta PENDIENTE (creado correctamente)
function pendiente(res) {
  return res.status(200).json({
    status: "PENDIENTE",
    message: MSG_PENDIENTE,
  });
}

// Normalización simple para DNI (solo dígitos)
function normDni(v) {
  return String(v || "")
    .replace(/[^\d]/g, "")
    .trim();
}

// Permite controlar validación de nombre por env (por defecto OFF)
function boolEnv(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const s = String(raw).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function normName(s) {
  return up(s)
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function registerPostulante(req, res) {
  try {
    if (!User) {
      console.error("[registerPostulante] Modelo User no disponible");
      return noProcesable(res);
    }

    const body = req.body || {};
    const email = norm(body.email).toLowerCase();
    const matricula = norm(body.matricula);
    const nombre = norm(body.nombre);
    const apellido = norm(body.apellido);
    const password = String(body.password || "");
    const confirmarPassword = String(body.confirmarPassword || "");

    // ✅ DNI obligatorio (segundo factor)
    const dni = normDni(body.dni);

    // Opcional
    const grado = norm(body.grado);

    // Mínimos
    if (!email || !matricula || !nombre || !apellido || !dni || !password || !confirmarPassword) {
      console.warn("[registerPostulante] NO_PROCESABLE: campos obligatorios faltantes", {
        email: !!email,
        matricula: !!matricula,
        nombre: !!nombre,
        apellido: !!apellido,
        dni: !!dni,
        password: !!password,
        confirmarPassword: !!confirmarPassword,
      });
      return noProcesable(res);
    }

    if (password !== confirmarPassword) {
      console.warn("[registerPostulante] NO_PROCESABLE: passwords no coinciden");
      return noProcesable(res);
    }

    // 1) Validación institucional contra CSV (obligatoria)
    const record = findMatriculaRecord(matricula);
    if (!record) {
      console.warn("[registerPostulante] NO_PROCESABLE: matricula no encontrada", {
        matricula,
      });
      return noProcesable(res);
    }

    // 2) Validación DNI estricta (obligatoria)
    // Si el CSV no trae DNI para la matrícula, fallamos cerrado.
    const csvDni = normDni(record.dni);
    if (!csvDni) {
      console.warn("[registerPostulante] NO_PROCESABLE: csv sin dni para matricula", {
        matricula,
      });
      return noProcesable(res);
    }

    if (csvDni !== dni) {
      console.warn("[registerPostulante] NO_PROCESABLE: dni no coincide", {
        matricula,
        dniIngresado: dni,
        dniCsv: csvDni,
      });
      return noProcesable(res);
    }

    // 3) Validación extra opcional: grado (solo si viene y CSV lo trae)
    if (grado && record.grado && up(record.grado) !== up(grado)) {
      console.warn("[registerPostulante] NO_PROCESABLE: grado no coincide", {
        matricula,
        gradoIngresado: grado,
        gradoCsv: record.grado,
      });
      return noProcesable(res);
    }

    // 4) Validación nombre/apellido (opcional, tolera orden)
    const validateFullName = boolEnv("REG_VALIDATE_FULLNAME", false); // default OFF
    if (validateFullName && record.nombreApellido) {
      const csvFull = normName(record.nombreApellido);

      const fullNombreApellido = normName(`${nombre} ${apellido}`);
      const fullApellidoNombre = normName(`${apellido} ${nombre}`);

      const ok = csvFull === fullNombreApellido || csvFull === fullApellidoNombre;

      if (!ok) {
        console.warn("[registerPostulante] NO_PROCESABLE: nombre/apellido no coincide", {
          matricula,
          nombreIngresado: nombre,
          apellidoIngresado: apellido,
          nombreCsv: record.nombreApellido,
        });
        return noProcesable(res);
      }
    }

    // 5) No disclosure por existencia de email/matrícula
    const existente = await User.findOne({
      $or: [{ email }, { matricula }],
    }).lean();

    if (existente) {
      console.warn("[registerPostulante] NO_PROCESABLE: usuario existente", {
        email,
        matricula,
        existenteId: existente._id,
        existenteRole: existente.role,
        existenteActivo: existente.activo,
      });
      return noProcesable(res);
    }

    const hash = await bcrypt.hash(String(password), 10);

    console.warn("[registerPostulante] DEBUG antes de crear usuario", {
      email,
      matricula,
      dni,
      role: "PENDIENTE",
    });

    // ✅ Usuario creado como PENDIENTE e INACTIVO (pendiente aprobación ADMIN_GENERAL)
    await User.create({
      email,
      passwordHash: hash,
      role: "PENDIENTE",
      permisos: [],
      nombre,
      apellido,
      matricula,
      dni,
      activo: false,
      bloqueado: false,
      archivado: false,
      meta: {
        grado: grado || record.grado || "",
        origenRegistro: "FORM_PUBLICO",
      },
    });

    return pendiente(res);
  } catch (err) {
    console.error("[registerPostulante] Error:", err);
    return noProcesable(res);
  }
}

module.exports = {
  registerPostulante,
};