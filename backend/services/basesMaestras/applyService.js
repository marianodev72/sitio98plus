const mongoose = require("mongoose");

const { User } = require("../../models/user");
const Vivienda = require("../../models/vivienda");
const AlojamientoNaval = require("../../modules/alojamientos/models/AlojamientoNaval");
const AlojamientoPlaza = require("../../modules/alojamientos/models/AlojamientoPlaza");
const AsignacionAlojamiento = require("../../modules/alojamientos/models/AsignacionAlojamiento");
const AlojamientoDocumento = require("../../modules/alojamientos/models/AlojamientoDocumento");
const { MODOS_CARGA } = require("../../models/MasterImportJob");
const {
  ALOJAMIENTO_ESTADOS,
  GENERO_PERMITIDO,
} = require("../../modules/alojamientos/constants/alojamientoConstants");
const { normalizeTipoDestinoStrict } = require("../../constants/institucional");
const { buildApplyPlan } = require("./applyPlanService");

const APPLYABLE_ESTADO = "PENDIENTE_CONFIRMACION";
const APPLYING_ESTADO = "APLICANDO";
const PERSONAL_MASSIVE_BATCH_SIZE = Math.max(50, Math.min(1000, Number(process.env.BASES_MAESTRAS_PERSONAL_BATCH_SIZE || 250)));
const MAX_APPLY_ERRORS = Math.max(10, Math.min(200, Number(process.env.BASES_MAESTRAS_APPLY_MAX_ERRORS || 50)));
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
const MODOS_CARGA_SET = new Set(MODOS_CARGA);

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function idString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  return String(value);
}

