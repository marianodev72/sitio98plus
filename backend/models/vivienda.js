// models/vivienda.js
// Modelo Vivienda ZN98 – versión con dormitorios + barrioCodigo

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Subdocumento para ocupación actual e historial
const ocupacionSchema = new Schema(
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
  },
  { _id: false }
);

const viviendaSchema = new Schema(
  {
    // Código único de vivienda (ej: AS-501, PB-501, LM-23, IN-D-01)
    codigo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Nombre del barrio en texto completo (ej: "ALTE STORNI", "CTE. PIEDRABUENA")
    barrio: {
      type: String,
      required: true,
    },

    // Código corto de barrio (AS, AB, PB, LM, IN, OT)
    barrioCodigo: {
      type: String,
      index: true,
    },

    // Número de vivienda / departamento (ej: "501", "D-01")
    numero: {
      type: String,
    },

    // Cantidad de dormitorios de la unidad
    dormitorios: {
      type: Number,
      default: 0,
    },

    // Estado de la vivienda
    estado: {
      type: String,
      enum: ['DISPONIBLE', 'OCUPADA', 'RESERVADA', 'REPARACION'],
      default: 'DISPONIBLE',
    },

    // Ocupación actual (permisionario vigente)
    ocupacionActual: {
      type: ocupacionSchema,
      default: null,
    },

    // Historial de ocupaciones
    historialOcupacion: {
      type: [ocupacionSchema],
      default: [],
    },

    // Campo libre para metadatos
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Evita OverwriteModelError si se requiere el modelo más de una vez
module.exports =
  mongoose.models.Vivienda || mongoose.model('Vivienda', viviendaSchema);
