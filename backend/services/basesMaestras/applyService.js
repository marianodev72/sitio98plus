const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const { User } = require("../../models/user");
const Vivienda = require("../../models/vivienda");
const AlojamientoNaval = require("../../modules/alojamientos/models/AlojamientoNaval");
const {
  ALOJAMIENTO_ESTADOS,
  GENERO_PERMITIDO,
} = require("../../modules/alojamientos/constants/alojamientoConstants");
const { normalizeTipoDestinoStrict } = require("../../constants/institucional");

const APPLYABLE_ESTADO = "PENDIENTE_CONFIRMACION";
const BAJA_LOGICA_VIVIENDA = "BAJA_LOGICA_VIVIENDA";
const ESTADOS_VIVIENDA_BAJA_LOGICA = new Set(["DISPONIBLE", "REPARACION", "BAJA"]);
const GENEROS_ALOJAMIENTO_VALIDOS = new Set(GENERO_PERMITIDO);
const ESTADOS_ALOJAMIENTO_VALIDOS = new Set(ALOJAMIENTO_ESTADOS);
const ESTADOS_ALOJAMIENTO_OCUPADO_REAL = new Set(["OCUPADO", "RESERVADO", "PARCIALMENTE_OCUPADO"]);
const ESTADOS_ALOJAMIENTO_CRITICOS = new Set(["FUERA_SERVICIO", "MANTENIMIENTO"]);
const ESTADOS_ALOJAMIENTO_BLOQUEO_OCUPADO = new Set(["BAJA", "INHABILITADO"]);
const ALOJAMIENTO_UPDATE_FIELDS = new Set([
  "denominacion",
  "dependencia",
  "lugar",
  "sector",
  "generoPermitido",
  "aptoParaGrupoJerarquico",
  "capacidad",
  "estado",
  "activo",
  "observaciones",
]);
const GRUPOS_JERARQUICOS_VALIDOS = new Set(["OF", "SB_CP", "CB", "TR", "NO_DEFINIDO"]);

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function approvalTipo(value) {
  return String(value || "").toUpperCase().trim();
}

function approvalKey(value) {
  return String(value || "").trim();
}

function approvalToken(item) {
  return `${approvalTipo(item?.tipo)}::${approvalKey(item?.key)}`;
}

function approvedTokens(job) {
  const tokens = new Set();
  for (const approval of arr(job.manualApprovals)) {
    if (approval?.approved) tokens.add(approvalToken(approval));
  }
  return tokens;
}

function unapproved(items, tokens) {
  return arr(items).filter((item) => !tokens.has(approvalToken(item)));
}

function bajaLogicaViviendaItems(job) {
  return arr(job?.applyPlan?.requiresManualReview).filter((item) => approvalTipo(item?.tipo) === BAJA_LOGICA_VIVIENDA);
}

function approvedManualReview(job, tipo, key) {
  const normalizedTipo = approvalTipo(tipo);
  const normalizedKey = approvalKey(key);
  return arr(job?.manualApprovals).find(
    (approval) =>
      approval?.approved === true &&
      approvalTipo(approval.tipo) === normalizedTipo &&
      approvalKey(approval.key) === normalizedKey
  );
}

function clean(value) {
  return String(value || "").trim();
}

function validTipoDestino(value) {
  return normalizeTipoDestinoStrict(value);
}

function validGrupoJerarquico(value) {
  const normalized = String(value || "").toUpperCase().trim().replace(/[\s/-]+/g, "_");
  return GRUPOS_JERARQUICOS_VALIDOS.has(normalized) ? normalized : null;
}

function validGeneroAlojamiento(value) {
  const normalized = String(value || "").toUpperCase().trim().replace(/[\s/-]+/g, "_");
  return GENEROS_ALOJAMIENTO_VALIDOS.has(normalized) ? normalized : null;
}

function validEstadoAlojamiento(value) {
  const normalized = String(value || "").toUpperCase().trim().replace(/[\s/-]+/g, "_");
  return ESTADOS_ALOJAMIENTO_VALIDOS.has(normalized) ? normalized : null;
}

function normDni(value) {
  return clean(value).replace(/[^\d]/g, "");
}

