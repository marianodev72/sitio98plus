"use strict";

/**
 * backend/controllers/ControllerAnexo08.js
 *
 * ANEXO_08 (institucional)
 * - Nace desde ANEXO_03 (CERRADO)
 * - Lo inicia INSPECTOR (permiso territorial; rol base PERMISIONARIO)
 * - Lo envía al PERMISIONARIO para conformidad
 * - Con conformidad -> queda EN_REVISION
 * - Cierre SOLO ADMIN_GENERAL (ADMIN = solo lectura)
 *
 * P0:
 * - Fail-Closed + No-Disclosure: siempre { message: "Recurso no disponible" }
 * - Mutaciones sin lean()
 * - Estados SOLO con cambiarEstado()
 * - No ObjectId en UI/Preview/PDF: DTO con datos claros
 * - DerivadoDe: obligatorio en creación (visible solo backoffice via Maestro)
 */

function safeTrim(v) {
  return typeof v === "string" ? v.trim() : "";
}

function parseDatosOrEmpty(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw || {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw || "{}") || {};
    } catch {
      return null; // inválido
    }
  }
  return {};
}

function isPoisonKey(k) {
  return k === "__proto__" || k === "constructor" || k === "prototype";
}

function deepDenyPoison(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(deepDenyPoison);

  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isPoisonKey(k)) continue;
    out[k] = deepDenyPoison(v);
  }
  return out;
}

