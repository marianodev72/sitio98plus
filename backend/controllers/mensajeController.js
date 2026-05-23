// backend/controllers/mensajeController.js
const Mensaje = require("../models/Mensaje");
const { User } = require("../models/user");
const mongoose = require("mongoose");
const AsignacionAlojamiento = require("../modules/alojamientos/models/AsignacionAlojamiento");

function up(v) {
  return String(v || "").toUpperCase().trim();
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined) return [];
  return [v];
}

function uniqStrings(list) {
  return Array.from(
    new Set(asArray(list).map((x) => String(x || "").trim()).filter(Boolean))
  );
}

function permisosList(user) {
  return Array.isArray(user?.permisos) ? user.permisos.map(up) : [];
}

function hasPermiso(user, permiso) {
  return permisosList(user).includes(up(permiso));
}

function esInspectorAlojamientos(user) {
  return up(user?.role) === "INSPECTOR_ALOJAMIENTOS" || hasPermiso(user, "INSPECTOR_ALOJAMIENTOS");
}

function territorioValores(user) {
  return Array.isArray(user?.territoriosAlojamiento)
    ? user.territoriosAlojamiento
        .filter((item) => up(item?.tipo) === "LUGAR")
        .map((item) => up(item?.valor))
        .filter(Boolean)
    : [];
}

function getLugaresInspectorAlojamientos(user) {
  if (!esInspectorAlojamientos(user)) return [];
  return territorioValores(user);
}

async function lugarAlojamientoActivo(userId) {
  if (!userId) return "";
  const asignacion = await AsignacionAlojamiento.findOne({
    alojado: userId,
    estado: "ACTIVA",
  })
    .populate({ path: "alojamiento", select: "lugar" })
    .lean();
  return up(asignacion?.alojamiento?.lugar);
}

function esInspectorAlojamientosCorrespondiente(user, lugar) {
  if (!esInspectorAlojamientos(user)) return false;
  if (!lugar) return false;
  return territorioValores(user).includes(lugar);
}

