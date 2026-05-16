const mongoose = require("mongoose");

const AlojamientoDocumento = require("../../models/AlojamientoDocumento");
const {
  ALOJAMIENTO_DOCUMENTO_CODIGOS,
  ALOJAMIENTO_DOCUMENTO_ESTADOS,
} = require("../../constants/alojamientoDocumentoConstants");
const {
  puedeVerDocumento,
  isAdminDocumento,
} = require("../../services/documentos/alojamientoDocumentoVisibilityService");

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function deny(res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function parsePositiveInt(value, fallback, max) {
  const n = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function buildBaseFilter(query = {}) {
  const filter = { activo: { $ne: false } };

  const codigo = up(query.codigo);
  if (codigo) {
    if (!ALOJAMIENTO_DOCUMENTO_CODIGOS.includes(codigo)) return null;
    filter.codigo = codigo;
  }

  const estado = up(query.estado);
  if (estado) {
    if (!ALOJAMIENTO_DOCUMENTO_ESTADOS.includes(estado)) return null;
    filter.estado = estado;
  }

  for (const key of ["solicitante", "alojado"]) {
    if (query[key] !== undefined && query[key] !== "") {
      if (!isObjectId(query[key])) return null;
      filter[key] = query[key];
    }
  }

  return filter;
}

function applyVisibilityFilter(filter, user) {
  if (isAdminDocumento(user)) return filter;

  const userId = user?._id;
  if (!userId) return null;

  return {
    ...filter,
    $or: [
      { solicitante: userId },
      { alojado: userId },
      { inspector: userId },
      { creadoPor: userId },
      { "intervinientes.userId": userId },
    ],
  };
}

function toListItem(doc) {
  return {
    _id: doc._id,
    codigo: doc.codigo,
    estado: doc.estado,
    estadoInstitucional: doc.estadoInstitucional || null,
    derivadoDe: doc.derivadoDe || null,
    alojamiento: doc.alojamiento || null,
    plaza: doc.plaza || null,
    asignacion: doc.asignacion || null,
    solicitante: doc.solicitante || null,
    alojado: doc.alojado || null,
    inspector: doc.inspector || null,
    intervinientes: Array.isArray(doc.intervinientes) ? doc.intervinientes : [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toDetail(doc) {
  return {
    ...toListItem(doc),
    datos: doc.datos && typeof doc.datos === "object" ? doc.datos : {},
    historialEstados: Array.isArray(doc.historialEstados) ? doc.historialEstados : [],
    intervenciones: Array.isArray(doc.intervenciones) ? doc.intervenciones : [],
    conformidades: Array.isArray(doc.conformidades) ? doc.conformidades : [],
    signers: Array.isArray(doc.signers) ? doc.signers : [],
    activo: doc.activo !== false,
  };
}

async function listar(req, res) {
  try {
    if (!req.user || !req.user.role) return deny(res);

    const baseFilter = buildBaseFilter(req.query || {});
    if (!baseFilter) return deny(res);

    const filter = applyVisibilityFilter(baseFilter, req.user);
    if (!filter) return deny(res);

    const page = parsePositiveInt(req.query?.page, 1, 10000);
    const limit = parsePositiveInt(req.query?.limit, 50, 200);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      AlojamientoDocumento.find(filter)
        .select(
          "codigo estado estadoInstitucional derivadoDe alojamiento plaza asignacion solicitante alojado inspector intervinientes createdAt updatedAt"
        )
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AlojamientoDocumento.countDocuments(filter),
    ]);

    return res.json({
      ok: true,
      page,
      limit,
      total,
      documentos: items.map(toListItem),
    });
  } catch (err) {
    console.error("[alojamientos-documentos] listar error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al listar documentos" });
  }
}

async function obtenerPorId(req, res) {
  try {
    if (!req.user || !req.user.role) return deny(res);

    const { id } = req.params || {};
    if (!isObjectId(id)) return deny(res);

    const documento = await AlojamientoDocumento.findById(id).lean();
    if (!documento || documento.activo === false) return deny(res);
    if (!puedeVerDocumento(req.user, documento)) return deny(res);

    return res.json({ ok: true, documento: toDetail(documento) });
  } catch (err) {
    console.error("[alojamientos-documentos] detalle error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al obtener documento" });
  }
}

module.exports = {
  listar,
  obtenerPorId,
};
