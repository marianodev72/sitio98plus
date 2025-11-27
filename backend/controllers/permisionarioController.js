// backend/controllers/permisionarioController.js

const Permisionario = require("../models/permisionarioModel");
const PermisionarioDocumento = require("../models/permisionarioDocumento");
const uploadToMinio = require("../utils/uploadToMinio");

// Obtener datos del permisionario por ID de usuario
exports.getMisDatos = async (req, res) => {
  try {
    const userId = req.user._id;

    const datos = await Permisionario.findOne({ user: userId });

    if (!datos) {
      return res.status(404).json({
        ok: false,
        msg: "No se encontraron datos del permisionario",
      });
    }

    res.json({ ok: true, datos });
  } catch (error) {
    console.error("Error en getMisDatos:", error);
    res.status(500).json({ ok: false, msg: "Error del servidor" });
  }
};

// Actualizar mis datos
exports.actualizarMisDatos = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    const actualizado = await Permisionario.findOneAndUpdate(
      { user: userId },
      updateData,
      { new: true }
    );

    if (!actualizado) {
      return res
        .status(404)
        .json({ ok: false, msg: "Permisionario no encontrado" });
    }

    res.json({ ok: true, datos: actualizado });
  } catch (error) {
    console.error("Error en actualizarMisDatos:", error);
    res.status(500).json({ ok: false, msg: "Error del servidor" });
  }
};

// Subir documento
exports.subirDocumento = async (req, res) => {
  try {
    const userId = req.user._id;
    const archivo = req.file;

    if (!archivo) {
      return res
        .status(400)
        .json({ ok: false, msg: "Debe subir un archivo" });
    }

    const fileUrl = await uploadToMinio(archivo);

    const nuevoDoc = new PermisionarioDocumento({
      user: userId,
      tipo: req.body.tipo || "otro",
      url: fileUrl,
      fechaSubida: new Date(),
    });

    await nuevoDoc.save();

    res.json({ ok: true, documento: nuevoDoc });
  } catch (error) {
    console.error("Error al subir documento:", error);
    res.status(500).json({ ok: false, msg: "Error del servidor" });
  }
};
