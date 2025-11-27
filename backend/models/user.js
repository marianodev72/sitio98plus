// backend/models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Usamos el email como identificador principal de login
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // username opcional (por si lo usa el panel admin)
    username: {
      type: String,
      trim: true,
    },

    nombre: { type: String, trim: true },
    apellido: { type: String, trim: true },

    // IMPORTANTE: usamos "password" para ser compatibles
    // con los datos que ya tenés en la colección.
    password: {
      type: String,
      required: true,
      select: false, // no se devuelve por defecto
    },

    role: {
      type: String,
      enum: ['ADMIN', 'POSTULANTE', 'ADMINISTRACION', 'INSPECTOR', 'JEFE_BARRIO', 'PERMISIONARIO', 'INVITADO'],
      default: 'POSTULANTE',
    },

    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ----- Métodos de seguridad -----

// Setear/actualizar contraseña (en altas, cambios, script de admin, etc.)
userSchema.methods.setPassword = async function setPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(plainPassword, salt);
};

// Verificar contraseña en el login
userSchema.methods.checkPassword = async function checkPassword(plainPassword) {
  if (!this.password) return false;
  return bcrypt.compare(plainPassword, this.password);
};

// Usuario “seguro” para enviar al frontend
userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    email: this.email,
    username: this.username,
    nombre: this.nombre,
    apellido: this.apellido,
    role: this.role,
    activo: this.activo,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
