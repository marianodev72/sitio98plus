// backend/controllers/mensajeController.js

const mongoose = require("mongoose");
// ✅ VOLVEMOS AL IMPORT QUE EXISTE EN TU PROYECTO
const Message = require("../models/Message");

/**
 * Obtener el ID del usuario autenticado de forma segura
 */
function getUserId(req) {
  if (!req.user) return null;
  return req.user._id || req.user.id || null;
}

/**
 * Enviar mensaje
 * - from: usuario autenticado
 * - to: array de destinatarios (ids de usuario)
 * - asunto
 * - cuerpo
 * - adjuntos:
 *    - si viene upload (multer): req.files
 *    - si viene por body (retrocompat): req.body.adjuntos
 */
async function enviarMensaje(req, res) {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // ⚠️ puede venir como para (array) o como para[] (formdata)
    const rawPara = req.body?.para ?? req.body?.["para[]"];
    const para = Array.isArray(rawPara) ? rawPara : rawPara ? [rawPara] : [];

    const asunto = req.body?.asunto || "";
    const cuerpo = req.body?.cuerpo || "";

    if (!Array.isArray(para) || para.length === 0) {
      return res.status(400).json({ error: "Debe indicar al menos un destinatario" });
    }

    // ✅ adjuntos por upload (si existen)
    const adjuntosUpload = Array.isArray(req.files)
      ? req.files.map((f) => ({
          // mantenemos estructura base; si tu schema tiene fileId obligatorio lo generamos
          fileId: new mongoose.Types.ObjectId(),
          nombre: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
          // guardamos path público (server expone /uploads)
          path: `/uploads/mensajes/${f.filename}`,
        }))
      : [];

    // ✅ retrocompat: adjuntos desde body (si tu implementación previa lo usaba)
    const adjuntosBody = Array.isArray(req.body?.adjuntos) ? req.body.adjuntos : [];

    const nuevoMensaje = new Message({
      remitente: new mongoose.Types.ObjectId(usuarioId),
      destinatarios: para.map((id) => new mongoose.Types.ObjectId(id)),
      asunto,
      cuerpo,
      adjuntos: [...adjuntosBody, ...adjuntosUpload],
      leidoPor: [],
    });

    await nuevoMensaje.save();

    return res.status(201).json({
      message: "Mensaje enviado correctamente",
      mensajeId: nuevoMensaje._id,
    });
  } catch (err) {
    console.error("Error al enviar mensaje:", err);
    return res.status(500).json({ error: "Error interno al enviar mensaje" });
  }
}

/**
 * Listar bandeja de entrada del usuario autenticado
 */
async function listarEntrada(req, res) {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const mensajes = await Message.find({
      destinatarios: new mongoose.Types.ObjectId(usuarioId),
    })
      .sort({ creadoEn: -1 })
      .lean();

    return res.json(mensajes);
  } catch (err) {
    console.error("Error al listar bandeja de entrada:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}

/**
 * Listar mensajes enviados por el usuario autenticado
 */
async function listarEnviados(req, res) {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const mensajes = await Message.find({
      remitente: new mongoose.Types.ObjectId(usuarioId),
    })
      .sort({ creadoEn: -1 })
      .lean();

    return res.json(mensajes);
  } catch (err) {
    console.error("Error al listar enviados:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}

/**
 * Obtener un mensaje por ID, verificando acceso
 */
async function obtenerMensaje(req, res) {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de mensaje inválido" });
    }

    const mensaje = await Message.findById(id).lean();
    if (!mensaje) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    const esRemitente = String(mensaje.remitente) === String(usuarioId);
    const esDestinatario = Array.isArray(mensaje.destinatarios) && mensaje.destinatarios.some((d) => String(d) === String(usuarioId));

    if (!esRemitente && !esDestinatario) {
      return res.status(403).json({ error: "No tiene acceso a este mensaje" });
    }

    return res.json(mensaje);
  } catch (err) {
    console.error("Error al obtener mensaje:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}

/**
 * Marcar mensaje como leído
 */
async function marcarComoLeido(req, res) {
  try {
    const usuarioId = getUserId(req);
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de mensaje inválido" });
    }

    const mensaje = await Message.findById(id);
    if (!mensaje) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    const esDestinatario = Array.isArray(mensaje.destinatarios) && mensaje.destinatarios.some((d) => String(d) === String(usuarioId));
    if (!esDestinatario) {
      return res.status(403).json({ error: "Solo los destinatarios pueden marcar como leído" });
    }

    if (!mensaje.leidoPor) mensaje.leidoPor = [];
    if (!mensaje.leidoPor.some((u) => String(u) === String(usuarioId))) {
      mensaje.leidoPor.push(new mongoose.Types.ObjectId(usuarioId));
      await mensaje.save();
    }

    return res.json({ message: "Mensaje marcado como leído" });
  } catch (err) {
    console.error("Error al marcar mensaje como leído:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}

/**
 * Auditoría (lista todos)
 */
async function listarTodos(req, res) {
  try {
    const mensajes = await Message.find({}).sort({ creadoEn: -1 }).lean();
    return res.json(mensajes);
  } catch (err) {
    console.error("Error al listar todos los mensajes:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}

module.exports = {
  enviarMensaje,
  listarEntrada,
  listarEnviados,
  obtenerMensaje,
  marcarComoLeido,
  listarTodos,
};
