// backend/models/LiquidacionLote.js
// Lote de carga de liquidaciones por período (YYYY-MM) — Sistema ZN98

const mongoose = require("mongoose");
const { Schema } = mongoose;

const TIPOS = ["PRINCIPAL", "DESCUENTOS", "REINTEGROS", "PARTICULARES"];
const ESTADOS = ["BORRADOR", "CONFIRMADO", "REEMPLAZADO"];

const pendienteSchema = new Schema(
  {
    mr: { type: String, trim: true },
    motivo: { type: String, trim: true },
    fila: { type: Number },
  },
  { _id: false }
);

const archivoSchema = new Schema(
  {
    originalName: { type: String, trim: true },
    storedName: { type: String, trim: true },
    path: { type: String, trim: true },
    size: { type: Number },
    sha256: { type: String, trim: true },
  },
  { _id: false }
);

const resumenSchema = new Schema(
  {
    filas: { type: Number, default: 0 },
    asignadas: { type: Number, default: 0 },
    pendientes: { type: Number, default: 0 },
    duplicadas: { type: Number, default: 0 },
    invalidas: { type: Number, default: 0 },
  },
  { _id: false }
);

const liquidacionLoteSchema = new Schema(
  {
    periodo: { type: String, required: true, trim: true, index: true }, // YYYY-MM
    tipo: { type: String, required: true, enum: TIPOS, index: true },
    version: { type: Number, default: 1 },

    estado: { type: String, enum: ESTADOS, default: "BORRADOR", index: true },

    cargadoPor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    archivo: archivoSchema,

    resumen: resumenSchema,
    pendientes: { type: [pendienteSchema], default: [] },

    // Hard retention: 1 año
    retenerHasta: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// Para evitar dos confirmados del mismo tipo/período/version:
liquidacionLoteSchema.index({ periodo: 1, tipo: 1, version: 1 }, { unique: true });

module.exports = {
  LiquidacionLote: mongoose.model("LiquidacionLote", liquidacionLoteSchema),
};
