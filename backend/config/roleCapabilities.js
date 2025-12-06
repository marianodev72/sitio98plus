// config/roleCapabilities.js

/**
 * Matriz centralizada de capacidades institucionales por rol.
 * Esta es la fuente de verdad del sistema.
 * 
 * Cada módulo del backend debe consultar estas capacidades,
 * nunca asumir permisos por rol en controladores dispersos.
 */

const ROLE_CAPABILITIES = {
  POSTULANTE: {
    puedeVer: [
      'ANEXOS_MIOS',
      'MENSAJES_MIOS'
    ],
    puedeIniciarAnexos: ['ANEXO_01', 'ANEXO_21'],
    accesoVivienda: 'NINGUNO',
    accesoAlojamiento: 'NINGUNO',
    administracionUsuarios: false
  },

  PERMISIONARIO: {
    puedeVer: [
      'VIVIENDA_PROPIA',
      'LIQUIDACIONES_MIAS',
      'SERVICIOS_MIOS',
      'MENSAJES_MIOS',
      'ANEXOS_MIOS'
    ],
    puedeIniciarAnexos: ['ANEXO_04', 'ANEXO_07', 'ANEXO_11'],
    accesoVivienda: 'SOLO_PROPIA',
    accesoAlojamiento: 'NINGUNO',
    administracionUsuarios: false
  },

  ALOJADO: {
    puedeVer: [
      'ALOJAMIENTO_PROPIO',
      'LIQUIDACIONES_MIAS',
      'SERVICIOS_MIOS',
      'MENSAJES_MIOS',
      'ANEXOS_MIOS'
    ],
    puedeIniciarAnexos: ['ANEXO_24', 'ANEXO_28'],
    accesoVivienda: 'NINGUNO',
    accesoAlojamiento: 'SOLO_PROPIO',
    administracionUsuarios: false
  },

  INSPECTOR: {
    puedeVer: [
      'VIVIENDAS_BARRIO',
      'ALOJAMIENTOS_BARRIO',
      'ANEXOS_BARRIO',
      'MENSAJES_BARRIO'
    ],
    puedeIniciarAnexos: [
      'ANEXO_03',
      'ANEXO_08',
      'ANEXO_09',
      'ANEXO_23',
      'ANEXO_25',
      'ANEXO_26'
    ],
    accesoVivienda: 'BARRIO',
    accesoAlojamiento: 'BARRIO',
    administracionUsuarios: false
  },

  JEFE_DE_BARRIO: {
    puedeVer: [
      'VIVIENDAS_BARRIO',
      'ANEXOS_BARRIO',
      'MENSAJES_BARRIO'
    ],
    puedeIniciarAnexos: [],
    accesoVivienda: 'BARRIO',
    accesoAlojamiento: 'BARRIO',
    administracionUsuarios: false
  },

  ADMIN: {
    puedeVer: ['TODO'],
    puedeIniciarAnexos: [],
    accesoVivienda: 'GLOBAL',
    accesoAlojamiento: 'GLOBAL',
    administracionUsuarios: false
  },

  ADMIN_GENERAL: {
    puedeVer: ['TODO'],
    puedeIniciarAnexos: [
      'ANEXO_02',
      'ANEXO_11',
      'ANEXO_22',
      'ANEXO_26'
    ],
    accesoVivienda: 'GLOBAL',
    accesoAlojamiento: 'GLOBAL',
    administracionUsuarios: true
  }
};

module.exports = ROLE_CAPABILITIES;
