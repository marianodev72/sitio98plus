"use strict";

// backend/controllers/ControllerAnexo11.js
// ANEXO_11 V2 — Maestro compatible
// P0: TRANSITIONS centralizado + validación previa a cambiarEstado()
// P0: Autonumeración atómica (counters + $inc)
// P1: estado (técnico) vs estadoInstitucional (semántico)
// P1: validaciones explícitas por acción (rol/permisos/territorialidad/ownership/interviniencia/estado)
// P1: allowlist por acción + sanitización estricta (no persistir req.body)
// Fail-closed + no-disclosure: { message: "Recurso no disponible" }

const mongoose = require("mongoose");

// ─────────────────────────────
// Helpers base

function up(v) {
  return String(v || "").trim().toUpperCase();
}
function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}
function blockPrototypeKeys(obj) {
  if (!isPlainObject(obj)) return obj;
  if (
    Object.prototype.hasOwnProperty.call(obj, "__proto__") ||
    Object.prototype.hasOwnProperty.call(obj, "constructor") ||
    Object.prototype.hasOwnProperty.call(obj, "prototype")
  ) {
    throw new Error("prototype-pollution");
  }
  return obj;
}
function pickString(v, max = 2000) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}
function pickEnum(v, allowed) {
  const x = up(v);
  return allowed.includes(x) ? x : "";
}
function pickBool(v) {
  if (v === true) return true;
  if (v === false) return false;
  return null;
}
function pickArrayText(v, { min = 0, max = 30, itemMax = 400 } = {}) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const raw of v.slice(0, max)) {
    if (typeof raw !== "string") continue;
    const s = raw.trim();
    if (!s) continue;
    out.push(s.length > itemMax ? s.slice(0, itemMax) : s);
  }
  return out.length >= min ? out : [];
}
function fullName(u) {
  const a = String(u?.apellido || "").trim();
  const n = String(u?.nombre || "").trim();
  const f = `${a} ${n}`.trim();
  return f || String(u?.email || "").trim() || "Usuario";
}

function roleUp(user) {
  return up(user?.role);
}
function isAdminReadOnly(user) {
  return roleUp(user) === "ADMIN";
}
function isAdminGeneral(user) {
  return roleUp(user) === "ADMIN_GENERAL";
}
function hasPerm(user, perm) {
  const p = user?.permisos;
  if (Array.isArray(p)) return p.map(up).includes(up(perm));
  if (typeof p === "string") return up(p) === up(perm);
  return false;
}
function isInspector(user) {
  // En tu sistema INSPECTOR opera como permiso (territorial)
  return hasPerm(user, "INSPECTOR") || roleUp(user) === "INSPECTOR";
}
function isJefeBarrio(user) {
  return hasPerm(user, "JEFE_DE_BARRIO") || roleUp(user) === "JEFE_DE_BARRIO";
}
function assertBarrioAssigned(user) {
  const barrio = String(user?.barrioAsignado || "").trim();
  if (!barrio) throw new Error("no-barrio");
  return barrio;
}
function assertCodigo11(sub) {
  if (up(sub?.codigo) !== "ANEXO_11") throw new Error("not-anexo11");
}

// ─────────────────────────────
// Separación: estado técnico vs institucional

function techState(sub) {
  return up(sub?.estado || "");
}
function instState(sub) {
  return up(sub?.estadoInstitucional || "");
}
function setInstState(sub, estadoInst) {
  sub.estadoInstitucional = String(estadoInst || "");
}

// Estados institucionales ANEXO_11
const INST = Object.freeze({
  BORRADOR: "BORRADOR",
  VISITA_PENDIENTE_AGENDA: "VISITA_PENDIENTE_AGENDA",
  VISITA_PENDIENTE_ACEPTACION_PERM: "VISITA_PENDIENTE_ACEPTACION_PERM",
  VISITA_CONFIRMADA: "VISITA_CONFIRMADA",
  RECHAZADO_POR_INSPECTOR: "RECHAZADO_POR_INSPECTOR",
  TAREA_PENDIENTE_PROGRAMACION: "TAREA_PENDIENTE_PROGRAMACION",
  TAREA_PENDIENTE_CONFIRMACION_PERM: "TAREA_PENDIENTE_CONFIRMACION_PERM",
  TAREA_CONFIRMADA: "TAREA_CONFIRMADA",
  CUMPLIMIENTO_PENDIENTE_ACEPTACION_PERM: "CUMPLIMIENTO_PENDIENTE_ACEPTACION_PERM",
  EN_REVISION_ADMIN_GENERAL: "EN_REVISION_ADMIN_GENERAL",
  DEVUELTO_A_INSPECTOR_POR_ADMIN_GENERAL: "DEVUELTO_A_INSPECTOR_POR_ADMIN_GENERAL",
  CERRADO_ADMIN_GENERAL: "CERRADO_ADMIN_GENERAL",
});

