// backend/controllers/permisionarioComunicacionesController.js

const PermisionarioMensaje = require("../models/permisionarioMensajeModel");

// --------------------------------------------------------------------
// GET /api/permisionario/comunicaciones
// Lista mensajes donde el usuario es remitente o destinatario
// --------------------------------------------------------------------
exports.listarMisComunicaciones = async (req, res) => {
  try {
    // auth.js deja { id, role } en req.user
    const userId = req.user && req.user.id;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        msg: "No autenticado.",
      });
    }

    const mensajes = await PermisionarioMensaje.find({
      $or: [{ remitente: userId }, { destinatario: userId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      ok: true,
      comunicaciones: mensajes.map((m) => ({
        id: m._id,
        asunto: m.asunto,
        mensaje: m.mensaje,
        remitenteRole: m.remitenteRole,
        destinatarioRole: m.destinatarioRole,
        tipoDestino: m.tipoDestino,
        barrioDestino: m.barrioDestino,
        adjuntos: m.adjuntos || [],
        leidoPorDestinatario: m.leidoPorDestinatario,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error en listarMisComunicaciones:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener comunicaciones.",
    });
  }
};

// --------------------------------------------------------------------
// POST /api/permisionario/comunicaciones
// Crea un mensaje DESDE el permisionario hacia:
//  - INSPECTOR / JEFE_BARRIO / ADMINISTRACION / ADMIN / ENCARGADO_GENERAL
//  Prohibimos Permisionario → Permisionario
//  Permite adjuntar PDF/JPG/PNG (campo adjuntos)
// --------------------------------------------------------------------
exports.crearComunicacion = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const remitenteRole = req.user && req.user.role;

    if (!userId || !remitenteRole) {
      return res.status(401).json({
        ok: false,
        msg: "No autenticado.",
      });
    }

    const { asunto, mensaje, destinatarioRole, tipoDestino, barrioDestino } =
      req.body || {};

    if (!asunto || !mensaje || !destinatarioRole) {
      return res.status(400).json({
        ok: false,
        msg: "Debés completar asunto, mensaje y destinatario.",
      });
    }

    // Sólo permisionarios usan este endpoint
    if (String(remitenteRole).toUpperCase() !== "PERMISIONARIO") {
      return res.status(403).json({
        ok: false,
        msg: "Solo los permisionarios pueden usar este recurso.",
      });
    }

    // No permitir mensajes Permisionario → Permisionario
    if (String(destinatarioRole).toUpperCase() === "PERMISIONARIO") {
      return res.status(400).json({
        ok: false,
        msg: "No se permiten mensajes entre permisionarios.",
      });
    }

    // Adjuntos desde multer
    const adjuntos = (req.files || []).map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      path: `uploads/comunicaciones/${f.filename}`,
    }));

    const nuevoMensaje = new PermisionarioMensaje({
      remitente: userId,
      remitenteRole,
      destinatario: null, // se puede completar luego si hay usuario concreto
      destinatarioRole,
      tipoDestino: tipoDestino || "PERSONAL",
      barrioDestino: barrioDestino || null,
      asunto: String(asunto).trim(),
      mensaje: String(mensaje).trim(),
      adjuntos,
    });

    await nuevoMensaje.save();

    return res.status(201).json({
      ok: true,
      comunicacion: {
        id: nuevoMensaje._id,
        asunto: nuevoMensaje.asunto,
        mensaje: nuevoMensaje.mensaje,
        remitenteRole: nuevoMensaje.remitenteRole,
        destinatarioRole: nuevoMensaje.destinatarioRole,
        tipoDestino: nuevoMensaje.tipoDestino,
        barrioDestino: nuevoMensaje.barrioDestino,
        adjuntos: nuevoMensaje.adjuntos,
        leidoPorDestinatario: nuevoMensaje.leidoPorDestinatario,
        createdAt: nuevoMensaje.createdAt,
        updatedAt: nuevoMensaje.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error en crearComunicacion:", error);
    return res.status(500).json({
      ok: false,
      msg: "No se pudo enviar la comunicación. Intentá nuevamente.",
    });
  }
};