function splitNombreApellido(value) {
  const parts = clean(value).split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { nombre: parts[0] || "Sin nombre", apellido: "Sin apellido" };
  return { nombre: parts.slice(0, -1).join(" "), apellido: parts.slice(-1).join(" ") };
}

function syntheticEmail(item) {
  const matricula = clean(item.matricula).toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const dni = normDni(item.dni);
  const key = matricula || dni || crypto.randomBytes(8).toString("hex");
  return `import-${key}@sitio98plus.local`;
}

async function buildPasswordHash() {
  const random = crypto.randomBytes(32).toString("hex");
  return bcrypt.hash(random, 10);
}

function assertApplyable(job) {
  if (!job) {
    const err = new Error("Job inexistente");
    err.status = 404;
    throw err;
  }
  if (job.estado !== APPLYABLE_ESTADO) {
    const err = new Error("Job no esta pendiente de confirmacion");
    err.status = 409;
    throw err;
  }
  if (arr(job.errors).length > 0) {
    const err = new Error("Job contiene errores de dry-run");
    err.status = 409;
    throw err;
  }
  if (!job.applyPlan || typeof job.applyPlan !== "object") {
    const err = new Error("Job no tiene applyPlan persistido");
    err.status = 409;
    throw err;
  }
  const totalOps =
    arr(job.applyPlan.creates).length + arr(job.applyPlan.updates).length + bajaLogicaViviendaItems(job).length;
  if (totalOps === 0) {
    const err = new Error("ApplyPlan vacio");
    err.status = 409;
    throw err;
  }
  const blockedCount = arr(job.applyPlan.blocked).length;
  const approvals = approvedTokens(job);
  const unapprovedRisks = unapproved(job.applyPlan.risks, approvals);
  const unapprovedManualReview = unapproved(job.applyPlan.requiresManualReview, approvals);
  if (blockedCount > 0 || unapprovedRisks.length > 0 || unapprovedManualReview.length > 0) {
    const err = new Error("ApplyPlan contiene operaciones bloqueadas, riesgos o revision manual");
    err.status = 409;
    err.applyResult = {
      createsApplied: 0,
      updatesApplied: 0,
      skipped: 0,
      blocked: blockedCount,
      unapprovedRisks: unapprovedRisks.length,
      unapprovedManualReview: unapprovedManualReview.length,
      errors: [{ message: err.message }],
    };
    throw err;
  }
}

function resultBase() {
  return {
    createsApplied: 0,
    updatesApplied: 0,
    skipped: 0,
    blocked: 0,
    unapprovedRisks: 0,
    unapprovedManualReview: 0,
    errors: [],
  };
}

function clasePorCapacidad(capacidad) {
  const value = Number(capacidad || 0);
  if (value === 1) return "C01";
  if (value === 2) return "C02";
  if (value === 3) return "C03";
  if (value === 4) return "C04";
  return "CUSO";
}

function numeroDesdeCodigo(codigo) {
  const normalized = clean(codigo).toUpperCase();
  const parts = normalized.split(/[-_/]/).filter(Boolean);
  return parts[parts.length - 1] || normalized || "S/N";
}

function alojamientoOcupacionActual(alojamiento) {
  const ocupacion = alojamiento?.ocupacionActual || {};
  return {
    plazasOcupadas: Number(ocupacion.plazasOcupadas || 0),
    plazasReservadas: Number(ocupacion.plazasReservadas || 0),
    alojados: arr(ocupacion.alojados),
    estado: String(alojamiento?.estado || "").toUpperCase().trim(),
  };
}

function alojamientoOcupadoReal(alojamiento) {
  const ocupacion = alojamientoOcupacionActual(alojamiento);
  return (
    ocupacion.plazasOcupadas > 0 ||
    ocupacion.plazasReservadas > 0 ||
    ocupacion.alojados.length > 0 ||
    ESTADOS_ALOJAMIENTO_OCUPADO_REAL.has(ocupacion.estado)
  );
}

function alojamientoOcupacionComprometida(alojamiento) {
  const ocupacion = alojamientoOcupacionActual(alojamiento);
  return ocupacion.plazasOcupadas + ocupacion.plazasReservadas;
}

