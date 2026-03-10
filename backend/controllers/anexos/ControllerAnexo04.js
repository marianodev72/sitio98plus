// backend/controllers/anexos/ControllerAnexo04.js
// ANEXO_04 — Ausencia prolongada
//
// Ajustado a Controller Maestro V2 (formularioController.js) + Frontend vigente
// - Exporta funciones async fn(ctx) (sin req/res directo fuera de ctx)
// - Fail-Closed + No-Disclosure: siempre {message:"Recurso no disponible"}
// - Mutaciones sin lean() y transiciones solo con submission.cambiarEstado(...)
// - Sanitización: allowlist + bloqueo __proto__/constructor/prototype + NO persistir req.body directo
// - Territorialidad: Rol base PERMISIONARIO + permisos territoriales (INSPECTOR / JEFE_DE_BARRIO) + barrioAsignado
//
// Nota institucional ANEXO_04:
// - Lo inicia PERMISIONARIO (owner)
// - JEFE_DE_BARRIO "acuse recibo" (no requiere aceptación tipo workflow; queda como marca en datos)
// - También lo ve INSPECTOR, ADMIN y ADMIN_GENERAL (lectura)

"use strict";

const mongoose = require("mongoose");

const CODIGO = "ANEXO_04";

// Estados existentes en FormSubmission (no inventar)
const ESTADOS = Object.freeze({
  BORRADOR: "BORRADOR",
  ENVIADO: "ENVIADO",
  EN_REVISION: "EN_REVISION",
  APROBADO: "APROBADO",
  RECHAZADO: "RECHAZADO",
  CERRADO: "CERRADO",
  ASIGNADO: "ASIGNADO",
});

// Transiciones explícitas (ANEXO_04)
// - acuseRecibo: no cambia estado (marca en datos) pero exige estado ENVIADO
const TRANSITIONS = Object.freeze({
  updateDatos: new Set([ESTADOS.BORRADOR]),
  enviar: new Set([ESTADOS.BORRADOR]),
  acuseRecibo: new Set([ESTADOS.ENVIADO]),
  cierre: new Set([ESTADOS.ENVIADO, ESTADOS.EN_REVISION]),
});

// Roles base
const ROLES_BASE_VALIDOS = new Set(["ADMIN_GENERAL", "ADMIN", "POSTULANTE", "PERMISIONARIO", "ALOJADO"]);

// Permisos territoriales (NO son roles)
const PERMISOS_VALIDOS = new Set(["INSPECTOR", "JEFE_DE_BARRIO"]);

// Allowlist de datos (NO persistir req.body directo)
const DATOS_ALLOWLIST = new Set([
  "motivoAusencia",
  "fechaInicio",
  "fechaFinEstimada",
  "detalle",
  "contactoDuranteAusencia",
  // marca de acuse (solo se escribe por acuseRecibo)
  "acuseRecibo",
]);

// ─────────────────────────────────────────────────────────────
// Fail-Closed + No-Disclosure helpers
function deny(ctx) {
  // siempre 403 {message:"Recurso no disponible"}
  if (ctx?.core?.genericDenied && ctx?.res) return ctx.core.genericDenied(ctx.res);
  // fallback ultra defensivo (no debería pasar)
  const res = ctx?.res;
  if (res && typeof res.status === "function") return res.status(403).json({ message: "Recurso no disponible" });
  throw new Error("Recurso no disponible");
}

function up(v) {
  return String(v || "").toUpperCase().trim();
}
function safeStr(v) {
  return String(v || "").trim();
}
function isObjectId(v) {
  return mongoose.Types.ObjectId.isValid(String(v || ""));
}
function blockProtoKeys(obj) {
  if (!obj || typeof obj !== "object") return;
  if (Object.prototype.hasOwnProperty.call(obj, "__proto__")) throw new Error("proto");
  if (Object.prototype.hasOwnProperty.call(obj, "constructor")) throw new Error("ctor");
  if (Object.prototype.hasOwnProperty.call(obj, "prototype")) throw new Error("proto2");
}

function pickAllowlistedDatos(input) {
  if (!input || typeof input !== "object") return {};
  blockProtoKeys(input);
  const out = {};
  for (const k of Object.keys(input)) {
    if (DATOS_ALLOWLIST.has(k)) out[k] = input[k];
  }
  blockProtoKeys(out);
  return out;
}

