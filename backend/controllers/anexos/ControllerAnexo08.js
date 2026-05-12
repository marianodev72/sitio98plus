// backend/controllers/anexos/ControllerAnexo08.js

const mongoose = require("mongoose");
const { Types } = mongoose;

function isObjectId(id) {
  return Types.ObjectId.isValid(id);
}

function deepDenyPoison(obj) {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      delete obj[key];
    } else if (typeof obj[key] === "object") {
      deepDenyPoison(obj[key]);
    }
  }
}

function mergeAllowed(target, source, allowedKeys) {
  for (const key of allowedKeys) {
    if (source[key] !== undefined) {
      target[key] = source[key];
    }
  }
}

async function updateByInspector(ctx) {
  const { req, res, user, models } = ctx;
  const { FormSubmission } = models;

  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const submission = await FormSubmission.findById(id);

    if (!submission) {
      return res.status(404).json({ error: "Formulario no encontrado" });
    }

    if (submission.codigo !== "ANEXO_08") {
      return res.status(400).json({ error: "No es ANEXO_08" });
    }

    if (["CERRADO", "ANULADO", "EN_REVISION"].includes(submission.estado)) {
      return res.status(400).json({ error: "No editable en este estado" });
    }

    let incoming = req.body?.datos;

    if (!incoming) {
      return res.status(400).json({ error: "datos requerido" });
    }

    if (typeof incoming === "string") {
      try {
        incoming = JSON.parse(incoming);
      } catch {
        return res.status(400).json({ error: "datos inválido" });
      }
    }

    deepDenyPoison(incoming);

    if (!submission.datos) submission.datos = {};

    const allowedKeys = [
      "gradoPermisionario",
      "direccionUnidad",
      "direccion",
      "localidad",
      "provincia",
      "inspectorBarrio",
      "lugar",
      "lugarInspeccion",
      "fechaInspeccion",
      "reparacionesArmada",
      "reparacionesPermisionario",
      "representante1",
      "representante2",
      "observacionesInspector",
      "lugarFirma",
      "fechaFirma"
    ];

    mergeAllowed(submission.datos, incoming, allowedKeys);

    submission.datos.ultimaActualizacionInspector = {
      fecha: new Date(),
      usuario: user?.id || user?._id
    };

    if (!submission.datos.intervencionesInspectorHistorial) {
      submission.datos.intervencionesInspectorHistorial = [];
    }

    submission.datos.intervencionesInspectorHistorial.push({
      fecha: new Date(),
      usuario: user?.id || user?._id,
      cambios: incoming
    });

    submission.markModified("datos");

    await submission.save();

    return res.json({ anexo: submission.toObject() });
  } catch (err) {
    console.error("updateByInspector error:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}

module.exports = {
  updateByInspector
};
