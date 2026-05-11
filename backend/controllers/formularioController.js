// backend/controllers/formularioController.js
// Controller maestro de formularios y ANEXOS — Sistema ZN98 / Sitio 98
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const { aplicarCambiosAnexo11 } = require("../services/anexo11Service");
const { updateByInspector } = require("./anexos/ControllerAnexo08");

const { FormTemplate } = require("../models/FormTemplate");
const { FormSubmission, ESTADOS_FORM } = require("../models/FormSubmission");

// ✅ Auditoría (modelo real, no middleware)
let AuditLog = null;

try {
  ({ AuditLog } = require("../models/AuditLog"));
} catch {
  AuditLog = null;
}

const MisDatosDeclaradosUpdate = require("../models/MisDatosDeclaradosUpdate");
const { User } = require("../models/user");

let Vivienda = null;
try {
  Vivienda = require("../models/vivienda");
} catch {
  Vivienda = null;
}

// Refuerzo seguro (por si el modelo tiene select:false en otros contextos)
try {
  ({ User } = require("../models/user"));
} catch {}

// ─────────────────────────────
// Helpers básicos
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));
const up = (v) => String(v || "").toUpperCase().trim();

// Formatea fechas de forma segura para PDFs / vistas
function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  // Podés ajustar locale/timezone si querés
  return d.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

const GENERIC_DENIED_MESSAGE = "Recurso no disponible";

function genericDenied(res) {
  return res.status(403).json({ message: GENERIC_DENIED_MESSAGE });
}

function badRequest(res, msg = "Datos inválidos") {
  return res.status(400).json({ message: msg });
}

function toPlain(value) {
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value.toObject === "function") return value.toObject();
  return value;
}

function stripAdjuntoRutas(value) {
  if (Array.isArray(value)) {
    return value.map(stripAdjuntoRutas);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const out = { ...value };

  if (Array.isArray(out.adjuntos)) {
    out.adjuntos = out.adjuntos.map((adj) => {
      if (!adj || typeof adj !== "object") return adj;

      return {
        nombre: adj.nombre || "",
        tipo: adj.tipo || "application/octet-stream",
        size: Number(adj.size || 0),
        fechaSubida: adj.fechaSubida || null,
      };
    });
  }

  if (out.anexo && typeof out.anexo === "object") {
    out.anexo = stripAdjuntoRutas(out.anexo);
  }

  if (out.origen && typeof out.origen === "object") {
    out.origen = stripAdjuntoRutas(out.origen);
  }

  if (Array.isArray(out.anexos)) {
    out.anexos = out.anexos.map(stripAdjuntoRutas);
  }

  return out;
}
// ─────────────────────────────
// ✅ Seguridad / Auditoría (ANEXO_09)
// - O1: estadoInstitucional NO se expone a frontend como “estado real”.
//       Para roles no-admin devolvemos leyendaInstitucional (texto) y ocultamos estadoInstitucional.
function stripEstadoInstitucionalIfNeeded(user, anexoObj) {
  if (!anexoObj || typeof anexoObj !== "object") return anexoObj;
  const codigoUp = up(anexoObj.codigo || "");
  if (codigoUp !== "ANEXO_09") return anexoObj;

  const roleUp = up(user?.role || "");
  const isAdmin = roleUp === "ADMIN" || roleUp === "ADMIN_GENERAL";

  // Siempre agregamos una leyenda neutral (no operativa) para UI/PDF.
  const ei = String(anexoObj.estadoInstitucional || "").trim();
  if (ei) {
    anexoObj.leyendaInstitucional =
      ei === "CON_NOVEDADES" ? "Trámite cerrado con novedades" : "Trámite con nota institucional";
  } else {
    anexoObj.leyendaInstitucional = "";
  }

  if (!isAdmin) {
    delete anexoObj.estadoInstitucional;
  }
  return anexoObj;
}
function isInspectorLikeUser(user) {
  const permisos = Array.isArray(user?.permisos)
    ? user.permisos.map(up)
    : [];
  return permisos.includes("INSPECTOR");
}

function isJefeLikeUser(user) {
  const permisos = Array.isArray(user?.permisos)
    ? user.permisos.map(up)
    : [];
  return permisos.includes("JEFE_DE_BARRIO");
}

function hasRolOrPermiso(user, rolesPermitidos = []) {
  const role = up(user?.role);
  const permisos = Array.isArray(user?.permisos)
    ? user.permisos.map(up)
    : user?.permisos
    ? [up(user.permisos)]
    : [];

  return rolesPermitidos.some((r) => {
    const rr = up(r);
    if (rr === "INSPECTOR" || rr === "JEFE_DE_BARRIO") {
      return permisos.includes(rr);
    }
    return role === rr;
  });
}
// ─────────────────────────────
// Numeración institucional ANEXO_11 (Pedido de trabajo)
// Devuelve un string tipo "1/2026" basado en el año actual
async function generarNumeroAnexo11() {
  try {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const desde = new Date(year, 0, 1);
    const hasta = new Date(year + 1, 0, 1);

    const totalEnElAnio = await FormSubmission.countDocuments({
      codigo: "ANEXO_11",
      createdAt: { $gte: desde, $lt: hasta },
    });

    // Ejemplo interno: "1/2026", "2/2026", etc.
    // El "N°" y el guion final se agregan en el PDF / UI.
    return `${totalEnElAnio + 1}/${year}`;
  } catch (e) {
    console.error("[ANEXO_11] Error generando número:", e);
    return "";
  }
}
// ─────────────────────────────
// Visibilidad por intervinientes / admin
function canSeeSubmission(user, sub) {
  const role = up(user?.role);
  if (role === "ADMIN" || role === "ADMIN_GENERAL") return true;

  if (String(sub.usuario) === String(user?._id)) return true;

  const list = Array.isArray(sub.intervinientes) ? sub.intervinientes : [];
  if (list.some((x) => String(x.userId) === String(user?._id))) return true;

  // retrocompat “postulanteId” para ANEXO_02 (anexos viejos sin intervinientes)
  if (
    up(sub.codigo) === "ANEXO_02" &&
    String(sub.datos?.postulanteId || "") === String(user?._id)
  )
    return true;

  return false;
}

function addIntervinienteUnique(list, userId, rol) {
  if (!isObjectId(userId)) return list;
  const uid = String(userId);
  const exists = list.some((x) => String(x.userId) === uid);
  if (!exists) list.push({ userId, rol: rol ? up(rol) : undefined });
  return list;
}

/**
 * Busca un usuario por rol/permisos y barrio.
 */
async function findUserByRolYBarrio(role, barrio) {
  if (!User) return null;
  const r = up(role);
  const b = String(barrio || "").trim();
  if (!b) return null;

  const query = {
  barrioAsignado: b,
};

if (r === "INSPECTOR" || r === "JEFE_DE_BARRIO") {
  query.$or = [{ permisos: r }, { permisos: new RegExp(`^${r}$`, "i") }];
} else {
  query.$or = [{ role: r }];
}

  return User.findOne(query).select(
    "_id role barrioAsignado nombre apellido permisos"
  );
}

async function autocompleteDatosAnexo02(datos) {
  // Completa snapshot de postulante + vivienda para que el PDF no muestre "—"
  if (!datos || typeof datos !== "object") return datos;

  // ───────────── POSTULANTE
  try {
    if (User) {
      const postulanteId = datos?.postulanteId;
      if (isObjectId(postulanteId)) {
        const u = await User.findById(postulanteId)
          .select("nombre apellido meta")
          .lean();

        if (u) {
          const meta = u.meta || {};
          const apellidoNombresAuto = `${String(u.apellido || "").trim()} ${String(
            u.nombre || ""
          ).trim()}`.trim();

          if (!datos.apellidoNombres && apellidoNombresAuto) {
            datos.apellidoNombres = apellidoNombresAuto;
          }

          if (!datos.grado) {
            datos.grado = String(meta.grado || meta.rango || meta.GRADO || "").trim();
          }

          if (!datos.mrDestino) {
            datos.mrDestino = String(
              meta.mrDestino || meta.destino || meta.DESTINO || meta["M.R._DESTINO"] || ""
            ).trim();
          }
        }
      }
    }
  } catch (e) {
    console.error("[ANEXO_02] autocomplete postulante error:", e);
  }

  // ───────────── VIVIENDA
  try {
    if (Vivienda) {
      const viviendaId = datos?.viviendaId;
      if (isObjectId(viviendaId)) {
        const v = await Vivienda.findById(viviendaId).lean();
        if (v) {
          const meta = v.meta || {};

          // Normalizadores (tu UI ya contempla variantes)
          const direccion =
            meta.direccion || meta.DIRECCION || v.direccion || "";
          const casa =
            v.numero ||
            meta.casaDepto ||
            meta.casa_depto ||
            meta.CASA ||
            meta.casa ||
            "";
          const departamento =
            meta.departamento ||
            meta.DEPARTAMENTO ||
            meta.depto ||
            meta.DPTO ||
            "";
          const localidad =
            meta.localidad ||
            meta.LOCALIDAD ||
            meta.Localidad ||
            "";

          // Snapshot mínimo requerido por el PDF (writeRow4 imprime estos)
          if (!datos.direccion && direccion) datos.direccion = String(direccion).trim();
          if (!datos.casa && casa) datos.casa = String(casa).trim();
          if (!datos.departamento && departamento) datos.departamento = String(departamento).trim();
          if (!datos.localidad && localidad) datos.localidad = String(localidad).trim();

          // Extras útiles (no rompen nada)
          if (!datos.viviendaCodigo && v.codigo) datos.viviendaCodigo = String(v.codigo).trim();
          if (!datos.barrio && (v.barrio || meta.barrio || meta.BARRIO))
            datos.barrio = String(v.barrio || meta.barrio || meta.BARRIO).trim();
        }
      }
    }
  } catch (e) {
    console.error("[ANEXO_02] autocomplete vivienda error:", e);
  }

  return datos;
}


// ─────────────────────────────
// GET detalle por ID (intervinientes + admin + vínculo institucional 02->01 + 03->02)
async function getById(req, res) {
  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);

    const { id } = req.params;
    if (!isObjectId(id)) return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);

    // ✅ EXCEPCIÓN INSTITUCIONAL:
    // POSTULANTE solo puede ver ANEXO_01 y ANEXO_02 propios
    if (up(user.role) === "POSTULANTE") {
      const codigoUp = up(anexo.codigo);

      if (codigoUp !== "ANEXO_01" && codigoUp !== "ANEXO_02") {
        return genericDenied(res);
      }

      const isOwner = String(anexo.usuario) === String(user._id);
      const isRetro02 =
        codigoUp === "ANEXO_02" &&
        anexo?.datos?.postulanteId &&
        String(anexo.datos.postulanteId) === String(user._id);

      if (!isOwner && !isRetro02) {
        return genericDenied(res);
      }

      // Si es ANEXO_02, devolvemos también adjuntos del ANEXO_01 origen (si existe)
      let origen = null;

      if (codigoUp === "ANEXO_02" && isObjectId(anexo.derivadoDe)) {
        const a01 = await FormSubmission.findById(anexo.derivadoDe)
          .select("codigo usuario adjuntos")
          .lean();

        if (a01 && up(a01.codigo) === "ANEXO_01") {
          // Validación institucional: el postulante solo puede acceder si es su propio ANEXO_01
          if (String(a01.usuario) === String(user._id)) {
            origen = {
              _id: a01._id,
              codigo: a01.codigo,
              adjuntos: Array.isArray(a01.adjuntos)
                ? a01.adjuntos.map((x) => ({
                    nombre: x?.nombre || "",
                    tipo: x?.tipo || "application/octet-stream",
                    size: Number(x?.size || 0),
                  }))
                : [],
            };
          }
        }
      }

      return res.json(stripAdjuntoRutas({ anexo: stripEstadoInstitucionalIfNeeded(user, anexo.toObject ? anexo.toObject() : anexo), origen }));
    }

    // Resto de roles: visibilidad normal
    if (!canSeeSubmission(user, anexo)) return genericDenied(res);

    // Para roles no postulante, devolvemos metadata del origen cuando aplica
    let origen = null;
    const codigoUp = up(anexo.codigo);

    // ORIGEN para ANEXO_02: adjuntos del ANEXO_01
    if (codigoUp === "ANEXO_02" && isObjectId(anexo.derivadoDe)) {
      const a01 = await FormSubmission.findById(anexo.derivadoDe)
        .select("codigo adjuntos usuario intervinientes vivienda barrio estado estadoInstitucional derivadoDe createdAt updatedAt")
        .lean();

      if (a01 && up(a01.codigo) === "ANEXO_01") {
        // Fail-closed: también exigimos visibilidad sobre el origen
        if (canSeeSubmission(user, a01)) {
          origen = {
            _id: a01._id,
            codigo: a01.codigo,
            adjuntos: Array.isArray(a01.adjuntos)
              ? a01.adjuntos.map((x) => ({
                  nombre: x?.nombre || "",
                  tipo: x?.tipo || "application/octet-stream",
                  size: Number(x?.size || 0),
                }))
              : [],
          };
        }
      }
    }

    // ✅ ORIGEN para ANEXO_03: datos del ANEXO_02 derivadoDe
    // Fail-closed: exigimos visibilidad sobre el origen también
    if (codigoUp === "ANEXO_03" && anexo.derivadoDe && isObjectId(String(anexo.derivadoDe))) {
  const a02 = await FormSubmission.findById(anexo.derivadoDe)
    .select("codigo datos usuario intervinientes vivienda barrio estado estadoInstitucional derivadoDe createdAt updatedAt")
    .lean();

  if (a02 && up(a02.codigo) === "ANEXO_02") {
    if (canSeeSubmission(user, a02)) {
      // ✅ Hidratación mínima SOLO en respuesta (no persiste en DB)
let datosOrigen = a02.datos && typeof a02.datos === "object" ? { ...a02.datos } : {};

// Si tenemos viviendaId, intentamos completar viviendaCodigo/viviendaLabel (como en listados)
if (Vivienda && isObjectId(datosOrigen.viviendaId)) {
  const v = await Vivienda.findById(datosOrigen.viviendaId)
    .select("codigo direccion barrio")
    .lean();

  if (v) {
    if (!datosOrigen.viviendaCodigo && v.codigo) {
      datosOrigen.viviendaCodigo = String(v.codigo).trim();
    }
    if (!datosOrigen.viviendaLabel) {
      datosOrigen.viviendaLabel =
        String(v.codigo || "").trim() ||
        String(v.direccion || "").trim() ||
        "Vivienda fiscal";
    }
    // opcional, por si el front lo usa:
    if (!datosOrigen.barrio && v.barrio) {
      datosOrigen.barrio = v.barrio;
    }
  }
}

// ✅ Hidratación postulante (label) SOLO en respuesta (no persiste en DB)
// Fuente institucional: el usuario dueño del ANEXO_02 (a02.usuario)
if (User && a02?.usuario && isObjectId(String(a02.usuario))) {
  const uPost = await User.findById(a02.usuario)
    .select("nombre apellido email")
    .lean();

  if (uPost) {
    // Guardamos postulanteId por claridad institucional
    if (!datosOrigen.postulanteId) datosOrigen.postulanteId = a02.usuario;

    const label = `${String(uPost.apellido || "").trim()} ${String(
      uPost.nombre || ""
    ).trim()}`.trim();

    // Label principal
    if (!datosOrigen.postulanteNombre && label) datosOrigen.postulanteNombre = label;

    // Alias por si el front espera "Label"
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
}

    const anexoObj = anexo.toObject ? anexo.toObject() : anexo;

    if (codigoUp === "ANEXO_11" && anexoObj && typeof anexoObj === "object") {
      const d = anexoObj.datos && typeof anexoObj.datos === "object" ? anexoObj.datos : {};
      const iv = Array.isArray(anexoObj.intervinientes) ? anexoObj.intervinientes : [];
      const ambitoUp = up(d?.ambito || "");
      const promotorRolUp = up(d?.promotorRol || d?.promotorTipo || "");
      const puedeUsarUsuarioComoPermisionario =
        ambitoUp !== "ESPACIO_COMUN" && promotorRolUp === "PERMISIONARIO";
      const intervinientePermisionario = iv.find(
        (x) => up(x?.rol) === "PERMISIONARIO" && isObjectId(x?.userId)
      );
      const viviendaId =
        (isObjectId(d?.viviendaId) && d.viviendaId) ||
        (isObjectId(anexoObj?.vivienda) && anexoObj.vivienda) ||
        null;
      const viviendaDoc =
        Vivienda && viviendaId
          ? await Vivienda.findById(viviendaId).select("ocupacionActual").lean()
          : null;

      let permisionarioUid = null;
      let fuente = "";

      if (isObjectId(d?.conformidadPermisionario?.usuario)) {
        permisionarioUid = d.conformidadPermisionario.usuario;
        fuente = "datos.conformidadPermisionario.usuario";
      } else if (isObjectId(d?.permisionarioId)) {
        permisionarioUid = d.permisionarioId;
        fuente = "datos.permisionarioId";
      } else if (intervinientePermisionario) {
        permisionarioUid = intervinientePermisionario.userId;
        fuente = "intervinientes.PERMISIONARIO";
      } else if (isObjectId(viviendaDoc?.ocupacionActual?.permisionario)) {
        permisionarioUid = viviendaDoc.ocupacionActual.permisionario;
        fuente = "vivienda.ocupacionActual.permisionario";
      } else if (puedeUsarUsuarioComoPermisionario && isObjectId(anexoObj?.usuario)) {
        permisionarioUid = anexoObj.usuario;
        fuente = "anexo.usuario";
      }

      let nombre = permisionarioUid ? await getNombreApellidoSafe(permisionarioUid) : "";

      if (!nombre) {
        const textoSeguro = (...vals) =>
          vals
            .map((v) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : ""))
            .find((v) => v && !isObjectId(v)) || "";
        const textual =
          textoSeguro(d?.permisionarioNombre, d?.postulanteLabel, d?.postulanteNombre, d?.permisionario);

        if (textual) {
          nombre = textual;
          fuente = "datos.textual";
        } else if (ambitoUp === "ESPACIO_COMUN") {
          nombre = "Espacio común del barrio";
          fuente = "fallback.espacioComun";
        } else if (viviendaDoc && !viviendaDoc?.ocupacionActual?.permisionario) {
          nombre = "Vivienda en reparación";
          fuente = "fallback.viviendaReparacion";
        } else {
          nombre = "Permisionario no identificado";
          fuente = "fallback.noIdentificado";
        }
      }

      anexoObj._resolved = {
        ...(anexoObj._resolved || {}),
        permisionario: { nombre, fuente },
      };
    }

    return res.json(stripAdjuntoRutas({ anexo: stripEstadoInstitucionalIfNeeded(user, anexoObj), origen }));
  } catch (e) {
    console.error("[getById] Error:", e);
    return genericDenied(res);
  }
}
// ─────────────────────────────
// POST /:id/conformidad-permisionario-11
// El Permisionario marca que tomó conocimiento de la intervención del inspector
// POST /api/formularios/:id/conformidad-permisionario-11
// El Permisionario marca que tomó conocimiento de la intervención del inspector
async function darConformidadPermisionario11(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isObjectId(id)) return genericDenied(res);
    if (!user) return genericDenied(res);

    const role = up(user.role);
    if (role !== "PERMISIONARIO") return genericDenied(res);


    if (!isObjectId(id)) return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);

    const codigo = up(anexo.codigo || "");
    if (codigo !== "ANEXO_11") return genericDenied(res);

    // No permitir si ya está cerrado/anulado
    const estadoUp = up(anexo.estado || "");
    if (["CERRADO", "ANULADO"].includes(estadoUp)) {
      return genericDenied(res);
    }

    // Chequeamos que el usuario sea realmente el permisionario dueño del pedido
    const datos =
      anexo.datos && typeof anexo.datos === "object" ? anexo.datos : {};
    const userIdStr = String(user._id);

    const permId = datos.permisionarioId
      ? String(datos.permisionarioId)
      : null;

    const creadorId =
      anexo.usuario && anexo.usuario._id
        ? String(anexo.usuario._id)
        : anexo.usuario
        ? String(anexo.usuario)
        : null;

    // Debe coincidir con permisionarioId o con el creador del anexo
    if (
      permId &&
      permId !== userIdStr &&
      creadorId &&
      creadorId !== userIdStr
    ) {
      return genericDenied(res);
    }
    if (!permId && creadorId && creadorId !== userIdStr) {
      return genericDenied(res);
    }

    // Observación opcional (puede venir en body u en body.datos)
    let observacion = "";
    if (typeof req.body?.observacion === "string") {
      observacion = req.body.observacion.trim();
    } else if (typeof req.body?.datos?.observacion === "string") {
      observacion = req.body.datos.observacion.trim();
    }

    datos.conformidadPermisionario = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion: observacion || null,
    };

    // Asignamos de nuevo y marcamos el campo como modificado
    anexo.datos = datos;
    anexo.markModified("datos");

    await anexo.save();

    const plano = anexo.toObject();
    return res.json(stripAdjuntoRutas({ anexo: plano }));
  } catch (e) {
    console.error("[ANEXO_11] Error en darConformidadPermisionario11", e);
    return genericDenied(res);
  }
}

// PATCH /api/formularios/:id/estado-institucional
// Solo ADMIN / ADMIN_GENERAL.
// Ajusta estadoInstitucional y permite guardar observaciones de ADMIN (última + historial).
async function setEstadoInstitucional(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    // Helpers que ya usás en el resto del controller
    if (!isObjectId(id)) return genericDenied(res);
    if (!user) return genericDenied(res);

    const role = up(user.role || "");
    if (role !== "ADMIN_GENERAL" && role !== "ADMIN") {
      return genericDenied(res);
    }

    // Body esperado:
    // {
    //   estadoInstitucional: "DEVUELTO_A_INSPECTOR" | "CERRADO_ADMIN_GENERAL" | "EN_ANALISIS_ADMIN" | null,
    //   observacionAdminGeneral?: "texto opcional"
    // }
    const body = req.body || {};

    const estadoInstitucional =
      typeof body.estadoInstitucional === "string"
        ? body.estadoInstitucional.trim()
        : body.estadoInstitucional === null
        ? null
        : "";

    const observacionAdminGeneral =
      typeof body.observacionAdminGeneral === "string"
        ? body.observacionAdminGeneral.trim()
        : "";

    // Lista de valores permitidos (agregá lo que uses)
    const ESTADOS_PERMITIDOS = [
      null,
      "",
      "DEVUELTO_A_INSPECTOR",
      "CERRADO_ADMIN_GENERAL",
      "EN_ANALISIS_ADMIN",
    ];

    if (!ESTADOS_PERMITIDOS.includes(estadoInstitucional)) {
      return res.status(400).json({
        message: "Datos inválidos: estadoInstitucional no permitido",
      });
    }


    if (!isObjectId(id)) return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);

    // ─────────────────────────────────────────────
    // 1) Actualizamos estadoInstitucional
    // ─────────────────────────────────────────────
    const estadoInstitucionalAnterior = anexo.estadoInstitucional || null;
    anexo.estadoInstitucional = estadoInstitucional || null;

    // ─────────────────────────────────────────────
    // 2) Guardamos observaciones ADMIN (última + historial)
    //    IMPORTANTE: esto es lo que hoy NO te aparece en inspector/permisionario,
    //    porque en Thunder te queda observacionesAdminGeneral: ""
    // ─────────────────────────────────────────────
    if (!anexo.datos || typeof anexo.datos !== "object") {
      anexo.datos = {};
    }

    if (observacionAdminGeneral) {
      // última observación visible para todos
      anexo.datos.observacionesAdminGeneral = observacionAdminGeneral;

      // historial (acumulativo)
      if (!Array.isArray(anexo.datos.observacionesAdminGeneralHistorial)) {
        anexo.datos.observacionesAdminGeneralHistorial = [];
      }

      anexo.datos.observacionesAdminGeneralHistorial.push({
        texto: observacionAdminGeneral,
        fecha: new Date(),
        usuario: user._id,
      });
    }

    // ─────────────────────────────────────────────
    // 3) Historial de estados (dejamos constancia del cambio institucional)
    // ─────────────────────────────────────────────
    if (!Array.isArray(anexo.historialEstados)) {
      anexo.historialEstados = [];
    }

    anexo.historialEstados.push({
      estadoAnterior: anexo.estado, // estado de trámite se mantiene
      estadoNuevo: anexo.estado, // no tocamos el estado principal
      observacion: `Cambio estado institucional: ${String(
        estadoInstitucional || "SIN_ESTADO"
      )} (antes: ${String(estadoInstitucionalAnterior || "SIN_ESTADO")})`,
      realizadoPor: user._id,
      fecha: new Date(),
    });

    await anexo.save();

    return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
  } catch (e) {
    console.error("[setEstadoInstitucional] Error:", e);
    return genericDenied(res);
  }
}

// ─────────────────────────────
// PDF helpers
function t(v) {
  return v === null || v === undefined ? "" : String(v);
}

function safeDate(v) {
  const s = String(v || "").trim();
  return s ? s : ".";
}

function fmtDateTime(v) {
  try {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("es-AR");
  } catch {
    return "";
  }
}

function yn(v) {
  const s = up(v);
  if (s === "SI" || s === "SÍ" || s === "YES" || s === "TRUE") return "SI";
  if (s === "NO" || s === "FALSE") return "NO";
  return t(v);
}

function mbbrm(v) {
  const s = up(v);
  if (["MB", "B", "R", "M"].includes(s)) return s;
  return "";
}

function writeHeaderAnexo03(doc) {
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("ACTA DE RECEPCIÓN DE VIVIENDA FISCAL", { align: "center" });
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(10).text("SITIO 98", { align: "center" });
  doc.moveDown(0.8);
}

function writeRow4(doc, y, a, b, c, d) {
  const x1 = 55;
  const x2 = 210;
  const x3 = 320;
  const x4 = 450;

  doc.font("Helvetica-Bold").fontSize(9).text("DIRECCIÓN", x1, y);
  doc.font("Helvetica-Bold").fontSize(9).text("CASA", x2, y);
  doc.font("Helvetica-Bold").fontSize(9).text("DEPARTAMENTO", x3, y);
  doc.font("Helvetica-Bold").fontSize(9).text("LOCALIDAD", x4, y);

  const y2 = y + 12;
  doc.font("Helvetica").fontSize(9).text(a || "—", x1, y2, { width: 150 });
  doc.font("Helvetica").fontSize(9).text(b || "—", x2, y2, { width: 90 });
  doc.font("Helvetica").fontSize(9).text(c || "—", x3, y2, { width: 120 });
  doc.font("Helvetica").fontSize(9).text(d || "—", x4, y2, { width: 120 });
}

async function getNombreApellidoSafe(userId) {
  try {
    if (!User) return "";
    if (!isObjectId(userId)) return "";
    const u = await User.findById(userId).select("nombre apellido").lean();
    if (!u) return "";
    const full = `${String(u.apellido || "").trim()} ${String(
      u.nombre || ""
    ).trim()}`.trim();
    return full;
  } catch {
    return "";
  }
}

// ─────────────────────────────
// Historial de intervenciones (pie de página PDF)

/**
 * Devuelve el historial de intervenciones desde la auditoría
 * para el formulario/anexo indicado.
 */
async function buildHistorialIntervenciones(anexoId) {
  try {
    if (!AuditLog || typeof AuditLog.find !== "function") return [];

    const targetId = String(anexoId || "");
    if (!targetId) return [];

    // Traemos todos los logs que apunten a ese id
    const logs = await AuditLog.find({ targetId })
      .sort({ createdAt: 1 })
      .lean();

    if (!logs.length) return [];

    // Resolvemos nombres de usuarios (actorId)
    let usersMap = {};
    if (User) {
      const actorIds = [
        ...new Set(
          logs
            .filter((l) => l.actorId)
            .map((l) => String(l.actorId))
        ),
      ];

      if (actorIds.length) {
        const usuarios = await User.find({ _id: { $in: actorIds } })
          .select("nombre apellido email")
          .lean();

        usersMap = usuarios.reduce((acc, u) => {
          const key = String(u._id);
          const nombreCompleto = `${String(u.apellido || "").trim()} ${String(
            u.nombre || ""
          ).trim()}`.trim();
          acc[key] = nombreCompleto || u.email || key;
          return acc;
        }, {});
      }
    }

    return logs.map((log) => {
      const actorId = log.actorId ? String(log.actorId) : null;
      const nombre =
        (actorId && usersMap[actorId]) ||
        log.metadata?.actorNombre ||
        null;

      return {
        fecha: log.createdAt,
        nombre: nombre || "Usuario",
        rol: log.actorRole || null,
        accion: log.action || null,
      };
    });
  } catch (e) {
    console.error("[PDF] Error buildHistorialIntervenciones:", e);
    return [];
  }
}

/**
 * Pinta al pie del PDF el historial de intervenciones
 * (nombre + rol + fecha/hora + acción).
 */
function drawHistorialIntervenciones(doc, historial = []) {
  if (!Array.isArray(historial) || !historial.length) return;

  const LEFT = 55;
  const WIDTH = 485;

  // Si estamos muy abajo en la página, pasamos a una nueva
  const bottomSafe = doc.page.height - doc.page.margins.bottom - 80;
  if (doc.y > bottomSafe) {
    doc.addPage();
  }

  doc.moveDown(0.8);
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("Historial de intervenciones", LEFT, doc.y, {
      width: WIDTH,
      align: "left",
    });

  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(7);

  historial.forEach((h) => {
    const fechaTxt = fmtDateTime(h.fecha);
    const nombre = h.nombre || "Usuario";
    const rol = h.rol ? ` (${h.rol})` : "";
    const accion = h.accion ? ` — ${h.accion}` : "";

    const linea = `• ${fechaTxt} — ${nombre}${rol}${accion}`;
    doc.text(linea, LEFT, doc.y, {
      width: WIDTH,
      align: "left",
    });
  });
}

