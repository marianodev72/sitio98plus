// controllers/adminController.js

const mongoose = require("mongoose");
const { User } = require("../models/user"); // IMPORT correcto
const Vivienda = require("../models/vivienda");
const Alojamiento = require("../models/Alojamiento");
const { AuditLog } = require("../models/AuditLog");

// ------------------------------------------------------------
// Helpers auditoría (A6)
// ------------------------------------------------------------

function getRequestId(req) {
  const h = req.headers["x-request-id"];
  if (typeof h === "string" && h.trim()) return h.trim();
  return req.requestId || "";
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim();
  return req.ip || "";
}

function safeActor(req) {
  const actor = req.user || req.admin || {};
  return {
    id: actor._id || null,
    email: actor.email || "",
    role: actor.role || actor.rol || "",
  };
}

/**
 * Registrar auditoría (SUCCESS/FAIL) sin sensibles.
 * - NO guarda password / tokens / body completo
 * - meta: solo whitelisted fields (pasados por quien llama)
 */
async function registrarAuditoria(req, { action, entity, result = "SUCCESS", meta = {}, error = null }) {
  try {
    if (!AuditLog) return;

    const actor = safeActor(req);
    const requestId = getRequestId(req);
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";

    const event = {
      timestamp: new Date(),
      requestId,

      actor,
      action,
      entity: {
        type: entity?.type || "",
        id: entity?.id ? String(entity.id) : "",
      },

      result: result === "FAIL" ? "FAIL" : "SUCCESS",
      meta: meta || {},

      ip,
      userAgent,

      error: error
        ? {
            name: String(error.name || "Error"),
            message: String(error.message || "").slice(0, 500),
            code: String(error.code || ""),
          }
        : undefined,

      // Legacy mirror (compat)
      actorId: actor.id,
      actorRole: actor.role,
      targetType: entity?.type || "",
      targetId: entity?.id ? String(entity.id) : "",
      metadata: meta || {},

      // Compat viejo
      usuario: actor.id,
      rolEnMomento: actor.role,
      accion: action,
      recursoTipo: entity?.type || "UNKNOWN",
      recursoId: entity?.id ? String(entity.id) : "",
      detalle: "",
    };

    // No romper performance: write async (pero mantengo await porque es controller;
    // si querés fire-and-forget, cambiá por setImmediate + create().catch)
    await AuditLog.create(event);
  } catch (err) {
    console.error("Error registrando auditoría ADMIN:", err?.message || err);
  }
}

function deny(res) {
  return res.status(404).json({ error: "Recurso no disponible" });
}

function ensureAdminGeneral(actor) {
  return actor && actor.role === "ADMIN_GENERAL";
}

function ensureAdminOrGeneral(actor) {
  return actor && (actor.role === "ADMIN_GENERAL" || actor.role === "ADMIN");
}

// ------------------------------------------------------------
// Controllers
// ------------------------------------------------------------

async function listarUsuarios(req, res) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) return deny(res);
    if (!ensureAdminOrGeneral(actor)) return deny(res);

    const {
      rol,
      role,
      estadoHabitacional,
      barrio,
      barrioAsignado,
      matricula,
      grado,
      texto,
      buscar,
    } = req.query;

    const filtro = {};

    if (rol || role) filtro.role = rol || role;
    if (estadoHabitacional) filtro.estadoHabitacional = estadoHabitacional;
    if (barrio || barrioAsignado) filtro.barrioAsignado = barrio || barrioAsignado;
    if (matricula) filtro.mr = matricula;
    if (grado) filtro.grado = grado;

    const q = texto || buscar;
    if (q && String(q).trim().length > 0) {
      const regex = new RegExp(String(q).trim(), "i");
      filtro.$or = [{ mr: regex }, { apellido: regex }, { nombres: regex }, { nombre: regex }, { email: regex }];
    }

    const usuarios = await User.find(filtro)
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();

    // Auditoría: acceso administrativo a listado (sin incluir resultados)
    await registrarAuditoria(req, {
      action: "ADMIN_LIST_USERS",
      entity: { type: "User", id: "LIST" },
      meta: {
        filtrosAplicados: {
          role: filtro.role || null,
          estadoHabitacional: filtro.estadoHabitacional || null,
          barrioAsignado: filtro.barrioAsignado || null,
          mr: filtro.mr || null,
          grado: filtro.grado || null,
          hasSearch: !!q,
        },
        resultCount: Array.isArray(usuarios) ? usuarios.length : 0,
      },
    });

    return res.json({ usuarios });
  } catch (err) {
    console.error("Error en listarUsuarios (ADMIN):", err);
    return res.status(500).json({ error: "Error interno al listar usuarios" });
  }
}

