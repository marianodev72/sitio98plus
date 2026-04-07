"use strict";

/**
 * backend/controllers/anexos/ControllerAnexo02.js
 *
 * ANEXO_02 — ASIGNACION DE VIVIENDA FISCAL
 *
 * Decisión institucional:
 * - INSPECTOR y JEFE_DE_BARRIO NO tienen incumbencia en ANEXO_02.
 *   => No se buscan, no se agregan como intervinientes, no existen ramas “best-effort”.
 *
 * Seguridad institucional:
 * - Fail-Closed: ante duda => genericDenied()
 * - No-Disclosure: 403 { message: "Recurso no disponible" }
 * - Sanitización: allowlist + bloqueo __proto__/constructor/prototype
 * - Estados: NUNCA setear estado a mano; transiciones via cambiarEstado(...)
 * - Reserva vivienda: atómica (race-safe)
 * - ADMIN solo lectura: deny en generate/consent/close
 *
 * Compat FE (GestionarAnexo.tsx):
 * - generate: si existe => 200 {anexo}; si crea => 201 {anexo}; mismatch => 403
 * - close: FE envía { datos:{} } -> nosotros ignoramos excepto allowlist de fechas
 *
 * Mensaje oficial (mutaciones sin lean):
 * - ctx.submission debe ser documento Mongoose real.
 * - Prohibido rehidratar con findById().lean() dentro del módulo.
 */

