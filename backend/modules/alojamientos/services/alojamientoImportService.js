const crypto = require("crypto");

const AlojamientoNaval = require("../models/AlojamientoNaval");
const AlojamientoPlaza = require("../models/AlojamientoPlaza");
const { parseAndValidateAlojamientosCsv } = require("../validators/alojamientoCsvValidator");

function buildBatchId() {
  return `ALOJ-${new Date().toISOString()}-${crypto.randomBytes(4).toString("hex")}`;
}

function plazaCodigo(alojamientoCodigo, numeroPlaza) {
  return `${String(alojamientoCodigo).toUpperCase()}-P${numeroPlaza}`;
}

function deriveEstadoFromCounts(capacidad, ocupadas, reservadas, currentEstado) {
  if (["MANTENIMIENTO", "FUERA_SERVICIO", "INHABILITADO", "BAJA"].includes(currentEstado)) {
    return currentEstado;
  }
  if (ocupadas >= capacidad) return "OCUPADO";
  if (ocupadas > 0 || reservadas > 0) return "PARCIALMENTE_OCUPADO";
  return "DISPONIBLE";
}

async function getPlazaCounts(alojamientoId) {
  const [ocupadas, reservadas] = await Promise.all([
    AlojamientoPlaza.countDocuments({
      alojamiento: alojamientoId,
      estado: "OCUPADA",
      activo: true,
    }),
    AlojamientoPlaza.countDocuments({
      alojamiento: alojamientoId,
      estado: "RESERVADA",
      activo: true,
    }),
  ]);

  return { ocupadas, reservadas };
}

async function ensureCapacityCanChange(alojamiento, nextCapacity) {
  if (!alojamiento) return;
  if (Number(alojamiento.capacidad) <= nextCapacity) return;

  const occupiedAboveLimit = await AlojamientoPlaza.findOne({
    alojamiento: alojamiento._id,
    numeroPlaza: { $gt: nextCapacity },
    estado: { $in: ["OCUPADA", "RESERVADA"] },
    activo: true,
  })
    .select("_id codigo estado numeroPlaza")
    .lean();

  if (occupiedAboveLimit) {
    const err = new Error(
      `No se puede reducir capacidad de ${alojamiento.codigo}: plaza ${occupiedAboveLimit.codigo} esta ${occupiedAboveLimit.estado}`
    );
    err.code = "CAPACIDAD_INCOMPATIBLE";
    throw err;
  }
}

async function syncPlazas({ alojamiento, capacidad, dryRun }) {
  const existing = await AlojamientoPlaza.find({ alojamiento: alojamiento._id })
    .select("_id codigo numeroPlaza estado activo")
    .lean();
  const byNumber = new Map(existing.map((p) => [Number(p.numeroPlaza), p]));

  const ops = {
    created: [],
    reactivated: [],
    deactivated: [],
  };

  for (let n = 1; n <= capacidad; n += 1) {
    const current = byNumber.get(n);
    const codigo = plazaCodigo(alojamiento.codigo, n);

    if (!current) {
      ops.created.push(codigo);
      if (!dryRun) {
        await AlojamientoPlaza.create({
          codigo,
          alojamiento: alojamiento._id,
          numeroPlaza: n,
          estado: "LIBRE",
          activo: true,
          historial: [
            {
              accion: "CREACION_IMPORTACION",
              estadoNuevo: "LIBRE",
              observacion: "Creacion automatica por importacion CSV",
            },
          ],
        });
      }
    } else if (!current.activo) {
      ops.reactivated.push(current.codigo);
      if (!dryRun) {
        await AlojamientoPlaza.updateOne(
          { _id: current._id },
          {
            $set: { activo: true },
            $push: {
              historial: {
                accion: "REACTIVACION_IMPORTACION",
                estadoAnterior: current.estado,
                estadoNuevo: current.estado,
                observacion: "Reactivacion automatica por importacion CSV",
              },
            },
          }
        );
      }
    }
  }

  for (const current of existing) {
    if (Number(current.numeroPlaza) <= capacidad || !current.activo) continue;
    if (["OCUPADA", "RESERVADA"].includes(current.estado)) continue;

    ops.deactivated.push(current.codigo);
    if (!dryRun) {
      await AlojamientoPlaza.updateOne(
        { _id: current._id },
        {
          $set: { activo: false, estado: "BAJA" },
          $push: {
            historial: {
              accion: "BAJA_IMPORTACION_CAPACIDAD",
              estadoAnterior: current.estado,
              estadoNuevo: "BAJA",
              observacion: "Baja logica por reduccion de capacidad via CSV",
            },
          },
        }
      );
    }
  }

  return ops;
}

