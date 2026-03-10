// backend/scripts/seedAnexo08.js
// Seed puntual para ANEXO_08 – ACTA DE INSPECCIÓN PREVIA

require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");

// Ajustá esto si usás otra variable / URL
const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/sitio98";

const { FormTemplate } = require("../models/FormTemplate");

async function main() {
  console.log("Conectando a MongoDB:", MONGO_URI);
  await mongoose.connect(MONGO_URI);

  const CODE = "ANEXO_08";

  // Definición de plantilla ANEXO 08
  const templateData = {
    code: CODE,
    nombre: "ANEXO 08 – ACTA DE INSPECCIÓN PREVIA",
    descripcion:
      "Acta de inspección previa de vivienda fiscal antes de la devolución (pre ANEXO 09).",

    // Roles
    rolesQuePuedenCrear: ["INSPECTOR"], // La inicia el INSPECTOR
    rolesQuePuedenVer: [
      "PERMISIONARIO",
      "INSPECTOR",
      "ADMIN",
      "ADMIN_GENERAL",
    ],

    requiereVivienda: true,
    requiereAlojamiento: false,

    campos: [
      // Cabecera institucional (autocompletada desde back)
      {
        nombre: "permisionarioNombre",
        etiqueta: "PERMISIONARIO",
        tipo: "text",
        requerido: false,
        ayuda:
          "Apellido y nombres del permisionario. Se autocompleta desde la vivienda / ocupación actual.",
      },
      {
        nombre: "unidadHabitacional",
        etiqueta: "UNIDAD HABITACIONAL",
        tipo: "text",
        requerido: false,
        ayuda:
          "Código de unidad habitacional (ej. AB-401). Se autocompleta cuando sea posible.",
      },
      {
        nombre: "direccionUnidad",
        etiqueta: "DIRECCIÓN UNIDAD HABITACIONAL",
        tipo: "text",
        requerido: false,
        ayuda:
          "Dirección de la unidad habitacional. Se autocompleta desde Vivienda o ANEXO_03.",
      },
      {
        nombre: "localidad",
        etiqueta: "LOCALIDAD",
        tipo: "text",
        requerido: false,
      },
      {
        nombre: "provincia",
        etiqueta: "PROVINCIA",
        tipo: "text",
        requerido: false,
      },
      {
        nombre: "inspectorNombre",
        etiqueta: "INSPECTOR",
        tipo: "text",
        requerido: false,
        ayuda:
          "Apellido y nombres del inspector de barrio. Se autocompleta desde el usuario creador.",
      },

      // Bloque 1 – Reparaciones / mantenimientos Alcaldía
      {
        nombre: "reparacionesAlcaldia",
        etiqueta:
          "1. REPARACIONES Y/O MANTENIMIENTOS A CARGO DE LA ALCALDÍA",
        tipo: "textarea",
        requerido: false,
        ayuda:
          "Detalle de reparaciones y/o mantenimientos que corresponden a la Alcaldía.",
        config: {
          lineasSugeridas: 8,
        },
      },

      // Bloque 2 – Reparaciones / mantenimientos Permisionario
      {
        nombre: "reparacionesPermisionario",
        etiqueta:
          "2. REPARACIONES Y/O MANTENIMIENTOS A CARGO DEL PERMISIONARIO",
        tipo: "textarea",
        requerido: false,
        ayuda:
          "Detalle de reparaciones y/o mantenimientos que corresponden al permisionario.",
        config: {
          lineasSugeridas: 8,
        },
      },

      // Bloque texto libre grande de la segunda página
      {
        nombre: "novedadesTexto",
        etiqueta: "NOVEDADES / OBSERVACIONES GENERALES DE LA INSPECCIÓN",
        tipo: "textarea",
        requerido: false,
        ayuda:
          "Espacio para detallar novedades, observaciones adicionales o información relevante de la inspección previa.",
        config: {
          lineasSugeridas: 12,
        },
      },

      // Observaciones por interviniente (cada uno puede agregar las suyas)
      {
        nombre: "observacionesInspector",
        etiqueta: "OBSERVACIONES DEL INSPECTOR",
        tipo: "textarea",
        requerido: false,
        ayuda:
          "Observaciones específicas del inspector sobre la inspección previa.",
        config: {
          rolEdicion: "INSPECTOR",
        },
      },
      {
        nombre: "observacionesPermisionario",
        etiqueta: "OBSERVACIONES DEL PERMISIONARIO",
        tipo: "textarea",
        requerido: false,
        ayuda:
          "Observaciones que el permisionario desee dejar asentadas respecto de la inspección previa.",
        config: {
          rolEdicion: "PERMISIONARIO",
        },
      },
      {
        nombre: "observacionesAdminGeneral",
        etiqueta: "OBSERVACIONES / FUNDAMENTOS ADMIN_GENERAL",
        tipo: "textarea",
        requerido: false,
        ayuda:
          "Observaciones e intervención del Jefe del órgano administrador al momento del cierre.",
        config: {
          rolEdicion: "ADMIN_GENERAL",
        },
      },

      // Representantes en caso de no estar presente el permisionario
      {
        nombre: "rep1_titulo",
        etiqueta:
          "En caso de no encontrarme presente el día de la entrega de la vivienda, autorizo para tal evento al siguiente personal naval en actividad:",
        tipo: "group",
        requerido: false,
        config: { soloLectura: true },
      },
      {
        nombre: "representante1_apellidoNombres",
        etiqueta: "REPRESENTANTE I – APELLIDO Y NOMBRES",
        tipo: "text",
        requerido: false,
      },
      {
        nombre: "representante1_grado",
        etiqueta: "REPRESENTANTE I – GRADO",
        tipo: "text",
        requerido: false,
      },
      {
        nombre: "representante1_mr",
        etiqueta: "REPRESENTANTE I – M.R.",
        tipo: "text",
        requerido: false,
      },
      {
        nombre: "representante1_destino",
        etiqueta: "REPRESENTANTE I – DESTINO",
        tipo: "text",
        requerido: false,
      },
      {
        nombre: "representante1_telefono",
        etiqueta: "REPRESENTANTE I – TELÉFONO",
        tipo: "text",
        requerido: false,
      },

      {
        nombre: "representante2_apellidoNombres",
        etiqueta: "REPRESENTANTE II – APELLIDO Y NOMBRES",
        tipo: "text",
        requerido: false,
      },
      {
        nombre: "representante2_grado",
        etiqueta: "REPRESENTANTE II – GRADO",
        tipo: "text",
        requerido: false,
      },
      {
        nombre: "representante2_mr",
        etiqueta: "REPRESENTANTE II – M.R.",
        tipo: "text",
        requerido: false,
      },
      {
        nombre: "representante2_destino",
        etiqueta: "REPRESENTANTE II – DESTINO",
        tipo: "text",
        requerido: false,
      },
      {
        nombre: "representante2_telefono",
        etiqueta: "REPRESENTANTE II – TELÉFONO",
        tipo: "text",
        requerido: false,
      },

      // Lugar y fecha (firma)
      {
        nombre: "lugarFirma",
        etiqueta: "LUGAR",
        tipo: "text",
        requerido: false,
        ayuda:
          'Se utiliza en la leyenda "Lugar y fecha" del Acta de Inspección Previa.',
      },
      {
        nombre: "fechaFirma",
        etiqueta: "FECHA DE INSPECCIÓN PREVIA",
        tipo: "date",
        requerido: false,
        ayuda:
          "Fecha en que se realiza la inspección previa. Si está vacío, el PDF puede usar la fecha del sistema.",
      },
    ],
  };

  // Upsert por (code, version)
  const existing = await FormTemplate.findOne({ code: CODE }).sort({
    version: -1,
  });

  if (!existing) {
    // No existe: creamos versión 1
    templateData.version = 1;
    const created = await FormTemplate.create(templateData);
    console.log("✔ ANEXO_08 creado con version 1:", created._id.toString());
  } else {
    // Existe: subimos versión +1 para no romper histórico
    templateData.version = (existing.version || 1) + 1;
    const created = await FormTemplate.create(templateData);
    console.log(
      `✔ ANEXO_08 creado como nueva versión (${templateData.version}).`
    );
  }

  await mongoose.disconnect();
  console.log("Listo. Conexión cerrada.");
}

main().catch((err) => {
  console.error("Error en seed ANEXO_08:", err);
  process.exit(1);
});