async function crearUsuario(req, res) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) return deny(res);
    if (!ensureAdminGeneral(actor)) return deny(res);

    const data = req.body || {};

    if (!data.mr || !data.apellido || !data.nombres) {
      return res.status(400).json({
        error: "MR, apellido y nombres son obligatorios para crear usuario",
      });
    }

    const existente = await User.findOne({ mr: data.mr });
    if (existente) {
      return res.status(409).json({ error: "Ya existe un usuario con esa matrícula (MR)" });
    }

    const nuevo = new User({
      ...data,
      // ⚠️ Auditoría: NO loggear password; pero acá sí setea default.
      password: data.password || "123456",
    });

    await nuevo.save();

    await registrarAuditoria(req, {
      action: "ADMIN_CREATE_USER",
      entity: { type: "User", id: nuevo._id },
      meta: {
        // whitelist de datos NO sensibles
        mr: nuevo.mr,
        role: nuevo.role || null,
        barrioAsignado: nuevo.barrioAsignado || null,
        estadoHabitacional: nuevo.estadoHabitacional || null,
        activo: typeof nuevo.activo === "boolean" ? nuevo.activo : null,
      },
    });

    return res.status(201).json({
      message: "Usuario creado correctamente",
      usuarioId: nuevo._id,
    });
  } catch (err) {
    console.error("Error en crearUsuario:", err);
    return res.status(500).json({ error: "Error interno al crear usuario" });
  }
}

async function actualizarUsuario(req, res) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) return deny(res);
    if (!ensureAdminGeneral(actor)) return deny(res);

    const { id } = req.params;
    const data = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    const usuario = await User.findById(id);
    if (!usuario) return deny(res);

    const camposPermitidos = [
      "apellido",
      "nombres",
      "mr",
      "email",
      "telefono",
      "grado",
      "barrioAsignado",
      "estadoHabitacional",
      "activo",
    ];

    // meta: registrar solo qué campos se tocaron, no valores (menos riesgo PII)
    const changed = [];

    camposPermitidos.forEach((campo) => {
      if (data[campo] !== undefined) {
        usuario[campo] = data[campo];
        changed.push(campo);
      }
    });

    await usuario.save();

    await registrarAuditoria(req, {
      action: "ADMIN_UPDATE_USER",
      entity: { type: "User", id: usuario._id },
      meta: {
        changedFields: changed,
      },
    });

    return res.json({ message: "Usuario actualizado correctamente" });
  } catch (err) {
    console.error("Error en actualizarUsuario:", err);
    return res.status(500).json({ error: "Error interno al actualizar usuario" });
  }
}

async function cambiarRol(req, res) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) return deny(res);
    if (!ensureAdminGeneral(actor)) return deny(res);

    const { id } = req.params;
    const { nuevoRol } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID de usuario inválido" });
    if (!nuevoRol) return res.status(400).json({ error: "nuevoRol es obligatorio" });

    const usuario = await User.findById(id);
    if (!usuario) return deny(res);

    const prev = usuario.role;
    usuario.role = nuevoRol;
    await usuario.save();

    await registrarAuditoria(req, {
      action: "ADMIN_CHANGE_ROLE",
      entity: { type: "User", id: usuario._id },
      meta: {
        previousRole: prev || null,
        newRole: nuevoRol,
      },
    });

    return res.json({ message: "Rol actualizado correctamente" });
  } catch (err) {
    console.error("Error en cambiarRol:", err);
    return res.status(500).json({ error: "Error interno al cambiar rol" });
  }
}