async function alojadosActivosPorTerritorio(user) {
  const lugares = getLugaresInspectorAlojamientos(user);
  if (!lugares.length) return [];

  const asignaciones = await AsignacionAlojamiento.find({ estado: "ACTIVA" })
    .populate({ path: "alojado", select: "_id nombre apellido role activo bloqueado archivado" })
    .populate({ path: "alojamiento", select: "codigo lugar dependencia sector tipo numero" })
    .populate({ path: "plaza", select: "numero codigoPublico" })
    .lean();

  const usuariosById = new Map();
  for (const asignacion of asignaciones || []) {
    const alojamiento = asignacion?.alojamiento || {};
    const alojado = asignacion?.alojado || {};
    const lugar = up(alojamiento?.lugar);
    const alojadoId = String(alojado?._id || "");
    if (!alojadoId || !lugares.includes(lugar)) continue;
    if (alojado.activo === false || alojado.bloqueado === true || alojado.archivado === true) continue;

    usuariosById.set(alojadoId, {
      _id: alojado._id,
      nombre: alojado.nombre,
      apellido: alojado.apellido,
      role: "ALOJADO",
      activo: alojado.activo,
      archivado: alojado.archivado,
      territoriosAlojamiento: [{ tipo: "LUGAR", valor: alojamiento?.lugar || "" }].filter((t) => t.valor),
      viviendaLabel: [
        alojamiento?.codigo,
        alojamiento?.lugar,
        alojamiento?.sector,
        asignacion?.plaza?.codigoPublico || asignacion?.plaza?.numero,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  return Array.from(usuariosById.values()).sort((a, b) =>
    (`${a.apellido || ""}${a.nombre || ""}`).localeCompare(`${b.apellido || ""}${b.nombre || ""}`)
  );
}

async function puedeInspectorAlojamientosEnviarA(user, destinatarioId) {
  if (!esInspectorAlojamientos(user)) return false;
  if (!mongoose.Types.ObjectId.isValid(String(destinatarioId || ""))) return false;

  const destinatario = await User.findById(destinatarioId)
    .select("_id role activo bloqueado archivado")
    .lean();
  if (!destinatario || destinatario.activo === false || destinatario.bloqueado === true || destinatario.archivado === true) {
    return false;
  }

  const role = up(destinatario.role);
  if (role === "ADMIN" || role === "ADMIN_GENERAL") return true;
  if (role !== "ALOJADO") return false;

  const lugares = getLugaresInspectorAlojamientos(user);
  if (!lugares.length) return false;

  const asignacion = await AsignacionAlojamiento.findOne({
    alojado: destinatario._id,
    estado: "ACTIVA",
  })
    .populate({ path: "alojamiento", select: "lugar" })
    .lean();

  return lugares.includes(up(asignacion?.alojamiento?.lugar));
}

function nombreDisplaySeguro(user, fallback = "Usuario institucional") {
  if (!user) return fallback;
  const nombreCompleto = String(user.nombreCompleto || "").trim();
  if (nombreCompleto) return nombreCompleto;
  const apellidoNombre = `${user.apellido || ""} ${user.nombre || ""}`.trim();
  if (apellidoNombre) return apellidoNombre;
  if (up(user.role) === "ALOJADO") return "Alojado";
  return fallback;
}

async function agregarRemitenteDisplay(mensajes) {
  const lista = Array.isArray(mensajes) ? mensajes : [];
  const remitenteIds = uniqStrings(lista.map((m) => m?.remitente)).filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );
  if (!remitenteIds.length) return lista;

  const usuarios = await User.find({ _id: { $in: remitenteIds } })
    .select("_id nombre apellido role")
    .lean();
  const usuariosById = new Map((usuarios || []).map((u) => [String(u._id), u]));

  return lista.map((m) => {
    const remitenteId = String(m?.remitente || "");
    return {
      ...m,
      remitenteDisplay: nombreDisplaySeguro(usuariosById.get(remitenteId), "Alojado"),
    };
  });
}

// ==========================
// AGENDA TERRITORIAL
// ==========================
async function getAgenda(req, res) {
  try {
    const role = up(req.user?.role);
    const barrioAsignado = String(req.user?.barrioAsignado || "").trim();
    const misPermisos = permisosList(req.user);

    const esTerritorial =
      role === "PERMISIONARIO" &&
      (misPermisos.includes("INSPECTOR") || misPermisos.includes("JEFE_DE_BARRIO"));

    if (esInspectorAlojamientos(req.user)) {
      const admins = await User.find({
        activo: true,
        bloqueado: false,
        archivado: false,
        role: { $in: ["ADMIN_GENERAL", "ADMIN"] },
      })
        .select("_id nombre apellido role permisos activo archivado")
        .sort({ apellido: 1, nombre: 1 })
        .lean();

      const alojados = await alojadosActivosPorTerritorio(req.user);
      return res.json({ usuarios: [...(Array.isArray(admins) ? admins : []), ...alojados] });
    }

    // Seguridad: sin barrio no hay territorialidad (pero igual devuelve admins)
    if (role === "PERMISIONARIO" && !barrioAsignado) {
      const admins = await User.find({
        activo: true,
        bloqueado: false,
        archivado: false,
        role: { $in: ["ADMIN_GENERAL", "ADMIN"] },
      })
        .select("_id nombre apellido role permisos barrioAsignado activo archivado")
        .sort({ apellido: 1, nombre: 1 })
        .lean();

      return res.json({ usuarios: Array.isArray(admins) ? admins : [] });
    }

    let query;

    if (role === "ALOJADO") {
      const lugar = await lugarAlojamientoActivo(req.user?._id);
      const admins = await User.find({
        activo: true,
        bloqueado: false,
        archivado: false,
        role: { $in: ["ADMIN_GENERAL", "ADMIN"] },
      })
        .select("_id nombre apellido role permisos activo archivado")
        .sort({ apellido: 1, nombre: 1 })
        .lean();

      const inspectores = lugar
        ? await User.find({
            activo: true,
            bloqueado: false,
            archivado: false,
            role: "PERMISIONARIO",
            permisos: "INSPECTOR_ALOJAMIENTOS",
            territoriosAlojamiento: {
              $elemMatch: {
                tipo: "LUGAR",
                valor: new RegExp(`^${lugar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
              },
            },
          })
            .select("_id nombre apellido role permisos territoriosAlojamiento activo archivado")
            .sort({ apellido: 1, nombre: 1 })
            .lean()
        : [];

      return res.json({ usuarios: [...admins, ...inspectores] });
    }

    // PERMISIONARIO común: ve admins + autoridades territoriales (permisionario con permisos INSPECTOR/JEFE)
    if (role === "PERMISIONARIO" && !esTerritorial) {
      query = {
        activo: true,
        bloqueado: false,
        archivado: false,
        $or: [
          { role: { $in: ["ADMIN_GENERAL", "ADMIN"] } },
          {
            role: "PERMISIONARIO",
            barrioAsignado,
            permisos: { $in: ["INSPECTOR", "JEFE_DE_BARRIO"] },
          },
        ],
      };
    }
    // INSPECTOR/JEFE (PERMISIONARIO con permisos): ve admins + todos los permisionarios del barrio
    else if (role === "PERMISIONARIO" && esTerritorial) {
      query = {
        activo: true,
        bloqueado: false,
        archivado: false,
        $or: [{ role: { $in: ["ADMIN_GENERAL", "ADMIN"] } }, { role: "PERMISIONARIO", barrioAsignado }],
      };
    }
    // ADMIN / ADMIN_GENERAL: agenda completa
    else {
      query = { activo: true, bloqueado: false, archivado: false };
    }

    const usuarios = await User.find(query)
      .select("_id nombre apellido role permisos barrioAsignado activo archivado")
      .sort({ apellido: 1, nombre: 1 })
      .lean();

    return res.json({ usuarios: Array.isArray(usuarios) ? usuarios : [] });
  } catch (error) {
    console.error("[mensajes][agenda] error:", error);
    return res.status(500).json({ message: "No es posible procesar su solicitud" });
  }
}

// ==========================
// BANDEJA ENTRADA
// ==========================
async function getEntrada(req, res) {
  try {
    const myId = String(req.user?._id || "").trim();
    if (!myId) return res.status(401).json({ message: "No autenticado" });

    const mensajes = await Mensaje.find({ destinatarios: myId })
      .sort({ creadoEn: -1, createdAt: -1 })
      .lean();

    const mensajesConDisplay = await agregarRemitenteDisplay(mensajes);
    return res.json({ mensajes: mensajesConDisplay });
  } catch (error) {
    console.error("[mensajes][entrada] error:", error);
    return res.status(500).json({ message: "No es posible procesar su solicitud" });
  }
}

// ==========================
// BANDEJA ENVIADOS
// ==========================
async function getEnviados(req, res) {
  try {
    const myId = String(req.user?._id || "").trim();
    if (!myId) return res.status(401).json({ message: "No autenticado" });

    const mensajes = await Mensaje.find({ remitente: myId })
      .sort({ creadoEn: -1, createdAt: -1 })
      .lean();

    const mensajesConDisplay = await agregarRemitenteDisplay(mensajes);
    return res.json({ mensajes: mensajesConDisplay });
  } catch (error) {
    console.error("[mensajes][enviados] error:", error);
    return res.status(500).json({ message: "No es posible procesar su solicitud" });
  }
}

// ==========================
// OBTENER MENSAJE POR ID
// ==========================
async function getMensaje(req, res) {
  try {
    const myId = String(req.user?._id || "").trim();
    const id = String(req.params?.id || "").trim();
    if (!myId || !id) return res.status(404).json({ message: "No es posible procesar su solicitud" });

    const mensaje = await Mensaje.findById(id).lean();
    if (!mensaje) return res.status(404).json({ message: "No es posible procesar su solicitud" });

    const remitenteId = String(mensaje.remitente || "");
    const dests = Array.isArray(mensaje.destinatarios) ? mensaje.destinatarios.map(String) : [];

    const participa = remitenteId === myId || dests.includes(myId);
    if (!participa) return res.status(404).json({ message: "No es posible procesar su solicitud" });

    const [mensajeConDisplay] = await agregarRemitenteDisplay([mensaje]);
    return res.json({ mensaje: mensajeConDisplay || mensaje });
  } catch (error) {
    console.error("[mensajes][get] error:", error);
    return res.status(404).json({ message: "No es posible procesar su solicitud" });
  }
}

// ==========================
// MARCAR LEÍDO
// ==========================
async function marcarLeido(req, res) {
  try {
    const myId = String(req.user?._id || "").trim();
    const id = String(req.params?.id || "").trim();
    if (!myId || !id) return res.status(404).json({ message: "No es posible procesar su solicitud" });

    const mensaje = await Mensaje.findById(id);
    if (!mensaje) return res.status(404).json({ message: "No es posible procesar su solicitud" });

    const remitenteId = String(mensaje.remitente || "");
    const dests = Array.isArray(mensaje.destinatarios) ? mensaje.destinatarios.map(String) : [];
    const participa = remitenteId === myId || dests.includes(myId);
    if (!participa) return res.status(404).json({ message: "No es posible procesar su solicitud" });

    const curr = Array.isArray(mensaje.leidoPor) ? mensaje.leidoPor.map(String) : [];
    if (!curr.includes(myId)) curr.push(myId);
    mensaje.leidoPor = curr;

    await mensaje.save();
    return res.json({ ok: true });
  } catch (error) {
    console.error("[mensajes][leido] error:", error);
    return res.status(404).json({ message: "No es posible procesar su solicitud" });
  }
}

// ==========================
// ENVIAR MENSAJE (JSON o MULTIPART)
// ==========================
async function enviarMensaje(req, res) {
  try {
    const role = up(req.user?.role);
    const myBarrio = up(req.user?.barrioAsignado);
    const remitenteId = String(req.user?._id || "").trim();
    if (!remitenteId) return res.status(401).json({ message: "No autenticado" });

    const misPermisos = permisosList(req.user);
    const soyAutoridadTerritorial =
      role === "PERMISIONARIO" &&
      (misPermisos.includes("INSPECTOR") || misPermisos.includes("JEFE_DE_BARRIO"));

    // Compat: para / para[] / destinatarios / destinatarioId
    const paraRaw =
      req.body?.para ??
      req.body?.["para[]"] ??
      req.body?.destinatarios ??
      req.body?.destinatarioId;

    const paraIds = uniqStrings(paraRaw);

    const asunto = String(req.body?.asunto || "").trim();
    const cuerpo = String(req.body?.cuerpo ?? req.body?.contenido ?? "").trim();

    // replyTo puede venir como "undefined"/"null" (string)
    const rawReplyTo = req.body?.replyTo;
    let replyTo = null;
    if (rawReplyTo !== undefined && rawReplyTo !== null) {
      const s = String(rawReplyTo).trim();
      if (s && s !== "undefined" && s !== "null") {
        if (mongoose.Types.ObjectId.isValid(s)) replyTo = s;
      }
    }

    if (!paraIds.length || !cuerpo) {
      return res.status(400).json({ message: "No es posible procesar su solicitud" });
    }

    // Cargar destinatarios (incluye permisos para poder evaluar autoridad territorial)
    const destinatarios = await User.find({ _id: { $in: paraIds } })
      .select("_id role permisos barrioAsignado territoriosAlojamiento activo bloqueado archivado")
      .lean();

    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return res.status(404).json({ message: "No es posible procesar su solicitud" });
    }
    if (destinatarios.length !== paraIds.length) {
      return res.status(404).json({ message: "No es posible procesar su solicitud" });
    }

    if (esInspectorAlojamientos(req.user)) {
      for (const destinatarioId of paraIds) {
        const permitido = await puedeInspectorAlojamientosEnviarA(req.user, destinatarioId);
        if (!permitido) {
          return res.status(403).json({ message: "No es posible procesar su solicitud" });
        }
      }
    }

    if (role === "ALOJADO") {
      const lugar = await lugarAlojamientoActivo(req.user?._id);
      for (const u of destinatarios) {
        if (!u || u.activo === false || u.bloqueado === true || u.archivado === true) {
          return res.status(404).json({ message: "No es posible procesar su solicitud" });
        }

        const r = up(u.role);
        const permitido =
          r === "ADMIN_GENERAL" ||
          r === "ADMIN" ||
          esInspectorAlojamientosCorrespondiente(u, lugar);

        if (!permitido) {
          return res.status(403).json({ message: "No es posible procesar su solicitud" });
        }
      }
    }

    // Reglas PERMISIONARIO (conservadoras y territoriales)
    if (role === "PERMISIONARIO" && !esInspectorAlojamientos(req.user)) {
      for (const u of destinatarios) {
        if (!u || u.activo === false || u.bloqueado === true || u.archivado === true) {
          return res.status(404).json({ message: "No es posible procesar su solicitud" });
        }

        const r = up(u.role);
        const b = up(u.barrioAsignado);
        const mismoBarrio = !!myBarrio && !!b && b === myBarrio;

        const esAdminGlobal = r === "ADMIN_GENERAL" || r === "ADMIN";
        const esLegacyAutoridad = r === "INSPECTOR" || r === "JEFE_DE_BARRIO";
        const esPermisionario = r === "PERMISIONARIO";

        const permisosDest = Array.isArray(u.permisos) ? u.permisos.map(up) : [];
        const destEsAutoridadPorPermiso =
          esPermisionario && permisosDest.some((p) => p === "INSPECTOR" || p === "JEFE_DE_BARRIO");

        // Permitido:
        // - admins globales siempre
        // - compat legacy: roles INSPECTOR/JEFE (si existieran) dentro del barrio
        // - permisionario común puede escribir a autoridad territorial (por permiso) de su barrio
        // - autoridad territorial (yo) puede escribir a cualquier permisionario de mi barrio
        const permitido =
          esAdminGlobal ||
          (esLegacyAutoridad && mismoBarrio) ||
          (destEsAutoridadPorPermiso && mismoBarrio) ||
          (soyAutoridadTerritorial && esPermisionario && mismoBarrio);

        if (!permitido) {
          return res.status(403).json({ message: "No es posible procesar su solicitud" });
        }
      }
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const adjuntos = files.map((f) => ({
      fileId: f.id || f.filename || undefined,
      nombre: f.originalname || undefined,
      mimetype: f.mimetype || undefined,
      size: f.size || undefined,
    }));

    const created = await Mensaje.create({
      remitente: remitenteId,
      destinatarios: paraIds,
      asunto: asunto || undefined,
      cuerpo,
      adjuntos,
      ...(replyTo ? { replyTo } : {}),
    });

    return res.status(201).json({ mensaje: created });
  } catch (error) {
    console.error("[mensajes][send] error:", error);
    return res.status(500).json({ message: "No es posible procesar su solicitud" });
  }
}

module.exports = {
  getAgenda,
  getEntrada,
  getEnviados,
  getMensaje,
  marcarLeido,
  enviarMensaje,
};
