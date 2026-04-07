"use strict";

/**
 * ControllerAnexo03 — Módulo V2
 * Institucional: ANEXO_03 (Toma de Vivienda)
 *
 * Reglas clave:
 * - Fail-Closed + No-Disclosure (genericDenied)
 * - Sanitización allowlist (bloqueo __proto__/constructor/prototype)
 * - Autorización estricta (no confiar frontend)
 * - Máquina de estados allowlist + cambiarEstado(...) obligatorio
 * - Cross-anexo obligatorio: derivadoDe -> ANEXO_02 en CERRADO por ADMIN_GENERAL
 * - Multi-write (close): transacción Mongo requerida (fail-closed si no hay)
 */

const mongoose = require("mongoose");

const ControllerAnexo03 = {
  CODIGO: "ANEXO_03",

  // ⚠️ Estados: NO inventar; se alinean a los que ya se usan en legacy para 03
  // BORRADOR -> ENVIADO -> EN_REVISION -> CERRADO
  // (BORRADOR puede existir en algunos flujos; FormSubmission default es ENVIADO)
  TRANSITIONS: {
    BORRADOR: ["ENVIADO"],
    ENVIADO: ["EN_REVISION"],
    EN_REVISION: ["CERRADO"],
    CERRADO: [],
  },

  /**
   * POST (nuevo handler V2): generarAnexo03DesdeAnexo02
   * - INSPECTOR
   * - origen ANEXO_02 debe existir, estar CERRADO y haber sido cerrado por ADMIN_GENERAL
   * - crea ANEXO_03 derivadoDe=ANEXO_02, sin duplicar datos (fuente de verdad: ANEXO_02)
   * - idempotente: si ya existe ANEXO_03 derivadoDe ese ANEXO_02, devuelve el existente
   */
 async generateFromAnexo02(ctx) {
  const { req, res, user } = ctx;
  const {
    genericDenied,
    badRequest,
    up,
    isObjectId,
    canSeeSubmission,
  } = ctx.core;
  const { FormSubmission, FormTemplate, User } = ctx.models;

  if (!user || !user.role) return genericDenied(res);

  // Autorización: INSPECTOR via permisos (como legacy)
  if (!hasRolOrPermiso(user, ["INSPECTOR"], up)) return genericDenied(res);

  const a02Id = req.params?.id || req.body?.id || null;
  if (!isObjectId(a02Id)) return genericDenied(res);

  if (!FormSubmission?.findById) return genericDenied(res);

  const a02 = await FormSubmission.findById(a02Id);
  if (!a02) return genericDenied(res);
  if (up(a02.codigo) !== "ANEXO_02") return genericDenied(res);

  // Visibilidad sobre el origen (fail-closed)
  if (typeof canSeeSubmission !== "function") return genericDenied(res);
  if (!canSeeSubmission(user, a02)) return genericDenied(res);

  // Institucional: debe estar CERRADO
  if (up(a02.estado) !== "CERRADO") return genericDenied(res);

  // Institucional: "cerrado por ADMIN_GENERAL"
  // Fuente: historialEstados[].realizadoPor => resolvemos User.role
  const closedByAdminGeneral = await wasClosedByAdminGeneral({
    submission: a02,
    UserModel: User,
    isObjectId,
    up,
  });
  if (!closedByAdminGeneral) return genericDenied(res);

  // Idempotencia: ya existe ANEXO_03 derivadoDe este A02
  const existente = await FormSubmission.findOne({
    codigo: "ANEXO_03",
    derivadoDe: a02._id,
  });
  if (existente) {
    return res.status(200).json({ anexo: existente.toObject() });
  }

  // Template requerido por schema (mismo patrón V2)
  const templateId = await resolveTemplateIdByCodigo({
    FormTemplateModel: FormTemplate,
    codigo: "ANEXO_03",
    up,
  });
  if (!templateId) return genericDenied(res);

  // Construcción fail-closed: no confiar en req.body para vivienda/permisionario
  // Fuente de verdad:
  // - permisionario/postulante = a02.datos.postulanteId || a02.usuario || interviniente PERMISIONARIO
  // - viviendaId = a02.datos.viviendaId
  const a02Datos = safePlainObject(a02.datos) ? a02.datos : {};
  const postulanteId =
    a02Datos.postulanteId ||
    a02.usuario ||
    getIntervinienteUserIdByRol(a02, "PERMISIONARIO");
  const viviendaId = a02Datos.viviendaId || null;

  if (!isObjectId(postulanteId)) return genericDenied(res);
  if (viviendaId && !isObjectId(viviendaId)) return genericDenied(res);

  // Datos iniciales mínimos (no duplicar)
  const datosIniciales = sanitizeDatosAnexo03(
    {},
    {
      derivadoDe: a02._id,
      viviendaId: viviendaId || null,
      postulanteId,
    }
  );

  // Titularidad de negocio: el ANEXO_03 pertenece al permisionario.
  // El actor territorial designado lo confecciona/interviene, pero no debe
  // quedar como dueño funcional del submission porque esa designación puede migrar.
  datosIniciales.confeccionadoPor = user._id;
  datosIniciales.conformadoPorInspector = false;

  const nuevo = new FormSubmission({
    codigo: "ANEXO_03",
    template: templateId,
    usuario: postulanteId, // dueño funcional: permisionario
    derivadoDe: a02._id,
    datos: datosIniciales,
    intervinientes: [],
    barrio: a02.barrio || null,
    vivienda: a02.vivienda || null,
  });

  // Intervinientes institucionales
  addIntervinienteUnique(nuevo.intervinientes, user._id, "INSPECTOR");
  addIntervinienteUnique(nuevo.intervinientes, postulanteId, "PERMISIONARIO");

  await nuevo.save();
  return res.status(201).json({ anexo: nuevo.toObject() });
}

  async updateDatos(ctx) {
    const { req, res, user, submission } = ctx;
    const { genericDenied, badRequest, up, isObjectId } = ctx.core;
    const { FormSubmission } = ctx.models;

    if (!user || !user.role) return genericDenied(res);
    if (!submission || up(submission.codigo) !== "ANEXO_03") return genericDenied(res);

    if (!hasRolOrPermiso(user, ["INSPECTOR"], up)) return genericDenied(res);

    // Estado editable: ENVIADO (como legacy para 03)
    if (up(submission.estado) !== "ENVIADO") return genericDenied(res);

    // Interviniencia estricta
    if (!isInspectorInterviniente(user, submission)) return genericDenied(res);

    // Sanitizar input
    const payload = req.body || {};
    if (hasPollutionKeys(payload)) return genericDenied(res);

    let datosIn = payload?.datos ?? payload;
    if (typeof datosIn === "string") {
      try {
        datosIn = JSON.parse(datosIn || "{}");
      } catch {
        return badRequest(res);
      }
    }
    if (!safePlainObject(datosIn) || hasPollutionKeys(datosIn)) return genericDenied(res);

    // Persistimos sanitizado (merge allowlist)
    const next = sanitizeDatosAnexo03(submission.datos || {}, datosIn);

    // Cargar doc mutable y guardar
    const anexo = await FormSubmission.findById(submission._id);
    if (!anexo) return genericDenied(res);

    anexo.datos = next;
    anexo.markModified("datos");
    await anexo.save();

    return res.json({ anexo: anexo.toObject() });
  },

  /**
   * POST /api/formularios/:id/enviar (INSPECTOR)
   * - Permite idempotencia
   * - BORRADOR -> ENVIADO
   */
  async sendToPermisionario(ctx) {
    const { req, res, user, submission } = ctx;
    const { genericDenied, badRequest, up } = ctx.core;
    const { FormSubmission } = ctx.models;

    if (!user || !user.role) return genericDenied(res);
    if (!submission || up(submission.codigo) !== "ANEXO_03") return genericDenied(res);

    if (!hasRolOrPermiso(user, ["INSPECTOR"], up)) return genericDenied(res);
    if (!isInspectorInterviniente(user, submission)) return genericDenied(res);

    const payload = req.body || {};
    if (hasPollutionKeys(payload)) return genericDenied(res);

    let datosIn = payload?.datos ?? payload;
    if (typeof datosIn === "string") {
      try {
        datosIn = JSON.parse(datosIn || "{}");
      } catch {
        return badRequest(res);
      }
    }
    if (datosIn && !safePlainObject(datosIn)) return genericDenied(res);
    if (datosIn && hasPollutionKeys(datosIn)) return genericDenied(res);

    const anexo = await FormSubmission.findById(submission._id);
    if (!anexo) return genericDenied(res);

    // Merge allowlist si vinieron datos
    if (safePlainObject(datosIn)) {
      anexo.datos = sanitizeDatosAnexo03(anexo.datos || {}, datosIn);
      anexo.markModified("datos");
    }

    const est = up(anexo.estado);
    if (est === "BORRADOR") {
      if (typeof anexo.cambiarEstado !== "function") return genericDenied(res);
      if (!isTransitionAllowed(ControllerAnexo03.TRANSITIONS, est, "ENVIADO")) return genericDenied(res);
      anexo.cambiarEstado("ENVIADO", user._id, "Enviar ANEXO_03");
    } else if (est !== "ENVIADO") {
      return genericDenied(res);
    }

    await anexo.save();
    return res.json({ ok: true, anexo: anexo.toObject() });
  },

  /**
   * POST /api/formularios/:id/conformidad-permisionario-03
   * - PERMISIONARIO del ANEXO_02 origen (fuente de verdad)
   * - ENVIADO -> EN_REVISION (idempotente)
   */
  async confirmByPermisionario(ctx) {
  const { res, user, submission } = ctx;
  const { genericDenied, up, isObjectId, canSeeSubmission } = ctx.core;
  const { FormSubmission } = ctx.models;

  if (!user || !user.role) return genericDenied(res);
  if (!submission || up(submission.codigo) !== "ANEXO_03") return genericDenied(res);

  // Cross-anexo obligatorio
  if (!isObjectId(submission.derivadoDe)) return genericDenied(res);

  const a02 = await FormSubmission.findById(submission.derivadoDe)
    .select("codigo estado usuario datos intervinientes")
    .lean();

  if (!a02 || up(a02.codigo) !== "ANEXO_02") return genericDenied(res);

  // ===============================
  // DEBUG (temporal)
  // ===============================
  console.log("DEBUG confirmByPermisionario");
  console.log("user._id:", String(user._id));
  console.log("submission.usuario:", String(submission.usuario));
  console.log("a02.usuario:", String(a02.usuario));

  if (typeof canSeeSubmission === "function") {
    try {
      console.log("canSeeSubmission(user,a02):", canSeeSubmission(user, a02));
    } catch (e) {
      console.log("canSeeSubmission error:", e);
    }
  } else {
    console.log("canSeeSubmission no es función");
  }
  // ===============================

  // Validación de titularidad del ANEXO_03
  if (String(submission.usuario) !== String(user._id)) {
    console.log("DENY: submission.usuario != user._id");
    return genericDenied(res);
  }

  // Fuente de verdad del permisionario
  const a02Datos = safePlainObject(a02.datos) ? a02.datos : {};

  const postulanteId =
    a02Datos.postulanteId ||
    a02.usuario ||
    getIntervinienteUserIdByRol(a02, "PERMISIONARIO");

  console.log("postulanteId:", String(postulanteId));

  if (!isObjectId(postulanteId)) {
    console.log("DENY: postulanteId inválido");
    return genericDenied(res);
  }

  if (String(postulanteId) !== String(user._id)) {
    console.log("DENY: postulanteId != user._id");
    return genericDenied(res);
  }

  const anexo = await FormSubmission.findById(submission._id);

  if (!anexo) {
    console.log("DENY: anexo no encontrado");
    return genericDenied(res);
  }

  if (up(anexo.codigo) !== "ANEXO_03") {
    console.log("DENY: codigo != ANEXO_03");
    return genericDenied(res);
  }

  const est = up(anexo.estado);

  // Idempotencia
  if (["EN_REVISION", "CERRADO"].includes(est)) {
    console.log("INFO: ya confirmado o cerrado");
    return res.json({ anexo: anexo.toObject() });
  }

  if (!isTransitionAllowed(ControllerAnexo03.TRANSITIONS, est, "EN_REVISION")) {
    console.log("DENY: transición inválida", est, "-> EN_REVISION");
    return genericDenied(res);
  }

  anexo.datos = safePlainObject(anexo.datos) ? anexo.datos : {};

  // coherencia de titularidad
  anexo.usuario = postulanteId;
  anexo.datos.postulanteId = postulanteId;

  anexo.datos.conformidadPermisionario = {
    ok: true,
    fecha: new Date(),
    usuario: user._id,
  };

  anexo.markModified("datos");

  if (typeof anexo.cambiarEstado !== "function") {
    console.log("DENY: cambiarEstado no existe");
    return genericDenied(res);
  }

  anexo.cambiarEstado("EN_REVISION", user._id, "Conformidad permisionario");

  await anexo.save();

  console.log("OK: conformidad registrada");

  return res.json({ anexo: anexo.toObject() });
}

  /**
   * POST /api/formularios/:id/cierre-admin-general-03
   * - ADMIN_GENERAL (ADMIN read-only => deny)
   * - Requiere conformidadPermisionario.ok y estado EN_REVISION
   * - Multi-write: Vivienda + User + Submission (con transacción). Fail-closed si no hay)
   */
  async closeByAdminGeneral(ctx) {
  const { res, user, submission } = ctx;
  const { genericDenied, up, isObjectId, isAdminGeneral, isAdminReadOnly } = ctx.core;
  const { FormSubmission, Vivienda, User } = ctx.models;

  if (!user || !user.role) return genericDenied(res);
  if (isAdminReadOnly(user)) return genericDenied(res);
  if (!isAdminGeneral(user)) return genericDenied(res);
  if (!submission || up(submission.codigo) !== "ANEXO_03") return genericDenied(res);

  // Transacciones requeridas (fail-closed)
  if (!FormSubmission?.startSession || !mongoose?.connection) {
    console.error("[ANEXO_03][closeByAdminGeneral] Transacciones no disponibles");
    return genericDenied(res);
  }

  const session = await FormSubmission.startSession();

  try {
    let responsePayload = null;

    await session.withTransaction(async () => {
      const anexo = await FormSubmission.findById(submission._id).session(session);
      if (!anexo) throw new Error("DENY: no anexo");

      if (up(anexo.codigo) !== "ANEXO_03") throw new Error("DENY: codigo mismatch");

      // Idempotencia
      if (up(anexo.estado) === "CERRADO") {
        responsePayload = { type: "ok", anexo: anexo.toObject() };
        return;
      }

      // Estado requerido
      if (up(anexo.estado) !== "EN_REVISION") {
        responsePayload = { type: "deny" };
        return;
      }

      // Allowlist transition
      if (!isTransitionAllowed(ControllerAnexo03.TRANSITIONS, up(anexo.estado), "CERRADO")) {
        throw new Error("DENY: invalid transition");
      }

      // Cross-anexo obligatorio
      if (!isObjectId(anexo.derivadoDe)) throw new Error("DENY: missing derivadoDe");
      const a02 = await FormSubmission.findById(anexo.derivadoDe)
        .select("codigo estado usuario datos historialEstados intervinientes")
        .session(session)
        .lean();

      if (!a02 || up(a02.codigo) !== "ANEXO_02") throw new Error("DENY: invalid origen");
      if (up(a02.estado) !== "CERRADO") throw new Error("DENY: origen not closed");

      // Fuente de verdad de vivienda/permisionario
      const a02Datos = safePlainObject(a02.datos) ? a02.datos : {};
      const postulanteId =
        a02Datos.postulanteId ||
        a02.usuario ||
        getIntervinienteUserIdByRol(a02, "PERMISIONARIO");
      const viviendaId = a02Datos.viviendaId || null;

      if (!isObjectId(postulanteId)) throw new Error("DENY: invalid postulanteId");
      if (viviendaId && !isObjectId(viviendaId)) throw new Error("DENY: invalid viviendaId");

      // Conformidad permisionario
      anexo.datos = safePlainObject(anexo.datos) ? anexo.datos : {};
      if (!anexo.datos?.conformidadPermisionario?.ok) {
        responsePayload = { type: "deny" };
        return;
      }

      // Persistimos coherencia mínima
      anexo.usuario = postulanteId;
      anexo.datos.postulanteId = postulanteId;
      if (viviendaId) anexo.datos.viviendaId = viviendaId;

      anexo.datos.conformidadAdminGeneral = {
        ok: true,
        fecha: new Date(),
        usuario: user._id,
      };
      anexo.markModified("datos");

      // Vivienda: OCUPADA + ocupacionActual (si el modelo existe)
      if (Vivienda && viviendaId) {
        const v = await Vivienda.findById(viviendaId).session(session);
        if (!v) throw new Error("DENY: vivienda not found");

        const estadoV = up(v.estado || "");
        if (!v.estado || estadoV === "RESERVADA") {
          v.estado = "OCUPADA";
        }

        v.ocupacionActual = {
          permisionario: postulanteId,
          fechaAsignacion: new Date(),
          observacion: "Ocupación materializada por ANEXO_03",
        };

        await v.save({ session });
      }

      // User: role PERMISIONARIO
      if (User && isObjectId(postulanteId)) {
        await User.updateOne(
          { _id: postulanteId },
          {
            $set: {
              role: "PERMISIONARIO",
              estadoHabitacional: "PERMISIONARIO_ACTIVO",
            },
          },
          { session }
        );
      }

      // Cierre del anexo
      if (typeof anexo.cambiarEstado !== "function") {
        throw new Error("DENY: missing cambiarEstado");
      }

      anexo.cambiarEstado("CERRADO", user._id, "Cierre ADMIN_GENERAL (ANEXO_03)");

      await anexo.save({ session });
      responsePayload = { type: "ok", anexo: anexo.toObject() };
    });

    if (!responsePayload || responsePayload.type !== "ok") return genericDenied(res);
    return res.json({ anexo: responsePayload.anexo });
  } catch (e) {
    console.error("[ANEXO_03][closeByAdminGeneral] Error:", e);
    return genericDenied(res);
  } finally {
    try {
      await session.endSession();
    } catch {}
  }
},

  /**
   * GET detalle hidratado (V2 getById lo llama)
   * - devuelve { anexo, origen } donde origen es ANEXO_02 (hidrata label vivienda/permisionario sin persistir)
   * - fail-closed + no-disclosure (el handler V2 ya valida canReadSubmissionBase antes)
   */
  async hydrateDetail(ctx) {
    const { res, user, submission } = ctx;
    const { genericDenied, up, isObjectId, canSeeSubmission } = ctx.core;
    const { FormSubmission, Vivienda, User } = ctx.models;

    if (!user || !user.role) return genericDenied(res);
    if (!submission || up(submission.codigo) !== "ANEXO_03") return genericDenied(res);

    // Reconfirmamos visibilidad base (fail-closed)
    if (typeof canSeeSubmission !== "function") return genericDenied(res);
    if (!canSeeSubmission(user, submission)) return genericDenied(res);

    let origen = null;

    if (isObjectId(submission.derivadoDe)) {
      const a02 = await FormSubmission.findById(submission.derivadoDe)
        .select("codigo datos usuario intervinientes vivienda barrio estado estadoInstitucional derivadoDe createdAt updatedAt")
        .lean();

      if (a02 && up(a02.codigo) === "ANEXO_02") {
        if (!canSeeSubmission(user, a02)) return genericDenied(res);

        // Hidratación solo en respuesta (no persiste) — replicando intención del legacy
        let datosOrigen = safePlainObject(a02.datos) ? { ...a02.datos } : {};

        if (Vivienda && isObjectId(datosOrigen.viviendaId)) {
          const v = await Vivienda.findById(datosOrigen.viviendaId).select("codigo direccion barrio").lean();
          if (v) {
            if (!datosOrigen.viviendaCodigo && v.codigo) datosOrigen.viviendaCodigo = String(v.codigo).trim();
            if (!datosOrigen.viviendaLabel) {
              datosOrigen.viviendaLabel =
                String(v.codigo || "").trim() ||
                String(v.direccion || "").trim() ||
                "Vivienda fiscal";
            }
            if (!datosOrigen.barrio && v.barrio) datosOrigen.barrio = v.barrio;
          }
        }

        if (User && isObjectId(a02.usuario)) {
          const uPost = await User.findById(a02.usuario).select("nombre apellido email").lean();
          if (uPost) {
            if (!datosOrigen.postulanteId) datosOrigen.postulanteId = a02.usuario;

            const label = `${String(uPost.apellido || "").trim()} ${String(uPost.nombre || "").trim()}`.trim();
            if (!datosOrigen.postulanteNombre && label) datosOrigen.postulanteNombre = label;
            if (!datosOrigen.postulanteLabel) {
              datosOrigen.postulanteLabel = label || String(uPost.email || "").trim();
            }
          }
        }

        origen = {
          _id: a02._id,
          codigo: a02.codigo,
          estado: a02.estado,
          estadoInstitucional: a02.estadoInstitucional,
          datos: datosOrigen,
          usuario: a02.usuario,
          derivadoDe: a02.derivadoDe,
          createdAt: a02.createdAt,
          updatedAt: a02.updatedAt,
        };
      }
    }

    return { anexo: submission, origen };
  },

  /**
   * PDF (V2 descargarPdf lo llama)
   * - usa pdfService.renderFormularioPdfBuffer (mismo patrón que ANEXO_02)
   * - origen obligatorio: ANEXO_02
   */
  async renderPdf(ctx) {
    const { res, user, submission } = ctx;
    const { genericDenied, up, isObjectId } = ctx.core;
    const { FormSubmission } = ctx.models;
    const { pdfService } = ctx.services || {};

    if (!user || !user.role) return genericDenied(res);
    if (!submission || up(submission.codigo) !== "ANEXO_03") return genericDenied(res);

    if (!pdfService || typeof pdfService.renderFormularioPdfBuffer !== "function") {
      console.error("[ANEXO_03][renderPdf] pdfService no disponible");
      return genericDenied(res);
    }

    if (!isObjectId(submission.derivadoDe)) return genericDenied(res);

    const origen = await FormSubmission.findById(submission.derivadoDe)
      .select({ _id: 1, codigo: 1, usuario: 1, datos: 1, intervinientes: 1, adjuntos: 1, estado: 1 })
      .lean();

    if (!origen || up(origen.codigo) !== "ANEXO_02") return genericDenied(res);

    const buffer = await pdfService.renderFormularioPdfBuffer({
      codigo: "ANEXO_03",
      anexo: submission,
      origen,
      vivienda: ctx.vivienda || null,
    });

    if (!buffer) return genericDenied(res);

    return {
      buffer,
      filename: `ANEXO_03_${String(submission._id)}.pdf`,
      contentType: "application/pdf",
      disposition: "inline",
    };
  },
};