function pick(obj, allow) {
  const out = {};
  if (!obj || typeof obj !== "object") return out;
  for (const k of allow) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

// Estados esperados (no inventamos)
function canTransition(estadoActual, nuevoEstado) {
  // Permitimos únicamente el flujo institucional usado en el sistema:
  // ENVIADO -> EN_REVISION (conformidad permisionario)
  // EN_REVISION -> CERRADO (cierre admin_general)
  const a = String(estadoActual || "").toUpperCase();
  const b = String(nuevoEstado || "").toUpperCase();
  if (a === "ENVIADO" && b === "EN_REVISION") return true;
  if (a === "EN_REVISION" && b === "CERRADO") return true;

  // Idempotencia: si ya está en destino, el handler lo resolverá arriba (sin transición)
  return false;
}

async function create(ctx) {
  const { req, res, user, core, models, template } = ctx;
  const { genericDenied, badRequest, up, isObjectId } = core;
  const { FormSubmission, User, Vivienda } = models;

  try {
    // Fail-closed: template requerido
    if (!template) return genericDenied(res);

    // Código viene del Maestro
    const codigo = up(req.params.codigo);
    if (codigo !== "ANEXO_08") return genericDenied(res);

    // Datos (vienen como string JSON por FormData)
    const datosIn0 = parseDatosOrEmpty(req.body?.datos);
    if (datosIn0 === null) return badRequest(res);

    const datosIn = deepDenyPoison(datosIn0);

    // derivadoDe / anexo03Id obligatorios (routes ya lo setean; igual validamos)
    const anexo03Id = datosIn.anexo03Id || datosIn.derivadoDe;
    const derivadoDe = datosIn.derivadoDe || datosIn.anexo03Id;

    if (!isObjectId(anexo03Id) || !isObjectId(derivadoDe)) return genericDenied(res);
    if (String(anexo03Id) !== String(derivadoDe)) return genericDenied(res);

    // Idempotencia: si ya existe ANEXO_08 derivado de ese ANEXO_03 -> 200 { anexo }
    const existing = await FormSubmission.findOne({
      codigo: "ANEXO_08",
      derivadoDe: anexo03Id,
    }).lean();

    if (existing && existing._id) {
      // Compat FE: el Maestro setea el status usando _httpStatus
      return { anexo: existing, _httpStatus: 200 };
    }

    // Validar origen: ANEXO_03 CERRADO
    const origen = await FormSubmission.findById(anexo03Id).lean();
    if (!origen) return genericDenied(res);
    if (up(origen.codigo) !== "ANEXO_03") return genericDenied(res);
    if (up(origen.estado) !== "CERRADO") return genericDenied(res);

    // Hidratación institucional: vivienda + permisionario desde origen
    const viviendaId =
      (isObjectId(origen?.vivienda) && origen.vivienda) ||
      (isObjectId(origen?.datos?.viviendaId) && origen.datos.viviendaId) ||
      null;

    const permisionarioId =
      (isObjectId(origen?.datos?.postulanteId) && origen.datos.postulanteId) ||
      (isObjectId(origen?.datos?.permisionarioId) && origen.datos.permisionarioId) ||
      (isObjectId(origen?.usuario) && origen.usuario) ||
      null;

    if (!isObjectId(viviendaId) || !isObjectId(permisionarioId)) return genericDenied(res);

    const vivienda = Vivienda?.findById ? await Vivienda.findById(viviendaId).lean() : null;
    if (!vivienda) return genericDenied(res);

    const permisionario = User?.findById ? await User.findById(permisionarioId).lean() : null;
    if (!permisionario) return genericDenied(res);

    const permisionarioNombre = safeTrim(
      [permisionario?.nombre, permisionario?.apellido].filter(Boolean).join(" ")
    );

    // Inspector no es rol: es permiso territorial.
    // El usuario que crea es el inspector actual (rol base PERMISIONARIO).
    const inspectorNombre = safeTrim([user?.nombre, user?.apellido].filter(Boolean).join(" "));

    // Allowlist (create)
    // Solo persistimos lo que el FE usa + lo institucional mínimo.
    const allowedCreate = [
      "observacionesInspector",
      "registroIntervencion", // si FE lo envía así
      "intervencion", // fallback si FE lo usa como objeto
      "fechaIntervencion",
      "horaIntervencion",
      "motivo",
      "resultado",
      "observaciones",
    ];

    const picked = pick(datosIn, allowedCreate);

    // Normalizamos campos principales (strings)
    const observacionesInspector = safeTrim(picked.observacionesInspector || picked.observaciones);
    const registroIntervencion =
      typeof picked.registroIntervencion === "string"
        ? safeTrim(picked.registroIntervencion)
        : picked.registroIntervencion;

    const now = new Date();

    const nuevo = new FormSubmission({
      codigo: "ANEXO_08",
      template,
      usuario: user._id,
      vivienda: viviendaId,
      barrio: safeTrim(vivienda?.barrio) || safeTrim(origen?.barrio),
      derivadoDe: anexo03Id,
      estado: "ENVIADO", // default también existe en schema; dejamos explícito para claridad
      datos: deepDenyPoison({
        // vínculo institucional (front/back)
        anexo03Id,
        viviendaId,
        permisionarioId,

        // ✅ datos claros (no ObjectId en UI/PDF)
        viviendaCodigo: safeTrim(vivienda?.codigo),
        permisionarioNombre,
        inspectorNombre,

        // contenido del anexo
        observacionesInspector,
        registroIntervencion,
        intervencion: typeof picked.intervencion === "object" ? deepDenyPoison(picked.intervencion) : undefined,
        fechaIntervencion: safeTrim(picked.fechaIntervencion),
        horaIntervencion: safeTrim(picked.horaIntervencion),
        motivo: safeTrim(picked.motivo),
        resultado: safeTrim(picked.resultado),

        // auditoría institucional mínima
        creadoEn: now.toISOString(),
      }),
      intervinientes: [
        { usuario: user._id, rol: "INSPECTOR" }, // rol lógico institucional (no es role base)
        { usuario: permisionarioId, rol: "PERMISIONARIO" },
      ],
    });

    // Mutación: documento real (sin lean)
    await nuevo.save();

    // Compat FE: 201 created
    return { anexo: nuevo.toObject(), _httpStatus: 201 };
  } catch (e) {
    console.error("[ANEXO_08.create] Error:", e);
    return genericDenied(res);
  }
}

async function hydrateDetail(ctx) {
  const { res, submission, core, models } = ctx;
  const { genericDenied, up, isObjectId } = core;
  const { User, Vivienda } = models;

  try {
    if (!submission || up(submission.codigo) !== "ANEXO_08") return genericDenied(res);

    // Hidratación liviana para DTO claro (sin ObjectId)
    let vivienda = null;
    const viviendaId =
      (isObjectId(submission?.vivienda) && submission.vivienda) ||
      (isObjectId(submission?.datos?.viviendaId) && submission.datos.viviendaId) ||
      null;

    if (viviendaId && Vivienda?.findById) {
      vivienda = await Vivienda.findById(viviendaId).lean();
    }

    let permisionarioNombre = safeTrim(submission?.datos?.permisionarioNombre);
    const permisionarioId =
      (isObjectId(submission?.datos?.permisionarioId) && submission.datos.permisionarioId) ||
      (isObjectId(submission?.datos?.postulanteId) && submission.datos.postulanteId) ||
      null;

    if (!permisionarioNombre && permisionarioId && User?.findById) {
      const u = await User.findById(permisionarioId).lean();
      permisionarioNombre = safeTrim([u?.nombre, u?.apellido].filter(Boolean).join(" "));
    }

    const inspectorNombre = safeTrim(submission?.datos?.inspectorNombre);

    const dto = {
      _id: submission._id, // FE probablemente usa _id para navegación (no lo tocamos)
      codigo: "ANEXO_08",
      estado: submission.estado,

      // campos claros
      vivienda: {
        codigo: safeTrim(vivienda?.codigo || submission?.datos?.viviendaCodigo || submission?.datos?.unidadHabitacional),
        barrio: safeTrim(vivienda?.barrio || submission?.barrio),
      },
      permisionario: { nombre: permisionarioNombre },
      inspector: { nombre: inspectorNombre },

      // contenido
      registroIntervencion: submission?.datos?.registroIntervencion || submission?.datos?.intervencion || null,
      observacionesInspector: submission?.datos?.observacionesInspector || "",
      observacionesPermisionario: submission?.datos?.observacionesPermisionario || "",
      observacionesAdminGeneral: submission?.datos?.observacionesAdminGeneral || "",
    };

    return { anexo: dto };
  } catch (e) {
    console.error("[ANEXO_08.hydrateDetail] Error:", e);
    return genericDenied(ctx.res);
  }
}

async function confirmByPermisionario(ctx) {
  const { req, res, user, core, models } = ctx;
  const { genericDenied, badRequest, isObjectId, up } = core;
  const { FormSubmission } = models;

  try {
    if (up(user?.role) !== "PERMISIONARIO") return genericDenied(res);
    if (!isObjectId(req.params.id)) return genericDenied(res);

    // Mutación -> doc real
    const sub = await FormSubmission.findById(req.params.id);
    if (!sub || up(sub.codigo) !== "ANEXO_08") return genericDenied(res);

    // Validar ownership institucional (permisionario del trámite)
    const d = sub.datos || {};
    const permId = d.permisionarioId || d.postulanteId;
    if (String(permId || "") !== String(user._id)) return genericDenied(res);

    // Idempotencia: si ya está EN_REVISION o CERRADO, devolvemos
    if (["EN_REVISION", "CERRADO"].includes(up(sub.estado))) {
      return res.json(sub.toObject());
    }

    // En este sistema, llega ENVIADO al permisionario
    if (up(sub.estado) !== "ENVIADO") return genericDenied(res);

    // Compat FE legacy: req.body.datos puede venir string JSON con observacionesPermisionario
    const datosIn0 = parseDatosOrEmpty(req.body?.datos);
    if (datosIn0 === null) return badRequest(res);

    const datosIn = deepDenyPoison(datosIn0);
    const obs = safeTrim(datosIn.observacionesPermisionario);

    sub.datos = sub.datos || {};
    sub.datos.observacionesPermisionario = obs;
    sub.datos.conformidadPermisionario = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion: obs || "Conformidad del permisionario sobre el ANEXO 08.",
    };

    if (!canTransition(sub.estado, "EN_REVISION")) return genericDenied(res);

    sub.cambiarEstado("EN_REVISION", user._id, "Conformidad permisionario (ANEXO_08)");
    await sub.save();

    return res.json(sub.toObject());
  } catch (e) {
    console.error("[ANEXO_08.confirmByPermisionario] Error:", e);
    return genericDenied(res);
  }
}

