const mongoose = require("mongoose");

const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const { up } = require("./alojamientoDocumentoStateService");

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function isAdminGeneral(user) {
  return up(user?.role) === "ADMIN_GENERAL";
}

function isPostulante(user) {
  return up(user?.role) === "POSTULANTE";
}

function idValue(value) {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id || "");
  return String(value || "");
}

function publicError(status, code = "NO_DISPONIBLE") {
  return {
    ok: false,
    status,
    code,
    message: "No es posible generar el PDF en este momento.",
  };
}

function canDownloadAnexo22(user, documento) {
  if (!user || !documento) return false;
  if (isAdminGeneral(user)) return true;
  if (isPostulante(user)) return canPostulanteDownloadAnexo22(user, documento);
  return false;
}

function canPostulanteDownloadAnexo22(user, documento) {
  const userId = idValue(user?._id);
  if (!userId || !documento) return false;
  if (idValue(documento.solicitante) === userId) return true;
  if (idValue(documento.alojado) === userId) return true;

  const intervinientes = Array.isArray(documento.intervinientes) ? documento.intervinientes : [];
  return intervinientes.some((item) => idValue(item?.userId || item?.id || item?._id) === userId);
}

async function obtenerPayloadAnexo22({ id, user }) {
  if (!user?._id || !isObjectId(id)) return publicError(404, "NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_22",
    activo: { $ne: false },
  }).lean();

  if (!documento) return publicError(404, "NO_DISPONIBLE");
  if (!canDownloadAnexo22(user, documento)) return publicError(404, "NO_DISPONIBLE");

  let origen = null;
  if (documento.derivadoDe && isObjectId(documento.derivadoDe)) {
    origen = await AlojamientoDocumento.findOne({
      _id: documento.derivadoDe,
      codigo: "ANEXO_21",
      activo: { $ne: false },
    }).lean();
  }

  return {
    ok: true,
    status: 200,
    documento,
    origen,
  };
}

module.exports = {
  obtenerPayloadAnexo22,
};