const ControllerAnexo02 = {
  code: "ANEXO_02",

  // Estado inicial institucional (equivalente a “listo para conformidad”)
  ESTADO_INICIAL: "ENVIADO",

  // Incumbencias explícitas (para evitar reintroducciones futuras)
  ANEXO_02_INCUMBENCIAS: Object.freeze({
    INSPECTOR: false,
    JEFE_DE_BARRIO: false,
  }),

  // Tabla explícita de transiciones (auditoría: “no implícito”)
  TRANSITIONS: Object.freeze({
    ENVIADO: ["EN_REVISION"],
    EN_REVISION: ["CERRADO"],
  }),

  async create(ctx) {
    // Institucionalmente ANEXO_02 se genera desde ANEXO_01
    return ctx.core.genericDenied(ctx.res);
  },

  /**
   * hydrateDetail (solo backoffice; el Maestro decide si lo llama)
   * - ANEXO_02 requiere origen ANEXO_01
   * - Devuelve { anexo } enriquecido con origen.adjuntos (metadata)
   * - NO expone ObjectId del origen (P0.8)
   */
  async hydrateDetail(ctx) {
    const { user, submission } = ctx;
    const { genericDenied, up, isObjectId, canSeeSubmission } = ctx.core;
    const { FormSubmission } = ctx.models;

    if (!user || !user.role) return genericDenied(ctx.res);
    if (!submission || up(submission.codigo) !== "ANEXO_02") return genericDenied(ctx.res);

    if (!isObjectId(submission.derivadoDe)) return genericDenied(ctx.res);

    const origen = await FormSubmission.findById(submission.derivadoDe)
      .select({ _id: 1, codigo: 1, adjuntos: 1, usuario: 1 })
      .lean();

    if (!origen || up(origen.codigo) !== "ANEXO_01") return genericDenied(ctx.res);
    if (typeof canSeeSubmission === "function" && !canSeeSubmission(user, origen)) {
      return genericDenied(ctx.res);
    }

    // NO exponer origen._id (P0.8)
    return {
      anexo: {
        ...submission,
        origen: {
          codigo: "ANEXO_01",
          adjuntos: Array.isArray(origen.adjuntos) ? origen.adjuntos : [],
        },
      },
    };
  },

  /**
   * POST /api/formularios/:id/conformidad
   * - POSTULANTE owner
   * - Fuente única: postulante = anexo01.usuario (source of truth)
   * - Si no hay origen => deny (ANEXO_02 inconsistente)
   * - ENVIADO -> EN_REVISION (idempotente si ya EN_REVISION/CERRADO)
   */
  async giveConsentPostulante(ctx) {
    const { res, user, submission } = ctx;
    const { genericDenied, up, isObjectId, isPostulante, isAdminReadOnly } = ctx.core;
    const { FormSubmission } = ctx.models;

    if (!user || !user.role) return genericDenied(res);
    if (isAdminReadOnly(user)) return genericDenied(res); // ADMIN solo lectura
    if (!isPostulante(user)) return genericDenied(res);

    // Mutación: submission debe ser doc mongoose real
    const anexo = submission;
    if (!anexo || up(anexo.codigo) !== "ANEXO_02") return genericDenied(res);
    if (typeof anexo.save !== "function") return genericDenied(res);

    // Origen institucional:
    // - preferimos ANEXO_01 (derivadoDe) como source-of-truth
    // - pero soportamos ANEXO_02 legacy sin derivadoDe (compat producción/histórico)
    let postulanteId = null;
    let anexo01Id = null;

    if (isObjectId(anexo.derivadoDe)) {
      const a01 = await FormSubmission.findById(anexo.derivadoDe)
        .select({ _id: 1, codigo: 1, usuario: 1 })
        .lean();

      if (!a01 || up(a01.codigo) !== "ANEXO_01" || !isObjectId(a01.usuario)) {
        return genericDenied(res);
      }

      postulanteId = a01.usuario;
      anexo01Id = a01._id;
    } else {
      // Legacy: fuente de verdad = owner del submission
      if (!isObjectId(anexo.usuario)) return genericDenied(res);
      postulanteId = anexo.usuario;
      anexo01Id = null; // no disponible en legacy
    }

    // Persistimos coherencia mínima (sin disclosure)
    anexo.datos = safePlainObject(anexo.datos) ? anexo.datos : {};
    anexo.datos.postulanteId = postulanteId;
    if (anexo01Id) anexo.datos.anexo01Id = anexo01Id;

    if (String(user._id) !== String(postulanteId)) return genericDenied(res);


    const est = up(anexo.estado);
    if (["EN_REVISION", "CERRADO"].includes(est)) {
      await anexo.save();
      return res.json({
        anexo: anexo?.toObject ? anexo.toObject() : anexo,
    });
    }

    // Transición válida: solo ENVIADO -> EN_REVISION
    if (est !== up(ControllerAnexo02.ESTADO_INICIAL)) return genericDenied(res);
    if (!isTransitionAllowed(ControllerAnexo02.TRANSITIONS, est, "EN_REVISION")) {
      return genericDenied(res);
    }

    anexo.conformidadPostulante = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
    };

    if (typeof anexo.cambiarEstado !== "function") return genericDenied(res);
    await anexo.cambiarEstado("EN_REVISION", user._id, "Conformidad postulante");

    await anexo.save();
    return res.json({
    anexo: anexo?.toObject ? anexo.toObject() : anexo,
  });
  },

  /**
   * POST /api/formularios/:id/conformidad-admin
   * - ADMIN_GENERAL
   * - Requiere: conformidadPostulante.ok y estado EN_REVISION
   * - Mantiene contrato ctx del Maestro
   * - Sin transacciones (compatible con Mongo standalone)
   * - Reserva vivienda con criterio legacy: si está DISPONIBLE/A_DESOCUPARSE la marca RESERVADA;
   *   si ya no está en esos estados, no bloquea el cierre siempre que la vivienda exista.
   * - Cambia rol a PERMISIONARIO y completa vínculo habitacional necesario para /mis-anexos
   * - AuditLog best-effort (si existe)
   * - SIN INSPECTOR/JEFE (N/A institucional)
   */
  async closeByAdminGeneral(ctx) {
    const { req, res, user, submission } = ctx;
    const {
      genericDenied,
      badRequest,
      up,
      isObjectId,
      isAdminGeneral,
      isAdminReadOnly,
    } = ctx.core;
    const { FormSubmission, Vivienda, User, AuditLog } = ctx.models;

    if (!user || !user.role) return genericDenied(res);
    if (isAdminReadOnly(user)) return genericDenied(res); // ADMIN solo lectura
    if (!isAdminGeneral(user)) return genericDenied(res);

    const anexo = submission;
    if (!anexo || up(anexo.codigo) !== "ANEXO_02") return genericDenied(res);
    if (typeof anexo.save !== "function") return genericDenied(res);

    if (!anexo.conformidadPostulante?.ok) return badRequest(res);
    if (up(anexo.estado) !== "EN_REVISION") return badRequest(res);

    const payload = req?.body || {};
    if (hasPollutionKeys(payload)) return genericDenied(res);

    let datosIn = payload?.datos ?? {};
    if (typeof datosIn === "string") {
      try {
        datosIn = JSON.parse(datosIn || "{}");
      } catch {
        return badRequest(res);
      }
    }
    if (!safePlainObject(datosIn) || hasPollutionKeys(datosIn)) return genericDenied(res);

    if (!isObjectId(anexo.derivadoDe)) return genericDenied(res);

    const a01 = await FormSubmission.findById(anexo.derivadoDe)
      .select({ _id: 1, codigo: 1, usuario: 1 })
      .lean();

    if (!a01 || up(a01.codigo) !== "ANEXO_01" || !isObjectId(a01.usuario)) {
      return genericDenied(res);
    }
    const postulanteId = a01.usuario;

    anexo.datos = safePlainObject(anexo.datos) ? anexo.datos : {};
    anexo.datos.postulanteId = postulanteId;
    anexo.datos.anexo01Id = a01._id;

    if (typeof datosIn.fechaAsignacion === "string") {
      anexo.datos.fechaAsignacion = asTrimStr(datosIn.fechaAsignacion, 40);
    }
    if (typeof datosIn.fechaEntrega === "string") {
      anexo.datos.fechaEntrega = asTrimStr(datosIn.fechaEntrega, 40);
    }

    anexo.datos.observacionCambioRol = "SIN OCUPACION";
    anexo.datos.cambioRol = {
      fecha: new Date(),
      realizadoPor: user._id,
      desde: "POSTULANTE",
      hacia: "PERMISIONARIO",
    };

    if (!isTransitionAllowed(ControllerAnexo02.TRANSITIONS, "EN_REVISION", "CERRADO")) {
      return genericDenied(res);
    }

    const viviendaId = anexo.datos.viviendaId;
    if (!Vivienda || !isObjectId(viviendaId)) return genericDenied(res);

    try {
      const vivienda = await Vivienda.findById(viviendaId);
      if (!vivienda) return genericDenied(res);

      const estadoVivienda = up(vivienda.estado);
      if (estadoVivienda === "DISPONIBLE" || estadoVivienda === "A_DESOCUPARSE") {
        vivienda.estado = "RESERVADA";
      }

      vivienda.ocupacionActual = safePlainObject(vivienda.ocupacionActual) ? vivienda.ocupacionActual : {};
      vivienda.ocupacionActual.permisionario = postulanteId;
      if (!vivienda.viviendaAsignadaPara) {
        vivienda.viviendaAsignadaPara = postulanteId;
      }

      const iv = Array.isArray(anexo.intervinientes) ? anexo.intervinientes : [];
      addIntervinienteUnique(iv, postulanteId, "POSTULANTE");
      addIntervinienteUnique(iv, user._id, "ADMIN_GENERAL");
      anexo.intervinientes = iv;

      anexo.datos.conformidadAdminGeneral = {
        ok: true,
        fecha: new Date(),
        usuario: user._id,
      };

      if (typeof anexo.cambiarEstado !== "function") return genericDenied(res);
      await anexo.cambiarEstado("CERRADO", user._id, "Cierre ADMIN_GENERAL");

      if (!User || !isObjectId(postulanteId)) return genericDenied(res);
      const userDoc = await User.findById(postulanteId);
      if (!userDoc) return genericDenied(res);

      const beforeRole = userDoc.role || null;
      userDoc.role = "PERMISIONARIO";
      userDoc.estadoHabitacional = "PERMISIONARIO_EN_ESPERA";
      userDoc.viviendaAsignada = viviendaId;
      userDoc.tokenVersion = Number(userDoc.tokenVersion || 0) + 1;

      await vivienda.save();
      await anexo.save();
      await userDoc.save();

      if (AuditLog && typeof AuditLog.create === "function") {
        try {
          await AuditLog.create({
            actorUserId: user._id,
            targetUserId: postulanteId,
            action: "ROLE_CHANGE",
            before: { role: beforeRole },
            after: { role: "PERMISIONARIO", estadoHabitacional: "PERMISIONARIO_EN_ESPERA" },
            submissionId: anexo._id,
            viviendaId,
            at: new Date(),
            note: "SIN OCUPACION",
          });
        } catch (e) {
          console.error("[ANEXO_02][AuditLog] Error (best-effort):", e);
        }
      }

      return res.json({
  anexo: anexo?.toObject ? anexo.toObject() : anexo,
});
    } catch (e) {
      console.error("[ANEXO_02][closeByAdminGeneral] Error:", e);
      return genericDenied(res);
    }
  },

  /**
   * POST /api/formularios/:id/generar-anexo-02
   * - ADMIN_GENERAL
   * - Requiere ANEXO_01 CERRADO
   * - Valida vivienda (DISPONIBLE/A_DESOCUPARSE)
   * - Idempotente por derivadoDe
   * - Estado inicial via cambiarEstado(...) (no set manual)
   *
   * Compat FE:
   * - existente => 200 {anexo}
   * - creado => 201 {anexo}
   * - mismatch => 403
   */
  async generateFromAnexo01(ctx) {
    const { req, res, user, submission } = ctx;
    const {
      genericDenied,
      badRequest,
      up,
      isObjectId,
      canSeeSubmission,
      isAdminGeneral,
      isAdminReadOnly,
    } = ctx.core;
    const { FormSubmission, Vivienda, FormTemplate } = ctx.models;

    if (!user || !user.role) return genericDenied(res);
    if (isAdminReadOnly(user)) return genericDenied(res); // ADMIN solo lectura
    if (!isAdminGeneral(user)) return genericDenied(res);

    const anexo01 = submission;
    if (!anexo01) return genericDenied(res);
    if (up(anexo01.codigo) !== "ANEXO_01") return genericDenied(res);
    if (typeof canSeeSubmission === "function" && !canSeeSubmission(user, anexo01)) return genericDenied(res);

    // Encadenamiento institucional
    if (up(anexo01.estado) !== "CERRADO") return genericDenied(res);

    const payload = req.body || {};
    if (hasPollutionKeys(payload)) return genericDenied(res);

    const viviendaId = payload?.viviendaId;
    if (!viviendaId || !isObjectId(viviendaId)) return badRequest(res);

    const vivienda = await Vivienda.findById(viviendaId)
  .select({ _id: 1, estado: 1, codigo: 1, barrio: 1 })
  .lean();
    if (!vivienda) return genericDenied(res);

    const estViv = up(vivienda.estado);
    if (estViv !== "DISPONIBLE" && estViv !== "A_DESOCUPARSE") return genericDenied(res);

    const existente = await FormSubmission.findOne({ codigo: "ANEXO_02", derivadoDe: anexo01._id });
    if (existente) {
      const existenteVivienda = existente.datos?.viviendaId?.toString?.() || null;
      if (existenteVivienda && existenteVivienda !== String(viviendaId)) {
        return genericDenied(res); // mismatch no revelable
      }
  return res.status(200).json({
  anexo: existente?.toObject ? existente.toObject() : existente,
  });
    }

    const templateId = await resolveTemplate02Id(FormTemplate);
    if (!templateId) return genericDenied(res);

    const nuevo = new FormSubmission({
  codigo: "ANEXO_02",
  template: templateId,
  usuario: anexo01.usuario,
  derivadoDe: anexo01._id,

  barrio: vivienda.barrio || null,
  vivienda: vivienda._id,
  viviendaCodigo: vivienda.codigo || null,

  datos: {
    anexo01Id: anexo01._id,
    postulanteId: anexo01.usuario,
    viviendaId: vivienda._id,
    viviendaCodigo: vivienda.codigo || null,
    viviendaLabel: vivienda.codigo || null
  },
});

    // Estado inicial SIEMPRE via cambiarEstado (audit)
    if (typeof nuevo.cambiarEstado !== "function") return genericDenied(res);

    // transición inicial formal (sin tabla, es creación)
    await nuevo.cambiarEstado(ControllerAnexo02.ESTADO_INICIAL, user._id, "Generación ANEXO_02");

    await nuevo.save();
    return res.status(201).json({
   anexo: nuevo?.toObject ? nuevo.toObject() : nuevo,
 });
 },

  /**
   * PDF: lectura permitida (ADMIN incluido), acciones sensibles ya bloqueadas arriba.
   * Fail-closed: requiere origen ANEXO_01 visible.
   */
  async renderPdf(ctx) {
    const { user, submission } = ctx;
    const { genericDenied, up, isObjectId, canSeeSubmission } = ctx.core;
    const { FormSubmission } = ctx.models;
    const { pdfService } = ctx.services || {};

    if (!user || !user.role) return genericDenied(ctx.res);
    if (!submission || up(submission.codigo) !== "ANEXO_02") return genericDenied(ctx.res);

    let origen = ctx.anexo01Derivado || null;
    if (!origen && isObjectId(submission.derivadoDe)) {
      origen = await FormSubmission.findById(submission.derivadoDe).lean();
    }
    if (!origen || up(origen.codigo) !== "ANEXO_01") return genericDenied(ctx.res);
    if (typeof canSeeSubmission === "function" && !canSeeSubmission(user, origen)) return genericDenied(ctx.res);

    if (!pdfService || typeof pdfService.renderFormularioPdfBuffer !== "function") {
      return genericDenied(ctx.res);
    }

    const buffer = await pdfService.renderFormularioPdfBuffer({
      codigo: "ANEXO_02",
      anexo: submission,
      origen,
      vivienda: ctx.vivienda || null,
    });

    if (!buffer) return genericDenied(ctx.res);

    return {
      buffer,
      filename: `ANEXO_02_${String(submission._id)}.pdf`,
      contentType: "application/pdf",
      disposition: "inline",
    };
  },
};

