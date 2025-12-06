// models/Mensaje.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Subdocumento para adjuntos de los mensajes
 * (por si después conectamos con uploadAdjuntos)
 */
const MensajeAdjuntoSchema = new Schema(
  {
    fileId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    nombre: {
      type: String,
      default: '',
    },
    mimetype: {
      type: String,
      default: '',
    },
    size: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

/**
 * Esquema principal de Mensaje
 */
const MensajeSchema = new Schema({
  remitente: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  destinatarios: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  ],

  asunto: {
    type: String,
    default: '',
    trim: true,
  },

  cuerpo: {
    type: String,
    default: '',
    trim: true,
  },

  adjuntos: {
    type: [MensajeAdjuntoSchema],
    default: [],
  },

  // Usuarios que ya marcaron como leído este mensaje
  leidoPor: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  ],

  // Para futuras funciones de “eliminado para X usuario”
  eliminadoPara: [
    {
      usuario: { type: Schema.Types.ObjectId, ref: 'User' },
      fecha: { type: Date, default: Date.now },
    },
  ],

  // Fecha de creación del mensaje (usada en los .sort({ creadoEn: -1 }))
  creadoEn: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Mensaje', MensajeSchema);
