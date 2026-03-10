// backend/templates/anexo08Template.js
// Plantilla institucional del ANEXO 08 – Acta de Inspección Previa
// Sistema ZN98 / SITIO98+

/**
 * Esta plantilla define los campos del ANEXO 08 para ser dados de alta
 * en la colección FormTemplate.
 *
 * NO escribe en base de datos por sí misma.
 * La idea es que un script de seed o un módulo de administración
 * lea este objeto y cree/actualice el FormTemplate correspondiente.
 *
 * Mapea el formulario oficial de:
 *  - ACTA DE INSPECCIÓN PREVIA DE VIVIENDA FISCAL
 *
 * La firma del inspector / permisionario / ADMIN_GENERAL
 * se resuelve vía conformidades y cierres, NO como campos libres.
 */

const anexo08Template = {
  code: "ANEXO_08",
  nombre: "ACTA DE INSPECCIÓN PREVIA DE VIVIENDA FISCAL DE LA ARMADA",
  descripcion:
    "Acta de inspección previa de la vivienda fiscal ocupada, como base para el posterior cierre y actas de devolución.",

  // Versión inicial de plantilla
  version: 1,

  /**
   * Campos principales:
   *  - anexo03Id: referencia técnica al ANEXO_03 (recepción) del cual se deriva.
   *  - permisionarioNombre: datos del titular.
   *  - unidadHabitacional / direccion / localidad / provincia: datos de la vivienda.
   *  - inspectorNombre: inspector actuante.
   *  - fechaInspeccion: fecha en la que se realiza la inspección.
   *  - lugarInspeccion: lugar donde se formaliza el acta.
   *  - detalleInspeccion: texto amplio con las novedades / estado del inmueble.
   *
   * Las firmas se obtendrán por:
   *   - usuario inspector,
   *   - cierre ADMIN_GENERAL,
   *   - conformidades específicas del permisionario.
   */
  campos: [
    {
      nombre: "anexo03Id",
      etiqueta: "ANEXO 03 de origen",
      tipo: "text",
      requerido: true,
      ayuda:
        "Identificador técnico del ANEXO 03 sobre el cual se labra esta inspección previa. Se completa automáticamente desde el sistema.",
      config: {
        visible: false,
        readOnly: true,
      },
    },
    {
      nombre: "permisionarioNombre",
      etiqueta: "Permisionario",
      tipo: "text",
      requerido: false,
      ayuda:
        "Apellido y nombres del permisionario titular de la vivienda fiscal inspeccionada.",
      config: {
        maxLength: 200,
      },
    },
    {
      nombre: "unidadHabitacional",
      etiqueta: "Unidad habitacional",
      tipo: "text",
      requerido: false,
      ayuda:
        "Identificación de la vivienda, por ejemplo: código interno (AB-401), número de casa o similar.",
      config: {
        maxLength: 60,
      },
    },
    {
      nombre: "direccion",
      etiqueta: "Dirección",
      tipo: "text",
      requerido: false,
      ayuda:
        "Dirección completa de la vivienda fiscal inspeccionada.",
      config: {
        maxLength: 200,
      },
    },
    {
      nombre: "localidad",
      etiqueta: "Localidad",
      tipo: "text",
      requerido: false,
      ayuda: "Localidad donde se encuentra la vivienda fiscal.",
      config: {
        maxLength: 120,
      },
    },
    {
      nombre: "provincia",
      etiqueta: "Provincia",
      tipo: "text",
      requerido: false,
      ayuda: "Provincia donde se encuentra la vivienda fiscal.",
      config: {
        maxLength: 120,
      },
    },
    {
      nombre: "inspectorNombre",
      etiqueta: "Inspector actuante",
      tipo: "text",
      requerido: false,
      ayuda:
        "Apellido y nombres del inspector que realiza la inspección previa.",
      config: {
        maxLength: 200,
      },
    },
    {
      nombre: "lugarInspeccion",
      etiqueta: "Lugar",
      tipo: "text",
      requerido: false,
      ayuda:
        "Lugar donde se formaliza el acta (por ejemplo: BASE NAVAL USHUAIA).",
      config: {
        maxLength: 120,
      },
    },
    {
      nombre: "fechaInspeccion",
      etiqueta: "Fecha de inspección",
      tipo: "date",
      requerido: false,
      ayuda:
        "Fecha en que se realiza la inspección previa. Si se omite, el sistema puede usar la fecha de creación.",
      config: {
        formato: "YYYY-MM-DD",
      },
    },
    {
      nombre: "detalleInspeccion",
      etiqueta: "Detalle de la inspección",
      tipo: "textarea",
      requerido: true,
      ayuda:
        "Descripción detallada del estado de la vivienda, observaciones y novedades detectadas en la inspección previa.",
      config: {
        rows: 12,
        maxLength: 4000,
      },
    },
  ],

  /**
   * Reglas de acceso:
   *  - Crea: INSPECTOR (inspector de barrio con permiso en el sistema).
   *  - Ve: ADMIN_GENERAL, ADMIN, PERMISIONARIO involucrado, INSPECTOR.
   */
  rolesQuePuedenCrear: ["INSPECTOR"],
  rolesQuePuedenVer: ["ADMIN_GENERAL", "ADMIN", "PERMISIONARIO", "INSPECTOR"],

  // Como el ANEXO 07, este también está siempre asociado a una vivienda real.
  requiereVivienda: true,
  requiereAlojamiento: false,
};

module.exports = {
  anexo08Template,
};
