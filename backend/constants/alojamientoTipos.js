// constants/alojamientoTipos.js

/**
 * Lista cerrada de tipos de alojamiento válidos.
 * 
 * C01 - 1 habitante (camarote individual)
 * C02 - 2 habitantes
 * C03 - 3 habitantes
 * C04 - 4 habitantes
 * CUSO - Cuadra / Sollado (uso especial)
 */

const TIPOS_ALOJAMIENTO_VALIDOS = ['C01', 'C02', 'C03', 'C04', 'CUSO'];

/**
 * Devuelve true si el código es uno de los tipos válidos.
 */
function esTipoAlojamientoValido(codigo) {
  return TIPOS_ALOJAMIENTO_VALIDOS.includes(codigo);
}

module.exports = {
  TIPOS_ALOJAMIENTO_VALIDOS,
  esTipoAlojamientoValido
};