//historial ANEXO 08
async function buildHistorialIntervencionesAnexo08(anexo) {
  try {
    if (!anexo) return [];

    const d = anexo.datos && typeof anexo.datos === "object" ? anexo.datos : {};
    const out = [];

    const push = (item) => {
      if (!item || !item.fecha) return;
      out.push(item);
    };

    // 1. Creación del anexo
    push({
      fecha: anexo.createdAt,
      usuarioId: anexo.usuario || null,
      rol: "CREADOR",
      accion: "Creación de ANEXO_08",
      detalle: null,
    });

    // 2. Intervenciones del inspector
    if (Array.isArray(d.intervencionesInspectorHistorial)) {
      d.intervencionesInspectorHistorial.forEach((x) => {
        push({
          fecha: x?.fecha,
          usuarioId: x?.usuario || null,
          rol: "INSPECTOR",
          accion: "Actualización de datos por inspector",
          detalle:
            x?.observacion ||
            (x?.cambios ? "Se registraron cambios en el formulario." : null),
        });
      });
    }

    // 3. Última actualización inspector (fallback)
    if (
      d.ultimaActualizacionInspector?.fecha &&
      (!Array.isArray(d.intervencionesInspectorHistorial) ||
        !d.intervencionesInspectorHistorial.length)
    ) {
      push({
        fecha: d.ultimaActualizacionInspector.fecha,
        usuarioId: d.ultimaActualizacionInspector.usuario || null,
        rol: "INSPECTOR",
        accion: "Actualización de datos por inspector",
        detalle: null,
      });
    }

    // 4. Conformidad inspector
    if (d.conformidadInspector?.fecha) {
      push({
        fecha: d.conformidadInspector.fecha,
        usuarioId: d.conformidadInspector.usuario || null,
        rol: "INSPECTOR",
        accion: "Conformidad del inspector",
        detalle: d.conformidadInspector.observacion || null,
      });
    }

    // 5. Conformidad permisionario
    if (d.conformidadPermisionario?.fecha) {
      push({
        fecha: d.conformidadPermisionario.fecha,
        usuarioId: d.conformidadPermisionario.usuario || null,
        rol: "PERMISIONARIO",
        accion: "Conformidad del permisionario",
        detalle: d.conformidadPermisionario.observacion || null,
      });
    }

    // 6. Cierre admin general
    if (d.conformidadAdminGeneral?.fecha) {
      push({
        fecha: d.conformidadAdminGeneral.fecha,
        usuarioId: d.conformidadAdminGeneral.usuario || null,
        rol: "ADMIN_GENERAL",
        accion: "Cierre administrativo",
        detalle: d.conformidadAdminGeneral.observacion || null,
      });
    }

    // 7. Historial institucional
    if (Array.isArray(anexo.historialEstados)) {
      anexo.historialEstados.forEach((h) => {
        push({
          fecha: h?.fecha,
          usuarioId: h?.realizadoPor || null,
          rol: "SISTEMA",
          accion:
            h?.observacion ||
            `Cambio de estado: ${String(h?.estadoAnterior || "")} -> ${String(
              h?.estadoNuevo || ""
            )}`,
          detalle: null,
        });
      });
    }

    // Resolver nombres de usuarios
    const ids = [
      ...new Set(
        out
          .map((x) => (x.usuarioId ? String(x.usuarioId) : ""))
          .filter(Boolean)
      ),
    ];

    const usersMap = {};
    if (ids.length && User) {
      const users = await User.find({ _id: { $in: ids } })
        .select("nombre apellido email role")
        .lean();

      users.forEach((u) => {
        usersMap[String(u._id)] =
          `${String(u.apellido || "").trim()} ${String(u.nombre || "").trim()}`.trim() ||
          String(u.email || "").trim() ||
          String(u._id);
      });
    }

    return out
      .map((x) => ({
        fecha: x.fecha,
        nombre: x.usuarioId ? usersMap[String(x.usuarioId)] || "Usuario" : "Sistema",
        rol: x.rol || null,
        accion: x.accion || null,
        detalle: x.detalle || null,
      }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  } catch (e) {
    console.error("[PDF] Error buildHistorialIntervencionesAnexo08:", e);
    return [];
  }
}

// historial ANEXO 09
async function buildHistorialIntervencionesAnexo09(anexo) {
  try {
    if (!anexo) return [];

    const d = anexo.datos && typeof anexo.datos === "object" ? anexo.datos : {};
    const out = [];

    const push = (item) => {
      if (!item || !item.fecha) return;
      out.push(item);
    };

    // 1. Creación del anexo (inspector genera el ANEXO_09)
    push({
      fecha: anexo.createdAt,
      usuarioId: anexo.usuario || null,
      rol: "CREADOR",
      accion: "Creación de ANEXO_09",
      detalle: null,
    });

    // 2. Actuación / conformidad del inspector al generar el acta
    if (d.conformidadInspector?.fecha) {
      push({
        fecha: d.conformidadInspector.fecha,
        usuarioId: d.conformidadInspector.usuario || null,
        rol: "INSPECTOR",
        accion: "Conformidad del inspector",
        detalle: d.conformidadInspector.observacion || null,
      });
    }

    // 3. Conformidad permisionario
    if (d.conformidadPermisionario?.fecha) {
      push({
        fecha: d.conformidadPermisionario.fecha,
        usuarioId: d.conformidadPermisionario.usuario || null,
        rol: "PERMISIONARIO",
        accion: "Conformidad del permisionario",
        detalle: d.conformidadPermisionario.observacion || null,
      });
    }

    // 4. Cierre admin general
    if (d.conformidadAdminGeneral?.fecha) {
      push({
        fecha: d.conformidadAdminGeneral.fecha,
        usuarioId: d.conformidadAdminGeneral.usuario || null,
        rol: "ADMIN_GENERAL",
        accion: "Cierre ADMIN_GENERAL (ANEXO_09)",
        detalle:
          d.conformidadAdminGeneral.observacion ||
          d.observacionCritica ||
          d.observacionesAdminGeneral ||
          null,
      });
    }

    // 5. Historial institucional del trámite
    if (Array.isArray(anexo.historialEstados)) {
      anexo.historialEstados.forEach((h) => {
        push({
          fecha: h?.fecha,
          usuarioId: h?.realizadoPor || null,
          rol: "SISTEMA",
          accion:
            h?.observacion ||
            `Cambio de estado: ${String(h?.estadoAnterior || "")} -> ${String(
              h?.estadoNuevo || ""
            )}`,
          detalle: null,
        });
      });
    }

    // Resolver nombres de usuarios
    const ids = [
      ...new Set(
        out
          .map((x) => (x.usuarioId ? String(x.usuarioId) : ""))
          .filter(Boolean)
      ),
    ];

    const usersMap = {};
    if (ids.length && User) {
      const users = await User.find({ _id: { $in: ids } })
        .select("nombre apellido email role")
        .lean();

      users.forEach((u) => {
        usersMap[String(u._id)] =
          `${String(u.apellido || "").trim()} ${String(u.nombre || "").trim()}`.trim() ||
          String(u.email || "").trim() ||
          String(u._id);
      });
    }

    return out
      .map((x) => ({
        fecha: x.fecha,
        nombre: x.usuarioId ? usersMap[String(x.usuarioId)] || "Usuario" : "Sistema",
        rol: x.rol || null,
        accion: x.accion || null,
        detalle: x.detalle || null,
      }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  } catch (e) {
    console.error("[PDF] Error buildHistorialIntervencionesAnexo09:", e);
    return [];
  }
}

// ─────────────────────────────
// ✅ PDF ANEXO_03 (institucional + firmantes)
function renderAnexo03Pdf(doc, anexo, vivienda, signers = {}, historial = []) {
  const d = anexo.datos || {};

  const signerPerm = signers.permisionario || {};
  const signerInsp = signers.inspector || {};
  const signerAdmin = signers.admin || {};

  writeHeaderAnexo03(doc);

  const LEFT = 55;
  const WIDTH = 485;

  const para = (text) => {
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(String(text || ""), LEFT, doc.y, {
        width: WIDTH,
        align: "justify",
      });
  };

  const lineaDato = (etiqueta, valor) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`${etiqueta}: `, LEFT, doc.y, { continued: true });
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(t(valor) || "..................................................");
  };

  const permisionarioBase =
    d.permisionarioNombre || d.permisionario || d.postulanteNombre;
  const unidad = d.unidadHabitacional || vivienda?.codigo;
  const direccion = d.direccion || vivienda?.direccion;
  const localidad = d.localidad || vivienda?.barrio;
  const provincia = d.provincia;
  const inspectorBase = d.inspectorNombre;

  const permNombre = signerPerm.nombre || permisionarioBase || "";
  const permFechaTxt = signerPerm.fecha ? fmtDateTime(signerPerm.fecha) : "";
  const permExtra = permFechaTxt ? ` — Conforme: ${permFechaTxt}` : "";

  const inspNombre = signerInsp.nombre || inspectorBase || "";
  const inspFechaTxt = signerInsp.fecha ? fmtDateTime(signerInsp.fecha) : "";
  const inspExtra = inspFechaTxt ? ` — Conforme: ${inspFechaTxt}` : "";

  const adminNombre = signerAdmin.nombre || "";
  const adminFechaTxt = signerAdmin.fecha ? fmtDateTime(signerAdmin.fecha) : "";
  const adminExtra = adminFechaTxt ? ` — Conforme: ${adminFechaTxt}` : "";

  lineaDato("PERMISIONARIO", `${permNombre}${permExtra}`);
  lineaDato("UNIDAD HABITACIONAL", unidad);
  lineaDato("DIRECCIÓN UNIDAD HABITACIONAL", direccion);
  lineaDato("LOCALIDAD", localidad);
  lineaDato("PROVINCIA", provincia);
  lineaDato("INSPECTOR", `${inspNombre}${inspExtra}`);
  if (adminNombre || adminExtra) {
    lineaDato("JEFE ÓRGANO ADMINISTRADOR", `${adminNombre}${adminExtra}`);
  }

  doc.moveDown(0.8);

  para(
    "El permisionario titular recibe de la Dirección General del Personal Naval la unidad habitacional indicada, por intermedio del Inspector designado por el organismo administrador."
  );
  doc.moveDown(0.2);
  para(
    "La recepción se realiza conforme al inventario general de la vivienda, al material, a la documentación y a las novedades que se detallan en la presente acta."
  );
  doc.moveDown(0.2);
  para("Marcar con una cruz la opción que corresponda en cada caso.");

  doc.moveDown(0.8);

  // 1. Material
  doc.font("Helvetica-Bold").fontSize(11).text("1. Material:");
  doc.moveDown(0.3);

  const material = d.material || {};
  const xLabel = 55;
  const xValueSI = 380;
  const xValueNO = 440;
  let y = doc.y;

  const drawMaterialRow = (label, value) => {
    const val = yn(value);
    const si = val === "SI" ? "X" : "";
    const no = val === "NO" ? "X" : "";

    doc.font("Helvetica").fontSize(9).text(label, xLabel, y);

    doc.font("Helvetica").fontSize(9).text("SI", xValueSI, y);
    doc.rect(xValueSI + 15, y - 2, 10, 10).stroke();
    if (si) {
      doc.font("Helvetica").fontSize(9).text("X", xValueSI + 17, y - 1);
    }

    doc.font("Helvetica").fontSize(9).text("NO", xValueNO, y);
    doc.rect(xValueNO + 18, y - 2, 10, 10).stroke();
    if (no) {
      doc.font("Helvetica").fontSize(9).text("X", xValueNO + 20, y - 1);
    }

    y += 14;
  };

  drawMaterialRow(
    "Llaves de las puertas de entrada al edificio",
    material.llavesEdificio
  );
  drawMaterialRow(
    "Llaves de las puertas de entrada a la vivienda",
    material.llavesVivienda
  );
  drawMaterialRow(
    "Llaves de las puertas de entrada a la baulera",
    material.llavesBaulera
  );
  drawMaterialRow(
    "Llave de la puerta de acceso a la terraza",
    material.llaveTerraza
  );
  drawMaterialRow(
    "Llave de la puerta de acceso a la cochera",
    material.llaveCochera
  );
  drawMaterialRow(
    "Muebles, enseres y menaje según inventario",
    material.inventarioMuebles
  );
  drawMaterialRow(
    "Línea telefónica funcionando",
    material.lineaTelefonica
  );

  doc.y = y + 8;

  // 2. Documentación
  doc.font("Helvetica-Bold").fontSize(11).text("2. Documentación:");
  doc.moveDown(0.3);

  const docu = d.documentacion || {};
  y = doc.y;

  const drawDocRow = (label, value) => {
    const val = yn(value);
    const si = val === "SI" ? "X" : "";
    const no = val === "NO" ? "X" : "";

    doc.font("Helvetica").fontSize(9).text(label, xLabel, y);

    doc.font("Helvetica").fontSize(9).text("SI", xValueSI, y);
    doc.rect(xValueSI + 15, y - 2, 10, 10).stroke();
    if (si) {
      doc.font("Helvetica").fontSize(9).text("X", xValueSI + 17, y - 1);
    }

    doc.font("Helvetica").fontSize(9).text("NO", xValueNO, y);
    doc.rect(xValueNO + 18, y - 2, 10, 10).stroke();
    if (no) {
      doc.font("Helvetica").fontSize(9).text("X", xValueNO + 20, y - 1);
    }

    y += 14;
  };

  drawDocRow(
    "Copia del Reglamento de Viviendas Fiscales de la Armada",
    docu.reglamentoViviendas
  );
  drawDocRow("Guía telefónica", docu.guiaTelefonica);
  drawDocRow(
    "Copia del Reglamento de Copropiedad del edificio y/o barrio",
    docu.reglamentoCopropiedad
  );

  doc.y = y + 10;

  // 3. Lectura medidor
  doc.font("Helvetica-Bold").fontSize(11).text("3. Lectura medidor:");
  doc.moveDown(0.3);

  const med = d.medidores || {};
  const mx = 55;
  const my = doc.y;

  doc.font("Helvetica").fontSize(9);
  doc.text(`GAS: ${t(med.gas_m3) || "___"} m³`, mx, my);
  doc.text(`AGUA: ${t(med.agua_m3) || "___"} m³`, mx + 170, my);
  doc.text(`LUZ: ${t(med.luz_kws) || "___"} Kws.`, mx, my + 14);
  doc.text(
    `TELÉFONO: ${t(med.telefono_pulsos) || "___"} pulsos`,
    mx + 170,
    my + 14
  );

  doc.moveDown(2);

  // Estado de sistemas y elementos
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("ESTADO DE SISTEMAS Y ELEMENTOS");
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      "Circular lo que corresponda: MB (Muy Bueno) - B (Bueno) - R (Regular) - M (Malo).",
      { width: WIDTH, align: "left" }
    );

  doc.moveDown(0.5);

  const est = d.estadoSistemas || {};
  const items = [
    ["Agua", mbbrm(est.agua)],
    ["Cloacas", mbbrm(est.cloacas)],
    ["Electricidad", mbbrm(est.electricidad)],
    ["Gas", mbbrm(est.gas)],
    ["Pluviales", mbbrm(est.pluviales)],
    ["Teléfono", mbbrm(est.telefono)],
    ["Aberturas", mbbrm(est.aberturas)],
    ["Albañilería", mbbrm(est.albanileria)],
    ["Alfombras", mbbrm(est.alfombras)],
    ["Antena TV", mbbrm(est.antenaTv)],
    ["Calefactor / Estufa", mbbrm(est.calefactorEstufa)],
    ["Calefón / Termotanque", mbbrm(est.calefonTermotanque)],
    ["Carpintería", mbbrm(est.carpinteria)],
    ["Cerrajería", mbbrm(est.cerrajeria)],
    ["Cocina", mbbrm(est.cocina)],
    ["Desinfección", mbbrm(est.desinfeccion)],
    ["Herrajes", mbbrm(est.herrajes)],
    ["Limpieza", mbbrm(est.limpieza)],
    ["Lustrado", mbbrm(est.lustrado)],
    ["Parques y Jardines", mbbrm(est.parquesJardines)],
    ["Pintura", mbbrm(est.pintura)],
    ["Pisos", mbbrm(est.pisos)],
    ["Portero Eléctrico", mbbrm(est.porteroElectrico)],
    ["Sanitarios", mbbrm(est.sanitarios)],
    ["Vidrios", mbbrm(est.vidrios)],
    ["Estado General", mbbrm(est.estadoGeneral)],
  ];

  const startY = doc.y;
  const col1X = 55;
  const col2X = 320;
  const rowH = 14;

  items.forEach(([label, val], idx) => {
    const isLeft = idx % 2 === 0;
    const x = isLeft ? col1X : col2X;
    const yRow = startY + Math.floor(idx / 2) * rowH;

    doc.font("Helvetica").fontSize(9).text(label, x, yRow);
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(val || "", x + 200, yRow, { width: 40, align: "center" });
    doc.rect(x + 196, yRow - 2, 48, 12).stroke();
  });

  doc.y = startY + Math.ceil(items.length / 2) * rowH + 10;

  // Novedades
  doc.font("Helvetica-Bold").fontSize(11).text("NOVEDADES:");
  doc.moveDown(0.3);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(t(d.novedadesTexto || ""), {
      width: WIDTH,
      align: "left",
      height: 120,
    });

  // Segunda página: cláusula y firmas
  doc.addPage();
  writeHeaderAnexo03(doc);

  doc.moveDown(0.5);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Reparación, mantenimiento y entrega:");
  doc.moveDown(0.2);
  para(
    "Para las tareas de reparación, mantenimiento y entrega de la vivienda se deberá cumplir con lo previsto en el Reglamento de Viviendas Fiscales de la Armada."
  );

  doc.moveDown(0.6);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Cláusula de autorización de descuento");
  doc.moveDown(0.2);
  para(
    "Al finalizar la ocupación de la unidad habitacional, si el permisionario no cumpliera con los trámites y condiciones de entrega fijados en el Reglamento de Viviendas Fiscales, la Armada queda facultada para aplicar los descuentos correspondientes sobre los haberes, por los gastos que demande restituir la vivienda a las condiciones reglamentarias."
  );
  doc.moveDown(0.2);
  para(
    "Los importes a descontar se calcularán sobre los presupuestos de las reparaciones necesarias, con los incrementos reglamentarios que correspondan."
  );
  doc.moveDown(0.4);
  para("Para constancia se firman dos ejemplares de un mismo tenor.");

  doc.moveDown(0.8);

  const fechaFirma = d.fechaFirma || new Date().toISOString().slice(0, 10);
  const lugarFirma = d.lugarFirma || localidad || "";

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(
      `Lugar y fecha: ${t(lugarFirma) || "................................"} — ${fechaFirma}`,
      LEFT
    );

  doc.moveDown(1.4);

  const yFirmas = doc.y;

  // Firma Permisionario
  doc
    .font("Helvetica")
    .fontSize(10)
    .text("....................................................", LEFT, yFirmas);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("Permisionario o representante", LEFT, yFirmas + 12);
  if (permNombre) {
    doc.font("Helvetica").fontSize(8).text(permNombre, LEFT, yFirmas + 24);
  }
  if (permFechaTxt) {
    doc.font("Helvetica").fontSize(8).text(permFechaTxt, LEFT, yFirmas + 34);
  }

  // Firma Inspector
  const xInsp = LEFT + 220;
  doc
    .font("Helvetica")
    .fontSize(10)
    .text("....................................................", xInsp, yFirmas);
  doc.font("Helvetica").fontSize(9).text("Inspector", xInsp, yFirmas + 12);
  if (inspNombre) {
    doc.font("Helvetica").fontSize(8).text(inspNombre, xInsp, yFirmas + 24);
  }
  if (inspFechaTxt) {
    doc.font("Helvetica").fontSize(8).text(inspFechaTxt, xInsp, yFirmas + 34);
  }

  // Firma Jefe Órgano Administrador
  const yAdmin = yFirmas + 60;
  doc
    .font("Helvetica")
    .fontSize(10)
    .text("....................................................", LEFT, yAdmin);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("Jefe Organismo Administrador", LEFT, yAdmin + 12);
  if (adminNombre) {
    doc.font("Helvetica").fontSize(8).text(adminNombre, LEFT, yAdmin + 24);
  }
  if (adminFechaTxt) {
    doc.font("Helvetica").fontSize(8).text(adminFechaTxt, LEFT, yAdmin + 34);
  }

  // Pie: historial de intervenciones
  drawHistorialIntervenciones(doc, historial);
}
// ✅ PDF ANEXO_02
function renderAnexo02Pdf(
  doc,
  anexo,
  vivienda,
  signers = {},
  historial,
  anexo01Derivado
) {
  const d = anexo.datos || {};
  const d01 =
    anexo01Derivado && anexo01Derivado.datos ? anexo01Derivado.datos : {};

  const LEFT = 55;
  const WIDTH = 485;

  const resetLeft = () => {
    doc.x = LEFT;
  };

  const para = (text) => {
    resetLeft();
    doc.font("Helvetica").fontSize(10).text(String(text || ""), LEFT, doc.y, {
      width: WIDTH,
      align: "justify",
    });
  };

  const centerTitle = (text, size = 12) => {
    resetLeft();
    doc.font("Helvetica-Bold").fontSize(size).text(String(text || ""), LEFT, doc.y, {
      width: WIDTH,
      align: "center",
    });
  };

  // Row 3 columnas (encabezado + valores) para GRADO / APELLIDO Y NOMBRES / MATRÍCULA
  const writeRow3 = (headers, values) => {
    const gap = 12;
    const col1 = 70; // GRADO
    const col3 = 110; // MATRÍCULA
    const col2 = WIDTH - col1 - col3 - gap * 2; // Nombre y apellido

    const x1 = LEFT;
    const x2 = LEFT + col1 + gap;
    const x3 = x2 + col2 + gap;

    // Encabezados
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(headers[0] || "", x1, doc.y, { width: col1, align: "left" });
    doc.text(headers[1] || "", x2, doc.y, { width: col2, align: "left" });
    doc.text(headers[2] || "", x3, doc.y, { width: col3, align: "left" });

    doc.moveDown(0.2);

    // Valores
    doc.font("Helvetica").fontSize(10);
    doc.text(values[0] || "", x1, doc.y, { width: col1, align: "left" });
    doc.text(values[1] || "", x2, doc.y, { width: col2, align: "left" });
    doc.text(values[2] || "", x3, doc.y, { width: col3, align: "left" });

    doc.moveDown(0.6);
  };

  // Header
  resetLeft();
  doc.font("Helvetica").fontSize(10).text("R.G-6-002 PÚBLICO", LEFT);
  doc.moveDown(0.2);

  resetLeft();
  doc
    .font("Helvetica")
    .fontSize(10)
    .text("(2.06., inc. 7.; 2.10., inc. 1. y 2.15., subinc. 2.1.)", LEFT);

  doc.moveDown(0.4);

  // ✅ TÍTULOS CENTRADOS
  centerTitle("ARMADA ARGENTINA", 12);
  centerTitle("ACTA DE ASIGNACIÓN DE VIVIENDA FISCAL DE LA ARMADA", 12);
  centerTitle("ANEXO 02", 12);

  doc.moveDown(0.8);

  para(
    "El ESTADO MAYOR GENERAL DE LA ARMADA, representado por la Dirección General del Personal Naval, entrega, en carácter de permisionario, al:"
  );

  doc.moveDown(0.4);

  // ─────────────────────────────
  // Datos en claro (fuente de verdad: ANEXO_01)
  const grado = t(d.grado || d01.gradoEscalafon || "");

  const ape = t(d01.apellido || "");
  const nom = t(d01.nombres || "");
  const apeNom = t(d.apellidoNombres || `${ape} ${nom}`.trim());

  // ✅ "M.R." = MATRÍCULA
  const matricula = t(d.mr || d01.mr || "");

  // ✅ 3 COLUMNAS BIEN SEPARADAS
  writeRow3(
    ["GRADO", "APELLIDO Y NOMBRES", "MATRÍCULA"],
    [grado, apeNom, matricula]
  );

  para("La unidad habitacional propiedad de la ARMADA ARGENTINA, ubicada en:");

  doc.moveDown(0.25);

  // ─────────────────────────────
  // Vivienda según modelo actual (código institucional + barrio)
  const direccion = t(d.direccion || ""); // legacy/fail-soft
  const casa = t(
    vivienda?.codigo ||
      d.casa ||
      d.unidadHabitacional ||
      d.viviendaCodigo ||
      ""
  ); // ej: LM-112
  const departamento = t(d.departamento || ""); // legacy/fail-soft
  const localidad = t(vivienda?.barrio || d.localidad || "");

  writeRow4(doc, doc.y, direccion, casa, departamento, localidad);

  doc.moveDown(2.2);
  resetLeft();

  para(
    "Esta asignación se acuerda conforme a las normas, requisitos y condiciones que fija el “Reglamento de Viviendas Fiscales de la Armada”, que el permisionario declara conocer en todas sus partes, obligándose a cumplir con los requisitos y aceptando todas las condiciones allí establecidas."
  );
  doc.moveDown(0.4);

  para(
    "El personal militar que se le asigne Vivienda Fiscal de uso particular, no percibirá la Compensación por Vivienda (Código 247)."
  );
  doc.moveDown(0.4);

  para(
    "Asimismo, queda aclarado que, de conformidad con las disposiciones orgánicas vigentes en la ARMADA ARGENTINA, que determinan el traslado periódico de su lugar de prestación de servicios, se lo considera personal con inestabilidad de residencia. Por consiguiente, la presente no constituye un Contrato de Locación regido por el Código Civil y leyes complementarias."
  );
  doc.moveDown(0.4);

  para(
    "Queda asimismo acordado que el derecho al uso de la vivienda es conferido con carácter precario y por sola circunstancia de prestar servicios en el destino arriba expresado, fijándose:"
  );

  doc.moveDown(0.2);

  const fechaAsignacion = safeDate(d.fechaAsignacion);
  const fechaEntrega = safeDate(d.fechaEntrega);

  resetLeft();
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Fecha de Asignación: ${fechaAsignacion}`, LEFT);

  resetLeft();
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Fecha de Entrega: ${fechaEntrega}`, LEFT);

  doc.moveDown(0.2);
  para("De no mediar circunstancias especiales que obliguen a su anticipación.");
  doc.moveDown(0.6);

  para(
    "El permisionario recibe la vivienda en correcto estado de uso y conservación, constituyendo responsabilidad suya contribuir con material y mano de obra, como también controlar la ejecución de todos los trabajos que sean necesarios en ella, de modo tal que a la finalización de la autorización precaria para el uso la misma sea reintegrada en perfecto estado de funcionamiento y presentación."
  );

  doc.moveDown(0.9);

  const postOK = Boolean(anexo?.conformidadPostulante?.ok);
  const postFecha = fmtDateTime(anexo?.conformidadPostulante?.fecha);
  const postNombre = String(signers?.postulanteNombre || "").trim();

  const adminStored = anexo?.datos?.conformidadAdminGeneral || null;
  const adminFallback = !adminStored && up(anexo?.estado) === "CERRADO"
    ? [...(Array.isArray(anexo?.historialEstados) ? anexo.historialEstados : [])]
        .reverse()
        .find((h) => {
          const obs = up(h?.observacion);
          return (
            up(h?.estadoNuevo) === "CERRADO" &&
            (obs.includes("ADMIN_GENERAL") || obs.includes("ADMIN GENERAL") || obs.includes("ADMIN"))
          );
        })
    : null;

  const adminOK = Boolean(adminStored?.ok || adminFallback);
  const adminFecha = fmtDateTime(adminStored?.fecha || adminFallback?.fecha);
  const adminNombre = String(signers?.adminNombre || "").trim();

  const postLine1 = postOK && postFecha ? postFecha : "Pendiente";
  const postLine2 = postNombre ? postNombre : "";

  const adminLine1 = adminOK && adminFecha ? adminFecha : "Pendiente";
  const adminLine2 = adminNombre || (adminFallback ? "ADMIN GENERAL" : "");

  const colLeftX = LEFT;
  const colRightX = 330;

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Conforme Postulante", colLeftX);
  doc.font("Helvetica").fontSize(10).text(postLine1, colLeftX);
  if (postLine2) doc.text(postLine2, colLeftX);

  doc.moveDown(0.8);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Aprobado Jefe Órgano Administrador", colRightX);
  doc.font("Helvetica").fontSize(10).text(adminLine1, colRightX);
  if (adminLine2) doc.text(adminLine2, colRightX);

  doc.moveDown(1.0);
  doc.font("Helvetica").fontSize(9).text("A-5", { align: "right" });
}

// ─────────────────────────────
// ✅ PDF ANEXO_07
function renderAnexo07Pdf(doc, anexo, vivienda, signers = {}) {
  const d = anexo.datos || {};

  const LEFT = 55;
  const WIDTH = 485;

  const permBase =
    d.permisionarioNombre || d.permisionario || d.postulanteNombre || "";

  const unidad = d.unidadHabitacional || vivienda?.codigo || "";
  const direccion =
    d.direccionUnidad || d.direccion || vivienda?.direccion || "";
  const localidad = d.localidad || vivienda?.barrio || "";
  const provincia = d.provincia || "";
  const inspectorNombre = d.inspectorNombre || "";
  const inspectorBarrio = d.inspectorBarrio || anexo.barrio || "";

  // Firmantes / actuaciones
  const signerPerm = signers.permisionario || {};
  const signerInsp = signers.inspector || {};
  const signerAdmin = signers.admin || {};

  const permNombre = signerPerm.nombre || permBase || "";
  const permFechaTxt = signerPerm.fecha ? fmtDateTime(signerPerm.fecha) : "";
  const permLineaExtra = permFechaTxt ? ` — Conforme: ${permFechaTxt}` : "";

  const inspNombre = signerInsp.nombre || inspectorNombre || "";
  const inspFechaTxt = signerInsp.fecha ? fmtDateTime(signerInsp.fecha) : "";
  const inspLineaExtra = inspFechaTxt ? ` — Revisión: ${inspFechaTxt}` : "";

  const adminNombre = signerAdmin.nombre || "";
  const adminFechaTxt = signerAdmin.fecha ? fmtDateTime(signerAdmin.fecha) : "";
  const adminLineaExtra = adminFechaTxt ? ` — Cierre: ${adminFechaTxt}` : "";

  const lineaDato = (etiqueta, valor) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`${etiqueta}: `, LEFT, doc.y, { continued: true });
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(t(valor) || "..................................................");
  };

  // Encabezado institucional
  doc.font("Helvetica").fontSize(10).text("R.G-6-002 PÚBLICO", LEFT);
  doc.moveDown(0.3);

  doc.font("Helvetica-Bold").fontSize(12).text("ANEXO 07", { align: "center" });
  doc.moveDown(0.1);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("PLANILLA AMPLIACIÓN DE NOVEDADES", { align: "center" });
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("DEL ACTA DE RECEPCIÓN DE VIVIENDA FISCAL DE LA ARMADA", {
      align: "center",
    });
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10).text("(3.01., inc. 4.)", {
    align: "center",
  });
  doc.moveDown(0.8);

  // Datos principales
  lineaDato("PERMISIONARIO", permNombre + permLineaExtra);
  lineaDato("UNIDAD HABITACIONAL", unidad);
  lineaDato("DIRECCIÓN UNIDAD HABITACIONAL", direccion);
  lineaDato("LOCALIDAD", localidad);
  lineaDato("PROVINCIA", provincia);
  lineaDato("INSPECTOR DE BARRIO", inspectorNombre || inspectorBarrio);

  doc.moveDown(0.8);

  const lugar = d.lugar || "";
  const fechaAmp = d.fechaAmpliacion ? fmtDateTime(d.fechaAmpliacion) : "";

  lineaDato("LUGAR", lugar);
  lineaDato("FECHA AMPLIACIÓN", fechaAmp);

  doc.moveDown(0.8);

  // Novedades adicionales
  doc.font("Helvetica-Bold").fontSize(11).text("NOVEDADES ADICIONALES:");
  doc.moveDown(0.3);

  const novedades = Array.isArray(d.novedades) ? d.novedades : [];

  if (!novedades.length) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .text("Sin novedades registradas.", LEFT, doc.y, {
        width: WIDTH,
        align: "left",
      });
  } else {
    doc.font("Helvetica").fontSize(10);
    novedades.forEach((n, idx) => {
      const texto = String(n || "").trim() || "(vacío)";
      doc.text(`${idx + 1}. ${texto}`, LEFT, doc.y, {
        width: WIDTH,
        align: "left",
      });
    });
  }

  doc.moveDown(0.8);

  // Observaciones del inspector
  if (d.observacionesInspector) {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Observaciones del inspector:");
    doc.moveDown(0.2);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(String(d.observacionesInspector || ""), LEFT, doc.y, {
        width: WIDTH,
        align: "left",
      });
    doc.moveDown(0.8);
  }

  // Observaciones / fundamentos ADMIN_GENERAL
  if (d.observacionesAdminGeneral) {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Observaciones / fundamentos ADMIN_GENERAL:");
    doc.moveDown(0.2);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(String(d.observacionesAdminGeneral || ""), LEFT, doc.y, {
        width: WIDTH,
        align: "left",
      });
    doc.moveDown(0.8);
  }

  // Actuaciones resumen
  doc.font("Helvetica-Bold").fontSize(11).text("ACTUACIONES");
  doc.moveDown(0.4);

  const actLinea = (titulo, nombre, extra) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`${titulo}: `, LEFT, doc.y, { continued: true });
    doc
      .font("Helvetica")
      .fontSize(10)
      .text((nombre ? nombre : "—") + (extra ? extra : ""));
  };

  actLinea("Permisionario", permNombre, permLineaExtra);
  actLinea("Inspector de barrio", inspNombre, inspLineaExtra);
  actLinea("Jefe órgano administrador", adminNombre, adminLineaExtra);
}

