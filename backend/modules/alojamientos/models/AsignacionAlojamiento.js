const mongoose = require("mongoose");
const { Schema } = mongoose;

const ASIGNACION_ESTADOS = Object.freeze(["RESERVADA", "ACTIVA", "FINALIZADA", "ANULADA"]);

const auditoriaSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    accion: { type: String, trim: true, uppercase: true, required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    estadoAnterior: { type: String, enum: ASIGNACION_ESTADOS },
    estadoNuevo: { type: String, enum: ASIGNACION_ESTADOS },
    observacion: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const asignacionAlojamientoSchema = new Schema(
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
    plaza: {
      type: Schema.Types.ObjectId,
      ref: "AlojamientoPlaza",
      required: true,
      index: true,
    },
    alojado: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    estado: {
      type: String,
      enum: ASIGNACION_ESTADOS,
      required: true,
      default: "RESERVADA",
      index: true,
    },
    origen: { type: String, trim: true, uppercase: true, default: "MANUAL_ADMIN" },
    fechaReserva: { type: Date, default: null },
    fechaInicio: { type: Date, default: null },
    fechaFin: { type: Date, default: null },
    observaciones: { type: String, trim: true, maxlength: 1000, default: "" },
    creadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actualizadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    auditoria: { type: [auditoriaSchema], default: [] },
  },
  { timestamps: true }
);

asignacionAlojamientoSchema.index(
  { plaza: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: { $in: ["RESERVADA", "ACTIVA"] } },
  }
);

asignacionAlojamientoSchema.index(
  { alojado: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: { $in: ["RESERVADA", "ACTIVA"] } },
  }
);

module.exports =
  mongoose.models.AsignacionAlojamiento ||
  mongoose.model("AsignacionAlojamiento", asignacionAlojamientoSchema);

module.exports.ASIGNACION_ESTADOS = ASIGNACION_ESTADOS;
