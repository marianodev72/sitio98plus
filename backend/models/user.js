const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const {
  TIPOS_PERSONAL,
  GRUPOS_JERARQUICOS,
  normalizeTipoPersonal,
  normalizeGrupoJerarquico,
  normalizePrecedencia,
} = require("../constants/institucional");

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

const PERMISOS = ["INSPECTOR", "JEFE_DE_BARRIO", "INSPECTOR_ALOJAMIENTOS"];
const TERRITORIOS_ALOJAMIENTO_TIPOS = ["LUGAR"];

function up(v) {
  return String(v || "").toUpperCase().trim();
}

const territorioAlojamientoSchema = new Schema(
  {
    tipo: {
      type: String,
      trim: true,
      uppercase: true,
      enum: TERRITORIOS_ALOJAMIENTO_TIPOS,
      required: true,
    },
    valor: { type: String, trim: true, required: true, maxlength: 200 },
  },
  { _id: false }
);

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
    grado: { type: String, trim: true, uppercase: true, index: true },
    telefono: String,
    tipoPersonal: {
      type: String,
      enum: [...TIPOS_PERSONAL, null],
      default: null,
      set: normalizeTipoPersonal,
      index: true,
    },
    precedencia: {
      type: Number,
      default: null,
      set: normalizePrecedencia,
      index: true,
    },
    grupoJerarquico: {
      type: String,
      enum: GRUPOS_JERARQUICOS,
      default: "NO_DEFINIDO",
      set: normalizeGrupoJerarquico,
      index: true,
    },
    excepcionTipoDestino: { type: Boolean, default: false },

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

    territoriosAlojamiento: {
      type: [territorioAlojamientoSchema],
      default: [],
    },

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

    // 🔐 MFA (TOTP on-prem)
    mfaEnabled: { type: Boolean, default: false, index: true },
    mfaMethod: { type: String, default: "TOTP", select: false },

    // Secreto ACTIVO cifrado
    mfaSecretEnc: {
      iv: { type: String, default: "", select: false },
      tag: { type: String, default: "", select: false },
      data: { type: String, default: "", select: false },
    },

    // Secreto PENDIENTE durante enrolamiento
    mfaPendingSecretEnc: {
      iv: { type: String, default: "", select: false },
      tag: { type: String, default: "", select: false },
      data: { type: String, default: "", select: false },
    },
    mfaPendingSecretExpiresAt: { type: Date, default: null, select: false },

    // Recovery codes (hashes, nunca texto plano)
    mfaRecoveryCodesHash: { type: [String], default: [], select: false },

    // Challenge temporal para completar MFA en login
    mfaPendingChallengeHash: { type: String, default: "", select: false },
    mfaPendingChallengeExpiresAt: { type: Date, default: null, select: false },

    mfaEnabledAt: { type: Date, default: null, select: false },
    mfaLastUsedAt: { type: Date, default: null, select: false },
    // 🔐 Técnicos / seguridad (no exponer)
    loginFallidos: { type: Number, default: 0, select: false },
    loginBloqueadoHasta: { type: Date, default: null, select: false },
    ultimoLogin: { type: Date, default: null, select: false },
    ultimoCambioPassword: { type: Date, default: null, select: false },
    mustChangePassword: { type: Boolean, default: false, select: false },

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

userSchema.index({ tipoPersonal: 1, precedencia: 1 });
userSchema.index({ grupoJerarquico: 1 });
userSchema.index({ matricula: 1 });
userSchema.index({ dni: 1 });

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