// ─────────────────────────────
// ✅ PDF ANEXO_08
function renderAnexo08Pdf(doc, anexo, vivienda, signers = {}, historial = []) {
  const d = anexo.datos || {};

  const LEFT = 55;
  const WIDTH = 485;

  const tVal = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    return String(v);
  };

  const lineaDato = (etiqueta, valor) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`${etiqueta}: `, LEFT, doc.y, { continued: true });
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(tVal(valor));
  };

  const bloqueTitulo = (titulo) => {
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(11).text(titulo, LEFT, doc.y, {
      width: WIDTH,
      align: "left",
    });
    doc.moveDown(0.2);
  };

  const bloqueTexto = (txt) => {
    doc.font("Helvetica").fontSize(10).text(tVal(txt), LEFT, doc.y, {
      width: WIDTH,
      align: "left",
    });
  };

  const lista = (items) => {
    if (!Array.isArray(items) || !items.length) {
      doc.font("Helvetica").fontSize(10).text("—", LEFT, doc.y);
      return;
    }
    items.forEach((x, i) => {
      doc.font("Helvetica").fontSize(10).text(`${i + 1}. ${tVal(x)}`, LEFT, doc.y, {
        width: WIDTH,
        align: "left",
      });
    });
  };

  const rep = (r) => ({
    apellidoNombres: r?.apellidoNombres || "",
    grado: r?.grado || "",
    mr: r?.mr || "",
    destino: r?.destino || "",
    telefono: r?.telefono || "",
  });

  const rep1 = rep(d.representante1);
  const rep2 = rep(d.representante2);

  const unidad =
    d.unidadHabitacional ||
    d.viviendaCodigo ||
    vivienda?.codigo ||
    "—";

  const direccion =
    d.direccionUnidad ||
    d.direccion ||
    vivienda?.direccion ||
    "—";

  const localidad =
    d.localidad ||
    vivienda?.barrio ||
    "—";

  const provincia = d.provincia || "—";

  const permisionario =
    d.permisionarioNombre ||
    d.postulanteNombre ||
    "—";

  const inspector =
    d.inspectorNombre ||
    signers?.inspector?.nombre ||
    "—";

  const numero =
    d.numero ||
    d.numeroAnexo ||
    `N° ${String(anexo._id || "").slice(-6).toUpperCase()}`;

  doc.font("Helvetica-Bold").fontSize(14).text("FORMULARIO DE INSPECCIÓN PREVIA", {
    align: "center",
  });
  doc.font("Helvetica-Bold").fontSize(12).text("ANEXO 08", { align: "center" });
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10).text(`Nº: ${numero}`, { align: "left" });
  doc.font("Helvetica").fontSize(10).text(`Fecha: ${fmtDateTime(anexo.createdAt)}`, {
    align: "left",
  });
  doc.font("Helvetica").fontSize(10).text("Ámbito: VIVIENDA", { align: "left" });
  doc.moveDown(0.5);

  lineaDato("Vivienda / Espacio", unidad);
  lineaDato("Permisionario", permisionario);
  lineaDato("Inspector", inspector);
  lineaDato("Dirección", direccion);
  lineaDato("Localidad", localidad);
  lineaDato("Provincia", provincia);
  lineaDato("Grado del permisionario", d.gradoPermisionario || "—");
  lineaDato("Lugar de inspección", d.lugarInspeccion || d.lugar || "—");
  lineaDato("Fecha de inspección", d.fechaInspeccion || "—");
  lineaDato("Lugar de firma", d.lugarFirma || "—");
  lineaDato("Fecha de firma", d.fechaFirma || "—");

  bloqueTitulo("REPARACIONES A CARGO DE LA ARMADA");
  lista(d.reparacionesArmada);

  bloqueTitulo("REPARACIONES A CARGO DEL PERMISIONARIO");
  lista(d.reparacionesPermisionario);

  bloqueTitulo("OBSERVACIONES DEL INSPECTOR");
  bloqueTexto(d.observacionesInspector);

  bloqueTitulo("REPRESENTANTE 1");
  lineaDato("Apellido y nombres", rep1.apellidoNombres || "—");
  lineaDato("Grado", rep1.grado || "—");
  lineaDato("M.R.", rep1.mr || "—");
  lineaDato("Destino", rep1.destino || "—");
  lineaDato("Teléfono", rep1.telefono || "—");

  bloqueTitulo("REPRESENTANTE 2");
  lineaDato("Apellido y nombres", rep2.apellidoNombres || "—");
  lineaDato("Grado", rep2.grado || "—");
  lineaDato("M.R.", rep2.mr || "—");
  lineaDato("Destino", rep2.destino || "—");
  lineaDato("Teléfono", rep2.telefono || "—");

  bloqueTitulo("ACTUACIONES");
  if (!Array.isArray(historial) || !historial.length) {
    bloqueTexto("Sin actuaciones registradas.");
  } else {
    historial.forEach((h) => {
      const fecha = fmtDateTime(h.fecha) || "—";
      const nombre = h.nombre || "Usuario";
      const rol = h.rol ? ` (${h.rol})` : "";
      const accion = h.accion || "Actuación";
      const detalle = h.detalle ? ` — ${h.detalle}` : "";
      doc.font("Helvetica").fontSize(9).text(
        `• ${fecha} — ${nombre}${rol} — ${accion}${detalle}`,
        LEFT,
        doc.y,
        { width: WIDTH, align: "left" }
      );
    });
  }

  doc.moveDown(0.8);

  const confInspector = d.conformidadInspector?.ok
    ? `${fmtDateTime(d.conformidadInspector?.fecha)}`
    : "Pendiente";

  const confPerm = d.conformidadPermisionario?.ok
    ? `${fmtDateTime(d.conformidadPermisionario?.fecha)}`
    : "Pendiente";

  const confAdmin = d.conformidadAdminGeneral?.ok
    ? `${fmtDateTime(d.conformidadAdminGeneral?.fecha)}`
    : "Pendiente";

  bloqueTitulo("CONFORMIDADES");
  lineaDato("Inspector", confInspector);
  lineaDato("Permisionario", confPerm);
  lineaDato("Admin General", confAdmin);
}
// ─────────────────────────────
// ✅ PDF ANEXO_09
function renderAnexo09Pdf(
  doc,
  anexo,
  vivienda,
  signers = {},
  historial = []
) {
  const d = anexo.datos || {};

  const LEFT = 55;
  const WIDTH = 485;

  const permBase =
    d.permisionarioNombre || d.permisionario || d.postulanteNombre || "";
  const unidad = d.unidadHabitacional || vivienda?.codigo || "";
  const direccion =
    d.direccionUnidad || d.direccion || vivienda?.direccion || "";
  const localidad = d.localidad || vivienda?.barrio || "";
  const provincia = d.provincia || "";
  const inspectorNombreBase = d.inspectorNombre || "";

  // Firmantes (vienen armados en descargarPdf → signers09)
  const signerPerm = signers.permisionario || {};
  const signerInsp = signers.inspector || {};
  const signerAdmin = signers.admin || {};

  const permNombre = signerPerm.nombre || permBase || "";
  const permFechaTxt = signerPerm.fecha ? fmtDateTime(signerPerm.fecha) : "";
  const inspNombre = signerInsp.nombre || inspectorNombreBase || "";
  const inspFechaTxt = signerInsp.fecha ? fmtDateTime(signerInsp.fecha) : "";
  const adminNombre = signerAdmin.nombre || "";
  const adminFechaTxt = signerAdmin.fecha ? fmtDateTime(signerAdmin.fecha) : "";

  // Extras para ACTUACIONES (texto "Conforme / Revisión / Cierre" + fecha y hora)
  const permLineaExtra = permFechaTxt ? ` — Conforme: ${permFechaTxt}` : "";
  const inspLineaExtra = inspFechaTxt ? ` — Revisión: ${inspFechaTxt}` : "";
  const adminLineaExtra = adminFechaTxt ? ` — Cierre: ${adminFechaTxt}` : "";

  const lineaDato = (etiqueta, valor) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`${etiqueta}: `, LEFT, doc.y, { continued: true });
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(t(valor) || "..................................................");
  };

  const para = (text) => {
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(String(text || ""), LEFT, doc.y, {
        width: WIDTH,
        align: "justify",
      });
  };

  // ───────── Encabezado institucional ─────────
  doc.font("Helvetica").fontSize(10).text("R.G-6-002 PÚBLICO", LEFT);
  doc.moveDown(0.3);

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("ARMADA ARGENTINA", { align: "center" });
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("ACTA DE ENTREGA DE VIVIENDA FISCAL DE LA ARMADA", {
      align: "center",
    });
  doc.moveDown(0.1);
  doc
    .font("Helvetica")
    .fontSize(10)
    .text("(3.07., incs. 2., 3. y 5.; 5.09., inc. 2. y 5.16., inc. 3.)", {
      align: "center",
    });

  doc.moveDown(0.8);

  // ───────── Cabecera con datos de la vivienda ─────────
  lineaDato("PERMISIONARIO", permNombre);
  lineaDato("UNIDAD HABITACIONAL", unidad);
  lineaDato("DIRECCIÓN UNIDAD HABITACIONAL", direccion);
  lineaDato("LOCALIDAD", localidad);
  lineaDato("PROVINCIA", provincia);
  lineaDato("INSPECTOR", inspNombre);

  doc.moveDown(0.8);

  // ───────── Texto institucional ─────────
  para(
    "A los efectos de deslindar responsabilidades, el permisionario titular saliente tiene conocimiento de que quedan a su cargo las diferencias de novedades existentes entre las Actas de Recepción y Entrega de Vivienda Fiscal de la Armada, las que aparecieran al recibir el nuevo ocupante dentro de los cinco (5) días hábiles a contabilizarlos desde la entrega formal de la vivienda y todas aquellas que resulten como consecuencia de no haber dado cumplimiento a lo establecido en el Reglamento de Viviendas Fiscales de la Armada."
  );

  doc.moveDown(0.6);

  para(
    "A los fines de la formulación de los cargos que correspondieran, el próximo destino del permisionario será: ................................................................. cuyo teléfono es: ................................................................."
  );

  doc.moveDown(0.6);

  para(
    "El permisionario entrega la unidad habitacional al Inspector designado por el Organismo Administrador de la zona naval ................................., de acuerdo al Inventario General de la vivienda, al material, la documentación y las novedades que se detallan en la presente Acta de Entrega de Vivienda Fiscal de la Armada:"
  );

  doc.moveDown(0.8);

  // ───────── 1. Material ─────────
  doc.font("Helvetica-Bold").fontSize(11).text("1. Material:");
  doc.moveDown(0.3);

  const material = d.material || {};
  const xLabel = 55;
  const xValueSI = 380;
  const xValueNO = 440;
  let y = doc.y;

  const drawMaterialRow = (label, value) => {
    const val = yn(value);
    const si = val === "SI" ? "X" : "";
    const no = val === "NO" ? "X" : "";

    doc.font("Helvetica").fontSize(9).text(label, xLabel, y);

    doc.font("Helvetica").fontSize(9).text("SI", xValueSI, y);
    doc.rect(xValueSI + 15, y - 2, 10, 10).stroke();
    if (si) {
      doc.font("Helvetica").fontSize(9).text("X", xValueSI + 17, y - 1);
    }

    doc.font("Helvetica").fontSize(9).text("NO", xValueNO, y);
    doc.rect(xValueNO + 18, y - 2, 10, 10).stroke();
    if (no) {
      doc.font("Helvetica").fontSize(9).text("X", xValueNO + 20, y - 1);
    }

    y += 14;
  };

  drawMaterialRow(
    "Llaves de las puertas de entrada al edificio",
    material.llavesEdificio
  );
  drawMaterialRow(
    "Llaves de las puertas de entrada a la vivienda",
    material.llavesVivienda
  );
  drawMaterialRow(
    "Llaves de las puertas de entrada a la baulera",
    material.llavesBaulera
  );
  drawMaterialRow(
    "Llave de la puerta de acceso a la terraza",
    material.llaveTerraza
  );
  drawMaterialRow(
    "Llave de la puerta de acceso a la cochera",
    material.llaveCochera
  );
  drawMaterialRow(
    "Muebles, enseres y menaje según Inventario",
    material.inventarioMuebles
  );
  drawMaterialRow(
    "Línea telefónica funcionando",
    material.lineaTelefonica
  );

  doc.y = y + 8;

  // ───────── 2. Documentación ─────────
  doc.font("Helvetica-Bold").fontSize(11).text("2. Documentación:", LEFT);
  doc.moveDown(0.3);

  const docu = d.documentacion || {};
  y = doc.y;

  const drawDocRow = (label, value) => {
    const val = yn(value);
    const si = val === "SI" ? "X" : "";
    const no = val === "NO" ? "X" : "";

    doc.font("Helvetica").fontSize(9).text(label, xLabel, y);

    doc.font("Helvetica").fontSize(9).text("SI", xValueSI, y);
    doc.rect(xValueSI + 15, y - 2, 10, 10).stroke();
    if (si) {
      doc.font("Helvetica").fontSize(9).text("X", xValueSI + 17, y - 1);
    }

    doc.font("Helvetica").fontSize(9).text("NO", xValueNO, y);
    doc.rect(xValueNO + 18, y - 2, 10, 10).stroke();
    if (no) {
      doc.font("Helvetica").fontSize(9).text("X", xValueNO + 20, y - 1);
    }

    y += 14;
  };

  drawDocRow(
    "Copia del Reglamento de Viviendas Fiscales de la Armada",
    docu.reglamentoViviendas
  );
  drawDocRow("Guía telefónica", docu.guiaTelefonica);
  drawDocRow(
    "Copia del Reglamento de Copropiedad del edificio y/o barrio",
    docu.reglamentoCopropiedad
  );

  doc.y = y + 10;

  // ───────── 3. Lectura medidor ─────────
  doc.font("Helvetica-Bold").fontSize(11).text("3. Lectura medidor:", LEFT);
  doc.moveDown(0.3);

  const med = d.medidores || {};
  const mx = 55;
  const my = doc.y;

  doc.font("Helvetica").fontSize(9);
  doc.text(`GAS: ${t(med.gas_m3) || "___"} m³`, mx, my);
  doc.text(`AGUA: ${t(med.agua_m3) || "___"} m³`, mx + 170, my);
  doc.text(`LUZ: ${t(med.luz_kws) || "___"} Kws.`, mx, my + 14);
  doc.text(
    `TELÉFONO: ${t(med.telefono_pulsos) || "___"} pulsos`,
    mx + 170,
    my + 14
  );

  doc.moveDown(2);

  // ───────── Estado de sistemas y elementos ─────────
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("ESTADO DE SISTEMAS Y ELEMENTOS", LEFT);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      "Circular lo que corresponda MB (Muy Bueno) - B (Bueno) - R (Regular) - M (Malo).",
      { width: WIDTH, align: "left" }
    );

  doc.moveDown(0.5);

  const est = d.estadoSistemas || {};
  const items = [
    ["Agua", mbbrm(est.agua)],
    ["Cloacas", mbbrm(est.cloacas)],
    ["Electricidad", mbbrm(est.electricidad)],
    ["Gas", mbbrm(est.gas)],
    ["Pluviales", mbbrm(est.pluviales)],
    ["Teléfono", mbbrm(est.telefono)],
    ["Aberturas", mbbrm(est.aberturas)],
    ["Albañilería", mbbrm(est.albanileria)],
    ["Alfombras", mbbrm(est.alfombras)],
    ["Antena TV", mbbrm(est.antenaTv)],
    ["Calefactor / Estufa", mbbrm(est.calefactorEstufa)],
    ["Calefón / Termotanque", mbbrm(est.calefonTermotanque)],
    ["Carpintería", mbbrm(est.carpinteria)],
    ["Cerrajería", mbbrm(est.cerrajeria)],
    ["Cocina", mbbrm(est.cocina)],
    ["Desinfección", mbbrm(est.desinfeccion)],
    ["Herrajes", mbbrm(est.herrajes)],
    ["Limpieza", mbbrm(est.limpieza)],
    ["Lustrado", mbbrm(est.lustrado)],
    ["Parques y Jardines", mbbrm(est.parquesJardines)],
    ["Pintura", mbbrm(est.pintura)],
    ["Pisos", mbbrm(est.pisos)],
    ["Portero Eléctrico", mbbrm(est.porteroElectrico)],
    ["Sanitarios", mbbrm(est.sanitarios)],
    ["Vidrios", mbbrm(est.vidrios)],
    ["Estado General", mbbrm(est.estadoGeneral)],
  ];

  let startY = doc.y;
  const col1X = 55;
  const col2X = 320;
  const rowH = 14;

  // Si no entra en esta página, pasamos tabla completa a la siguiente
  const tableHeight = Math.ceil(items.length / 2) * rowH;
  const usableBottom =
    doc.page.height - doc.page.margins.bottom - 60;

  if (startY + tableHeight > usableBottom) {
    doc.addPage();
    startY = doc.y;
  }

  items.forEach(([label, val], idx) => {
    const isLeft = idx % 2 === 0;
    const x = isLeft ? col1X : col2X;
    const yRow = startY + Math.floor(idx / 2) * rowH;

    doc.font("Helvetica").fontSize(9).text(label, x, yRow);
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(val || "", x + 200, yRow, { width: 40, align: "center" });
    doc.rect(x + 196, yRow - 2, 48, 12).stroke();
  });

  doc.y = startY + tableHeight + 10;
  doc.x = LEFT;

  // ───────── Novedades ─────────
  doc.font("Helvetica-Bold").fontSize(11).text("NOVEDADES:");
  doc.moveDown(0.3);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(t(d.novedadesTexto || d.novedades || ""), {
      width: WIDTH,
      align: "left",
      height: 120,
    });

  // ───────── Segunda parte: cláusula + firmas ─────────
  const bottomSafe = doc.page.height - doc.page.margins.bottom - 100;
  if (doc.y > bottomSafe) {
    doc.addPage();
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(
      "ACTA DE ENTREGA DE VIVIENDA FISCAL DE LA ARMADA (continuación)",
      LEFT,
      doc.y,
      { width: WIDTH, align: "left" }
    );

  doc.moveDown(0.6);

  para(
    "Reparación, Mantenimiento y Entrega: Cumplir lo establecido en el “Reglamento de Viviendas Fiscales de la Armada”."
  );
  doc.moveDown(0.4);
  para("Para constancia se firman dos ejemplares de un mismo tenor.");

  doc.moveDown(0.8);

  const lugar = d.lugar || localidad || "";
  const fechaEntrega =
    d.fechaEntrega || anexo.createdAt || new Date().toISOString();
  const fechaEntregaTxt = fmtDateTime(fechaEntrega);

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(
      `Lugar y fecha: ${
        t(lugar) || "......................................................."
      } — ${fechaEntregaTxt || ""}`,
      LEFT
    );

  doc.moveDown(1.6);

  const yFirmas = doc.y;

  // Firma Permisionario
  doc
    .font("Helvetica")
    .fontSize(10)
    .text("....................................................", LEFT, yFirmas);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("Permisionario o Representante", LEFT, yFirmas + 12);

  if (permNombre || permFechaTxt) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(`${permNombre} — ${permFechaTxt}`, LEFT, yFirmas + 24);
  }

  // Firma Inspector
  const xInsp = LEFT + 220;
  doc
    .font("Helvetica")
    .fontSize(10)
    .text("....................................................", xInsp, yFirmas);
  doc.font("Helvetica").fontSize(9).text("Inspector", xInsp, yFirmas + 12);

  if (inspNombre || inspFechaTxt) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(`${inspNombre} — ${inspFechaTxt}`, xInsp, yFirmas + 24);
  }

  // Firma Jefe Organismo Administrador
  const yAdmin = yFirmas + 64;
  doc
    .font("Helvetica")
    .fontSize(10)
    .text("....................................................", LEFT, yAdmin);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("Jefe Organismo Administrador", LEFT, yAdmin + 12);

  if (adminNombre || adminFechaTxt) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(`${adminNombre} — ${adminFechaTxt}`, LEFT, yAdmin + 24);
  }

  // Mensaje institucional si cerró CON NOVEDADES
  if (up(anexo.estadoInstitucional) === "CON_NOVEDADES") {
    doc.moveDown(1.2);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("TRÁMITE CERRADO CON NOVEDADES", { align: "center" });
  }

  // ───────── ACTUACIONES (permisionario / inspector / admin general) ─────────
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(11).text("ACTUACIONES");
  doc.moveDown(0.4);

  const actLinea = (titulo, nombre, extra) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`${titulo}: `, LEFT, doc.y, { continued: true });
    doc
      .font("Helvetica")
      .fontSize(10)
      .text((nombre ? nombre : "—") + (extra ? extra : ""));
  };

  actLinea("Permisionario", permNombre, permLineaExtra);
  actLinea("Inspector de barrio", inspNombre, inspLineaExtra);
  actLinea("Jefe órgano administrador", adminNombre, adminLineaExtra);

  // Historial de intervenciones al pie (mismo helper que ANEXO_03)
  drawHistorialIntervenciones(doc, historial);
}
// ─────────────────────────────
// ✅ PDF ANEXO_11 — FORMULARIO DE PEDIDO DE TRABAJO
function renderAnexo11Pdf(
  doc,
  anexo,
  vivienda,
  signers = {},
  historial = []
) {
  const d = anexo?.datos || {};

  const LEFT = 55;
  const WIDTH = 485;

  const numero = d.numeroPedidoTrabajo || d.numero || "";
  const ambito = d.ambito || "";
  const viviendaLabel =
    d.viviendaLabel ||
    d.unidadHabitacional ||
    d.casa ||
    d.viviendaCodigo ||
    (vivienda ? String(vivienda.codigo || vivienda.direccion || "") : "") ||
    (ambito === "ESPACIO_COMUN" ? "ESPACIO COMÚN" : "");

  const barrio =
    d.viviendaBarrio ||
    d.barrio ||
    (vivienda ? String(vivienda.barrio || "") : "") ||
    "";

  const permNombre =
    d.permisionarioNombre ||
    d.postulanteNombre ||
    d.permisionario ||
    signers?.permisionario?.nombre ||
    "";

  const prioridad = d.prioridadInspector || d.prioridad || "";
  const promotorNombre = d.promotorNombre || "";
  const promotorRol = d.promotorRol || d.promotorTipo || "";

  const solicitud =
    d.tipoSolicitud ||
    d.solicitudDetalle ||
    "";

  const descripcion =
    d.detallePedido ||
    d.descripcionTrabajo ||
    d.detalleTrabajo ||
    d.descripcion ||
    d.solicitudDetalle ||
    "";

  const decisionInspector = d.decisionInspector || "";
  const responsableTrabajo = d.responsableTrabajo || "";
  const fechaProgramadaObra = d.fechaProgramadaObra || "";
  const descripcionTecnicaObra = d.descripcionTecnicaObra || "";
  const trabajoFinalizadoInspector = d.trabajoFinalizadoInspector ? "SI" : "NO";
  const fechaFinalizacionInspector = d.fechaFinalizacionInspector || "";
  const observacionFinalInspector = d.observacionFinalInspector || "";

  const obsInspector = d.observacionesInspector || "";
  const obsAdmin = d.observacionesAdminGeneral || d.resolucionAdmin || "";
  const resolucionAdminGeneral = d.resolucionAdminGeneral || "";
  const fechaCierreAdminGeneral = d.fechaCierreAdminGeneral || "";
  const cerradoPorAdminGeneralNombre = d.cerradoPorAdminGeneralNombre || "";

  const visitas = Array.isArray(d.visitasProgramadas)
    ? d.visitasProgramadas
    : [];

  const obsInspectorHist = Array.isArray(d.observacionesInspectorHistorial)
    ? d.observacionesInspectorHistorial
    : [];

  const obsAdminHist = Array.isArray(d.observacionesAdminGeneralHistorial)
    ? d.observacionesAdminGeneralHistorial
    : [];

  const fechaDoc = anexo?.createdAt || new Date();
  const fechaDocTxt = fmtDate(fechaDoc);

  const signerPerm = signers.permisionario || {};
  const signerInsp = signers.inspector || {};
  const signerAdmin = signers.admin || {};

  function safeText(v, fallback = "—") {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s || fallback;
  }

  function prettyActorName(v, fallback = "Interviniente") {
    const s = String(v || "").trim();
    if (!s) return fallback;

    const upper = s.toUpperCase();
    if (upper === "ADMIN_GENERAL") return "ADMIN GENERAL";
    if (upper === "ADMIN") return "ADMIN";
    if (upper === "JEFE_DE_BARRIO") return "JEFE DE BARRIO";
    if (upper === "INSPECTOR") return "INSPECTOR";
    if (upper === "PERMISIONARIO") return "PERMISIONARIO";
    if (upper === "SISTEMA") return "Sistema";

    if (/^[0-9a-fA-F]{24}$/.test(s)) return fallback;
    return s;
  }

  function signerDisplayName(signer, fallback) {
    return (
      signer?.nombre ||
      signer?.apellidoNombre ||
      signer?.displayName ||
      fallback
    );
  }

  function signerDisplayRole(signer, fallback) {
    return prettyActorName(signer?.rol || signer?.role, fallback);
  }

  function getLastFechaFromArray(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return "";
    const sorted = [...arr].sort((a, b) => {
      const ta = a?.fecha ? new Date(a.fecha).getTime() : 0;
      const tb = b?.fecha ? new Date(b.fecha).getTime() : 0;
      return tb - ta;
    });
    return sorted[0]?.fecha || "";
  }

  function getLastMeaningfulInspectorFecha() {
    return (
      signerInsp?.fecha ||
      fechaFinalizacionInspector ||
      getLastFechaFromArray(obsInspectorHist) ||
      d?.conformidadInspector?.fecha ||
      ""
    );
  }

  function getLastMeaningfulInspectorDetalle() {
    if (fechaFinalizacionInspector) {
      return `Última intervención digital: ${fmtDateTime(fechaFinalizacionInspector)} — Final de obra registrada`;
    }
    const lastHistFecha = getLastFechaFromArray(obsInspectorHist);
    if (lastHistFecha) {
      return `Última intervención digital: ${fmtDateTime(lastHistFecha)}`;
    }
    if (d?.conformidadInspector?.fecha) {
      return `Intervención digital registrada: ${fmtDateTime(d.conformidadInspector.fecha)}`;
    }
    return "Sin intervención digital registrada";
  }

  function getLastMeaningfulPermFecha() {
    return signerPerm?.fecha || d?.conformidadPermisionario?.fecha || "";
  }

  function getLastMeaningfulPermDetalle() {
    const fecha = getLastMeaningfulPermFecha();
    return fecha
      ? `Conformidad digital registrada: ${fmtDateTime(fecha)}`
      : "Sin conformidad digital registrada";
  }

  function getLastMeaningfulAdminFecha() {
    return (
      signerAdmin?.fecha ||
      fechaCierreAdminGeneral ||
      d?.devueltoAInspector?.fecha ||
      getLastFechaFromArray(obsAdminHist) ||
      ""
    );
  }

  function getLastMeaningfulAdminDetalle() {
    if (fechaCierreAdminGeneral) {
      return `Intervención digital registrada: ${fmtDateTime(fechaCierreAdminGeneral)} — Cierre administrativo`;
    }
    if (d?.devueltoAInspector?.fecha) {
      return `Intervención digital registrada: ${fmtDateTime(d.devueltoAInspector.fecha)} — Devolución al inspector`;
    }
    const lastAdminFecha = getLastFechaFromArray(obsAdminHist);
    if (lastAdminFecha) {
      return `Intervención digital registrada: ${fmtDateTime(lastAdminFecha)}`;
    }
    return "Sin intervención digital registrada";
  }

  const permNombreAct = signerDisplayName(
    signerPerm,
    permNombre || "Permisionario no identificado"
  );
  const inspNombreAct = signerDisplayName(
    signerInsp,
    d.inspectorNombre || "Inspector de barrio"
  );
  const adminNombreAct = signerDisplayName(
    signerAdmin,
    cerradoPorAdminGeneralNombre || "Jefe órgano administrador"
  );

  const permRolAct = signerDisplayRole(signerPerm, "PERMISIONARIO");
  const inspRolAct = signerDisplayRole(signerInsp, "INSPECTOR");
  const adminRolAct = signerDisplayRole(signerAdmin, "ADMIN GENERAL");

  const permLineaExtra = getLastMeaningfulPermDetalle();
  const inspLineaExtra = getLastMeaningfulInspectorDetalle();
  const adminLineaExtra = getLastMeaningfulAdminDetalle();

  function linea(label, valor) {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(label + ": ", { continued: true });
    doc.font("Helvetica").fontSize(10).text(valor || "—");
  }

  function bloqueTexto(titulo, texto) {
    doc.font("Helvetica-Bold").fontSize(11).text(titulo);
    doc.moveDown(0.2);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(texto || "—", { width: WIDTH, align: "justify" });
    doc.moveDown(0.6);
  }

  function ensureSpace(lines = 6) {
    const needed = lines * 14;
    if (doc.y + needed > doc.page.height - 70) {
      doc.addPage();
    }
  }

  function textoVisita(v) {
    const fecha = v?.fechaProgramada ? fmtDateTime(v.fechaProgramada) : "—";
    const obs = v?.observacion || "—";
    return `${fecha} — ${obs}`;
  }

  const firmaBoxW = 155;
  const firmaPad = 8;
  const firmaGap = 4;

  function measureFirmaDigitalBlock(titulo, nombre, rol, detalle) {
    const contentW = firmaBoxW - firmaPad * 2;
    const tituloTxt = safeText(titulo);
    const nombreTxt = `Nombre: ${safeText(nombre)}`;
    const rolTxt = `Rol: ${safeText(rol)}`;
    const detalleTxt = safeText(detalle);

    const titleH = doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .heightOfString(tituloTxt, { width: contentW });
    const nombreH = doc
      .font("Helvetica")
      .fontSize(9)
      .heightOfString(nombreTxt, { width: contentW });
    const rolH = doc
      .font("Helvetica")
      .fontSize(9)
      .heightOfString(rolTxt, { width: contentW });
    const detalleH = doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .heightOfString(detalleTxt, { width: contentW });

    return Math.max(
      58,
      firmaPad * 2 + titleH + nombreH + rolH + detalleH + firmaGap * 3
    );
  }

  function drawFirmaDigitalBlock(titulo, nombre, rol, detalle, x, y, boxH) {
    const contentX = x + firmaPad;
    const contentW = firmaBoxW - firmaPad * 2;
    let cursorY = y + firmaPad;

    const tituloTxt = safeText(titulo);
    const nombreTxt = `Nombre: ${safeText(nombre)}`;
    const rolTxt = `Rol: ${safeText(rol)}`;
    const detalleTxt = safeText(detalle);

    doc
      .roundedRect(x, y, firmaBoxW, boxH, 6)
      .lineWidth(0.8)
      .strokeColor("#999")
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("black")
      .text(tituloTxt, contentX, cursorY, {
        width: contentW,
        align: "left",
      });
    cursorY += doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .heightOfString(tituloTxt, { width: contentW }) + firmaGap;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(nombreTxt, contentX, cursorY, {
        width: contentW,
      });
    cursorY += doc
      .font("Helvetica")
      .fontSize(9)
      .heightOfString(nombreTxt, { width: contentW }) + firmaGap;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("black")
      .text(rolTxt, contentX, cursorY, {
        width: contentW,
      });
    cursorY += doc
      .font("Helvetica")
      .fontSize(9)
      .heightOfString(rolTxt, { width: contentW }) + firmaGap;

    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .fillColor("black")
      .text(detalleTxt, contentX, cursorY, {
        width: contentW,
      });
  }

  // Encabezado institucional básico
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("FORMULARIO DE PEDIDO DE TRABAJO", { align: "center" });
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(10).text("ANEXO 11", {
    align: "center",
  });
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(9).text(
    "(4.05., inc. 1. y 7.04., inc. 10.)",
    {
      align: "center",
    }
  );
  doc.moveDown(0.8);

  // Datos principales
  linea("Nº", numero ? `Nº ${numero}` : "—");
  linea("Fecha", fechaDocTxt);
  linea("Ámbito", ambito || "VIVIENDA");
  linea("Vivienda / Espacio", viviendaLabel);
  if (barrio) linea("Barrio", barrio);
  linea("Permisionario", permNombre || "—");
  linea("Promotor", promotorNombre || "—");
  linea("Rol del promotor", promotorRol || "—");
  linea("Prioridad", prioridad || "—");
  if (solicitud) linea("Solicitud", solicitud);

  doc.moveDown(0.6);

  // Detalle del pedido
  bloqueTexto("Detalle del pedido:", descripcion || "—");

  // Intervención del inspector
  ensureSpace(8);
  doc.font("Helvetica-Bold").fontSize(11).text("Intervención del inspector:");
  doc.moveDown(0.2);
  linea("Decisión", decisionInspector || "—");
  linea("Responsable del trabajo", responsableTrabajo || "—");
  if (fechaProgramadaObra) {
    linea("Fecha programada de obra", fmtDateTime(fechaProgramadaObra));
  }
  if (descripcionTecnicaObra) {
    bloqueTexto("Descripción técnica de obra:", descripcionTecnicaObra);
  } else {
    doc.moveDown(0.4);
  }
  bloqueTexto("Observaciones del inspector:", obsInspector || "—");

  // Visitas programadas
  ensureSpace(8);
  doc.font("Helvetica-Bold").fontSize(11).text("Visitas programadas:");
  doc.moveDown(0.3);

  if (visitas.length === 0) {
    doc.font("Helvetica").fontSize(10).text("No hay visitas registradas.", LEFT);
    doc.moveDown(0.6);
  } else {
    visitas.forEach((v, idx) => {
      ensureSpace(3);
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(`${idx + 1}. ${textoVisita(v)}`, LEFT, doc.y, {
          width: WIDTH,
          align: "left",
        });
      doc.moveDown(0.2);
    });
    doc.moveDown(0.4);
  }

  // Final de obra
  ensureSpace(8);
  doc.font("Helvetica-Bold").fontSize(11).text("Final de obra:");
  doc.moveDown(0.2);
  linea("Trabajo finalizado por inspector", trabajoFinalizadoInspector);
  linea(
    "Fecha de finalización",
    fechaFinalizacionInspector ? fmtDateTime(fechaFinalizacionInspector) : "—"
  );
  bloqueTexto(
    "Observación final del inspector:",
    observacionFinalInspector || "—"
  );

  // Intervención administrativa
  ensureSpace(8);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Intervención del Jefe del órgano administrador:");
  doc.moveDown(0.2);
  linea("Resolución ADMIN GENERAL", resolucionAdminGeneral || "—");
  linea(
    "Fecha de cierre",
    fechaCierreAdminGeneral ? fmtDateTime(fechaCierreAdminGeneral) : "—"
  );
  linea(
    "Cerrado por",
    cerradoPorAdminGeneralNombre || adminNombreAct || "—"
  );
  bloqueTexto("Observaciones administrativas:", obsAdmin || "—");

  // Actuaciones resumidas
  const firmaCards = [
    {
      titulo: "PERMISIONARIO",
      nombre: permNombreAct,
      rol: permRolAct,
      detalle: permLineaExtra,
      x: LEFT,
    },
    {
      titulo: "INSPECTOR DE BARRIO",
      nombre: inspNombreAct,
      rol: inspRolAct,
      detalle: inspLineaExtra,
      x: LEFT + 165,
    },
    {
      titulo: "ADMIN GENERAL",
      nombre: adminNombreAct,
      rol: adminRolAct,
      detalle: adminLineaExtra,
      x: LEFT + 330,
    },
  ];
  const maxFirmaCardHeight = Math.max(
    ...firmaCards.map((card) =>
      measureFirmaDigitalBlock(card.titulo, card.nombre, card.rol, card.detalle)
    )
  );

  ensureSpace(Math.ceil((maxFirmaCardHeight + 42) / 14));
  doc.font("Helvetica-Bold").fontSize(11).text("ACTUACIONES / CONSTANCIA DIGITAL:");
  doc.moveDown(0.4);

  const yStartFirmas = doc.y;

  firmaCards.forEach((card) => {
    drawFirmaDigitalBlock(
      card.titulo,
      card.nombre,
      card.rol,
      card.detalle,
      card.x,
      yStartFirmas,
      maxFirmaCardHeight
    );
  });

  doc.y = yStartFirmas + maxFirmaCardHeight + 14;

  // Historial específico ANEXO_11
  ensureSpace(10);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Intervenciones registradas del trámite:");
  doc.moveDown(0.3);

  const items = [];

  // Observaciones inspector historial
  for (const o of obsInspectorHist) {
    items.push({
      fecha: o?.fecha,
      actor: `${inspRolAct} (${inspNombreAct})`,
      tipo: "OBSERVACIÓN",
      texto: o?.texto || "Observación del inspector",
    });
  }

  // Visitas
  for (const v of visitas) {
    items.push({
      fecha: v?.creadoAt || v?.fechaRegistro || v?.fechaProgramada,
      actor: `${inspRolAct} (${inspNombreAct})`,
      tipo: "VISITA PROGRAMADA",
      texto: textoVisita(v),
    });
  }

  // Observaciones admin historial
  for (const o of obsAdminHist) {
    items.push({
      fecha: o?.fecha,
      actor: `${adminRolAct} (${adminNombreAct})`,
      tipo: "OBSERVACIÓN ADMINISTRATIVA",
      texto: o?.texto || "Observación administrativa",
    });
  }

  // Decisión inspector
  if (decisionInspector) {
    items.push({
      fecha: anexo?.updatedAt || anexo?.createdAt,
      actor: `${inspRolAct} (${inspNombreAct})`,
      tipo: "DECISIÓN",
      texto: decisionInspector,
    });
  }

  // Responsable trabajo
  if (responsableTrabajo) {
    items.push({
      fecha: anexo?.updatedAt || anexo?.createdAt,
      actor: `${inspRolAct} (${inspNombreAct})`,
      tipo: "RESPONSABLE DEL TRABAJO",
      texto: responsableTrabajo,
    });
  }

  // Final de obra
  if (fechaFinalizacionInspector || observacionFinalInspector) {
    items.push({
      fecha: fechaFinalizacionInspector || anexo?.updatedAt || anexo?.createdAt,
      actor: `${inspRolAct} (${inspNombreAct})`,
      tipo: "FINAL DE OBRA",
      texto: observacionFinalInspector || "Trabajo finalizado por inspector",
    });
  }

  // Cierre admin
  if (resolucionAdminGeneral || fechaCierreAdminGeneral) {
    items.push({
      fecha: fechaCierreAdminGeneral || anexo?.updatedAt || anexo?.createdAt,
      actor: `${adminRolAct} (${adminNombreAct})`,
      tipo: "CIERRE ADMIN GENERAL",
      texto: resolucionAdminGeneral || "CERRADO",
    });
  }

  // Conformidad permisionario
  if (getLastMeaningfulPermFecha()) {
    items.push({
      fecha: getLastMeaningfulPermFecha(),
      actor: `${permRolAct} (${permNombreAct})`,
      tipo: "CONFORMIDAD",
      texto: "Conformidad digital registrada",
    });
  }

  items.sort((a, b) => {
    const ta = a?.fecha ? new Date(a.fecha).getTime() : 0;
    const tb = b?.fecha ? new Date(b.fecha).getTime() : 0;
    return ta - tb;
  });

  if (items.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .text("No hay intervenciones específicas registradas.", LEFT);
    doc.moveDown(0.6);
  } else {
    items.forEach((item, idx) => {
      ensureSpace(4);
      const fechaTxt = item.fecha ? fmtDateTime(item.fecha) : "—";

      doc
        .font("Helvetica")
        .fontSize(10)
        .text(
          `${idx + 1}. ${fechaTxt} — ${safeText(item.actor)} — ${safeText(item.tipo)} — ${safeText(item.texto)}`,
          LEFT,
          doc.y,
          {
            width: WIDTH,
            align: "left",
          }
        );
      doc.moveDown(0.25);
    });
    doc.moveDown(0.6);
  }

  // Historial institucional general
  if (Array.isArray(historial) && historial.length > 0) {
    ensureSpace(8);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Registro institucional complementario:");
    doc.moveDown(0.3);

    historial.forEach((h, idx) => {
      ensureSpace(3);
      const fechaTxt = h?.fecha ? fmtDateTime(h.fecha) : "—";
      const actorTxt = prettyActorName(
        h?.nombre || h?.actor || h?.realizadoPor || h?.usuario,
        "Sistema"
      );
      const tipoTxt = safeText(h?.tipo || "REGISTRO");
      const textoTxt = safeText(
        h?.texto ||
          h?.observacion ||
          `${safeText(h?.estadoAnterior, "")} → ${safeText(h?.estadoNuevo, "")}`.trim() ||
          "Sin detalle"
      );

      doc
        .font("Helvetica")
        .fontSize(10)
        .text(
          `${idx + 1}. ${fechaTxt} — ${actorTxt} — ${tipoTxt} — ${textoTxt}`,
          LEFT,
          doc.y,
          {
            width: WIDTH,
            align: "left",
          }
        );
      doc.moveDown(0.2);
    });
  }

  doc.moveDown(0.5);
}

  // Historial de intervenciones institucionales general drawHistorialIntervenciones(doc, historial);

