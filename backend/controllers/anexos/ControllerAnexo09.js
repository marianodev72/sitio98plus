"use strict";

/**
 * backend/controllers/anexos/ControllerAnexo09.js
 * Módulo V2 para Controller Maestro V2 (exporta funciones)
 *
 * ANEXO_09 – ACTA DE ENTREGA DE VIVIENDA FISCAL
 *
 * Observaciones auditor:
 * - O1: estadoInstitucional NO debe ser usado como estado real por frontend.
 *      => En presenter/hydrate NO se expone "estadoInstitucional". Se expone "leyendaInstitucional".
 * - O2: PDF no debe consumir datos crudos desde datos sin pasar por presenter/hydrate.
 *      => renderPdf arma presenter y pasa al pdfService un safeSubmission con datos = presented (DTO).
 *
 * Circuito institucional:
 * - Inicia INSPECTOR desde ANEXO_08 CERRADO (derivadoDe obligatorio)
 * - PERMISIONARIO da conformidad (ok true/false) -> EN_REVISION
 * - ADMIN_GENERAL cierra:
 *    - Si permisionario ok=false => estadoInstitucional = "CON NOVEDADES"
 *    - Si permisionario ok=true  => estadoInstitucional = null
 *
 * Reglas:
 * - Fail-closed + no-disclosure: genericDenied
 * - ADMIN = solo lectura
 * - Cierre: solo ADMIN_GENERAL
 * - Estados: SOLO via submission.cambiarEstado()
 * - Allowlist estricta + sanitización deep anti prototype
 * - Cross-anexo: nace desde ANEXO_08 (derivadoDe obligatorio + anexo08Id)
 * - Datos claros en UI/PDF: vivienda.codigo + nombre/apellido (no ObjectId como display)
 */

const PDF_CONTENT_TYPE = "application/pdf";

const TRANSITIONS = {
  ENVIADO: ["EN_REVISION"],
  EN_REVISION: ["CERRADO"],
  CERRADO: [],
};

const ALLOWLIST_DATOS = [
  // trazabilidad
  "derivadoDe",
  "anexo08Id",
  "viviendaId",
  "permisionarioId",

  // datos claros (institucional)
  "unidadHabitacional",
  "direccionUnidad",
  "direccion", // compat (si front lo manda así)
  "localidad",
  "provincia",
  "lugar",
  "fechaEntrega",

  // actores
  "permisionarioNombre",
  "gradoPermisionario",
  "inspectorNombre",
  "inspectorBarrio",

  // observaciones
  "observacionesInspector",
  "observacionesPermisionario",
  "observacionesAdminGeneral",

  // conformidades / actuaciones
  "conformidadInspector",
  "conformidadPermisionario",
  "conformidadAdminGeneral",
];

function sanitizeDeep(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeDeep);

  const clean = {};
  for (const k of Object.keys(obj)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    clean[k] = sanitizeDeep(obj[k]);
  }
  return clean;
}

