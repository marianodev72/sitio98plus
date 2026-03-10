"use strict";

const CODE = "ANEXO_01";

// Estados del modelo + mapping interno (solo interno)
const STATE_MAP = Object.freeze({
  INSTITUCIONAL_TO_MODELO: Object.freeze({
    EN_ANALISIS: "ENVIADO",
    APROBADO: "CERRADO",
  }),
  MODELO: Object.freeze({
    BORRADOR: "BORRADOR",
    ENVIADO: "ENVIADO",
    EN_REVISION: "EN_REVISION",
    APROBADO: "APROBADO",
    RECHAZADO: "RECHAZADO",
    CERRADO: "CERRADO",
    ASIGNADO: "ASIGNADO",
  }),
});

const FLOW = Object.freeze({
  DRAFT: STATE_MAP.MODELO.BORRADOR,
  IN_REVIEW: STATE_MAP.MODELO.ENVIADO, // institucional: EN_ANALISIS
  CLOSED: STATE_MAP.MODELO.CERRADO, // institucional: APROBADO ≡ CERRADO
});

// ─────────────────────────────
// Fail-Closed / No-Disclosure
function deny(ctx) {
  try {
    return ctx?.core?.genericDenied?.(ctx.res);
  } catch {
    try {
      return ctx?.res?.status(403).json({ message: "Recurso no disponible" });
    } catch {
      return;
    }
  }
}

// P0: 400 también sin disclosure
function badRequest(ctx) {
  try {
    return ctx?.core?.badRequest?.(ctx.res);
  } catch {
    try {
      return ctx?.res?.status(400).json({ message: "Recurso no disponible" });
    } catch {
      return;
    }
  }
}

function up(ctx, v) {
  const f = ctx?.core?.up;
  return typeof f === "function" ? f(v) : String(v || "").toUpperCase().trim();
}

function isObjectId(ctx, v) {
  const f = ctx?.core?.isObjectId;
  return typeof f === "function" ? f(v) : false;
}

function isRole(ctx, role) {
  return up(ctx, ctx?.user?.role) === up(ctx, role);
}

function hasValidUser(ctx) {
  return !!(ctx?.user && ctx.user._id && ctx.user.role);
}

function denyIfInspectorOrJefe(ctx) {
  try {
    const isInspectorLikeUser = ctx?.core?.isInspectorLikeUser;
    const isJefeLikeUser = ctx?.core?.isJefeLikeUser;
    if (typeof isInspectorLikeUser === "function" && isInspectorLikeUser(ctx.user)) return true;
    if (typeof isJefeLikeUser === "function" && isJefeLikeUser(ctx.user)) return true;
  } catch {}

  const roleUp = up(ctx, ctx?.user?.role);
  if (roleUp === "INSPECTOR" || roleUp === "JEFE_DE_BARRIO") return true;

  const permisos = Array.isArray(ctx?.user?.permisos) ? ctx.user.permisos.map((p) => up(ctx, p)) : [];
  if (permisos.includes("INSPECTOR") || permisos.includes("JEFE_DE_BARRIO")) return true;

  return false;
}

function isOwner(user, submission) {
  if (!user || !submission) return false;
  return String(submission.usuario) === String(user._id);
}

function getSubmissionOrDeny(ctx) {
  const s = ctx?.submission;
  if (!s || !s._id) return null;
  if (up(ctx, s.codigo) !== CODE) return null;
  return s;
}