function ensureTransitionAllowed(ctx, action, estadoActual) {
  const allowed = TRANSITIONS[action];
  if (!allowed || !allowed.has(String(estadoActual || ""))) return deny(ctx);
}

function assertCtxDeps(ctx) {
  if (!ctx || typeof ctx !== "object") return false;
  if (!ctx.models || typeof ctx.models !== "object") return false;
  if (!ctx.models.FormSubmission) return false;
  if (!ctx.models.FormTemplate) return false;
  if (!ctx.models.Vivienda) return false; // necesario para derivar barrio (create)
  if (!ctx.core || typeof ctx.core !== "object") return false;
  if (!ctx.services || typeof ctx.services !== "object") return false;
  return true;
}

function getUserOrDeny(ctx) {
  const u = ctx?.user;
  if (!u || !isObjectId(u._id)) return null;
  return u;
}

function getRoleBaseOrDeny(ctx) {
  const role = up(ctx?.user?.role);
  if (!role || !ROLES_BASE_VALIDOS.has(role)) return null;
  return role;
}

function getPermisosSetOrDeny(ctx) {
  const list = Array.isArray(ctx?.user?.permisos) ? ctx.user.permisos : [];
  const norm = list.map(up).filter(Boolean);

  // Fail-Closed: si viene basura fuera de allowlist, negar
  for (const p of norm) {
    if (!PERMISOS_VALIDOS.has(p)) return null;
  }
  return new Set(norm);
}

function isBackoffice(role) {
  return role === "ADMIN_GENERAL" || role === "ADMIN";
}

function ensureTerritorialidadByBarrio(ctx, submission) {
  const userBarrio = safeStr(ctx?.user?.barrioAsignado);
  const subBarrio = safeStr(submission?.barrio);
  if (!userBarrio || !subBarrio) return deny(ctx);
  if (userBarrio !== subBarrio) return deny(ctx);
}

function ensureCanRead(ctx, submission) {
  const role = getRoleBaseOrDeny(ctx);
  if (!role) return deny(ctx);

  if (isBackoffice(role)) return;

  const userId = String(ctx.user._id);
  if (String(submission.usuario) === userId) return;

  // territorial read-only: PERMISIONARIO + permiso INSPECTOR o JEFE_DE_BARRIO + barrio coincide
  if (role !== "PERMISIONARIO") return deny(ctx);

  const perms = getPermisosSetOrDeny(ctx);
  if (!perms) return deny(ctx);

  const ok = perms.has("INSPECTOR") || perms.has("JEFE_DE_BARRIO");
  if (!ok) return deny(ctx);

  ensureTerritorialidadByBarrio(ctx, submission);
}

function ensureOwnerPermisionario(ctx, submission) {
  const role = getRoleBaseOrDeny(ctx);
  if (role !== "PERMISIONARIO") return deny(ctx);

  const userId = String(ctx.user._id);
  if (String(submission.usuario) !== userId) return deny(ctx);
}

function ensureCanCreate(ctx) {
  const role = getRoleBaseOrDeny(ctx);
  if (role !== "PERMISIONARIO") return deny(ctx);
}

function ensureCanAcuseRecibo(ctx, submission) {
  const role = getRoleBaseOrDeny(ctx);
  if (role !== "PERMISIONARIO") return deny(ctx);

  const perms = getPermisosSetOrDeny(ctx);
  if (!perms || !perms.has("JEFE_DE_BARRIO")) return deny(ctx);

  ensureTerritorialidadByBarrio(ctx, submission);
}

function ensureCanCierre(ctx, submission) {
  // mismo criterio que acuse
  return ensureCanAcuseRecibo(ctx, submission);
}

// Template: el Maestro resuelve templateId y lo pasa en ctx.template.
// Fail-Closed si no está.
async function resolveTemplateIdOrDeny(ctx) {
  const tplId = ctx?.template || ctx?.extra?.template;
  if (!tplId || !isObjectId(tplId)) return null;
  return tplId;
}

// Carga submission real (sin lean) y valida código
async function loadSubmissionOrDeny(ctx, id) {
  if (!isObjectId(id)) return null;
  const sub = await ctx.models.FormSubmission.findById(id);
  if (!sub) return null;
  if (up(sub.codigo) !== CODIGO) return null;
  return sub;
}