// Acciones institucionales
const ACTION = Object.freeze({
  ENVIAR_A_INSPECTOR: "ENVIAR_A_INSPECTOR",
  AGENDAR_VISITA: "AGENDAR_VISITA",
  ACEPTAR_VISITA: "ACEPTAR_VISITA",
  RESOLVER_POST_VISITA_ACEPTAR: "RESOLVER_POST_VISITA_ACEPTAR",
  RESOLVER_POST_VISITA_RECHAZAR: "RESOLVER_POST_VISITA_RECHAZAR",
  PROGRAMAR_TAREA: "PROGRAMAR_TAREA",
  CONFIRMAR_TAREA: "CONFIRMAR_TAREA",
  MARCAR_CUMPLIDO: "MARCAR_CUMPLIDO",
  ACEPTAR_CUMPLIMIENTO: "ACEPTAR_CUMPLIMIENTO",
  ADMIN_CERRAR: "ADMIN_CERRAR",
  ADMIN_DEVOLVER_A_INSPECTOR: "ADMIN_DEVOLVER_A_INSPECTOR",
});

// ✅ P0 — TRANSITIONS centralizado
const TRANSITIONS = Object.freeze({
  [INST.BORRADOR]: {
    [ACTION.ENVIAR_A_INSPECTOR]: { toInst: INST.VISITA_PENDIENTE_AGENDA, toTech: "EN_REVISION" },
  },
  [INST.VISITA_PENDIENTE_AGENDA]: {
    [ACTION.AGENDAR_VISITA]: { toInst: INST.VISITA_PENDIENTE_ACEPTACION_PERM, toTech: "EN_REVISION" },
  },
  [INST.VISITA_PENDIENTE_ACEPTACION_PERM]: {
    [ACTION.ACEPTAR_VISITA]: { toInst: INST.VISITA_CONFIRMADA, toTech: "EN_REVISION" },
  },
  [INST.VISITA_CONFIRMADA]: {
    [ACTION.RESOLVER_POST_VISITA_ACEPTAR]: { toInst: INST.TAREA_PENDIENTE_PROGRAMACION, toTech: "EN_REVISION" },
    [ACTION.RESOLVER_POST_VISITA_RECHAZAR]: { toInst: INST.RECHAZADO_POR_INSPECTOR, toTech: "EN_REVISION" },
  },
  [INST.TAREA_PENDIENTE_PROGRAMACION]: {
    [ACTION.PROGRAMAR_TAREA]: { toInst: INST.TAREA_PENDIENTE_CONFIRMACION_PERM, toTech: "EN_REVISION" },
  },
  [INST.DEVUELTO_A_INSPECTOR_POR_ADMIN_GENERAL]: {
    [ACTION.PROGRAMAR_TAREA]: { toInst: INST.TAREA_PENDIENTE_CONFIRMACION_PERM, toTech: "EN_REVISION" },
  },
  [INST.TAREA_PENDIENTE_CONFIRMACION_PERM]: {
    [ACTION.CONFIRMAR_TAREA]: { toInst: INST.TAREA_CONFIRMADA, toTech: "EN_REVISION" },
  },
  [INST.TAREA_CONFIRMADA]: {
    [ACTION.MARCAR_CUMPLIDO]: { toInst: INST.CUMPLIMIENTO_PENDIENTE_ACEPTACION_PERM, toTech: "EN_REVISION" },
  },
  [INST.CUMPLIMIENTO_PENDIENTE_ACEPTACION_PERM]: {
    [ACTION.ACEPTAR_CUMPLIMIENTO]: { toInst: INST.EN_REVISION_ADMIN_GENERAL, toTech: "EN_REVISION" },
  },
  [INST.EN_REVISION_ADMIN_GENERAL]: {
    [ACTION.ADMIN_CERRAR]: { toInst: INST.CERRADO_ADMIN_GENERAL, toTech: "CERRADO" },
    [ACTION.ADMIN_DEVOLVER_A_INSPECTOR]: {
      toInst: INST.DEVUELTO_A_INSPECTOR_POR_ADMIN_GENERAL,
      toTech: "EN_REVISION",
    },
  },
});

function assertTransitionAllowed({ sub, action }) {
  const fromInst = instState(sub);
  const map = TRANSITIONS[fromInst];
  if (!map) throw new Error("transition:no-from");
  const t = map[action];
  if (!t) throw new Error("transition:not-allowed");
  return { fromInst, ...t };
}

function assertTechStateAllowed(sub, allowedTechStates) {
  const st = techState(sub);
  if (!allowedTechStates.includes(st)) throw new Error("techstate:not-allowed");
}

function applyTransition({ sub, user, action, obs }) {
  const t = assertTransitionAllowed({ sub, action });
  setInstState(sub, t.toInst);
  sub.cambiarEstado(t.toTech, user._id, obs || `ANEXO_11 transición ${action}`);
  return t;
}

// ─────────────────────────────
// ✅ P0 — Autonumeración ATÓMICA (counters)

const CounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, collection: "counters" }
);

let Counter = null;
try {
  Counter = mongoose.model("Counter");
} catch {
  Counter = mongoose.model("Counter", CounterSchema);
}

async function nextPedidoTrabajoNumberAtomic() {
  const year = new Date().getFullYear();
  const key = `ANEXO_11:${year}`;
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const n = Number(doc?.seq || 0);
  if (!n) throw new Error("counter-fail");
  return `${n}/${year}`;
}