function pickAllowlist(obj, allowlist) {
  const out = {};
  for (const k of allowlist) {
    if (obj?.[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to);
}

// Gate territorial estricto SOLO INSPECTOR (fail-closed)
function barrioGateStrict({ user, vivienda }) {
  if (!user?.permisos?.includes("INSPECTOR")) return true;

  const uBarrio = String(user?.barrioAsignado || "").trim();
  const vBarrio = String(vivienda?.barrio || "").trim();

  if (!uBarrio || !vBarrio) return false;
  return uBarrio === vBarrio;
}

/**
 * Presenter único (FUENTE PARA UI + PDF)
 * - O1: NO expone estadoInstitucional -> expone leyendaInstitucional
 * - O2: es el único DTO permitido para PDF
 */
function presentAnexo09({ submission, vivienda }) {
  const datos = submission?.datos && typeof submission.datos === "object" ? submission.datos : {};

  const viviendaCodigo = vivienda?.codigo || datos.unidadHabitacional || "";
  const viviendaDireccion = datos.direccionUnidad || datos.direccion || vivienda?.direccion || "";
  const viviendaLocalidad = datos.localidad || "";
  const viviendaProvincia = datos.provincia || "";
  const viviendaBarrio = vivienda?.barrio || submission?.barrio || datos.barrio || "";

  const permisionarioNombre = String(datos.permisionarioNombre || "").trim();
  const gradoPermisionario = String(datos.gradoPermisionario || "").trim();
  const inspectorNombre = String(datos.inspectorNombre || "").trim();

  // ✅ O1: para frontend y PDF solo "leyendaInstitucional"
  const leyendaInstitucional =
    submission?.estadoInstitucional ? String(submission.estadoInstitucional) : null;

  return {
    id: submission?._id,
    codigo: "ANEXO_09",
    estado: submission?.estado,
    leyendaInstitucional,

    // datos claros vivienda
    vivienda: {
      codigo: viviendaCodigo,
      direccion: viviendaDireccion,
      localidad: viviendaLocalidad,
      provincia: viviendaProvincia,
      barrio: viviendaBarrio,
    },

    // actores claros
    permisionario: { nombre: permisionarioNombre, grado: gradoPermisionario },
    inspector: { nombre: inspectorNombre },

    // cuerpo institucional
    acto: {
      fechaEntrega: datos.fechaEntrega || null,
      lugar: datos.lugar || "",
    },

    observaciones: {
      inspector: datos.observacionesInspector || "",
      permisionario: datos.observacionesPermisionario || "",
      adminGeneral: datos.observacionesAdminGeneral || "",
    },

    conformidades: {
      inspector: datos.conformidadInspector || null,
      permisionario: datos.conformidadPermisionario || null,
      adminGeneral: datos.conformidadAdminGeneral || null,
    },

    // compat: mantenemos "datos" para front legacy (sanitizado por modelo),
    // pero el contrato institucional indica que UI lógica se basa en "estado".
    datos,
  };
}

// ─────────────────────────────────────────────
// API V2 (export)
// ─────────────────────────────────────────────

async function create(ctx) {
  const { req, user, core, models } = ctx;
  const { genericDenied, isObjectId, up } = core;
  const { FormSubmission, FormTemplate, Vivienda, User } = models;

  try {
    const codigo = up(req.params.codigo || "ANEXO_09");
    if (codigo !== "ANEXO_09") return genericDenied(ctx.res);

    // INSPECTOR inicia
    if (!user?.permisos?.includes("INSPECTOR")) return genericDenied(ctx.res);

    const anexo08Id = req.params.id;
    if (!isObjectId(anexo08Id)) return genericDenied(ctx.res);

    // Origen ANEXO_08 (debe estar CERRADO)
    const a08 = await FormSubmission.findById(anexo08Id);
    if (!a08 || up(a08.codigo) !== "ANEXO_08") return genericDenied(ctx.res);
    if (up(a08.estado) !== "CERRADO") return genericDenied(ctx.res);

    // template requerido
    const templateId =
      ctx.template ||
      (await FormTemplate.findOne({ code: "ANEXO_09", activo: true })
        .sort({ version: -1, createdAt: -1 })
        .select({ _id: 1 })
        .lean())?._id;

    if (!templateId) return genericDenied(ctx.res);

    // Resolver vivienda
    let vivienda = null;
    const viviendaIdFromOrigen = a08?.vivienda ? String(a08.vivienda) : null;
    const viviendaIdFromDatos = a08?.datos?.viviendaId ? String(a08.datos.viviendaId) : null;

    const viviendaId =
      (isObjectId(viviendaIdFromOrigen) && viviendaIdFromOrigen) ||
      (isObjectId(viviendaIdFromDatos) && viviendaIdFromDatos) ||
      null;

    if (viviendaId && Vivienda?.findById) {
      vivienda = await Vivienda.findById(viviendaId).lean();
    }
    if (!vivienda) return genericDenied(ctx.res);

    // Gate territorial estricto en creación
    if (!barrioGateStrict({ user, vivienda })) return genericDenied(ctx.res);

    // Body -> allowlist + deep sanitize anti-proto
    const cleanBody = sanitizeDeep(req.body || {});
    const datos = pickAllowlist(cleanBody, ALLOWLIST_DATOS);

    // Cross-anexo obligatorio
    datos.derivadoDe = String(a08._id);
    datos.anexo08Id = String(a08._id);

    // Datos claros vivienda + fecha/lugar
    datos.viviendaId = String(vivienda._id);
    datos.unidadHabitacional = datos.unidadHabitacional || vivienda.codigo || "";
    datos.direccionUnidad =
      datos.direccionUnidad || datos.direccion || vivienda.direccion || "";
    datos.localidad = datos.localidad || vivienda.barrio || "";
    datos.lugar = datos.lugar || datos.localidad || "";
    datos.fechaEntrega = datos.fechaEntrega || new Date();

    // Permisionario (si viene desde ANEXO_08 o Vivienda)
    let permisionarioId = null;

    if (isObjectId(a08?.datos?.permisionarioId)) {
      permisionarioId = String(a08.datos.permisionarioId);
    } else if (isObjectId(vivienda?.ocupacionActual?.permisionario)) {
      permisionarioId = String(vivienda.ocupacionActual.permisionario);
    }

    if (permisionarioId) {
      datos.permisionarioId = datos.permisionarioId || permisionarioId;

      if (User?.findById) {
        const uPerm = await User.findById(permisionarioId)
          .select("nombre apellido meta")
          .lean();

        if (uPerm) {
          const apeNom = `${String(uPerm.apellido || "").trim()} ${String(
            uPerm.nombre || ""
          ).trim()}`.trim();
          if (!datos.permisionarioNombre) datos.permisionarioNombre = apeNom;

          const meta = uPerm.meta || {};
          if (!datos.gradoPermisionario) {
            datos.gradoPermisionario = String(meta.grado || meta.rango || "").trim();
          }
        }
      }
    }

    // Inspector snapshot + conformidad inspector al crear
    datos.inspectorNombre = `${String(user.nombre || "").trim()} ${String(
      user.apellido || ""
    ).trim()}`.trim();
    datos.inspectorBarrio = String(user.barrioAsignado || "").trim() || datos.inspectorBarrio || "";

    datos.conformidadInspector = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion:
        datos.observacionesInspector ||
        "Acta de entrega de vivienda generada por inspector.",
    };

    // Importante: NO auto conformidad permisionario
    // (solo por endpoint confirmByPermisionario09)
    delete datos.conformidadPermisionario;

    const sub = new FormSubmission({
      codigo: "ANEXO_09",
      template: templateId,
      usuario: user._id, // inspector
      vivienda: vivienda._id,
      barrio: vivienda.barrio,
      datos,
      estado: "ENVIADO",
      estadoInstitucional: null,
      derivadoDe: a08._id,
    });

    await sub.save();
    return { anexo: sub };
  } catch (e) {
    console.error("[V2][ANEXO_09.create] Error:", e);
    return ctx.core.genericDenied(ctx.res);
  }
}

async function hydrateDetail(ctx) {
  const { submission, core, models } = ctx;
  const { genericDenied, up, isObjectId } = core;
  const { Vivienda } = models;

  try {
    if (!submission || up(submission.codigo) !== "ANEXO_09") return genericDenied(ctx.res);

    // Resolver vivienda si falta
    let vivienda = ctx.vivienda || null;
    const viviendaId =
      submission?.vivienda ||
      submission?.datos?.viviendaId ||
      null;

    if (!vivienda && viviendaId && isObjectId(viviendaId) && Vivienda?.findById) {
      vivienda = await Vivienda.findById(viviendaId).lean();
    }

    const presented = presentAnexo09({ submission, vivienda });
    return { anexo: presented };
  } catch (e) {
    console.error("[V2][ANEXO_09.hydrateDetail] Error:", e);
    return genericDenied(ctx.res);
  }
}

/**
 * Permite edición del contenido por INSPECTOR antes de conformidad del permisionario.
 * - Solo ENVIADO
 * - Solo INSPECTOR
 * - Allowlist estricta (se ignoran llaves fuera de allowlist)
 * - No permite setear conformidades desde updateDatos (solo por endpoints dedicados)
 */
async function updateDatos(ctx) {
  const { req, res, user, core, models } = ctx;
  const { genericDenied, isObjectId, up, isAdminReadOnly } = core;
  const { FormSubmission } = models;

  try {
    if (isAdminReadOnly(user)) return genericDenied(res);
    if (!user?.permisos?.includes("INSPECTOR")) return genericDenied(res);

    if (!isObjectId(req.params.id)) return genericDenied(res);

    const sub = await FormSubmission.findById(req.params.id);
    if (!sub || up(sub.codigo) !== "ANEXO_09") return genericDenied(res);

    if (up(sub.estado) !== "ENVIADO") return genericDenied(res);

    const cleanBody = sanitizeDeep(req.body || {});
    const incoming = pickAllowlist(cleanBody, ALLOWLIST_DATOS);

    // Nunca por update: conformidades
    delete incoming.conformidadInspector;
    delete incoming.conformidadPermisionario;
    delete incoming.conformidadAdminGeneral;

    // Mantener vínculos institucionales existentes (fail-closed)
    sub.datos = sub.datos && typeof sub.datos === "object" ? sub.datos : {};
    incoming.derivadoDe = sub.datos.derivadoDe || sub.derivadoDe || incoming.derivadoDe;
    incoming.anexo08Id = sub.datos.anexo08Id || incoming.anexo08Id;
    incoming.viviendaId = sub.datos.viviendaId || incoming.viviendaId;
    incoming.permisionarioId = sub.datos.permisionarioId || incoming.permisionarioId;

    // Merge allowlisted
    sub.datos = { ...sub.datos, ...incoming };
    sub.markModified("datos");

    await sub.save();
    return res.json(sub);
  } catch (e) {
    console.error("[V2][ANEXO_09.updateDatos] Error:", e);
    return genericDenied(res);
  }
}

/**
 * Permisionario da conformidad (ok true/false).
 * - Solo PERMISIONARIO
 * - Solo ENVIADO
 * - Debe coincidir con datos.permisionarioId (fail-closed)
 * - Pasa a EN_REVISION siempre (para que Admin General cierre)
 */
async function confirmByPermisionario09(ctx) {
  const { req, res, user, core, models } = ctx;
  const { genericDenied, isObjectId, up } = core;
  const { FormSubmission } = models;

  try {
    if (up(user?.role) !== "PERMISIONARIO") return genericDenied(res);
    if (!isObjectId(req.params.id)) return genericDenied(res);

    const sub = await FormSubmission.findById(req.params.id);
    if (!sub || up(sub.codigo) !== "ANEXO_09") return genericDenied(res);

    if (up(sub.estado) !== "ENVIADO") return genericDenied(res);

    const permisionarioId = sub?.datos?.permisionarioId ? String(sub.datos.permisionarioId) : null;
    if (!permisionarioId || String(user._id) !== permisionarioId) return genericDenied(res);

    // Body:
    // { ok?: boolean, observaciones?: string }
    const ok = typeof req.body?.ok === "boolean" ? req.body.ok : true;
    const obs = String(req.body?.observaciones || "").trim();

    sub.datos = sub.datos || {};
    sub.datos.observacionesPermisionario = obs;

    sub.datos.conformidadPermisionario = {
      ok,
      fecha: new Date(),
      usuario: user._id,
      observacion: obs || null,
    };

    if (!canTransition(sub.estado, "EN_REVISION")) return genericDenied(res);

    const obsCambio = ok
      ? "Conformidad Permisionario ANEXO_09"
      : "Sin conformidad del Permisionario ANEXO_09";

    sub.cambiarEstado("EN_REVISION", user._id, obsCambio);
    await sub.save();

    return res.json(sub);
  } catch (e) {
    console.error("[V2][ANEXO_09.confirmByPermisionario09] Error:", e);
    return genericDenied(res);
  }
}

/**
 * ADMIN_GENERAL cierra el trámite.
 * - Solo ADMIN_GENERAL
 * - Solo EN_REVISION
 * - Si permisionario ok=false => estadoInstitucional = "CON NOVEDADES"
 */
async function closeByAdminGeneral09(ctx) {
  const { req, res, user, core, models } = ctx;
  const { genericDenied, isObjectId, up, isAdminReadOnly, isAdminGeneral } = core;
  const { FormSubmission } = models;

  try {
    // ADMIN read-only + cierre solo ADMIN_GENERAL
    if (isAdminReadOnly(user)) return genericDenied(res);
    if (!isAdminGeneral(user)) return genericDenied(res);

    if (!isObjectId(req.params.id)) return genericDenied(res);

    const sub = await FormSubmission.findById(req.params.id);
    if (!sub || up(sub.codigo) !== "ANEXO_09") return genericDenied(res);

    if (up(sub.estado) !== "EN_REVISION") return genericDenied(res);

    const obs = String(req.body?.observaciones || "").trim();

    sub.datos = sub.datos || {};
    sub.datos.observacionesAdminGeneral = obs;
    sub.datos.conformidadAdminGeneral = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion: obs || null,
    };

    const permOk = sub?.datos?.conformidadPermisionario?.ok;

    // Si no hay conformidad registrada => fail-closed
    if (typeof permOk !== "boolean") return genericDenied(res);

    // “CON NOVEDADES” si no hay OK
    if (permOk === false) {
      sub.estadoInstitucional = "CON NOVEDADES";
    } else {
      sub.estadoInstitucional = null;
    }

    if (!canTransition(sub.estado, "CERRADO")) return genericDenied(res);

    const obsCierre =
      permOk === false
        ? "Cierre ADMIN_GENERAL ANEXO_09 (CON NOVEDADES)"
        : "Cierre ADMIN_GENERAL ANEXO_09";

    sub.cambiarEstado("CERRADO", user._id, obsCierre);
    await sub.save();

    return res.json(sub);
  } catch (e) {
    console.error("[V2][ANEXO_09.closeByAdminGeneral09] Error:", e);
    return genericDenied(res);
  }
}

