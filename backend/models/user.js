// models/user.js
// Modelo de Usuario del sistema ZN98

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

const ROLES_PERMITIDOS = [
  'ADMIN_GENERAL',
  'ADMIN',
  'POSTULANTE',
  'PERMISIONARIO',
  'ALOJADO',
  'INSPECTOR',
  'JEFE_DE_BARRIO',
];

const ESTADOS_HABITACIONALES = [
  'SIN_VIVIENDA',             // default
  'POSTULANTE',
  'PERMISIONARIO_EN_ESPERA',
  'PERMISIONARIO_ACTIVO',
  'ALOJADO_EN_ESPERA',
  'ALOJADO_ACTIVO',
];

const userSchema = new Schema(
  {
    // Identificación básica
    nombre: { type: String, trim: true, required: true },
    apellido: { type: String, trim: true, required: true },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
      index: true,
    },

    dni: { type: String, trim: true },
    matricula: { type: String, trim: true },

    telefono: { type: String, trim: true },

    // Autenticación
    passwordHash: { type: String, required: true },

    // Rol y estado habitacional
    role: {
      type: String,
      enum: ROLES_PERMITIDOS,
      default: 'POSTULANTE',
      index: true,
    },

    estadoHabitacional: {
      type: String,
      enum: ESTADOS_HABITACIONALES,
      default: 'SIN_VIVIENDA',
      index: true,
    },

    // Barrio asignado (para INSPECTOR / JEFE_DE_BARRIO / algunos ADMIN)
    barrioAsignado: {
      type: String,
      trim: true,
      index: true,
    },

    // Relaciones con vivienda y alojamiento
    viviendaAsignada: {
      type: Schema.Types.ObjectId,
      ref: 'Vivienda',
    },

    alojamientoAsignado: {
      type: Schema.Types.ObjectId,
      ref: 'Alojamiento',
    },

    // Tipo de alojamiento (C01, C02, C03, C04, CUSO, etc.)
    tipoAlojamientoCodigo: {
      type: String,
      trim: true,
    },

    // Flags de control
    activo: {
      type: Boolean,
      default: true,
      index: true,
    },

    bloqueado: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Meta / datos adicionales flexibles
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Índices útiles
userSchema.index({ apellido: 1, nombre: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ estadoHabitacional: 1 });

// ────────────────────────────────
// Métodos de instancia
// ────────────────────────────────

/**
 * setPassword(passwordPlano)
 * Guarda un hash bcrypt en passwordHash.
 */
userSchema.methods.setPassword = async function setPassword(passwordPlano) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(passwordPlano, saltRounds);
  this.passwordHash = hash;
};

/**
 * validarPassword(passwordPlano)
 * Compara el password recibido con el hash guardado.
 */
userSchema.methods.validarPassword = async function validarPassword(
  passwordPlano
) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(passwordPlano, this.passwordHash);
};

// Evitar devolver passwordHash en las respuestas JSON
userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  return obj;
};

// ────────────────────────────────
// Export del modelo evitando OverwriteModelError
// ────────────────────────────────

const User =
  mongoose.models.User || mongoose.model('User', userSchema);

module.exports = {
  User,
  ROLES_PERMITIDOS,
  ESTADOS_HABITACIONALES,
};