module.exports = ControllerAnexo03;

// =======================================================
// Helpers (locales, fail-closed)
// =======================================================

function safePlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
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
  const allowed = transitions?.[String(from || "").toUpperCase()];
  return Array.isArray(allowed) && allowed.includes(String(to || "").toUpperCase());
}

function addIntervinienteUnique(list, userId, rol) {
  if (!Array.isArray(list)) return;
  const uid = String(userId || "");
  const r = String(rol || "").toUpperCase().trim();
  if (!uid || !r) return;

  const exists = list.some(
    (x) =>
      String(x?.userId || "") === uid &&
      String(x?.rol || "").toUpperCase().trim() === r
  );
  if (exists) return;

  list.push({ userId, rol: r, fecha: new Date() });
}

function getIntervinienteUserIdByRol(sub, rol) {
  const list = Array.isArray(sub?.intervinientes) ? sub.intervinientes : [];
  const rr = String(rol || "").toUpperCase().trim();
  const hit = list.find((x) => String(x?.rol || "").toUpperCase().trim() === rr);
  return hit?.userId || null;
}

function hasRolOrPermiso(user, rolesPermitidos = [], up) {
  const role = up(user?.role);
  const permisos = Array.isArray(user?.permisos)
    ? user.permisos.map(up)
    : user?.permisos
    ? [up(user.permisos)]
    : [];

  return rolesPermitidos.some((r) => {
    const rr = up(r);
    if (rr === "INSPECTOR" || rr === "JEFE_DE_BARRIO") return permisos.includes(rr);
    return role === rr;
  });
}

