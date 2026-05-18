const mongoose = require("mongoose");

const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const anexo23Service = require("../../services/documentos/anexo23Service");
const {
  puedeVerDocumento,
  isInspectorAlojamientos,
} = require("../../services/documentos/alojamientoDocumentoVisibilityService");
const { up } = require("../../services/documentos/alojamientoDocumentoStateService");

function deny(res) {
  return res.status(404).json({
    ok: false,
    error: "No es posible procesar la solicitud.",
  });
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function isAdminGeneral(user) {
  return up(user?.role) === "ADMIN_GENERAL";
}

function puedeGenerarAnexo23(user) {
  return isAdminGeneral(user) || isInspectorAlojamientos(user);
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

async function generarDesdeAnexo22(req, res) {
  try {
    if (!req.user || !puedeGenerarAnexo23(req.user)) return deny(res);
    if (!isObjectId(req.params.id)) return deny(res);

    const documentoOrigen = await AlojamientoDocumento.findOne({
      _id: req.params.id,
      codigo: "ANEXO_22",
      activo: { $ne: false },
    })
      .populate({
        path: "alojamiento",
        select: "codigo dependencia lugar sector tipo numero clase capacidad generoPermitido localidad provincia",
      })
      .populate({ path: "plaza", select: "codigo numeroPlaza" })
      .populate({ path: "solicitante", select: "nombre apellido email grado mr destino" })
      .populate({ path: "alojado", select: "nombre apellido email grado mr destino" });

    if (!documentoOrigen) return deny(res);
    if (!puedeVerDocumento(req.user, documentoOrigen)) return deny(res);

    const result = await anexo23Service.generarDesdeAnexo22(documentoOrigen, req.user);
    return sendResult(res, result);
  } catch {
    return res.status(500).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  }
}

async function actualizarDatos(req, res) {
  try {
    const result = await anexo23Service.actualizarDatos(req.params.id, req.body || {}, req.user);
    return sendResult(res, result);
  } catch {
    return res.status(500).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  }
}

async function enviar(req, res) {
  try {
    const result = await anexo23Service.enviar(req.params.id, req.user);
    return sendResult(res, result);
  } catch {
    return res.status(500).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  }
}

async function conformidadAlojado(req, res) {
  try {
    const result = await anexo23Service.conformidadAlojado(req.params.id, req.body || {}, req.user);
    return sendResult(res, result);
  } catch {
    return res.status(500).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  }
}

async function cerrarAnexo23(req, res) {
  try {
    const result = await anexo23Service.cerrarAnexo23(req.params.id, req.body || {}, req.user);
    return sendResult(res, result);
  } catch {
    return res.status(500).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  }
}

module.exports = {
  generarDesdeAnexo22,
  actualizarDatos,
  enviar,
  conformidadAlojado,
  cerrarAnexo23,
};
