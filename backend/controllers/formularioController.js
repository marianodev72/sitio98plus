const mongoose = require("mongoose");
const { FormTemplate } = require("../models/FormTemplate");
const { FormSubmission } = require("../models/FormSubmission");

let Vivienda;
try {
  Vivienda = require("../models/Vivienda");
} catch {
  Vivienda = require("../models/vivienda");
}

let User = null;
try {
  ({ User } = require("../models/User"));
} catch {}

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));
const up = (v) => String(v || "").toUpperCase().trim();

/* ───────────── CREAR ANEXO (01,02,…) ───────────── */
async function crearAnexo(req, res) {
  try {
    const codigo = up(req.params.codigo);
    const user = req.user;

    let datos = req.body?.datos ?? req.body;
    if (typeof datos === "string") datos = JSON.parse(datos || "{}");
    if (!datos || typeof datos !== "object") {
      return res.status(400).json({ message: "Falta 'datos' (objeto) en el body." });
    }

    const template = await FormTemplate.findOne({ code: codigo, activo: true });
    if (!template) {
      return res.status(404).json({ message: `No existe plantilla activa para ${codigo}` });
    }

    if (codigo === "ANEXO_02") {
      if (!isObjectId(datos.anexo01Id)) return res.status(400).json({ message: "Requiere anexo01Id válido" });
      if (!isObjectId(datos.postulanteId)) return res.status(400).json({ message: "Requiere postulanteId válido" });
      if (!isObjectId(datos.viviendaId)) return res.status(400).json({ message: "Requiere viviendaId válido" });
    }

    const adjuntos = [];
    (req.files || []).forEach((f) =>
      adjuntos.push({
        nombre: f.originalname,
        ruta: f.path.replace(/\\/g, "/"),
        tipo: f.mimetype,
        size: f.size,
      })
    );

    const sub = await FormSubmission.create({
      template: template._id,
      codigo,
      usuario: user._id,
      datos,
      estado: "ENVIADO",
      adjuntos,
      vivienda: datos.viviendaId || undefined,
    });

    return res.status(201).json({ anexo: sub });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error creando anexo" });
  }
}

/* ───────────── LISTAR POR CÓDIGO (ADMIN) ───────────── */
async function listarPorCodigo(req, res) {
  const codigo = up(req.params.codigo);
  const anexos = await FormSubmission.find({ codigo })
    .populate("usuario", "nombre apellido email")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ anexos });
}

/* ───────────── MIS ANEXOS ───────────── */
async function getMisAnexos(req, res) {
  const user = req.user;
  const codigo = req.query.codigo ? up(req.query.codigo) : null;

  let filtro = { usuario: user._id };
  if (codigo === "ANEXO_02" && up(user.role) === "POSTULANTE") {
    filtro = {
      codigo: "ANEXO_02",
      $or: [{ usuario: user._id }, { "datos.postulanteId": user._id }],
    };
  } else if (codigo) {
    filtro = { usuario: user._id, codigo };
  }

  const anexos = await FormSubmission.find(filtro).sort({ createdAt: -1 }).lean();
  res.json({ anexos });
}

/* ───────────── CONFORMIDAD POSTULANTE ───────────── */
async function darConformidad(req, res) {
  const { id } = req.params;
  const user = req.user;

  const anexo = await FormSubmission.findById(id);
  if (!anexo) return res.status(404).json({ message: "No encontrado" });
  if (up(anexo.codigo) !== "ANEXO_02") return res.status(400).json({ message: "Solo ANEXO_02" });
  if (String(anexo.datos?.postulanteId) !== String(user._id)) {
    return res.status(403).json({ message: "No autorizado" });
  }

  if (["EN_REVISION", "CERRADO"].includes(anexo.estado)) {
    return res.json({ anexo });
  }

  anexo.datos.conformidadPostulante = {
    ok: true,
    fecha: new Date(),
    usuario: user._id,
  };
  anexo.estado = "EN_REVISION";
  await anexo.save();

  res.json({ anexo });
}

/* ───────────── CIERRE ADMIN GENERAL ───────────── */
async function darConformidadAdmin(req, res) {
  const { id } = req.params;
  const anexo = await FormSubmission.findById(id);
  if (!anexo) return res.status(404).json({ message: "No encontrado" });
  if (!anexo.datos?.conformidadPostulante?.ok) {
    return res.status(400).json({ message: "Falta conformidad postulante" });
  }
  if (anexo.estado !== "EN_REVISION") {
    return res.status(400).json({ message: "Estado inválido" });
  }

  anexo.estado = "CERRADO";
  anexo.datos.conformidadAdminGeneral = {
    ok: true,
    fecha: new Date(),
    usuario: req.user._id,
  };
  await anexo.save();

  if (Vivienda && isObjectId(anexo.datos.viviendaId)) {
    const v = await Vivienda.findById(anexo.datos.viviendaId);
    if (v && v.estado === "DISPONIBLE") {
      v.estado = "RESERVADA";
      await v.save();
    }
  }

  if (User && isObjectId(anexo.datos.postulanteId)) {
    await User.updateOne(
      { _id: anexo.datos.postulanteId },
      { $set: { role: "PERMISIONARIO_SIN_OCUPACION" } }
    );
  }

  res.json({ anexo });
}

module.exports = {
  crearAnexo,
  listarPorCodigo,
  getMisAnexos,
  darConformidad,
  darConformidadAdmin,
};
