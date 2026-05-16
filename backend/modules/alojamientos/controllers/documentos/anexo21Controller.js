const mongoose = require("mongoose");

const anexo21Service = require("../../services/documentos/anexo21Service");
const anexo21AdjuntoService = require("../../services/documentos/anexo21AdjuntoService");

function deny(res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

function badRequest(res) {
  return res.status(400).json({ message: "No es posible procesar la solicitud" });
}

function conflict(res) {
  return res.status(409).json({ message: "No es posible procesar la solicitud" });
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function datosFromBody(body = {}) {
  return body && Object.prototype.hasOwnProperty.call(body, "datos") ? body.datos : body;
}

function sendServiceResult(res, result) {
  if (result?.ok) {
    return res.status(result.status || 200).json({ ok: true, documento: result.documento });
  }

  if (result?.status === 400) return badRequest(res);
  if (result?.status === 409) return conflict(res);
  return deny(res);
}

async function crear(req, res) {
  try {
    const result = await anexo21Service.crearBorrador({
      user: req.user,
      datos: datosFromBody(req.body),
    });

    return sendServiceResult(res, result);
  } catch (err) {
    console.error("[alojamientos-documentos][anexo21] crear error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al procesar solicitud" });
  }
}

async function actualizar(req, res) {
  try {
    const { id } = req.params || {};
    if (!isObjectId(id)) return deny(res);

    const result = await anexo21Service.actualizarBorrador({
      id,
      user: req.user,
      datos: datosFromBody(req.body),
    });

    return sendServiceResult(res, result);
  } catch (err) {
    console.error("[alojamientos-documentos][anexo21] actualizar error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al procesar solicitud" });
  }
}

async function enviar(req, res) {
  try {
    const { id } = req.params || {};
    if (!isObjectId(id)) return deny(res);

    const result = await anexo21Service.enviarBorrador({
      id,
      user: req.user,
    });

    return sendServiceResult(res, result);
  } catch (err) {
    console.error("[alojamientos-documentos][anexo21] enviar error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al procesar solicitud" });
  }
}

async function subirAdjunto(req, res) {
  try {
    const { id, campo } = req.params || {};
    if (!isObjectId(id)) return deny(res);

    const result = await anexo21AdjuntoService.subirAdjunto({
      id,
      campo,
      file: req.file,
      user: req.user,
    });

    if (!result?.ok) {
      if (result?.status === 400) return badRequest(res);
      return deny(res);
    }

    return res.status(result.status || 200).json({ ok: true, adjunto: result.adjunto });
  } catch (err) {
    console.error("[alojamientos-documentos][anexo21] subir adjunto error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al procesar archivo" });
  }
}

async function eliminarAdjunto(req, res) {
  try {
    const { id, campo } = req.params || {};
    if (!isObjectId(id)) return deny(res);

    const result = await anexo21AdjuntoService.eliminarAdjunto({
      id,
      campo,
      user: req.user,
    });

    if (!result?.ok) return deny(res);
    return res.status(result.status || 200).json({ ok: true });
  } catch (err) {
    console.error("[alojamientos-documentos][anexo21] eliminar adjunto error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al procesar archivo" });
  }
}

async function descargarAdjunto(req, res) {
  try {
    const { id, campo } = req.params || {};
    if (!isObjectId(id)) return deny(res);

    const result = await anexo21AdjuntoService.obtenerAdjuntoDescarga({
      id,
      campo,
      user: req.user,
    });

    if (!result?.ok) return deny(res);
    return anexo21AdjuntoService.streamAdjunto({ res, download: result });
  } catch (err) {
    console.error("[alojamientos-documentos][anexo21] descargar adjunto error:", err?.message || "Error controlado");
    if (!res.headersSent) return res.status(500).json({ message: "Error interno al procesar archivo" });
  }
}

module.exports = {
  crear,
  actualizar,
  enviar,
  subirAdjunto,
  eliminarAdjunto,
  descargarAdjunto,
};