// Derivar vivienda+barrio desde vivienda OCUPADA del permisionario
async function resolveOcupacionActualOrDeny(ctx) {
  const user = getUserOrDeny(ctx);
  if (!user) return null;

  const Vivienda = ctx.models.Vivienda;

  const viviendas = await Vivienda.find({
    archivado: { $ne: true },
    estado: "OCUPADA",
    "ocupacionActual.permisionario": user._id,
  })
    .select("_id barrio codigo")
    .limit(2)
    .lean();

  // Fail-Closed: exactamente 1 vivienda ocupada
  if (!Array.isArray(viviendas) || viviendas.length !== 1) return null;

  const v = viviendas[0];
  const barrio = safeStr(v?.barrio);
  if (!barrio) return null;

  return { viviendaId: v._id, barrio, viviendaCodigo: v?.codigo ? String(v.codigo) : null };
}

// Presenter / DTO (evitar ObjectId en UI/PDF cuando no se necesita)
function toPresenter(sub) {
  // Nota: frontend suele navegar con _id; lo dejamos.
  // Evitamos exponer derivadoDe (maestro ya lo filtra por rol) y evitamos exponer IDs internos extra.
  return {
    _id: sub._id,
    codigo: sub.codigo,
    estado: sub.estado,
    estadoInstitucional: sub.estadoInstitucional ?? null,
    usuario: sub.usuario, // FE legacy suele usarlo; no es PII
    barrio: sub.barrio ?? null,
    numeroExpediente: sub.numeroExpediente ?? null,
    // vivienda: no mostrar ObjectId en UI/PDF. Se deja null/undefined.
    vivienda: null,
    datos: sub.datos || {},
    adjuntos: Array.isArray(sub.adjuntos) ? sub.adjuntos : [],
    intervinientes: Array.isArray(sub.intervinientes) ? sub.intervinientes : [],
    historialEstados: Array.isArray(sub.historialEstados) ? sub.historialEstados : [],
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────
// API modular (Maestro V2)
module.exports = {
  code: CODIGO,

  // POST /api/formularios/:codigo (maestro: crearAnexo)
  // Espera body { datos?, numeroExpediente? } (compat)
  async create(ctx) {
    try {
      if (!assertCtxDeps(ctx)) return deny(ctx);
      const user = getUserOrDeny(ctx);
      if (!user) return deny(ctx);

      ensureCanCreate(ctx);

      const templateId = await resolveTemplateIdOrDeny(ctx);
      if (!templateId) return deny(ctx);

      const body = (ctx.req && ctx.req.body) || {};
      blockProtoKeys(body);

      const datosIn = body.datos && typeof body.datos === "object" ? body.datos : {};
      const numeroExpediente = body.numeroExpediente != null ? safeStr(body.numeroExpediente) : null;

      // Derivación determinista para no permitir "elegir barrio"
      const occ = await resolveOcupacionActualOrDeny(ctx);
      if (!occ) return deny(ctx);

      const safeDatos = pickAllowlistedDatos(datosIn);

      const submission = await ctx.models.FormSubmission.create({
        template: templateId,
        codigo: CODIGO,
        usuario: user._id,
        datos: safeDatos,
        estado: ESTADOS.BORRADOR,
        vivienda: occ.viviendaId, // usamos el campo estándar de FormSubmission
        barrio: occ.barrio,
        numeroExpediente: numeroExpediente || undefined,
        intervinientes: [{ userId: user._id, rol: "PERMISIONARIO" }],
      });

      return toPresenter(submission);
    } catch (e) {
      return deny(ctx);
    }
  },

  // PATCH /api/formularios/:id/datos (router legacy: updateDatosAnexo03)
  // Espera body { datos }
  async updateDatos(ctx) {
    try {
      if (!assertCtxDeps(ctx)) return deny(ctx);
      const user = getUserOrDeny(ctx);
      if (!user) return deny(ctx);

      const sub = await loadSubmissionOrDeny(ctx, ctx.req?.params?.id);
      if (!sub) return deny(ctx);

      ensureOwnerPermisionario(ctx, sub);
      ensureTransitionAllowed(ctx, "updateDatos", sub.estado);

      const body = (ctx.req && ctx.req.body) || {};
      blockProtoKeys(body);
      const datosIn = body.datos && typeof body.datos === "object" ? body.datos : {};
      const safeDatos = pickAllowlistedDatos(datosIn);

      sub.datos = { ...(sub.datos || {}), ...safeDatos };
      sub.markModified("datos");

      await sub.save();
      return toPresenter(sub);
    } catch (e) {
      return deny(ctx);
    }
  },

  // POST /api/formularios/:id/enviar (router legacy: enviarAnexo03)
  async enviar(ctx) {
    try {
      if (!assertCtxDeps(ctx)) return deny(ctx);
      const user = getUserOrDeny(ctx);
      if (!user) return deny(ctx);

      const sub = await loadSubmissionOrDeny(ctx, ctx.req?.params?.id);
      if (!sub) return deny(ctx);

      ensureOwnerPermisionario(ctx, sub);
      ensureTransitionAllowed(ctx, "enviar", sub.estado);

      const body = (ctx.req && ctx.req.body) || {};
      blockProtoKeys(body);
      const observacion = body.observacion != null ? safeStr(body.observacion) : "";

      sub.cambiarEstado(ESTADOS.ENVIADO, user._id, observacion);
      await sub.save();

      return toPresenter(sub);
    } catch (e) {
      return deny(ctx);
    }
  },

  // POST /api/formularios/:id/conformidad-permisionario (router legacy: darConformidadPermisionario03)
  // Acuse de recibo JEFE_DE_BARRIO (marca en datos; no cambia estado)
  async acuseRecibo(ctx) {
    try {
      if (!assertCtxDeps(ctx)) return deny(ctx);
      const user = getUserOrDeny(ctx);
      if (!user) return deny(ctx);

      const sub = await loadSubmissionOrDeny(ctx, ctx.req?.params?.id);
      if (!sub) return deny(ctx);

      ensureCanAcuseRecibo(ctx, sub);
      ensureTransitionAllowed(ctx, "acuseRecibo", sub.estado);

      const body = (ctx.req && ctx.req.body) || {};
      blockProtoKeys(body);
      const observacion = body.observacion != null ? safeStr(body.observacion) : "";

      const current = sub.datos && typeof sub.datos === "object" ? sub.datos : {};
      sub.datos = {
        ...current,
        acuseRecibo: {
          ok: true,
          fecha: new Date(),
          userId: user._id,
          observacion,
        },
      };
      sub.markModified("datos");

      await sub.save();
      return toPresenter(sub);
    } catch (e) {
      return deny(ctx);
    }
  },

  // POST /api/formularios/:id/cierre-admin-general (router legacy: cerrarAnexo03AdminGeneral)
  // Cierre territorial por JEFE_DE_BARRIO
  async cierre(ctx) {
    try {
      if (!assertCtxDeps(ctx)) return deny(ctx);
      const user = getUserOrDeny(ctx);
      if (!user) return deny(ctx);

      const sub = await loadSubmissionOrDeny(ctx, ctx.req?.params?.id);
      if (!sub) return deny(ctx);

      ensureCanCierre(ctx, sub);
      ensureTransitionAllowed(ctx, "cierre", sub.estado);

      const body = (ctx.req && ctx.req.body) || {};
      blockProtoKeys(body);
      const observacion = body.observacion != null ? safeStr(body.observacion) : "";

      sub.cambiarEstado(ESTADOS.CERRADO, user._id, observacion);
      await sub.save();

      return toPresenter(sub);
    } catch (e) {
      return deny(ctx);
    }
  },

  // GET /api/formularios/:id (maestro: getById)
  async hydrateDetail(ctx) {
    try {
      if (!assertCtxDeps(ctx)) return deny(ctx);

      const sub = await loadSubmissionOrDeny(ctx, ctx.req?.params?.id);
      if (!sub) return deny(ctx);

      ensureCanRead(ctx, sub);
      return toPresenter(sub);
    } catch (e) {
      return deny(ctx);
    }
  },

  // GET /api/formularios/:id/pdf (maestro: descargarPdf)
  async renderPdf(ctx) {
    try {
      if (!assertCtxDeps(ctx)) return deny(ctx);

      const sub = await loadSubmissionOrDeny(ctx, ctx.req?.params?.id);
      if (!sub) return deny(ctx);

      ensureCanRead(ctx, sub);

      const pdfService = ctx.services && ctx.services.pdfService;
      if (!pdfService || typeof pdfService.renderAnexo04 !== "function") return deny(ctx);

      // DTO/presenter para evitar datos crudos en PDF (si el service lo soporta)
      const dto = toPresenter(sub);

      const result = await pdfService.renderAnexo04({ submission: sub, dto, ctx });

      if (!result || !result.buffer || !result.filename || !result.contentType || !result.disposition) return deny(ctx);

      return result;
    } catch (e) {
      return deny(ctx);
    }
  },
};
