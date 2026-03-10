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

const PERMISOS = ["INSPECTOR", "JEFE_DE_BARRIO"];

function up(v) {
  return String(v || "").toUpperCase().trim();
}

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

    // 🔐 Nunca exponer
    passwordHash: { type: String, required: true, select: false },

    role: { type: String, enum: ROLES, default: "POSTULANTE", index: true },

    estadoHabitacional: {
      type: String,
      enum: ESTADOS_HABITACIONALES,
      default: "SIN_VIVIENDA",
      index: true,
    },

    barrioAsignado: { type: String, default: "", index: true },

    viviendaAsignada: { type: Schema.Types.ObjectId, ref: "Vivienda" },
    alojamientoAsignado: { type: Schema.Types.ObjectId, ref: "Alojamiento" },

    permisos: {
      type: [String],
      default: [],
      set: (arr) => (Array.isArray(arr) ? Array.from(new Set(arr.map(up))) : []),
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.every((p) => PERMISOS.includes(up(p))),
        message: "Permisos inválidos",
      },
      index: true,
    },

    tokenVersion: { type: Number, default: 0, index: true, select: false },

    // 🔐 Técnicos / seguridad (no exponer)
    loginFallidos: { type: Number, default: 0, select: false },
    loginBloqueadoHasta: { type: Date, default: null, select: false },
    ultimoLogin: { type: Date, default: null, select: false },
    ultimoCambioPassword: { type: Date, default: null, select: false },

    loginEventos: { type: Array, default: [], select: false },
    adminEventos: { type: Array, default: [], select: false },

    lastIp: { type: String, default: "", select: false },
    lastUserAgent: { type: String, default: "", select: false },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", select: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", select: false },

    activo: { type: Boolean, default: true, index: true },
    bloqueado: { type: Boolean, default: false, index: true },

    archivado: { type: Boolean, default: false, index: true },
    archivadoAt: { type: Date, default: null },
    archivadoPor: { type: Schema.Types.ObjectId, ref: "User", default: null, select: false },
    archivadoMotivo: { type: String, default: "", select: false },

    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
  this.ultimoCambioPassword = new Date();
};

userSchema.methods.validarPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.tienePermiso = function (perm) {
  const p = up(perm);
  const list = Array.isArray(this.permisos) ? this.permisos.map(up) : [];
  return list.includes(p);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.loginEventos;
  delete obj.adminEventos;
  return obj;
};

module.exports = {
  User: mongoose.models.User || mongoose.model("User", userSchema),
};
