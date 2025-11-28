// models/Alojamiento.js
// Catálogo de tipos de alojamiento para Alojados ZN98
//
// Cada registro del CSV representa un "tipo de alojamiento":
//   ALOJAMIENTOS;TIPO;LUGAR
//   CAMAROTE;1;BNUS
//   CUSO;2;ANEXO
//
// IMPORTANTE: No marcamos ocupación ni titular.
// Puede haber muchos alojados en el mismo tipo de alojamiento.

const mongoose = require("mongoose");

const alojamientoSchema = new mongoose.Schema(
  {
    // Ej: "CAMAROTE", "CUSO"
    alojamiento: {
      type: String,
      required: true,
      trim: true,
    },

    // Ej: "1", "2", "50" (lo dejamos como string para no atarnos al formato)
    tipo: {
      type: String,
      required: true,
      trim: true,
    },

    // Ej: "BNUS", "ANEXO", "VVFF"
    lugar: {
      type: String,
      required: true,
      trim: true,
    },

    // Código único para identificar rápidamente el tipo
    // Ej: "CAMAROTE 1 BNUS"
    codigo: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Evitar OverwriteModelError en recargas de nodemon
module.exports =
  mongoose.models.Alojamiento ||
  mongoose.model("Alojamiento", alojamientoSchema);
