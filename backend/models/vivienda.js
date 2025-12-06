// models/vivienda.js
// Modelo de Vivienda Fiscal para el sistema ZN98

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ESTADOS_VIVIENDA = [
  'DISPONIBLE',
  'OCUPADA',
  'RESERVADA',
  'ASIGNADA_FUTURA',
  'MANTENIMIENTO',
  'BAJA',
];

// Ocupación actual (permisionario en este momento)
const OcupacionActualSchema = new Schema(
  {
    permisionario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    fechaAsignacion: {
      type: Date,
    },
    fechaDesocupacionPrevista: {
      type: Date,
    },
    recordatorio90Enviado: {
      type: Boolean,
      default: false,
    },
    motivo: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// Historial de ocupaciones
const HistorialOcupacionSchema = new Schema(
  {
    permisionario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    fechaIngreso: {
      type: Date,
    },
    fechaEgreso: {
      type: Date,
    },
    motivo: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const ViviendaSchema = new Schema(
  {
    // Código interno: K01, M12, etc.
    codigo: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      index: true,
    },

    // Dirección textual completa
    direccion: {
      type: String,
      trim: true,
    },

    // Barrio / complejo / conjunto
    barrio: {
      type: String,
      trim: true,
      index: true,
    },

    // Alguna descripción libre (piso, torre, etc.)
    descripcion: {
      type: String,
      trim: true,
    },

    // Estado operativo de la vivienda
    estado: {
      type: String,
      enum: ESTADOS_VIVIENDA,
      default: 'DISPONIBLE',
      index: true,
    },

    // Ocupación actual (permisionario y fechas)
    ocupacionActual: {
      type: OcupacionActualSchema,
      default: null,
    },

    // Historial de ocupaciones
    historialOcupacion: {
      type: [HistorialOcupacionSchema],
      default: [],
    },

    // Meta / datos adicionales flexibles
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Índices útiles
ViviendaSchema.index({ barrio: 1, codigo: 1 });
ViviendaSchema.index({ estado: 1 });

// Export del modelo evitando OverwriteModelError
const Vivienda =
  mongoose.models.Vivienda || mongoose.model('Vivienda', ViviendaSchema);

module.exports = Vivienda;