async function cambiarEstadoHabitacional(req, res) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) return deny(res);
    if (!ensureAdminGeneral(actor)) return deny(res);

    const { id } = req.params;
    const { estadoHabitacional } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID de usuario inválido" });
    if (!estadoHabitacional) return res.status(400).json({ error: "estadoHabitacional es obligatorio" });

    const usuario = await User.findById(id);
    if (!usuario) return deny(res);

    const prev = usuario.estadoHabitacional;
    usuario.estadoHabitacional = estadoHabitacional;
    await usuario.save();

    await registrarAuditoria(req, {
      action: "ADMIN_CHANGE_HOUSING_STATUS",
      entity: { type: "User", id: usuario._id },
      meta: {
        previousStatus: prev || null,
        newStatus: estadoHabitacional,
      },
    });

    return res.json({ message: "Estado habitacional actualizado correctamente" });
  } catch (err) {
    console.error("Error en cambiarEstadoHabitacional:", err);
    return res.status(500).json({ error: "Error interno al cambiar estado habitacional" });
  }
}

async function cambiarBloqueo(req, res) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) return deny(res);
    if (!ensureAdminGeneral(actor)) return deny(res);

    const { id } = req.params;
    const { bloqueado } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID de usuario inválido" });
    if (bloqueado === undefined) return res.status(400).json({ error: "bloqueado es obligatorio (true/false)" });

    const usuario = await User.findById(id);
    if (!usuario) return deny(res);

    const prev = !!usuario.bloqueado;
    usuario.bloqueado = !!bloqueado;
    await usuario.save();

    await registrarAuditoria(req, {
      action: "ADMIN_TOGGLE_BLOCK",
      entity: { type: "User", id: usuario._id },
      meta: {
        previousBlocked: prev,
        newBlocked: !!bloqueado,
      },
    });

    return res.json({ message: "Bloqueo actualizado correctamente" });
  } catch (err) {
    console.error("Error en cambiarBloqueo:", err);
    return res.status(500).json({ error: "Error interno al cambiar bloqueo" });
  }
}

async function resetearPassword(req, res) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) return deny(res);
    if (!ensureAdminGeneral(actor)) return deny(res);

    const { id } = req.params;
    const { nuevaPassword } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID de usuario inválido" });
    if (!nuevaPassword) return res.status(400).json({ error: "nuevaPassword es obligatoria" });

    const usuario = await User.findById(id);
    if (!usuario) return deny(res);

    usuario.password = nuevaPassword; // asume hashing en pre-save
    await usuario.save();

    // ✅ Auditoría: NO guardar password ni longitud ni hash ni nada.
    await registrarAuditoria(req, {
      action: "ADMIN_RESET_PASSWORD",
      entity: { type: "User", id: usuario._id },
      meta: {
        reset: true,
      },
    });

    return res.json({ message: "Password reseteada correctamente" });
  } catch (err) {
    console.error("Error en resetearPassword:", err);
    return res.status(500).json({ error: "Error interno al resetear password" });
  }
}

async function verHistorial(req, res) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) return deny(res);
    if (!ensureAdminGeneral(actor)) return deny(res);

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID de usuario inválido" });

    const usuario = await User.findById(id);
    if (!usuario) return deny(res);

    // Compat: buscar por usuarioAfectado (viejo) OR entity
    const historial = await AuditLog.find({
    $or: [
      { usuarioAfectado: usuario._id },
      { "entity.type": "User", "entity.id": String(usuario._id) },
      { recursoTipo: "User", recursoId: String(usuario._id) },
    ],
  })
    .sort({ timestamp: -1, fecha: -1, createdAt: -1 })
    .limit(200)
    .lean();
      
    // Auditoría del acceso a historial (sin devolver contenido en el log)
    await registrarAuditoria(req, {
      action: "ADMIN_VIEW_AUDIT_HISTORY",
      entity: { type: "User", id: usuario._id },
      meta: { limit: 200 },
    });

    return res.json({ historial });
  } catch (err) {
    console.error("Error en verHistorial:", err);
    return res.status(500).json({ error: "Error interno al ver historial" });
  }
}

