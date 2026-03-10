// backend/models/Mantenimiento.js
const mongoose = require("mongoose");

const ArchivoSchema = new mongoose.Schema(
  {
    fileId: { type: String, required: true },
    nombre: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },   // solo server-side
    sha256: { type: String, required: true }, // integridad interna
  },
  { _id: false }
);

const IntervencionSchema = new mongoose.Schema(
  {
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    actorNombre: { type: String, default: "" },
    accion: { type: String, required: true },
    resultado: { type: String, required: true },
    fecha: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MantenimientoSchema = new mongoose.Schema(
  {
    viviendaId: { type: String, required: true },
    viviendaDisplay: { type: String, required: true },
    barrio: { type: String, required: true },

    permisionarioId: { type: String, required: true },
    permisionarioDisplay: { type: String, required: true },

    submittedAt: { type: Date, default: Date.now },

    tipoMantenimiento: {
      type: String,
      enum: [
        "MANTENIMIENTO_ARTEFACTOS_A_GAS",
        "SISTEMA_DE_CALEFACCION_POR_CALDERA",
        "DESAGUES",
        "OTROS",
      ],
      required: true,
    },

    tecnicoInterviniente: { type: String, default: "" },

    inspectorDecision: { type: String, enum: ["PENDIENTE", "SI", "NO"], default: "PENDIENTE" },
    adminDecision: { type: String, enum: ["PENDIENTE", "SI", "NO"], default: "PENDIENTE" },
    isClosed: { type: Boolean, default: false },

    archivos: { type: [ArchivoSchema], default: [] },
    intervenciones: { type: [IntervencionSchema], default: [] },
  },
  { timestamps: true }
);

MantenimientoSchema.index({ permisionarioId: 1, submittedAt: -1 });
MantenimientoSchema.index({ barrio: 1, submittedAt: -1 });
MantenimientoSchema.index({ viviendaId: 1, submittedAt: -1 });

module.exports = { Mantenimiento: mongoose.model("Mantenimiento", MantenimientoSchema) };