// ─────────────────────────────
// Anti prototype pollution
function assertNoPrototypePollutionKeys(obj) {
  if (!obj || typeof obj !== "object") return true;
  const bad = new Set(["__proto__", "prototype", "constructor"]);
  const stack = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    for (const k of Object.keys(cur)) {
      if (bad.has(k)) return false;
      const v = cur[k];
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return true;
}

// ─────────────────────────────
// Parse "datos" que puede venir como objeto (JSON) o string JSON (multipart)
function parseDatosFromRequest(ctx) {
  const body = ctx?.req?.body || {};
  let datos = body?.datos !== undefined ? body.datos : body;

  if (typeof datos === "string") {
    const s = datos.trim();
    if (!s) return {};
    try {
      const parsed = JSON.parse(s);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return null;
    }
  }

  if (datos && typeof datos === "object") return datos;
  return {};
}

// ─────────────────────────────
// Sanitización allowlist ANEXO_01 (alineada a FE actual)
function sanitizeDatosAnexo01(input) {
  if (!input || typeof input !== "object") return null;
  if (!assertNoPrototypePollutionKeys(input)) return null;

  const out = {};

  const pickStr = (key, maxLen, { allowEmpty = false } = {}) => {
    if (input[key] === undefined || input[key] === null) return;
    if (typeof input[key] !== "string") throw new Error(`type:${key}`);
    const v = input[key].trim();
    if (!v && !allowEmpty) return;
    if (v.length > maxLen) throw new Error(`len:${key}`);
    out[key] = v;
  };

  const pickBool = (key) => {
    if (input[key] === undefined || input[key] === null) return;
    if (typeof input[key] !== "boolean") throw new Error(`type:${key}`);
    out[key] = input[key];
  };

  const pickYesNo = (key) => {
    if (input[key] === undefined || input[key] === null || input[key] === "") return;
    if (typeof input[key] !== "string") throw new Error(`type:${key}`);
    const v = input[key].trim().toUpperCase();
    if (v !== "SI" && v !== "NO") throw new Error(`enum:${key}`);
    out[key] = v;
  };

  const pickEnum = (key, allowed) => {
    if (input[key] === undefined || input[key] === null || input[key] === "") return;
    if (typeof input[key] !== "string") throw new Error(`type:${key}`);
    const v = input[key].trim().toUpperCase();
    if (!allowed.includes(v)) throw new Error(`enum:${key}`);
    out[key] = v;
  };

  const pickDateStr = (key) => {
    if (input[key] === undefined || input[key] === null || input[key] === "") return;
    if (typeof input[key] !== "string") throw new Error(`type:${key}`);
    const v = input[key].trim();
    if (v.length > 10) throw new Error(`len:${key}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`format:${key}`);
    out[key] = v;
  };

  const pickTwoDigit = (key, max) => {
    if (input[key] === undefined || input[key] === null || input[key] === "") return;
    if (typeof input[key] !== "string") throw new Error(`type:${key}`);
    const v = input[key].trim();
    if (!/^\d{2}$/.test(v)) throw new Error(`format:${key}`);
    const n = Number(v);
    if (Number.isNaN(n) || n < 0 || n > max) throw new Error(`range:${key}`);
    out[key] = v;
  };

  // Cabecera
  pickStr("lugar", 120);
  pickDateStr("fechaLugar");
  pickStr("lugarYFecha", 180);
  pickStr("autoridadAsignacion", 120);
  pickTwoDigit("zonaNaval", 99);
  pickStr("alSenor", 180);

  pickEnum("tipoSolicitud", ["INSCRIPCION", "CAMBIO_VIVIENDA"]);

  pickBool("aceptaReglamento");

  pickStr("mr", 30);
  pickStr("afiliadoOSFA", 30);
  pickStr("gradoEscalafon", 80);
  pickStr("apellido", 80);
  pickStr("nombres", 80);
  pickStr("destinoActual", 120);
  pickStr("destinoFuturo", 120);
  pickStr("telefonoActual", 40);
  pickStr("telefonoFuturo", 40);

  pickDateStr("fechaUltimoAscenso");
  pickTwoDigit("aniosServicioRecibo", 50);

  pickYesNo("agregaFidofac");

  if (input.convivientes !== undefined && input.convivientes !== null) {
    if (!Array.isArray(input.convivientes)) throw new Error("type:convivientes");
    if (input.convivientes.length > 30) throw new Error("len:convivientes");
    out.convivientes = input.convivientes.map((c, idx) => {
      if (!c || typeof c !== "object") throw new Error(`type:convivientes[${idx}]`);
      if (!assertNoPrototypePollutionKeys(c)) throw new Error(`pp:convivientes[${idx}]`);
      const item = {};
      const s = (k, maxLen) => {
        const v = c[k];
        if (v === undefined || v === null) return;
        if (typeof v !== "string") throw new Error(`type:convivientes[${idx}].${k}`);
        const vv = v.trim();
        if (vv && vv.length > maxLen) throw new Error(`len:convivientes[${idx}].${k}`);
        if (vv) item[k] = vv;
      };
      const yn = (k) => {
        const v = c[k];
        if (v === undefined || v === null || v === "") return;
        if (typeof v !== "string") throw new Error(`type:convivientes[${idx}].${k}`);
        const vv = v.trim().toUpperCase();
        if (vv !== "SI" && vv !== "NO") throw new Error(`enum:convivientes[${idx}].${k}`);
        item[k] = vv;
      };

      s("apellidoNombres", 120);
      s("relacion", 60);
      yn("aCargo");
      s("edad", 3);
      s("dni", 12);
      s("OSFA", 30);
      return item;
    });
  }

  if (input.mascotas !== undefined && input.mascotas !== null) {
    if (!Array.isArray(input.mascotas)) throw new Error("type:mascotas");
    if (input.mascotas.length > 30) throw new Error("len:mascotas");
    out.mascotas = input.mascotas.map((m, idx) => {
      if (!m || typeof m !== "object") throw new Error(`type:mascotas[${idx}]`);
      if (!assertNoPrototypePollutionKeys(m)) throw new Error(`pp:mascotas[${idx}]`);
      const item = {};
      const s = (k, maxLen) => {
        const v = m[k];
        if (v === undefined || v === null) return;
        if (typeof v !== "string") throw new Error(`type:mascotas[${idx}].${k}`);
        const vv = v.trim();
        if (vv && vv.length > maxLen) throw new Error(`len:mascotas[${idx}].${k}`);
        if (vv) item[k] = vv;
      };
      s("especie", 60);
      s("raza", 60);
      s("edad", 10);
      s("sexo", 20);
      s("peso", 20);
      return item;
    });
  }

  pickYesNo("tienePropiedadesZona");
  pickYesNo("verificoArticulo506");

  if (input.propiedades !== undefined && input.propiedades !== null) {
    if (!Array.isArray(input.propiedades)) throw new Error("type:propiedades");
    if (input.propiedades.length > 3) throw new Error("len:propiedades");
    out.propiedades = input.propiedades.map((p, idx) => {
      if (!p || typeof p !== "object") throw new Error(`type:propiedades[${idx}]`);
      if (!assertNoPrototypePollutionKeys(p)) throw new Error(`pp:propiedades[${idx}]`);
      const item = {};
      const s = (k, maxLen) => {
        const v = p[k];
        if (v === undefined || v === null) return;
        if (typeof v !== "string") throw new Error(`type:propiedades[${idx}].${k}`);
        const vv = v.trim();
        if (vv && vv.length > maxLen) throw new Error(`len:propiedades[${idx}].${k}`);
        if (vv) item[k] = vv;
      };
      s("direccion", 200);
      s("observaciones", 500);
      return item;
    });
  }

  pickYesNo("tieneProblemasSocio");
  pickStr("oficioSocio", 120);

  pickYesNo("agregaCertVacunacion");
  pickYesNo("ineptoDGPN");
  pickYesNo("agregaReciboHaberes");

  pickTwoDigit("aniosOcupacionPrevia", 50);

  if (input.representantes !== undefined && input.representantes !== null) {
    if (!Array.isArray(input.representantes)) throw new Error("type:representantes");
    if (input.representantes.length > 2) throw new Error("len:representantes");
    out.representantes = input.representantes.map((r, idx) => {
      if (!r || typeof r !== "object") throw new Error(`type:representantes[${idx}]`);
      if (!assertNoPrototypePollutionKeys(r)) throw new Error(`pp:representantes[${idx}]`);
      const item = {};
      const s = (k, maxLen) => {
        const v = r[k];
        if (v === undefined || v === null) return;
        if (typeof v !== "string") throw new Error(`type:representantes[${idx}].${k}`);
        const vv = v.trim();
        if (vv && vv.length > maxLen) throw new Error(`len:representantes[${idx}].${k}`);
        if (vv) item[k] = vv;
      };
      s("apellidoNombres", 120);
      s("grado", 60);
      s("mr", 30);
      s("destino", 120);
      s("telefono", 40);
      return item;
    });
  }

  pickBool("autorizaDescuentos");
  pickBool("autorizaAdministradorExpensas");
  pickDateStr("fechaEstimadaTraslado");

  if (input.agregados !== undefined && input.agregados !== null) {
    if (!input.agregados || typeof input.agregados !== "object") throw new Error("type:agregados");
    if (!assertNoPrototypePollutionKeys(input.agregados)) throw new Error("pp:agregados");
    const a = input.agregados;
    const agg = {};
    const yn = (k) => {
      const v = a[k];
      if (v === undefined || v === null || v === "") return;
      if (typeof v !== "string") throw new Error(`type:agregados.${k}`);
      const vv = v.trim().toUpperCase();
      if (vv !== "SI" && vv !== "NO") throw new Error(`enum:agregados.${k}`);
      agg[k] = vv;
    };
    yn("fidofac");
    yn("vacunacion");
    yn("escriturasYContratos");
    yn("reciboHaberes");
    out.agregados = agg;
  }

  pickStr("motivo", 1000);

  return out;
}

// ─────────────────────────────
// Policies
function canReadAnexo01(ctx, submission) {
  if (!hasValidUser(ctx)) return false;
  if (denyIfInspectorOrJefe(ctx)) return false;
  if (!submission || up(ctx, submission.codigo) !== CODE) return false;

  if (isRole(ctx, "POSTULANTE")) return isOwner(ctx.user, submission);

  const canSee = ctx?.core?.canSeeSubmission;
  if ((isRole(ctx, "ADMIN") || isRole(ctx, "ADMIN_GENERAL")) && typeof canSee === "function") {
    return !!canSee(ctx.user, submission);
  }

  return false;
}

function canWriteDraftAsPostulante(ctx, submission) {
  if (!hasValidUser(ctx)) return false;
  if (denyIfInspectorOrJefe(ctx)) return false;
  if (!submission || up(ctx, submission.codigo) !== CODE) return false;
  if (!isRole(ctx, "POSTULANTE")) return false;
  return isOwner(ctx.user, submission);
}

// ─────────────────────────────
// Auditoría opcional
async function auditLogIfAvailable(ctx, submission, action, metadata = {}, observacion = "") {
  try {
    const AuditLog = ctx?.models?.AuditLog;
    if (!AuditLog || typeof AuditLog.create !== "function") return;

    await AuditLog.create({
      targetType: "FormSubmission",
      targetId: String(submission?._id || ""),
      actorId: ctx?.user?._id,
      actorRole: ctx?.user?.role,
      action,
      metadata: metadata && typeof metadata === "object" ? metadata : {},
      observacion: observacion ? String(observacion).slice(0, 500) : "",
      createdAt: new Date(),
    });
  } catch {}
}

// ─────────────────────────────
// View Model (NO ObjectId internos)
async function buildViewModel(ctx, submission) {
  const s = submission && typeof submission.toObject === "function" ? submission.toObject() : submission;
  if (!s || !s._id) return null;

  const User = ctx?.models?.User;
  const Vivienda = ctx?.models?.Vivienda;
  const FormSubmission = ctx?.models?.FormSubmission;

  const roleUp = up(ctx, ctx?.user?.role);
  const canExposeDerivadoDe = roleUp === "ADMIN" || roleUp === "ADMIN_GENERAL";

  const safeStr = (v, max = 200) => {
    if (v === null || v === undefined) return "";
    const out = String(v).trim();
    if (!out) return "";
    return out.length > max ? out.slice(0, max) : out;
  };

  const formatNombre = (u) => {
    if (!u) return "";
    const ap = safeStr(u.apellido || "", 80);
    const nom = safeStr(u.nombre || "", 80);
    const full = `${ap} ${nom}`.trim();
    return full || safeStr(u.email || "", 120) || "";
  };

  let usuarioLabel = "";
  try {
    if (User && isObjectId(ctx, s.usuario)) {
      const u = await User.findById(s.usuario).select("nombre apellido email").lean();
      usuarioLabel = formatNombre(u);
    }
  } catch {}

  let viviendaLabel = "";
  try {
    const vid = s?.vivienda || s?.datos?.viviendaId;
    if (Vivienda && isObjectId(ctx, vid)) {
      const v = await Vivienda.findById(vid).select("codigo").lean();
      viviendaLabel = safeStr(v?.codigo, 40) || "";
    }
  } catch {}

  let intervinientes = [];
  try {
    const list = Array.isArray(s.intervinientes) ? s.intervinientes : [];
    const ids = [
      ...new Set(
        list
          .map((x) => x?.userId)
          .filter((x) => isObjectId(ctx, x))
          .map((x) => String(x))
      ),
    ];

    let usersMap = {};
    if (User && ids.length) {
      const usuarios = await User.find({ _id: { $in: ids } }).select("nombre apellido email").lean();
      usersMap = (usuarios || []).reduce((acc, u) => {
        acc[String(u._id)] = formatNombre(u);
        return acc;
      }, {});
    }

    intervinientes = list.map((x) => ({
      nombre: (x?.userId && usersMap[String(x.userId)]) || "",
      rol: safeStr(x?.rol, 40),
    }));
  } catch {
    intervinientes = [];
  }

  let derivadoDeLabel = null;
  if (canExposeDerivadoDe) {
    try {
      const did = s?.derivadoDe;
      if (FormSubmission && isObjectId(ctx, did)) {
        const orig = await FormSubmission.findById(did).select("codigo numeroExpediente createdAt").lean();
        if (orig) {
          const cod = safeStr(orig.codigo, 20);
          const exp = safeStr(orig.numeroExpediente, 40);
          const fecha = orig.createdAt ? new Date(orig.createdAt).toISOString().slice(0, 10) : "";
          derivadoDeLabel = [cod, exp || fecha].filter(Boolean).join(" ");
        }
      }
    } catch {
      derivadoDeLabel = null;
    }
  }

  const adjuntosSafe = Array.isArray(s.adjuntos)
    ? s.adjuntos.map((a) => ({
        nombre: safeStr(a?.nombre || a?.filename || "", 200),
        tipo: safeStr(a?.tipo || a?.mimetype || "", 80),
      }))
    : [];

  const datos = s.datos && typeof s.datos === "object" ? { ...s.datos } : {};
  if (datos && typeof datos === "object") {
    const bannedKeys = ["viviendaId", "postulanteId", "usuarioId", "ownerId", "derivadoDe", "intervinientes", "template"];
    for (const k of bannedKeys) {
      if (Object.prototype.hasOwnProperty.call(datos, k)) delete datos[k];
    }
  }

  return {
    _id: s._id,
    codigo: s.codigo,
    estado: s.estado,
    estadoInstitucional: s.estadoInstitucional || "",
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,

    usuario: usuarioLabel || "",
    vivienda: viviendaLabel || "",

    derivadoDe: canExposeDerivadoDe ? derivadoDeLabel : null,

    intervinientes,
    adjuntos: adjuntosSafe,
    datos,
  };
}

// ─────────────────────────────
// Snapshot estable para ANEXO_02 (mínimo)
function getSnapshotForAnexo02(anexo01) {
  const d = (anexo01 && anexo01.datos) || {};
  const snapshot = { v: 1 };

  const pick = (k, maxLen) => {
    if (typeof d[k] !== "string") return;
    const v = d[k].trim();
    if (!v) return;
    snapshot[k] = v.slice(0, maxLen);
  };

  pick("apellido", 80);
  pick("nombres", 80);
  pick("mr", 30);
  pick("gradoEscalafon", 80);

  return snapshot;
}

// ─────────────────────────────
// Handlers
async function create(ctx) {
  try {
    if (!hasValidUser(ctx)) return deny(ctx);
    if (denyIfInspectorOrJefe(ctx)) return deny(ctx);
    if (!isRole(ctx, "POSTULANTE")) return deny(ctx);

    const FormSubmission = ctx?.models?.FormSubmission;
    if (!FormSubmission) return deny(ctx);

    const templateId = ctx?.template && ctx.template._id ? ctx.template._id : ctx?.template;
    if (!templateId) return deny(ctx);

    const rawDatos = parseDatosFromRequest(ctx);
    if (rawDatos === null) return badRequest(ctx);

    let datos;
    try {
      datos = sanitizeDatosAnexo01(rawDatos);
      if (!datos) return badRequest(ctx);
    } catch {
      return badRequest(ctx);
    }

    const doc = await FormSubmission.create({
      template: templateId,
      codigo: CODE,
      usuario: ctx.user._id,
      datos,
      estado: FLOW.DRAFT,
      intervinientes: [{ userId: ctx.user._id, rol: "POSTULANTE" }],
    });

    await auditLogIfAvailable(ctx, doc, "FORM_CREATE", {}, "Create ANEXO_01");

    const vm = await buildViewModel(ctx, doc);
    if (!vm) return deny(ctx);

    return { anexo: vm, message: "Formulario enviado." };
  } catch (e) {
    console.error("[ANEXO_01][create] Error:", e);
    return deny(ctx);
  }
}

async function updateDatos(ctx) {
  try {
    if (!hasValidUser(ctx)) return deny(ctx);
    if (denyIfInspectorOrJefe(ctx)) return deny(ctx);

    const s = getSubmissionOrDeny(ctx);
    if (!s) return deny(ctx);

    if (s.estado !== FLOW.DRAFT) return deny(ctx);
    if (!canWriteDraftAsPostulante(ctx, s)) return deny(ctx);

    const rawDatos = parseDatosFromRequest(ctx);
    if (rawDatos === null) return badRequest(ctx);

    let datos;
    try {
      datos = sanitizeDatosAnexo01(rawDatos);
      if (!datos) return badRequest(ctx);
    } catch {
      return badRequest(ctx);
    }

    s.datos = Object.assign({}, s.datos || {}, datos);
    await s.save();

    await auditLogIfAvailable(ctx, s, "FORM_UPDATE_DATOS", {}, "Update datos ANEXO_01");

    const vm = await buildViewModel(ctx, s);
    if (!vm) return deny(ctx);
    return { anexo: vm };
  } catch (e) {
    console.error("[ANEXO_01][updateDatos] Error:", e);
    return deny(ctx);
  }
}

async function enviar(ctx) {
  try {
    if (!hasValidUser(ctx)) return deny(ctx);
    if (denyIfInspectorOrJefe(ctx)) return deny(ctx);

    const s = getSubmissionOrDeny(ctx);
    if (!s) return deny(ctx);

    if (s.estado !== FLOW.DRAFT) return deny(ctx);
    if (!canWriteDraftAsPostulante(ctx, s)) return deny(ctx);

    if (typeof s.cambiarEstado !== "function") return deny(ctx);

    s.cambiarEstado(FLOW.IN_REVIEW, ctx.user._id, "Enviar ANEXO_01");
    await s.save();

    await auditLogIfAvailable(
      ctx,
      s,
      "FORM_STATE_TRANSITION",
      { estadoAnterior: FLOW.DRAFT, estadoNuevo: FLOW.IN_REVIEW },
      "Enviar ANEXO_01"
    );

    const vm = await buildViewModel(ctx, s);
    if (!vm) return deny(ctx);
    return { anexo: vm };
  } catch (e) {
    console.error("[ANEXO_01][enviar] Error:", e);
    return deny(ctx);
  }
}

async function cerrar(ctx) {
  try {
    if (!hasValidUser(ctx)) return deny(ctx);
    if (denyIfInspectorOrJefe(ctx)) return deny(ctx);

    const s = getSubmissionOrDeny(ctx);
    if (!s) return deny(ctx);

    if (!isRole(ctx, "ADMIN_GENERAL")) return deny(ctx);
    if (s.estado !== FLOW.IN_REVIEW) return deny(ctx);

    if (typeof s.cambiarEstado !== "function") return deny(ctx);

    s.cambiarEstado(FLOW.CLOSED, ctx.user._id, "Cerrar ANEXO_01");
    await s.save();

    await auditLogIfAvailable(
      ctx,
      s,
      "FORM_STATE_TRANSITION",
      { estadoAnterior: FLOW.IN_REVIEW, estadoNuevo: FLOW.CLOSED },
      "Cerrar ANEXO_01"
    );

    const vm = await buildViewModel(ctx, s);
    if (!vm) return deny(ctx);
    return { anexo: vm };
  } catch (e) {
    console.error("[ANEXO_01][cerrar] Error:", e);
    return deny(ctx);
  }
}

async function generateAnexo02From01(ctx) {
  try {
    if (!hasValidUser(ctx)) return deny(ctx);
    if (denyIfInspectorOrJefe(ctx)) return deny(ctx);

    const origen = getSubmissionOrDeny(ctx);
    if (!origen) return deny(ctx);

    if (!isRole(ctx, "ADMIN_GENERAL")) return deny(ctx);
    if (origen.estado !== FLOW.CLOSED) return deny(ctx);

    const FormSubmission = ctx?.models?.FormSubmission;
    if (!FormSubmission) return deny(ctx);

    const existente = await FormSubmission.findOne({ codigo: "ANEXO_02", derivadoDe: origen._id });
    if (existente) {
      const vmExist = await buildViewModel(ctx, existente);
      if (!vmExist) return deny(ctx);
      return { anexo: vmExist, _httpStatus: 200 };
    }

    const snapshot = getSnapshotForAnexo02(origen);

    const ds = ctx?.services?.derivacionesService;
    if (ds && typeof ds.crearAnexo02Desde01 === "function") {
      const created = await ds.crearAnexo02Desde01({ anexo01: origen, snapshot, actor: ctx.user });
      const vmCreated = await buildViewModel(ctx, created);
      if (!vmCreated) return deny(ctx);
      return { anexo: vmCreated, _httpStatus: 201 };
    }

    const nuevo = await FormSubmission.create({
      template: origen.template,
      codigo: "ANEXO_02",
      usuario: origen.usuario,
      derivadoDe: origen._id,
      datos: { snapshotFrom01: snapshot },
      estado: STATE_MAP.MODELO.BORRADOR,
      intervinientes: [{ userId: origen.usuario, rol: "POSTULANTE" }],
    });

    await auditLogIfAvailable(
      ctx,
      nuevo,
      "FORM_CREATE_DERIVED",
      { derivadoDe: String(origen._id) },
      "Create ANEXO_02 from ANEXO_01"
    );

    const vmNuevo = await buildViewModel(ctx, nuevo);
    if (!vmNuevo) return deny(ctx);
    return { anexo: vmNuevo, _httpStatus: 201 };
  } catch (e) {
    console.error("[ANEXO_01][generateAnexo02From01] Error:", e);
    return deny(ctx);
  }
}

async function hydrateDetail(ctx) {
  try {
    const s = getSubmissionOrDeny(ctx);
    if (!s) return deny(ctx);
    if (!canReadAnexo01(ctx, s)) return deny(ctx);

    const vm = await buildViewModel(ctx, s);
    if (!vm) return deny(ctx);
    return { anexo: vm };
  } catch (e) {
    console.error("[ANEXO_01][hydrateDetail] Error:", e);
    return deny(ctx);
  }
}

/**
 * Contrato: devuelve { buffer, filename, contentType, disposition }
 * Prohibido escribir en res desde el módulo.
 */
async function renderPdf(ctx) {
  try {
    const s = getSubmissionOrDeny(ctx);
    if (!s) return deny(ctx);
    if (!canReadAnexo01(ctx, s)) return deny(ctx);

    const pdfService = ctx?.services?.pdfService;
    if (!pdfService || typeof pdfService.renderFormularioPdfBuffer !== "function") return deny(ctx);

    const vm = await buildViewModel(ctx, s);
    if (!vm) return deny(ctx);

    const buffer = await pdfService.renderFormularioPdfBuffer({
      codigo: s.codigo,
      id: String(s._id),
      ctxData: {
        anexo: vm,
        vivienda: ctx?.vivienda || null,
        historial: ctx?.historial || [],
        signers02: ctx?.signers02,
        signers03: ctx?.signers03,
        signers04: ctx?.signers04,
        signers07: ctx?.signers07,
        signers08: ctx?.signers08,
        signers09: ctx?.signers09,
        signers11: ctx?.signers11,
      },
    });

    if (!buffer) return deny(ctx);

    return {
      buffer,
      filename: `${String(s.codigo).toUpperCase()}_${String(s._id)}.pdf`,
      contentType: "application/pdf",
      disposition: "inline",
    };
  } catch (e) {
    console.error("[ANEXO_01][renderPdf] Error:", e);
    return deny(ctx);
  }
}

module.exports = {
  code: CODE,

  create,
  updateDatos,
  enviar,
  cerrar,
  generateAnexo02From01,
  hydrateDetail,
  renderPdf,

  getSnapshotForAnexo02,

  _STATE_MAP: STATE_MAP,
  _FLOW: FLOW,
};