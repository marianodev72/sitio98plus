const mongoose = require("mongoose");

const anexo21Service = require("../../services/documentos/anexo21Service");

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

module.exports = {
  crear,
  actualizar,
  enviar,
};
