// routes/mensajes.js
// Sistema de mensajería interna ZN98 usando backend/models/Message.js

const express = require("express");
const router = express.Router();

const Message = require("../models/Message");
const User = require("../models/User");

// -----------------------------------------------------------------------------
// Helper: mapear rol del usuario al rol esperado por el modelo de mensajes
// En el schema de Message aparece 'ADMIN_GENERAL', pero en User usamos 'ADMIN'.
// -----------------------------------------------------------------------------
function mapRoleToMessageRole(role) {
  if (!role) return null;
  if (role === "ADMIN") return "ADMIN_GENERAL";
  return role;
}

// -----------------------------------------------------------------------------
// Helper: verificar si el usuario está autenticado (requireAuth va antes, pero
// por las dudas validamos que req.user exista).
// -----------------------------------------------------------------------------
function getAuthUser(req, res) {
  const u = req.user;
  if (!u || !u.id || !u.role) {
    res.status(401).json({ message: "No autenticado" });
    return null;
  }
  return u;
}

// -----------------------------------------------------------------------------
// POST /api/mensajes
// Crea un mensaje: DIRECT o BROADCAST
// Body esperado:
// {
//   "kind": "DIRECT" | "BROADCAST",
//   "subject": "titulo",
//   "body": "contenido",
//   "toUserId": "id opcional",
//   "toRole": "ROL_OPCIONAL",
//   "toBarrio": "BARRIO_OPCIONAL"
// }
// -----------------------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;

    const { kind, subject, body, toUserId, toRole, toBarrio } = req.body || {};

    if (!kind || !subject || !body) {
      return res.status(400).json({
        message:
          "Campos requeridos: kind, subject y body.",
      });
    }

    if (!["DIRECT", "BROADCAST"].includes(kind)) {
      return res.status(400).json({
        message: "kind debe ser DIRECT o BROADCAST.",
      });
    }

    const fromRoleMsg = mapRoleToMessageRole(authUser.role);
    if (!fromRoleMsg) {
      return res.status(400).json({
        message: "Rol del emisor inválido para mensajería.",
      });
    }

    let toUser = null;
    if (toUserId) {
      const u = await User.findById(toUserId).select("_id");
      if (!u) {
        // Mensaje genérico, no damos pistas
        return res.status(400).json({
          message: "No se pudo procesar el mensaje.",
        });
      }
      toUser = u._id;
    }

    let toRoleMapped = null;
    if (toRole) {
      toRoleMapped = mapRoleToMessageRole(toRole);
    }

    if (kind === "DIRECT" && !toUser && !toRoleMapped) {
      return res.status(400).json({
        message:
          "Para mensajes DIRECT debe indicar toUserId o toRole.",
      });
    }

    if (kind === "BROADCAST" && !toRoleMapped) {
      return res.status(400).json({
        message:
          "Para mensajes BROADCAST debe indicar toRole (y opcionalmente toBarrio).",
      });
    }

    const msg = await Message.create({
      subject: String(subject).trim(),
      body: String(body).trim(),
      kind,
      fromUser: authUser.id,
      fromRole: fromRoleMsg,
      fromBarrio: null, // a futuro podemos usar barrio del usuario
      toUser: toUser || null,
      toRole: toRoleMapped || null,
      toBarrio: toBarrio ? String(toBarrio).trim() : null,
      readAt: null,
      meta: {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
      },
    });

    return res.status(201).json({
      ok: true,
      message: msg,
    });
  } catch (err) {
    console.error("POST /api/mensajes", err);
    return res
      .status(500)
      .json({ message: "Error creando mensaje" });
  }
});

// -----------------------------------------------------------------------------
// Helper: armar filtro de mensajes recibidos para el usuario
// -----------------------------------------------------------------------------
function buildInboxFilter(authUser) {
  const roleMsg = mapRoleToMessageRole(authUser.role);
  const userId = authUser.id;

  const or = [];

  // Mensajes directos al usuario
  or.push({ kind: "DIRECT", toUser: userId });

  // Mensajes directos al rol
  if (roleMsg) {
    or.push({ kind: "DIRECT", toRole: roleMsg });
    // Broadcasts por rol
    or.push({ kind: "BROADCAST", toRole: roleMsg });
  }

  return { $or: or };
}