async function asignarViviendaPorOrdenSuperior(req, res) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) return deny(res);
    if (!ensureAdminGeneral(actor)) return deny(res);

    const { id } = req.params;
    const { viviendaId } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID de usuario inválido" });
    if (!mongoose.Types.ObjectId.isValid(viviendaId)) return res.status(400).json({ error: "ID de vivienda inválido" });

    const usuario = await User.findById(id);
    if (!usuario) return deny(res);

    const vivienda = await Vivienda.findById(viviendaId);
    if (!vivienda) return res.status(404).json({ error: "Vivienda no encontrada" });

    usuario.viviendaAsignada = vivienda._id;
    usuario.estadoHabitacional = "VIVIENDA";
    await usuario.save();

    await registrarAuditoria(req, {
      action: "ADMIN_ASSIGN_HOUSE",
      entity: { type: "User", id: usuario._id },
      meta: { viviendaId: String(viviendaId) },
    });

    return res.json({ message: "Vivienda asignada correctamente" });
  } catch (err) {
    console.error("Error en asignarViviendaPorOrdenSuperior:", err);
    return res.status(500).json({ error: "Error interno al asignar vivienda" });
  }
}

async function desasignarViviendaPorOrdenSuperior(req, res) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) return deny(res);
    if (!ensureAdminGeneral(actor)) return deny(res);

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID de usuario inválido" });

    const usuario = await User.findById(id);
    if (!usuario) return deny(res);

    usuario.viviendaAsignada = null;
    if (usuario.estadoHabitacional === "VIVIENDA") usuario.estadoHabitacional = "SIN_DEFINIR";
    await usuario.save();

    await registrarAuditoria(req, {
      action: "ADMIN_UNASSIGN_HOUSE",
      entity: { type: "User", id: usuario._id },
      meta: { viviendaId: null },
    });

    return res.json({ message: "Vivienda desasignada correctamente" });
  } catch (err) {
    console.error("Error en desasignarViviendaPorOrdenSuperior:", err);
    return res.status(500).json({ error: "Error interno al desasignar vivienda" });
  }
}

async function asignarAlojamientoPorOrdenSuperior(req, res) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) return deny(res);
    if (!ensureAdminGeneral(actor)) return deny(res);

    const { id } = req.params;
    const { alojamientoId } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID de usuario inválido" });
    if (!mongoose.Types.ObjectId.isValid(alojamientoId)) return res.status(400).json({ error: "ID de alojamiento inválido" });

    const usuario = await User.findById(id);
    if (!usuario) return deny(res);

    const alojamiento = await Alojamiento.findById(alojamientoId);
    if (!alojamiento) return res.status(404).json({ error: "Alojamiento no encontrado" });

    usuario.alojamientoAsignado = alojamiento._id;
    usuario.estadoHabitacional = "ALOJAMIENTO";
    await usuario.save();

    await registrarAuditoria(req, {
      action: "ADMIN_ASSIGN_LODGING",
      entity: { type: "User", id: usuario._id },
      meta: { alojamientoId: String(alojamientoId) },
    });

    return res.json({ message: "Alojamiento asignado correctamente" });
  } catch (err) {
    console.error("Error en asignarAlojamientoPorOrdenSuperior:", err);
    return res.status(500).json({ error: "Error interno al asignar alojamiento" });
  }
}

async function desasignarAlojamientoPorOrdenSuperior(req, res) {
  try {
    const actor = req.user;
    if (!actor || !actor.role) return deny(res);
    if (!ensureAdminGeneral(actor)) return deny(res);

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID de usuario inválido" });

    const usuario = await User.findById(id);
    if (!usuario) return deny(res);

    usuario.alojamientoAsignado = null;
    if (usuario.estadoHabitacional === "ALOJAMIENTO") usuario.estadoHabitacional = "SIN_DEFINIR";
    await usuario.save();

    await registrarAuditoria(req, {
      action: "ADMIN_UNASSIGN_LODGING",
      entity: { type: "User", id: usuario._id },
      meta: { alojamientoId: null },
    });

    return res.json({ message: "Alojamiento desasignado correctamente" });
  } catch (err) {
    console.error("Error en desasignarAlojamientoPorOrdenSuperior:", err);
    return res.status(500).json({ error: "Error interno al desasignar alojamiento" });
  }
}

module.exports = {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  cambiarRol,
  cambiarEstadoHabitacional,
  cambiarBloqueo,
  resetearPassword,
  verHistorial,
  asignarViviendaPorOrdenSuperior,
  desasignarViviendaPorOrdenSuperior,
  asignarAlojamientoPorOrdenSuperior,
  desasignarAlojamientoPorOrdenSuperior,
};
