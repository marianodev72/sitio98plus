// backend/controllers/estadoInstitucionalController.js
const mongoose = require("mongoose");
const { FormSubmission } = require("../models/FormSubmission");

function up(v) {
  return String(v || "").toUpperCase().trim();
}

function genericDenied(res) {
  return res.status(403).json({
    message:
      "La página solicitada no está disponible. Por favor, contacte al administrador.",
  });
}

function badRequest(res) {
  return res.status(400).json({ message: "Datos inválidos" });
}

function isObjectId(v) {
  return mongoose.Types.ObjectId.isValid(String(v || ""));
}

function allowedEstadosByCodigo(codigo) {
  const c = up(codigo);

  // Para arrancar: ANEXO_01 (postulación vivienda)
  if (c === "ANEXO_01") {
    return ["EN_REVISION", "APROBADA", "NO_APROBADA"];
  }

  // Si mañana agregamos ANEXO_21 por ejemplo:
  // if (c === "ANEXO_21") return ["EN_REVISION", "APROBADA", "NO_APROBADA"];

  return [];
}

/**
 * PATCH /api/formularios/:id/estado-institucional
 * Solo ADMIN_GENERAL (y si querés ADMIN también)
 * Body:
 * {
 *   "estadoInstitucional": "EN_REVISION" | "APROBADA" | "NO_APROBADA",
 *   "motivo": "texto opcional"
 * }
 */
async function setEstadoInstitucional(req, res) {
  try {
    const user = req.user;
    const role = up(user?.role);

    // Fail-closed: usuario o rol no determinable
    const esAdmin = role === "ADMIN_GENERAL" || role === "ADMIN";
    if (!user || !esAdmin) return genericDenied(res);

    const { id } = req.params;
    // Validación temprana de ID (evita lookup ambiguo)
    if (!isObjectId(id)) return genericDenied(res);

    const { estadoInstitucional, motivo } = req.body || {};
    const ei = up(estadoInstitucional);

    // Estado requerido
    if (!ei) return badRequest(res);

    const anexo = await FormSubmission.findById(id);
    // Opacidad: no distinguir inexistente / no autorizado
    if (!anexo) return genericDenied(res);

    const allowed = allowedEstadosByCodigo(anexo.codigo);
    if (!allowed.includes(ei)) return badRequest(res);

    // Set estadoInstitucional en el documento
    anexo.estadoInstitucional = ei;

    // Historial institucional
    anexo.datos = anexo.datos && typeof anexo.datos === "object" ? anexo.datos : {};
    anexo.datos._historialInstitucional = Array.isArray(anexo.datos._historialInstitucional)
      ? anexo.datos._historialInstitucional
      : [];

    anexo.datos._historialInstitucional.push({
      fecha: new Date().toISOString(),
      estadoInstitucional: ei,
      motivo: String(motivo || "").trim(),
      realizadoPor: String(user?._id || ""),
      rol: role,
    });

    await anexo.save();

    return res.json({ anexo: anexo.toObject() });
  } catch (e) {
    console.error("[ESTADO INSTITUCIONAL] Error:", e);
    return res.status(500).json({ message: "Error" });
  }
}

module.exports = {
  setEstadoInstitucional,
};
