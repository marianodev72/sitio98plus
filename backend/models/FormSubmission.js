// models/FormSubmission.js
// Instancia concreta de un formulario (ANEXO) completado por algún usuario

const mongoose = require("mongoose");
const { Schema } = mongoose;

const historialSchema = new Schema(
  {
    usuario: { type: Schema.Types.ObjectId, ref: "User" },
    accion: { type: String, trim: true },
    comentario: { type: String, trim: true },
    fecha: { type: Date, default: Date.now },
  },
  { _id: false }
);

const archivoAdjuntoSchema = new Schema(
  {
    nombreOriginal: { type: String, trim: true },
    nombreAlmacenado: { type: String, trim: true },
    ruta: { type: String, trim: true },
    size: { type: Number },
    mimeType: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const formSubmissionSchema = new Schema(
  {
    // Plantilla a la que pertenece (ANEXO_02_PERMISIONARIO, etc.)
    template: {
      type: Schema.Types.ObjectId,
      ref: "FormTemplate",
      required: true,
    },

    // Código de plantilla (ej: ANEXO_08_PERMISIONARIO)
    tipoFormulario: {
      type: String,
      required: true,
      index: true,
      trim: true,
      uppercase: true,
    },

    // 🔹 Código legible de la instancia:
    // Ej: ANEXO_08_K01_16_11_25
    codigoInstancia: {
      type: String,
      trim: true,
      index: true,
    },

    // Quién creó el formulario (permisionario, inspector, admin, etc.)
    userCreador: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // A quién se refiere (titular de la vivienda / trámite)
    userTitular: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Vivienda asociada (si corresponde)
    vivienda: {
      type: Schema.Types.ObjectId,
      ref: "Vivienda",
      default: null,
    },

    // Postulación asociada (si corresponde)
    postulacion: {
      type: Schema.Types.ObjectId,
      ref: "Postulacion",
      default: null,
    },

    // Alojamiento asociado (para anexos de alojados, en el futuro)
    alojamiento: {
      type: Schema.Types.ObjectId,
      ref: "Alojamiento",
      default: null,
    },

    // Datos propios del formulario (campos del anexo)
    datos: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Estado del trámite del formulario
    estado: {
      type: String,
      enum: ["BORRADOR", "ENVIADO", "APROBADO", "RECHAZADO", "CERRADO"],
      default: "ENVIADO",
      index: true,
    },

    // Historial de intervenciones (quién hizo qué, cuándo)
    historial: {
      type: [historialSchema],
      default: [],
    },

    // Archivos adjuntos vinculados a este formulario (si en el futuro se asocian)
    archivosAdjuntos: {
      type: [archivoAdjuntoSchema],
      default: [],
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model("FormSubmission", formSubmissionSchema);