function pushApplyError(result, key, message, extra = {}) {
  result.skipped += 1;
  result.errors.push({ key, message, ...extra });
}

function requireManualApproval(job, tipo, key, result) {
  if (approvedManualReview(job, tipo, key)) return true;
  pushApplyError(result, key, `Alojamiento requiere aprobacion manual ${tipo}`, { tipo });
  return false;
}

async function applyPersonalCreate(operation, session, result) {
  const item = operation.preview || {};
  const grupoJerarquico = validGrupoJerarquico(item.grupoJerarquico);
  if (!item.matricula || !item.dni || !item.tipoPersonal || !item.grupoJerarquico || item.precedencia == null) {
    result.skipped += 1;
    result.errors.push({ key: operation.key, message: "Personal CREATE incompleto" });
    return;
  }
  if (!grupoJerarquico) {
    result.skipped += 1;
    result.errors.push({ key: operation.key, message: "Personal CREATE con grupoJerarquico invalido" });
    return;
  }

  const existing = await User.findOne({
    $or: [{ matricula: item.matricula }, { dni: item.dni }],
  }).session(session);
  if (existing) {
    result.skipped += 1;
    return;
  }

  const name = splitNombreApellido(item.nombreApellido || `${item.nombre || ""} ${item.apellido || ""}`);
  await User.create(
    [
      {
        nombre: item.nombre || name.nombre,
        apellido: item.apellido || name.apellido,
        email: item.email || syntheticEmail(item),
        dni: item.dni,
        matricula: item.matricula,
        tipoPersonal: item.tipoPersonal,
        grupoJerarquico,
        precedencia: item.precedencia,
        passwordHash: await buildPasswordHash(),
        mustChangePassword: true,
        createdBy: operation.actorId || null,
        meta: { origen: "BASES_MAESTRAS_APPLY" },
      },
    ],
    { session }
  );
  result.createsApplied += 1;
}

async function applyPersonalUpdate(operation, session, result) {
  const item = operation.preview || {};
  const set = {};
  for (const cambio of arr(item.cambios)) {
    if (cambio.campo === "tipoPersonal") set.tipoPersonal = cambio.nuevo;
    if (cambio.campo === "grupoJerarquico") {
      const grupoJerarquico = validGrupoJerarquico(cambio.nuevo);
      if (!grupoJerarquico) {
        result.skipped += 1;
        result.errors.push({ key: operation.key, message: "Personal UPDATE con grupoJerarquico invalido" });
        return;
      }
      set.grupoJerarquico = grupoJerarquico;
    }
    if (cambio.campo === "precedencia") set.precedencia = cambio.nuevo;
  }
  if (Object.keys(set).length === 0) {
    result.skipped += 1;
    return;
  }
  const filter = item.matricula ? { matricula: item.matricula } : { dni: item.dni };
  const update = await User.updateOne(filter, { $set: set }, { session });
  if (update.modifiedCount > 0 || update.matchedCount > 0) result.updatesApplied += 1;
  else result.skipped += 1;
}

async function applyViviendaCreate(operation, session, result) {
  const item = operation.preview || {};
  if (!item.codigo || !item.barrio) {
    result.skipped += 1;
    result.errors.push({ key: operation.key, message: "Vivienda CREATE incompleta" });
    return;
  }
  const tipoDestino = validTipoDestino(item.tipoDestino);
  if (!tipoDestino) {
    result.skipped += 1;
    result.errors.push({ key: operation.key, message: "Vivienda CREATE sin tipoDestino valido" });
    return;
  }
  const existing = await Vivienda.findOne({ codigo: item.codigo }).session(session);
  if (existing) {
    result.skipped += 1;
    return;
  }
  await Vivienda.create(
    [
      {
        codigo: item.codigo,
        barrio: item.barrio,
        dormitorios: Number(item.dormitorios || 0),
        tipoDestino,
      },
    ],
    { session }
  );
  result.createsApplied += 1;
}

