// models/AuditLog.js
// Registro de auditoría — Sistema ZN98
// Guarda quién hizo qué, cuándo y sobre qué recurso.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Guardamos el rol del usuario al momento de la acción (por trazabilidad)
    rolEnMomento: {
      type: String,
      trim: true,
    },

    // Tipo de acción: VIEW, DOWNLOAD, CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ASSIGN, etc.
    accion: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Tipo de recurso afectado: POSTULACION, VIVIENDA, ALOJAMIENTO, FORMULARIO, MENSAJE, etc.
    recursoTipo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // ID del recurso afectado (por ejemplo, ID de Postulacion, Vivienda, etc.)
    recursoId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Información adicional opcional (ej: IP, descripción, observaciones)
    detalle: {
      type: String,
      trim: true,
    },

    // IP aproximada (si decidimos registrarla)
    ip: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // createdAt = momento de la acción
  }
);

auditLogSchema.index({ accion: 1, recursoTipo: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  AuditLog,
};