function pushCompactError(result, error) {
  if (result.errors.length < MAX_APPLY_ERRORS) result.errors.push(error);
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

function approvalGroupToken(item) {
  return `${approvalTipo(item?.tipo)}::*`;
}

function approvedTokens(job) {
  const tokens = new Set();
  for (const approval of arr(job.manualApprovals)) {
    if (approval?.approved) tokens.add(approvalToken(approval));
  }
  return tokens;
}

function unapproved(items, tokens, options = {}) {
  return arr(items).filter((item) => {
    if (tokens.has(approvalToken(item))) return false;
    if (options.allowGroupedApprovals && tokens.has(approvalGroupToken(item))) return false;
    return true;
  });
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

function assertApplyable(job) {
  if (!job) {
    const err = new Error("Job inexistente");
    err.status = 404;
    throw err;
  }
  if (job.estado !== APPLYABLE_ESTADO && !(job.__isPersonalLargeApply && job.estado === APPLYING_ESTADO)) {
    const err = new Error("Job no esta pendiente de confirmacion");
    err.status = 409;
    throw err;
  }
  if (!MODOS_CARGA_SET.has(String(job.modoCarga || "").toUpperCase().trim())) {
    const err = new Error("Job sin modoCarga valido. Requiere revision y nuevo dry-run con modo de carga explicito.");
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
  const approvalOptions = { allowGroupedApprovals: Boolean(job.__allowGroupedApprovals) };
  const unapprovedRisks = unapproved(job.applyPlan.risks, approvals, approvalOptions);
  const unapprovedManualReview = unapproved(job.applyPlan.requiresManualReview, approvals, approvalOptions);
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

function prepareApplyJob(job) {
  if (job?.tipo !== "PERSONAL" || !job?.applyPlan?.isLargePlan) return job;
  return {
    ...job,
    __isPersonalLargeApply: true,
    __allowGroupedApprovals: true,
    applyPlan: buildApplyPlan(job, { full: true }),
  };
}

function resultBase() {
  return {
    createsApplied: 0,
    updatesApplied: 0,
    excluded: 0,
    batchCount: 0,
    processedCreates: 0,
    processedUpdates: 0,
    startedAt: null,
    finishedAt: null,
    skipped: 0,
    blocked: 0,
    unapprovedRisks: 0,
    unapprovedManualReview: 0,
    plazasCreadas: [],
    legacyBajas: [],
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
  pushCompactError(result, { key, message, ...extra });
}

function requireManualApproval(job, tipo, key, result) {
  if (approvedManualReview(job, tipo, key)) return true;
  pushApplyError(result, key, `Alojamiento requiere aprobacion manual ${tipo}`, { tipo });
  return false;
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
  const update = await User.updateOne(filter, { $set: set }, { session, strict: false });
  if (update.modifiedCount > 0 || update.matchedCount > 0) result.updatesApplied += 1;
  else result.skipped += 1;
}

function personalUpdateSet(item, result, key) {
  const set = {};
  for (const cambio of arr(item.cambios)) {
    if (cambio.campo === "tipoPersonal") set.tipoPersonal = cambio.nuevo;
    if (cambio.campo === "grupoJerarquico") {
      const grupoJerarquico = validGrupoJerarquico(cambio.nuevo);
      if (!grupoJerarquico) {
        pushApplyError(result, key, "Personal UPDATE con grupoJerarquico invalido");
        return null;
      }
      set.grupoJerarquico = grupoJerarquico;
    }
    if (cambio.campo === "precedencia") set.precedencia = cambio.nuevo;
  }
  if (Object.keys(set).length === 0) {
    result.skipped += 1;
    return null;
  }
  return set;
}

async function applyPersonalUpdateBatch(operations, result) {
  const prepared = [];
  const ids = [];
  const matriculas = [];
  const dnis = [];

  for (const operation of operations) {
    const item = operation.preview || {};
    const set = personalUpdateSet(item, result, operation.key);
    if (!set) continue;
    const existingId = idString(item.existente?._id);
    prepared.push({ operation, item, set, existingId });
    if (existingId && mongoose.Types.ObjectId.isValid(existingId)) ids.push(existingId);
    if (item.matricula) matriculas.push(clean(item.matricula));
    if (item.dni) dnis.push(normDni(item.dni));
  }
  if (!prepared.length) return;

  const or = [];
  if (ids.length) or.push({ _id: { $in: ids } });
  if (matriculas.length) or.push({ matricula: { $in: [...new Set(matriculas)] } });
  if (dnis.length) or.push({ dni: { $in: [...new Set(dnis)] } });
  const users = or.length ? await User.find({ $or: or }).select("_id matricula dni").lean() : [];
  const byId = new Map(users.map((user) => [idString(user._id), user]));
  const byMatricula = new Map(users.filter((user) => user.matricula).map((user) => [String(user.matricula), user]));
  const byDni = new Map(users.filter((user) => user.dni).map((user) => [normDni(user.dni), user]));

  const bulk = [];
  for (const { operation, item, set, existingId } of prepared) {
    let target = existingId ? byId.get(existingId) : null;
    if (!target) {
      const existingByMatricula = item.matricula ? byMatricula.get(clean(item.matricula)) : null;
      const existingByDni = item.dni ? byDni.get(normDni(item.dni)) : null;
      if (
        existingByMatricula &&
        existingByDni &&
        idString(existingByMatricula._id) !== idString(existingByDni._id)
      ) {
        pushApplyError(result, operation.key, "Personal UPDATE con identidad ambigua matricula/DNI");
        continue;
      }
      target = existingByMatricula || existingByDni || null;
    }
    if (!target) {
      pushApplyError(result, operation.key, "Personal UPDATE sin usuario inequivoco");
      continue;
    }

    bulk.push({
      updateOne: {
        filter: { _id: target._id },
        update: { $set: set },
      },
    });
  }

  if (!bulk.length) return;
  try {
    const write = await User.bulkWrite(bulk, { ordered: false, strict: false });
    result.updatesApplied += Number(write.matchedCount || 0);
  } catch (err) {
    pushCompactError(result, { message: err.message || "Error bulk update personal" });
  }
}

async function applyPersonalOperationsInBatches(operations, type, actorId, result, updateProgress) {
  for (let index = 0; index < operations.length; index += PERSONAL_MASSIVE_BATCH_SIZE) {
    const batch = operations.slice(index, index + PERSONAL_MASSIVE_BATCH_SIZE);
    if (type === "creates") {
      for (const operation of batch) pushApplyError(result, operation.key, "Personal CREATE no permitido: hidratacion only");
    } else {
      await applyPersonalUpdateBatch(batch, result);
    }
    result.batchCount += 1;
    if (type === "creates") result.processedCreates += batch.length;
    else result.processedUpdates += batch.length;
    if (typeof updateProgress === "function") await updateProgress(result);
    if (result.errors.length > 0) break;
  }
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

function plazaCodigo(alojamientoCodigo, numeroPlaza) {
  return `${String(alojamientoCodigo || "").toUpperCase()}-P${numeroPlaza}`;
}

async function applyCrearPlazasFaltantes(operation, session, result, actorId, job) {
  const item = operation.preview || {};
  const key = operation.key || item.codigoArchivo || item.codigoDb || "";
  if (job?.tipo !== "ALOJAMIENTOS") {
    pushApplyError(result, key, "Creacion de plazas faltantes solo permitida para Bases Maestras ALOJAMIENTOS");
    return;
  }
  if (operation.action !== "CREAR_PLAZAS_FALTANTES" || item.classification !== "PLAZAS_DELTA" || item.accionPropuesta !== "CREAR_PLAZAS_FALTANTES") {
    pushApplyError(result, key, "Operacion de plazas no permitida en esta fase");
    return;
  }
  if (["POSSIBLE_RENAME", "PROTECTED_TRANSIENT", "LEGACY_CANDIDATE", "CAPACIDAD_REDUCIDA_BLOQUEADA", "MISSING_FROM_FILE", "CONFLICT"].includes(item.classification)) {
    pushApplyError(result, key, "Clasificacion de alojamiento no aplicable para crear plazas faltantes");
    return;
  }
  if (!item.fila || !item.codigoArchivo) {
    pushApplyError(result, key, "Operacion de plazas sin referencia a fila del dry-run");
    return;
  }

  const alojamientoId = idString(item.alojamientoId);
  if (!mongoose.Types.ObjectId.isValid(alojamientoId)) {
    pushApplyError(result, key, "Operacion de plazas sin alojamientoId valido");
    return;
  }

  const alojamiento = await AlojamientoNaval.findById(alojamientoId).session(session);
  if (!alojamiento) {
    pushApplyError(result, key, "Alojamiento inexistente para crear plazas faltantes");
    return;
  }
  if (alojamiento.activo === false || String(alojamiento.estado || "").toUpperCase().trim() === "BAJA") {
    pushApplyError(result, key, "Alojamiento inactivo o en BAJA; no se crean plazas");
    return;
  }
  if (item.codigoDb && String(alojamiento.codigo || "").toUpperCase() !== String(item.codigoDb || "").toUpperCase()) {
    pushApplyError(result, key, "Codigo de alojamiento no coincide con el dry-run");
    return;
  }

  const plazasEsperadas = Number(item.plazasEsperadas || item.capacidadArchivo || 0);
  const deltaPlanificado = Number(item.deltaPlazas || item.plazasACrear || 0);
  if (!Number.isInteger(plazasEsperadas) || plazasEsperadas < 1 || !Number.isInteger(deltaPlanificado) || deltaPlanificado < 1) {
    pushApplyError(result, key, "Operacion de plazas con capacidad o delta invalido");
    return;
  }

  const plazasValidas = await AlojamientoPlaza.find({
    alojamiento: alojamiento._id,
    activo: { $ne: false },
    estado: { $ne: "BAJA" },
  })
    .select("_id")
    .session(session)
    .lean();
  const ultimaPlaza = await AlojamientoPlaza.findOne({ alojamiento: alojamiento._id })
    .sort({ numeroPlaza: -1 })
    .select("numeroPlaza")
    .session(session)
    .lean();

  const plazasAntes = plazasValidas.length;
  const deltaReal = plazasEsperadas - plazasAntes;
  if (deltaReal === 0) {
    result.skipped += 1;
    result.plazasCreadas.push({
      alojamientoId,
      codigo: alojamiento.codigo,
      plazasAntes,
      plazasEsperadas,
      plazasCreadas: 0,
      plazaIds: [],
      actor: idString(actorId),
      timestamp: new Date(),
      observacion: "Sin delta real al momento del apply",
    });
    return;
  }
  if (deltaReal < 0) {
    pushApplyError(result, key, "Delta real de plazas inconsistente: existen mas plazas validas que la capacidad esperada");
    return;
  }

  const cantidadCrear = Math.min(deltaReal, deltaPlanificado);
  const numeroInicial = Number(ultimaPlaza?.numeroPlaza || 0) + 1;
  const now = new Date();
  const docs = [];
  for (let i = 0; i < cantidadCrear; i += 1) {
    const numeroPlaza = numeroInicial + i;
    docs.push({
      codigo: plazaCodigo(alojamiento.codigo, numeroPlaza),
      alojamiento: alojamiento._id,
      numeroPlaza,
      estado: "LIBRE",
      activo: true,
      historial: [
        {
          accion: "CREACION_BASES_MAESTRAS",
          estadoNuevo: "LIBRE",
          realizadoPor: actorId || null,
          observacion: "Creacion de plaza faltante aprobada desde Bases Maestras",
        },
      ],
    });
  }

  const created = await AlojamientoPlaza.create(docs, { session });
  result.createsApplied += created.length;
  result.plazasCreadas.push({
    alojamientoId,
    codigo: alojamiento.codigo,
    plazasAntes,
    plazasEsperadas,
    plazasCreadas: created.length,
    plazaIds: created.map((plaza) => idString(plaza._id)),
    actor: idString(actorId),
    timestamp: now,
  });
}

function isCodigoProtectedTransient(codigo) {
  return /^BR-/i.test(String(codigo || "").trim());
}

function plazaTieneReserva(reservaActual) {
  return Boolean(reservaActual?.usuario || reservaActual?.anexoId);
}

function plazaActivaNoBaja(plaza) {
  return plaza?.activo !== false && String(plaza?.estado || "").toUpperCase().trim() !== "BAJA";
}

function plazaLibreSinVinculo(plaza) {
  return !plaza.alojadoActual && !plazaTieneReserva(plaza.reservaActual) && String(plaza.estado || "").toUpperCase().trim() === "LIBRE";
}

function alojamientoTieneOcupacionCache(alojamiento) {
  const ocupacion = alojamiento?.ocupacionActual || {};
  return (
    Number(ocupacion.plazasOcupadas || 0) > 0 ||
    Number(ocupacion.plazasReservadas || 0) > 0 ||
    arr(ocupacion.alojados).length > 0
  );
}

async function applyBajaLogicaLegacyAlojamiento(operation, session, result, actorId, job) {
  const item = operation.preview || {};
  const key = operation.key || item.codigoDb || item.codigo || "";
  if (job?.tipo !== "ALOJAMIENTOS") {
    pushApplyError(result, key, "Baja logica legacy solo permitida para Bases Maestras ALOJAMIENTOS");
    return;
  }
  if (operation.action !== "BAJA_LOGICA_LEGACY" || item.classification !== "LEGACY_CANDIDATE" || item.accionPropuesta !== "BAJA_LOGICA_LEGACY") {
    pushApplyError(result, key, "Operacion legacy no permitida en esta fase");
    return;
  }
  if (["POSSIBLE_RENAME", "PROTECTED_TRANSIENT", "CAPACIDAD_REDUCIDA_BLOQUEADA", "MISSING_FROM_FILE", "CONFLICT"].includes(item.classification)) {
    pushApplyError(result, key, "Clasificacion de alojamiento no aplicable para baja logica legacy");
    return;
  }
  if (!requireManualApproval(job, "LEGACY_CANDIDATE", key, result)) return;

  const alojamientoId = idString(item.alojamientoId);
  if (!mongoose.Types.ObjectId.isValid(alojamientoId)) {
    pushApplyError(result, key, "Operacion legacy sin alojamientoId valido");
    return;
  }

  const alojamiento = await AlojamientoNaval.findById(alojamientoId).session(session);
  if (!alojamiento) {
    pushApplyError(result, key, "Alojamiento inexistente para baja logica legacy");
    return;
  }
  const codigo = String(alojamiento.codigo || "").toUpperCase().trim();
  if (isCodigoProtectedTransient(codigo)) {
    pushApplyError(result, key, "BR-* protegido: no se aplica baja logica legacy");
    return;
  }
  if (item.codigoDb && codigo !== String(item.codigoDb || "").toUpperCase().trim()) {
    pushApplyError(result, key, "Codigo de alojamiento legacy no coincide con el dry-run");
    return;
  }

  const now = new Date();
  const motivo = "LEGACY_REEMPLAZADO_POR_BASE_MAESTRA";
  const plazas = await AlojamientoPlaza.find({ alojamiento: alojamiento._id })
    .select("_id codigo numeroPlaza estado activo alojadoActual reservaActual")
    .session(session)
    .lean();
  const plazaIds = plazas.map((plaza) => plaza._id).filter(Boolean);
  const plazasValidas = plazas.filter(plazaActivaNoBaja);

  const asignacionesCount = await AsignacionAlojamiento.countDocuments({
    $or: [{ alojamiento: alojamiento._id }, { plaza: { $in: plazaIds } }],
  }).session(session);
  const documentosCount = await AlojamientoDocumento.countDocuments({
    activo: { $ne: false },
    $or: [{ alojamiento: alojamiento._id }, { plaza: { $in: plazaIds } }],
  }).session(session);
  const plazasConVinculo = plazasValidas.filter((plaza) => !plazaLibreSinVinculo(plaza));

  if (asignacionesCount > 0 || documentosCount > 0 || plazasConVinculo.length > 0 || alojamientoTieneOcupacionCache(alojamiento)) {
    pushApplyError(result, key, "Baja logica legacy bloqueada: el alojamiento o sus plazas tienen vinculos administrativos");
    return;
  }

  if (alojamiento.activo === false || String(alojamiento.estado || "").toUpperCase().trim() === "BAJA") {
    result.skipped += 1;
    result.legacyBajas.push({
      alojamientoId,
      codigo,
      plazasAntes: plazasValidas.length,
      plazasBajadas: 0,
      plazaIds: [],
      motivo,
      actor: idString(actorId),
      timestamp: now,
      observacion: "Alojamiento legacy ya estaba en baja o inactivo",
    });
    return;
  }

  const plazaIdsBajar = plazasValidas.map((plaza) => plaza._id);
  let plazasBajadas = 0;
  if (plazaIdsBajar.length) {
    const plazaUpdate = await AlojamientoPlaza.updateMany(
      { _id: { $in: plazaIdsBajar }, alojamiento: alojamiento._id },
      {
        $set: { activo: false, estado: "BAJA" },
        $push: {
          historial: {
            accion: "BAJA_LOGICA_LEGACY_BASES_MAESTRAS",
            estadoAnterior: "LIBRE",
            estadoNuevo: "BAJA",
            realizadoPor: actorId || null,
            observacion: motivo,
            fecha: now,
          },
        },
      },
      { session }
    );
    plazasBajadas = Number(plazaUpdate.modifiedCount || 0);
  }

  const observacionActual = String(alojamiento.observaciones || "").trim();
  const observacionLegacy = observacionActual.includes(motivo)
    ? observacionActual
    : [observacionActual, motivo].filter(Boolean).join(" | ");
  await AlojamientoNaval.updateOne(
    { _id: alojamiento._id },
    {
      $set: {
        activo: false,
        estado: "BAJA",
        observaciones: observacionLegacy,
      },
      $push: {
        historialEstados: {
          estadoAnterior: alojamiento.estado,
          estadoNuevo: "BAJA",
          realizadoPor: actorId || null,
          motivo,
          origen: "BASES_MAESTRAS",
          fecha: now,
        },
      },
    },
    { session }
  );

  result.updatesApplied += 1;
  result.legacyBajas.push({
    alojamientoId,
    codigo,
    plazasAntes: plazasValidas.length,
    plazasBajadas,
    plazaIds: plazaIdsBajar.map(idString),
    motivo,
    actor: idString(actorId),
    timestamp: now,
  });
}

async function applyOperation(operation, session, result, actorId, job) {
  const op = { ...operation, actorId };
  if (operation.collection === "users" && operation.action === "CREATE") {
    pushApplyError(result, operation.key, "Personal CREATE no permitido: hidratacion only");
    return null;
  }
  if (operation.collection === "users" && operation.action === "UPDATE") return applyPersonalUpdate(op, session, result);
  if (operation.collection === "viviendas" && operation.action === "CREATE") return applyViviendaCreate(op, session, result);
  if (operation.collection === "viviendas" && operation.action === "UPDATE") return applyViviendaUpdate(op, session, result);
  if (operation.collection === "alojamientos" && operation.action === "CREATE") return applyAlojamientoCreate(op, session, result);
  if (operation.collection === "alojamientos" && operation.action === "UPDATE") return applyAlojamientoUpdate(op, session, result, job);
  if (operation.collection === "alojamientos" && operation.action === "BAJA_LOGICA_LEGACY") {
    return applyBajaLogicaLegacyAlojamiento(op, session, result, actorId, job);
  }
  if (operation.collection === "alojamientoPlazas") {
    if (operation.action === "CREAR_PLAZAS_FALTANTES") return applyCrearPlazasFaltantes(op, session, result, actorId, job);
    pushApplyError(result, operation.key, "Operacion de sincronizacion de plazas requiere fase de apply especifica y aprobacion explicita.");
    return null;
  }
  result.blocked += 1;
  result.errors.push({ key: operation.key, message: "Operacion no permitida" });
  return null;
}

async function executeApply({ job, actorId, markApplied, markFailed, updateProgress }) {
  const applyJob = prepareApplyJob(job);
  assertApplyable(applyJob);

  if (applyJob.__isPersonalLargeApply) {
    return executePersonalLargeApply({ applyJob, actorId, markApplied, markFailed, updateProgress });
  }

  const session = await mongoose.startSession();
  if (!session || typeof session.withTransaction !== "function") {
    const err = new Error("Transacciones Mongo no disponibles");
    err.status = 503;
    throw err;
  }

  const result = resultBase();
  result.excluded = Number(applyJob.applyPlan?.totalExcluded ?? arr(applyJob.applyPlan?.excluded).length);

  try {
    await session.withTransaction(async () => {
      for (const operation of arr(applyJob.applyPlan.creates)) {
        await applyOperation(operation, session, result, actorId, applyJob);
      }
      for (const operation of arr(applyJob.applyPlan.updates)) {
        await applyOperation(operation, session, result, actorId, applyJob);
      }
      for (const item of bajaLogicaViviendaItems(applyJob)) {
        await applyViviendaBajaLogica({ job: applyJob, item, actorId, session, result });
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

async function executePersonalLargeApply({ applyJob, actorId, markApplied, markFailed, updateProgress }) {
  const result = resultBase();
  result.startedAt = new Date();
  result.excluded = Number(applyJob.applyPlan?.totalExcluded ?? arr(applyJob.applyPlan?.excluded).length);
  result.totalCreates = arr(applyJob.applyPlan.creates).length;
  result.totalUpdates = arr(applyJob.applyPlan.updates).length;
  result.batchSize = PERSONAL_MASSIVE_BATCH_SIZE;

  try {
    if (typeof updateProgress === "function") await updateProgress(result);
    if (arr(applyJob.applyPlan.creates).length > 0) {
      await applyPersonalOperationsInBatches(arr(applyJob.applyPlan.creates), "creates", actorId, result, updateProgress);
    }
    if (result.errors.length === 0) await applyPersonalOperationsInBatches(arr(applyJob.applyPlan.updates), "updates", actorId, result, updateProgress);
    result.finishedAt = new Date();
    if (result.errors.length > 0) {
      const err = new Error("Apply PERSONAL masivo abortado por errores de operacion");
      err.status = 409;
      throw err;
    }
    await markApplied(result, null);
    return result;
  } catch (err) {
    result.finishedAt = result.finishedAt || new Date();
    const failedResult = {
      ...result,
      errors: [...result.errors, { message: err.message || "Error interno" }],
    };
    await markFailed(failedResult, null);
    err.applyResult = result;
    throw err;
  }
}

module.exports = {
  executeApply,
};
