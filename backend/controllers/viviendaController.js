// backend/controllers/viviendaController.js
// Controller PURO (sin Express Router)

const Vivienda = require("../models/Vivienda");
const { generateViviendasListadoPDF } = require("../utils/pdf");

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildViviendasPipeline(query = {}) {
  const {
    codigo,
    barrio,
    estado,
    dormitorios,
    permisionario,
    personasMin,
    personasMax,
    sortBy,
    sortDir,
  } = query;

  const dir = String(sortDir || "asc").toLowerCase() === "desc" ? -1 : 1;
  const sortKey = String(sortBy || "barrio").toLowerCase();

  const pipeline = [];
  const match = { estado: { $ne: "BAJA" } };

  if (estado) match.estado = estado;
  if (codigo) match.codigo = { $regex: escapeRegex(codigo), $options: "i" };
  if (barrio) match.barrio = { $regex: escapeRegex(barrio), $options: "i" };

  if (dormitorios !== undefined && dormitorios !== "") {
    const d = Number(dormitorios);
    if (!Number.isNaN(d)) match.dormitorios = d;
  }

  if (personasMin !== undefined && personasMin !== "") {
    const n = Number(personasMin);
    if (!Number.isNaN(n)) {
      match.cantidadHabitantes = { ...(match.cantidadHabitantes || {}), $gte: n };
    }
  }

  if (personasMax !== undefined && personasMax !== "") {
    const n = Number(personasMax);
    if (!Number.isNaN(n)) {
      match.cantidadHabitantes = { ...(match.cantidadHabitantes || {}), $lte: n };
    }
  }

  pipeline.push({ $match: match });

  pipeline.push({
    $lookup: {
      from: "users",
      localField: "ocupacionActual.permisionario",
      foreignField: "_id",
      as: "permisionarioDoc",
    },
  });

  pipeline.push({
    $addFields: {
      permisionarioDoc: { $arrayElemAt: ["$permisionarioDoc", 0] },
      hacinamientoRatio: {
        $cond: [
          { $gt: ["$dormitorios", 0] },
          { $divide: ["$cantidadHabitantes", "$dormitorios"] },
          0,
        ],
      },
    },
  });

  if (permisionario) {
    const rx = new RegExp(escapeRegex(permisionario), "i");
    pipeline.push({
      $match: {
        $or: [
          { "permisionarioDoc.nombre": rx },
          { "permisionarioDoc.apellido": rx },
          { "permisionarioDoc.matricula": rx },
        ],
      },
    });
  }

  pipeline.push({
    $project: {
      codigo: 1,
      barrio: 1,
      dormitorios: 1,
      estado: 1,
      cantidadHabitantes: 1,
      hacinamientoRatio: 1,
      permisionario: {
        nombre: "$permisionarioDoc.nombre",
        apellido: "$permisionarioDoc.apellido",
        matricula: "$permisionarioDoc.matricula",
      },
    },
  });

  const sort = {};
  if (sortKey === "hacinamiento") sort.hacinamientoRatio = dir;
  else if (sortKey === "personas") sort.cantidadHabitantes = dir;
  else sort[sortKey] = dir;

  pipeline.push({ $sort: sort });

  return {
    pipeline,
    meta: {
      sortBy: sortKey,
      sortDir: dir === -1 ? "desc" : "asc",
    },
  };
}

function buildFiltrosResumen(query = {}) {
  const clean = (v) => (v === undefined || v === null ? "" : String(v).trim());
  const out = {};

  const codigo = clean(query.codigo);
  const barrio = clean(query.barrio);
  const estado = clean(query.estado);
  const dormitorios = clean(query.dormitorios);
  const permisionario = clean(query.permisionario);
  const personasMin = clean(query.personasMin);
  const personasMax = clean(query.personasMax);

  if (codigo) out["Código"] = codigo;
  if (barrio) out["Barrio"] = barrio;
  if (estado) out["Estado"] = estado;
  if (dormitorios) out["Dormitorios"] = dormitorios;
  if (permisionario) out["Permisionario"] = permisionario;
  if (personasMin) out["Personas mín."] = personasMin;
  if (personasMax) out["Personas máx."] = personasMax;

  return out;
}

async function listar(req, res) {
  try {
    const user = req.user;

    // Seguridad: genérico y sin revelar rol
    if (!user || !["ADMIN", "ADMIN_GENERAL"].includes(user.role)) {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    const { pipeline } = buildViviendasPipeline(req.query);

    const viviendas = await Vivienda.aggregate(pipeline);
    return res.json({ viviendas });
  } catch (err) {
    console.error("[VIVIENDAS] Error listando:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function cambiarEstado(req, res) {
  try {
    // Seguridad: genérico y sin revelar rol
    if (!req.user || req.user.role !== "ADMIN_GENERAL") {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    const { id } = req.params;
    const { estado } = req.body;

    const vivienda = await Vivienda.findById(id);
    if (!vivienda) {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    vivienda.estado = estado;
    await vivienda.save();

    return res.json({ message: "Estado actualizado" });
  } catch (err) {
    console.error("[VIVIENDAS] Error cambiando estado:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function generarPdf(req, res) {
  try {
    const user = req.user;

    // Seguridad: genérico y sin revelar rol
    if (!user || !["ADMIN", "ADMIN_GENERAL"].includes(user.role)) {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    const { pipeline, meta } = buildViviendasPipeline(req.query);
    const viviendas = await Vivienda.aggregate(pipeline);

    const filtros = buildFiltrosResumen(req.query);

    // Headers de descarga
    const now = new Date();
    const safe = now.toISOString().slice(0, 16).replace(/[:T]/g, "-"); // YYYY-MM-DD-HH-MM
    const filename = `Sitio98_Viviendas_${safe}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // PDF stream directo a la respuesta
    generateViviendasListadoPDF(res, {
      titulo: "Listado de Viviendas",
      fecha: now,
      filtros,
      orden: {
        sortBy: meta.sortBy,
        sortDir: meta.sortDir,
      },
      viviendas,
    });
  } catch (err) {
    console.error("[VIVIENDAS] Error generando PDF:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = {
  listar,
  cambiarEstado,
  generarPdf,
};
