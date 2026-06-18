// backend/controllers/registerPostulanteController.js
// Registro público de POSTULANTE (pendiente aprobación institucional)

const bcrypt = require("bcryptjs");

let User = null;
try {
  ({ User } = require("../models/user"));
} catch {
  try {
    ({ User } = require("../models/user"));
  } catch {
    User = null;
  }
}

const { findMatriculaRecord } = require("../utils/matriculas");
const { findPadronRecord } = require("../services/padronPersonal/padronPersonalLocalStore");

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

// Respuesta NO PROCESABLE (única)
function noProcesable(res) {
  return res.status(200).json({
    status: "NO_PROCESABLE",
    message: MSG_NO_PROCESABLE,
  });
}

// Respuesta PENDIENTE (creado correctamente)
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

function padronSource() {
  const source = String(process.env.REGISTRO_PADRON_SOURCE || "csv").toLowerCase().trim();
  if (["csv", "local", "local_with_csv_fallback"].includes(source)) return source;
  return "csv";
}

function recordFromCsv(matricula, dni) {
  const record = findMatriculaRecord(matricula);
  if (!record) return { ok: false, reason: "REGISTRO_PADRON_NO_ENCONTRADO" };
  const csvDni = normDni(record.dni);
  if (!csvDni) return { ok: false, reason: "REGISTRO_PADRON_SOURCE_UNAVAILABLE" };
  if (csvDni !== dni) return { ok: false, reason: "REGISTRO_DNI_NO_COINCIDE" };
  return { ok: true, reason: "REGISTRO_OK_CSV", record };
}

function recordFromLocal(matricula, dni) {
  try {
    return findPadronRecord({ matricula, dni });
  } catch (err) {
    return { ok: false, reason: "REGISTRO_PADRON_SOURCE_UNAVAILABLE", code: err.code || "PADRON_LOCAL_ERROR" };
  }
}

function findRegistroRecord(matricula, dni) {
  const source = padronSource();
  if (source === "local") return recordFromLocal(matricula, dni);
  if (source === "local_with_csv_fallback") {
    const local = recordFromLocal(matricula, dni);
    if (local.ok) return local;
    if (!["REGISTRO_PADRON_NO_ENCONTRADO", "REGISTRO_PADRON_SOURCE_UNAVAILABLE"].includes(local.reason)) {
      return local;
    }
    const csv = recordFromCsv(matricula, dni);
    return csv.ok ? { ...csv, fallback: true } : local;
  }
  return recordFromCsv(matricula, dni);
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

    // DNI obligatorio (segundo factor)
    const dni = normDni(body.dni);

    // Opcional
    const grado = norm(body.grado);

    // Mínimos
    if (!email || !matricula || !nombre || !apellido || !dni || !password || !confirmarPassword) {
      return noProcesable(res);
    }

    if (password !== confirmarPassword) {
      return noProcesable(res);
    }

    // 1) Validacion institucional contra fuente configurable.
    const lookup = findRegistroRecord(matricula, dni);
    if (!lookup.ok) {
      return noProcesable(res);
    }
    const record = lookup.record;
    // 2) Validación extra opcional: grado (solo si viene y la fuente lo trae)
    if (grado && record.grado && up(record.grado) !== up(grado)) {
      return noProcesable(res);
    }

    // 3) Validación nombre/apellido (opcional, tolera orden)
    const validateFullName = boolEnv("REG_VALIDATE_FULLNAME", false); // default OFF
    if (validateFullName && record.nombreApellido) {
      const csvFull = normName(record.nombreApellido);

      const fullNombreApellido = normName(`${nombre} ${apellido}`);
      const fullApellidoNombre = normName(`${apellido} ${nombre}`);

      const ok = csvFull === fullNombreApellido || csvFull === fullApellidoNombre;

      if (!ok) {
        return noProcesable(res);
      }
    }

    // 4) No disclosure por existencia de email/matrícula
    const existente = await User.findOne({
      $or: [{ email }, { matricula }],
    }).lean();

    if (existente) {
      return noProcesable(res);
    }

    const hash = await bcrypt.hash(String(password), 10);

    // Usuario creado como POSTULANTE pero INACTIVO (pendiente aprobación ADMIN_GENERAL)
    await User.create({
      email,
      passwordHash: hash,
      role: "POSTULANTE",
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
        padronSource: padronSource(),
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