async function applyViviendaUpdate(operation, session, result) {
  const item = operation.preview || {};
  const set = {};
  for (const cambio of arr(item.cambios)) {
    if (cambio.campo === "barrio") set.barrio = cambio.nuevo;
    if (cambio.campo === "dormitorios") set.dormitorios = Number(cambio.nuevo);
    if (cambio.campo === "tipoDestino") {
      const tipoDestino = validTipoDestino(cambio.nuevo);
      if (!tipoDestino) {
        result.skipped += 1;
        result.errors.push({ key: operation.key, message: "Vivienda UPDATE con tipoDestino invalido" });
        return;
      }
      set.tipoDestino = tipoDestino;
    }
  }
  if (Object.keys(set).length === 0) {
    result.skipped += 1;
    return;
  }
  const update = await Vivienda.updateOne({ codigo: item.codigo }, { $set: set }, { session });
  if (update.modifiedCount > 0 || update.matchedCount > 0) result.updatesApplied += 1;
  else result.skipped += 1;
}

async function applyViviendaBajaLogica({ job, item, actorId, session, result }) {
  const key = approvalKey(item?.key);
  const approval = approvedManualReview(job, BAJA_LOGICA_VIVIENDA, key);
  if (!approval) {
    result.skipped += 1;
    result.errors.push({ key, message: "Baja logica de vivienda sin aprobacion manual" });
    return;
  }

  const vivienda = await Vivienda.findOne({ codigo: key }).session(session);
  if (!vivienda) {
    result.skipped += 1;
    result.errors.push({ key, message: "Vivienda BAJA_LOGICA inexistente" });
    return;
  }

  const estadoAnterior = String(vivienda.estado || "").toUpperCase().trim();
  if (!ESTADOS_VIVIENDA_BAJA_LOGICA.has(estadoAnterior)) {
    result.skipped += 1;
    result.errors.push({ key, message: "Vivienda BAJA_LOGICA con estado no permitido" });
    return;
  }

  if (estadoAnterior === "BAJA") {
    result.skipped += 1;
    return;
  }

  const motivo = clean(approval.motivo);
  const observacion = `Baja logica aprobada por ADMIN_GENERAL desde Bases Maestras. Motivo: ${motivo}`.slice(0, 500);
  const actor = approval.approvedBy || actorId || null;
  const update = await Vivienda.updateOne(
    { _id: vivienda._id, estado: estadoAnterior },
    {
      $set: { estado: "BAJA" },
      $push: {
        historialEstados: {
          fecha: new Date(),
          actor,
          estadoAnterior,
          estadoNuevo: "BAJA",
          observacion,
          forzado: false,
        },
      },
    },
    { session }
  );

  if (update.modifiedCount > 0 || update.matchedCount > 0) result.updatesApplied += 1;
  else {
    result.skipped += 1;
    result.errors.push({ key, message: "No se pudo aplicar baja logica de vivienda" });
  }
}

async function applyAlojamientoCreate(operation, session, result) {
  const item = operation.preview || {};
  const key = operation.key || item.codigo;
  const capacidad = Number(item.capacidad);
  const generoPermitido = validGeneroAlojamiento(item.generoPermitido);
  const aptoParaGrupoJerarquico = validGrupoJerarquico(item.aptoParaGrupoJerarquico || "NO_DEFINIDO");
  const estado = validEstadoAlojamiento(item.estado || "DISPONIBLE");

  if (!item.codigo || !item.dependencia || !item.lugar || !item.capacidad || !item.generoPermitido) {
    pushApplyError(result, key, "Alojamiento CREATE incompleto");
    return;
  }
  if (!Number.isInteger(capacidad) || capacidad < 1) {
    pushApplyError(result, key, "Alojamiento CREATE con capacidad invalida");
    return;
  }
  if (!generoPermitido) {
    pushApplyError(result, key, "Alojamiento CREATE con generoPermitido invalido");
    return;
  }
  if (!aptoParaGrupoJerarquico) {
    pushApplyError(result, key, "Alojamiento CREATE con aptoParaGrupoJerarquico invalido");
    return;
  }
  if (!estado) {
    pushApplyError(result, key, "Alojamiento CREATE con estado invalido");
    return;
  }

  const existing = await AlojamientoNaval.findOne({ codigo: item.codigo }).session(session);
  if (existing) {
    result.skipped += 1;
    return;
  }

  await AlojamientoNaval.create(
    [
      {
        codigo: item.codigo,
        denominacion: item.denominacion || "",
        dependencia: item.dependencia,
        lugar: item.lugar,
        sector: item.sector || "",
        tipo: item.denominacion || item.sector || "BASE_MAESTRA",
        numero: numeroDesdeCodigo(item.codigo),
        clase: clasePorCapacidad(capacidad),
        capacidad,
        generoPermitido,
        aptoParaGrupoJerarquico,
        estado,
        activo: item.activo !== false,
        observaciones: item.observaciones || "",
        ocupacionActual: {
          plazasTotales: 0,
          plazasOcupadas: 0,
          plazasReservadas: 0,
          alojados: [],
          actualizadoEn: new Date(),
        },
      },
    ],
    { session }
  );
  result.createsApplied += 1;
}

