// backend/models/AuditLog.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * AuditLog (A6)
 * Registro forense institucional:
 * - quién: actorId + actorRole
 * - qué: action + targetType/targetId + method/path
 * - cuándo: timestamps/createdAt
 * - contexto: ip + userAgent + statusCode + durationMs
 * - metadata: SOLO allowlist (sin sensibles)
 *
 * Campos canónicos para Módulo Auditoría Institucional:
 * actorId, actorRole, action, targetType, targetId, createdAt, requestId
 */
const AuditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorRole: { type: String, default: "", index: true },

    action: { type: String, required: true, index: true },

    targetType: { type: String, default: "", index: true },
    targetId: { type: String, default: "", index: true },

    // ✅ CANÓNICO (sin índice nuevo acá)
    requestId: { type: String, default: "" },

    method: { type: String, default: "" },
    path: { type: String, default: "" },

    statusCode: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },

    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },

    // ⚠️ NO guardar body/query completo: solo allowlist
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false }
);

// Índices útiles para auditoría por rango y por actor/acción (existentes)
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

module.exports = { AuditLog };