// ─────────────────────────────
// Intervinientes (FORMA COMPATIBLE con Maestro): { userId, rol }

function addIntervinienteUnique(list, userId, rol) {
  const uid = String(userId || "");
  if (!uid) return list;
  const exists = list.some((x) => String(x?.userId || "") === uid);
  if (!exists) list.push({ userId, rol: rol ? up(rol) : undefined });
  return list;
}

async function findInspectorByBarrio(User, barrio) {
  const b = String(barrio || "").trim();
  if (!b) return null;
  // Permisos puede ser array o string
  return User.findOne({
    barrioAsignado: b,
    $or: [{ permisos: "INSPECTOR" }, { role: "INSPECTOR" }],
  })
    .select("_id nombre apellido email role permisos barrioAsignado")
    .lean();
}

async function buildIntervinientesFor11({ User, creator, permisionarioIdMaybe, barrio }) {
  const list = [];

  addIntervinienteUnique(list, creator?._id, up(creator?.role) || "ACTOR");
  if (permisionarioIdMaybe) addIntervinienteUnique(list, permisionarioIdMaybe, "PERMISIONARIO");

  const insp = await findInspectorByBarrio(User, barrio);
  if (insp?._id) addIntervinienteUnique(list, insp._id, "INSPECTOR");

  return list;
}

// ─────────────────────────────
// Prefills server-authoritative (no manual)

async function findViviendaByCodigo(Vivienda, codigo) {
  const c = String(codigo || "").trim();
  if (!c) return null;
  return Vivienda.findOne({ codigo: c }).lean();
}

async function prefillForPermisionario({ Vivienda, user }) {
  const vivId = user?.viviendaAsignada;
  if (!mongoose.Types.ObjectId.isValid(String(vivId || ""))) throw new Error("no-vivienda-asignada");

  const vivienda = await Vivienda.findById(vivId).lean();
  if (!vivienda) throw new Error("vivienda-not-found");

  return {
    vivienda,
    viviendaId: vivienda?._id || null,
    barrio: String(vivienda?.barrio || "").trim(),
    permisionarioId: user?._id || null,
    d: {
      ambito: "VIVIENDA",
      viviendaCodigo: String(vivienda.codigo || "").trim(),
      viviendaLabel: String(vivienda.codigo || vivienda.direccion || "").trim(),
      viviendaBarrio: String(vivienda.barrio || "").trim(),
      permisionarioNombre: fullName(user),
      permisionarioGrado: String(user?.grado || "").trim(),
      promotorTipo: "PERMISIONARIO",
      promotorNombre: fullName(user),
      promotorRol: up(user?.role || ""),
    },
  };
}

async function prefillForJefe({ user }) {
  const barrio = assertBarrioAssigned(user);
  return {
    vivienda: null,
    viviendaId: null,
    barrio,
    permisionarioId: null,
    d: {
      ambito: "ESPACIO_COMUN",
      viviendaCodigo: "",
      viviendaLabel: `ESPACIO COMUN BARRIO ${barrio}`,
      viviendaBarrio: barrio,
      permisionarioNombre: "Espacio común del barrio",
      permisionarioGrado: "",
      promotorTipo: "JEFE_DE_BARRIO",
      promotorNombre: fullName(user),
      promotorRol: up(user?.role || ""),
    },
  };
}

async function prefillForInspector({ Vivienda, User, user, viviendaCodigo, observacionCompulsivo }) {
  const barrioUser = assertBarrioAssigned(user);

  const vivienda = await findViviendaByCodigo(Vivienda, viviendaCodigo);
  if (!vivienda) throw new Error("vivienda-not-found");
  if (String(vivienda.barrio || "").trim() !== barrioUser) throw new Error("territorial");

  // backend además devuelve ocupante (permisionario)
  const permId = vivienda?.ocupacionActual?.permisionario;
  let perm = null;
  if (mongoose.Types.ObjectId.isValid(String(permId || ""))) {
    perm = await User.findById(permId).select("_id nombre apellido email grado").lean();
  }

  const obs = pickString(observacionCompulsivo, 2000);
  if (!obs) throw new Error("missing-compulsivo-observation");

  return {
    vivienda,
    viviendaId: vivienda?._id || null,
    barrio: String(vivienda?.barrio || "").trim(),
    permisionarioId: perm?._id || null,
    d: {
      ambito: "VIVIENDA",
      viviendaCodigo: String(vivienda.codigo || "").trim(),
      viviendaLabel: String(vivienda.codigo || vivienda.direccion || "").trim(),
      viviendaBarrio: String(vivienda.barrio || "").trim(),
      permisionarioNombre: perm ? fullName(perm) : "Permisionario no identificado",
      permisionarioGrado: String(perm?.grado || "").trim(),
      promotorTipo: "INSPECTOR",
      promotorNombre: fullName(user),
      promotorRol: up(user?.role || ""),
      inspectorNombre: fullName(user),
      workflow: {
        origen: "INSPECTOR_COMPULSIVO",
        observacionCompulsivo: obs,
      },
    },
  };
}

// ─────────────────────────────
// Template requerido

