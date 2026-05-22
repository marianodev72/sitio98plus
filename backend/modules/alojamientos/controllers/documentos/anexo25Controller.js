const anexo25Service = require("../../services/documentos/anexo25Service");
const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const mongoose = require("mongoose");
const {
  puedeVerDocumentoPorTerritorio,
} = require("../../services/documentos/alojamientoDocumentoVisibilityService");

function deny(res) {
  return res.status(404).json({
    ok: false,
    error: "No es posible procesar la solicitud.",
  });
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function isInspectorAlojamientosRoleOrPerm(user) {
  const permisos = Array.isArray(user?.permisos) ? user.permisos.map(up) : [];
  return up(user?.role) === "INSPECTOR_ALOJAMIENTOS" || permisos.includes("INSPECTOR_ALOJAMIENTOS");
}

function sendResult(res, result) {
  if (result?.ok) {
    return res.status(result.status || 200).json({
      ok: true,
      documento: result.documento,
    });
  }

  return res.status(result?.status || 400).json({
    ok: false,
    error: result?.message || "No es posible procesar la solicitud.",
  });
}

async function generarDesdeAnexo23(req, res) {
  try {
    if (!req.user || !isInspectorAlojamientosRoleOrPerm(req.user)) return deny(res);
    if (!isObjectId(req.params.id)) return deny(res);

    const documentoOrigen = await AlojamientoDocumento.findOne({
      _id: req.params.id,
      codigo: "ANEXO_23",
      activo: { $ne: false },
    })
      .populate({
        path: "alojamiento",
        select: "codigo dependencia lugar sector tipo numero clase capacidad generoPermitido localidad provincia",
      })
      .populate({ path: "plaza", select: "codigo numeroPlaza" });

    if (!documentoOrigen) return deny(res);
    if (!puedeVerDocumentoPorTerritorio(req.user, documentoOrigen)) return deny(res);

    const result = await anexo25Service.generarDesdeAnexo23(documentoOrigen, req.user);
    return sendResult(res, result);
  } catch {
    return res.status(500).json({ ok: false, error: "No es posible procesar la solicitud." });
  }
}

async function actualizarDatos(req, res) {
  try {
    const result = await anexo25Service.actualizarDatos(req.params.id, req.body || {}, req.user);
    return sendResult(res, result);
  } catch {
    return res.status(500).json({ ok: false, error: "No es posible procesar la solicitud." });
  }
}

async function cerrarAnexo25(req, res) {
  try {
    const result = await anexo25Service.cerrarAnexo25(req.params.id, req.body || {}, req.user);
    return sendResult(res, result);
  } catch {
    return res.status(500).json({ ok: false, error: "No es posible procesar la solicitud." });
  }
}

module.exports = {
  generarDesdeAnexo23,
  actualizarDatos,
  cerrarAnexo25,
};