async function closeByAdminGeneral(ctx) {
  const { req, res, user, core, models } = ctx;
  const { genericDenied, badRequest, isObjectId, up, isAdminReadOnly, isAdminGeneral } = core;
  const { FormSubmission } = models;

  try {
    // ADMIN read-only + cierre solo ADMIN_GENERAL
    if (isAdminReadOnly(user)) return genericDenied(res);
    if (!isAdminGeneral(user)) return genericDenied(res);

    if (!isObjectId(req.params.id)) return genericDenied(res);

    // Mutación -> doc real
    const sub = await FormSubmission.findById(req.params.id);
    if (!sub || up(sub.codigo) !== "ANEXO_08") return genericDenied(res);

    // Debe estar EN_REVISION
    if (up(sub.estado) === "CERRADO") {
      // Idempotencia
      return res.json(sub.toObject());
    }
    if (up(sub.estado) !== "EN_REVISION") return genericDenied(res);

    const datosIn0 = parseDatosOrEmpty(req.body?.datos);
    if (datosIn0 === null) return badRequest(res);

    const datosIn = deepDenyPoison(datosIn0);
    const obs = safeTrim(datosIn.observacionesAdminGeneral);

    sub.datos = sub.datos || {};
    sub.datos.observacionesAdminGeneral = obs;

    // Aseguramos trazabilidad: si por algún motivo no existía conformidad del permisionario,
    // no revelamos nada, pero dejamos registro interno.
    if (!sub.datos.conformidadPermisionario || !sub.datos.conformidadPermisionario.ok) {
      const fallbackUserId =
        (isObjectId(sub.datos.permisionarioId) && sub.datos.permisionarioId) ||
        (isObjectId(sub.datos.postulanteId) && sub.datos.postulanteId) ||
        user._id;

      sub.datos.conformidadPermisionario = {
        ok: true,
        fecha: new Date(),
        usuario: fallbackUserId,
        observacion:
          sub.datos.conformidadPermisionario?.observacion ||
          "Conformidad asumida al momento del cierre ADMIN_GENERAL (ANEXO_08).",
      };
    }

    sub.datos.conformidadAdminGeneral = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion: obs || "Cierre ADMIN_GENERAL (ANEXO_08).",
    };

    if (!canTransition(sub.estado, "CERRADO")) return genericDenied(res);

    sub.cambiarEstado("CERRADO", user._id, "Cierre ADMIN_GENERAL (ANEXO_08)");
    await sub.save();

    return res.json(sub.toObject());
  } catch (e) {
    console.error("[ANEXO_08.closeByAdminGeneral] Error:", e);
    return genericDenied(res);
  }
}

