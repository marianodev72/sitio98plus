// backend/models/user.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const { Schema } = mongoose;

const ROLES = [
  "ADMIN_GENERAL",
  "ADMIN",
  "POSTULANTE",
  "PERMISIONARIO",
  "ALOJADO",
  "INSPECTOR",
  "JEFE_DE_BARRIO",
];

const ESTADOS_HABITACIONALES = [
  "SIN_VIVIENDA",
  "POSTULANTE",
  "PERMISIONARIO_EN_ESPERA",
  "PERMISIONARIO_ACTIVO",
  "ALOJADO_EN_ESPERA",
  "ALOJADO_ACTIVO",
];

const userSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    dni: String,
    matricula: String,
    telefono: String,

    // ✅ ÚNICA FUENTE DE VERDAD
    passwordHash: {
      type: String,
      required: true,
      select: true,
    },

    role: {
      type: String,
      enum: ROLES,
      default: "POSTULANTE",
      index: true,
    },

    estadoHabitacional: {
      type: String,
      enum: ESTADOS_HABITACIONALES,
      default: "SIN_VIVIENDA",
      index: true,
    },

    barrioAsignado: String,

    viviendaAsignada: {
      type: Schema.Types.ObjectId,
      ref: "Vivienda",
    },

    alojamientoAsignado: {
      type: Schema.Types.ObjectId,
      ref: "Alojamiento",
    },

    activo: { type: Boolean, default: true, index: true },
    bloqueado: { type: Boolean, default: false, index: true },

    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// ───────── MÉTODOS
userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.validarPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = {
  User: mongoose.models.User || mongoose.model("User", userSchema),
};
