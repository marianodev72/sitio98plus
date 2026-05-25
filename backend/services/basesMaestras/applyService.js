const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const { User } = require("../../models/user");
const Vivienda = require("../../models/vivienda");

const APPLYABLE_ESTADO = "PENDIENTE_CONFIRMACION";

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return String(value || "").trim();
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
  const totalOps = arr(job.applyPlan.creates).length + arr(job.applyPlan.updates).length;
  if (totalOps === 0) {
    const err = new Error("ApplyPlan vacio");
    err.status = 409;
    throw err;
  }
  if (arr(job.applyPlan.blocked).length > 0 || arr(job.applyPlan.requiresManualReview).length > 0 || arr(job.applyPlan.risks).length > 0) {
    const err = new Error("ApplyPlan contiene operaciones bloqueadas, riesgos o revision manual");
    err.status = 409;
    err.applyResult = {
      createsApplied: 0,
      updatesApplied: 0,
      skipped: 0,
      blocked: arr(job.applyPlan.blocked).length,
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
    errors: [],
  };
}

async function applyPersonalCreate(operation, session, result) {
  const item = operation.preview || {};
  if (!item.matricula || !item.dni || !item.tipoPersonal || item.precedencia == null) {
    result.skipped += 1;
    result.errors.push({ key: operation.key, message: "Personal CREATE incompleto" });
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
        tipoDestino: item.tipoDestino || "MIXTO",
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
    if (cambio.campo === "tipoDestino") set.tipoDestino = cambio.nuevo;
  }
  if (Object.keys(set).length === 0) {
    result.skipped += 1;
    return;
  }
  const update = await Vivienda.updateOne({ codigo: item.codigo }, { $set: set }, { session });
  if (update.modifiedCount > 0 || update.matchedCount > 0) result.updatesApplied += 1;
  else result.skipped += 1;
}

async function applyOperation(operation, session, result, actorId) {
  const op = { ...operation, actorId };
  if (operation.collection === "users" && operation.action === "CREATE") return applyPersonalCreate(op, session, result);
  if (operation.collection === "users" && operation.action === "UPDATE") return applyPersonalUpdate(op, session, result);
  if (operation.collection === "viviendas" && operation.action === "CREATE") return applyViviendaCreate(op, session, result);
  if (operation.collection === "viviendas" && operation.action === "UPDATE") return applyViviendaUpdate(op, session, result);
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
        await applyOperation(operation, session, result, actorId);
      }
      for (const operation of arr(job.applyPlan.updates)) {
        await applyOperation(operation, session, result, actorId);
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
