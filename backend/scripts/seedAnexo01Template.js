// backend/scripts/seedAnexo01Template.js
require("dotenv").config();
const mongoose = require("mongoose");
const { FormTemplate } = require("../models/FormTemplate");

function buildZonaNavalOptions() {
  const opts = [];
  for (let i = 0; i <= 99; i++) {
    const v = String(i).padStart(2, "0");
    opts.push({ valor: v, etiqueta: v });
  }
  return opts;
}

function buildAniosOcupacionOptions() {
  const opts = [];
  for (let i = 0; i <= 40; i++) {
    const v = String(i).padStart(2, "0");
    opts.push({ valor: v, etiqueta: v });
  }
  return opts;
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!uri) {
    console.error("Falta MONGO_URI (o MONGODB_URI / MONGO_URL) en .env");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const code = "ANEXO_01";

  const template = {
    code,
    nombre: "ANEXO 01 - Declaración Jurada de Postulación",
    descripcion: "Formulario de inscripción para ocupar vivienda fiscal (Armada Argentina).",
    version: 1,
    activo: true,
    rolesQuePuedenCrear: ["POSTULANTE"],
    rolesQuePuedenVer: ["POSTULANTE", "ADMIN", "ADMIN_GENERAL"],
    requiereVivienda: false,
    campos: [
      // Encabezado (front lo muestra fijo) + datos variables
      { nombre: "lugar", etiqueta: "Lugar", tipo: "text", requerido: true },
      { nombre: "fechaSistema", etiqueta: "Fecha (sistema)", tipo: "system_date", requerido: false },

      { nombre: "alSenor", etiqueta: "AL SEÑOR (texto libre)", tipo: "text", requerido: true },
      {
        nombre: "zonaNaval",
        etiqueta: "Zona Naval",
        tipo: "select",
        requerido: true,
        opciones: buildZonaNavalOptions(),
      },

      {
        nombre: "tipoSolicitud",
        etiqueta: "Solicitud",
        tipo: "checkbox_group",
        requerido: true,
        config: {
          minChecked: 1,
          options: [
            { valor: "INSCRIPCION", etiqueta: "Solicito mi inscripción como postulante para acceder a la ocupación de una Vivienda Fiscal..." },
            { valor: "CAMBIO", etiqueta: "Solicito mi inscripción como postulante para CAMBIO DE VIVIENDA..." },
          ],
        },
      },

      {
        nombre: "aceptaReglamento",
        etiqueta: "Conozco/cumplo/acepto el Reglamento de Viviendas Fiscales (R.G-6-002 “P”)",
        tipo: "checkbox",
        requerido: true,
      },

      // Datos personales
      { nombre: "mr", etiqueta: "MR", tipo: "text", requerido: true },
      { nombre: "afiliadoDiba", etiqueta: "Nº AFILIADO DIBA", tipo: "text", requerido: false },
      { nombre: "gradoEscalafon", etiqueta: "GRADO Y ESCALAFÓN", tipo: "text", requerido: true },
      { nombre: "apellido", etiqueta: "APELLIDO", tipo: "text", requerido: true },
      { nombre: "nombres", etiqueta: "NOMBRES", tipo: "text", requerido: true },
      { nombre: "destinoActual", etiqueta: "DESTINO ACTUAL", tipo: "text", requerido: true },
      { nombre: "destinoFuturo", etiqueta: "DESTINO FUTURO", tipo: "text", requerido: false },
      { nombre: "telefonoActual", etiqueta: "TELÉFONO ACTUAL", tipo: "text", requerido: true },
      { nombre: "telefonoFuturo", etiqueta: "TELÉFONO FUTURO", tipo: "text", requerido: false },

      { nombre: "fechaUltimoAscenso", etiqueta: "Fecha último ascenso", tipo: "date", requerido: false },
      { nombre: "aniosServicio", etiqueta: "Años de servicio según Recibo de Haberes", tipo: "number", requerido: false },

      // Adjuntos
      {
        nombre: "adj_fidofac",
        etiqueta: "FIDOFAC / Formulario Contribuyente (pdf/jpg)",
        tipo: "file",
        requerido: false,
        config: { accept: ".pdf,.jpg,.jpeg,.png" },
      },

      // Convivientes (tabla)
      {
        nombre: "convivientes",
        etiqueta: "Personas convivientes a cargo",
        tipo: "table",
        requerido: false,
        config: {
          addLabel: "Agregar persona a cargo",
          columns: [
            { key: "apellidoNombres", label: "APELLIDO Y NOMBRES", type: "text" },
            { key: "relacion", label: "RELACIÓN", type: "text" },
            { key: "aCargo", label: "A CARGO (SI/NO)", type: "select", options: ["SI", "NO"] },
            { key: "edad", label: "EDAD", type: "number" },
            { key: "dni", label: "D.N.I.", type: "text" },
            { key: "diba", label: "DIBA", type: "text" },
          ],
        },
      },

      // Mascotas (tabla con adjunto por fila)
      {
        nombre: "mascotas",
        etiqueta: "Animales domésticos (solo si postula vivienda tipo casa)",
        tipo: "table",
        requerido: false,
        config: {
          addLabel: "Agregar mascota",
          columns: [
            { key: "especie", label: "Especie", type: "text" },
            { key: "raza", label: "Raza", type: "text" },
            { key: "edad", label: "Edad", type: "number" },
            { key: "sexo", label: "Sexo", type: "text" },
            { key: "peso", label: "Peso", type: "text" },
            { key: "docField", label: "Documentación (pdf/jpg)", type: "file_field" }, // front genera fieldname
          ],
        },
      },

      // Propiedades
      {
        nombre: "tienePropiedadesZona",
        etiqueta: "Soy (o familiar a cargo) propietario de viviendas en la zona naval de interés",
        tipo: "checkbox",
        requerido: false,
      },
      {
        nombre: "propiedades",
        etiqueta: "Direcciones / Observaciones (si corresponde)",
        tipo: "table",
        requerido: false,
        config: {
          addLabel: "Agregar dirección",
          maxRows: 3,
          columns: [
            { key: "direccion", label: "Dirección", type: "text" },
            { key: "observaciones", label: "Observaciones", type: "textarea" },
          ],
        },
      },

      { nombre: "verificoArticulo506", etiqueta: "Verificó el contenido del Artículo 5.06 incisos 3 y 4", tipo: "checkbox", requerido: false },

      {
        nombre: "tieneProblemasSocioeconomicos",
        etiqueta: "Tengo Problemas Socioeconómicos atendibles e inicié trámite por Oficio",
        tipo: "checkbox",
        requerido: false,
      },
      { nombre: "oficioSocioeconomico", etiqueta: "Oficio (si corresponde)", tipo: "text", requerido: false },

      { nombre: "declaradoInepto", etiqueta: "Me encuentro declarado INEPTO por DGPN para ocupar viviendas fiscales", tipo: "checkbox", requerido: false },

      {
        nombre: "adj_recibo_haberes",
        etiqueta: "Último Recibo de Haberes (pdf/jpg)",
        tipo: "file",
        requerido: true,
        config: { accept: ".pdf,.jpg,.jpeg,.png" },
      },

      {
        nombre: "aniosOcupacionPreviaZona",
        etiqueta: "Total de años de ocupación previa en la zona naval solicitada",
        tipo: "select",
        requerido: false,
        opciones: buildAniosOcupacionOptions(),
      },

      // Representantes
      {
        nombre: "representante1",
        etiqueta: "Representante I",
        tipo: "group",
        requerido: false,
        config: {
          fields: [
            { key: "apellidoNombres", label: "APELLIDO Y NOMBRES", type: "text" },
            { key: "grado", label: "GRADO", type: "text" },
            { key: "mr", label: "M.R.", type: "text" },
            { key: "destino", label: "DESTINO", type: "text" },
            { key: "telefono", label: "TELÉFONO", type: "text" },
          ],
        },
      },
      {
        nombre: "representante2",
        etiqueta: "Representante II",
        tipo: "group",
        requerido: false,
        config: {
          fields: [
            { key: "apellidoNombres", label: "APELLIDO Y NOMBRES", type: "text" },
            { key: "grado", label: "GRADO", type: "text" },
            { key: "mr", label: "M.R.", type: "text" },
            { key: "destino", label: "DESTINO", type: "text" },
            { key: "telefono", label: "TELÉFONO", type: "text" },
          ],
        },
      },

      // Autorizaciones
      { nombre: "autorizaDescuentos", etiqueta: "Autorizo descuentos por alquiler/mantenimiento/expensas", tipo: "checkbox", requerido: true },
      { nombre: "autorizaAdministradorExpensas", etiqueta: "Autorizo administración de expensas por administrador bajo supervisión", tipo: "checkbox", requerido: true },

      { nombre: "fechaEstimadaTraslado", etiqueta: "Fecha estimada de traslado a la zona", tipo: "date", requerido: false },
    ],
  };

  await FormTemplate.findOneAndUpdate(
    { code, version: 1 },
    template,
    { upsert: true, new: true }
  );

  console.log(`✅ Plantilla ${code} creada/actualizada (version 1).`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
