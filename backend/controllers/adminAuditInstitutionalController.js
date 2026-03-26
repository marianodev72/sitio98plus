// backend/controllers/adminAuditInstitutionalController.js
const mongoose = require("mongoose");
const { AuditLog } = require("../models/AuditLog");
const { generateAuditInstitucionalPDF } = require("../utils/pdf");

// ✅ Proyección canónica: SOLO estos campos salen del módulo institucional
const CANONICAL_PROJECTION = {
  _id: 1,
  actorId: 1,
  actorRole: 1,
  action: 1,
  targetType: 1,
  targetId: 1,
  createdAt: 1,
  requestId: 1,
};

function denyOpaque(res) {
  return res.status(404).json({ error: "Recurso no disponible" });
}

function parseIntSafe(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function parseDateSafe(v) {
  if (!v) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function buildAuditFilter(query = {}) {
  const filter = {};

  // filtros canónicos y controlados
  if (query.action) filter.action = String(query.action);
  if (query.actorRole) filter.actorRole = String(query.actorRole);
  if (query.targetType) filter.targetType = String(query.targetType);
  if (query.targetId) filter.targetId = String(query.targetId);
  if (query.requestId) filter.requestId = String(query.requestId);

  if (query.actorId) {
    const actorId = String(query.actorId);
    if (!mongoose.Types.ObjectId.isValid(actorId)) {
      const err = new Error("INVALID_ACTOR_ID");
      err.code = "INVALID_ACTOR_ID";
      throw err;
    }
    filter.actorId = new mongoose.Types.ObjectId(actorId);
  }

  const from = parseDateSafe(query.from);
  const to = parseDateSafe(query.to);

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  return filter;
}

function buildPagination(query = {}) {
  const page = Math.max(1, parseIntSafe(query.page, 1));
  const limitRaw = parseIntSafe(query.limit, 50);
  const limit = Math.min(200, Math.max(1, limitRaw));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildSort(query = {}) {
  const sortBy = String(query.sortBy || "createdAt");
  const sortDir = String(query.sortDir || "desc").toLowerCase();

  // orden controlado
  if (sortBy !== "createdAt") return { createdAt: -1 };
  return { createdAt: sortDir === "asc" ? 1 : -1 };
}

function filtrosAplicadosFromQuery(query = {}) {
  const out = {};
  if (query.action) out.action = String(query.action);
  if (query.actorId) out.actorId = String(query.actorId);
  if (query.actorRole) out.actorRole = String(query.actorRole);
  if (query.targetType) out.targetType = String(query.targetType);
  if (query.targetId) out.targetId = String(query.targetId);
  if (query.requestId) out.requestId = String(query.requestId);
  if (query.from) out.from = String(query.from);
  if (query.to) out.to = String(query.to);
  return out;
}

// GET /api/admin/audit
async function listAuditEvents(req, res) {
  try {
    const role = String(req.user?.role || "");
    if (role !== "ADMIN_GENERAL") return denyOpaque(res);

    const filter = buildAuditFilter(req.query);
    const { page, limit, skip } = buildPagination(req.query);
    const sort = buildSort(req.query);

    const [total, rawItems] = await Promise.all([
  AuditLog.countDocuments(filter),
  AuditLog.find(filter)
    .select(CANONICAL_PROJECTION)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean(),
]);

// obtener ids únicos
const userIds = [
  ...new Set(
    rawItems
      .map((i) => (i.actorId ? String(i.actorId) : ""))
      .filter(Boolean)
  ),
];

// traer usuarios
let usersMap = {};
if (userIds.length) {
  const users = await mongoose.model("User")
    .find({ _id: { $in: userIds } })
    .select("nombre apellido email")
    .lean();

  users.forEach((u) => {
    usersMap[String(u._id)] =
      `${u.apellido || ""} ${u.nombre || ""}`.trim() ||
      u.email ||
      "Usuario";
  });
}

// mapear salida
const items = rawItems.map((i) => ({
  ...i,
  actorNombre: i.actorId
    ? usersMap[String(i.actorId)] || "Usuario"
    : "Sistema",
}));

    return res.json({
      page,
      limit,
      total,
      filtros: filtrosAplicadosFromQuery(req.query),
      items,
    });
  } catch (err) {
    if (err?.code === "INVALID_ACTOR_ID") return res.status(400).json({ error: "Filtro inválido" });
    console.error("[AUDIT_INSTITUCIONAL] listAuditEvents error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

// GET /api/admin/audit/request/:requestId
async function listAuditByRequestId(req, res) {
  try {
    const role = String(req.user?.role || "");
    if (role !== "ADMIN_GENERAL") return denyOpaque(res);

    const requestId = String(req.params?.requestId || "").trim();
    if (!requestId) return res.status(400).json({ error: "Filtro inválido" });

    const { page, limit, skip } = buildPagination(req.query);
    const sort = buildSort(req.query);

    const filter = { requestId };

    const [total, items] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).select(CANONICAL_PROJECTION).sort(sort).skip(skip).limit(limit).lean(),
    ]);

    return res.json({
      page,
      limit,
      total,
      filtros: { requestId },
      items,
    });
  } catch (err) {
    console.error("[AUDIT_INSTITUCIONAL] listAuditByRequestId error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

// ✅ GET /api/admin/audit/options
async function getAuditOptions(req, res) {
  try {
    const role = String(req.user?.role || "");
    if (role !== "ADMIN_GENERAL") return denyOpaque(res);

    const limit = Math.min(500, Math.max(50, parseIntSafe(req.query.limit, 200)));

    // Opcional: rango de fechas para “acotar” opciones sin filtros libres
    const baseFilter = buildAuditFilter({ from: req.query.from, to: req.query.to });

    const [actions, actorRoles, targetTypes, actorIdsAgg] = await Promise.all([
      AuditLog.distinct("action", baseFilter),
      AuditLog.distinct("actorRole", baseFilter),
      AuditLog.distinct("targetType", baseFilter),
      AuditLog.aggregate([
        { $match: { ...baseFilter, actorId: { $ne: null } } },
        { $group: { _id: "$actorId", last: { $max: "$createdAt" } } },
        { $sort: { last: -1 } },
        { $limit: limit },
        { $project: { _id: 0, actorId: { $toString: "$_id" } } },
      ]),
    ]);

    const normSort = (arr) =>
      (Array.isArray(arr) ? arr : [])
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    const actorIds = (Array.isArray(actorIdsAgg) ? actorIdsAgg : [])
      .map((x) => String(x?.actorId || "").trim())
      .filter(Boolean);

    return res.json({
      actions: normSort(actions),
      actorRoles: normSort(actorRoles),
      targetTypes: normSort(targetTypes),
      actorIds,
    });
  } catch (err) {
    console.error("[AUDIT_INSTITUCIONAL] getAuditOptions error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

// GET /api/admin/audit/export/pdf
async function exportAuditPdf(req, res) {
  try {
    const role = String(req.user?.role || "");
    if (role !== "ADMIN_GENERAL") return denyOpaque(res);

    const filter = buildAuditFilter(req.query);
    const sort = buildSort(req.query);

    // ✅ Máximo 1000 por exportación
    const max = 1000;

    const items = await AuditLog.find(filter).select(CANONICAL_PROJECTION).sort(sort).limit(max).lean();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="auditoria_institucional_${new Date().toISOString().slice(0, 10)}.pdf"`
    );

    // OJO: tu PDF institucional mejorado (folio/registro/leyenda por hoja)
    // lo resolvemos en backend/utils/pdf.js
    generateAuditInstitucionalPDF(res, {
      titulo: "Auditoría Institucional — ADMIN_GENERAL",
      fecha: new Date(),
      filtros: filtrosAplicadosFromQuery(req.query),
      orden: { sortBy: "createdAt", sortDir: sort.createdAt === 1 ? "asc" : "desc" },
      items,
      leyenda: "USO INTERNO — Acceso exclusivo ADMIN_GENERAL — Solo lectura",
    });
  } catch (err) {
    if (err?.code === "INVALID_ACTOR_ID") return res.status(400).json({ error: "Filtro inválido" });
    console.error("[AUDIT_INSTITUCIONAL] exportAuditPdf error:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

module.exports = {
  listAuditEvents,
  listAuditByRequestId,
  getAuditOptions,
  exportAuditPdf,
};
