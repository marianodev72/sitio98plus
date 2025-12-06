// scripts/seedFormTemplates.js
// Crea / actualiza plantillas de formularios (ANEXO 2 y ANEXO 22) en la BD

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const connectDB = require('../config/db');
const { FormTemplate } = require('../models/FormTemplate');

async function upsertTemplate(data) {
  const { codigo } = data;

  let template = await FormTemplate.findOne({ codigo });

  if (!template) {
    console.log(`🆕 Creando plantilla nueva: ${codigo}`);
    template = new FormTemplate(data);
  } else {
    console.log(`♻️ Actualizando plantilla existente: ${codigo}`);
    template.nombre = data.nombre;
    template.descripcion = data.descripcion;
    template.version = data.version;
    template.activo = data.activo;
    template.rolesQuePuedenRellenar = data.rolesQuePuedenRellenar;
    template.campos = data.campos;
  }

  await template.save();
  console.log(`✅ Plantilla ${codigo} guardada con _id=${template._id}`);
}

async function run() {
  try {
    await connectDB();
    console.log('🔌 Conectado a MongoDB para seed de FormTemplates');

    const templatesData = [
      // ================== ANEXO 2 — ASIGNACIÓN DE VIVIENDA ==================
      {
        codigo: 'ANEXO_2',
        nombre: 'Acta de Asignación de Vivienda Fiscal (ANEXO 2)',
        descripcion:
          'Acta de asignación de vivienda fiscal de la Armada. Generada por ADMIN, validada por ADMIN GENERAL.',
        version: 1,
        activo: true,
        // Por ahora solo ADMIN y ADMIN_GENERAL pueden completar/enviar esta acta
        rolesQuePuedenRellenar: ['ADMIN', 'ADMIN_GENERAL'],
        campos: [
          {
            nombre: 'grado',
            etiqueta: 'Grado del permisionario',
            tipo: 'texto',
            requerido: true,
          },
          {
            nombre: 'apellido_nombres',
            etiqueta: 'Apellido y Nombres del permisionario',
            tipo: 'texto',
            requerido: true,
          },
          {
            nombre: 'matricula',
            etiqueta: 'Matrícula (M.R.)',
            tipo: 'texto',
            requerido: true,
          },
          {
            nombre: 'destino',
            etiqueta: 'Destino',
            tipo: 'texto',
            requerido: true,
          },
          {
            nombre: 'barrio',
            etiqueta: 'Barrio de la vivienda asignada',
            tipo: 'texto', // más adelante podemos convertirlo en select si queremos lista oficial
            requerido: true,
          },
          {
            nombre: 'numero_casa',
            etiqueta: 'Número de casa / nomenclatura',
            tipo: 'texto',
            requerido: true,
          },
          {
            nombre: 'cantidad_habitaciones',
            etiqueta: 'Cantidad de habitaciones',
            tipo: 'numero',
            requerido: true,
          },
          {
            nombre: 'fecha_asignacion',
            etiqueta: 'Fecha de asignación',
            tipo: 'fecha',
            requerido: true,
          },
          {
            nombre: 'fecha_entrega',
            etiqueta: 'Fecha de entrega',
            tipo: 'fecha',
            requerido: false,
          },
          {
            nombre: 'lugar',
            etiqueta: 'Lugar',
            tipo: 'texto',
            requerido: false,
          },
          {
            nombre: 'observaciones',
            etiqueta: 'Observaciones',
            tipo: 'textarea',
            requerido: false,
          },
        ],
      },

      // ================== ANEXO 22 — ASIGNACIÓN DE ALOJAMIENTO ==================
      {
        codigo: 'ANEXO_22',
        nombre: 'Acta de Asignación de Alojamiento Naval (ANEXO 22)',
        descripcion:
          'Acta de asignación de alojamiento naval. Generada por ADMIN, validada por ADMIN GENERAL.',
        version: 1,
        activo: true,
        // Por ahora solo ADMIN y ADMIN_GENERAL pueden completar/enviar esta acta
        rolesQuePuedenRellenar: ['ADMIN', 'ADMIN_GENERAL'],
        campos: [
          {
            nombre: 'grado',
            etiqueta: 'Grado del titular',
            tipo: 'texto',
            requerido: true,
          },
          {
            nombre: 'apellido_nombres',
            etiqueta: 'Apellido y Nombres del titular',
            tipo: 'texto',
            requerido: true,
          },
          {
            nombre: 'matricula',
            etiqueta: 'Matrícula (M.R.)',
            tipo: 'texto',
            requerido: true,
          },
          {
            nombre: 'destino',
            etiqueta: 'Destino',
            tipo: 'texto',
            requerido: true,
          },
          {
            nombre: 'predio',
            etiqueta: 'Predio',
            tipo: 'texto',
            requerido: false,
          },
          {
            nombre: 'edificio',
            etiqueta: 'Edificio',
            tipo: 'texto',
            requerido: false,
          },
          {
            nombre: 'codigo_alojamiento',
            etiqueta: 'Código / tipo de alojamiento (ej. C01, C02)',
            tipo: 'texto', // más adelante se puede vincular directo a la tabla Alojamiento
            requerido: true,
          },
          {
            nombre: 'lugar',
            etiqueta: 'Lugar / Localidad',
            tipo: 'texto',
            requerido: true,
          },
          {
            nombre: 'fecha_asignacion',
            etiqueta: 'Fecha de asignación',
            tipo: 'fecha',
            requerido: true,
          },
          {
            nombre: 'fecha_entrega',
            etiqueta: 'Fecha de entrega',
            tipo: 'fecha',
            requerido: false,
          },
          {
            nombre: 'observaciones',
            etiqueta: 'Observaciones',
            tipo: 'textarea',
            requerido: false,
          },
        ],
      },
    ];

    for (const tmpl of templatesData) {
      await upsertTemplate(tmpl);
    }

    console.log('🎉 Seed de FormTemplates completado.');
  } catch (err) {
    console.error('❌ Error en seedFormTemplates:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
