const CLASES_ALOJAMIENTO = Object.freeze(["C01", "C02", "C03", "C04", "CUSO"]);

const CAPACIDAD_POR_CLASE = Object.freeze({
  C01: 1,
  C02: 2,
  C03: 3,
  C04: 4,
});

const GENERO_PERMITIDO = Object.freeze([
  "MASCULINO",
  "FEMENINO",
  "SIN_RESTRICCION",
  "NO_ESPECIFICADO",
]);

const ALOJAMIENTO_ESTADOS = Object.freeze([
  "DISPONIBLE",
  "PARCIALMENTE_OCUPADO",
  "OCUPADO",
  "RESERVADO",
  "MANTENIMIENTO",
  "FUERA_SERVICIO",
  "INHABILITADO",
  "BAJA",
]);

const PLAZA_ESTADOS = Object.freeze([
  "LIBRE",
  "RESERVADA",
  "OCUPADA",
  "MANTENIMIENTO",
  "INHABILITADA",
  "BAJA",
]);

const CSV_HEADERS = Object.freeze([
  "codigo",
  "dependencia",
  "lugar",
  "sector",
  "tipo",
  "numero",
  "clase",
  "capacidad",
  "generoPermitido",
  "localidad",
  "provincia",
  "observaciones",
  "activo",
]);

module.exports = {
  CLASES_ALOJAMIENTO,
  CAPACIDAD_POR_CLASE,
  GENERO_PERMITIDO,
  ALOJAMIENTO_ESTADOS,
  PLAZA_ESTADOS,
  CSV_HEADERS,
};
