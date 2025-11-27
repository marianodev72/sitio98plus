// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    // Nombre de usuario para mostrar en el sistema
    username: { type: String, index: true },

    // Correo electrónico (para login y notificaciones)
    email: { type: String, unique: true, sparse: true, index: true },

    // Matrícula de revista (identificador de la Armada)
    matricula: { type: String, index: true },

    // Password encriptado (NO guardar la contraseña en texto plano)
    passwordHash: { type: String, required: true },

    // Rol del usuario dentro del sistema
    role: {
      type: String,
      enum: [
        'ADMIN',
        'ADMIN_GENERAL',
        'INSPECTOR',
        'JEFE_BARRIO',
        'ADMINISTRACION',
        'ENCARGADO',
        'ENCARGADO_GENERAL',
        'PERMISIONARIO',
        'ALOJADO',
        'POSTULANTE'
      ],
      default: 'POSTULANTE'
    },

    // Estado del usuario
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    },

    // === Campos para validación de email ===
    emailVerified: {
      type: Boolean,
      default: false
    },

    verificationCode: {
      type: String // código enviado al mail para validar registro
    },

    verificationCodeExpiresAt: {
      type: Date // fecha/hora de vencimiento del código
    }
  },
  {
    timestamps: true,
    collection: 'users' // usa la misma colección que ya venías usando
  }
);

module.exports = mongoose.model('User', UserSchema);
