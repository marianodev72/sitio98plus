// backend/models/Liquidacion.js
// Liquidación por usuario y período — Sistema ZN98 (457/411 + reintegros)

const mongoose = require("mongoose");
const { Schema } = mongoose;

const ESTADO_ENTREGA = ["ENTREGADA", "PENDIENTE_SIN_USUARIO", "PENDIENTE_ERROR"];

const montosSchema = new Schema(
  {
    cod457: { type: Number, default: 0 },
    cod411: { type: Number, default: 0 },
  },
  { _id: false }
);

const origenSchema = new Schema(
  {
    lotePrincipalId: { type: Schema.Types.ObjectId, ref: "LiquidacionLote" },
    loteDescuentosId: { type: Schema.Types.ObjectId, ref: "LiquidacionLote" },
    loteReintegrosId: { type: Schema.Types.ObjectId, ref: "LiquidacionLote" },
    loteParticularesId: { type: Schema.Types.ObjectId, ref: "LiquidacionLote" },
  },
  { _id: false }
);

const liquidacionSchema = new Schema(
  {
    periodo: { type: String, required: true, trim: true, index: true }, // YYYY-MM

    // Identidad institucional
    mr: { type: String, required: true, trim: true, index: true },

    // vínculo real si existe
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },

    // Copia textual (lo que viene del CSV, para trazabilidad)
    grado: { type: String, trim: true, default: "" },
    apellidoNombre: { type: String, trim: true, default: "" },
    vivienda: { type: String, trim: true, default: "" },

    // Componentes
    principal: { type: montosSchema, default: () => ({}) },
    descuentosParticulares: { type: montosSchema, default: () => ({}) },
    reintegrosParticulares: { type: montosSchema, default: () => ({}) },

    estadoEntrega: { type: String, enum: ESTADO_ENTREGA, default: "ENTREGADA", index: true },
    motivoPendiente: { type: String, trim: true, default: "" },

    origen: { type: origenSchema, default: () => ({}) },

    // Retención 1 año
    retenerHasta: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// Un único registro vigente por MR y período (se actualiza con lotes complementarios)
liquidacionSchema.index({ periodo: 1, mr: 1 }, { unique: true });

module.exports = {
  Liquidacion: mongoose.model("Liquidacion", liquidacionSchema),
};
