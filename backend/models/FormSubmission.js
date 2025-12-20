// backend/models/FormSubmission.js
// Envíos de formularios y ANEXOS — Sistema ZN98 / Sitio 98

const mongoose = require("mongoose");
const { Schema } = mongoose;

const ESTADOS_FORM = [
  "BORRADOR",
  "ENVIADO",
  "EN_REVISION",
  "APROBADO",
  "RECHAZADO",
  "CERRADO",
  "ASIGNADO", // para ANEXO_02 si se usa
];

const historialEstadoSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    estadoAnterior: { type: String },
    estadoNuevo: { type: String, enum: ESTADOS_FORM },
    observacion: { type: String, trim: true },
    realizadoPor: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const adjuntoSchema = new Schema(
  {
    nombre: String,
    ruta: String,
    tipo: String, // mimetype (pdf, jpg, png)
    size: Number,
    fechaSubida: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conformidadSchema = new Schema(
  {
    ok: { type: Boolean, default: false },
    fecha: { type: Date },
    usuario: { type: Schema.Types.ObjectId, ref: "User" },
    observacion: { type: String, trim: true },
  },
  { _id: false }
);

const intervinienteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rol: { type: String, trim: true, uppercase: true }, // POSTULANTE | PERMISIONARIO | INSPECTOR | JEFE_DE_BARRIO | ALOJADO
  },
  { _id: false }
);

const formSubmissionSchema = new Schema(
  {
    template: {
      type: Schema.Types.ObjectId,
      ref: "FormTemplate",
      required: true,
      index: true,
    },

    codigo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    usuario: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    datos: { type: Object, default: {} },

    estado: {
      type: String,
      enum: ESTADOS_FORM,
      default: "ENVIADO",
      index: true,
    },

    // ✅ Estado institucional (solo cuando aplica: 01/21, cierres con novedades, etc.)
    estadoInstitucional: { type: String, trim: true, uppercase: true, default: null, index: true },

    adjuntos: [adjuntoSchema],
    historialEstados: [historialEstadoSchema],

    vivienda: { type: Schema.Types.ObjectId, ref: "Vivienda" },
    alojamiento: { type: Schema.Types.ObjectId, ref: "Alojamiento" },

    barrio: { type: String, trim: true, index: true },
    numeroExpediente: { type: String, trim: true, index: true },

    observacionesInternas: [
      {
        fecha: { type: Date, default: Date.now },
        texto: { type: String, trim: true },
        realizadoPor: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // ✅ Conformidad postulante (ANEXO_02 / ANEXO_22)
    conformidadPostulante: { type: conformidadSchema, default: null },

    // ✅ Intervinientes del trámite (visibilidad)
    intervinientes: { type: [intervinienteSchema], default: [] },

    // ✅ Encadenado simple para anexos derivados (02→03, 03→07)
    derivadoDe: { type: Schema.Types.ObjectId, ref: "FormSubmission", default: null, index: true },
  },
  { timestamps: true }
);

formSubmissionSchema.index({ usuario: 1, codigo: 1, estado: 1 });
formSubmissionSchema.index({ createdAt: 1 });

formSubmissionSchema.methods.cambiarEstado = function (nuevoEstado, usuarioResponsable, observacion = "") {
  const estadoAnterior = this.estado;
  this.estado = nuevoEstado;
  this.historialEstados.push({
    estadoAnterior,
    estadoNuevo: nuevoEstado,
    observacion,
    realizadoPor: usuarioResponsable,
  });
};

const FormSubmission = mongoose.model("FormSubmission", formSubmissionSchema);

module.exports = {
  FormSubmission,
  ESTADOS_FORM,
};
