// models/FormSubmission.js
// Envíos de formularios y ANEXOS — Sistema ZN98

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ESTADOS_FORM = [
  'BORRADOR',
  'ENVIADO',
  'EN_REVISION',
  'APROBADO',
  'RECHAZADO',
  'CERRADO',
  'ASIGNADO', // NUEVO ESTADO PARA ANEXO_22 (asignación de tipo de alojamiento)
];

const historialEstadoSchema = new Schema(
  {
    fecha: {
      type: Date,
      default: Date.now,
    },
    estadoAnterior: {
      type: String,
    },
    estadoNuevo: {
      type: String,
      enum: ESTADOS_FORM,
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
    size: Number,
    fechaSubida: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const formSubmissionSchema = new Schema(
  {
    // Referencia a la plantilla (ANEXO / Formulario)
    template: {
      type: Schema.Types.ObjectId,
      ref: 'FormTemplate',
      required: true,
      index: true,
    },

    // Código del anexo / formulario (ej: ANEXO_01, ANEXO_04, ANEXO_21...)
    codigo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // Usuario que crea/envía el formulario
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Datos dinámicos del formulario (según campos del template)
    // Acá podemos guardar, por ej., "estadoAnexo" = EN_ANALISIS / ADJUDICADA / etc
    datos: {
      type: Object,
      default: {},
    },

    // Estado general de workflow del formulario
    estado: {
      type: String,
      enum: ESTADOS_FORM,
      default: 'ENVIADO',
      index: true,
    },

    // Adjuntos (si el formulario lo permite)
    adjuntos: [adjuntoSchema],

    // Historial de cambios de estado
    historialEstados: [historialEstadoSchema],

    // Relación con vivienda o alojamiento si aplica
    vivienda: {
      type: Schema.Types.ObjectId,
      ref: 'Vivienda',
    },
    alojamiento: {
      type: Schema.Types.ObjectId,
      ref: 'Alojamiento',
    },

    // Barrio vinculado (para Jefe de Barrio, inspector, etc.)
    barrio: {
      type: String,
      trim: true,
      index: true,
    },

    // Para uso administrativo (ej: número de expediente)
    numeroExpediente: {
      type: String,
      trim: true,
      index: true,
    },

    // Observaciones internas (no visibles para el usuario común)
    observacionesInternas: [
      {
        fecha: { type: Date, default: Date.now },
        texto: { type: String, trim: true },
        realizadoPor: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

formSubmissionSchema.index({ usuario: 1, codigo: 1, estado: 1 });
formSubmissionSchema.index({ createdAt: 1 });

// Método para cambiar estado con auditoría
formSubmissionSchema.methods.cambiarEstado = function (
  nuevoEstado,
  usuarioResponsable,
  observacion = ''
) {
  const estadoAnterior = this.estado;
  this.estado = nuevoEstado;

  this.historialEstados.push({
    estadoAnterior,
    estadoNuevo: nuevoEstado,
    observacion,
    realizadoPor: usuarioResponsable,
  });
};

const FormSubmission = mongoose.model('FormSubmission', formSubmissionSchema);

module.exports = {
  FormSubmission,
  ESTADOS_FORM,
};
