// backend/models/Vivienda.js
const mongoose = require("mongoose");

const ocupacionSchema = new mongoose.Schema(
  {
    permisionario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    fechaAsignacion: Date,
    observacion: String,
  },
  { _id: false }
);

const viviendaSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true },
    barrio: { type: String, required: true },
    dormitorios: { type: Number, default: 0 },

    estado: {
      type: String,
      enum: ["DISPONIBLE", "OCUPADA", "RESERVADA", "REPARACION", "BAJA"],
      default: "DISPONIBLE",
    },

    cantidadHabitantes: { type: Number, default: 0 },

    ocupacionActual: ocupacionSchema,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Vivienda ||
  mongoose.model("Vivienda", viviendaSchema);
