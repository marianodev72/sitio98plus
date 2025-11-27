// backend/models/Anexo11.js
const mongoose = require("mongoose");

const PermisionarioSchema = new mongoose.Schema(
  {
    unidad: { type: String, required: true },
    dpto: { type: String, required: true },
    mb: { type: String, default: "" },
    mz: { type: String, default: "" },
    casa: { type: String, default: "" },
    grado: { type: String, default: "" },
    apellidoNombre: { type: String, default: "" },
    solicita: {
      type: String,
      enum: ["CAMBIO", "REPARACION", "VERIFICACION", "PROVISION"],
      required: true,
    },
    detalle: { type: String, default: "" },
  },
  { _id: false }
);

const HistorialEstadoSchema = new mongoose.Schema(
  {
    estado: {
      type: String,
      enum: ["ABIERTO", "EN_CURSO", "FINALIZADO"],
      default: "ABIERTO",
    },
    fecha: { type: Date, default: Date.now },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    observaciones: { type: String, default: "" },
  },
  { _id: false }
);

const Anexo11Schema = new mongoose.Schema(
  {
    numero: { type: Number }, // opcional, por si luego querés numerar
    permisionario: { type: PermisionarioSchema, required: true },

    // referencia al usuario que inició el pedido
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    estado: {
      type: String,
      enum: ["ABIERTO", "EN_CURSO", "FINALIZADO"],
      default: "ABIERTO",
    },

    historialEstados: { type: [HistorialEstadoSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Anexo11", Anexo11Schema);