function buildAlojamientoUpdate(row, source) {
  return {
    dependencia: row.dependencia,
    lugar: row.lugar,
    sector: row.sector,
    tipo: row.tipo,
    numero: row.numero,
    clase: row.clase,
    capacidad: row.capacidad,
    generoPermitido: row.generoPermitido,
    localidad: row.localidad,
    provincia: row.provincia,
    observaciones: row.observaciones,
    activo: row.activo,
    origenImportacion: {
      archivo: source.fileName,
      importBatchId: source.batchId,
      hashFila: row.hashFila,
      fechaImportacion: source.now,
    },
  };
}

function diffAlojamiento(existing, next) {
  if (!existing) return [];
  const fields = [
    "dependencia",
    "lugar",
    "sector",
    "tipo",
    "numero",
    "clase",
    "capacidad",
    "generoPermitido",
    "localidad",
    "provincia",
    "observaciones",
    "activo",
  ];

  return fields.filter((field) => String(existing[field] ?? "") !== String(next[field] ?? ""));
}

async function importAlojamientosCsv({ csvContent, fileName = "alojamientos_navales.csv", dryRun = true }) {
  const parsed = parseAndValidateAlojamientosCsv(csvContent);
  if (parsed.errors.length) {
    return {
      ok: false,
      dryRun,
      errors: parsed.errors,
      summary: { total: 0, created: 0, updated: 0, unchanged: 0, plazasCreated: 0 },
      results: [],
    };
  }

  const batchId = buildBatchId();
  const now = new Date();
  const results = [];
  const summary = {
    total: parsed.rows.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    plazasCreated: 0,
    plazasReactivated: 0,
    plazasDeactivated: 0,
  };

  for (const row of parsed.rows) {
    const existing = await AlojamientoNaval.findOne({ codigo: row.codigo });
    await ensureCapacityCanChange(existing, row.capacidad);

    const next = buildAlojamientoUpdate(row, { fileName, batchId, now });
    const changedFields = diffAlojamiento(existing, next);
    let alojamiento = existing;
    let action = "unchanged";

    if (!existing) {
      action = "created";
      summary.created += 1;
      if (!dryRun) {
        alojamiento = await AlojamientoNaval.create({
          codigo: row.codigo,
          ...next,
          estado: "DISPONIBLE",
          ocupacionActual: {
            plazasTotales: row.capacidad,
            plazasOcupadas: 0,
            plazasReservadas: 0,
            alojados: [],
            actualizadoEn: now,
          },
          historialEstados: [
            {
              estadoNuevo: "DISPONIBLE",
              motivo: "Alta por importacion CSV",
              origen: "IMPORTACION_CSV",
            },
          ],
        });
      } else {
        alojamiento = { _id: null, codigo: row.codigo, capacidad: row.capacidad };
      }
    } else if (changedFields.length) {
      action = "updated";
      summary.updated += 1;
      if (!dryRun) {
        Object.assign(alojamiento, next);
        alojamiento.ocupacionActual = alojamiento.ocupacionActual || {};
        alojamiento.ocupacionActual.plazasTotales = row.capacidad;
        alojamiento.ocupacionActual.actualizadoEn = now;
        await alojamiento.save();
      }
    } else {
      summary.unchanged += 1;
      if (!dryRun) {
        existing.origenImportacion = next.origenImportacion;
        await existing.save();
      }
    }

    let plazaOps = { created: [], reactivated: [], deactivated: [] };
    if (!dryRun && alojamiento?._id) {
      plazaOps = await syncPlazas({ alojamiento, capacidad: row.capacidad, dryRun });
      const counts = await getPlazaCounts(alojamiento._id);
      alojamiento.ocupacionActual = alojamiento.ocupacionActual || {};
      alojamiento.ocupacionActual.plazasTotales = row.capacidad;
      alojamiento.ocupacionActual.plazasOcupadas = counts.ocupadas;
      alojamiento.ocupacionActual.plazasReservadas = counts.reservadas;
      alojamiento.ocupacionActual.actualizadoEn = now;
      alojamiento.estado = deriveEstadoFromCounts(
        row.capacidad,
        counts.ocupadas,
        counts.reservadas,
        alojamiento.estado
      );
      await alojamiento.save();
    } else {
      const existingPlazas = existing
        ? await AlojamientoPlaza.find({ alojamiento: existing._id }).select("numeroPlaza activo").lean()
        : [];
      const activeNumbers = new Set(existingPlazas.filter((p) => p.activo).map((p) => Number(p.numeroPlaza)));
      for (let n = 1; n <= row.capacidad; n += 1) {
        if (!activeNumbers.has(n)) plazaOps.created.push(plazaCodigo(row.codigo, n));
      }
    }

    summary.plazasCreated += plazaOps.created.length;
    summary.plazasReactivated += plazaOps.reactivated.length;
    summary.plazasDeactivated += plazaOps.deactivated.length;

    results.push({
      codigo: row.codigo,
      action,
      changedFields,
      plazas: plazaOps,
    });
  }

  return {
    ok: true,
    dryRun,
    importBatchId: batchId,
    errors: [],
    summary,
    results,
  };
}

module.exports = {
  importAlojamientosCsv,
};
