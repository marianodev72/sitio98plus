const { hasPollutionKeys } = require("./alojamientoDocumentoValidator");

const TIPOS_SOLICITUD = Object.freeze([
  "INSCRIPCION_INICIAL",
  "CAMBIO_ALOJAMIENTO",
  "RECTIFICACION",
]);

const STRING_LIMITS = Object.freeze({
  lugar: 80,
  fechaLugar: 10,
  autoridadAsignacion: 120,
  zonaNaval: 20,
  organismoAdministrador: 160,
  mr: 40,
  afiliadoIOSFA: 40,
  gradoEscalafon: 80,
  genero: 20,
  apellido: 80,
  nombres: 100,
  destinoActual: 120,
  destinoFuturo: 120,
  telefonoActual: 40,
  telefonoFuturo: 40,
  fechaUltimoAscenso: 10,
  oficioProblemasSocioeconomicos: 80,
  fechaEstimadaTrasladoZona: 10,
});

const BOOLEAN_FIELDS = Object.freeze([
  "aceptaCondicionesReglamento",
  "agregaFidofac",
  "agregaReciboHaberes",
  "tieneProblemasSocioeconomicos",
  "declaradoIneptoDGPN",
  "agregaIndiceTitularidad",
  "aceptaDecisionRepresentante",
  "autorizaDescuentoHaberes",
  "autorizaAdministracionExpensas",
]);

const REQUIRED_STRING_FIELDS = Object.freeze([
  "lugar",
  "fechaLugar",
  "autoridadAsignacion",
  "zonaNaval",
  "organismoAdministrador",
  "mr",
  "afiliadoIOSFA",
  "gradoEscalafon",
  "genero",
  "apellido",
  "nombres",
  "destinoActual",
  "telefonoActual",
  "fechaUltimoAscenso",
]);

const REQUIRED_BOOLEAN_TRUE_FIELDS = Object.freeze([
  "aceptaCondicionesReglamento",
  "autorizaDescuentoHaberes",
  "autorizaAdministracionExpensas",
]);

const REQUIRED_BOOLEAN_FIELDS = Object.freeze([
  "agregaFidofac",
  "agregaReciboHaberes",
  "tieneProblemasSocioeconomicos",
  "declaradoIneptoDGPN",
  "agregaIndiceTitularidad",
]);

const REPRESENTANTE_STRING_LIMITS = Object.freeze({
  apellidoNombres: 120,
  grado: 60,
  mr: 40,
  destino: 120,
  telefono: 40,
});

const AGREGADOS_FIELDS = Object.freeze(["fidofac", "reciboHaberes", "indiceTitularidad"]);

const ALLOWED_ROOT_KEYS = new Set([
  ...Object.keys(STRING_LIMITS),
  ...BOOLEAN_FIELDS,
  "tipoSolicitud",
  "aniosServicioRecibo",
  "representantes",
  "agregados",
]);

function escapeHTML(input) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function parseDatos(input) {
  if (input === undefined || input === null || input === "") return {};

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  return input && typeof input === "object" ? input : null;
}

function cleanString(value, max) {
  if (value === undefined || value === null) return "";
  return escapeHTML(String(value).trim().slice(0, max));
}

function cleanOptionalBoolean(value) {
  return typeof value === "boolean" ? value : null;
}

function cleanDate(value) {
  const clean = cleanString(value, 10);
  if (!clean) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : "";
}

function cleanAniosServicio(value) {
  if (value === undefined || value === null || value === "") return "";
  const n = Number.parseInt(String(value), 10);
  if (!Number.isInteger(n) || n < 0 || n > 60) return "";
  return n;
}

function cleanTipoSolicitud(value) {
  const clean = cleanString(value, 40).toUpperCase();
  return TIPOS_SOLICITUD.includes(clean) ? clean : "";
}

function cleanGenero(value) {
  const clean = cleanString(value, 20).toUpperCase();
  return ["MASCULINO", "FEMENINO"].includes(clean) ? clean : "";
}

function cleanRepresentante(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const out = {};
  for (const [key, limit] of Object.entries(REPRESENTANTE_STRING_LIMITS)) {
    out[key] = cleanString(source[key], limit);
  }
  return out;
}

function cleanAgregados(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  return {
    fidofac: cleanOptionalBoolean(source.fidofac),
    reciboHaberes: cleanOptionalBoolean(source.reciboHaberes),
    indiceTitularidad: cleanOptionalBoolean(source.indiceTitularidad),
  };
}

function hasUnknownKeys(datos) {
  return Object.keys(datos).some((key) => !ALLOWED_ROOT_KEYS.has(key));
}

function pushRequiredStringErrors(value, errors) {
  for (const field of REQUIRED_STRING_FIELDS) {
    if (!String(value[field] || "").trim()) errors.push(field);
  }
}

function pushRequiredBooleanErrors(value, errors) {
  for (const field of REQUIRED_BOOLEAN_FIELDS) {
    if (typeof value[field] !== "boolean") errors.push(field);
  }

  for (const field of REQUIRED_BOOLEAN_TRUE_FIELDS) {
    if (value[field] !== true) errors.push(field);
  }

  for (const field of AGREGADOS_FIELDS) {
    if (typeof value.agregados?.[field] !== "boolean") errors.push(`agregados.${field}`);
  }
}

function validateAnexo21Datos(input, options = {}) {
  const { requireComplete = false, rejectUnknown = true } = options;
  const datos = parseDatos(input);
  const errors = [];

  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    errors.push("datos invalidos");
    return { ok: false, errors, value: {} };
  }

  if (hasPollutionKeys(datos)) {
    errors.push("datos contienen claves no permitidas");
    return { ok: false, errors, value: {} };
  }

  if (rejectUnknown && hasUnknownKeys(datos)) {
    errors.push("datos contienen campos no permitidos");
    return { ok: false, errors, value: {} };
  }

  const value = {};
  value.tipoSolicitud = cleanTipoSolicitud(datos.tipoSolicitud);

  for (const [field, limit] of Object.entries(STRING_LIMITS)) {
    if (field === "fechaLugar" || field === "fechaUltimoAscenso" || field === "fechaEstimadaTrasladoZona") {
      value[field] = cleanDate(datos[field]);
    } else if (field === "genero") {
      value[field] = cleanGenero(datos[field]);
    } else {
      value[field] = cleanString(datos[field], limit);
    }
  }

  for (const field of BOOLEAN_FIELDS) {
    value[field] = cleanOptionalBoolean(datos[field]);
  }

  value.aniosServicioRecibo = cleanAniosServicio(datos.aniosServicioRecibo);
  value.representantes = Array.isArray(datos.representantes)
    ? datos.representantes.slice(0, 2).map(cleanRepresentante)
    : [cleanRepresentante(), cleanRepresentante()];

  while (value.representantes.length < 2) {
    value.representantes.push(cleanRepresentante());
  }

  value.agregados = cleanAgregados(datos.agregados);

  if (requireComplete) {
    if (!value.tipoSolicitud) errors.push("tipoSolicitud");
    pushRequiredStringErrors(value, errors);

    if (value.aniosServicioRecibo === "") errors.push("aniosServicioRecibo");
    pushRequiredBooleanErrors(value, errors);

    if (value.tieneProblemasSocioeconomicos === true && !value.oficioProblemasSocioeconomicos) {
      errors.push("oficioProblemasSocioeconomicos");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    value: errors.length === 0 ? value : {},
  };
}

module.exports = {
  validateAnexo21Datos,
};
