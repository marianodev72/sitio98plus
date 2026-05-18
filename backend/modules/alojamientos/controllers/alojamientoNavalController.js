const mongoose = require("mongoose");

const AlojamientoNaval = require("../models/AlojamientoNaval");
const AlojamientoPlaza = require("../models/AlojamientoPlaza");
const { User } = require("../../../models/user");
const { importAlojamientosCsv } = require("../services/alojamientoImportService");

function deny(res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function isAdminLike(user) {
  const role = up(user?.role);
  return role === "ADMIN_GENERAL" || role === "ADMIN";
}

function hasPermiso(user, permiso) {
  const list = Array.isArray(user?.permisos) ? user.permisos.map(up) : [];
  return list.includes(up(permiso));
}

function getTerritoriosLugar(user) {
  const list = Array.isArray(user?.territoriosAlojamiento)
    ? user.territoriosAlojamiento
    : [];

  return Array.from(
    new Set(
      list
        .filter((item) => up(item?.tipo) === "LUGAR")
        .map((item) => String(item?.valor || "").trim())
        .filter(Boolean)
    )
  );
}

function isInspectorAlojamientos(user) {
  return hasPermiso(user, "INSPECTOR_ALOJAMIENTOS");
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLugarFilter(lugares) {
  return lugares.map((lugar) => new RegExp(`^${escapeRegex(lugar)}$`, "i"));
}

function estadoOperativoDesdePlazas(estadoOriginal, counts) {
  const original = up(estadoOriginal);
  if (["MANTENIMIENTO", "FUERA_SERVICIO", "INHABILITADO", "BAJA"].includes(original)) {
    return original;
  }

  const totales = Number(counts?.plazasTotales || 0);
  const ocupadas = Number(counts?.plazasOcupadas || 0);
  const reservadas = Number(counts?.plazasReservadas || 0);
  const libres = Number(counts?.plazasLibres || 0);

  if (totales > 0 && ocupadas >= totales) return "OCUPADO";
  if (ocupadas > 0 || reservadas > 0) return "PARCIALMENTE_OCUPADO";
  if (libres > 0) return "DISPONIBLE";
  return original || "DISPONIBLE";
}

function nombreHumano(user) {
  const apellido = String(user?.apellido || "").trim();
  const nombre = String(user?.nombre || "").trim();
  const full = [apellido, nombre].filter(Boolean).join(", ");
  return full || "Alojado no identificado";
}

async function buildOcupacionMap(alojamientoIds) {
  const ids = (alojamientoIds || []).filter(Boolean);
  if (!ids.length) return new Map();

  const plazas = await AlojamientoPlaza.find({
    alojamiento: { $in: ids },
    activo: { $ne: false },
  })
    .select("alojamiento estado alojadoActual")
    .lean();

  const userIds = Array.from(
    new Set(
      plazas
        .filter((plaza) => up(plaza.estado) === "OCUPADA" && plaza.alojadoActual)
        .map((plaza) => String(plaza.alojadoActual))
    )
  );

  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("nombre apellido").lean()
    : [];
  const userMap = new Map(users.map((user) => [String(user._id), nombreHumano(user)]));
  const map = new Map();

  for (const plaza of plazas) {
    const key = String(plaza.alojamiento);
    const row = map.get(key) || {
      plazasTotales: 0,
      plazasOcupadas: 0,
      plazasReservadas: 0,
      plazasLibres: 0,
      alojadosMap: new Map(),
    };
    const estado = up(plaza.estado);

    row.plazasTotales += 1;
    if (estado === "OCUPADA") {
      row.plazasOcupadas += 1;
      const alojadoId = String(plaza.alojadoActual || "");
      if (alojadoId) {
        row.alojadosMap.set(alojadoId, { nombre: userMap.get(alojadoId) || "Alojado no identificado" });
      }
    }
    if (estado === "RESERVADA") row.plazasReservadas += 1;
    if (estado === "LIBRE") row.plazasLibres += 1;

    map.set(key, row);
  }

  for (const row of map.values()) {
    row.alojados = Array.from(row.alojadosMap.values());
    delete row.alojadosMap;
  }

  return map;
}

async function withOcupacionReal(alojamientos) {
  const list = Array.isArray(alojamientos) ? alojamientos : [];
  const map = await buildOcupacionMap(list.map((item) => item?._id));

  return list.map((item) => {
    const counts = map.get(String(item?._id)) || {
      plazasTotales: 0,
      plazasOcupadas: 0,
      plazasReservadas: 0,
      plazasLibres: 0,
      alojados: [],
    };
    const ocupacionActual = {
      plazasTotales: Number(counts.plazasTotales || 0),
      plazasOcupadas: Number(counts.plazasOcupadas || 0),
      plazasReservadas: Number(counts.plazasReservadas || 0),
      plazasLibres: Number(counts.plazasLibres || 0),
      alojados: Array.isArray(counts.alojados) ? counts.alojados : [],
    };

    return {
      ...item,
      estado: estadoOperativoDesdePlazas(item.estado, ocupacionActual),
      ocupacionActual,
    };
  });
}

function puedeVerAlojamiento(user, alojamiento) {
  if (isAdminLike(user)) return true;
  if (!isInspectorAlojamientos(user)) return false;

  const lugares = getTerritoriosLugar(user).map(up);
  if (!lugares.length) return false;
  return lugares.includes(up(alojamiento?.lugar));
}

function parseBoolQuery(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return ["1", "true", "si", "yes"].includes(String(value).toLowerCase().trim());
}

async function listar(req, res) {
  try {
    if (!isAdminLike(req.user) && !isInspectorAlojamientos(req.user)) return deny(res);

    const filtro = {};
    const { dependencia, lugar, sector, tipo, clase, estado, generoPermitido, activo } =
      req.query || {};

    if (dependencia) filtro.dependencia = String(dependencia).trim();
    if (lugar) filtro.lugar = String(lugar).trim();
    if (sector) filtro.sector = String(sector).trim();
    if (tipo) filtro.tipo = String(tipo).trim();
    if (clase) filtro.clase = up(clase);
    if (estado) filtro.estado = up(estado);
    if (generoPermitido) filtro.generoPermitido = up(generoPermitido);
    if (activo !== undefined) filtro.activo = parseBoolQuery(activo, true);

    if (isInspectorAlojamientos(req.user) && !isAdminLike(req.user)) {
      const lugares = getTerritoriosLugar(req.user);
      if (!lugares.length) {
        return res.json({ ok: true, page: 1, limit: 50, total: 0, alojamientos: [] });
      }
      if (lugar && !lugares.map(up).includes(up(lugar))) {
        return res.json({ ok: true, page: 1, limit: 50, total: 0, alojamientos: [] });
      }
      if (!lugar) filtro.lugar = { $in: buildLugarFilter(lugares) };
    }

    const page = Math.max(Number.parseInt(req.query?.page || "1", 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query?.limit || "50", 10), 1), 200);

    const [items, total] = await Promise.all([
      AlojamientoNaval.find(filtro)
        .sort({ dependencia: 1, lugar: 1, sector: 1, tipo: 1, numero: 1, codigo: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AlojamientoNaval.countDocuments(filtro),
    ]);

    const alojamientos = await withOcupacionReal(items);

    return res.json({ ok: true, page, limit, total, alojamientos });
  } catch (err) {
    console.error("[alojamientos] listar error:", err);
    return res.status(500).json({ message: "Error interno al listar alojamientos navales" });
  }
}

async function obtenerPorId(req, res) {
  try {
    if (!isAdminLike(req.user) && !isInspectorAlojamientos(req.user)) return deny(res);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const alojamiento = await AlojamientoNaval.findById(id).lean();
    if (!alojamiento) return deny(res);
    if (!puedeVerAlojamiento(req.user, alojamiento)) return deny(res);

    const [alojamientoConOcupacion] = await withOcupacionReal([alojamiento]);

    return res.json({ ok: true, alojamiento: alojamientoConOcupacion });
  } catch (err) {
    console.error("[alojamientos] obtenerPorId error:", err);
    return res.status(500).json({ message: "Error interno al obtener alojamiento naval" });
  }
}

async function listarTerritorios(req, res) {
  try {
    if (!isAdminLike(req.user)) return deny(res);

    const rows = await AlojamientoNaval.aggregate([
      {
        $match: {
          activo: { $ne: false },
          lugar: { $exists: true, $ne: "" },
        },
      },
      {
        $project: {
          valor: { $trim: { input: "$lugar" } },
        },
      },
      {
        $match: {
          valor: { $ne: "" },
        },
      },
      {
        $group: {
          _id: "$valor",
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const territorios = rows.map((row) => ({ tipo: "LUGAR", valor: row._id }));
    return res.json({ ok: true, total: territorios.length, territorios });
  } catch (err) {
    console.error("[alojamientos] listarTerritorios error:", err?.message || "Error controlado");
    return res.status(500).json({ message: "Error interno al listar territorios" });
  }
}

async function listarPlazas(req, res) {
  try {
    if (!isAdminLike(req.user) && !isInspectorAlojamientos(req.user)) return deny(res);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return deny(res);

    const alojamiento = await AlojamientoNaval.findById(id).select("_id codigo lugar").lean();
    if (!alojamiento) return deny(res);
    if (!puedeVerAlojamiento(req.user, alojamiento)) return deny(res);

    const plazas = await AlojamientoPlaza.find({ alojamiento: id })
      .sort({ numeroPlaza: 1 })
      .lean();

    return res.json({ ok: true, alojamiento, plazas });
  } catch (err) {
    console.error("[alojamientos] listarPlazas error:", err);
    return res.status(500).json({ message: "Error interno al listar plazas" });
  }
}

async function importarCsv(req, res) {
  try {
    if (!isAdminLike(req.user)) return deny(res);

    const dryRun = parseBoolQuery(req.body?.dryRun ?? req.query?.dryRun, true);
    const csvContent = req.file?.buffer
      ? req.file.buffer.toString("utf8")
      : String(req.body?.csvContent || "");

    if (!csvContent.trim()) {
      return res.status(400).json({ ok: false, message: "CSV requerido" });
    }

    const result = await importAlojamientosCsv({
      csvContent,
      fileName: req.file?.originalname || req.body?.fileName || "alojamientos_navales.csv",
      dryRun,
    });

    const status = result.ok ? 200 : 400;
    return res.status(status).json(result);
  } catch (err) {
    console.error("[alojamientos] importarCsv error:", err);
    if (err.code === "CAPACIDAD_INCOMPATIBLE") {
      return res.status(409).json({ ok: false, message: err.message });
    }
    return res.status(500).json({ ok: false, message: "Error interno al importar CSV" });
  }
}

module.exports = {
  listar,
  listarTerritorios,
  obtenerPorId,
  listarPlazas,
  importarCsv,
};