// ✅ Reemplazá COMPLETA esta función en formularioController.js
// - No imprime "Respaldo técnico (JSON)"
// - Usa claves reales del ANEXO_01 (las que ya estás guardando)
// - Agrega firma + aclaración + fecha y hora (createdAt)

function renderAnexo01Pdf(doc, anexo) {
  const d = anexo?.datos && typeof anexo.datos === "object" ? anexo.datos : {};

  const safe = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).trim();
    return s;
  };

  const show = (v) => (safe(v) ? safe(v) : "—");

  const yn = (v) => {
    if (v === true) return "SI";
    if (v === false) return "NO";
    const s = String(v || "").trim().toUpperCase();
    if (s === "SI" || s === "SÍ") return "SI";
    if (s === "NO") return "NO";
    return "—";
  };

  const fmtDate = (dt) => {
    try {
      return dt ? new Date(dt).toLocaleDateString("es-AR") : "—";
    } catch {
      return "—";
    }
  };

  const fmtDateTime = (dt) => {
    try {
      return dt ? new Date(dt).toLocaleString("es-AR") : "—";
    } catch {
      return "—";
    }
  };

  const row2 = (label, value) => {
    doc.font("Helvetica-Bold").fontSize(10).text(label, { continued: true, width: 220 });
    doc.font("Helvetica").fontSize(10).text(show(value));
    doc.moveDown(0.2);
  };

  // ===== Encabezado institucional =====
  doc.font("Helvetica-Bold").fontSize(12).text("ARMADA ARGENTINA", { align: "left" });
  doc.font("Helvetica").fontSize(9).text("R.G-6-002 — PÚBLICO", { align: "right" });
  doc.moveDown(0.4);

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("ANEXO 01 — FORMULARIO DE INSCRIPCIÓN PARA OCUPAR VIVIENDA FISCAL", {
      align: "center",
    });
  doc.font("Helvetica").fontSize(10).text("DECLARACIÓN JURADA DE POSTULACIÓN", { align: "center" });
  doc.moveDown(0.8);

  // Metadata del sistema (útil e institucional)
  doc.font("Helvetica").fontSize(10);
  doc.text(`ID: ${show(anexo?._id)}`);
  doc.text(`Estado: ${show(anexo?.estado)}`);
  doc.text(`Fecha y hora de carga: ${fmtDateTime(anexo?.createdAt)}`);
  doc.moveDown(0.8);

  // ===== 1) Datos iniciales =====
  doc.font("Helvetica-Bold").fontSize(11).text("1. Datos iniciales");
  doc.moveDown(0.5);

  row2("Lugar:", d.lugar);
  row2("Fecha:", d.fechaLugar);
  row2("Autoridad de Asignación:", d.autoridadAsignacion);
  row2("Zona Naval:", d.zonaNaval);
  row2("Tipo de solicitud:", d.tipoSolicitud);
  row2("Acepta reglamento:", yn(d.aceptaReglamento));

  doc.moveDown(0.8);

  // ===== 2) Mis datos personales =====
  doc.font("Helvetica-Bold").fontSize(11).text("2. Mis datos personales");
  doc.moveDown(0.5);

  row2("MR:", d.mr);
  row2("N° Afiliado OSFA:", d.afiliadoOSFA);
  row2("Grado y escalafón:", d.gradoEscalafon);
  row2("Apellido:", d.apellido);
  row2("Nombres:", d.nombres);

  doc.moveDown(0.2);
  row2("Destino actual:", d.destinoActual);
  row2("Destino futuro:", d.destinoFuturo);

  doc.moveDown(0.2);
  row2("Teléfono actual:", d.telefonoActual);
  row2("Teléfono futuro:", d.telefonoFuturo);

  doc.moveDown(0.2);
  row2("Fecha último ascenso:", d.fechaUltimoAscenso);
  row2("Años de servicio (recibo):", d.aniosServicioRecibo);

  doc.moveDown(0.8);

  // ===== 3) Grupo conviviente =====
  doc.font("Helvetica-Bold").fontSize(11).text("3. Grupo conviviente");
  doc.moveDown(0.5);

  const convivientes = Array.isArray(d.convivientes) ? d.convivientes : [];
  if (convivientes.length === 0) {
    doc.font("Helvetica").fontSize(10).text("(Sin datos)");
  } else {
    convivientes.forEach((c, i) => {
      const nombre = safe(c?.apellidoNombres);
      const relacion = safe(c?.relacion || c?.parentesco);
      const edad = safe(c?.edad);
      const dni = safe(c?.dni);
      const aCargo = safe(c?.aCargo);

      doc
        .font("Helvetica")
        .fontSize(10)
        .text(
          `${i + 1}. ${nombre || "—"} | Relación: ${relacion || "—"} | Edad: ${edad || "—"} | DNI: ${dni || "—"} | A cargo: ${aCargo || "—"}`
        );
    });
  }

  doc.moveDown(0.8);

  // ===== 4) Mascotas =====
  doc.font("Helvetica-Bold").fontSize(11).text("4. Mascotas");
  doc.moveDown(0.5);

  const mascotas = Array.isArray(d.mascotas) ? d.mascotas : [];
  if (mascotas.length === 0) {
    doc.font("Helvetica").fontSize(10).text("(Sin datos)");
  } else {
    mascotas.forEach((m, i) => {
      const especie = safe(m?.especie);
      const raza = safe(m?.raza);
      const sexo = safe(m?.sexo);
      const edad = safe(m?.edad);
      const peso = safe(m?.peso);

      doc
        .font("Helvetica")
        .fontSize(10)
        .text(
          `${i + 1}. Especie: ${especie || "—"} | Raza: ${raza || "—"} | Sexo: ${sexo || "—"} | Edad: ${edad || "—"} | Peso: ${peso || "—"}`
        );
    });
  }

  doc.moveDown(0.8);

  // ===== 5) Propiedades =====
  doc.font("Helvetica-Bold").fontSize(11).text("5. Propiedades");
  doc.moveDown(0.5);

  row2("Tiene propiedades en zona:", d.tienePropiedadesZona);

  const propiedades = Array.isArray(d.propiedades) ? d.propiedades : [];
  if (propiedades.length === 0) {
    doc.font("Helvetica").fontSize(10).text("(Sin datos)");
  } else {
    propiedades.forEach((p, i) => {
      const dir = safe(p?.direccion);
      const obs = safe(p?.observaciones);
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(`${i + 1}. Dirección: ${dir || "—"} | Observaciones: ${obs || "—"}`);
    });
  }

  doc.moveDown(0.8);

  // ===== Adjuntos (si existieran) =====
  doc.font("Helvetica-Bold").fontSize(11).text("Adjuntos");
  doc.moveDown(0.5);

  const adj = Array.isArray(anexo?.adjuntos) ? anexo.adjuntos : [];
  if (adj.length === 0) {
    doc.font("Helvetica").fontSize(10).text("(Sin adjuntos)");
  } else {
    adj.forEach((a) => {
      const name =
        a && typeof a === "object"
          ? safe(a.originalname || a.filename || a.path || "archivo")
          : safe(a);
      doc.font("Helvetica").fontSize(10).text(`- ${name || "archivo"}`);
    });
  }

  doc.moveDown(1);

  // ===== Firmas =====
  const solicitante = `${safe(d.apellido)} ${safe(d.nombres)}`.trim();

  doc.font("Helvetica-Bold").fontSize(11).text("Firma:");
  doc.moveDown(0.6);

  doc.text(`Postulante: ${solicitante || "_________________________________________"}`);
  doc.moveDown(0.4);
  doc.text(`Fecha: ${fmtDate(anexo?.createdAt)}`);
doc.moveDown(0.2);
doc.text(`Hora: ${anexo?.createdAt ? new Date(anexo.createdAt).toLocaleTimeString("es-AR") : "—"}`);
doc.moveDown(0.6);
}

// ─────────────────────────────
// PDF ANEXO_04 (versión legible)
function renderAnexo04Pdf(doc, anexo, vivienda, signers, historial) {
  const d = (anexo && anexo.datos) || {};
  const repE = d.representanteEmergencia || {};
  const repO = d.representanteOrganismo || {};

  doc.fontSize(16).text("ANEXO 04 — Aviso de ausencia prolongada", { align: "center" });
  doc.moveDown(0.6);

  doc.fontSize(11);
  doc.text(`Estado: ${String(anexo.estado || "")}`);
  doc.text(`Fecha: ${anexo.createdAt ? new Date(anexo.createdAt).toLocaleString() : ""}`);
  doc.moveDown(0.4);

  doc.fontSize(12).text("Datos del trámite", { underline: true });
  doc.fontSize(11);
  doc.text(`Permisionario: ${String(d.permisionarioNombre || "")}`);
  doc.text(`Barrio: ${String(d.barrioAsignado || d.barrio || "")}`);
  if (d.unidadHabitacional) doc.text(`Unidad habitacional: ${String(d.unidadHabitacional)}`);
  if (d.direccionUnidad) doc.text(`Dirección unidad: ${String(d.direccionUnidad)}`);
  if (d.permisionarioGrado) doc.text(`Grado/Jerarquía: ${String(d.permisionarioGrado)}`);
  if (d.permisionarioMR) doc.text(`MR/Destino: ${String(d.permisionarioMR)}`);
  if (d.permisionarioDomicilio) doc.text(`Domicilio: ${String(d.permisionarioDomicilio)}`);
  if (d.permisionarioTelefono) doc.text(`Teléfono: ${String(d.permisionarioTelefono)}`);
  doc.moveDown(0.5);

  doc.fontSize(12).text("Período de ausencia", { underline: true });
  doc.fontSize(11);
  const desde = d.periodoDesdeISO || d.periodoDesde || "";
  const hasta = d.periodoHastaISO || d.periodoHasta || "";
  doc.text(`Desde: ${desde ? new Date(String(desde)).toLocaleDateString() : ""}`);
  doc.text(`Hasta: ${hasta ? new Date(String(hasta)).toLocaleDateString() : ""}`);
  doc.text(`Motivo: ${String(d.motivo || "")}`);
  doc.moveDown(0.5);

  doc.fontSize(12).text("Representante en caso de emergencia", { underline: true });
  doc.fontSize(11);
  doc.text(`Apellido y nombres: ${String(repE.apellidoNombres || repE.nombreCompleto || "")}`);
  doc.text(`Parentesco: ${String(repE.parentesco || "")}`);
  doc.text(`Domicilio: ${String(repE.domicilio || "")}`);
  doc.text(`Teléfono: ${String(repE.telefono || "")}`);
  doc.text(`Destino: ${String(repE.destino || "")}`);
  doc.text(`Teléfono destino: ${String(repE.telefonoDestino || "")}`);
  doc.moveDown(0.5);

  doc.fontSize(12).text("Representante del organismo", { underline: true });
  doc.fontSize(11);
  doc.text(`Apellido y nombres: ${String(repO.apellidoNombres || repO.nombreCompleto || "")}`);
  doc.text(`Cargo/Función: ${String(repO.cargo || "")}`);
  doc.text(`Destino/Oficina: ${String(repO.destino || repO.oficina || "")}`);
  doc.text(`Teléfono: ${String(repO.telefono || "")}`);
  doc.moveDown(0.6);

  doc.fontSize(12).text("Intervención institucional", { underline: true });
  doc.fontSize(11);
  doc.text(`Observaciones JEFE DE BARRIO: ${String(d.observacionesJefeBarrio || "")}`);

  if (d.conformidadJefeBarrio?.ok) {
    const f = d.conformidadJefeBarrio.fecha ? new Date(d.conformidadJefeBarrio.fecha).toLocaleString() : "";
    doc.text(`Conformidad JEFE DE BARRIO: SI ${f ? "(" + f + ")" : ""}`);
  } else {
    doc.text("Conformidad JEFE DE BARRIO: NO");
  }

  doc.moveDown(0.6);

  if (Array.isArray(historial) && historial.length) {
    doc.fontSize(10).text("Registro (trazabilidad):", { underline: true });
    historial.slice(-12).forEach((h) => {
      const f = h?.fecha ? new Date(h.fecha).toLocaleString() : "";
      const obs = String(h?.observacion || "");
      doc.text(`- ${f} — ${obs}`);
    });
  }


  // Firmas (si existen)
  if (signers && typeof signers === "object") {
    doc.moveDown(1);
    doc.fontSize(12).text("Firmas", { underline: true });
    doc.fontSize(11);

    const line = (label, obj) => {
      const n = String(obj?.nombre || "").trim();
      const f = obj?.fecha ? new Date(obj.fecha).toLocaleString() : "";
      if (!n) return;
      doc.text(`${label}: ${n}${f ? " (" + f + ")" : ""}`);
    };

    line("PERMISIONARIO", signers.permisionario);
    line("JEFE DE BARRIO", signers.jefe);
    line("INSPECTOR", signers.inspector);
    line("ADMIN GENERAL", signers.admin);
  }

}


// ─────────────────────────────
// GET PDF
async function descargarPdf(req, res) {
  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);

    const { id } = req.params;
    if (!isObjectId(id)) return genericDenied(res);

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo) return genericDenied(res);

    const roleUp = up(user.role);
    const codigoUp = up(anexo.codigo);

    // ─────────────────────────────
    // 🔐 REGLA INSTITUCIONAL POSTULANTE
    // Solo puede descargar sus ANEXO_01 y ANEXO_02
    if (roleUp === "POSTULANTE") {
      const allowed = ["ANEXO_01", "ANEXO_02"];

      if (!allowed.includes(codigoUp)) {
        return genericDenied(res);
      }

      const esPropio =
        String(anexo.usuario) === String(user._id) ||
        (codigoUp === "ANEXO_02" &&
          String(anexo?.datos?.postulanteId) === String(user._id));

      if (!esPropio) {
        return genericDenied(res);
      }
    } else {
      // Resto de roles: lógica normal
      if (!canSeeSubmission(user, anexo)) {
        return genericDenied(res);
      }
    }

    // ─────────────────────────────
    // Vivienda desde datos.viviendaId
    const viviendaId =
      anexo?.datos?.viviendaId && isObjectId(anexo.datos.viviendaId)
        ? anexo.datos.viviendaId
        : null;

    const vivienda = viviendaId
      ? await Vivienda.findById(viviendaId).lean()
      : null;

    // ─────────────────────────────
    // ANEXO_01 derivado (solo para hidratar ANEXO_02 en PDF)
    let anexo01Derivado = null;
    if (codigoUp === "ANEXO_02" && isObjectId(anexo?.derivadoDe)) {
      anexo01Derivado = await FormSubmission.findById(anexo.derivadoDe).lean();
      // fail-soft: si no existe, el PDF igual se genera pero quedarán campos vacíos
    }

    let signers02 = {};
    let signers03 = {};
    let signers04 = {};
    let signers07 = {};
    let signers08 = {};
    let signers09 = {};
    let signers11 = {};

    // Historial de intervenciones
    let historial = [];
    try {
      historial = await buildHistorialIntervenciones(anexo._id);
    } catch (e2) {
      console.error("[PDF] Error cargando historial:", e2);
      historial = [];
    }

    // ─────────────────────────────
// Firmantes ANEXO_02
if (codigoUp === "ANEXO_02") {
  const postUid =
    anexo?.conformidadPostulante?.usuario ||
    anexo?.datos?.conformidadPostulante?.usuario ||
    anexo?.datos?.postulanteId ||
    null;

  const adminHistFallback = !anexo?.datos?.conformidadAdminGeneral && up(anexo?.estado) === "CERRADO"
    ? [...(Array.isArray(anexo?.historialEstados) ? anexo.historialEstados : [])]
        .reverse()
        .find((h) => {
          const obs = up(h?.observacion);
          return (
            up(h?.estadoNuevo) === "CERRADO" &&
            (obs.includes("ADMIN_GENERAL") || obs.includes("ADMIN GENERAL") || obs.includes("ADMIN"))
          );
        })
    : null;

  const adminUid =
    anexo?.datos?.conformidadAdminGeneral?.usuario ||
    anexo?.conformidadAdminGeneral?.usuario ||
    adminHistFallback?.realizadoPor ||
    null;

  const postulanteNombre = await getNombreApellidoSafe(postUid);
  const adminNombre = await getNombreApellidoSafe(adminUid);

  signers02 = { postulanteNombre, adminNombre };
}


    // ─────────────────────────────
    // Firmantes ANEXO_03
    if (codigoUp === "ANEXO_03") {
      const d = anexo.datos || {};

      let permUserId = null;
      if (isObjectId(d?.conformidadPermisionario?.usuario)) {
        permUserId = d.conformidadPermisionario.usuario;
      } else if (isObjectId(d?.postulanteId)) {
        permUserId = d.postulanteId;
      }

      const permNombre = await getNombreApellidoSafe(permUserId);
      const permFecha = d?.conformidadPermisionario?.fecha || null;

      let inspUserId = null;
      const iv = Array.isArray(anexo.intervinientes) ? anexo.intervinientes : [];

      const inspIv = iv.find(
        (x) => up(x.rol) === "INSPECTOR" && isObjectId(x.userId)
      );

      if (inspIv) {
        inspUserId = inspIv.userId;
      } else if (isObjectId(anexo.usuario)) {
        inspUserId = anexo.usuario;
      }

      const inspNombre = await getNombreApellidoSafe(inspUserId);
      const inspFecha = anexo.createdAt || null;

      let adminUserId = null;
      if (isObjectId(d?.conformidadAdminGeneral?.usuario)) {
        adminUserId = d.conformidadAdminGeneral.usuario;
      }

      const adminNombre = await getNombreApellidoSafe(adminUserId);
      const adminFecha = d?.conformidadAdminGeneral?.fecha || null;

      signers03 = {
        permisionario: { nombre: permNombre, fecha: permFecha },
        inspector: { nombre: inspNombre, fecha: inspFecha },
        admin: { nombre: adminNombre, fecha: adminFecha },
      };
    }

    // ─────────────────────────────
    // Firmantes ANEXO_11 (solo lectura para PDF)
    if (codigoUp === "ANEXO_11") {
      const d = anexo.datos || {};
      const iv = Array.isArray(anexo.intervinientes) ? anexo.intervinientes : [];
      const hist = Array.isArray(anexo.historialEstados)
        ? anexo.historialEstados
        : [];

      const findInterviniente = (rol) =>
        iv.find((x) => up(x?.rol) === rol && isObjectId(x?.userId))?.userId ||
        null;

      const cierreAdminHist = [...hist].reverse().find((h) => {
        const obs = up(h?.observacion);
        return (
          up(h?.estadoNuevo) === "CERRADO" &&
          (obs.includes("ADMIN_GENERAL") ||
            obs.includes("ADMIN GENERAL") ||
            obs.includes("ADMIN"))
        );
      });

      const ambitoUp = up(d?.ambito || "");
      const promotorRolUp = up(d?.promotorRol || d?.promotorTipo || "");
      const puedeUsarUsuarioComoPermisionario =
        ambitoUp !== "ESPACIO_COMUN" && promotorRolUp === "PERMISIONARIO";

      const permUid =
        (isObjectId(d?.conformidadPermisionario?.usuario) &&
          d.conformidadPermisionario.usuario) ||
        (isObjectId(d?.permisionarioId) && d.permisionarioId) ||
        findInterviniente("PERMISIONARIO") ||
        (isObjectId(vivienda?.ocupacionActual?.permisionario) &&
          vivienda.ocupacionActual.permisionario) ||
        (puedeUsarUsuarioComoPermisionario &&
          isObjectId(anexo?.usuario) &&
          anexo.usuario) ||
        null;

      const inspUid =
        (isObjectId(d?.conformidadInspector?.usuario) &&
          d.conformidadInspector.usuario) ||
        findInterviniente("INSPECTOR") ||
        null;

      const adminUid =
        (isObjectId(d?.cerradoPorAdminGeneral) &&
          d.cerradoPorAdminGeneral) ||
        (isObjectId(cierreAdminHist?.realizadoPor) &&
          cierreAdminHist.realizadoPor) ||
        null;

      const permNombre = await getNombreApellidoSafe(permUid);
      const inspNombre = await getNombreApellidoSafe(inspUid);
      const adminNombre = await getNombreApellidoSafe(adminUid);

      const permNombreFallback =
        d?.permisionarioNombre ||
        d?.postulanteNombre ||
        (ambitoUp === "ESPACIO_COMUN"
          ? "Espacio común del barrio"
          : !permUid && vivienda && !vivienda?.ocupacionActual?.permisionario
          ? "Vivienda en reparación"
          : "Permisionario no identificado");

      signers11 = {
        permisionario: {
          nombre: permNombre || permNombreFallback,
          fecha: d?.conformidadPermisionario?.fecha || null,
          rol: "PERMISIONARIO",
        },
        inspector: {
          nombre: inspNombre || d?.inspectorNombre || "Inspector de barrio",
          fecha:
            d?.conformidadInspector?.fecha ||
            d?.fechaFinalizacionInspector ||
            null,
          rol: "INSPECTOR",
        },
        admin: {
          nombre:
            adminNombre ||
            d?.cerradoPorAdminGeneralNombre ||
            "Jefe órgano administrador",
          fecha:
            d?.fechaCierreAdminGeneral ||
            d?.devueltoAInspector?.fecha ||
            null,
          rol: "ADMIN_GENERAL",
        },
      };
    }

    // ─────────────────────────────
    // Generación PDF (PDFKit)
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${codigoUp}_${id}.pdf"`
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

   if (codigoUp === "ANEXO_01") {
  renderAnexo01Pdf(doc, anexo);
} else if (codigoUp === "ANEXO_03") {
  renderAnexo03Pdf(doc, anexo, vivienda, signers03, historial);
} else if (codigoUp === "ANEXO_02") {
  // Pasamos anexo01Derivado para hidratar en claro (grado/nombres/apellido/matrícula)
  renderAnexo02Pdf(doc, anexo, vivienda, signers02, historial, anexo01Derivado);
} else if (codigoUp === "ANEXO_04") {
  renderAnexo04Pdf(doc, anexo, vivienda, signers04, historial);
} else if (codigoUp === "ANEXO_07") {
  renderAnexo07Pdf(doc, anexo, vivienda, signers07, historial);
} else if (codigoUp === "ANEXO_08") {
  let historial08 = [];
  try {
    historial08 = await buildHistorialIntervencionesAnexo08(anexo);
  } catch (e08) {
    console.error("[PDF] Error cargando historial ANEXO_08:", e08);
    historial08 = [];
  }

  renderAnexo08Pdf(doc, anexo, vivienda, signers08, historial08);
} else if (codigoUp === "ANEXO_09") {
  // ✅ O2: El PDF NO consume datos crudos. Pasamos por presenter/hydrate (DTO) antes de renderizar.
  const dto09 = sanitizeDatosAnexo09({}, anexo.datos || {});
  // completamos campos “en claro” desde vivienda (sin exponer ObjectId)
  dto09.unidadHabitacional = dto09.unidadHabitacional || vivienda?.codigo || "";
  dto09.direccionUnidad =
    dto09.direccionUnidad || dto09.direccion || vivienda?.direccion || "";
  dto09.localidad = dto09.localidad || vivienda?.barrio || "";
  // leyenda institucional (no operativa)
  dto09.leyendaInstitucional =
    String(anexo.estadoInstitucional || "").trim() === "CON_NOVEDADES"
      ? "Trámite cerrado con novedades"
      : "";

  let historial09 = [];
try {
  historial09 = await buildHistorialIntervencionesAnexo09(anexo);
} catch (e09) {
  console.error("[PDF] Error cargando historial ANEXO_09:", e09);
  historial09 = [];
}

const safeAnexo09 = { ...anexo, datos: dto09 };
renderAnexo09Pdf(doc, safeAnexo09, null, signers09, historial09);
} else if (codigoUp === "ANEXO_11") {
  renderAnexo11Pdf(doc, anexo, vivienda, signers11, historial);
} else {
  doc.font("Helvetica").fontSize(12).text("Documento no disponible.");
}

