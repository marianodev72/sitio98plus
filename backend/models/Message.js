// models/Message.js
// Mensajería interna ZN98

const mongoose = require("mongoose");

const ROLES = [
  "POSTULANTE",
  "PERMISIONARIO",
  "ALOJADO",
  "INSPECTOR",
  "JEFE_BARRIO",
  "ADMINISTRACION",
  "ENCARGADO_GENERAL",
  "ADMIN",
];

const MessageSchema = new mongoose.Schema(
  {
    // emisor
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromRole: {
      type: String,
      required: true,
      enum: ROLES,
    },
    fromBarrio: {
      type: String,
      default: null, // barrio del emisor (si aplica)
    },

    // destino (directo o por rol/barrio)
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    toRole: {
      type: String,
      enum: ROLES,
      default: null,
    },
    toBarrio: {
      type: String,
      default: null, // para broadcasts por barrio
    },

    // contenido
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },

    // tipo de envío: directo o broadcast (por rol/barrio)
    kind: {
      type: String,
      required: true,
      enum: ["DIRECT", "BROADCAST"],
    },

    // estado de lectura
    readAt: {
      type: Date,
      default: null,
    },

    // auditoría mínima
    meta: {
      ip: String,
      userAgent: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