async function findTemplate11OrThrow(FormTemplate) {
  const t = await FormTemplate.findOne({ code: "ANEXO_11", activo: true }).lean();
  if (!t?._id) throw new Error("template-not-found");
  return t;
}

// ─────────────────────────────
// Validaciones explícitas

function assertOwnership(sub, user) {
  if (String(sub.usuario || "") !== String(user._id || "")) throw new Error("not-owner");
}
function assertPermInterviniente(sub, user) {
  const inv = Array.isArray(sub.intervinientes) ? sub.intervinientes : [];
  const ok = inv.some(
    (x) =>
      String(x?.userId || "") === String(user._id || "") &&
      up(x?.rol) === "PERMISIONARIO"
  );
  if (!ok) throw new Error("not-perm-interviniente");
}
function assertInspectorTerritorialAndSameBarrio(sub, user) {
  if (!isInspector(user)) throw new Error("no-perm-inspector");
  const barrioUser = assertBarrioAssigned(user);
  const d = isPlainObject(sub.datos) ? sub.datos : {};
  const barrioAnexo = String(d.viviendaBarrio || "").trim();
  if (!barrioAnexo || barrioAnexo !== barrioUser) throw new Error("territorial");
}

// ─────────────────────────────
// Allowlist por acción

const SOLICITO = Object.freeze(["CAMBIO", "REPARACION", "VERIFICACION", "PROVISION"]);

function allowCreateBody(body) {
  return {
    tipoSolicitud: pickEnum(body?.tipoSolicitud, SOLICITO),
    detalleItems: pickArrayText(body?.detalleItems, { min: 1, max: 20, itemMax: 400 }),

    // solo inspector compulsivo
    viviendaCodigo: pickString(body?.viviendaCodigo, 80),
    obsCompulsivo: pickString(body?.workflow?.observacionCompulsivo, 2000),
  };
}

function allowAgendarVisitaBody(body) {
  const fechaRaw = body?.fechaHoraPropuesta;
  const fecha = fechaRaw ? new Date(fechaRaw) : null;
  return {
    fecha,
    observacionesItems: pickArrayText(body?.observacionesItems, { min: 0, max: 20, itemMax: 400 }),
  };
}

function allowAceptarVisitaBody(body) {
  return { acepta: pickBool(body?.acepta), observacion: pickString(body?.observacion, 800) };
}

function normalizePagina2(body) {
  const p2 = isPlainObject(body?.pagina2) ? body.pagina2 : {};
  blockPrototypeKeys(p2);

  const pagina2 = {
    observacionesItems: pickArrayText(p2.observacionesItems, { min: 0, max: 30, itemMax: 400 }),
    autorizacion: {},
    adjudicacion: {},
    verificacion: {},
  };

  if (isPlainObject(p2.autorizacion)) {
    pagina2.autorizacion = {
      modalidad: pickEnum(p2.autorizacion.modalidad, ["PERSONAL_PROPIO", "EMPRESA_PRIVADA"]),
      mecanismo: pickEnum(p2.autorizacion.mecanismo, ["COMPULSA", "CONTRATACION_DIRECTA"]),
    };
  }
  if (isPlainObject(p2.adjudicacion)) {
    pagina2.adjudicacion = {
      correspondeA: pickString(p2.adjudicacion.correspondeA, 200),
      porOfrecer: pickString(p2.adjudicacion.porOfrecer, 200),
      garantia: pickString(p2.adjudicacion.garantia, 200),
    };
  }
  if (isPlainObject(p2.verificacion)) {
    pagina2.verificacion = {
      texto: pickString(p2.verificacion.texto, 2000),
      observaciones: pickString(p2.verificacion.observaciones, 2000),
    };
  }

  return pagina2;
}

function allowResolverPostVisitaBody(body) {
  const decision = pickEnum(body?.decision, ["ACEPTAR", "RECHAZAR"]);
  const motivo = pickString(body?.motivo, 1000);

  const checksRaw = isPlainObject(body?.inspectorChecks) ? body.inspectorChecks : {};
  blockPrototypeKeys(checksRaw);

  const inspectorChecks = {
    emergencia: pickBool(checksRaw.emergencia),
    correspondePermisionario: pickBool(checksRaw.correspondePermisionario),
    novedadesActaAnterior: pickBool(checksRaw.novedadesActaAnterior),
  };

  const descripcionTrabajoItems = pickArrayText(body?.descripcionTrabajoItems, { min: 0, max: 30, itemMax: 400 });

  return { decision, motivo, inspectorChecks, descripcionTrabajoItems, pagina2: normalizePagina2(body) };
}

function allowProgramarTareaBody(body) {
  const fechaRaw = body?.fechaProgramada;
  const fecha = fechaRaw ? new Date(fechaRaw) : null;
  return { fecha };
}

function allowConfirmarTareaBody(body) {
  return { confirma: pickBool(body?.confirma), observacion: pickString(body?.observacion, 800) };
}

function allowMarcarCumplidoBody(body) {
  return {
    observacionesItems: pickArrayText(body?.observacionesItems, { min: 0, max: 30, itemMax: 400 }),
    pagina2: normalizePagina2(body),
  };
}

