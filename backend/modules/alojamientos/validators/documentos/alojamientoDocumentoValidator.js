const mongoose = require("mongoose");

const {
  ALOJAMIENTO_DOCUMENTO_CODIGOS,
  ALOJAMIENTO_DOCUMENTO_ESTADOS,
  ALOJAMIENTO_DOCUMENTO_ROLES,
} = require("../../constants/alojamientoDocumentoConstants");

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function hasPollutionKeys(value) {
  if (!value || typeof value !== "object") return false;
  const bad = new Set(["__proto__", "prototype", "constructor"]);
  const stack = [value];

  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;

    for (const key of Object.keys(current)) {
      if (bad.has(key)) return true;
      const next = current[key];
      if (next && typeof next === "object") stack.push(next);
    }
  }

  return false;
}

function validateCodigo(codigo) {
  const value = up(codigo);
  return {
    ok: ALOJAMIENTO_DOCUMENTO_CODIGOS.includes(value),
    value,
  };
}

function validateEstado(estado) {
  const value = up(estado || "BORRADOR");
  return {
    ok: ALOJAMIENTO_DOCUMENTO_ESTADOS.includes(value),
    value,
  };
}

function validateRol(rol) {
  const value = up(rol);
  return {
    ok: ALOJAMIENTO_DOCUMENTO_ROLES.includes(value),
    value,
  };
}

function validateDocumentoBase(input = {}) {
  const errors = [];
  const payload = input && typeof input === "object" ? input : {};

  if (hasPollutionKeys(payload)) {
    errors.push("payload contiene claves no permitidas");
  }

  const codigo = validateCodigo(payload.codigo);
  if (!codigo.ok) errors.push("codigo invalido");

  const estado = validateEstado(payload.estado);
  if (!estado.ok) errors.push("estado invalido");

  for (const key of [
    "derivadoDe",
    "alojamiento",
    "plaza",
    "asignacion",
    "solicitante",
    "alojado",
    "inspector",
    "creadoPor",
    "actualizadoPor",
  ]) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== "") {
      if (!isObjectId(payload[key])) errors.push(`${key} invalido`);
    }
  }

  if (payload.datos !== undefined && (payload.datos === null || typeof payload.datos !== "object")) {
    errors.push("datos invalido");
  }

  return {
    ok: errors.length === 0,
    errors,
    value: {
      codigo: codigo.value,
      estado: estado.value,
      datos: payload.datos && typeof payload.datos === "object" ? payload.datos : {},
    },
  };
}

module.exports = {
  up,
  isObjectId,
  hasPollutionKeys,
  validateCodigo,
  validateEstado,
  validateRol,
  validateDocumentoBase,
};