// -----------------------------------------------------------------------------
// GET /api/mensajes
// ?box=IN  -> bandeja de entrada
// ?box=OUT -> enviados
// default: IN
// -----------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;

    const box = (req.query.box || "IN").toUpperCase();

    let filter = {};
    if (box === "OUT") {
      filter = { fromUser: authUser.id };
    } else {
      // IN
      filter = buildInboxFilter(authUser);
    }

    const mensajes = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      ok: true,
      box,
      mensajes,
    });
  } catch (err) {
    console.error("GET /api/mensajes", err);
    return res
      .status(500)
      .json({ message: "Error obteniendo mensajes" });
  }
});

// -----------------------------------------------------------------------------
// GET /api/mensajes/unread-count
// Devuelve cantidad de mensajes no leídos para el usuario
// -----------------------------------------------------------------------------
router.get("/unread-count", async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;

    const baseFilter = buildInboxFilter(authUser);

    const filter = {
      $and: [baseFilter, { $or: [{ readAt: null }, { readAt: { $exists: false } }] }],
    };

    const count = await Message.countDocuments(filter);
    return res.json({ ok: true, count });
  } catch (err) {
    console.error("GET /api/mensajes/unread-count", err);
    return res
      .status(500)
      .json({ message: "Error obteniendo cantidad de no leídos" });
  }
});

// -----------------------------------------------------------------------------
// GET /api/mensajes/:id
// Ver un mensaje. Si el usuario es destinatario y aún no está leído, se marca
// readAt con la fecha/hora actual.
// -----------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;

    const { id } = req.params;

    const msg = await Message.findById(id);
    if (!msg) {
      return res.status(404).json({ message: "Mensaje no encontrado" });
    }

    const roleMsg = mapRoleToMessageRole(authUser.role);
    const userId = String(authUser.id);

    const esEmisor = String(msg.fromUser) === userId;

    let esReceptor = false;
    if (msg.kind === "DIRECT") {
      if (msg.toUser && String(msg.toUser) === userId) {
        esReceptor = true;
      }
      if (msg.toRole && msg.toRole === roleMsg) {
        esReceptor = true;
      }
    } else if (msg.kind === "BROADCAST") {
      if (msg.toRole && msg.toRole === roleMsg) {
        esReceptor = true;
      }
    }

    if (!esEmisor && !esReceptor) {
      return res.status(403).json({ message: "No tiene acceso a este mensaje" });
    }

    // Si es receptor y todavía no fue marcado como leído → registrar readAt
    if (esReceptor && !msg.readAt) {
      msg.readAt = new Date();
      await msg.save();
    }

    return res.json({ ok: true, mensaje: msg });
  } catch (err) {
    console.error("GET /api/mensajes/:id", err);
    return res
      .status(500)
      .json({ message: "Error obteniendo mensaje" });
  }
});

// -----------------------------------------------------------------------------
// POST /api/mensajes/:id/read
// Marca como leído explícitamente (alternativo a GET /:id)
// -----------------------------------------------------------------------------
router.post("/:id/read", async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;

    const { id } = req.params;

    const msg = await Message.findById(id);
    if (!msg) {
      return res.status(404).json({ message: "Mensaje no encontrado" });
    }

    const roleMsg = mapRoleToMessageRole(authUser.role);
    const userId = String(authUser.id);

    let esReceptor = false;
    if (msg.kind === "DIRECT") {
      if (msg.toUser && String(msg.toUser) === userId) {
        esReceptor = true;
      }
      if (msg.toRole && msg.toRole === roleMsg) {
        esReceptor = true;
      }
    } else if (msg.kind === "BROADCAST") {
      if (msg.toRole && msg.toRole === roleMsg) {
        esReceptor = true;
      }
    }

    if (!esReceptor) {
      return res.status(403).json({
        message: "No tiene permiso para marcar este mensaje como leído",
      });
    }

    if (!msg.readAt) {
      msg.readAt = new Date();
      await msg.save();
    }

    return res.json({ ok: true, readAt: msg.readAt });
  } catch (err) {
    console.error("POST /api/mensajes/:id/read", err);
    return res
      .status(500)
      .json({ message: "Error marcando mensaje como leído" });
  }
});

module.exports = router;