function allowAceptarCumplimientoBody(body) {
  return { acepta: pickBool(body?.acepta), observacion: pickString(body?.observacion, 800) };
}

function allowAdminGeneralBody(body) {
  return {
    accion: pickEnum(body?.accion, ["CERRAR", "DEVOLVER_A_INSPECTOR"]),
    observacionesAdminGeneral: pickString(body?.observacionesAdminGeneral, 2000),
  };
}

// ─────────────────────────────
// Compat Maestro: aceptar ctx o req/res (por si el Maestro lo llama con ctx)

function unwrap(ctxOrReq, maybeRes) {
  const req = ctxOrReq?.req || ctxOrReq;
  const res = ctxOrReq?.res || maybeRes;
  const user = ctxOrReq?.user || req?.user;
  const models = ctxOrReq?.models || null;
  const core = ctxOrReq?.core || null;
  return { req, res, user, models, core };
}

function deny(core, res) {
  return core?.genericDenied ? core.genericDenied(res) : res.status(403).json({ message: "Recurso no disponible" });
}
function bad(core, res) {
  return core?.badRequest ? core.badRequest(res) : res.status(400).json({ message: "Recurso no disponible" });
}
function oid(core, v) {
  return core?.isObjectId ? core.isObjectId(v) : mongoose.Types.ObjectId.isValid(String(v || ""));
}

// ─────────────────────────────
// API (async fn(ctx))

async function crear(ctxOrReq, maybeRes) {
  const { req, res, user, models, core } = unwrap(ctxOrReq, maybeRes);

  const FormSubmission = models?.FormSubmission || require("../models/FormSubmission").FormSubmission;
  const FormTemplate = models?.FormTemplate || require("../models/FormTemplate").FormTemplate;
  const User = models?.User || require("../models/user").User;
  const Vivienda = models?.Vivienda || require("../models/vivienda");

  try {
    if (!user) return deny(core, res);
    if (isAdminReadOnly(user)) return deny(core, res); // ADMIN solo lectura

    blockPrototypeKeys(req.body || {});
    const body = allowCreateBody(req.body || {});
    if (!body.tipoSolicitud || body.detalleItems.length === 0) return bad(core, res);

    const template = await findTemplate11OrThrow(FormTemplate);

    const r = roleUp(user);

    let pre = null;
    if (r === "PERMISIONARIO" || r === "PERMISIONARIO_EN_ESPERA") {
      pre = await prefillForPermisionario({ Vivienda, user });
    } else if (isInspector(user)) {
      if (!body.viviendaCodigo) return bad(core, res);
      pre = await prefillForInspector({
        Vivienda,
        User,
        user,
        viviendaCodigo: body.viviendaCodigo,
        observacionCompulsivo: body.obsCompulsivo,
      });
    } else if (isJefeBarrio(user)) {
      pre = await prefillForJefe({ user });
    } else {
      return deny(core, res);
    }

    const numeroPedidoTrabajo = await nextPedidoTrabajoNumberAtomic();

    const d = {
      ...(pre.d || {}),
      numeroPedidoTrabajo,
      tipoSolicitud: body.tipoSolicitud,
      detalleItems: body.detalleItems,
    };

    const intervinientes = await buildIntervinientesFor11({
      User,
      creator: user,
      permisionarioIdMaybe: pre.permisionarioId,
      barrio: pre.barrio || d.viviendaBarrio,
    });

    const sub = new FormSubmission({
      template: template._id,             // ✅ required
      codigo: "ANEXO_11",
      usuario: user._id,
      vivienda: pre.viviendaId || undefined, // ✅ raíz vivienda para Maestro
      barrio: String(pre.barrio || d.viviendaBarrio || "").trim() || undefined,
      datos: d,
      intervinientes,                     // ✅ { userId, rol }
    });

    setInstState(sub, INST.BORRADOR);
    sub.cambiarEstado("BORRADOR", user._id, "ANEXO_11 creado (borrador)");

    await sub.save();
    return res.status(201).json({ anexo: sub.toObject() });
  } catch (e) {
    console.error("[A11][crear] Error:", e?.message || e);
    return deny(core, res);
  }
}

async function obtener(ctxOrReq, maybeRes) {
  const { req, res, user, models, core } = unwrap(ctxOrReq, maybeRes);

  const FormSubmission = models?.FormSubmission || require("../models/FormSubmission").FormSubmission;

  try {
    const { id } = req.params || {};
    if (!user) return deny(core, res);
    if (!oid(core, id)) return deny(core, res);

    const sub = await FormSubmission.findById(id).lean();
    if (!sub) return deny(core, res);
    if (up(sub.codigo) !== "ANEXO_11") return deny(core, res);

    // Maestro ya tiene lógica base para canRead, pero no dependemos de middleware:
    const role = roleUp(user);
    if (role === "ADMIN" || role === "ADMIN_GENERAL") {
      return res.json({ anexo: sub });
    }

    if (String(sub.usuario) === String(user._id)) {
      return res.json({ anexo: sub });
    }

    const inv = Array.isArray(sub.intervinientes) ? sub.intervinientes : [];
    if (inv.some((x) => String(x?.userId) === String(user._id))) {
      return res.json({ anexo: sub });
    }

    return deny(core, res);
  } catch (e) {
    console.error("[A11][obtener] Error:", e?.message || e);
    return deny(core, res);
  }
}

