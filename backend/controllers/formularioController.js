const Formulario = require('../models/formularioModel');

exports.list = async (_req, res) => {
  try {
    const items = await Formulario.find().sort({ createdAt: -1 });
    res.json({ ok: true, items });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};
