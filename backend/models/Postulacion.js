// models/Postulacion.js
// Modelo oficial de Postulación — Sistema ZN98
// Versión unificada, segura y lista para backend institucional.

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Estados permitidos según reglamento administrativo
const POSTULACION_ESTADOS = [
  'EN_ANALISIS',
  'PENDIENTE_DOCUMENTACION',
  'ACEPTADA',
  'RECHAZADA',
  'ASIGNADA',
];

// Tipos de postulación
const POSTULACION_TIPOS = ['VIVIENDA', 'ALOJAMIENTO'];

const historialSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    estadoAnterior: { type: String },
    estadoNuevo: {
      type: String,
      enum: POSTULACION_ESTADOS,
    },
    observacion: {
      type: String,
      trim: true,
    },
    realizadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
);

const adjuntoSchema = new Schema(
  {
    nombre: String,
    ruta: String,
    tipo: String, // pdf, jpg, png
    size: Number, // en bytes
    fechaSubida: { type: Date, default: Date.now },
  },
  { _id: false }
);

const postulacionSchema = new Schema(
  {
    // Usuario que realiza la postulación
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Tipo de postulación
    tipo: {
      type: String,
      enum: POSTULACION_TIPOS,
      required: true,
      index: true,
    },

    // Estado administrativo
    estado: {
      type: String,
      enum: POSTULACION_ESTADOS,
      default: 'EN_ANALISIS',
      index: true,
    },

    // Fecha y certificación de envío
    fechaEnvio: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Datos recogidos del FORMULARIO (dinámico)
    datosFormulario: {
      type: Object,
      default: {},
    },

    // Adjuntos (PDF/JPG)
    adjuntos: [adjuntoSchema],

    // Historial de estados (auditoría completa)
    historial: [historialSchema],

    // Observaciones de administración o administrador general
    observacionesInternas: [
      {
        fecha: { type: Date, default: Date.now },
        texto: { type: String, trim: true },
        realizadoPor: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // Para asignación futura
    viviendaAsignada: { type: Schema.Types.ObjectId, ref: 'Vivienda' },
    alojamientoAsignado: { type: Schema.Types.ObjectId, ref: 'Alojamiento' },
  },
  {
    timestamps: true,
  }
);

// Indices recomendados
postulacionSchema.index({ usuario: 1, tipo: 1 });
postulacionSchema.index({ estado: 1, tipo: 1 });
postulacionSchema.index({ fechaEnvio: 1 });

// Método para registrar cambios de estado
postulacionSchema.methods.cambiarEstado = function (
  nuevoEstado,
  usuarioResponsable,
  observacion = ''
) {
  const estadoAnterior = this.estado;
  this.estado = nuevoEstado;

  this.historial.push({
    estadoAnterior,
    estadoNuevo: nuevoEstado,
    observacion,
    realizadoPor: usuarioResponsable,
  });
};

const Postulacion = mongoose.model('Postulacion', postulacionSchema);

module.exports = {
  Postulacion,
  POSTULACION_ESTADOS,
  POSTULACION_TIPOS,
};