doc.end();
return;
} catch (e) {
  console.error("[descargarPdf] Error:", e);
  return genericDenied(res);
}
}

// ─────────────────────────────
// ─────────────────────────────
// CREAR ANEXO (genérico)
function isInspectorLikeUser(user) {
  const role = up(user?.role);
  const permisos = Array.isArray(user?.permisos) ? user.permisos.map(up) : [];
  return role === "INSPECTOR" || permisos.includes("INSPECTOR");
}

async function crearAnexo(req, res) {
  try {
    const codigo = up(req.params.codigo);

    let datos = req.body?.datos ?? req.body;
    if (typeof datos === "string") {
      try {
        datos = JSON.parse(datos || "{}");
      } catch {
        return badRequest(res);
      }
    }
    if (!datos || typeof datos !== "object") return badRequest(res);

    const user = req.user;
    let usuarioOwner = user?._id || null;

     let origen = null;

    const deny = () => genericDenied(res);

    // ─────────────────────────────
    // Reglas institucionales JEFE DE BARRIO (permiso sobre PERMISIONARIO)
    // - El JEFE solo puede CREAR ANEXO_11 (espacios comunes).
    // - Nunca puede crear ANEXO_04 (lo crea el permisionario).
    const esJefe = isJefeLikeUser(user);
    const esInspector = isInspectorLikeUser(user);

    if (esJefe) {
      // Fail-closed: si no tiene barrio determinable, no opera.
      const barrioJefe = String(user?.barrioAsignado || "").trim();
      if (!barrioJefe) return genericDenied(res);

      // JEFE puede crear:
      // - ANEXO_11 (institucional, espacios comunes)
      // - ANEXO_04 (trámite personal como PERMISIONARIO)
      if (codigo !== "ANEXO_11" && codigo !== "ANEXO_04")
        return genericDenied(res);
    }

    const template = await FormTemplate.findOne({ code: codigo, activo: true });
    if (!template) return genericDenied(res);

    // ───────── ANEXO_02 ─────────
    if (codigo === "ANEXO_02") {
      if (!isObjectId(datos.anexo01Id)) return badRequest(res);
      if (!isObjectId(datos.postulanteId)) return badRequest(res);
      if (!isObjectId(datos.viviendaId)) return badRequest(res);

      datos = await autocompleteDatosAnexo02(datos);
    }

    // ───────── ANEXO_03 ─────────
if (codigo === "ANEXO_03") {
  const inspectorLike = isInspectorLikeUser(user);
  if (!inspectorLike) return deny("NO_INSPECTOR_LIKE");
  if (!isObjectId(datos.viviendaId)) return badRequest(res);

  const anexo02 = await FormSubmission.findOne({
    codigo: "ANEXO_02",
    estado: "CERRADO",
    "datos.viviendaId": datos.viviendaId,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!anexo02) return deny("NO_ANEXO02_CERRADO_POR_VIVIENDA");

  // ✅ Guardar origen para hidratación en frontend
  origen = anexo02;

  const v = await Vivienda.findById(datos.viviendaId).lean();
  if (!v?.barrio) return deny("VIVIENDA_SIN_BARRIO");

  const barrioInspector = String(user.barrioAsignado || "").trim();
  if (!barrioInspector || barrioInspector !== String(v.barrio).trim())
    return deny("BARRIO_MISMATCH");

  // ─────────────────────────────
  // ✅ DERIVACIÓN + TITULARIDAD (FIX CRÍTICO)
  datos.derivadoDe = anexo02._id;

  const postulanteId =
    anexo02?.datos?.postulanteId || anexo02?.usuario || null;

  if (postulanteId) {
    datos.postulanteId = postulanteId;
    usuarioOwner = postulanteId; // 🔥 clave: el dueño real es el permisionario
  }

  // ─────────────────────────────
  // ✅ HIDRATACIÓN MÍNIMA (server-side, fail-closed)
  const d2 =
    anexo02?.datos && typeof anexo02.datos === "object" ? anexo02.datos : {};

  if (!datos.viviendaCodigo && typeof d2.viviendaCodigo === "string") {
    datos.viviendaCodigo = String(d2.viviendaCodigo).trim();
  }

  if (!datos.viviendaLabel && typeof d2.viviendaLabel === "string") {
    datos.viviendaLabel = String(d2.viviendaLabel).trim();
  }

  // Resolver permisionario objetivo
  let permisionarioId = null;

  if (v?.ocupacionActual && isObjectId(v.ocupacionActual.permisionario)) {
    permisionarioId = v.ocupacionActual.permisionario;
  } else if (isObjectId(postulanteId)) {
    permisionarioId = postulanteId;
  }

  if (permisionarioId) {
    if (!datos.permisionarioId) datos.permisionarioId = permisionarioId;

    // 🔥 refuerzo de consistencia (clave para evitar 403)
    usuarioOwner = permisionarioId;

    if (!datos.postulanteId) {
      datos.postulanteId = permisionarioId;
    }

    // Nombre (best-effort)
    if (!datos.permisionarioNombre && User) {
      const uPerm = await User.findById(permisionarioId)
        .select("nombre apellido meta")
        .lean();

      if (uPerm) {
        const apeNom = `${String(uPerm.apellido || "").trim()} ${String(
          uPerm.nombre || ""
        ).trim()}`.trim();

        if (apeNom) datos.permisionarioNombre = apeNom;

        const meta = uPerm.meta || {};

        if (!datos.gradoPermisionario) {
          const g = String(meta.grado || meta.rango || "").trim();
          if (g) datos.gradoPermisionario = g;
        }

        if (!datos.mrPermisionario) {
          const mr = String(meta.mrDestino || meta.mr || meta.destino || "").trim();
          if (mr) datos.mrPermisionario = mr;
        }
      }
    }
  }

  // ─────────────────────────────

  if (!datos.inspectorNombre) {
    datos.inspectorNombre = `${user.apellido || ""} ${user.nombre || ""}`.trim();
  }
}

    // ───────── ANEXO_07 ─────────
    if (codigo === "ANEXO_07") {
      // Solo permisionario puede crearlo
      if (up(user?.role) !== "PERMISIONARIO") return genericDenied(res);

      if (!isObjectId(datos.derivadoDe)) return badRequest(res);

      const anexo03 = await FormSubmission.findOne({
        _id: datos.derivadoDe,
        codigo: "ANEXO_03",
        estado: "CERRADO",
      }).lean();

      if (!anexo03) return genericDenied(res);

      // control de plazo 10 días
      const cierreAt = anexo03.updatedAt || anexo03.createdAt || new Date();
      const now = new Date();
      const diffMs = now.getTime() - new Date(cierreAt).getTime();
      const diffDias = diffMs / (1000 * 60 * 60 * 24);

      if (diffDias > 10) {
        // Registrar intento extemporáneo en el ANEXO_03 original
        const a3 = await FormSubmission.findById(anexo03._id);
        if (a3) {
          a3.datos = a3.datos && typeof a3.datos === "object" ? a3.datos : {};
          const intentos = Array.isArray(a3.datos._intentosAnexo07)
            ? a3.datos._intentosAnexo07
            : [];
          intentos.push({
            fecha: new Date().toISOString(),
            usuario: String(user._id),
            motivo: "INTENTO_EXTEMPORANEO_ANEXO_07",
          });
          a3.datos._intentosAnexo07 = intentos;
          await a3.save();
        }

        return res.status(400).json({
          message:
            "No es posible generar ANEXO 07: se ha superado el plazo institucional de 10 días desde el cierre del ANEXO 03.",
        });
      }

      // Autocompletar datos desde ANEXO_03 y vivienda
      const v = anexo03.vivienda ? await Vivienda.findById(anexo03.vivienda).lean() : null;

      const d3 = anexo03.datos || {};

      datos.permisionarioNombre =
        d3.permisionarioNombre || d3.postulanteNombre || datos.permisionarioNombre || "";

      datos.viviendaId = d3.viviendaId || anexo03.vivienda || datos.viviendaId;
      datos.unidadHabitacional = d3.unidadHabitacional || v?.codigo || datos.unidadHabitacional;
      datos.direccionUnidad = d3.direccion || v?.direccion || datos.direccionUnidad;
      datos.localidad = d3.localidad || v?.barrio || datos.localidad;
      datos.provincia = d3.provincia || datos.provincia;

      // inspector de barrio (si estaba en ANEXO_03)
      const iv3 = Array.isArray(anexo03.intervinientes) ? anexo03.intervinientes : [];
      const insp3 = iv3.find((x) => up(x.rol) === "INSPECTOR");
      if (insp3 && User) {
        const inspUser = await User.findById(insp3.userId)
          .select("nombre apellido barrioAsignado")
          .lean();
        if (inspUser) {
          datos.inspectorNombre = `${String(inspUser.apellido || "").trim()} ${String(
            inspUser.nombre || ""
          ).trim()}`.trim();
          datos.inspectorBarrio = inspUser.barrioAsignado || anexo03.barrio || "";
        }
      }

      // Fecha y lugar de ampliación
      datos.fechaAmpliacion = new Date();
      if (!datos.lugar) {
        datos.lugar = datos.localidad || datos.provincia || "";
      }

      // Conformidad automática del permisionario al crear
      datos.conformidadPermisionario = {
        ok: true,
        fecha: new Date(),
        usuario: user._id,
        observacion: "Ampliación de novedades registrada por el permisionario.",
      };
    }

    // ───────── ANEXO_08 ─────────
    if (codigo === "ANEXO_08") {
      // Solo INSPECTOR (o permisos INSPECTOR) puede crearlo
      if (!isInspectorLikeUser(user)) return genericDenied(res);

      if (!isObjectId(datos.derivadoDe)) return badRequest(res);

      const anexo03 = await FormSubmission.findOne({
        _id: datos.derivadoDe,
        codigo: "ANEXO_03",
        estado: "CERRADO",
      }).lean();

      if (!anexo03) return genericDenied(res);

      const v = anexo03.vivienda ? await Vivienda.findById(anexo03.vivienda).lean() : null;
      if (!v) return genericDenied(res);

      const barrioInspector = String(user.barrioAsignado || "").trim();
      if (!barrioInspector || barrioInspector !== String(v.barrio || "").trim())
        return genericDenied(res);

      const d3 = anexo03.datos || {};

      // Vivienda / ubicación
      datos.viviendaId = d3.viviendaId || anexo03.vivienda || datos.viviendaId;
      datos.unidadHabitacional = d3.unidadHabitacional || v.codigo || datos.unidadHabitacional;
      datos.direccionUnidad = d3.direccion || v.direccion || datos.direccionUnidad;
      datos.localidad = d3.localidad || v.barrio || datos.localidad;
      datos.provincia = d3.provincia || datos.provincia;

      // Permisionario actual
      let permisionarioId = null;
      if (v.ocupacionActual && isObjectId(v.ocupacionActual.permisionario)) {
        permisionarioId = v.ocupacionActual.permisionario;
      } else if (isObjectId(d3.postulanteId)) {
        permisionarioId = d3.postulanteId;
      }

      if (permisionarioId) {
        datos.permisionarioId = datos.permisionarioId || permisionarioId;
        if (User) {
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

      // Inspector datos
      if (!datos.inspectorNombre) {
        datos.inspectorNombre = `${String(user.apellido || "").trim()} ${String(
          user.nombre || ""
        ).trim()}`.trim();
      }
      if (!datos.inspectorBarrio) {
        datos.inspectorBarrio = barrioInspector || anexo03.barrio || "";
      }

      // Fecha / lugar de inspección
      datos.fechaInspeccion = new Date();
      if (!datos.lugar) {
        datos.lugar = datos.localidad || datos.provincia || "";
      }

      // Conformidad / actuación del inspector al crear
      datos.conformidadInspector = {
        ok: true,
        fecha: new Date(),
        usuario: user._id,
        observacion:
          datos.observacionesInspector || "Acta de inspección previa generada por inspector.",
      };
    }

    // ───────── ANEXO_09 ─────────
    if (codigo === "ANEXO_09") {
      // Solo INSPECTOR (o permisos INSPECTOR) puede crearlo
      if (!isInspectorLikeUser(user)) return genericDenied(res);

      if (!isObjectId(datos.derivadoDe)) return badRequest(res);

      // Idempotencia de derivación (ANEXO_08 -> ANEXO_09):
      // Si ya existe un ANEXO_09 para este ANEXO_08, devolvemos 200 con el existente.
      const existing09 = await FormSubmission.findOne({
        codigo: "ANEXO_09",
        derivadoDe: datos.derivadoDe,
      }).lean();

      if (existing09) {
        // O1: no exponer estadoInstitucional a roles no-admin en respuesta
        const safeExisting = stripEstadoInstitucionalIfNeeded(user, { ...existing09 });
        return res.status(200).json(stripAdjuntoRutas({ anexo: safeExisting, origen: { _id: datos.derivadoDe, codigo: "ANEXO_08" } }));
      }

      // Debe provenir de un ANEXO_08 CERRADO
      const anexo08 = await FormSubmission.findOne({
        _id: datos.derivadoDe,
        codigo: "ANEXO_08",
        estado: "CERRADO",
      }).lean();

      if (!anexo08) return genericDenied(res);

      const v = anexo08.vivienda ? await Vivienda.findById(anexo08.vivienda).lean() : null;
      if (!v) return genericDenied(res);

      const barrioInspector = String(user.barrioAsignado || "").trim();
      if (!barrioInspector || barrioInspector !== String(v.barrio || "").trim())
        return genericDenied(res);

      const d8 = anexo08.datos || {};

      // Vivienda / ubicación
      datos.viviendaId = d8.viviendaId || anexo08.vivienda || datos.viviendaId;
      datos.unidadHabitacional = d8.unidadHabitacional || v.codigo || datos.unidadHabitacional;
      datos.direccionUnidad =
        d8.direccionUnidad || d8.direccion || v.direccion || datos.direccionUnidad;
      datos.localidad = d8.localidad || v.barrio || datos.localidad;
      datos.provincia = d8.provincia || datos.provincia;

      // Permisionario saliente
      let permisionarioId = null;
      if (isObjectId(d8.permisionarioId)) {
        permisionarioId = d8.permisionarioId;
      } else if (v.ocupacionActual && isObjectId(v.ocupacionActual.permisionario)) {
        permisionarioId = v.ocupacionActual.permisionario;
      } else if (isObjectId(d8.postulanteId)) {
        permisionarioId = d8.postulanteId;
      }

      if (permisionarioId) {
        datos.permisionarioId = datos.permisionarioId || permisionarioId;
        if (User) {
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

      // Inspector datos
      if (!datos.inspectorNombre) {
        datos.inspectorNombre = `${String(user.apellido || "").trim()} ${String(
          user.nombre || ""
        ).trim()}`.trim();
      }
      if (!datos.inspectorBarrio) {
        datos.inspectorBarrio = barrioInspector || anexo08.barrio || "";
      }

      // Fecha / lugar de entrega
      datos.fechaEntrega = new Date();
      if (!datos.lugar) {
        datos.lugar = datos.localidad || datos.provincia || "";
      }

      // Conformidad / actuación del inspector al crear
      datos.conformidadInspector = {
        ok: true,
        fecha: new Date(),
        usuario: user._id,
        observacion:
          datos.observacionesInspector || "Acta de entrega de vivienda generada por inspector.",
      };
    }

    // ───────── ANEXO_11 ─────────
    if (codigo === "ANEXO_11") {
      const role = up(user?.role || "");

      if (
        !hasRolOrPermiso(user, [
          "PERMISIONARIO",
          "INSPECTOR",
          "JEFE_DE_BARRIO",
          "ADMIN_GENERAL",
          "ADMIN",
        ])
      ) {
        return genericDenied(res);
      }

      if (!datos.numeroPedidoTrabajo) {
        datos.numeroPedidoTrabajo = await generarNumeroAnexo11();
      }
      datos.anioPedidoTrabajo = new Date().getFullYear();
      datos.ambito = datos.ambito || "VIVIENDA";

      const nombreUsuario = `${String(user.apellido || "").trim()} ${String(
        user.nombre || ""
      ).trim()}`.trim();

      datos.promotorRol = role;
      datos.promotorNombre = nombreUsuario;

      if (role === "PERMISIONARIO") {
        if (!isObjectId(user?.viviendaAsignada)) {
          return badRequest(
            res,
            "El usuario no tiene una vivienda asignada para generar el pedido de trabajo."
          );
        }

        const v = await Vivienda.findById(user.viviendaAsignada).lean();
        if (!v) return badRequest(res, "Vivienda no encontrada.");

        datos.viviendaId = v._id;
        datos.viviendaLabel =
          String(v.codigo || "").trim() ||
          String(v.direccion || "").trim() ||
          "Vivienda fiscal";

        datos.permisionarioId = user._id;
        datos.permisionarioNombre = nombreUsuario;
        datos.viviendaBarrio = v.barrio || null;
      } else if (role === "JEFE_DE_BARRIO") {
        datos.ambito = "ESPACIO_COMUN";
        datos.viviendaId = undefined;
        datos.viviendaLabel = "ESPACIO COMÚN";
        datos.permisionarioId = undefined;
        datos.permisionarioNombre =
          datos.permisionarioNombre || "Espacio común del barrio";
        datos.viviendaBarrio = user.barrioAsignado || null;
      } else if (role === "INSPECTOR" || role === "ADMIN_GENERAL" || role === "ADMIN") {
        if (!isObjectId(datos.viviendaId)) {
          return badRequest(res, "Debe seleccionar una vivienda válida para el pedido de trabajo.");
        }

        const v = await Vivienda.findById(datos.viviendaId).lean();
        if (!v) return badRequest(res, "Vivienda no encontrada.");

        datos.ambito = "VIVIENDA";
        datos.viviendaId = v._id;
        datos.viviendaLabel =
          String(v.codigo || "").trim() ||
          String(v.direccion || "").trim() ||
          "Vivienda fiscal";
        datos.viviendaBarrio = v.barrio || null;

        let permisionarioId = null;
        if (v.ocupacionActual && isObjectId(v.ocupacionActual.permisionario)) {
          permisionarioId = v.ocupacionActual.permisionario;
        }

        if (permisionarioId) {
          datos.permisionarioId = permisionarioId;
          const permNombre = await getNombreApellidoSafe(permisionarioId);
          datos.permisionarioNombre = permNombre || datos.permisionarioNombre || "";
        } else {
          datos.permisionarioId = undefined;
          datos.permisionarioNombre = datos.permisionarioNombre || "Vivienda en reparación";
        }
      }

      if (typeof datos.descripcionTrabajo !== "string") datos.descripcionTrabajo = "";
      if (typeof datos.observacionesInspector !== "string") datos.observacionesInspector = "";
      if (typeof datos.observacionesAdminGeneral !== "string")
        datos.observacionesAdminGeneral = "";

      if (typeof datos.prioridad === "string") {
        const p = up(datos.prioridad);
        if (["URGENTE", "ALTA", "MEDIA", "BAJA"].includes(p)) {
          datos.prioridad = p;
        } else {
          datos.prioridad = "MEDIA";
        }
      } else {
        datos.prioridad = "MEDIA";
      }
    }

    // ───────── Adjuntos ─────────
    const uploadedFiles = Array.isArray(req.files)
  ? req.files
  : Object.values(req.files || {}).flat();

const adjuntos = [];
uploadedFiles.forEach((f) =>
  adjuntos.push({
    nombre: f.originalname,
    ruta: String(f.path || "").replace(/\\/g, "/"),
    tipo: f.mimetype,
    size: f.size,
  })
);

    // ─────────────────────────────
    // ANEXO_04 — Ausencia prolongada
    if (codigo === "ANEXO_04") {
      const roleBase = up(user?.role || "");
      if (roleBase !== "PERMISIONARIO") return genericDenied(res);

      let barrio = String(user?.barrioAsignado || "").trim();
      let viviendaDoc = null;

      if (!barrio && Vivienda && isObjectId(user?.viviendaAsignada)) {
        viviendaDoc = await Vivienda.findById(user.viviendaAsignada)
          .select("barrio codigo direccion")
          .lean();
        if (viviendaDoc?.barrio) barrio = String(viviendaDoc.barrio).trim();
      }

      if (!barrio && Vivienda) {
        viviendaDoc =
          viviendaDoc ||
          (await Vivienda.findOne({ "ocupacionActual.permisionario": user._id })
            .select("barrio codigo direccion")
            .lean());
        if (viviendaDoc?.barrio) barrio = String(viviendaDoc.barrio).trim();
      }

      if (!barrio) return genericDenied(res);

      if (!datos.permisionarioId) datos.permisionarioId = user._id;

      if (!datos.permisionarioNombre) {
        const full = `${String(user.apellido || "").trim()} ${String(
          user.nombre || ""
        ).trim()}`.trim();
        if (full) datos.permisionarioNombre = full;
      }

      if (!datos.barrioAsignado) datos.barrioAsignado = barrio;

      const meta04 = user && typeof user.meta === "object" && user.meta ? user.meta : {};
      if (!datos.permisionarioGrado)
        datos.permisionarioGrado = String(meta04.grado || meta04.rango || "").trim();
      if (!datos.permisionarioMR)
        datos.permisionarioMR = String(meta04.mrDestino || meta04.destino || meta04.mr || "").trim();
      if (!datos.permisionarioDomicilio)
        datos.permisionarioDomicilio = String(meta04.domicilio || meta04.direccion || "").trim();
      if (!datos.permisionarioTelefono)
        datos.permisionarioTelefono = String(meta04.telefono || meta04.tel || meta04.celular || "").trim();

      if (viviendaDoc?._id && !datos.viviendaId) datos.viviendaId = viviendaDoc._id;
      if (viviendaDoc?.codigo && !datos.unidadHabitacional)
        datos.unidadHabitacional = String(viviendaDoc.codigo).trim();
      if (viviendaDoc?.direccion && !datos.direccionUnidad)
        datos.direccionUnidad = String(viviendaDoc.direccion).trim();

      const jefe = await findUserByRolYBarrio("JEFE_DE_BARRIO", barrio);
      const inspector = await findUserByRolYBarrio("INSPECTOR", barrio);

      if (jefe?._id) {
        datos.jefeBarrioId = jefe._id;
        if (!datos.jefeBarrioNombre) {
          datos.jefeBarrioNombre = `${String(jefe.apellido || "").trim()} ${String(
            jefe.nombre || ""
          ).trim()}`.trim();
        }
      }

      if (inspector?._id) {
        datos.inspectorId = inspector._id;
        if (!datos.inspectorNombre) {
          datos.inspectorNombre = `${String(inspector.apellido || "").trim()} ${String(
            inspector.nombre || ""
          ).trim()}`.trim();
        }
        datos.inspectorBarrio = datos.inspectorBarrio || inspector.barrioAsignado || barrio;
      }

      if (!datos.observacionesJefeBarrio) datos.observacionesJefeBarrio = "";
    }

    // ───────── Intervinientes ─────────
    const intervinientes = [];

    if (codigo === "ANEXO_02" && isObjectId(datos.postulanteId)) {
      addIntervinienteUnique(intervinientes, datos.postulanteId, "POSTULANTE");
    }

    if (codigo === "ANEXO_03") {
      addIntervinienteUnique(intervinientes, user._id, "INSPECTOR");
      if (isObjectId(datos.postulanteId))
        addIntervinienteUnique(intervinientes, datos.postulanteId, "PERMISIONARIO");

      const v = await Vivienda.findById(datos.viviendaId).lean();
      const barrio = v?.barrio || null;
      if (barrio) {
        const jefe = await findUserByRolYBarrio("JEFE_DE_BARRIO", barrio);
        if (jefe?._id) addIntervinienteUnique(intervinientes, jefe._id, "JEFE_DE_BARRIO");
      }
    }

    if (codigo === "ANEXO_04") {
      addIntervinienteUnique(intervinientes, user._id, "PERMISIONARIO");
      if (isObjectId(datos.jefeBarrioId)) {
        addIntervinienteUnique(intervinientes, datos.jefeBarrioId, "JEFE_DE_BARRIO");
      }
      if (isObjectId(datos.inspectorId)) {
        addIntervinienteUnique(intervinientes, datos.inspectorId, "INSPECTOR");
      }
    }

    if (codigo === "ANEXO_07") {
      addIntervinienteUnique(intervinientes, user._id, "PERMISIONARIO");

      const barrio = datos.inspectorBarrio || null;
      if (barrio) {
        const inspector = await findUserByRolYBarrio("INSPECTOR", barrio);
        if (inspector?._id) addIntervinienteUnique(intervinientes, inspector._id, "INSPECTOR");
      }
    }

    if (codigo === "ANEXO_08") {
      addIntervinienteUnique(intervinientes, user._id, "INSPECTOR");
      if (isObjectId(datos.permisionarioId)) {
        addIntervinienteUnique(intervinientes, datos.permisionarioId, "PERMISIONARIO");
      }
    }

    if (codigo === "ANEXO_09") {
      addIntervinienteUnique(intervinientes, user._id, "INSPECTOR");
      if (isObjectId(datos.permisionarioId)) {
        addIntervinienteUnique(intervinientes, datos.permisionarioId, "PERMISIONARIO");
      }
    }

    if (codigo === "ANEXO_11") {
      const role = up(user?.role || "");
      const actorRol = esJefe ? "JEFE_DE_BARRIO" : role;

      if (isObjectId(user?._id)) {
        addIntervinienteUnique(intervinientes, user._id, actorRol || "USUARIO");
      }

      if (isObjectId(datos.permisionarioId)) {
        addIntervinienteUnique(intervinientes, datos.permisionarioId, "PERMISIONARIO");
      }

      let barrioVivienda = datos.viviendaBarrio || null;
      if (!barrioVivienda && isObjectId(datos.viviendaId)) {
        const vBarrio = await Vivienda.findById(datos.viviendaId).select("barrio").lean();
        if (vBarrio && vBarrio.barrio) {
          barrioVivienda = vBarrio.barrio;
        }
      }

      if (barrioVivienda) {
        const inspector = await findUserByRolYBarrio("INSPECTOR", barrioVivienda);
        if (inspector && inspector._id) {
          addIntervinienteUnique(intervinientes, inspector._id, "INSPECTOR");

          datos.inspectorBarrio =
            datos.inspectorBarrio || inspector.barrioAsignado || barrioVivienda;

          if (!datos.inspectorNombre) {
            datos.inspectorNombre = `${String(inspector.apellido || "").trim()} ${String(
              inspector.nombre || ""
            ).trim()}`.trim();
          }
        }
      }
    }

    // Estado inicial controlado
    // - Por defecto: ENVIADO (comportamiento actual del sistema)
    // - Excepción: INSPECTOR creando ANEXO_03 nace en BORRADOR para permitir edición
    let estadoInicial = "ENVIADO";
    if (codigo === "ANEXO_03" && isInspectorLikeUser(user)) {
      estadoInicial = "BORRADOR";
    }

    const sub = await FormSubmission.create({
      template: template._id,
      codigo,
      usuario: usuarioOwner,
      datos,
      estado: estadoInicial,
      adjuntos,
      vivienda: datos.viviendaId || undefined,
      alojamiento: datos.alojamientoId || undefined,
      intervinientes,
      derivadoDe: isObjectId(datos.derivadoDe) ? datos.derivadoDe : undefined,
    });

    // Fallback quirúrgico: si ANEXO_03 y origen quedó null, intentamos resolverlo por derivadoDe
if (codigo === "ANEXO_03" && !origen && isObjectId(datos.derivadoDe)) {
  origen = await FormSubmission.findById(datos.derivadoDe).lean();
}

return res.status(201).json(
  stripAdjuntoRutas({
    anexo: sub?.toObject ? sub.toObject() : sub,
    origen: origen?.toObject ? origen.toObject() : origen,
  })
);
  } catch (e) {
    console.error(e);
    return genericDenied(res);
  }
}
    
async function listarPorCodigo(req, res) {
  try {
    const user = req.user;
    const role = up(user?.role);
console.log("[listarPorCodigo] user:", req.user);

    if (!user || !user.role) return genericDenied(res);

    const codigo = up(req.params.codigo);

// ✅ ADMIN / ADMIN_GENERAL: ven todo
const isAdmin = role === "ADMIN" || role === "ADMIN_GENERAL";

// ✅ INSPECTOR: es permiso (no rol) dentro de PERMISIONARIO
const isPermisionario = role === "PERMISIONARIO";
const permisos = Array.isArray(user?.permisos) ? user.permisos : [];
const permisosUp = permisos.map((p) => up(p));
const isInspector = isPermisionario && permisosUp.includes("INSPECTOR");

// ❗Limitación institucional: INSPECTOR solo puede listar ANEXO_02
if (!isAdmin && !(isInspector && codigo === "ANEXO_02")) {
  return genericDenied(res);
}

    const filter = { codigo };

// ✅ Inspector queda limitado SIEMPRE a su barrio asignado
if (isInspector) {
  const barrio = String(user?.barrioAsignado || "").trim();
  if (!barrio) return genericDenied(res);
  filter.barrio = barrio;
}

const anexos = await FormSubmission.find(filter)
  .populate("usuario", "nombre apellido email role")
  .sort({ createdAt: -1 })
  .lean();

    // ✅ Solo para ANEXO_02: agregamos viviendaCodigo sin romper formato
    if (codigo === "ANEXO_02") {
      const anexosHidratados = await hydrateViviendaCodigo(anexos);
      return res.json(stripAdjuntoRutas({ anexos: anexosHidratados }));
    }

    return res.json(stripAdjuntoRutas({ anexos: Array.isArray(anexos) ? anexos.map((a) => stripEstadoInstitucionalIfNeeded(user, a?.toObject ? a.toObject() : a)) : anexos }));
  } catch (e) {
    console.error(e);
    return genericDenied(res);
  }
}
// ─────────────────────────────
// Hidratar vivienda.codigo en listados (fail-soft)
// ─────────────────────────────
async function hydrateViviendaCodigo(docs) {
  const arr = Array.isArray(docs) ? docs : [];

  // Fail-soft real: si el modelo no está disponible, no rompemos listados
  if (!Vivienda) return arr;

  // Tomamos viviendaId desde datos.viviendaId y fallback a a.vivienda (registros legacy)
  const ids = arr
    .map((a) => a?.datos?.viviendaId || a?.vivienda)
    .filter((x) => isObjectId(x))
    .map(String);

  const uniq = [...new Set(ids)];
  if (uniq.length === 0) return arr;

  const viviendas = await Vivienda.find({ _id: { $in: uniq } })
    .select({ _id: 1, codigo: 1 })
    .lean();

  const map = new Map(viviendas.map((v) => [String(v._id), v.codigo]));

  return arr.map((a) => {
    const vid = a?.datos?.viviendaId || a?.vivienda;
    const codigo = vid ? map.get(String(vid)) : null;

    // Si algunos anexos (ej ANEXO_11) usan viviendaLabel, lo completamos cuando:
    // - está vacío, o
    // - parece un ObjectId (24 hex)
    const labelActual = a?.datos?.viviendaLabel;
    const labelPareceObjectId =
      typeof labelActual === "string" && /^[a-fA-F0-9]{24}$/.test(labelActual);

    const viviendaLabelFinal =
      codigo && (!labelActual || labelPareceObjectId) ? codigo : labelActual || null;

    return {
      ...a,
      viviendaCodigo: codigo || null,
      datos: {
        ...(a.datos || {}),
        viviendaCodigo: codigo || null,
        viviendaLabel: viviendaLabelFinal,
      },
    };
  });
}
// ─────────────────────────────
// MIS ANEXOS (creador OR interviniente + retrocompat ANEXO_02)
async function getMisAnexos(req, res) {
  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);

    const perms = Array.isArray(user?.permisos) ? user.permisos : [];
    const upPerms = perms.map((p) => String(p || "").toUpperCase().trim());
    const esJefe = upPerms.includes("JEFE_DE_BARRIO");

    const roleUp = up(user.role);
    const codigoReq = req.query.codigo ? up(req.query.codigo) : null;

    const or = [
      { usuario: user._id },
      { "intervinientes.userId": user._id },
      { codigo: "ANEXO_02", "datos.postulanteId": user._id },
    ];

    // ─────────────────────────────
    // POSTULANTE
    // ─────────────────────────────
    if (roleUp === "POSTULANTE") {
      const allowed = ["ANEXO_01", "ANEXO_02"];
      const allowedSet = new Set(allowed);

      if (codigoReq && !allowedSet.has(codigoReq)) {
        return genericDenied(res);
      }

      const filtro = {
        $or: or,
        codigo: codigoReq ? codigoReq : { $in: allowed },
      };

      const anexos = await FormSubmission.find(filtro)
        .sort({ createdAt: -1 })
        .lean();

      const anexosHidratados = await hydrateViviendaCodigo(anexos);
// ✅ Completar apellidoNombres para listados (cuando no viene en datos)
// Solo aplica a ANEXO_02 porque es derivado de ANEXO_01 (postulación)
let anexosFinal = anexosHidratados;

if (String(req.query?.codigo || "").toUpperCase() === "ANEXO_02") {
  // 1) juntar posibles IDs de ANEXO_01
  const anexo01Ids = anexosHidratados
    .map((a) => a?.derivadoDe || a?.datos?.anexo01Id)
    .filter(Boolean)
    .map(String);

  const uniq01 = [...new Set(anexo01Ids)];

  if (uniq01.length > 0) {
    // 2) buscar ANEXO_01 en bulk (solo el nombre)
    const anexos01 = await FormSubmission.find({
      _id: { $in: uniq01 },
      codigo: "ANEXO_01",
    })
      .select({ _id: 1, datos: 1 })
      .lean();

    const map01 = new Map(
      anexos01.map((x) => [String(x._id), x?.datos?.apellidoNombres || x?.datos?.postulanteNombre || null])
    );

    // 3) inyectar label en ANEXO_02
    anexosFinal = anexosHidratados.map((a) => {
      const d = a?.datos || {};
      const yaTieneNombre =
        typeof d.apellidoNombres === "string" && d.apellidoNombres.trim();

      if (yaTieneNombre) return a;

      const id01 = String(a?.derivadoDe || d?.anexo01Id || "");
      const nombre = id01 ? map01.get(id01) : null;

      return {
        ...a,
        datos: {
          ...d,
          apellidoNombres: nombre || null,
        },
      };
    });
  }
}

      return res.json(stripAdjuntoRutas({ anexos: anexosFinal }));
    }

    // ─────────────────────────────
    // JEFE DE BARRIO
    // ─────────────────────────────
    if (esJefe) {
      const allowed = ["ANEXO_04", "ANEXO_11"];
      const allowedSet = new Set(allowed);

      const codigo =
        codigoReq && allowedSet.has(codigoReq) ? codigoReq : null;

      const baseFilter = { $or: or, codigo: { $in: allowed } };
      const filtro = codigo ? { ...baseFilter, codigo } : baseFilter;

      const anexos = await FormSubmission.find(filtro)
        .sort({ createdAt: -1 })
        .lean();

      const anexosHidratados = await hydrateViviendaCodigo(anexos);

      return res.json(stripAdjuntoRutas({ anexos: anexosHidratados }));
    }

    // ─────────────────────────────
    // RESTO DE ROLES
    // ─────────────────────────────
    const filtro = codigoReq
      ? { $or: or, codigo: codigoReq }
      : { $or: or };

    const anexos = await FormSubmission.find(filtro)
      .sort({ createdAt: -1 })
      .lean();

    const anexosHidratados = await hydrateViviendaCodigo(anexos);

    return res.json(stripAdjuntoRutas({ anexos: anexosHidratados }));
  } catch (e) {
    console.error("[getMisAnexos] Error:", e);
    return genericDenied(res);
  }
}

// ─────────────────────────────
// ANEXOS PROPIOS (solo creador, SIN intervinientes)
// Objetivo: "Mis Anexos" para PERMISIONARIO sin mezclar bandeja de inspector/jefe

// ✅ MIS ANEXOS (PERMISIONARIO panel base) — por vivienda + personales
// - Fail-Closed pero con fallback robusto: viviendaAsignada OR vivienda ocupada
// - Incluye ANEXO_01 por usuario (cuando vivienda en ANEXO_01 es null / histórico)
// - No mezcla gestiones de terceros donde solo figura como autoridad territorial
async function getMisAnexosPermisionario(req, res) {
  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);

    // Solo PERMISIONARIO (autoridades territoriales NO son roles)
    if (up(user.role) !== "PERMISIONARIO") return genericDenied(res);

    // 🔒 Fuente de verdad: rehidrata desde DB
    const dbUser = await User.findById(user._id)
      .select("_id role viviendaAsignada barrioAsignado permisos activo")
      .lean();

    if (!dbUser || up(dbUser.role) !== "PERMISIONARIO") return genericDenied(res);

    // 1) Intentamos viviendaAsignada
    let viviendaId = dbUser.viviendaAsignada;

    // 2) Fallback: si no existe viviendaAsignada, derivamos desde vivienda ocupada
    // (mismo criterio que ya usan en updateObservacionesAnexo04)
    if (!isObjectId(viviendaId) && typeof Vivienda !== "undefined" && Vivienda) {
      const vOcupada = await Vivienda.findOne({
        "ocupacionActual.permisionario": dbUser._id,
      })
        .select("_id")
        .lean();

      if (vOcupada?._id) viviendaId = vOcupada._id;
    }

    // Fail-closed si no se puede derivar vivienda con certeza
    if (!isObjectId(viviendaId)) return genericDenied(res);

    const codigoReq = req.query.codigo ? up(req.query.codigo) : null;

    // Soporte limit (ej: limit=1 para "Mis Datos")
    let limit = 0;
    if (req.query.limit !== undefined) {
      const n = parseInt(String(req.query.limit), 10);
      if (!Number.isNaN(n) && n > 0) limit = Math.min(n, 50);
    }

    // Scope 1: todo lo vinculado a su vivienda (incluye ANEXO_02/03/08/09/11, etc.)
    const scopeVivienda = { vivienda: viviendaId };

    // Scope 2: anexos personales estrictos (no depende de vivienda)
    // ANEXO_04 es personal del permisionario por definición
    const scopeAnexo04Personal = { codigo: "ANEXO_04", usuario: dbUser._id };

    // Scope 3: ANEXO_01 por usuario (para históricos donde vivienda queda null)
    // Esto habilita "Mis datos declarados" aunque ANEXO_01 no tenga vivienda seteada
    const scopeAnexo01Personal = { codigo: "ANEXO_01", usuario: dbUser._id };

    const filtroBase = {
      $or: [scopeVivienda, scopeAnexo04Personal, scopeAnexo01Personal],
    };

    // ✅ filtro por código si viene (sin perder el OR)
    const filtro = codigoReq ? { ...filtroBase, codigo: codigoReq } : filtroBase;

    let q = FormSubmission.find(filtro).sort({ createdAt: -1 }).lean();
    if (limit > 0) q = q.limit(limit);

    const anexos = await q;

    // ─────────────────────────────
// ─────────────────────────────
// Hidratar vivienda.codigo en listados (fail-soft)
// Mete datos.viviendaCodigo para que el frontend muestre LM-112 en vez del ObjectId.
try {
  const ids = [];

  for (const a of anexos) {
    const vid = a?.datos?.viviendaId;
    if (isObjectId(vid)) ids.push(String(vid));
  }

  const uniq = [...new Set(ids)];
  if (uniq.length && typeof Vivienda !== "undefined" && Vivienda) {
    const vivs = await Vivienda.find({ _id: { $in: uniq } })
      .select({ _id: 1, codigo: 1, barrio: 1 })
      .lean();

    const map = new Map(vivs.map((v) => [String(v._id), v]));

    for (const a of anexos) {
      const vid = a?.datos?.viviendaId;
      const v = isObjectId(vid) ? map.get(String(vid)) : null;
      if (!v) continue;

      a.datos = a.datos || {};
      if (!a.datos.viviendaCodigo) a.datos.viviendaCodigo = v.codigo;
      if (!a.datos.viviendaBarrio) a.datos.viviendaBarrio = v.barrio || "";
    }
  }
} catch (e2) {
  console.error("[LISTADO] Error hidratando vivienda.codigo:", e2);
}

    return res.json(stripAdjuntoRutas({ anexos: Array.isArray(anexos) ? anexos.map((a) => stripEstadoInstitucionalIfNeeded(user, a?.toObject ? a.toObject() : a)) : anexos }));
  } catch (e) {
    console.error("[FORMULARIOS] Error mis-anexos:", e);
    return res.status(500).json(stripAdjuntoRutas({ message: "Recurso no disponible" }));
  }
}

// ✅ MIS DATOS DECLARADOS — historial
// GET /api/formularios/mis-datos-declarados/historial?limit=50
async function historialMisDatosDeclarados(req, res) {
  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);
    if (up(user.role) !== "PERMISIONARIO") return genericDenied(res);

    const dbUser = await User.findById(user._id).select("_id role activo").lean();
    if (!dbUser || up(dbUser.role) !== "PERMISIONARIO") return genericDenied(res);
    if (dbUser.activo === false) return genericDenied(res);

    let limit = 50;
    if (req.query.limit !== undefined) {
      const n = parseInt(String(req.query.limit), 10);
      if (!Number.isNaN(n) && n > 0) limit = Math.min(n, 200);
    }

    const items = await MisDatosDeclaradosUpdate.find({ usuario: dbUser._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json(stripAdjuntoRutas({ ok: true, items }));
  } catch (e) {
    console.error("[MIS_DATOS] Error historial:", e);
    return res.status(500).json(stripAdjuntoRutas({ message: "Error interno" }));
  }
}

// ✅ MIS DATOS DECLARADOS — actualizar (PERMISIONARIO)
// POST /api/formularios/mis-datos-declarados/actualizar
async function actualizarMisDatosDeclarados(req, res) {
  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);
    if (up(user.role) !== "PERMISIONARIO") return genericDenied(res);

    const dbUser = await User.findById(user._id).select("_id role activo").lean();
    if (!dbUser || up(dbUser.role) !== "PERMISIONARIO") return genericDenied(res);
    if (dbUser.activo === false) return genericDenied(res);

    const {
      baseAnexoId,
      motivo,
      datosPersonales,
      grupoFamiliar,
      mascotas
    } = req.body || {};

    if (!baseAnexoId) {
      return res.status(400).json(stripAdjuntoRutas({ ok: false, message: "Falta baseAnexoId" }));
    }

    // Validar que exista el Anexo base
    const base = await FormSubmission.findById(baseAnexoId).lean();
    if (!base) return res.status(404).json(stripAdjuntoRutas({ ok: false, message: "Base no encontrada" }));

    const upd = await MisDatosDeclaradosUpdate.create({
      usuario: dbUser._id,

      vivienda: base.vivienda || null,
      baseAnexoId: base._id,
      baseCodigo: base.codigo,
      baseCreatedAt: base.createdAt || null,

      motivo: String(motivo || "").trim(),
      datosPersonales: (datosPersonales && typeof datosPersonales === "object") ? datosPersonales : {},
      grupoFamiliar: (grupoFamiliar && typeof grupoFamiliar === "object") ? grupoFamiliar : {},
      mascotas: Array.isArray(mascotas) ? mascotas : (mascotas ? [mascotas] : []),
    });

    return res.json(stripAdjuntoRutas({ ok: true, update: upd.toObject ? upd.toObject() : upd }));
  } catch (e) {
    console.error("[MIS_DATOS] Error actualizar:", e);
    return res.status(500).json(stripAdjuntoRutas({ ok: false, message: "Error interno" }));
  }
}