async function applyAlojamientoUpdate(operation, session, result, job) {
  const item = operation.preview || {};
  const key = operation.key || item.codigo;
  const alojamiento = await AlojamientoNaval.findOne({ codigo: item.codigo }).session(session);
  if (!alojamiento) {
    pushApplyError(result, key, "Alojamiento UPDATE inexistente");
    return;
  }

  const ocupado = alojamientoOcupadoReal(alojamiento);
  const ocupacionComprometida = alojamientoOcupacionComprometida(alojamiento);
  const set = {};

  for (const cambio of arr(item.cambios)) {
    if (!ALOJAMIENTO_UPDATE_FIELDS.has(cambio.campo)) continue;

    if (cambio.campo === "generoPermitido") {
      const generoPermitido = validGeneroAlojamiento(cambio.nuevo);
      if (!generoPermitido) {
        pushApplyError(result, key, "Alojamiento UPDATE con generoPermitido invalido");
        return;
      }
      if (ocupado && !requireManualApproval(job, "CAMBIO_GENERO_ALOJAMIENTO_OCUPADO", key, result)) return;
      set.generoPermitido = generoPermitido;
    } else if (cambio.campo === "aptoParaGrupoJerarquico") {
      const aptoParaGrupoJerarquico = validGrupoJerarquico(cambio.nuevo);
      if (!aptoParaGrupoJerarquico) {
        pushApplyError(result, key, "Alojamiento UPDATE con aptoParaGrupoJerarquico invalido");
        return;
      }
      if (ocupado && !requireManualApproval(job, "CAMBIO_GRUPO_ALOJAMIENTO_OCUPADO", key, result)) return;
      set.aptoParaGrupoJerarquico = aptoParaGrupoJerarquico;
    } else if (cambio.campo === "capacidad") {
      const capacidadNueva = Number(cambio.nuevo);
      const capacidadActual = Number(alojamiento.capacidad || 0);
      const reduceCapacidad = capacidadNueva < capacidadActual;
      if (!Number.isInteger(capacidadNueva) || capacidadNueva < 1) {
        pushApplyError(result, key, "Alojamiento UPDATE con capacidad invalida");
        return;
      }
      if (capacidadNueva < ocupacionComprometida) {
        pushApplyError(result, key, "REDUCCION_CAPACIDAD_INCOMPATIBLE_BLOQUEADA", {
          tipo: "REDUCCION_CAPACIDAD_INCOMPATIBLE_BLOQUEADA",
        });
        return;
      }
      if (ocupado && reduceCapacidad && !requireManualApproval(job, "REDUCCION_CAPACIDAD_ALOJAMIENTO", key, result)) return;
      if (ocupado && !reduceCapacidad && !requireManualApproval(job, "CAMBIO_CAPACIDAD_ALOJAMIENTO_OCUPADO", key, result)) return;
      set.capacidad = capacidadNueva;
      set.clase = clasePorCapacidad(capacidadNueva);
    } else if (cambio.campo === "estado") {
      const estado = validEstadoAlojamiento(cambio.nuevo);
      if (!estado) {
        pushApplyError(result, key, "Alojamiento UPDATE con estado invalido");
        return;
      }
      if (ocupado && ESTADOS_ALOJAMIENTO_BLOQUEO_OCUPADO.has(estado)) {
        pushApplyError(
          result,
          key,
          estado === "BAJA" ? "BAJA_ALOJAMIENTO_OCUPADO_BLOQUEADA" : "INHABILITADO_ALOJAMIENTO_OCUPADO_BLOQUEADO",
          { tipo: estado === "BAJA" ? "BAJA_ALOJAMIENTO_OCUPADO_BLOQUEADA" : "INHABILITADO_ALOJAMIENTO_OCUPADO_BLOQUEADO" }
        );
        return;
      }
      if (ocupado && ESTADOS_ALOJAMIENTO_CRITICOS.has(estado) && !requireManualApproval(job, "ESTADO_CRITICO_ALOJAMIENTO_OCUPADO", key, result)) return;
      if (ocupado && !ESTADOS_ALOJAMIENTO_CRITICOS.has(estado) && !requireManualApproval(job, "CAMBIO_ESTADO_ALOJAMIENTO_OCUPADO", key, result)) return;
      set.estado = estado;
    } else if (cambio.campo === "activo") {
      const activo = cambio.nuevo !== false;
      if (ocupado && activo === false && !requireManualApproval(job, "CAMBIO_ACTIVO_ALOJAMIENTO_OCUPADO", key, result)) return;
      set.activo = activo;
    } else {
      set[cambio.campo] = cambio.nuevo;
    }
  }
  if (Object.keys(set).length === 0) {
    result.skipped += 1;
    return;
  }
  const update = await AlojamientoNaval.updateOne({ _id: alojamiento._id }, { $set: set }, { session });
  if (update.modifiedCount > 0 || update.matchedCount > 0) result.updatesApplied += 1;
  else result.skipped += 1;
}