async function enviar(ctxOrReq, maybeRes) {
  const { req, res, user, models, core } = unwrap(ctxOrReq, maybeRes);
  const FormSubmission = models?.FormSubmission || require("../models/FormSubmission").FormSubmission;

  try {
    const { id } = req.params || {};
    if (!user) return deny(core, res);
    if (isAdminReadOnly(user)) return deny(core, res);
    if (!oid(core, id)) return deny(core, res);

    const sub = await FormSubmission.findById(id);
    if (!sub) return deny(core, res);
    assertCodigo11(sub);

    assertOwnership(sub, user);
    assertTechStateAllowed(sub, ["BORRADOR"]);

    applyTransition({ sub, user, action: ACTION.ENVIAR_A_INSPECTOR, obs: "ANEXO_11 enviado a inspector" });

    await sub.save();
    return res.json({ anexo: sub.toObject() });
  } catch (e) {
    console.error("[A11][enviar] Error:", e?.message || e);
    return deny(core, res);
  }
}

async function agendarVisita(ctxOrReq, maybeRes) {
  const { req, res, user, models, core } = unwrap(ctxOrReq, maybeRes);
  const FormSubmission = models?.FormSubmission || require("../models/FormSubmission").FormSubmission;

  try {
    const { id } = req.params || {};
    if (!user) return deny(core, res);
    if (!oid(core, id)) return deny(core, res);
    if (!isInspector(user)) return deny(core, res);

    blockPrototypeKeys(req.body || {});
    const body = allowAgendarVisitaBody(req.body || {});
    if (!body.fecha || Number.isNaN(body.fecha.getTime())) return bad(core, res);

    const sub = await FormSubmission.findById(id);
    if (!sub) return deny(core, res);
    assertCodigo11(sub);

    assertInspectorTerritorialAndSameBarrio(sub, user);
    assertTechStateAllowed(sub, ["EN_REVISION"]);

    const d = isPlainObject(sub.datos) ? sub.datos : {};
    d.visita = isPlainObject(d.visita) ? d.visita : {};
    d.visita.fechaHoraPropuesta = body.fecha.toISOString();
    if (body.observacionesItems.length) d.visita.observacionesItems = body.observacionesItems;
    d.inspectorNombre = d.inspectorNombre || fullName(user);
    sub.datos = d;

    applyTransition({ sub, user, action: ACTION.AGENDAR_VISITA, obs: "ANEXO_11 visita agendada por inspector" });

    await sub.save();
    return res.json({ anexo: sub.toObject() });
  } catch (e) {
    console.error("[A11][agendarVisita] Error:", e?.message || e);
    return deny(core, res);
  }
}

async function aceptarVisita(ctxOrReq, maybeRes) {
  const { req, res, user, models, core } = unwrap(ctxOrReq, maybeRes);
  const FormSubmission = models?.FormSubmission || require("../models/FormSubmission").FormSubmission;

  try {
    const { id } = req.params || {};
    if (!user) return deny(core, res);
    if (isAdminReadOnly(user)) return deny(core, res);
    if (!oid(core, id)) return deny(core, res);

    blockPrototypeKeys(req.body || {});
    const body = allowAceptarVisitaBody(req.body || {});
    if (body.acepta !== true) return bad(core, res);

    const sub = await FormSubmission.findById(id);
    if (!sub) return deny(core, res);
    assertCodigo11(sub);

    assertPermInterviniente(sub, user);
    assertTechStateAllowed(sub, ["EN_REVISION"]);

    const d = isPlainObject(sub.datos) ? sub.datos : {};
    d.visita = isPlainObject(d.visita) ? d.visita : {};
    d.visita.aceptadaPorPermisionario = {
      ok: true,
      fecha: new Date().toISOString(),
      nombre: fullName(user),
      observacion: body.observacion || "",
    };
    sub.datos = d;

    applyTransition({ sub, user, action: ACTION.ACEPTAR_VISITA, obs: "ANEXO_11 visita aceptada por permisionario" });

    await sub.save();
    return res.json({ anexo: sub.toObject() });
  } catch (e) {
    console.error("[A11][aceptarVisita] Error:", e?.message || e);
    return deny(core, res);
  }
}