// GET /api/formularios/mis-datos-declarados/:id
async function getMisDatosDeclaradosUpdateById(req, res) {
  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);

    const id = req.params.id;
    if (!isObjectId(id)) return genericDenied(res);

    // Sólo el dueño (PERMISIONARIO) o ADMIN/ADMIN_GENERAL pueden ver
    const role = up(user.role);
    const upd = await MisDatosDeclaradosUpdate.findById(id).lean();
    if (!upd) return res.status(404).json(stripAdjuntoRutas({ message: "No encontrado" }));

    if (role === "PERMISIONARIO") {
      if (String(upd.usuario) !== String(user._id)) return genericDenied(res);
    } else if (role !== "ADMIN" && role !== "ADMIN_GENERAL") {
      return genericDenied(res);
    }

    return res.json(stripAdjuntoRutas({ ok: true, item: upd }));
  } catch (e) {
    console.error("[MIS_DATOS] Error getById:", e);
    return res.status(500).json(stripAdjuntoRutas({ message: "Error interno" }));
  }
}

// Helpers para PDF de Mis Datos
function renderMisDatosDeclaradosPdf(doc, upd, userInfo) {
  const d = upd?.datos && typeof upd.datos === "object" ? upd.datos : {};
  const val = (x) => (x === null || x === undefined ? "" : String(x));

  const titulo = "MIS DATOS DECLARADOS — ACTUALIZACIÓN REGISTRADA";
  doc.font("Helvetica-Bold").fontSize(14).text(titulo, { align: "center" });
  doc.moveDown(0.6);

  doc.font("Helvetica").fontSize(10);
  doc.text(`ID registro: ${val(upd?._id)}`);
  doc.text(`Fecha y hora: ${upd?.createdAt ? new Date(upd.createdAt).toLocaleString("es-AR") : ""}`);
  doc.text(`Usuario: ${val(userInfo?.apellido)} ${val(userInfo?.nombres)}`.trim());
  if (val(userInfo?.matricula)) doc.text(`Matrícula: ${val(userInfo?.matricula)}`);
  if (val(userInfo?.gradoEscalafon)) doc.text(`Grado / Escalafón: ${val(userInfo?.gradoEscalafon)}`);
  if (val(upd?.motivo)) doc.text(`Motivo: ${val(upd?.motivo)}`);
  doc.moveDown(0.6);

  // Sección 1
  doc.font("Helvetica-Bold").fontSize(12).text("1) Datos personales y destino");
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(11);

  doc.text(`Apellido: ${val(d.apellido)}`);
  doc.text(`Nombres: ${val(d.nombres)}`);
  doc.text(`Grado / Escalafón: ${val(d.gradoEscalafon)}`);
  doc.text(`Matrícula: ${val(d.matricula)}`);
  doc.text(`Años de servicio: ${val(d.aniosServicioRecibo)}`);
  doc.text(`Destino (lugar de trabajo): ${val(d.destinoActual)}`);
  doc.text(`Teléfono de contacto: ${val(d.telefonoActual)}`);

  doc.moveDown(0.6);

  // Sección 2: Grupo conviviente
  doc.font("Helvetica-Bold").fontSize(12).text("2) Grupo conviviente / familiar");
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(11);

  const conv = Array.isArray(d.convivientes) ? d.convivientes : [];
  if (!conv.length) {
    doc.text("(sin datos)");
  } else {
    conv.forEach((c, idx) => {
      const linea = [
        `${idx + 1}.`,
        val(c.parentesco),
        val(c.apellido),
        val(c.nombre),
        val(c.dni) ? `DNI: ${val(c.dni)}` : "",
        val(c.edad) ? `Edad: ${val(c.edad)}` : "",
        val(c.observaciones) ? `Obs: ${val(c.observaciones)}` : "",
      ]
        .filter((x) => String(x).trim() !== "")
        .join(" — ");
      doc.text(linea);
    });
  }

  doc.moveDown(0.6);

  // Sección 3: Mascotas
  doc.font("Helvetica-Bold").fontSize(12).text("3) Mascotas");
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(11);

  const mas = Array.isArray(d.mascotas) ? d.mascotas : [];
  if (!mas.length) {
    doc.text("(sin datos)");
  } else {
    mas.forEach((m, idx) => {
      const linea = [
        `${idx + 1}.`,
        val(m.tipo),
        val(m.nombre),
        val(m.observaciones) ? `Obs: ${val(m.observaciones)}` : "",
      ]
        .filter((x) => String(x).trim() !== "")
        .join(" — ");
      doc.text(linea);
    });
  }

  doc.moveDown(1.0);

  // Firmas (solo título + generado)
doc.font("Helvetica-Bold").fontSize(12).text("Firmas");
doc.moveDown(0.4);
doc.font("Helvetica").fontSize(11);

const generadoPor = [userInfo?.apellido, userInfo?.nombres].filter(Boolean).join(" ").trim() || "—";
doc.text(
  `Documento generado por ${generadoPor} — ${
    upd?.createdAt ? new Date(upd.createdAt).toLocaleString("es-AR") : ""
  }`
);

  // ✅ NO cerrar el documento acá
}

// GET /api/formularios/mis-datos-declarados/:id/pdf
async function descargarMisDatosDeclaradosPdf(req, res) {
  let doc = null;

  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);

    const id = req.params.id;
    if (!isObjectId(id)) return genericDenied(res);

    const role = up(user.role);

    const upd = await MisDatosDeclaradosUpdate.findById(id).lean();
    if (!upd) return res.status(404).json(stripAdjuntoRutas({ message: "No encontrado" }));

    if (role === "PERMISIONARIO") {
      if (String(upd.usuario) !== String(user._id)) return genericDenied(res);
    } else if (role !== "ADMIN" && role !== "ADMIN_GENERAL") {
      return genericDenied(res);
    }

    // Para imprimir nombre/matrícula/gradoEscalafon usamos lo que está en datos;
    // si faltan, buscamos User (opcional).
    let userInfo = {
      apellido: upd?.datos?.apellido || "",
      nombres: upd?.datos?.nombres || "",
      matricula: upd?.datos?.matricula || "",
      gradoEscalafon: upd?.datos?.gradoEscalafon || "",
    };

    try {
      const u = await User.findById(upd.usuario)
        .select("apellido nombres matricula gradoEscalafon")
        .lean();

      if (u) {
        userInfo = {
          apellido: u.apellido || userInfo.apellido,
          nombres: u.nombres || userInfo.nombres,
          matricula: u.matricula || userInfo.matricula,
          gradoEscalafon: u.gradoEscalafon || userInfo.gradoEscalafon,
        };
      }
    } catch {}

    // ✅ Headers PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="mis_datos_declarados_${String(upd._id)}.pdf"`
    );

    const PDFDocument = require("pdfkit");
    doc = new PDFDocument({ margin: 50, size: "A4" });

    // ✅ Evita crashear si el cliente corta la descarga
    res.on("close", () => {
      try {
        if (doc && !doc.ended) doc.end();
      } catch (_) {}
    });

    // ✅ Evita que PDFKit tire "Unhandled 'error'"
    doc.on("error", (err) => {
      console.error("[MIS_DATOS] PDFKit error:", err);
      try {
        if (!res.headersSent) res.status(500).end();
      } catch (_) {}
    });

    doc.pipe(res);

    // ✅ Render: OJO que este renderer NO debería cerrar el doc.
    renderMisDatosDeclaradosPdf(doc, upd, userInfo);

    // ✅ IMPORTANTE: evitamos doble end si el renderer ya lo cerró
    if (!doc.ended) doc.end();
  } catch (e) {
    console.error("[MIS_DATOS] Error pdf:", e);

    // Si ya empezaste a mandar PDF, no podés responder JSON
    if (res.headersSent) {
      try {
        if (doc && !doc.ended) doc.end();
      } catch (_) {}
      return;
    }

    return res.status(500).json(stripAdjuntoRutas({ message: "Error interno" }));
  }
}

