const {
  ALOJAMIENTO_DOCUMENTO_ESTADOS,
  ALOJAMIENTO_DOCUMENTO_ROLES,
  ALOJAMIENTO_DOCUMENTO_TRANSICIONES,
} = require("../../constants/alojamientoDocumentoConstants");

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function isEstadoDocumento(value) {
  return ALOJAMIENTO_DOCUMENTO_ESTADOS.includes(up(value));
}

function isRolDocumento(value) {
  return ALOJAMIENTO_DOCUMENTO_ROLES.includes(up(value));
}

function getEstadosSiguientes(estadoActual) {
  return ALOJAMIENTO_DOCUMENTO_TRANSICIONES[up(estadoActual)] || [];
}

function puedeTransicionar(estadoActual, estadoNuevo) {
  return getEstadosSiguientes(estadoActual).includes(up(estadoNuevo));
}

function registrarCambioEstado(documento, { estadoNuevo, actorId = null, rolActor = "", observacion = "" }) {
  if (!documento || typeof documento !== "object") {
    return { ok: false, error: "DOCUMENTO_INVALIDO" };
  }

  const next = up(estadoNuevo);
  const current = up(documento.estado || "BORRADOR");

  if (!isEstadoDocumento(next)) {
    return { ok: false, error: "ESTADO_INVALIDO" };
  }

  if (!puedeTransicionar(current, next)) {
    return { ok: false, error: "TRANSICION_INVALIDA" };
  }

  if (typeof documento.cambiarEstado === "function") {
    documento.cambiarEstado(next, actorId, observacion, up(rolActor));
  } else {
    documento.estado = next;
    documento.historialEstados = Array.isArray(documento.historialEstados)
      ? documento.historialEstados
      : [];
    documento.historialEstados.push({
      fecha: new Date(),
      estadoAnterior: current,
      estadoNuevo: next,
      observacion: String(observacion || "").trim(),
      realizadoPor: actorId || null,
      rolActor: up(rolActor),
    });
  }

  return { ok: true, estadoAnterior: current, estadoNuevo: next };
}

function agregarInterviniente(documento, userId, rol) {
  if (!documento || !userId || !isRolDocumento(rol)) return false;

  documento.intervinientes = Array.isArray(documento.intervinientes)
    ? documento.intervinientes
    : [];

  const rolUp = up(rol);
  const exists = documento.intervinientes.some(
    (item) => String(item?.userId || "") === String(userId) && up(item?.rol) === rolUp
  );

  if (exists) return false;
  documento.intervinientes.push({ userId, rol: rolUp });
  return true;
}

function registrarConformidad(documento, { tipo, usuario, rol = "", ok = true, observacion = "" }) {
  if (!documento || !usuario || !isRolDocumento(tipo)) {
    return { ok: false, error: "CONFORMIDAD_INVALIDA" };
  }

  documento.conformidades = Array.isArray(documento.conformidades)
    ? documento.conformidades
    : [];

  const tipoUp = up(tipo);
  const index = documento.conformidades.findIndex(
    (item) => up(item?.tipo) === tipoUp && String(item?.usuario || "") === String(usuario)
  );

  const conformidad = {
    tipo: tipoUp,
    ok: Boolean(ok),
    usuario,
    rol: up(rol) || tipoUp,
    fecha: new Date(),
    observacion: String(observacion || "").trim(),
  };

  if (index >= 0) documento.conformidades[index] = conformidad;
  else documento.conformidades.push(conformidad);

  return { ok: true, conformidad };
}

module.exports = {
  up,
  isEstadoDocumento,
  isRolDocumento,
  getEstadosSiguientes,
  puedeTransicionar,
  registrarCambioEstado,
  agregarInterviniente,
  registrarConformidad,
};