async function applyOperation(operation, session, result, actorId, job) {
  const op = { ...operation, actorId };
  if (operation.collection === "users" && operation.action === "CREATE") return applyPersonalCreate(op, session, result);
  if (operation.collection === "users" && operation.action === "UPDATE") return applyPersonalUpdate(op, session, result);
  if (operation.collection === "viviendas" && operation.action === "CREATE") return applyViviendaCreate(op, session, result);
  if (operation.collection === "viviendas" && operation.action === "UPDATE") return applyViviendaUpdate(op, session, result);
  if (operation.collection === "alojamientos" && operation.action === "CREATE") return applyAlojamientoCreate(op, session, result);
  if (operation.collection === "alojamientos" && operation.action === "UPDATE") return applyAlojamientoUpdate(op, session, result, job);
  result.blocked += 1;
  result.errors.push({ key: operation.key, message: "Operacion no permitida" });
  return null;
}

async function executeApply({ job, actorId, markApplied, markFailed }) {
  assertApplyable(job);

  const session = await mongoose.startSession();
  if (!session || typeof session.withTransaction !== "function") {
    const err = new Error("Transacciones Mongo no disponibles");
    err.status = 503;
    throw err;
  }

  const result = resultBase();

  try {
    await session.withTransaction(async () => {
      for (const operation of arr(job.applyPlan.creates)) {
        await applyOperation(operation, session, result, actorId, job);
      }
      for (const operation of arr(job.applyPlan.updates)) {
        await applyOperation(operation, session, result, actorId, job);
      }
      for (const item of bajaLogicaViviendaItems(job)) {
        await applyViviendaBajaLogica({ job, item, actorId, session, result });
      }
      if (result.errors.length > 0) {
        const err = new Error("Apply abortado por errores de operacion");
        err.status = 409;
        throw err;
      }
      await markApplied(result, session);
    });
    return result;
  } catch (err) {
    const failedResult = {
      ...result,
      errors: [...result.errors, { message: err.message || "Error interno" }],
    };
    // FALLIDO is persisted in its own transaction after the operational transaction aborts.
    // This keeps legacy writes rolled back while still requiring a Mongo session for apply writes.
    await session.withTransaction(async () => {
      await markFailed(failedResult, session);
    });
    err.applyResult = result;
    throw err;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  executeApply,
};
