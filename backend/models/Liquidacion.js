// models/Liquidacion.js
// Liquidaciones de alquiler y expensas por matrícula y período

const mongoose = require("mongoose");

const liquidacionSchema = new mongoose.Schema(
  {
    // Matrícula única del permisionario/alojado
    matricula: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Período de la liquidación (ej: "2025-11" o "202511")
    periodo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    grado: { type: String, trim: true },
    apellido: { type: String, trim: true },
    nombre: { type: String, trim: true },

    alquiler: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    expensas: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Antes de guardar, calculamos total si no coincide
liquidacionSchema.pre("save", function (next) {
  this.total = Number(this.alquiler || 0) + Number(this.expensas || 0);
  next();
});

// Evitamos OverwriteModelError con nodemon
module.exports =
  mongoose.models.Liquidacion ||
  mongoose.model("Liquidacion", liquidacionSchema);
