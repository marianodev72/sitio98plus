// backend/models/Vivienda.js
const mongoose = require("mongoose");
const { TIPOS_DESTINO } = require("../constants/institucional");

// ─────────────────────────────
// Subdocumento: ocupación actual
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

// ─────────────────────────────
// 🔹 Historial de cambios de estado institucional
const historialEstadoSchema = new mongoose.Schema(
  {
    fecha: { type: Date, default: Date.now },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    estadoAnterior: String,
    estadoNuevo: String,

    observacion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Acciones conflictivas permitidas bajo responsabilidad institucional
    forzado: { type: Boolean, default: false },
  },
  { _id: false }
);

// ─────────────────────────────
// Modelo Vivienda
const viviendaSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true },
    barrio: { type: String, required: true },
    dormitorios: { type: Number, default: 0 },

    estado: {
      type: String,
      enum: [
        "DISPONIBLE",
        "A_DESOCUPARSE",
        "OCUPADA",
        "RESERVADA",
        "REPARACION",
        "BAJA",
      ],
      default: "DISPONIBLE",
    },

    cantidadHabitantes: { type: Number, default: 0 },
    tipoDestino: {
      type: String,
      enum: TIPOS_DESTINO,
    },

    ocupacionActual: ocupacionSchema,

    // 🧾 Historial institucional de estados
    historialEstados: {
      type: [historialEstadoSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Vivienda || mongoose.model("Vivienda", viviendaSchema);
