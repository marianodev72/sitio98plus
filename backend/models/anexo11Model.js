// backend/models/anexo11Model.js
const mongoose = require("mongoose");

const PermisionarioSchema = new mongoose.Schema(
  {
    unidad: { type: String, default: "" },
    dpto: { type: String, default: "" },
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
    detalle: { type: String, required: true },
  },
  { _id: false }
);

const HistorialSchema = new mongoose.Schema(
  {
    fecha: { type: Date, default: Date.now },
    actorNombre: { type: String },
    actorRol: {
      type: String,
      enum: ["PERMISIONARIO", "INSPECTOR", "ADMIN_GENERAL"],
    },
    accion: { type: String },
    comentario: { type: String },
  },
  { _id: false }
);

const Anexo11Schema = new mongoose.Schema(
  {
    permisionario: { type: PermisionarioSchema, required: true },

    // Dejamos inspector / admin para futuras etapas, por ahora opcionales:
    inspector: {
      grado: { type: String, default: "" },
      apellidoNombre: { type: String, default: "" },
      descripcionTrabajo: { type: String, default: "" },
      emergencia: { type: Boolean, default: false },
      correspondePermisionario: { type: Boolean, default: true },
      razon: {
        type: String,
        enum: ["SEGURIDAD", "PRESERVACION", "PRESENTACION", ""],
        default: "",
      },
      conCargoA: {
        type: String,
        enum: ["PERMISIONARIO", "VIVIENDAS", ""],
        default: "",
      },
    },

    adminGeneral: {
      observaciones: { type: String, default: "" },
    },

    estado: {
      type: String,
      enum: [
        "INICIADO", // solo permisionario
        "EN_INSPECCION",
        "PENDIENTE_CONFORMIDAD",
        "FINALIZADO",
      ],
      default: "INICIADO",
    },

    historial: [HistorialSchema],

    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Anexo11", Anexo11Schema);