/**
 * PDF
 * - O2: NO se pasa submission.datos crudo al renderer.
 * - Se arma presenter (mismo DTO que hydrateDetail) y se pasa como safeSubmission.datos.
 */
async function renderPdf(ctx) {
  const { res, submission, user, core, services, models } = ctx;
  const { genericDenied, up, isObjectId } = core;
  const { Vivienda } = models;

  try {
    if (!submission || up(submission.codigo) !== "ANEXO_09") return genericDenied(res);

    const { pdfService } = services || {};
    if (!pdfService || typeof pdfService.renderByCodigo !== "function") {
      console.error("[V2][ANEXO_09.renderPdf] pdfService no disponible");
      return genericDenied(res);
    }

    // Resolver vivienda para presenter
    let vivienda = ctx.vivienda || null;
    const viviendaId =
      submission?.vivienda ||
      submission?.datos?.viviendaId ||
      null;

    if (!vivienda && viviendaId && isObjectId(viviendaId) && Vivienda?.findById) {
      vivienda = await Vivienda.findById(viviendaId).lean();
    }

    // ✅ Presenter único (DTO)
    const presented = presentAnexo09({ submission, vivienda });

    // ✅ Safe submission para renderer: datos = presented (NO datos crudos)
    const safeSubmission = {
      _id: submission._id,
      codigo: "ANEXO_09",
      estado: submission.estado,
      // no exponemos estadoInstitucional como “estado real”, pero el renderer puede usar leyendaInstitucional del DTO
      datos: presented,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    };

    const out = await pdfService.renderByCodigo({
      codigo: "ANEXO_09",
      submission: safeSubmission,
      vivienda: null, // ya viene dentro del DTO
      user,
    });

    if (!out?.buffer) return genericDenied(res);

    return {
      buffer: out.buffer,
      contentType: out.contentType || PDF_CONTENT_TYPE,
      disposition: out.disposition || "inline",
      filename: out.filename || `ANEXO_09_${submission._id}.pdf`,
    };
  } catch (e) {
    console.error("[V2][ANEXO_09.renderPdf] Error:", e);
    return genericDenied(res);
  }
}

module.exports = {
  create,
  hydrateDetail,
  updateDatos,
  renderPdf,
  confirmByPermisionario09,
  closeByAdminGeneral09,
};