// GET /api/formularios/mis-datos-declarados/:id/pdf/preview
async function verMisDatosDeclaradosPdf(req, res) {
  let doc = null;

  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);

    const id = req.params.id;
    if (!isObjectId(id)) return genericDenied(res);

    const role = up(user.role);

    const upd = await MisDatosDeclaradosUpdate.findById(id).lean();
    if (!upd) return res.status(404).json(stripAdjuntoRutas({ message: "No encontrado" }));

    // permisos: dueño o admins
    if (role === "PERMISIONARIO") {
      if (String(upd.usuario) !== String(user._id)) return genericDenied(res);
    } else if (role !== "ADMIN" && role !== "ADMIN_GENERAL") {
      return genericDenied(res);
    }

    // userInfo opcional
    let userInfo = {
      apellido: upd?.datos?.apellido || "",
      nombres: upd?.datos?.nombres || "",
      matricula: upd?.datos?.matricula || "",
      gradoEscalafon: upd?.datos?.gradoEscalafon || "",
    };

    try {
      const u = await User.findById(upd.usuario)
        .select("apellido nombres matricula gradoEscalafon")
        .lean();

      if (u) {
        userInfo = {
          apellido: u.apellido || userInfo.apellido,
          nombres: u.nombres || userInfo.nombres,
          matricula: u.matricula || userInfo.matricula,
          gradoEscalafon: u.gradoEscalafon || userInfo.gradoEscalafon,
        };
      }
    } catch {}

    // ✅ Headers PDF INLINE (preview)
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="mis_datos_declarados_${String(upd._id)}.pdf"`
    );

    const PDFDocument = require("pdfkit");
    doc = new PDFDocument({ margin: 50, size: "A4" });

    // ✅ Evita crashear si el cliente corta
    res.on("close", () => {
      try {
        if (doc && !doc.ended) doc.end();
      } catch (_) {}
    });

    doc.on("error", (err) => {
      console.error("[MIS_DATOS] PDFKit error (preview):", err);
      try {
        if (!res.headersSent) res.status(500).end();
      } catch (_) {}
    });

    doc.pipe(res);

    // ✅ Render PDF (NO debe cerrar doc)
    renderMisDatosDeclaradosPdf(doc, upd, userInfo);

    if (!doc.ended) doc.end();
  } catch (e) {
    console.error("[MIS_DATOS] Error pdf preview:", e);

    if (res.headersSent) {
      try {
        if (doc && !doc.ended) doc.end();
      } catch (_) {}
      return;
    }

    return res.status(500).json(stripAdjuntoRutas({ message: "Error interno" }));
  }
}

async function previewMisDatosDeclaradosPdf(req, res) {
  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);

    const id = req.params.id;
    if (!isObjectId(id)) return genericDenied(res);

    const role = up(user.role);

    const upd = await MisDatosDeclaradosUpdate.findById(id).lean();
    if (!upd) return res.status(404).json(stripAdjuntoRutas({ message: "No encontrado" }));

    if (role === "PERMISIONARIO") {
      if (String(upd.usuario) !== String(user._id)) return genericDenied(res);
    } else if (role !== "ADMIN" && role !== "ADMIN_GENERAL") {
      return genericDenied(res);
    }

    let userInfo = {
      apellido: upd?.datos?.apellido || "",
      nombres: upd?.datos?.nombres || "",
      matricula: upd?.datos?.matricula || "",
      gradoEscalafon: upd?.datos?.gradoEscalafon || "",
    };

    try {
      const u = await User.findById(upd.usuario)
        .select("apellido nombres matricula gradoEscalafon")
        .lean();
      if (u) {
        userInfo = {
          apellido: u.apellido || userInfo.apellido,
          nombres: u.nombres || userInfo.nombres,
          matricula: u.matricula || userInfo.matricula,
          gradoEscalafon: u.gradoEscalafon || userInfo.gradoEscalafon,
        };
      }
    } catch {}

    const PDFDocument = require("pdfkit");

    res.setHeader("Content-Type", "application/pdf");

    // ✅ INLINE (abre en navegador en vez de descargar)
    res.setHeader(
      "Content-Disposition",
      `inline; filename="mis_datos_declarados_${String(upd._id)}.pdf"`
    );

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.pipe(res);

    renderMisDatosDeclaradosPdf(doc, upd, userInfo);

    doc.end();
  } catch (e) {
    console.error("[MIS_DATOS] Error preview pdf:", e);
    return res.status(500).json(stripAdjuntoRutas({ message: "Error interno" }));
  }
}

// ✅ MIS DATOS DECLARADOS (ADMIN / ADMIN_GENERAL) — Historial por usuario
async function historialMisDatosDeclaradosPorUsuario(req, res) {
  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);

    const role = up(user.role);
    const isAdmin = role === "ADMIN" || role === "ADMIN_GENERAL";
    if (!isAdmin) return genericDenied(res);

    const { userId } = req.params;
    if (!isObjectId(userId)) return res.status(400).json(stripAdjuntoRutas({ message: "userId inválido" }));

    let limit = 50;
    if (req.query.limit !== undefined) {
      const n = parseInt(String(req.query.limit), 10);
      if (!Number.isNaN(n) && n > 0) limit = Math.min(n, 200);
    }

    const items = await MisDatosDeclaradosUpdate.find({ usuario: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json(stripAdjuntoRutas({ ok: true, items }));
  } catch (e) {
    console.error("[MIS_DATOS][ADMIN] Error historial por usuario:", e);
    return res.status(500).json(stripAdjuntoRutas({ message: "Error interno" }));
  }
}

// ✅ MIS DATOS DECLARADOS (ADMIN / ADMIN_GENERAL) — Último registro por usuario
async function ultimoMisDatosDeclaradosPorUsuario(req, res) {
  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);

    const role = up(user.role);
    const isAdmin = role === "ADMIN" || role === "ADMIN_GENERAL";
    if (!isAdmin) return genericDenied(res);

    const { userId } = req.params;
    if (!isObjectId(userId)) return res.status(400).json(stripAdjuntoRutas({ message: "userId inválido" }));

    const item = await MisDatosDeclaradosUpdate.findOne({ usuario: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(stripAdjuntoRutas({ ok: true, item: item || null }));
  } catch (e) {
    console.error("[MIS_DATOS][ADMIN] Error último por usuario:", e);
    return res.status(500).json(stripAdjuntoRutas({ message: "Error interno" }));
  }
}

async function getAnexosPropios(req, res) {
  try {
    const user = req.user;
    if (!user || !user.role) return genericDenied(res);

    // Fail-closed institucional: solo PERMISIONARIO
    if (up(user.role) !== "PERMISIONARIO") return genericDenied(res);

    // ✅ Solo anexos creados por el usuario (NO incluye intervinientes)
    const anexos = await FormSubmission.find({ usuario: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(stripAdjuntoRutas({ anexos: Array.isArray(anexos) ? anexos.map((a) => stripEstadoInstitucionalIfNeeded(user, a?.toObject ? a.toObject() : a)) : anexos }));
  } catch (e) {
    console.error("[getAnexosPropios] Error:", e);
    return genericDenied(res);
  }
}

// ─────────────────────────────
// CONFORMIDAD POSTULANTE (ANEXO_02)
async function darConformidad(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user || !user.role) return genericDenied(res);
    if (!isObjectId(id)) return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_02") return genericDenied(res);

    anexo.datos = anexo.datos || {};
    const d = anexo.datos;

    // ─────────────────────────────
    // Resolver postulanteId (fail-soft) + validar propiedad (fail-closed)
    let postulanteId = null;

    // 1) Si ya está persistido, usarlo
    if (isObjectId(d?.postulanteId)) {
      postulanteId = d.postulanteId;
    }
    // 2) Legacy: usar usuario del anexo
    else if (isObjectId(anexo.usuario)) {
      postulanteId = anexo.usuario;
      d.postulanteId = anexo.usuario; // persistimos para futuro
    }
    // 3) Derivado: buscar ANEXO_01 y tomar su usuario
    else if (isObjectId(anexo.derivadoDe)) {
      const a01 = await FormSubmission.findById(anexo.derivadoDe)
        .select({ _id: 1, codigo: 1, usuario: 1 })
        .lean();

      if (a01 && up(a01.codigo) === "ANEXO_01" && isObjectId(a01.usuario)) {
        postulanteId = a01.usuario;
        d.postulanteId = a01.usuario; // persistimos para futuro
        d.anexo01Id = a01._id; // opcional, pero útil
      }
    }

    // Fail-closed: si no puedo determinar dueño, denegar
    if (!isObjectId(postulanteId)) return genericDenied(res);

    // Solo el postulante asociado puede dar conformidad
    if (String(postulanteId) !== String(user._id)) {
      return genericDenied(res);
    }

    // ─────────────────────────────
    // Idempotencia (si ya está en revisión o cerrado, devolvemos)
    if (["EN_REVISION", "CERRADO"].includes(up(anexo.estado))) {
      // Guardamos por si acabamos de persistir postulanteId/anexo01Id
      await anexo.save();
      return res.json(stripAdjuntoRutas({ anexo: toPlain(anexo) }));
    }

    // Registrar conformidad
    anexo.conformidadPostulante = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
    };

    anexo.cambiarEstado("EN_REVISION", user._id, "Conformidad postulante");
    await anexo.save();

    return res.json(stripAdjuntoRutas({ anexo: toPlain(anexo) }));
  } catch (e) {
    console.error(e);
    return genericDenied(res);
  }
}

// ─────────────────────────────
// CIERRE ADMIN GENERAL (ANEXO_02)
async function darConformidadAdmin(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user || !user.role) return genericDenied(res);
    const role = up(user?.role);
    if (role !== "ADMIN_GENERAL") return genericDenied(res);
    if (!isObjectId(id)) return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_02") return genericDenied(res);

    // Reglas
    if (!anexo.conformidadPostulante?.ok) return badRequest(res);
    if (anexo.estado !== "EN_REVISION") return badRequest(res);

    let datosIn = req.body?.datos ?? {};
    if (typeof datosIn === "string") {
      try {
        datosIn = JSON.parse(datosIn || "{}");
      } catch {
        return badRequest(res);
      }
    }

    anexo.datos = anexo.datos || {};
    const d = anexo.datos;

    // Fechas opcionales
    if (typeof datosIn.fechaAsignacion === "string") {
      d.fechaAsignacion = datosIn.fechaAsignacion.trim();
    }
    if (typeof datosIn.fechaEntrega === "string") {
      d.fechaEntrega = datosIn.fechaEntrega.trim();
    }

    // ─────────────────────────────
    // Resolver postulanteId / anexo01Id (fail-soft) + validar
    // ─────────────────────────────
    let postulanteId = null;
    let anexo01Id = null;

    // 1) Ya persistido
    if (isObjectId(d?.postulanteId)) {
      postulanteId = d.postulanteId;
    }

    if (isObjectId(d?.anexo01Id)) {
      anexo01Id = d.anexo01Id;
    }

    // 2) Legacy: usuario dueño del anexo
    if (!isObjectId(postulanteId) && isObjectId(anexo.usuario)) {
      postulanteId = anexo.usuario;
      d.postulanteId = anexo.usuario;
    }

    // 3) Derivado: buscar ANEXO_01 y tomar su usuario
    if ((!isObjectId(postulanteId) || !isObjectId(anexo01Id)) && isObjectId(anexo.derivadoDe)) {
      const a01 = await FormSubmission.findById(anexo.derivadoDe)
        .select({ _id: 1, codigo: 1, usuario: 1 })
        .lean();

      if (a01 && up(a01.codigo) === "ANEXO_01" && isObjectId(a01.usuario)) {
        postulanteId = a01.usuario;
        anexo01Id = a01._id;
        d.postulanteId = a01.usuario;
        d.anexo01Id = a01._id;
      }
    }

    // Fail-closed: si no puedo determinar postulante, denegar
    if (!isObjectId(postulanteId)) return genericDenied(res);

    // Vivienda obligatoria para cerrar ANEXO_02
    if (!isObjectId(d?.viviendaId)) return genericDenied(res);

    // ───────────────
    // Intervinientes
    // ───────────────
    const iv = Array.isArray(anexo.intervinientes) ? anexo.intervinientes : [];

    addIntervinienteUnique(iv, postulanteId, "POSTULANTE");
    addIntervinienteUnique(iv, user._id, "ADMIN_GENERAL");

    // ───────────────
    // Vivienda / Barrio + RESERVA
    // ───────────────
    let barrioVivienda = null;

    if (typeof Vivienda !== "undefined" && Vivienda) {
      const v = await Vivienda.findById(d.viviendaId);
      if (!v) return genericDenied(res);

      barrioVivienda = v.barrio || null;

      // Idempotencia segura: solo pasar DISPONIBLE -> RESERVADA
      // Si ya está RESERVADA para el mismo postulante, tolerar.
      if (v.estado === "DISPONIBLE") {
        v.estado = "RESERVADA";

        v.ocupacionActual = v.ocupacionActual || {};
        v.ocupacionActual.permisionario = postulanteId;

        await v.save();
      } else if (v.estado === "RESERVADA") {
        const actualPerm = v?.ocupacionActual?.permisionario;
        if (actualPerm && String(actualPerm) !== String(postulanteId)) {
          return genericDenied(res);
        }

        v.ocupacionActual = v.ocupacionActual || {};
        if (!v.ocupacionActual.permisionario) {
          v.ocupacionActual.permisionario = postulanteId;
          await v.save();
        }
      } else {
        return genericDenied(res);
      }
    } else {
      return genericDenied(res);
    }

    if (barrioVivienda) {
      anexo.barrio = String(barrioVivienda).trim();

      // Inspector/Jefe por barrio (si corresponde)
      const inspector = await findUserByRolYBarrio("INSPECTOR", barrioVivienda);
      if (inspector?._id) addIntervinienteUnique(iv, inspector._id, "INSPECTOR");

      const jefe = await findUserByRolYBarrio("JEFE_DE_BARRIO", barrioVivienda);
      if (jefe?._id) addIntervinienteUnique(iv, jefe._id, "JEFE_DE_BARRIO");
    }

    anexo.intervinientes = iv;

    // Conformidad ADMIN_GENERAL (firma institucional)
    d.conformidadAdminGeneral = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
    };
    anexo.markModified("datos");

    // Estado
    anexo.cambiarEstado("CERRADO", user._id, "Cierre ADMIN_GENERAL");

    // ───────────────
    // Cambio de rol del postulante (bloqueante)
    // ───────────────
    if (typeof User === "undefined" || !User) return genericDenied(res);

    const upd = await User.updateOne(
      { _id: postulanteId },
      {
        $set: {
          role: "PERMISIONARIO",
          estadoHabitacional: "PERMISIONARIO_EN_ESPERA",
          viviendaAsignada: d.viviendaId,
        },
        $inc: {
          tokenVersion: 1,
        },
      }
    );

    const matched =
      typeof upd?.matchedCount === "number"
        ? upd.matchedCount
        : typeof upd?.n === "number"
        ? upd.n
        : 0;

    if (matched !== 1) return genericDenied(res);

    await anexo.save();
    return res.json(stripAdjuntoRutas({ anexo: toPlain(anexo) }));
  } catch (e) {
    console.error(e);
    return genericDenied(res);
  }
}
// ─────────────────────────────
// GENERAR ANEXO_02 DESDE ANEXO_01 (ADMIN_GENERAL)
async function generarAnexo02DesdeAnexo01(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user || !user.role) return genericDenied(res);
    const role = up(user?.role);
    if (role !== "ADMIN_GENERAL") return genericDenied(res);
    if (!isObjectId(id)) return genericDenied(res);

    let { viviendaId } = req.body || {};
    if (!viviendaId || !isObjectId(viviendaId)) return badRequest(res);

    const anexo01 = await FormSubmission.findById(id);
    if (!anexo01) return genericDenied(res);
    if (up(anexo01.codigo) !== "ANEXO_01") return genericDenied(res);

    if (!canSeeSubmission(user, anexo01)) return genericDenied(res);

    // FAIL-CLOSED: validar vivienda antes de crear ANEXO_02
    const vivienda = await Vivienda.findById(viviendaId);
    if (!vivienda) {
      return res.status(403).json(stripAdjuntoRutas({ message: "Recurso no disponible" }));
    }
    const estadoVivienda = up(vivienda.estado);
    if (estadoVivienda !== "DISPONIBLE" && estadoVivienda !== "A_DESOCUPARSE") {
      return res.status(403).json(stripAdjuntoRutas({ message: "Recurso no disponible" }));
    }

    // NO tocar idempotencia existente por derivadoDe
    const existente = await FormSubmission.findOne({
      codigo: "ANEXO_02",
      derivadoDe: anexo01._id,
    });

    if (existente) {
      const existenteVivienda = existente.datos?.viviendaId?.toString?.() || null;

      if (existenteVivienda && existenteVivienda !== viviendaId) {
        return res.status(409).json({
          message: "Recurso no disponible",
          existingId: existente._id,
        });
      }

      return res.json(stripAdjuntoRutas({ anexo: toPlain(existente) }));
    }

    // ─────────────────────────────
    // TEMPLATE requerido por schema
    // ─────────────────────────────
    const { FormTemplate } = require("../models/FormTemplate"); // ajustá el path si tu estructura difiere
    const template02 = await FormTemplate.findOne({
      code: "ANEXO_02",
      activo: true,
    })
      .sort({ version: -1, createdAt: -1 })
      .select({ _id: 1 })
      .lean();

    if (!template02?._id) {
      return res.status(403).json(stripAdjuntoRutas({ message: "Recurso no disponible" }));
    }

    const nuevo = new FormSubmission({
      codigo: "ANEXO_02",
      template: template02._id,
      usuario: anexo01.usuario,
      derivadoDe: anexo01._id,
      datos: {
        anexo01Id: anexo01._id,
        postulanteId: anexo01.usuario,
        viviendaId,
      },
    });

    await nuevo.save();
    return res.json(stripAdjuntoRutas({ anexo: toPlain(nuevo) }));
  } catch (err) {
    console.error("Error generarAnexo02DesdeAnexo01:", err);
    return res.status(500).json(stripAdjuntoRutas({ message: "Recurso no disponible" }));
  }
}

function isInspectorInterviniente(user, anexo) {
  const uid = String(user?._id || "");
  const list = Array.isArray(anexo?.intervinientes)
    ? anexo.intervinientes
    : [];

  return list.some(
    (x) =>
      String(x.userId) === uid &&
      String(x.rol || "").toUpperCase() === "INSPECTOR"
  );
}

function sanitizeDatosAnexo03(prevDatos, nextDatos) {
  const prev = safePlainObject(prevDatos) ? prevDatos : {};
  const next = safePlainObject(nextDatos) ? nextDatos : {};

  // Campos raíz típicos usados por PDF ANEXO_03
  const rootAllowed = [
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
    "viviendaId",
    "derivadoDe",
  ];

  const out = { ...pick(prev, rootAllowed), ...pick(next, rootAllowed) };

  // Normalización de strings
  out.permisionarioNombre = asTrimStr(out.permisionarioNombre, 200);
  out.permisionario = asTrimStr(out.permisionario, 200);
  out.postulanteNombre = asTrimStr(out.postulanteNombre, 200);
  out.unidadHabitacional = asTrimStr(out.unidadHabitacional, 120);
  out.direccion = asTrimStr(out.direccion, 200);
  out.localidad = asTrimStr(out.localidad, 120);
  out.provincia = asTrimStr(out.provincia, 120);
  out.inspectorNombre = asTrimStr(out.inspectorNombre, 200);
  out.novedadesTexto = asTrimStr(out.novedadesTexto, 10000);
  out.lugarFirma = asTrimStr(out.lugarFirma, 200);
  out.fechaFirma = asTrimStr(out.fechaFirma, 40);

  // ───── Material (SI/NO)
  const materialAllowed = [
    "llavesEdificio",
    "llavesVivienda",
    "llavesBaulera",
    "llaveTerraza",
    "llaveCochera",
    "inventarioMuebles",
    "lineaTelefonica",
  ];
  const prevMat = safePlainObject(prev.material) ? prev.material : {};
  const nextMat = safePlainObject(next.material) ? next.material : {};
  const material = { ...pick(prevMat, materialAllowed), ...pick(nextMat, materialAllowed) };

  for (const k of materialAllowed) {
    material[k] = asBoolSiNo(material[k]);
  }
  out.material = material;

  // ───── Documentación (SI/NO)
  const docuAllowed = [
    "reglamentoViviendas",
    "guiaTelefonica",
    "reglamentoCopropiedad",
  ];
  const prevDocu = safePlainObject(prev.documentacion) ? prev.documentacion : {};
  const nextDocu = safePlainObject(next.documentacion) ? next.documentacion : {};
  const documentacion = { ...pick(prevDocu, docuAllowed), ...pick(nextDocu, docuAllowed) };

  for (const k of docuAllowed) {
    documentacion[k] = asBoolSiNo(documentacion[k]);
  }
  out.documentacion = documentacion;

  // ───── Medidores (valores numéricos como string, no forzamos a number)
  const medAllowed = ["gas_m3", "agua_m3", "luz_kws", "telefono_pulsos"];
  const prevMed = safePlainObject(prev.medidores) ? prev.medidores : {};
  const nextMed = safePlainObject(next.medidores) ? next.medidores : {};
  const medidores = { ...pick(prevMed, medAllowed), ...pick(nextMed, medAllowed) };

  for (const k of medAllowed) {
    medidores[k] = asTrimStr(medidores[k], 40);
  }
  out.medidores = medidores;

  // ───── Estado de sistemas (MB/B/R/M)
  const estAllowed = [
    "agua",
    "cloacas",
    "electricidad",
    "gas",
    "pluviales",
    "telefono",
    "aberturas",
    "albanileria",
    "alfombras",
    "antenaTv",
    "calefactorEstufa",
    "calefonTermotanque",
    "carpinteria",
    "cerrajeria",
    "cocina",
    "desinfeccion",
    "herrajes",
    "limpieza",
    "lustrado",
    "parquesJardines",
    "pintura",
    "pisos",
    "porteroElectrico",
    "sanitarios",
    "vidrios",
    "estadoGeneral",
  ];
  const prevEst = safePlainObject(prev.estadoSistemas) ? prev.estadoSistemas : {};
  const nextEst = safePlainObject(next.estadoSistemas) ? next.estadoSistemas : {};
  const estadoSistemas = { ...pick(prevEst, estAllowed), ...pick(nextEst, estAllowed) };

  for (const k of estAllowed) {
    estadoSistemas[k] = asMbbrm(estadoSistemas[k]);
  }
  out.estadoSistemas = estadoSistemas;

  // preservar ids (si vienen)
  if (next.viviendaId) out.viviendaId = next.viviendaId;
  if (next.derivadoDe) out.derivadoDe = next.derivadoDe;

  return out;
}

// ─────────────────────────────
// Sanitizer específico ANEXO_09 (allowlist + anti-proto)
// - No persiste req.body directo
// - Preserva estructura esperada por PDF/preview
function sanitizeDatosAnexo09(prevDatos, nextDatos) {
  const prev = safePlainObject(prevDatos) ? prevDatos : {};
  const next = safePlainObject(nextDatos) ? nextDatos : {};

  const rootAllowed = [
    "derivadoDe",
    "anexo08Id",
    "viviendaId",
    "permisionarioId",

    "unidadHabitacional",
    "direccionUnidad",
    "direccion",
    "localidad",
    "provincia",
    "lugar",
    "fechaEntrega",

    "permisionarioNombre",
    "gradoPermisionario",
    "inspectorNombre",
    "inspectorBarrio",

    "observacionesInspector",
    "observacionesPermisionario",
    "observacionesAdminGeneral",

    "novedadesTexto",
  ];

  const out = { ...pick(prev, rootAllowed), ...pick(next, rootAllowed) };

  // normalizar strings
  out.unidadHabitacional = asTrimStr(out.unidadHabitacional, 200);
  out.direccionUnidad = asTrimStr(out.direccionUnidad || out.direccion, 300);
  out.localidad = asTrimStr(out.localidad, 120);
  out.provincia = asTrimStr(out.provincia, 120);
  out.lugar = asTrimStr(out.lugar, 200);

  out.permisionarioNombre = asTrimStr(out.permisionarioNombre, 200);
  out.gradoPermisionario = asTrimStr(out.gradoPermisionario, 50);
  out.inspectorNombre = asTrimStr(out.inspectorNombre, 200);
  out.inspectorBarrio = asTrimStr(out.inspectorBarrio, 120);

  out.observacionesInspector = asTrimStr(out.observacionesInspector, 5000);
  out.observacionesPermisionario = asTrimStr(out.observacionesPermisionario, 5000);
  out.observacionesAdminGeneral = asTrimStr(out.observacionesAdminGeneral, 8000);

  out.novedadesTexto = asTrimStr(out.novedadesTexto, 12000);

  // fechaEntrega: aceptamos Date, ISO, o string simple
  if (next.fechaEntrega) out.fechaEntrega = next.fechaEntrega;

  // Material (SI/NO)
  const matAllowed = [
    "llavesEdificio",
    "llavesVivienda",
    "llavesBaulera",
    "llaveTerraza",
    "llaveCochera",
    "inventarioMuebles",
    "lineaTelefonica",
  ];
  const prevMat = safePlainObject(prev.material) ? prev.material : {};
  const nextMat = safePlainObject(next.material) ? next.material : {};
  out.material = { ...pick(prevMat, matAllowed), ...pick(nextMat, matAllowed) };
  for (const k of matAllowed) out.material[k] = asBoolSiNo(out.material[k]);

  // Documentación (SI/NO)
  const docAllowed = ["reglamentoViviendas", "guiaTelefonica", "reglamentoCopropiedad"];
  const prevDoc = safePlainObject(prev.documentacion) ? prev.documentacion : {};
  const nextDoc = safePlainObject(next.documentacion) ? next.documentacion : {};
  out.documentacion = { ...pick(prevDoc, docAllowed), ...pick(nextDoc, docAllowed) };
  for (const k of docAllowed) out.documentacion[k] = asBoolSiNo(out.documentacion[k]);

  // Medidores (valores numéricos o strings cortas)
  const medAllowed = ["gas_m3", "agua_m3", "luz_kws", "telefono_pulsos"];
  const prevMed = safePlainObject(prev.medidores) ? prev.medidores : {};
  const nextMed = safePlainObject(next.medidores) ? next.medidores : {};
  out.medidores = { ...pick(prevMed, medAllowed), ...pick(nextMed, medAllowed) };
  for (const k of medAllowed) {
    out.medidores[k] = asTrimStr(out.medidores[k], 40);
  }

  // Estado de sistemas (MB/B/R/M)
  const estAllowed = [
    "agua",
    "cloacas",
    "electricidad",
    "gas",
    "pluviales",
    "telefono",
    "aberturas",
    "albanileria",
    "alfombras",
    "antenaTv",
    "calefactorEstufa",
    "calefonTermotanque",
    "carpinteria",
    "cerrajeria",
    "cocina",
    "desinfeccion",
    "herrajes",
    "limpieza",
    "lustrado",
    "parquesJardines",
    "pintura",
    "pisos",
    "porteroElectrico",
    "sanitarios",
    "vidrios",
    "estadoGeneral",
  ];
  const prevEst = safePlainObject(prev.estadoSistemas) ? prev.estadoSistemas : {};
  const nextEst = safePlainObject(next.estadoSistemas) ? next.estadoSistemas : {};
  out.estadoSistemas = { ...pick(prevEst, estAllowed), ...pick(nextEst, estAllowed) };
  for (const k of estAllowed) out.estadoSistemas[k] = asMbbrm(out.estadoSistemas[k]);

  // Preservar ids si vienen (sin validar aquí; validación se hace al usar)
  if (next.viviendaId) out.viviendaId = next.viviendaId;
  if (next.derivadoDe) out.derivadoDe = next.derivadoDe;
  if (next.anexo08Id) out.anexo08Id = next.anexo08Id;
  if (next.permisionarioId) out.permisionarioId = next.permisionarioId;

  return out;
}
// ─────────────────────────────
// Sanitizers (seguridad) — evitar prototype pollution y campos inesperados

function safePlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function cleanKey(k) {
  // evita prototype pollution
  return k !== "__proto__" && k !== "constructor" && k !== "prototype";
}

function pick(obj, allowedKeys = []) {
  const out = {};
  if (!safePlainObject(obj)) return out;

  for (const k of allowedKeys) {
    if (!cleanKey(k)) continue;
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

function asTrimStr(v, maxLen = 5000) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function asBoolSiNo(v) {
  const s = String(v || "").trim().toUpperCase();
  if (["SI", "SÍ", "TRUE", "1", "YES"].includes(s)) return "SI";
  if (["NO", "FALSE", "0"].includes(s)) return "NO";
  return ""; // vacío si no es válido
}

function asMbbrm(v) {
  const s = String(v || "").trim().toUpperCase();
  return ["MB", "B", "R", "M"].includes(s) ? s : "";
}

//---------------------------------------
// Funcion enviar ANEXO 03 - INSPECTOR
async function enviarAnexo03(req, res) {
  try {
    const user = req.user;

    if (!user || !user.role) {
      return genericDenied(res);
    }

    const { id } = req.params;

    if (!isObjectId(id)) {
      return genericDenied(res);
    }

    const anexo = await FormSubmission.findById(id);

    if (!anexo) {
      return genericDenied(res);
    }

    if (up(anexo.codigo) !== "ANEXO_03") {
      return genericDenied(res);
    }

    // Vincular postulante (dueño del ANEXO_02 origen) para que lo vea en /mios
    if (anexo.derivadoDe && isObjectId(String(anexo.derivadoDe))) {
      const a02 = await FormSubmission.findById(anexo.derivadoDe)
        .select("codigo usuario datos")
        .lean();

      if (a02 && up(a02.codigo) === "ANEXO_02") {
        const postulanteId = a02.datos?.postulanteId || a02.usuario;
        if (isObjectId(String(postulanteId))) {
          anexo.intervinientes = Array.isArray(anexo.intervinientes)
            ? anexo.intervinientes
            : [];
          addIntervinienteUnique(anexo.intervinientes, postulanteId, "PERMISIONARIO");
        }
      }
    }

        // Inspector-like + interviniente
    const okInspector = hasRolOrPermiso(user, ["INSPECTOR"]);

    if (!okInspector) {
      return genericDenied(res);
    }

    const okInterviniente = isInspectorInterviniente(user, anexo);

    if (!okInterviniente) {
      return genericDenied(res);
    }

    // aceptar {datos:{}} o {}
    let payload = req.body || {};
    let datos = payload?.datos ?? payload;

    if (typeof datos === "string") {
      try {
        datos = JSON.parse(datos);
      } catch {
        datos = {};
      }
    }

    // sanitiza y asigna datos si vinieron
    if (datos && typeof datos === "object") {
      anexo.datos = sanitizeDatosAnexo03(datos);
    }

    // pasar a ENVIADO (permitir idempotencia)
    const est = up(anexo.estado);

    if (est === "BORRADOR") {
      await anexo.cambiarEstado("ENVIADO", user._id, "Enviar ANEXO_03");
    } else if (est !== "ENVIADO") {
      return genericDenied(res);
    }

    await anexo.save();
    return res.json(stripAdjuntoRutas({ ok: true, anexo: toPlain(anexo) }));
  } catch (e) {
    console.error("[enviarAnexo03] Error:", e);
    return genericDenied(res);
  }
}
// ─────────────────────────────
// PATCH /:id/datos (ANEXO_03 + ANEXO_07 + ANEXO_09 + ANEXO_11 según código)
async function updateDatosAnexo03(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const role = up(user?.role);

    if (!isObjectId(id)) return genericDenied(res);

    let datos = req.body?.datos ?? req.body;
    if (typeof datos === "string") {
      try {
        datos = JSON.parse(datos || "{}");
      } catch {
        return badRequest(res);
      }
    }
    if (!datos || typeof datos !== "object") return badRequest(res);

    // ─────────────────────────────
    // Reglas institucionales JEFE DE BARRIO (permiso sobre PERMISIONARIO)
    // - El JEFE solo puede CREAR/OPERAR ANEXO_11 (espacios comunes).
    // - Nunca puede crear ANEXO_04 por esta vía.
    const esJefe = isJefeLikeUser(user);
    const esInspectorLike = isInspectorLikeUser(user);

    if (esJefe) {
      // Fail-closed: si no tiene barrio, no opera.
      if (!String(user?.barrioAsignado || "").trim()) return genericDenied(res);
    }

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);

    const codigo = up(anexo.codigo);
    const estadoUp = up(anexo.estado || "");
    const estadoInstitucionalUp = up(anexo.estadoInstitucional || "");

    // Si es JEFE, solo puede operar ANEXO_11
    if (esJefe && codigo !== "ANEXO_11") return genericDenied(res);

    // Bloqueo específico: ANEXO_11 ya cerrado por ADMIN GENERAL
    if (codigo === "ANEXO_11") {
      const d = anexo.datos && typeof anexo.datos === "object" ? anexo.datos : {};

      const cerradoPorAdmin =
        estadoUp === "CERRADO" ||
        estadoInstitucionalUp === "CERRADO_ADMIN_GENERAL" ||
        up(d.resolucionAdminGeneral) === "CERRADO" ||
        !!d.fechaCierreAdminGeneral ||
        !!d.cerradoPorAdminGeneralNombre;

      if (cerradoPorAdmin) {
        return res.status(409).json({
          message:
            "El ANEXO_11 ya fue cerrado por ADMIN GENERAL y no admite modificaciones.",
        });
      }
    }

    // ------------- ANEXO_03 (solo INSPECTOR-like, ENVIADO) -------------
    if (codigo === "ANEXO_03") {
      // Puede ser role=INSPECTOR o permisionario con permiso INSPECTOR
      if (!hasRolOrPermiso(user, ["INSPECTOR"])) return genericDenied(res);

      if (up(anexo.estado) !== "ENVIADO") return genericDenied(res);
      if (!isInspectorInterviniente(anexo, user._id)) return genericDenied(res);

      anexo.datos = sanitizeDatosAnexo03(anexo.datos || {}, datos);
      await anexo.save();

      return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
    }

    // ------------- ANEXO_07 (INSPECTOR envía a ADMIN_GENERAL) -------------
    if (codigo === "ANEXO_07") {
      // Inspector de barrio puede tener role distinto pero permiso INSPECTOR
      if (!hasRolOrPermiso(user, ["INSPECTOR"])) return genericDenied(res);

      if (up(anexo.estado) !== "ENVIADO") {
        return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
      }

      anexo.datos =
        anexo.datos && typeof anexo.datos === "object" ? anexo.datos : {};

      if (typeof datos.observacionesInspector === "string") {
        anexo.datos.observacionesInspector =
          datos.observacionesInspector.trim();
      }

      // Conformidad/actuación del inspector
      anexo.datos.conformidadInspector = {
        ok: true,
        fecha: new Date(),
        usuario: user._id,
        observacion:
          anexo.datos.observacionesInspector ||
          "Revisión del inspector de barrio previa a envío a ADMIN_GENERAL.",
      };

      anexo.cambiarEstado(
        "EN_REVISION",
        user._id,
        "ANEXO_07 enviado a ADMIN_GENERAL por inspector"
      );

      await anexo.save();
      return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
    }

    // ------------- ANEXO_09 (solo INSPECTOR-like, ENVIADO) -------------
    if (codigo === "ANEXO_09") {
      if (!hasRolOrPermiso(user, ["INSPECTOR"])) return genericDenied(res);

      if (up(anexo.estado) !== "ENVIADO") {
        // Si ya está en otra etapa, no editamos nada
        return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
      }
      if (!isInspectorInterviniente(anexo, user._id)) return genericDenied(res);

      anexo.datos = sanitizeDatosAnexo09(anexo.datos || {}, datos);
      await anexo.save();

      return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
    }

                // ------------- ANEXO_11 (INSPECTOR / ADMIN_GENERAL / ADMIN / JEFE_DE_BARRIO / PERMISIONARIO) -------------
    if (codigo === "ANEXO_11") {
      const inspectorOpera =
        hasRolOrPermiso(user, ["INSPECTOR"]) || role === "JEFE_DE_BARRIO";
      const esAdmin = role === "ADMIN_GENERAL" || role === "ADMIN";
      const esPermisionario = role === "PERMISIONARIO" && !inspectorOpera;

      if (!inspectorOpera && !esAdmin && !esPermisionario) {
        return genericDenied(res);
      }

      // Solo permitimos modificaciones mientras está ENVIADO o EN_REVISION
      // La conformidad del permisionario va por su endpoint específico
      if (!["ENVIADO", "EN_REVISION"].includes(estadoUp)) {
        return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
      }

      aplicarCambiosAnexo11({
        anexo,
        datos,
        actor: req.user,
        flags: {
          inspectorOpera,
          adminOpera: esAdmin,
          permisionarioOpera: esPermisionario,
        },
      });

      await anexo.save();
      return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
    }

    // Otros códigos no usan este endpoint
    return res.status(404).json({
      message: "Recurso no encontrado",
      path: `/api/formularios/${id}/datos`,
    });
  } catch (e) {
    console.error(e);
    return genericDenied(res);
  }
}

// ─────────────────────────────
// ANEXO_03: CIERRE ADMIN_GENERAL
async function cerrarAnexo03AdminGeneral(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isObjectId(id)) return genericDenied(res);

    const role = up(user?.role);
    if (role !== "ADMIN_GENERAL" && role !== "ADMIN") {
      return genericDenied(res);
    }


    if (!isObjectId(id)) return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_03") return genericDenied(res);

    anexo.datos = anexo.datos || {};
    const datos = anexo.datos;

    if (up(anexo.estado) === "CERRADO") {
      return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
    }

    if (!datos.conformidadPermisionario || !datos.conformidadPermisionario.ok) {
      const fallbackUserId =
        (isObjectId(datos.postulanteId) && datos.postulanteId) || user._id;

      datos.conformidadPermisionario = {
        ok: true,
        fecha: new Date(),
        usuario: fallbackUserId,
        observacion:
          datos.conformidadPermisionario?.observacion ||
          "Conformidad asumida al momento del cierre ADMIN_GENERAL",
      };
    }

    anexo.cambiarEstado("CERRADO", user._id, "Cierre ADMIN_GENERAL (ANEXO_03)");
    datos.conformidadAdminGeneral = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
    };

    if (Vivienda && isObjectId(datos.viviendaId)) {
      const v = await Vivienda.findById(datos.viviendaId);
      if (v) {
        if (!v.estado || up(v.estado) === "RESERVADA") {
          v.estado = "OCUPADA";
        }

        const permisionarioId = datos.postulanteId;
        if (isObjectId(permisionarioId)) {
          v.ocupacionActual = {
            permisionario: permisionarioId,
            fechaAsignacion: new Date(),
            observacion: "Ocupación materializada por ANEXO_03",
          };
        }

        await v.save();
      }
    }

    if (User && isObjectId(datos.postulanteId)) {
      await User.updateOne(
        { _id: datos.postulanteId },
        {
          $set: {
            role: "PERMISIONARIO",
            estadoHabitacional: "PERMISIONARIO_ACTIVO",
          },
        }
      );
    }

    await anexo.save();
    return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
  } catch (e) {
    console.error(e);
    return genericDenied(res);
  }
}
// ─────────────────────────────
// ANEXO_03: conformidad PERMISIONARIO
async function darConformidadPermisionario03(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isObjectId(id)) return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_03") return genericDenied(res);

    let permisionarioId =
      anexo.datos?.postulanteId ||
      anexo.usuario ||
      (Array.isArray(anexo.intervinientes)
        ? anexo.intervinientes.find(
            (x) => String(x?.rol || "").toUpperCase() === "PERMISIONARIO"
          )?.userId
        : null);

    let permisionarioIdOrigen = null;

    // Fallback conservador:
    // si el ANEXO_03 no coincide con el usuario actual, intentar resolver
    // el permisionario desde el ANEXO_02 origen.
    const derivadoDe = anexo.derivadoDe || anexo.datos?.derivadoDe || null;

    if (isObjectId(derivadoDe)) {
      const a02 = await FormSubmission.findById(derivadoDe)
        .select("codigo usuario datos intervinientes")
        .lean();

      if (a02 && up(a02.codigo) === "ANEXO_02") {
        permisionarioIdOrigen =
          a02?.datos?.postulanteId ||
          a02?.usuario ||
          (Array.isArray(a02.intervinientes)
            ? a02.intervinientes.find(
                (x) => String(x?.rol || "").toUpperCase() === "PERMISIONARIO"
              )?.userId
            : null);
      }
    }

    const coincideDirecto =
      String(permisionarioId || "") === String(user._id);

    const coincideOrigen =
      String(permisionarioIdOrigen || "") === String(user._id);

    if (!coincideDirecto && !coincideOrigen) {
      return genericDenied(res);
    }

    if (["EN_REVISION", "CERRADO"].includes(up(anexo.estado))) {
      return res.json(stripAdjuntoRutas({ anexo: toPlain(anexo) }));
    }

    anexo.datos = anexo.datos || {};

    // Persistir coherencia mínima si el origen resolvió correctamente
    if (!coincideDirecto && coincideOrigen) {
      anexo.datos.postulanteId = permisionarioIdOrigen;
      if (!anexo.usuario) {
        anexo.usuario = permisionarioIdOrigen;
      }

      if (!Array.isArray(anexo.intervinientes)) {
        anexo.intervinientes = [];
      }

      const yaTienePermisionario = anexo.intervinientes.some(
        (x) => String(x?.rol || "").toUpperCase() === "PERMISIONARIO"
      );

      if (!yaTienePermisionario) {
        anexo.intervinientes.push({
          rol: "PERMISIONARIO",
          userId: permisionarioIdOrigen,
          at: new Date(),
        });
      }
    }

    anexo.datos.conformidadPermisionario = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
    };

    anexo.cambiarEstado(
      "EN_REVISION",
      user._id,
      "Conformidad permisionario"
    );

    await anexo.save();

    return res.json(stripAdjuntoRutas({ anexo: toPlain(anexo) }));
  } catch (e) {
    console.error(e);
    return genericDenied(res);
  }
}
// ─────────────────────────────
// ANEXO_07: CIERRE ADMIN_GENERAL
async function cerrarAnexo07AdminGeneral(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isObjectId(id)) return genericDenied(res);

    const role = up(user?.role);
    if (role !== "ADMIN_GENERAL" && role !== "ADMIN") {
      return genericDenied(res);
    }


    if (!isObjectId(id)) return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_07") return genericDenied(res);

    anexo.datos = anexo.datos || {};
    const datos = anexo.datos;

    let datosIn = req.body?.datos ?? {};
    if (typeof datosIn === "string") {
      try {
        datosIn = JSON.parse(datosIn || "{}");
      } catch {
        return badRequest(res);
      }
    }

    if (typeof datosIn.observacionesAdminGeneral === "string") {
      datos.observacionesAdminGeneral =
        datosIn.observacionesAdminGeneral.trim();
    }

    if (up(anexo.estado) !== "CERRADO") {
      anexo.cambiarEstado(
        "CERRADO",
        user._id,
        "Cierre ADMIN_GENERAL (ANEXO_07)"
      );
    }

    datos.conformidadAdminGeneral = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
    };

    await anexo.save();
    return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
  } catch (e) {
    console.error(e);
    return genericDenied(res);
  }
}

// ─────────────────────────────
// ANEXO_08: conformidad PERMISIONARIO
async function darConformidadPermisionario08(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isObjectId(id)) return badRequest(res, "ID inválido");

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return res.status(404).json(stripAdjuntoRutas({ message: "Anexo no encontrado" }));
    if (up(anexo.codigo) !== "ANEXO_08") {
      return badRequest(res, "El formulario no corresponde a ANEXO_08");
    }

    if (["CERRADO", "ANULADO"].includes(up(anexo.estado))) {
      return badRequest(res, "El anexo no admite conformidad en su estado actual");
    }

    const d = anexo.datos || {};

    const permId =
      d.permisionarioId ||
      d.postulanteId ||
      anexo.intervinientes?.find((i) => i?.rol === "PERMISIONARIO")?.userId;

    if (String(permId || "") !== String(user._id || "")) {
      return genericDenied(res);
    }

    d.conformidadPermisionario = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
    };

    anexo.datos = d;
    anexo.markModified("datos");

    if (!anexo.estadoInstitucional || up(anexo.estado) === "ENVIADO") {
      anexo.estado = "EN_REVISION";
    }

    await anexo.save();

    return res.json(
  stripAdjuntoRutas({
    ok: true,
    anexo: anexo.toObject(),
  })
);
  } catch (err) {
    console.error("darConformidadPermisionario08 error:", err);
    return res.status(500).json(stripAdjuntoRutas({ message: "Error interno del servidor" }));
  }
}

// ─────────────────────────────
// ANEXO_08: CIERRE ADMIN_GENERAL
async function cerrarAnexo08AdminGeneral(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isObjectId(id)) return genericDenied(res);

    const role = up(user?.role);
    if (role !== "ADMIN_GENERAL" && role !== "ADMIN") {
      return genericDenied(res);
    }


    if (!isObjectId(id)) return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_08") return genericDenied(res);

    anexo.datos = anexo.datos || {};
    const datos = anexo.datos;

    let datosIn = req.body?.datos ?? {};
    if (typeof datosIn === "string") {
      try {
        datosIn = JSON.parse(datosIn || "{}");
      } catch {
        return badRequest(res);
      }
    }

    if (typeof datosIn.observacionesAdminGeneral === "string") {
      datos.observacionesAdminGeneral =
        datosIn.observacionesAdminGeneral.trim();
    }

    // Aseguramos que el permisionario quede con trazabilidad aunque no haya dado conforme explícito
    if (!datos.conformidadPermisionario || !datos.conformidadPermisionario.ok) {
      const fallbackUserId =
        (isObjectId(datos.permisionarioId) && datos.permisionarioId) ||
        (isObjectId(datos.postulanteId) && datos.postulanteId) ||
        user._id;

      datos.conformidadPermisionario = {
        ok: true,
        fecha: new Date(),
        usuario: fallbackUserId,
        observacion:
          datos.conformidadPermisionario?.observacion ||
          "Conformidad asumida al momento del cierre ADMIN_GENERAL (ANEXO_08).",
      };
    }

    if (up(anexo.estado) !== "CERRADO") {
      anexo.cambiarEstado(
        "CERRADO",
        user._id,
        "Cierre ADMIN_GENERAL (ANEXO_08)"
      );
    }

    datos.conformidadAdminGeneral = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion:
        datos.observacionesAdminGeneral ||
        "Cierre ADMIN_GENERAL del ANEXO 08.",
    };

    await anexo.save();
    return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
  } catch (e) {
    console.error(e);
    return genericDenied(res);
  }
}

async function actualizarDatosAnexo08(req, res) {
  return updateByInspector({
    req,
    res,
    user: req.user,
    core: {
      genericDenied,
      badRequest,
      up,
      isObjectId,
    },
    models: {
      FormSubmission,
    },
  });
}

// ─────────────────────────────
// ANEXO_09: conformidad PERMISIONARIO

async function darConformidadPermisionario09(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isObjectId(id)) return genericDenied(res);
    if (!user) return genericDenied(res);

    const roleUp = up(user.role || "");
    if (roleUp !== "PERMISIONARIO") return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_09") return genericDenied(res);

    const estadoUp = up(anexo.estado || "");

    // Idempotencia: si ya avanzó o cerró, devolvemos el recurso
    if (["EN_REVISION", "CERRADO"].includes(estadoUp)) {
      return res.json(
      stripAdjuntoRutas({
        ok: true,
        anexo: stripEstadoInstitucionalIfNeeded(
          user,
          anexo.toObject ? anexo.toObject() : anexo
        ),
      })
   );
    }

    // Solo bloqueamos estados terminales
    if (["ANULADO"].includes(estadoUp)) {
      return genericDenied(res);
    }

    const d =
      anexo.datos && typeof anexo.datos === "object" ? anexo.datos : {};

    const permId =
      d.permisionarioId ||
      d.postulanteId ||
      anexo.intervinientes?.find((i) => up(i?.rol) === "PERMISIONARIO")?.userId;

    if (String(permId || "") !== String(user._id || "")) {
      return genericDenied(res);
    }

    let datosIn = req.body?.datos ?? req.body ?? {};
    if (typeof datosIn === "string") {
      try {
        datosIn = JSON.parse(datosIn || "{}");
      } catch {
        return badRequest(res);
      }
    }

    const ok = typeof datosIn.ok === "boolean" ? datosIn.ok : true;

    const observacion =
      typeof datosIn.observacionesPermisionario === "string"
        ? datosIn.observacionesPermisionario.trim()
        : typeof datosIn.observaciones === "string"
        ? datosIn.observaciones.trim()
        : "";

    d.observacionesPermisionario = observacion;

    d.conformidadPermisionario = {
      ok,
      fecha: new Date(),
      usuario: user._id,
      observacion: observacion || null,
    };

    anexo.datos = d;
    anexo.markModified("datos");

    if (!anexo.estadoInstitucional || up(anexo.estado) === "ENVIADO" || up(anexo.estado) === "BORRADOR") {
      anexo.estado = "EN_REVISION";
    }

    if (typeof anexo.cambiarEstado === "function" && up(anexo.estado) !== "EN_REVISION") {
      anexo.cambiarEstado(
        "EN_REVISION",
        user._id,
        "Conformidad permisionario (ANEXO_09)"
      );
    }

    await anexo.save();

    return res.json(
  stripAdjuntoRutas({
    ok: true,
    anexo: stripEstadoInstitucionalIfNeeded(
      user,
      anexo.toObject ? anexo.toObject() : anexo
    ),
  })
);
  } catch (e) {
    console.error("[ANEXO_09] Error en darConformidadPermisionario09:", e);
    return res.status(500).json(stripAdjuntoRutas({ message: "Error interno del servidor" }));
  }
}

async function cerrarAnexo09AdminGeneral(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isObjectId(id)) return genericDenied(res);
    if (!user) return genericDenied(res);

    // ADMIN = solo lectura (no puede cerrar)
    const role = up(user?.role);
    if (role !== "ADMIN_GENERAL") return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_09") return genericDenied(res);

    // Solo se cierra desde EN_REVISION (fail-closed)
    if (up(anexo.estado) !== "EN_REVISION") return genericDenied(res);

    anexo.datos = anexo.datos || {};
    const datos = anexo.datos;

    let datosIn = req.body?.datos ?? req.body ?? {};
    if (typeof datosIn === "string") {
      try {
        datosIn = JSON.parse(datosIn || "{}");
      } catch {
        return badRequest(res);
      }
    }

    const obsCrit = String(
      datosIn.observacionCritica || datosIn.observacionesAdminGeneral || ""
    ).trim();

    const confPerm = datos.conformidadPermisionario;
    const okPerm = typeof confPerm?.ok === "boolean" ? confPerm.ok : true;

    if (!okPerm) {
      // cierre CON NOVEDADES → observación crítica obligatoria
      if (!obsCrit) {
        return badRequest(
          res,
          "Para cerrar ANEXO 09 sin conformidad del permisionario debe registrar una observación crítica."
        );
      }
      datos.observacionCritica = obsCrit;
      anexo.estadoInstitucional = "CON_NOVEDADES";
    } else {
      // cierre normal — estadoInstitucional debe quedar null
      if (obsCrit) datos.observacionCritica = obsCrit;
      anexo.estadoInstitucional = null;
    }

    // Conformidad ADMIN_GENERAL
    datos.conformidadAdminGeneral = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion: datos.observacionCritica || obsCrit || "Cierre ADMIN_GENERAL del ANEXO 09.",
    };

    anexo.markModified("datos");

    // Cierre del trámite
    anexo.cambiarEstado("CERRADO", user._id, "Cierre ADMIN_GENERAL (ANEXO_09)");

    // ─────────────────────────────
    // AJUSTE INSTITUCIONAL (PLAN DT)
    // Al cierre exitoso:
    // 1) Leer anexo.datos.viviendaId
    // 2) Fail-closed si no existe / inválido
    // 3) Si estado === A_DESOCUPARSE → cambiar SOLO a RESERVADA
    // 4) No hacer ningún otro automatismo

    const viviendaId = datos?.viviendaId;
    if (!viviendaId || !isObjectId(viviendaId)) return genericDenied(res);

    const vivienda = await Vivienda.findById(viviendaId);
    if (!vivienda) return genericDenied(res);

    if (up(vivienda.estado) === "A_DESOCUPARSE") {
      vivienda.estado = "RESERVADA";
      await vivienda.save();
    }

    await anexo.save();
    return res.json(stripAdjuntoRutas({ anexo: stripEstadoInstitucionalIfNeeded(user, anexo.toObject()) }));
  } catch (e) {
    console.error(e);
    return genericDenied(res);
  }
}
async function gestionarAnexo11Admin(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isObjectId(id)) return genericDenied(res);
    if (!user) return genericDenied(res);

    const role = up(user.role || "");
    if (role !== "ADMIN_GENERAL") {
      return genericDenied(res);
    }

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);

    const codigo = up(anexo.codigo || "");
    if (codigo !== "ANEXO_11") return genericDenied(res);

    const estadoUp = up(anexo.estado || "");
    if (estadoUp === "ANULADO") {
      return genericDenied(res);
    }

    let { accion, observacionesAdminGeneral } = req.body || {};
    accion = up(accion || "");

    // Compatibilidad legacy
    if (accion === "DEVOLVER") {
      accion = "DEVOLVER_A_INSPECTOR";
    }

    if (!["CERRAR", "DEVOLVER_A_INSPECTOR"].includes(accion)) {
      return badRequest(res);
    }

    const d =
      anexo.datos && typeof anexo.datos === "object" ? anexo.datos : {};

    // ─────────────────────────────
    // Observaciones ADMIN GENERAL
    // ─────────────────────────────
    if (typeof observacionesAdminGeneral === "string") {
      const obsTrim = observacionesAdminGeneral.trim();

      if (obsTrim) {
        // Campo plano "última / acumulada"
        if (
          typeof d.observacionesAdminGeneral === "string" &&
          d.observacionesAdminGeneral.trim()
        ) {
          d.observacionesAdminGeneral = `${d.observacionesAdminGeneral.trim()}\n${obsTrim}`;
        } else {
          d.observacionesAdminGeneral = obsTrim;
        }

        // Historial estructurado
        if (!Array.isArray(d.observacionesAdminGeneralHistorial)) {
          d.observacionesAdminGeneralHistorial = [];
        }

        d.observacionesAdminGeneralHistorial.push({
          fecha: new Date().toISOString(),
          texto: obsTrim,
          usuario: user._id,
          accion,
        });
      }
    }

    const confInspector =
      d.conformidadInspector && typeof d.conformidadInspector === "object"
        ? d.conformidadInspector
        : null;

    const trabajoFinalizadoInspector = !!d.trabajoFinalizadoInspector;

    /*
    if (accion === "CERRAR") {
      if (!confInspector || !confInspector.ok || !trabajoFinalizadoInspector) {
        return res.status(400).json({
          message:
            "No se puede cerrar el ANEXO_11: falta actuación o finalización del inspector.",
        });
      }
    }
    */

    if (accion === "CERRAR") {
      d.resolucionAdminGeneral = "CERRADO";
      d.fechaCierreAdminGeneral = new Date().toISOString();
      d.cerradoPorAdminGeneral = user._id;
      d.cerradoPorAdminGeneralNombre =
        [user?.apellido, user?.nombre].filter(Boolean).join(" ").trim() ||
        user?.email ||
        "ADMIN GENERAL";

      anexo.datos = d;
      if (typeof anexo.markModified === "function") {
        anexo.markModified("datos");
      }

      anexo.cambiarEstado(
        "CERRADO",
        user._id,
        "ANEXO_11 cerrado por ADMIN_GENERAL"
      );
    } else if (accion === "DEVOLVER_A_INSPECTOR") {
      d.devueltoAInspector = {
        ok: true,
        fecha: new Date().toISOString(),
        usuario: user._id,
      };

      anexo.datos = d;
      if (typeof anexo.markModified === "function") {
        anexo.markModified("datos");
      }

      anexo.cambiarEstado(
        "EN_REVISION",
        user._id,
        "ANEXO_11 devuelto al inspector por ADMIN_GENERAL"
      );
    }

    await anexo.save();
    return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
  } catch (e) {
    console.error("[ANEXO_11 ADMIN_GENERAL] Error gestionando ANEXO_11:", e);
    return genericDenied(res);
  }
}


// ─────────────────────────────
// ✅ Descarga segura de adjuntos (formularios/anexos)
// GET /api/formularios/:id/adjuntos/:fileId
// Nota: adjuntos NO tienen ObjectId propio (subdoc {_id:false}),
// por lo que fileId se interpreta como índice (0..n-1). Fail-closed: 403 genérico.
async function descargarAdjuntoFormulario(req, res) {
  try {
    const { id, fileId } = req.params;
    const user = req.user;

    if (!user || !user.role) return genericDenied(res);
    if (!isObjectId(id)) return genericDenied(res);

    const index = Number(fileId);
    if (!Number.isInteger(index) || index < 0) return genericDenied(res);

    const form = await FormSubmission.findById(id).lean();
    if (!form) return genericDenied(res);

    const codigoUp = up(form.codigo || "");
    const roleUp = up(user.role || "");

    // ✅ Regla institucional POSTULANTE (misma que PDF/GET)
    if (roleUp === "POSTULANTE") {
      if (codigoUp !== "ANEXO_01" && codigoUp !== "ANEXO_02") return genericDenied(res);

      const isOwner = String(form.usuario) === String(user._id);
      const isRetro02 =
        codigoUp === "ANEXO_02" &&
        form?.datos?.postulanteId &&
        String(form.datos.postulanteId) === String(user._id);

      if (!isOwner && !isRetro02) return genericDenied(res);
    } else {
      if (!canSeeSubmission(user, form)) return genericDenied(res);
    }

    // ─────────────────────────────
    // 📌 Fuente de adjuntos:
    // - Normal: del propio form
    // - Institucional: si es ANEXO_02, los adjuntos viven en el ANEXO_01 origen (derivadoDe)
    let source = form;

    if (codigoUp === "ANEXO_02" && isObjectId(form.derivadoDe)) {
      const origen = await FormSubmission.findById(form.derivadoDe).select("codigo usuario adjuntos datos").lean();
      if (origen && up(origen.codigo) === "ANEXO_01") {
        // Fail-closed: validar también visibilidad sobre el origen
        if (roleUp === "POSTULANTE") {
          if (String(origen.usuario) !== String(user._id)) return genericDenied(res);
        } else {
          if (!canSeeSubmission(user, origen)) return genericDenied(res);
        }
        source = origen;
      }
    }

    const adjuntos = Array.isArray(source.adjuntos) ? source.adjuntos : [];
const adjunto = adjuntos[index];
if (!adjunto || !adjunto.ruta) return genericDenied(res);

// Sanitización: solo basename para evitar traversal.
const filename = path.basename(String(adjunto.ruta || ""));

// Compatibilidad segura con raíces históricas / actuales
const candidateDirs = [
  path.resolve(process.cwd(), "uploads", "formularios"),
  path.resolve(process.cwd(), "uploads", "forms"),
];

let absPath = null;

for (const dir of candidateDirs) {
  const base = dir + path.sep;
  const candidate = path.resolve(dir, filename);

  // Defensa anti bypass por prefijo (con separador)
  if (!candidate.startsWith(base)) continue;

  try {
    await fs.promises.access(candidate, fs.constants.R_OK);
    absPath = candidate;
    break;
  } catch {
    // probar siguiente root
  }
}

if (!absPath) return genericDenied(res);

    // Headers de descarga segura (SIEMPRE attachment)
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${String(adjunto.nombre || filename).replace(/"/g, "")}"`
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");

    res.type(adjunto.tipo || "application/octet-stream");
    return res.sendFile(absPath);
  } catch (e) {
    console.error("[descargarAdjuntoFormulario] Error:", e);
    return genericDenied(res);
  }
}

