const service = require("../services/anexo15Service");
const adjuntos = require("../services/anexo15AdjuntoService");
const { renderAnexo15Pdf } = require("../pdf/anexo15PdfRenderer");

function deny(res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

function bad(res) {
  return res.status(400).json({ message: "No es posible procesar la solicitud" });
}

function send(res, result) {
  if (result?.ok) {
    const body = { ok: true };
    if (result.documento) body.documento = result.documento;
    if (result.documentos) body.documentos = result.documentos;
    if (result.adjunto) body.adjunto = result.adjunto;
    return res.status(result.status || 200).json(body);
  }
  if (result?.status === 400) return bad(res);
  if (result?.status === 409) return res.status(409).json({ message: "No es posible procesar la solicitud" });
  return deny(res);
}

async function crear(req, res) {
  try {
    return send(res, await service.crear({ user: req.user, datos: req.body }));
  } catch (err) {
    console.error("[anexo15][crear]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function listarMis(req, res) {
  try {
    return send(res, await service.listarMis({ user: req.user }));
  } catch (err) {
    console.error("[anexo15][listarMis]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function listarInspector(req, res) {
  try {
    return send(res, await service.listarInspector({ user: req.user }));
  } catch (err) {
    console.error("[anexo15][listarInspector]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function listarAdmin(req, res) {
  try {
    return send(res, await service.listarAdmin({ user: req.user }));
  } catch (err) {
    console.error("[anexo15][listarAdmin]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function obtener(req, res) {
  try {
    return send(res, await service.obtener({ token: req.params.token, user: req.user }));
  } catch (err) {
    console.error("[anexo15][obtener]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function actualizar(req, res) {
  try {
    return send(res, await service.actualizar({ token: req.params.token, user: req.user, datos: req.body }));
  } catch (err) {
    console.error("[anexo15][actualizar]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function enviar(req, res) {
  try {
    return send(res, await service.enviar({ token: req.params.token, user: req.user }));
  } catch (err) {
    console.error("[anexo15][enviar]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function anular(req, res) {
  try {
    return send(res, await service.anular({ token: req.params.token, user: req.user }));
  } catch (err) {
    console.error("[anexo15][anular]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function inspectorDevolver(req, res) {
  try {
    return send(res, await service.inspectorDevolver({ token: req.params.token, user: req.user, payload: req.body }));
  } catch (err) {
    console.error("[anexo15][inspectorDevolver]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function inspectorAprobar(req, res) {
  try {
    return send(res, await service.inspectorAprobar({ token: req.params.token, user: req.user, payload: req.body }));
  } catch (err) {
    console.error("[anexo15][inspectorAprobar]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function adminDevolver(req, res) {
  try {
    return send(res, await service.adminDevolver({ token: req.params.token, user: req.user, payload: req.body }));
  } catch (err) {
    console.error("[anexo15][adminDevolver]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function adminAprobar(req, res) {
  try {
    return send(res, await service.adminAprobar({ token: req.params.token, user: req.user, payload: req.body }));
  } catch (err) {
    console.error("[anexo15][adminAprobar]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function subirAdjunto(req, res) {
  try {
    return send(res, await adjuntos.subir({ token: req.params.token, campo: req.params.campo, file: req.file, user: req.user }));
  } catch (err) {
    console.error("[anexo15][subirAdjunto]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function eliminarAdjunto(req, res) {
  try {
    return send(res, await adjuntos.eliminar({ token: req.params.token, adjuntoId: req.params.adjuntoId, user: req.user }));
  } catch (err) {
    console.error("[anexo15][eliminarAdjunto]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function descargarAdjunto(req, res) {
  try {
    const result = await adjuntos.obtenerDescarga({ token: req.params.token, adjuntoId: req.params.adjuntoId, user: req.user });
    if (!result?.ok) return deny(res);
    return adjuntos.stream({ res, download: result });
  } catch (err) {
    console.error("[anexo15][descargarAdjunto]", err?.message || err);
    if (!res.headersSent) return res.status(500).json({ message: "Error interno" });
  }
}

async function pdf(req, res) {
  try {
    const doc = await service.loadByToken(req.params.token);
    if (!doc || !service.canView(req.user, doc)) return deny(res);
    const buffer = await renderAnexo15Pdf(doc);
    const disposition = String(req.path || "").endsWith("/preview") ? "inline" : "attachment";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="ANEXO_15.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(buffer);
  } catch (err) {
    console.error("[anexo15][pdf]", err?.message || err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = {
  crear,
  listarMis,
  listarInspector,
  listarAdmin,
  obtener,
  actualizar,
  enviar,
  anular,
  inspectorDevolver,
  inspectorAprobar,
  adminDevolver,
  adminAprobar,
  subirAdjunto,
  eliminarAdjunto,
  descargarAdjunto,
  pdf,
};
