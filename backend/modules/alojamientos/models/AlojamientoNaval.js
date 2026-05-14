const mongoose = require("mongoose");
const { Schema } = mongoose;

const {
  CLASES_ALOJAMIENTO,
  GENERO_PERMITIDO,
  ALOJAMIENTO_ESTADOS,
} = require("../constants/alojamientoConstants");

const ocupacionActualSchema = new Schema(
  {
    plazasTotales: { type: Number, default: 0, min: 0 },
    plazasOcupadas: { type: Number, default: 0, min: 0 },
    plazasReservadas: { type: Number, default: 0, min: 0 },
    alojados: [{ type: Schema.Types.ObjectId, ref: "User" }],
    actualizadoEn: { type: Date, default: Date.now },
  },
  { _id: false }
);

const historialOcupacionSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    accion: { type: String, trim: true, uppercase: true, required: true },
    alojado: { type: Schema.Types.ObjectId, ref: "User", default: null },
    plaza: { type: Schema.Types.ObjectId, ref: "AlojamientoPlaza", default: null },
    estadoAnterior: { type: String, trim: true, uppercase: true },
    estadoNuevo: { type: String, trim: true, uppercase: true },
    anexoId: { type: Schema.Types.ObjectId, ref: "FormSubmission", default: null },
    realizadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    observacion: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const historialEstadoSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    estadoAnterior: { type: String, enum: ALOJAMIENTO_ESTADOS },
    estadoNuevo: { type: String, enum: ALOJAMIENTO_ESTADOS, required: true },
    realizadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    motivo: { type: String, trim: true, maxlength: 1000 },
    origen: { type: String, trim: true, uppercase: true },
  },
  { _id: false }
);

const origenImportacionSchema = new Schema(
  {
    archivo: { type: String, trim: true },
    importBatchId: { type: String, trim: true, index: true },
    hashFila: { type: String, trim: true },
    fechaImportacion: { type: Date },
  },
  { _id: false }
);

const alojamientoNavalSchema = new Schema(
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
    dependencia: { type: String, required: true, trim: true, index: true },
    lugar: { type: String, required: true, trim: true, index: true },
    sector: { type: String, trim: true, default: "" },
    tipo: { type: String, required: true, trim: true, index: true },
    numero: { type: String, required: true, trim: true },
    clase: { type: String, required: true, enum: CLASES_ALOJAMIENTO, index: true },
    capacidad: { type: Number, required: true, min: 1 },
    generoPermitido: {
      type: String,
      required: true,
      enum: GENERO_PERMITIDO,
      index: true,
    },
    localidad: { type: String, trim: true, default: "" },
    provincia: { type: String, trim: true, default: "" },
    observaciones: { type: String, trim: true, default: "" },
    activo: { type: Boolean, default: true, index: true },
    estado: {
      type: String,
      enum: ALOJAMIENTO_ESTADOS,
      default: "DISPONIBLE",
      index: true,
    },
    ocupacionActual: { type: ocupacionActualSchema, default: () => ({}) },
    historialOcupacion: { type: [historialOcupacionSchema], default: [] },
    historialEstados: { type: [historialEstadoSchema], default: [] },
    origenImportacion: { type: origenImportacionSchema, default: null },
  },
  { timestamps: true }
);

alojamientoNavalSchema.index({
  dependencia: 1,
  lugar: 1,
  sector: 1,
  tipo: 1,
  numero: 1,
});

module.exports =
  mongoose.models.AlojamientoNaval ||
  mongoose.model("AlojamientoNaval", alojamientoNavalSchema);