// ─────────────────────────────
// PATCH ANEXO_04: Observaciones del JEFE DE BARRIO
// Solo PERMISIONARIO con permiso JEFE_DE_BARRIO.
// Guarda:
// - datos.observacionesJefeBarrio (última)
// - datos.observacionesJefeBarrioHistorial (acumulativo)
// - historialEstados (trazabilidad mínima)
async function updateObservacionesAnexo04(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isObjectId(id)) return genericDenied(res);
    if (!user) return genericDenied(res);

    const roleBase = up(user.role || "");
    if (roleBase !== "PERMISIONARIO") return genericDenied(res);
    if (!isJefeLikeUser(user)) return genericDenied(res);

    // Universo territorial del JEFE (fail-closed)
    // Regla institucional: si no hay barrioAsignado, no hay incumbencia.
    let barrio = String(user?.barrioAsignado || "").trim();

    // Fallback defensivo: si se puede derivar con certeza desde vivienda ocupada, ok; si no, deny.
    if (!barrio && typeof Vivienda !== "undefined" && Vivienda) {
      const vOcupada = await Vivienda.findOne({ "ocupacionActual.permisionario": user._id })
        .select("barrio")
        .lean();

      if (vOcupada?.barrio) barrio = String(vOcupada.barrio || "").trim();
    }

    if (!barrio) return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);

    const codigo = up(anexo.codigo || "");
    if (codigo !== "ANEXO_04") return genericDenied(res);

    // Control territorial (fail-closed)
    const anexoBarrio =
      (anexo?.barrioAsignado !== undefined && anexo.barrioAsignado) ||
      (anexo?.barrio !== undefined && anexo.barrio) ||
      anexo?.datos?.barrioAsignado ||
      "";

    if (!anexoBarrio) return genericDenied(res);
    if (up(anexoBarrio) !== up(barrio)) return genericDenied(res);

    if (!canSeeSubmission(user, anexo)) return genericDenied(res);

    // Texto (aceptamos payload recomendado y compatibilidad con front)
    let texto = "";
    if (typeof req.body?.observacionesJefeBarrio === "string") {
      texto = req.body.observacionesJefeBarrio;
    } else if (typeof req.body?.observaciones === "string") {
      texto = req.body.observaciones;
    } else if (typeof req.body?.datos?.observacionesJefeBarrio === "string") {
      texto = req.body.datos.observacionesJefeBarrio;
    }

    // Observaciones opcionales (institucional)
    texto = String(texto || "").trim();

    if (!anexo.datos || typeof anexo.datos !== "object") anexo.datos = {};
    anexo.datos.observacionesJefeBarrio = texto;

    if (!Array.isArray(anexo.datos.observacionesJefeBarrioHistorial)) {
      anexo.datos.observacionesJefeBarrioHistorial = [];
    }
    anexo.datos.observacionesJefeBarrioHistorial.push({
      texto,
      fecha: new Date(),
      usuario: user._id,
    });

    anexo.markModified("datos");

    if (!Array.isArray(anexo.historialEstados)) anexo.historialEstados = [];
    anexo.historialEstados.push({
      estadoAnterior: anexo.estado,
      estadoNuevo: anexo.estado,
      observacion: "Observaciones JEFE DE BARRIO (ANEXO_04)",
      realizadoPor: user._id,
      fecha: new Date(),
    });

    await anexo.save();
    return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
  } catch (e) {
    console.error("[ANEXO_04] Error updateObservacionesAnexo04:", e);
    return genericDenied(res);
  }
}

async function darConformidadJefeBarrio04(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isObjectId(id)) return genericDenied(res);
    if (!user) return genericDenied(res);

    const roleBase = up(user.role || "");
    if (roleBase !== "PERMISIONARIO") return genericDenied(res);
    if (!isJefeLikeUser(user)) return genericDenied(res);

    const barrio = String(user?.barrioAsignado || "").trim();
    if (!barrio) return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);

    const codigo = up(anexo.codigo || "");
    if (codigo !== "ANEXO_04") return genericDenied(res);

    const anexoBarrio =
      (anexo?.barrioAsignado !== undefined && anexo.barrioAsignado) ||
      (anexo?.barrio !== undefined && anexo.barrio) ||
      anexo?.datos?.barrioAsignado ||
      "";

    if (!anexoBarrio) return genericDenied(res);
    if (up(anexoBarrio) !== up(barrio)) return genericDenied(res);

    if (!canSeeSubmission(user, anexo)) return genericDenied(res);

    anexo.datos = anexo.datos && typeof anexo.datos === "object" ? anexo.datos : {};
    anexo.datos.conformidadJefeBarrio = { ok: true, fecha: new Date(), usuario: user._id };
    anexo.markModified("datos");

    if (!Array.isArray(anexo.historialEstados)) anexo.historialEstados = [];
    anexo.historialEstados.push({
      estadoAnterior: anexo.estado,
      estadoNuevo: anexo.estado,
      observacion: "Conformidad JEFE DE BARRIO (ANEXO_04)",
      realizadoPor: user._id,
      fecha: new Date(),
    });

    await anexo.save();
    return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
  } catch (e) {
    console.error("[ANEXO_04] Error darConformidadJefeBarrio04:", e);
    return genericDenied(res);
  }
}

// ─────────────────────────────
// POST /api/formularios/:id/conformidad-jefe-04
// El JEFE_DE_BARRIO (permiso) registra conformidad institucional sobre ANEXO_04.
// - Fail-closed: exige permiso JEFE_DE_BARRIO + barrioAsignado + mismo barrio del trámite.
// - No-Disclosure: denegación opaca.
async function darConformidadJefeAnexo04(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isObjectId(id)) return genericDenied(res);
    if (!user) return genericDenied(res);

    const role = up(user.role || "");
    if (role !== "PERMISIONARIO") return genericDenied(res);
    if (!isJefeLikeUser(user)) return genericDenied(res);

    const barrioUser = String(user.barrioAsignado || "").trim();
    if (!barrioUser) return genericDenied(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);

    const codigo = up(anexo.codigo || "");
    if (codigo !== "ANEXO_04") return genericDenied(res);

    // Control territorial: el trámite debe pertenecer al mismo barrio del JEFE
    const barrioAnexo = String(
  anexo.barrio ||
  anexo.barrioAsignado ||
  anexo.datos?.barrioAsignado ||
  ""
).trim();

    if (!barrioAnexo || barrioAnexo !== barrioUser) return genericDenied(res);

    // No permitir si ya está cerrado/anulado
    const estadoUp = up(anexo.estado || "");
    if (["CERRADO", "ANULADO"].includes(estadoUp)) return genericDenied(res);

    // Observación opcional (puede venir en body u en body.datos)
    let observacion = "";
    if (typeof req.body?.observacion === "string") {
      observacion = req.body.observacion.trim();
    } else if (typeof req.body?.datos?.observacion === "string") {
      observacion = req.body.datos.observacion.trim();
    }

    if (!anexo.datos || typeof anexo.datos !== "object") {
      anexo.datos = {};
    }

    anexo.datos.conformidadJefeBarrio = {
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion: observacion || null,
    };

    // Historial de conformidades (auditable, acotable si se requiere)
    if (!Array.isArray(anexo.datos.conformidadJefeBarrioHistorial)) {
      anexo.datos.conformidadJefeBarrioHistorial = [];
    }
    anexo.datos.conformidadJefeBarrioHistorial.push({
      ok: true,
      fecha: new Date(),
      usuario: user._id,
      observacion: observacion || null,
    });

    anexo.markModified("datos");

    // Historial institucional de estados / actuaciones
    if (!Array.isArray(anexo.historialEstados)) anexo.historialEstados = [];
    anexo.historialEstados.push({
      estadoAnterior: anexo.estado,
      estadoNuevo: anexo.estado,
      observacion: `Conformidad JEFE_DE_BARRIO registrada${observacion ? " (con observación)" : ""}`,
      realizadoPor: user._id,
      fecha: new Date(),
    });

    await anexo.save();

    return res.json(stripAdjuntoRutas({ anexo: anexo.toObject() }));
  } catch (e) {
    console.error("[ANEXO_04] Error en darConformidadJefeAnexo04", e);
    return genericDenied(res);
  }
}

module.exports = {
  crearAnexo,
  listarPorCodigo,
  getMisAnexos,
  getAnexosPropios,
  getById,
  descargarPdf,
  setEstadoInstitucional,
  darConformidad,
  darConformidadAdmin,
  updateDatosAnexo03, // maneja ANEXO_03, ANEXO_07, ANEXO_09 y ANEXO_11 según código
  updateObservacionesAnexo04,
  darConformidadPermisionario03,
  cerrarAnexo03AdminGeneral,
  cerrarAnexo07AdminGeneral,
  darConformidadPermisionario08,
  cerrarAnexo08AdminGeneral,
  actualizarDatosAnexo08,
  darConformidadPermisionario09,
  cerrarAnexo09AdminGeneral,
  // 👇 NUEVO: conformidad permisionario ANEXO_11
  darConformidadPermisionario11,
gestionarAnexo11Admin,
  descargarAdjuntoFormulario,  
darConformidadJefeBarrio04,
  getMisAnexosPermisionario,
  actualizarMisDatosDeclarados,
  historialMisDatosDeclarados,
getMisDatosDeclaradosUpdateById,
descargarMisDatosDeclaradosPdf,
historialMisDatosDeclaradosPorUsuario,
  ultimoMisDatosDeclaradosPorUsuario,
previewMisDatosDeclaradosPdf,
verMisDatosDeclaradosPdf,
enviarAnexo03,
generarAnexo02DesdeAnexo01,
};