function isInspectorInterviniente(user, sub) {
  const uid = String(user?._id || "");
  const list = Array.isArray(sub?.intervinientes) ? sub.intervinientes : [];
  return list.some(
    (x) =>
      String(x?.userId || "") === uid &&
      String(x?.rol || "").toUpperCase().trim() === "INSPECTOR"
  );
}

async function resolveTemplateIdByCodigo({ FormTemplateModel, codigo, up }) {
  try {
    if (!FormTemplateModel?.findOne) return null;
    const codigoUp = up(codigo);

    let tpl = await FormTemplateModel.findOne({ codigo: codigoUp }).select({ _id: 1 }).lean();
    if (tpl?._id) return tpl._id;

    tpl = await FormTemplateModel.findOne({ code: codigoUp, activo: true })
      .sort({ version: -1, createdAt: -1 })
      .select({ _id: 1 })
      .lean();

    return tpl?._id || null;
  } catch {
    return null;
  }
}

/**
 * Valida “cerrado por ADMIN_GENERAL”.
 * Fuente: historialEstados[].realizadoPor (userId) => User.role.
 * Fail-closed si:
 * - no hay historial
 * - no existe User model
 * - no se puede resolver usuario
 */
async function wasClosedByAdminGeneral({ submission, UserModel, isObjectId, up }) {
  try {
    if (!submission) return false;
    if (!UserModel?.findById) return false;

    const hist = Array.isArray(submission.historialEstados) ? submission.historialEstados : [];
    if (!hist.length) return false;

    // buscamos la última transición a CERRADO
    const lastClose = [...hist]
      .reverse()
      .find((h) => String(h?.estadoNuevo || "").toUpperCase().trim() === "CERRADO");

    const actorId = lastClose?.realizadoPor || null;
    if (!isObjectId(actorId)) return false;

    const u = await UserModel.findById(actorId).select("role permisos").lean();
    if (!u) return false;

    return up(u.role) === "ADMIN_GENERAL";
  } catch {
    return false;
  }
}

