const mongoose = require("mongoose");

const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const { up } = require("./alojamientoDocumentoStateService");
const {
  isInspectorAlojamientos,
  puedeVerDocumento,
} = require("./alojamientoDocumentoVisibilityService");

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

function isUsuarioVinculado(user, documento) {
  const userId = idValue(user?._id);
  if (!userId || !documento) return false;
  if (idValue(documento.solicitante) === userId) return true;
  if (idValue(documento.alojado) === userId) return true;

  const intervinientes = Array.isArray(documento.intervinientes) ? documento.intervinientes : [];
  return intervinientes.some((item) => idValue(item?.userId || item?.id || item?._id) === userId);
}

function canDownloadAnexo23(user, documento) {
  if (!user || !documento) return false;
  if (isAdminGeneral(user)) return true;
  if (isInspectorAlojamientos(user)) return puedeVerDocumento(user, documento);
  return isUsuarioVinculado(user, documento);
}

function canDownloadAnexo24(user, documento) {
  if (!user || !documento) return false;
  if (isAdminGeneral(user)) return true;
  if (isInspectorAlojamientos(user)) return puedeVerDocumento(user, documento);
  return isUsuarioVinculado(user, documento);
}

function canDownloadAnexo25(user, documento) {
  if (!user || !documento) return false;
  if (isAdminGeneral(user)) return true;
  if (isInspectorAlojamientos(user)) return puedeVerDocumento(user, documento);
  return isUsuarioVinculado(user, documento);
}

function canDownloadAnexo26(user, documento) {
  if (!user || !documento) return false;
  if (isAdminGeneral(user)) return true;
  if (isInspectorAlojamientos(user)) return puedeVerDocumento(user, documento);
  return isUsuarioVinculado(user, documento);
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

async function obtenerPayloadAnexo23({ id, user }) {
  if (!user?._id || !isObjectId(id)) return publicError(404, "NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_23",
    activo: { $ne: false },
  }).lean();

  if (!documento) return publicError(404, "NO_DISPONIBLE");
  if (!canDownloadAnexo23(user, documento)) return publicError(404, "NO_DISPONIBLE");

  let anexo22 = null;
  let anexo21 = null;
  if (documento.derivadoDe && isObjectId(documento.derivadoDe)) {
    anexo22 = await AlojamientoDocumento.findOne({
      _id: documento.derivadoDe,
      codigo: "ANEXO_22",
      activo: { $ne: false },
    }).lean();
  }
  if (anexo22?.derivadoDe && isObjectId(anexo22.derivadoDe)) {
    anexo21 = await AlojamientoDocumento.findOne({
      _id: anexo22.derivadoDe,
      codigo: "ANEXO_21",
      activo: { $ne: false },
    }).lean();
  }

  return {
    ok: true,
    status: 200,
    documento,
    anexo22,
    anexo21,
  };
}

async function obtenerPayloadAnexo24({ id, user }) {
  if (!user?._id || !isObjectId(id)) return publicError(404, "NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_24",
    activo: { $ne: false },
  }).lean();

  if (!documento) return publicError(404, "NO_DISPONIBLE");
  if (!canDownloadAnexo24(user, documento)) return publicError(404, "NO_DISPONIBLE");

  let origen = null;
  if (documento.derivadoDe && isObjectId(documento.derivadoDe)) {
    origen = await AlojamientoDocumento.findOne({
      _id: documento.derivadoDe,
      codigo: "ANEXO_23",
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

async function obtenerPayloadAnexo25({ id, user }) {
  if (!user?._id || !isObjectId(id)) return publicError(404, "NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_25",
    activo: { $ne: false },
  }).lean();

  if (!documento) return publicError(404, "NO_DISPONIBLE");
  if (!canDownloadAnexo25(user, documento)) return publicError(404, "NO_DISPONIBLE");

  let origen = null;
  if (documento.derivadoDe && isObjectId(documento.derivadoDe)) {
    origen = await AlojamientoDocumento.findOne({
      _id: documento.derivadoDe,
      codigo: "ANEXO_23",
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

async function obtenerPayloadAnexo26({ id, user }) {
  if (!user?._id || !isObjectId(id)) return publicError(404, "NO_DISPONIBLE");

  const documento = await AlojamientoDocumento.findOne({
    _id: id,
    codigo: "ANEXO_26",
    activo: { $ne: false },
  }).lean();

  if (!documento) return publicError(404, "NO_DISPONIBLE");
  if (!canDownloadAnexo26(user, documento)) return publicError(404, "NO_DISPONIBLE");

  let origen = null;
  if (documento.derivadoDe && isObjectId(documento.derivadoDe)) {
    origen = await AlojamientoDocumento.findOne({
      _id: documento.derivadoDe,
      codigo: "ANEXO_25",
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

async function obtenerPayloadDocumentoPdf({ id, user }) {
  if (!user?._id || !isObjectId(id)) return publicError(404, "NO_DISPONIBLE");

  const base = await AlojamientoDocumento.findOne({
    _id: id,
    activo: { $ne: false },
  })
    .select("codigo")
    .lean();

  if (!base) return publicError(404, "NO_DISPONIBLE");
  if (up(base.codigo) === "ANEXO_22") return obtenerPayloadAnexo22({ id, user });
  if (up(base.codigo) === "ANEXO_23") return obtenerPayloadAnexo23({ id, user });
  if (up(base.codigo) === "ANEXO_24") return obtenerPayloadAnexo24({ id, user });
  if (up(base.codigo) === "ANEXO_25") return obtenerPayloadAnexo25({ id, user });
  if (up(base.codigo) === "ANEXO_26") return obtenerPayloadAnexo26({ id, user });
  return publicError(404, "NO_DISPONIBLE");
}

module.exports = {
  obtenerPayloadAnexo22,
  obtenerPayloadAnexo23,
  obtenerPayloadAnexo24,
  obtenerPayloadAnexo25,
  obtenerPayloadAnexo26,
  obtenerPayloadDocumentoPdf,
};
