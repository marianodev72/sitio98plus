"use strict";

/**
 * backend/controllers/anexos/ControllerAnexo07.js
 *
 * Estándar Maestro V2:
 * - Exporta funciones async fn(ctx)
 * - Fail-Closed + No-Disclosure (mensaje único en DENY)
 * - Mutaciones: documento Mongoose real (NO lean)
 * - Transiciones: solo cambiarEstado()
 * - Sanitización: allowlist + anti-proto deep
 * - PDF: presenter legible (sin ObjectId crudos)
 */

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const up = (v) => String(v || "").toUpperCase().trim();

function isPlainObject(x) {
  if (!x || typeof x !== "object") return false;
  if (Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

function assertNoProtoDeep(value) {
  if (!value || typeof value !== "object") return true;

  if (Array.isArray(value)) {
    for (const v of value) assertNoProtoDeep(v);
    return true;
  }

  if (!isPlainObject(value)) throw new Error("Non-plain object");

  for (const k of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(k)) throw new Error("Proto key");
    assertNoProtoDeep(value[k]);
  }

  return true;
}

function parseDatos(req) {
  // Compat FE: acepta {datos:{}} o body directo, y string JSON (FormData)
  let datos = req?.body?.datos ?? req?.body;

  if (typeof datos === "string") {
    try {
      datos = JSON.parse(datos || "{}");
    } catch {
      return { ok: false, datos: null };
    }
  }

  if (!isPlainObject(datos)) return { ok: false, datos: null };

  try {
    assertNoProtoDeep(datos);
  } catch {
    return { ok: false, datos: null };
  }

  return { ok: true, datos };
}

// ─────────────────────────────
// Auth helpers (alineado al legacy de ANEXO_07)
function isInspectorLikeUser(user) {
  const role = up(user?.role);
  const permisos = Array.isArray(user?.permisos) ? user.permisos.map(up) : [];
  return role === "INSPECTOR_DISABLED" || permisos.includes("INSPECTOR");
}

function isInspectorInterviniente(sub, userId) {
  const list = Array.isArray(sub?.intervinientes) ? sub.intervinientes : [];
  return list.some((x) => String(x?.userId) === String(userId) && up(x?.rol) === "INSPECTOR");
}

function getSubmissionBarrio(sub) {
  if (sub?.barrioAsignado !== undefined) return sub.barrioAsignado;
  if (sub?.barrio !== undefined) return sub.barrio;
  return undefined;
}

// ─────────────────────────────
// Allowlist patches
function applyInspectorPatch(prevDatos, nextDatos, userId) {
  const prev = isPlainObject(prevDatos) ? prevDatos : {};
  const cleaned = { ...prev };

  if (typeof nextDatos?.observacionesInspector === "string") {
    cleaned.observacionesInspector = nextDatos.observacionesInspector.trim();
  }

  cleaned.conformidadInspector = {
    ok: true,
    fecha: new Date(),
    usuario: userId,
    observacion:
      typeof nextDatos?.observacionesInspector === "string"
        ? nextDatos.observacionesInspector.trim() || undefined
        : undefined,
  };

  return cleaned;
}

function applyAdminClose(prevDatos, nextDatos, userId) {
  const prev = isPlainObject(prevDatos) ? prevDatos : {};
  const cleaned = { ...prev };

  if (typeof nextDatos?.observacionesAdminGeneral === "string") {
    cleaned.observacionesAdminGeneral = nextDatos.observacionesAdminGeneral.trim();
  }

  if (Array.isArray(nextDatos?.novedades)) {
    cleaned.novedades = nextDatos.novedades.map((x) => String(x || "").trim());
  }

  cleaned.conformidadAdminGeneral = {
    ok: true,
    fecha: new Date(),
    usuario: userId,
    observacion:
      typeof nextDatos?.observacionesAdminGeneral === "string"
        ? nextDatos.observacionesAdminGeneral.trim() || undefined
        : undefined,
  };

  return cleaned;
}

// ─────────────────────────────
// Presenter (evitar exponer ObjectId en UI/preview)
// Nota: derivadoDe se filtra en Maestro (stripDerivadoDeIfNotBackoffice)
function presentForApi(submission) {
  if (!submission) return submission;
  const obj = typeof submission.toObject === "function" ? submission.toObject() : submission;

  // Evitar ObjectId “crudos” en datos comunes (dejamos _id porque FE navega con _id)
  const out = { ...obj };

  // Si hubiera viviendaId u otros ids en datos, no los quitamos aquí para no romper FE,
  // pero el PDF no los muestra crudos.

  return out;
}

// =======================================================
// API módulo (Maestro V2)
// =======================================================

async function hydrateDetail(ctx) {
  // En ANEXO_07, el FE típico consume el submission directo.
  // No agregamos metadata extra para evitar filtraciones cross-anexo.
  // Maestro ya filtra derivadoDe para no-backoffice.
  const { res, submission, core } = ctx;
  try {
    if (!submission || up(submission.codigo) !== "ANEXO_07") return core.genericDenied(res);
    return presentForApi(submission);
  } catch (e) {
    console.error("[ANEXO_07.hydrateDetail] Error:", e);
    return core.genericDenied(res);
  }
}

/**
 * PATCH datos (INSPECTOR)
 * Estado nominal: ENVIADO → EN_REVISION
 * Importante: muta doc real (NO lean) y usa cambiarEstado.
 */
async function updateDatos(ctx) {
  const { req, res, user, submission, models, core } = ctx;
  const { FormSubmission } = models;

  try {
    if (!user || !user.role) return core.genericDenied(res);
    if (!submission || up(submission.codigo) !== "ANEXO_07") return core.genericDenied(res);

    // Defensa en profundidad (router ya valida permiso inspector en routes dedicadas)
    if (!isInspectorLikeUser(user)) return core.genericDenied(res);
    if (!user.barrioAsignado) return core.genericDenied(res);

    // Estado nominal legacy
    if (up(submission.estado) !== "ENVIADO") return core.genericDenied(res);

    const barrio = getSubmissionBarrio(submission);
    if (!barrio) return core.genericDenied(res);
    if (String(barrio) !== String(user.barrioAsignado)) return core.genericDenied(res);

    if (!isInspectorInterviniente(submission, user._id)) return core.genericDenied(res);

    const parsed = parseDatos(req);
    if (!parsed.ok) return core.badRequest(res, "Recurso no disponible");

    // MUTACIÓN => doc real
    const doc = await FormSubmission.findById(submission._id);
    if (!doc) return core.genericDenied(res);

    doc.datos = applyInspectorPatch(doc.datos || {}, parsed.datos, user._id);

    // Transición obligatoria
    doc.cambiarEstado("EN_REVISION", user._id, "Revisión / observaciones del inspector (ANEXO_07)");

    await doc.save();
    return res.json({ anexo: presentForApi(doc) });
  } catch (e) {
    console.error("[ANEXO_07.updateDatos] Error:", e);
    return core.genericDenied(res);
  }
}

/**
 * Cierre ADMIN_GENERAL
 * Nominal: EN_REVISION → CERRADO
 * Compat: flag ALLOW_ADMIN_CLOSE_ANEXO07_ANY_STATE=true (se mantiene por instrucción).
 */
async function closeByAdminGeneral(ctx) {
  const { req, res, user, submission, models, core } = ctx;
  const { FormSubmission } = models;

  try {
    if (!user || !user.role) return core.genericDenied(res);
    if (up(user.role) !== "ADMIN_GENERAL") return core.genericDenied(res);
    if (!submission || up(submission.codigo) !== "ANEXO_07") return core.genericDenied(res);

    const parsed = parseDatos(req);
    if (!parsed.ok) return core.badRequest(res, "Recurso no disponible");

    // MUTACIÓN => doc real
    const doc = await FormSubmission.findById(submission._id);
    if (!doc) return core.genericDenied(res);

    // Idempotencia
    if (up(doc.estado) === "CERRADO") {
      return res.json({ anexo: presentForApi(doc) });
    }

    const allowAny =
      String(process.env.ALLOW_ADMIN_CLOSE_ANEXO07_ANY_STATE || "").toLowerCase().trim() === "true";

    if (!allowAny && up(doc.estado) !== "EN_REVISION") {
      return core.genericDenied(res);
    }

    doc.datos = applyAdminClose(doc.datos || {}, parsed.datos, user._id);

    doc.cambiarEstado("CERRADO", user._id, "Cierre ADMIN_GENERAL (ANEXO_07)");

    await doc.save();
    return res.json({ anexo: presentForApi(doc) });
  } catch (e) {
    console.error("[ANEXO_07.closeByAdminGeneral] Error:", e);
    return core.genericDenied(res);
  }
}

/**
 * PDF
 * - No muestra ObjectId crudos
 * - Usa valores legibles
 */
async function renderPdf(ctx) {
  const { res, submission, core, extra } = ctx;

  try {
    if (!submission || up(submission.codigo) !== "ANEXO_07") return core.genericDenied(res);

    let PDFDocument;
    try {
      // eslint-disable-next-line global-require
      PDFDocument = require("pdfkit");
    } catch {
      PDFDocument = null;
    }
    if (!PDFDocument) return core.genericDenied(res);

    const datos = submission?.datos && typeof submission.datos === "object" ? submission.datos : {};
    const vivienda = extra?.vivienda || null;

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    const done = new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(16).text("ANEXO_07", { align: "center" });
    doc.moveDown();

    doc.fontSize(10);
    doc.text("Código: ANEXO_07");
    doc.text(`Estado: ${String(submission.estado || "")}`);
    if (submission.createdAt) doc.text(`Fecha: ${new Date(submission.createdAt).toLocaleString()}`);

    if (vivienda) {
      const vLabel =
        vivienda?.codigo || vivienda?.nombre || vivienda?.direccion || vivienda?.domicilio || "";
      if (vLabel) doc.text(`Vivienda: ${String(vLabel)}`);
    }

    doc.moveDown();
    doc.fontSize(12).text("Observaciones inspector", { underline: true });
    doc.fontSize(10).text(String(datos.observacionesInspector || ""));
    doc.moveDown();

    doc.fontSize(12).text("Observaciones ADMIN_GENERAL", { underline: true });
    doc.fontSize(10).text(String(datos.observacionesAdminGeneral || ""));
    doc.moveDown();

    if (Array.isArray(datos.novedades) && datos.novedades.length) {
      doc.fontSize(12).text("Novedades", { underline: true });
      doc.fontSize(10);
      datos.novedades.forEach((n, i) => doc.text(`${i + 1}. ${String(n || "")}`));
      doc.moveDown();
    }

    doc.end();
    const buffer = await done;

    return {
      buffer,
      filename: `ANEXO_07_${String(submission._id)}.pdf`,
      contentType: "application/pdf",
      disposition: "inline",
    };
  } catch (e) {
    console.error("[ANEXO_07.renderPdf] Error:", e);
    return core.genericDenied(res);
  }
}

module.exports = {
  code: "ANEXO_07",
  hydrateDetail,
  updateDatos,
  closeByAdminGeneral,
  renderPdf,
};