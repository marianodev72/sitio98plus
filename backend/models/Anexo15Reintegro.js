const crypto = require("crypto");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const {
  ANEXO15_ESTADOS,
  ANEXO15_ROLES,
} = require("../constants/anexo15Constants");

const actorSnapshotSchema = new Schema(
  {
    nombre: { type: String, trim: true, maxlength: 200, default: "" },
    rol: { type: String, trim: true, uppercase: true, maxlength: 60, default: "" },
  },
  { _id: false }
);

const adjuntoSchema = new Schema(
  {
    id: { type: String, required: true },
    campo: { type: String, trim: true, maxlength: 80, required: true },
    nombreOriginal: { type: String, trim: true, maxlength: 180, required: true },
    mime: { type: String, trim: true, required: true },
    size: { type: Number, required: true },
    sha256: { type: String, trim: true, required: true },
    fechaSubida: { type: Date, default: Date.now },
    subidoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    subidoPorSnapshot: { type: actorSnapshotSchema, default: () => ({}) },
    storageKey: { type: String, required: true, select: false },
    path: { type: String, required: true, select: false },
  },
  { _id: false }
);

const historialEstadoSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    estadoAnterior: { type: String, enum: ANEXO15_ESTADOS },
    estadoNuevo: { type: String, enum: ANEXO15_ESTADOS, required: true },
    observacion: { type: String, trim: true, maxlength: 1200, default: "" },
    realizadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorSnapshot: { type: actorSnapshotSchema, default: () => ({}) },
  },
  { _id: false }
);

const intervencionSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    tipo: { type: String, trim: true, uppercase: true, required: true },
    observacion: { type: String, trim: true, maxlength: 2000, default: "" },
    resultado: { type: String, trim: true, uppercase: true, maxlength: 80, default: "" },
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorSnapshot: { type: actorSnapshotSchema, default: () => ({}) },
  },
  { _id: false }
);

const intervinienteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rol: { type: String, trim: true, uppercase: true, enum: ANEXO15_ROLES, required: true },
    nombre: { type: String, trim: true, maxlength: 200, default: "" },
  },
  { _id: false }
);

const signerSchema = new Schema(
  {
    tipo: { type: String, trim: true, uppercase: true, enum: ANEXO15_ROLES },
    nombre: { type: String, trim: true, maxlength: 200, default: "" },
    rol: { type: String, trim: true, uppercase: true, maxlength: 60, default: "" },
    fecha: { type: Date, default: Date.now },
    fuente: { type: String, trim: true, uppercase: true, maxlength: 120, default: "" },
  },
  { _id: false }
);

const anexo15Schema = new Schema(
  {
    publicToken: {
      type: String,
      unique: true,
      index: true,
      default: () => `A15-${crypto.randomUUID()}`,
    },
    codigo: { type: String, default: "ANEXO_15", immutable: true, index: true },
    estado: { type: String, enum: ANEXO15_ESTADOS, default: "BORRADOR", index: true },
    estadoInstitucional: { type: String, trim: true, uppercase: true, default: "BORRADOR" },
    solicitante: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    solicitanteRol: { type: String, trim: true, uppercase: true, enum: ["PERMISIONARIO", "ALOJADO"], required: true },
    vivienda: { type: Schema.Types.ObjectId, ref: "Vivienda", default: null, index: true },
    asignacionAlojamiento: { type: Schema.Types.ObjectId, ref: "AsignacionAlojamiento", default: null, index: true },
    datos: { type: Object, default: {} },
    adjuntos: { type: [adjuntoSchema], default: [] },
    historialEstados: { type: [historialEstadoSchema], default: [] },
    intervenciones: { type: [intervencionSchema], default: [] },
    intervinientes: { type: [intervinienteSchema], default: [] },
    signers: { type: [signerSchema], default: [] },
    creadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actualizadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    activo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

anexo15Schema.index({ solicitante: 1, estado: 1, activo: 1 });
anexo15Schema.index({ "datos.viviendaSnapshot.barrio": 1, estado: 1, activo: 1 });

module.exports =
  mongoose.models.Anexo15Reintegro ||
  mongoose.model("Anexo15Reintegro", anexo15Schema);
