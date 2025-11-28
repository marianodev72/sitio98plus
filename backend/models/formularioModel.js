const mongoose = require('mongoose');

const formularioSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Formulario', formularioSchema);
