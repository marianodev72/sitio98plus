// backend/models/permisionarioMensajeModel.js

const mongoose = require("mongoose");

const AdjuntosSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
  },
  { _id: false }
);

const PermisionarioMensajeSchema = new mongoose.Schema(
  {
    // Quién envía el mensaje
    remitente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    remitenteRole: {
      type: String,
      required: true,
    },

    // Destinatario directo (para mensajes personales)
    destinatario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Rol al que va dirigido el mensaje
    destinatarioRole: {
      type: String,
      enum: [
        "PERMISIONARIO",
        "INSPECTOR",
        "JEFE_BARRIO",
        "ADMINISTRACION",
        "ADMIN",
        "ENCARGADO_GENERAL",
      ],
      required: true,
    },

    // Tipo de destino (deja preparado general / barrio)
    tipoDestino: {
      type: String,
      enum: ["PERSONAL", "GENERAL", "BARRIO"],
      default: "PERSONAL",
    },

    // Para mensajes generales por barrio (a futuro)
    barrioDestino: {
      type: String,
      default: null,
    },

    // Contenido
    asunto: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    mensaje: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },

    // Adjuntos (PDF / imágenes)
    adjuntos: [AdjuntosSchema],

    // Estado de lectura
    leidoPorDestinatario: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model(
  "PermisionarioMensaje",
  PermisionarioMensajeSchema
);