async function renderPdf(ctx) {
  const { res, submission, user, core, services } = ctx;
  const { genericDenied, up } = core;

  try {
    if (!submission || up(submission.codigo) !== "ANEXO_08") return genericDenied(res);

    // Fail-closed: si el servicio no existe, NO fallback legacy
    const pdfService = services?.pdfService;
    if (!pdfService) return genericDenied(res);

    // Preferimos un método específico si existe
    if (typeof pdfService.renderAnexo08 === "function") {
      // Debe consumir DTO (no crudo)
      // Intentamos hidratar con los datos claros que ya existen en submission.datos
      const dto = {
        codigo: "ANEXO_08",
        estado: submission.estado,
        viviendaCodigo: submission?.datos?.viviendaCodigo || submission?.datos?.unidadHabitacional || "",
        barrio: submission?.barrio || "",
        permisionarioNombre: submission?.datos?.permisionarioNombre || "",
        inspectorNombre: submission?.datos?.inspectorNombre || "",
        registroIntervencion: submission?.datos?.registroIntervencion || submission?.datos?.intervencion || "",
        observacionesInspector: submission?.datos?.observacionesInspector || "",
        observacionesPermisionario: submission?.datos?.observacionesPermisionario || "",
        observacionesAdminGeneral: submission?.datos?.observacionesAdminGeneral || "",
      };

      const out = await pdfService.renderAnexo08({ dto, user });
      if (!out?.buffer) return genericDenied(res);

      return out;
    }

    // Fallback: si el servicio existe pero no implementa el método -> deny (mensaje oficial)
    return genericDenied(res);
  } catch (e) {
    console.error("[ANEXO_08.renderPdf] Error:", e);
    return genericDenied(res);
  }
}

module.exports = {
  code: "ANEXO_08",
  create,
  hydrateDetail,
  confirmByPermisionario,
  closeByAdminGeneral,
  renderPdf,
};