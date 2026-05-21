const mongoose = require("mongoose");

const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const anexo24Service = require("../../services/documentos/anexo24Service");
const {
  puedeVerDocumento,
  isInspectorAlojamientos,
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

function puedeGenerarAnexo24(user) {
  return isInspectorAlojamientos(user);
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
    if (!req.user || !puedeGenerarAnexo24(req.user)) return deny(res);
    if (!isObjectId(req.params.id)) return deny(res);

    const documentoOrigen = await AlojamientoDocumento.findOne({
      _id: req.params.id,
      codigo: "ANEXO_23",
      activo: { $ne: false },
    })
      .populate({
        path: "alojamiento",
        select: "codigo dependencia lugar sector tipo numero clase localidad provincia predio edificio",
      })
      .populate({ path: "plaza", select: "codigo numeroPlaza" })
      .populate({ path: "solicitante", select: "nombre apellido grado destino genero sexo" })
      .populate({ path: "alojado", select: "nombre apellido grado destino genero sexo" });

    if (!documentoOrigen) return deny(res);
    if (!puedeVerDocumento(req.user, documentoOrigen)) return deny(res);

    const result = await anexo24Service.generarDesdeAnexo23(documentoOrigen, req.user);
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
    const result = await anexo24Service.actualizarDatos(req.params.id, req.body || {}, req.user);
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
    const result = await anexo24Service.enviar(req.params.id, req.user);
    return sendResult(res, result);
  } catch {
    return res.status(500).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  }
}

async function cerrarAnexo24(req, res) {
  try {
    const result = await anexo24Service.cerrarAnexo24(req.params.id, req.body || {}, req.user);
    return sendResult(res, result);
  } catch {
    return res.status(500).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  }
}

module.exports = {
  generarDesdeAnexo23,
  actualizarDatos,
  enviar,
  cerrarAnexo24,
};
