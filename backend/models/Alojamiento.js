// models/Alojamiento.js
// Modelo de TIPO de Alojamiento — Sistema ZN98
// Representa categorías como C01, C02, etc., sin límite de uso.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const alojamientoSchema = new Schema(
  {
    // Código del tipo de alojamiento (ej.: C01, C02, HAB_FAM_01, etc.)
    codigo: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    // Nombre legible del tipo de alojamiento
    nombre: {
      type: String,
      required: true,
      trim: true,
    },

    // Descripción opcional (por ejemplo: "Camarote estándar", "Habitación familiar", etc.)
    descripcion: {
      type: String,
      trim: true,
    },

    // Ubicación general o referencia (si aplica)
    ubicacion: {
      type: String,
      trim: true,
    },

    // Notas internas de administración / administrador general
    notasInternas: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

alojamientoSchema.index({ codigo: 1 });

const Alojamiento = mongoose.model('Alojamiento', alojamientoSchema);

module.exports = {
  Alojamiento,
};
