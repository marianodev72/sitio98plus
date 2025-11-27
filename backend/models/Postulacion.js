// backend/models/Postulacion.js
// Modelo de Postulación ZN98 (viviendas / alojamientos)

const mongoose = require("mongoose");
const { Schema } = mongoose;

// -----------------------------------------------------------------------------
// Subdocumento: archivos adjuntos de la postulación
// -----------------------------------------------------------------------------
const archivoSchema = new Schema(
  {
    nombreSistema: { type: String, required: true }, // nombre renombrado en el servidor
    nombreOriginal: { type: String, required: true }, // nombre original subido por el usuario
    tipo: { type: String }, // mimetype (image/jpeg, application/pdf, etc.)
    size: { type: Number }, // tamaño en bytes
    rutaRelativa: { type: String }, // ruta relativa desde backend/, ej: /uploads/postulaciones/123.pdf
  },
  { _id: false }
);

// -----------------------------------------------------------------------------
// Subdocumento: entrada de historial (cambios de estado, etc.)
// -----------------------------------------------------------------------------
const historialSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    accion: { type: String, required: true }, // "CREADA", "ESTADO_CAMBIADO", etc.
    usuario: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    detalle: { type: String },
  },
  { _id: false }
);

// -----------------------------------------------------------------------------
// Esquema principal de Postulación
// -----------------------------------------------------------------------------
const postulacionSchema = new Schema(
  {
    // Usuario titular de la postulación (POSTULANTE autenticado)
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Tipo de postulación: vivienda fiscal o alojamiento
    tipo: {
      type: String,
      enum: ["VIVIENDA", "ALOJAMIENTO"],
      required: true,
    },

    // Estado actual de la postulación
    estado: {
      type: String,
      enum: ["EN_ANALISIS", "APROBADA", "RECHAZADA"],
      default: "EN_ANALISIS",
    },

    // Datos del ANEXO 1 (estructura flexible, tal como la envía el frontend)
    datosPersonales: {
      type: Schema.Types.Mixed,
      default: {},
    },

    convivientes: {
      type: [Schema.Types.Mixed], // { apellidoNombres, relacion, aCargo, edad, dni, diba }
      default: [],
    },

    animales: {
      type: [Schema.Types.Mixed], // { especie, raza, edad, sexo, peso }
      default: [],
    },

    preferencias: {
      type: Schema.Types.Mixed, // { barrioPreferido, tipoVivienda, ... }
      default: {},
    },

    declaraciones: {
      type: Schema.Types.Mixed, // { socioeconomico, propietarioZona, etc. }
      default: {},
    },

    // Capacidad familiar total (titular + convivientes a cargo)
    capacidadTotal: {
      type: Number,
      default: 1,
    },

    // Barrio preferido "canonizado" para filtros rápidos
    barrioPreferidoCanonico: {
      type: String,
      default: "",
      index: true,
    },

    // Archivos adjuntos (PDF / imágenes)
    archivos: {
      type: [archivoSchema],
      default: [],
    },

    // Historial de acciones
    historial: {
      type: [historialSchema],
      default: [],
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Evitamos OverwriteModelError en desarrollo
module.exports =
  mongoose.models.Postulacion ||
  mongoose.model("Postulacion", postulacionSchema);