/**
 * Sanitización allowlist ANEXO_03.
 * - No persiste req.body directo.
 * - Bloquea pollution keys.
 * - Permite solo campos esperados por PDF/flujo.
 */
function sanitizeDatosAnexo03(prevDatos, nextDatos) {
  const prev = safePlainObject(prevDatos) ? prevDatos : {};
  const next = safePlainObject(nextDatos) ? nextDatos : {};

  if (hasPollutionKeys(prev) || hasPollutionKeys(next)) return {};

  const out = {};

  // Root allowlist (legacy intent)
  const rootAllowed = [
    "permisionarioNombre",
    "permisionario",
    "postulanteNombre",
    "postulanteId",
    "unidadHabitacional",
    "direccion",
    "localidad",
    "provincia",
    "inspectorNombre",
    "novedadesTexto",
    "lugarFirma",
    "fechaFirma",
    "viviendaId",
    "derivadoDe",
    "material",
    "documentacion",
    "novedades",
    "conformidadPermisionario",
    "conformidadAdminGeneral",
  ];

  // merge root (prev then next)
  for (const k of rootAllowed) {
    if (Object.prototype.hasOwnProperty.call(prev, k)) out[k] = prev[k];
    if (Object.prototype.hasOwnProperty.call(next, k)) out[k] = next[k];
  }

  // Normalizaciones leves (string trims) — sin romper shapes
  for (const k of [
    "permisionarioNombre",
    "permisionario",
    "postulanteNombre",
    "unidadHabitacional",
    "direccion",
    "localidad",
    "provincia",
    "inspectorNombre",
    "novedadesTexto",
    "lugarFirma",
    "fechaFirma",
  ]) {
    if (typeof out[k] === "string") out[k] = out[k].trim();
  }

  // Sub-allowlist: material
  out.material = sanitizeYesNoMap(out.material, [
    "llavesEdificio",
    "llavesVivienda",
    "llavesBaulera",
    "llaveTerraza",
    "llaveCochera",
    "inventarioMuebles",
    "lineaTelefonica",
  ]);

  // Sub-allowlist: documentacion
  out.documentacion = sanitizeYesNoMap(out.documentacion, [
    "reglamentoViviendas",
    "inventarioGeneral",
    "manualesInstrucciones",
    "certificadosGarantia",
    "constanciasMedidores",
    "llavesMedidores",
  ]);

  // Sub-allowlist: novedades (calificaciones MB/B/R/M + texto)
  out.novedades = sanitizeNovedades(out.novedades);

  // Conformidades: esquema flexible pero acotado
  out.conformidadPermisionario = sanitizeConformidad(out.conformidadPermisionario);
  out.conformidadAdminGeneral = sanitizeConformidad(out.conformidadAdminGeneral);

  return out;
}