module.exports = ControllerAnexo02;

// ─────────────────────────────
// Helpers

function safePlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function asTrimStr(v, maxLen = 5000) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function addIntervinienteUnique(list, userId, rol) {
  if (!Array.isArray(list)) return;
  const uid = String(userId || "");
  const r = String(rol || "").toUpperCase().trim();
  if (!uid || !r) return;

  const exists = list.some(
    (x) => String(x?.userId || "") === uid && String(x?.rol || "").toUpperCase().trim() === r
  );
  if (exists) return;

  list.push({ userId, rol: r, fecha: new Date() });
}

function hasPollutionKeys(obj) {
  if (!obj || typeof obj !== "object") return false;
  return (
    Object.prototype.hasOwnProperty.call(obj, "__proto__") ||
    Object.prototype.hasOwnProperty.call(obj, "constructor") ||
    Object.prototype.hasOwnProperty.call(obj, "prototype")
  );
}

function isTransitionAllowed(transitions, from, to) {
  const f = String(from || "").toUpperCase().trim();
  const t = String(to || "").toUpperCase().trim();
  const allowed = transitions && transitions[f];
  return Array.isArray(allowed) && allowed.includes(t);
}

async function resolveTemplate02Id(FormTemplateModel) {
  try {
    if (!FormTemplateModel || typeof FormTemplateModel.findOne !== "function") return null;

    let tpl = await FormTemplateModel.findOne({ codigo: "ANEXO_02" }).select({ _id: 1 }).lean();
    if (tpl?._id) return tpl._id;

    tpl = await FormTemplateModel.findOne({ code: "ANEXO_02", activo: true })
      .sort({ version: -1, createdAt: -1 })
      .select({ _id: 1 })
      .lean();

    return tpl?._id || null;
  } catch {
    return null;
  }
}