async function resolverPostVisita(ctxOrReq, maybeRes) {
  const { req, res, user, models, core } = unwrap(ctxOrReq, maybeRes);
  const FormSubmission = models?.FormSubmission || require("../models/FormSubmission").FormSubmission;

  try {
    const { id } = req.params || {};
    if (!user) return deny(core, res);
    if (!oid(core, id)) return deny(core, res);
    if (!isInspector(user)) return deny(core, res);

    blockPrototypeKeys(req.body || {});
    const body = allowResolverPostVisitaBody(req.body || {});
    if (!body.decision) return bad(core, res);
    if (body.decision === "RECHAZAR" && !body.motivo) return bad(core, res);

    const sub = await FormSubmission.findById(id);
    if (!sub) return deny(core, res);
    assertCodigo11(sub);

    assertInspectorTerritorialAndSameBarrio(sub, user);
    assertTechStateAllowed(sub, ["EN_REVISION"]);

    const d = isPlainObject(sub.datos) ? sub.datos : {};
    d.inspectorNombre = d.inspectorNombre || fullName(user);
    d.inspectorChecks = body.inspectorChecks;
    if (body.descripcionTrabajoItems.length) d.descripcionTrabajoItems = body.descripcionTrabajoItems;
    d.pagina2 = body.pagina2;

    d.resolucionInspector = {
      decision: body.decision,
      motivo: body.decision === "RECHAZAR" ? body.motivo : "",
      fecha: new Date().toISOString(),
      nombre: fullName(user),
    };

    sub.datos = d;

    const action = body.decision === "ACEPTAR" ? ACTION.RESOLVER_POST_VISITA_ACEPTAR : ACTION.RESOLVER_POST_VISITA_RECHAZAR;
    applyTransition({
      sub,
      user,
      action,
      obs: body.decision === "ACEPTAR" ? "ANEXO_11 aceptado por inspector post-visita" : "ANEXO_11 rechazado por inspector post-visita",
    });

    await sub.save();
    return res.json({ anexo: sub.toObject() });
  } catch (e) {
    console.error("[A11][resolverPostVisita] Error:", e?.message || e);
    return deny(core, res);
  }
}

async function programarTarea(ctxOrReq, maybeRes) {
  const { req, res, user, models, core } = unwrap(ctxOrReq, maybeRes);
  const FormSubmission = models?.FormSubmission || require("../models/FormSubmission").FormSubmission;

  try {
    const { id } = req.params || {};
    if (!user) return deny(core, res);
    if (!oid(core, id)) return deny(core, res);
    if (!isInspector(user)) return deny(core, res);

    blockPrototypeKeys(req.body || {});
    const body = allowProgramarTareaBody(req.body || {});
    if (!body.fecha || Number.isNaN(body.fecha.getTime())) return bad(core, res);

    const sub = await FormSubmission.findById(id);
    if (!sub) return deny(core, res);
    assertCodigo11(sub);

    assertInspectorTerritorialAndSameBarrio(sub, user);
    assertTechStateAllowed(sub, ["EN_REVISION"]);

    const d = isPlainObject(sub.datos) ? sub.datos : {};
    d.tarea = isPlainObject(d.tarea) ? d.tarea : {};
    d.tarea.fechaProgramada = body.fecha.toISOString();
    sub.datos = d;

    applyTransition({ sub, user, action: ACTION.PROGRAMAR_TAREA, obs: "ANEXO_11 tarea programada por inspector" });

    await sub.save();
    return res.json({ anexo: sub.toObject() });
  } catch (e) {
    console.error("[A11][programarTarea] Error:", e?.message || e);
    return deny(core, res);
  }
}

async function confirmarTarea(ctxOrReq, maybeRes) {
  const { req, res, user, models, core } = unwrap(ctxOrReq, maybeRes);
  const FormSubmission = models?.FormSubmission || require("../models/FormSubmission").FormSubmission;

  try {
    const { id } = req.params || {};
    if (!user) return deny(core, res);
    if (isAdminReadOnly(user)) return deny(core, res);
    if (!oid(core, id)) return deny(core, res);

    blockPrototypeKeys(req.body || {});
    const body = allowConfirmarTareaBody(req.body || {});
    if (body.confirma !== true) return bad(core, res);

    const sub = await FormSubmission.findById(id);
    if (!sub) return deny(core, res);
    assertCodigo11(sub);

    assertPermInterviniente(sub, user);
    assertTechStateAllowed(sub, ["EN_REVISION"]);

    const d = isPlainObject(sub.datos) ? sub.datos : {};
    d.tarea = isPlainObject(d.tarea) ? d.tarea : {};
    d.tarea.confirmadaPorPermisionario = {
      ok: true,
      fecha: new Date().toISOString(),
      nombre: fullName(user),
      observacion: body.observacion || "",
    };
    sub.datos = d;

    applyTransition({ sub, user, action: ACTION.CONFIRMAR_TAREA, obs: "ANEXO_11 tarea confirmada por permisionario" });

    await sub.save();
    return res.json({ anexo: sub.toObject() });
  } catch (e) {
    console.error("[A11][confirmarTarea] Error:", e?.message || e);
    return deny(core, res);
  }
}

