// backend/templates/anexo07Template.js
// Plantilla institucional del ANEXO 07 – Ampliación de Novedades
// Sistema ZN98 / SITIO98+

/**
 * Esta plantilla define los campos del ANEXO 07 para ser dados de alta
 * en la colección FormTemplate.
 *
 * NO escribe en base de datos por sí misma.
 * La idea es que un script de seed o un módulo de administración
 * lea este objeto y cree/actualice el FormTemplate correspondiente.
 *
 * Mapea el formulario oficial:
 *  - Encabezado institucional (resuelto en el PDF del backend)
 *  - Cuerpo de "AMPLIACIÓN DE NOVEDADES" (bloque de texto amplio)
 *  - Firmas: Permisionario, Inspector, Jefe Organismo Administrador
 *    → Las firmas se resuelven con conformidades y cierres, NO como campos libres.
 */

const anexo07Template = {
  code: "ANEXO_07",
  nombre:
    "PLANILLA AMPLIACIÓN DE NOVEDADES DEL ACTA DE RECEPCIÓN DE VIVIENDA FISCAL DE LA ARMADA",
  descripcion:
    "Ampliación de novedades del ACTA DE RECEPCIÓN (ANEXO 03) dentro del plazo institucional de 10 días.",

  // Versión inicial de plantilla
  version: 1,

  /**
   * Campos:
   *  - anexo03Id: referencia técnica al ANEXO_03 del cual se deriva (no visible en UI).
   *  - lugarFirma: lugar donde se formaliza la planilla (texto corto).
   *  - fechaFirma: fecha de la ampliación de novedades.
   *  - textoNovedades: cuerpo principal, equivalente a las líneas punteadas del formulario.
   *
   * Las firmas de:
   *   - Permisionario o Representante (Grado, Apellido y Nombres)
   *   - Inspector
   *   - Jefe Organismo Administrador
   * se obtendrán por:
   *   - usuario creador (permisionario),
   *   - interviniente inspector,
   *   - cierre ADMIN_GENERAL,
   * tal como ya se hizo en ANEXO_02 y ANEXO_03 (PDF).
   */
  campos: [
    {
      nombre: "anexo03Id",
      etiqueta: "ANEXO 03 de origen",
      tipo: "text",
      requerido: true,
      ayuda:
        "Identificador técnico del ANEXO 03 del cual se amplían las novedades. Se completa desde el sistema.",
      config: {
        visible: false, // no se muestra al usuario final
        readOnly: true,
      },
    },
    {
      nombre: "lugarFirma",
      etiqueta: "Lugar",
      tipo: "text",
      requerido: false,
      ayuda:
        "Lugar donde se confecciona la ampliación de novedades (por ejemplo: BASE NAVAL USHUAIA).",
      config: {
        maxLength: 120,
      },
    },
    {
      nombre: "fechaFirma",
      etiqueta: "Fecha",
      tipo: "date",
      requerido: false,
      ayuda:
        "Fecha en que se confecciona la ampliación de novedades. Si se omite, el sistema puede usar la fecha de creación.",
      config: {
        formato: "YYYY-MM-DD",
      },
    },
    {
      nombre: "textoNovedades",
      etiqueta: "AMPLIACIÓN DE NOVEDADES",
      tipo: "textarea",
      requerido: true,
      ayuda:
        "Detalle completo de las novedades que se amplían respecto del ACTA DE RECEPCIÓN DE VIVIENDA FISCAL.",
      config: {
        rows: 12,
        maxLength: 4000,
      },
    },
  ],

  /**
   * Reglas de acceso:
   *  - Crea: PERMISIONARIO (dentro de los 10 días posteriores al cierre de ANEXO_03,
   *    validado por backend).
   *  - Ve: ADMIN_GENERAL, ADMIN, PERMISIONARIO involucrado, INSPECTOR de barrio.
   *
   * La correspondencia fina de visibilidad se refuerza en:
   *  - canSeeSubmission (formularioController.js)
   *  - lógica de intervinientes (al crear y derivar el ANEXO_07).
   */
  rolesQuePuedenCrear: ["PERMISIONARIO"],
  rolesQuePuedenVer: ["ADMIN_GENERAL", "ADMIN", "PERMISIONARIO", "INSPECTOR"],

  // Anexo 07 siempre va atado a una vivienda del ANEXO 03 correspondiente.
  requiereVivienda: true,
  requiereAlojamiento: false,
};

module.exports = {
  anexo07Template,
};
