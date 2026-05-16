const mongoose = require("mongoose");
const { Schema } = mongoose;

const {
  ALOJAMIENTO_DOCUMENTO_CODIGOS,
  ALOJAMIENTO_DOCUMENTO_ESTADOS,
  ALOJAMIENTO_DOCUMENTO_ROLES,
  ALOJAMIENTO_DOCUMENTOS_UNICOS_POR_ORIGEN,
} = require("../constants/alojamientoDocumentoConstants");

const historialEstadoSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    estadoAnterior: { type: String, enum: ALOJAMIENTO_DOCUMENTO_ESTADOS },
    estadoNuevo: {
      type: String,
      enum: ALOJAMIENTO_DOCUMENTO_ESTADOS,
      required: true,
    },
    observacion: { type: String, trim: true, maxlength: 1000 },
    realizadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    rolActor: { type: String, trim: true, uppercase: true },
  },
  { _id: false }
);

const intervencionSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    tipo: { type: String, trim: true, uppercase: true, required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    rolActor: { type: String, trim: true, uppercase: true },
    observacion: { type: String, trim: true, maxlength: 2000 },
    datos: { type: Object, default: {} },
  },
  { _id: false }
);

const conformidadSchema = new Schema(
  {
    tipo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      enum: ALOJAMIENTO_DOCUMENTO_ROLES,
    },
    ok: { type: Boolean, default: false },
    usuario: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rol: { type: String, trim: true, uppercase: true },
    fecha: { type: Date, default: Date.now },
    observacion: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const signerSchema = new Schema(
  {
    tipo: { type: String, trim: true, uppercase: true },
    usuario: { type: Schema.Types.ObjectId, ref: "User", default: null },
    nombre: { type: String, trim: true, maxlength: 200 },
    rol: { type: String, trim: true, uppercase: true },
    fecha: { type: Date, default: null },
    fuente: { type: String, trim: true, uppercase: true },
  },
  { _id: false }
);

const intervinienteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rol: {
      type: String,
      trim: true,
      uppercase: true,
      enum: ALOJAMIENTO_DOCUMENTO_ROLES,
      required: true,
    },
  },
  { _id: false }
);

const alojamientoDocumentoSchema = new Schema(
  {
    codigo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      enum: ALOJAMIENTO_DOCUMENTO_CODIGOS,
      index: true,
    },
    estado: {
      type: String,
      enum: ALOJAMIENTO_DOCUMENTO_ESTADOS,
      default: "BORRADOR",
      index: true,
    },
    estadoInstitucional: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      index: true,
    },
    datos: { type: Object, default: {} },
    historialEstados: { type: [historialEstadoSchema], default: [] },
    intervenciones: { type: [intervencionSchema], default: [] },
    conformidades: { type: [conformidadSchema], default: [] },
    signers: { type: [signerSchema], default: [] },
    intervinientes: { type: [intervinienteSchema], default: [] },
    derivadoDe: {
      type: Schema.Types.ObjectId,
      ref: "AlojamientoDocumento",
      default: null,
      index: true,
    },
    alojamiento: {
      type: Schema.Types.ObjectId,
      ref: "AlojamientoNaval",
      default: null,
      index: true,
    },
    plaza: {
      type: Schema.Types.ObjectId,
      ref: "AlojamientoPlaza",
      default: null,
      index: true,
    },
    asignacion: {
      type: Schema.Types.ObjectId,
      ref: "AsignacionAlojamiento",
      default: null,
      index: true,
    },
    solicitante: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    alojado: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    inspector: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    creadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actualizadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    activo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

alojamientoDocumentoSchema.index({ codigo: 1, estado: 1, activo: 1 });
alojamientoDocumentoSchema.index({ codigo: 1, solicitante: 1, activo: 1 });
alojamientoDocumentoSchema.index({ codigo: 1, alojado: 1, activo: 1 });
alojamientoDocumentoSchema.index(
  { codigo: 1, derivadoDe: 1 },
  {
    unique: true,
    partialFilterExpression: {
      activo: true,
      derivadoDe: { $type: "objectId" },
      codigo: { $in: ALOJAMIENTO_DOCUMENTOS_UNICOS_POR_ORIGEN },
    },
  }
);

alojamientoDocumentoSchema.methods.cambiarEstado = function (
  nuevoEstado,
  usuarioResponsable,
  observacion = "",
  rolActor = ""
) {
  const estadoAnterior = this.estado;
  this.estado = nuevoEstado;
  this.historialEstados.push({
    estadoAnterior,
    estadoNuevo: nuevoEstado,
    observacion,
    realizadoPor: usuarioResponsable || null,
    rolActor,
  });
};

module.exports =
  mongoose.models.AlojamientoDocumento ||
  mongoose.model("AlojamientoDocumento", alojamientoDocumentoSchema);