function sanitizeConformidad(v) {
  if (!safePlainObject(v) || hasPollutionKeys(v)) return null;
  const out = {};
  if (typeof v.ok === "boolean") out.ok = v.ok;
  if (v.fecha) {
    const d = new Date(v.fecha);
    if (!Number.isNaN(d.getTime())) out.fecha = d;
  }
  if (v.usuario) out.usuario = v.usuario;
  if (typeof v.observacion === "string") out.observacion = v.observacion.trim();
  return Object.keys(out).length ? out : null;
}

function normalizeYN(val) {
  const s = String(val || "").toUpperCase().trim();
  if (["SI", "SÍ", "YES", "TRUE"].includes(s)) return "SI";
  if (["NO", "FALSE"].includes(s)) return "NO";
  return "";
}

function sanitizeYesNoMap(v, allowedKeys) {
  const obj = safePlainObject(v) ? v : {};
  if (hasPollutionKeys(obj)) return {};
  const out = {};
  for (const k of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const yn = normalizeYN(obj[k]);
      if (yn) out[k] = yn;
    }
  }
  return out;
}

function normalizeMBBRM(val) {
  const s = String(val || "").toUpperCase().trim();
  return ["MB", "B", "R", "M"].includes(s) ? s : "";
}

function sanitizeNovedades(v) {
  const obj = safePlainObject(v) ? v : {};
  if (hasPollutionKeys(obj)) return {};
  const out = {};

  // Ejemplo típico: { pintura: "B", instalaciones: "MB", observaciones: "..." }
  const allowed = [
    "pintura",
    "pisos",
    "aberturas",
    "instalacionesElectricas",
    "instalacionesSanitarias",
    "gas",
    "muebles",
    "observaciones",
  ];

  for (const k of allowed) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    if (k === "observaciones") {
      if (typeof obj[k] === "string") out[k] = obj[k].trim();
      continue;
    }
    const v2 = normalizeMBBRM(obj[k]);
    if (v2) out[k] = v2;
  }

  return out;
}
