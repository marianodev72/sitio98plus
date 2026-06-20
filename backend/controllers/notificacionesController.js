const mongoose = require("mongoose");
const { Notificacion } = require("../models/Notificacion");

const PRIORIDAD_ORDEN = { CRITICA: 0, IMPORTANTE: 1, INFO: 2 };

function userId(req) {
  return String(req.user?._id || "").trim();
}

function isObjectIdLike(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function clampLimit(value, fallback, max) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function serializeNotificacion(n) {
  return {
    _id: n._id,
    titulo: n.titulo,
    mensaje: n.mensaje,
    accionTexto: n.accionTexto || "",
    accionUrl: n.accionUrl || "",
    tipo: n.tipo,
    prioridad: n.prioridad || "INFO",
    entidadTipo: n.entidadTipo || "",
    entidadId: n.entidadId || null,
    leida: Boolean(n.leida),
    leidaAt: n.leidaAt || null,
    confirmada: Boolean(n.confirmada),
    confirmadaAt: n.confirmadaAt || null,
    requiereConfirmacion: Boolean(n.requiereConfirmacion),
    createdAt: n.createdAt || null,
  };
}

function sortPendientes(a, b) {
  const pa = PRIORIDAD_ORDEN[a.prioridad] ?? 9;
  const pb = PRIORIDAD_ORDEN[b.prioridad] ?? 9;
  if (pa !== pb) return pa - pb;
  return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
}

async function listarPendientes(req, res) {
  try {
    const uid = userId(req);
    if (!uid) return res.status(401).json({ message: "No autenticado" });

    const limit = clampLimit(req.query?.limit, 10, 20);
    const query = {
      usuario: uid,
      $or: [
        { leida: { $ne: true } },
        { requiereConfirmacion: true, confirmada: { $ne: true } },
      ],
    };

    const rows = await Notificacion.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const notificaciones = rows.sort(sortPendientes).slice(0, limit).map(serializeNotificacion);
    return res.json({ notificaciones });
  } catch (err) {
    console.error("[NOTIFICACIONES] Error listarPendientes:", err?.message || err);
    return res.status(500).json({ message: "No es posible procesar su solicitud" });
  }
}

async function listarMisNotificaciones(req, res) {
  try {
    const uid = userId(req);
    if (!uid) return res.status(401).json({ message: "No autenticado" });

    const limit = clampLimit(req.query?.limit, 50, 100);
    const rows = await Notificacion.find({ usuario: uid })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ notificaciones: rows.map(serializeNotificacion) });
  } catch (err) {
    console.error("[NOTIFICACIONES] Error listarMisNotificaciones:", err?.message || err);
    return res.status(500).json({ message: "No es posible procesar su solicitud" });
  }
}

async function marcarLeida(req, res) {
  try {
    const uid = userId(req);
    const id = String(req.params?.id || "").trim();
    if (!uid || !isObjectIdLike(id)) return res.status(404).json({ message: "Recurso no disponible" });

    const notificacion = await Notificacion.findOne({ _id: id, usuario: uid });
    if (!notificacion) return res.status(404).json({ message: "Recurso no disponible" });

    if (!notificacion.leida) {
      notificacion.leida = true;
      notificacion.leidaAt = new Date();
      await notificacion.save();
    }

    req.audit?.setTarget?.("Notificacion", id);
    return res.json({ ok: true, notificacion: serializeNotificacion(notificacion) });
  } catch (err) {
    console.error("[NOTIFICACIONES] Error marcarLeida:", err?.message || err);
    return res.status(500).json({ message: "No es posible procesar su solicitud" });
  }
}

async function confirmarNotificacion(req, res) {
  try {
    const uid = userId(req);
    const id = String(req.params?.id || "").trim();
    if (!uid || !isObjectIdLike(id)) return res.status(404).json({ message: "Recurso no disponible" });

    const notificacion = await Notificacion.findOne({ _id: id, usuario: uid });
    if (!notificacion) return res.status(404).json({ message: "Recurso no disponible" });

    const now = new Date();
    if (!notificacion.leida) {
      notificacion.leida = true;
      notificacion.leidaAt = now;
    }
    if (!notificacion.confirmada) {
      notificacion.confirmada = true;
      notificacion.confirmadaAt = now;
    }

    await notificacion.save();
    req.audit?.setTarget?.("Notificacion", id);
    return res.json({ ok: true, notificacion: serializeNotificacion(notificacion) });
  } catch (err) {
    console.error("[NOTIFICACIONES] Error confirmarNotificacion:", err?.message || err);
    return res.status(500).json({ message: "No es posible procesar su solicitud" });
  }
}

module.exports = {
  listarPendientes,
  listarMisNotificaciones,
  marcarLeida,
  confirmarNotificacion,
};
