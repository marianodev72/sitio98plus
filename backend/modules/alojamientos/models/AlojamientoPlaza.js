const mongoose = require("mongoose");
const { Schema } = mongoose;

const { PLAZA_ESTADOS } = require("../constants/alojamientoConstants");

const reservaActualSchema = new Schema(
  {
    usuario: { type: Schema.Types.ObjectId, ref: "User", default: null },
    anexoId: { type: Schema.Types.ObjectId, ref: "FormSubmission", default: null },
    fechaReserva: { type: Date, default: null },
    venceEn: { type: Date, default: null },
  },
  { _id: false }
);

const historialSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    accion: { type: String, trim: true, uppercase: true, required: true },
    alojado: { type: Schema.Types.ObjectId, ref: "User", default: null },
    estadoAnterior: { type: String, enum: PLAZA_ESTADOS },
    estadoNuevo: { type: String, enum: PLAZA_ESTADOS },
    anexoId: { type: Schema.Types.ObjectId, ref: "FormSubmission", default: null },
    realizadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    observacion: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const alojamientoPlazaSchema = new Schema(
  {
    codigo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
      immutable: true,
    },
    alojamiento: {
      type: Schema.Types.ObjectId,
      ref: "AlojamientoNaval",
      required: true,
      index: true,
    },
    numeroPlaza: { type: Number, required: true, min: 1 },
    estado: { type: String, enum: PLAZA_ESTADOS, default: "LIBRE", index: true },
    alojadoActual: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    reservaActual: { type: reservaActualSchema, default: null },
    historial: { type: [historialSchema], default: [] },
    activo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

alojamientoPlazaSchema.index({ alojamiento: 1, numeroPlaza: 1 }, { unique: true });

module.exports =
  mongoose.models.AlojamientoPlaza ||
  mongoose.model("AlojamientoPlaza", alojamientoPlazaSchema);
