// backend/scripts/seed_anexo02_template.js
require("dotenv").config();
const mongoose = require("mongoose");
const { FormTemplate } = require("../models/FormTemplate");

function up(v) {
  return String(v || "").toUpperCase().trim();
}

async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("Falta MONGO_URI en .env");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("[MongoDB] Conectado");

  const code = "ANEXO_02";

  // Campos mínimos que tu backend usa / autocompleta:
  // - anexo01Id (obligatorio)
  // - postulanteId (obligatorio)
  // - viviendaId (obligatorio)
  // - grado / apellidoNombres / mrDestino (autocomplete desde User.meta si faltan)
  // - direccion/localidad/provincia/tipoUnidad/fechas/lugarFirma (opcionales para el PDF)
  const template = {
    code,
    nombre: "ANEXO 02 - Acta de asignación de Vivienda Fiscal",
    descripcion: "Acta institucional de asignación de Vivienda Fiscal (flujo: AdminGeneral → Postulante conformidad → AdminGeneral cierre).",
    version: 1,
    activo: true,

    // Esto no lo valida tu controller hoy, pero es institucionalmente correcto dejarlo definido.
    rolesQuePuedenCrear: ["ADMIN_GENERAL", "ADMIN"],
    rolesQuePuedenVer: ["ADMIN_GENERAL", "ADMIN", "POSTULANTE", "PERMISIONARIO", "INSPECTOR", "JEFE_DE_BARRIO"],

    requiereVivienda: true,
    requiereAlojamiento: false,

    campos: [
      { nombre: "anexo01Id", etiqueta: "ID ANEXO_01", tipo: "text", requerido: true },
      { nombre: "postulanteId", etiqueta: "ID Postulante", tipo: "text", requerido: true },
      { nombre: "viviendaId", etiqueta: "ID Vivienda", tipo: "text", requerido: true },

      { nombre: "grado", etiqueta: "Grado", tipo: "text", requerido: false },
      { nombre: "apellidoNombres", etiqueta: "Apellido y Nombres", tipo: "text", requerido: false },
      { nombre: "mrDestino", etiqueta: "M.R. Destino", tipo: "text", requerido: false },

      { nombre: "direccion", etiqueta: "Dirección", tipo: "text", requerido: false },
      { nombre: "tipoUnidad", etiqueta: "Casa / Departamento", tipo: "text", requerido: false },
      { nombre: "localidad", etiqueta: "Localidad", tipo: "text", requerido: false },
      { nombre: "provincia", etiqueta: "Provincia", tipo: "text", requerido: false },

      { nombre: "fechaAsignacion", etiqueta: "Fecha de asignación", tipo: "date", requerido: false },
      { nombre: "fechaEntrega", etiqueta: "Fecha de entrega", tipo: "date", requerido: false },
      { nombre: "lugarFirma", etiqueta: "Lugar y fecha", tipo: "text", requerido: false },
    ],
  };

  // Upsert por code+version (tu schema tiene unique index code+version)
  const existing = await FormTemplate.findOne({ code: up(code), version: 1 });

  if (existing) {
    existing.activo = true;
    existing.nombre = template.nombre;
    existing.descripcion = template.descripcion;
    existing.rolesQuePuedenCrear = template.rolesQuePuedenCrear;
    existing.rolesQuePuedenVer = template.rolesQuePuedenVer;
    existing.requiereVivienda = true;
    existing.requiereAlojamiento = false;
    existing.campos = template.campos;

    await existing.save();
    console.log(`✅ Template ${code} actualizado/activado (version 1).`);
  } else {
    await FormTemplate.create(template);
    console.log(`✅ Template ${code} creado (version 1).`);
  }

  await mongoose.disconnect();
  console.log("[MongoDB] Desconectado");
}

main().catch((e) => {
  console.error("Error seed:", e);
  process.exit(1);
});
