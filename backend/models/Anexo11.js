// backend/models/Anexo11.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

// ---------------------------------------------------------------------------
// Sub-esquemas
// ---------------------------------------------------------------------------

const ViviendaSchema = new Schema(
  {
    unidad: { type: String, trim: true },
    dpto: { type: String, trim: true },
    mb: { type: String, trim: true },
    mz: { type: String, trim: true },
    casa: { type: String, trim: true },
  },
  { _id: false }
);

const PermisionarioSchema = new Schema(
  {
    usuario: { type: Schema.Types.ObjectId, ref: "User", required: true },
    grado: { type: String, trim: true },
    nombreCompleto: { type: String, trim: true },
  },
  { _id: false }
);

const HistorialSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String, trim: true },
    accion: { type: String, trim: true, required: true }, // p.ej. "CREADO"
    observaciones: { type: String, trim: true },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Esquema principal Anexo 11
// ---------------------------------------------------------------------------

const Anexo11Schema = new Schema(
  {
    numero: { type: Number, index: true }, // opcional, para numeración secuencial futura

    permisionario: {
      type: PermisionarioSchema,
      required: true,
    },

    vivienda: {
      type: ViviendaSchema,
      required: true,
    },

    tipoSolicitud: {
      type: String,
      enum: ["CAMBIO", "REPARACION", "VERIFICACION", "PROVISION"],
      required: true,
    },

    detallePedido: {
      type: String,
      required: true,
      trim: true,
    },

    estado: {
      type: String,
      enum: ["ENVIADO", "EN_ANALISIS", "APROBADO", "RECHAZADO", "CERRADO"],
      default: "ENVIADO",
      index: true,
    },

    historial: {
      type: [HistorialSchema],
      default: [],
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const Anexo11 = mongoose.model("Anexo11", Anexo11Schema);

module.exports = Anexo11;