async function marcarCumplido(ctxOrReq, maybeRes) {
  const { req, res, user, models, core } = unwrap(ctxOrReq, maybeRes);
  const FormSubmission = models?.FormSubmission || require("../models/FormSubmission").FormSubmission;

  try {
    const { id } = req.params || {};
    if (!user) return deny(core, res);
    if (!oid(core, id)) return deny(core, res);
    if (!isInspector(user)) return deny(core, res);

    blockPrototypeKeys(req.body || {});
    const body = allowMarcarCumplidoBody(req.body || {});

    const sub = await FormSubmission.findById(id);
    if (!sub) return deny(core, res);
    assertCodigo11(sub);

    assertInspectorTerritorialAndSameBarrio(sub, user);
    assertTechStateAllowed(sub, ["EN_REVISION"]);

    const d = isPlainObject(sub.datos) ? sub.datos : {};
    d.cumplimiento = isPlainObject(d.cumplimiento) ? d.cumplimiento : {};
    d.cumplimiento.marcadoPorInspector = {
      ok: true,
      fecha: new Date().toISOString(),
      nombre: fullName(user),
      observacionesItems: body.observacionesItems,
    };
    d.pagina2 = body.pagina2;
    sub.datos = d;

    applyTransition({ sub, user, action: ACTION.MARCAR_CUMPLIDO, obs: "ANEXO_11 marcado como cumplido por inspector" });

    await sub.save();
    return res.json({ anexo: sub.toObject() });
  } catch (e) {
    console.error("[A11][marcarCumplido] Error:", e?.message || e);
    return deny(core, res);
  }
}

async function aceptarCumplimiento(ctxOrReq, maybeRes) {
  const { req, res, user, models, core } = unwrap(ctxOrReq, maybeRes);
  const FormSubmission = models?.FormSubmission || require("../models/FormSubmission").FormSubmission;

  try {
    const { id } = req.params || {};
    if (!user) return deny(core, res);
    if (isAdminReadOnly(user)) return deny(core, res);
    if (!oid(core, id)) return deny(core, res);

    blockPrototypeKeys(req.body || {});
    const body = allowAceptarCumplimientoBody(req.body || {});
    if (body.acepta !== true) return bad(core, res);

    const sub = await FormSubmission.findById(id);
    if (!sub) return deny(core, res);
    assertCodigo11(sub);

    assertPermInterviniente(sub, user);
    assertTechStateAllowed(sub, ["EN_REVISION"]);

    const d = isPlainObject(sub.datos) ? sub.datos : {};
    d.cumplimiento = isPlainObject(d.cumplimiento) ? d.cumplimiento : {};
    d.cumplimiento.aceptadoPorPermisionario = {
      ok: true,
      fecha: new Date().toISOString(),
      nombre: fullName(user),
      observacion: body.observacion || "",
    };
    sub.datos = d;

    applyTransition({ sub, user, action: ACTION.ACEPTAR_CUMPLIMIENTO, obs: "ANEXO_11 cumplimiento aceptado por permisionario" });

    await sub.save();
    return res.json({ anexo: sub.toObject() });
  } catch (e) {
    console.error("[A11][aceptarCumplimiento] Error:", e?.message || e);
    return deny(core, res);
  }
}

async function adminGeneral(ctxOrReq, maybeRes) {
  const { req, res, user, models, core } = unwrap(ctxOrReq, maybeRes);
  const FormSubmission = models?.FormSubmission || require("../models/FormSubmission").FormSubmission;

  try {
    const { id } = req.params || {};
    if (!user) return deny(core, res);
    if (!oid(core, id)) return deny(core, res);
    if (!isAdminGeneral(user)) return deny(core, res);

    blockPrototypeKeys(req.body || {});
    const body = allowAdminGeneralBody(req.body || {});
    if (!body.accion) return bad(core, res);

    const sub = await FormSubmission.findById(id);
    if (!sub) return deny(core, res);
    assertCodigo11(sub);

    assertTechStateAllowed(sub, ["EN_REVISION"]);

    const action = body.accion === "CERRAR" ? ACTION.ADMIN_CERRAR : ACTION.ADMIN_DEVOLVER_A_INSPECTOR;

    const d = isPlainObject(sub.datos) ? sub.datos : {};
    if (body.observacionesAdminGeneral) {
      const prev = typeof d.observacionesAdminGeneral === "string" ? d.observacionesAdminGeneral.trim() : "";
      d.observacionesAdminGeneral = prev ? `${prev}\n${body.observacionesAdminGeneral}` : body.observacionesAdminGeneral;
    }

    if (body.accion === "CERRAR") {
      d.resolucionAdminGeneral = "CERRADO";
      d.fechaCierreAdminGeneral = new Date().toISOString();
      d.cerradoPorAdminGeneralNombre = fullName(user);
    } else {
      d.devueltoAInspector = { ok: true, fecha: new Date().toISOString(), nombre: fullName(user) };
    }

    sub.datos = d;

    applyTransition({
      sub,
      user,
      action,
      obs: body.accion === "CERRAR"
        ? "ANEXO_11 cerrado por ADMIN_GENERAL"
        : "ANEXO_11 devuelto a inspector por ADMIN_GENERAL",
    });

    await sub.save();
    return res.json({ anexo: sub.toObject() });
  } catch (e) {
    console.error("[A11][adminGeneral] Error:", e?.message || e);
    return deny(core, res);
  }
}

module.exports = {
  crear,
  obtener,
  enviar,
  agendarVisita,
  aceptarVisita,
  resolverPostVisita,
  programarTarea,
  confirmarTarea,
  marcarCumplido,
  aceptarCumplimiento,
  adminGeneral,

  // debug interno
  _TRANSITIONS: TRANSITIONS,
  _INST: INST,
  _ACTION: ACTION,
};