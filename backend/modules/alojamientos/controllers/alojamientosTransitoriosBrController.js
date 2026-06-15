const service = require("../services/alojamientosTransitoriosBrService");

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function deny(res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

function isAdminGeneral(user) {
  return up(user?.role) === "ADMIN_GENERAL";
}

function actorId(req) {
  return req.user?._id || req.user?.id || null;
}

function handleError(res, err, fallback) {
  const status = Number(err?.status || 500);
  if (status >= 500) console.error("[alojamientos-transitorios-br]", err?.message || err);
  return res.status(status).json({ ok: false, message: err?.message || fallback });
}

async function listar(req, res) {
  try {
    if (!isAdminGeneral(req.user)) return deny(res);
    const includeBaja = ["1", "true", "si", "yes"].includes(String(req.query?.includeBaja || "").toLowerCase());
    const alojamientos = await service.listar({ includeBaja });
    return res.json({ ok: true, total: alojamientos.length, alojamientos });
  } catch (err) {
    return handleError(res, err, "Error interno al listar BR transitorios");
  }
}

async function obtenerPorId(req, res) {
  try {
    if (!isAdminGeneral(req.user)) return deny(res);
    const detalle = await service.obtenerDetalle(req.params.id);
    return res.json({ ok: true, ...detalle });
  } catch (err) {
    return handleError(res, err, "Error interno al obtener BR transitorio");
  }
}

async function crear(req, res) {
  try {
    if (!isAdminGeneral(req.user)) return deny(res);
    const result = await service.crear(req.body || {}, actorId(req));
    return res.status(201).json({ ok: true, ...result });
  } catch (err) {
    return handleError(res, err, "Error interno al crear BR transitorio");
  }
}

async function actualizar(req, res) {
  try {
    if (!isAdminGeneral(req.user)) return deny(res);
    const result = await service.actualizar(req.params.id, req.body || {}, actorId(req));
    return res.json({ ok: true, ...result });
  } catch (err) {
    return handleError(res, err, "Error interno al actualizar BR transitorio");
  }
}

async function finalizar(req, res) {
  try {
    if (!isAdminGeneral(req.user)) return deny(res);
    const result = await service.finalizar(req.params.id, req.body || {}, actorId(req));
    return res.json({ ok: true, ...result });
  } catch (err) {
    return handleError(res, err, "Error interno al finalizar BR transitorio");
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  finalizar,
};
