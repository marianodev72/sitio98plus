// controllers/serviciosController.js
// Controlador de servicios (Mis servicios) — Sistema ZN98

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const { User } = require('../models/User');
const {
  ServicioRegistro,
  TIPOS_SERVICIO,
} = require('../models/ServicioRegistro');

// Reutilizamos lógica de parseo CSV
function parseCsvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const records = parse(content, {
    columns: (header) =>
      header.map((h) => h.toString().trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  });

  return records;
}

// POST /api/servicios/import-csv
// Solo ADMIN / ADMIN_GENERAL
// Ejemplo de columnas mínimas en CSV:
// matricula, periodo, tipoServicio, importe, consumo, numeroMedidor, fechaVencimiento
async function importServiciosCsv(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió archivo CSV.' });
    }

    const csvPath = req.file.path;
    const records = parseCsvFile(csvPath);

    const nombreArchivo = path.basename(csvPath);

    let importados = 0;
    const errores = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const lineaArchivo = i + 2;

      const matricula =
        row.matricula ||
        row['matrícula'] ||
        row['matricula_zn98'] ||
        null;

      if (!matricula) {
        errores.push({
          linea: lineaArchivo,
          error: 'Falta columna matricula.',
        });
        continue;
      }

      const periodo =
        row.periodo || row.mes || row['periodo_zn98'] || req.body.periodo;

      if (!periodo) {
        errores.push({
          linea: lineaArchivo,
          matricula,
          error: 'Falta columna periodo (o body.periodo).',
        });
        continue;
      }

      let tipoServicioRaw =
        row.tiposervicio || row['tipo_servicio'] || row['servicio'] || 'OTRO';
      tipoServicioRaw = tipoServicioRaw.toString().toUpperCase().trim();

      let tipoServicio = 'OTRO';
      if (TIPOS_SERVICIO.includes(tipoServicioRaw)) {
        tipoServicio = tipoServicioRaw;
      }

      const importeStr = row.importe || row.monto || row.total;
      const importe = importeStr ? Number(importeStr) : NaN;

      if (!importeStr || Number.isNaN(importe)) {
        errores.push({
          linea: lineaArchivo,
          matricula,
          error: 'Importe inválido o ausente.',
        });
        continue;
      }

      const consumoStr = row.consumo;
      const consumo = consumoStr ? Number(consumoStr) : null;

      const numeroMedidor =
        row.numeromedidor || row['numero_medidor'] || null;

      const fechaVencimiento =
        row.fechavencimiento || row['fecha_vencimiento'] || null;

      // Buscar usuario por matrícula
      const user = await User.findOne({ matricula: matricula.toString() });

      if (!user) {
        errores.push({
          linea: lineaArchivo,
          matricula,
          error: 'Usuario no encontrado por matrícula.',
        });
        continue;
      }

      // Determinar tipoTitular a partir del rol
      let tipoTitular = null;
      const roleUpper = (user.role || '').toUpperCase();
      if (roleUpper === 'PERMISIONARIO') {
        tipoTitular = 'PERMISIONARIO';
      } else if (roleUpper === 'ALOJADO') {
        tipoTitular = 'ALOJADO';
      } else {
        errores.push({
          linea: lineaArchivo,
          matricula,
          error: `Rol del usuario no es PERMISIONARIO ni ALOJADO (es ${user.role}).`,
        });
        continue;
      }

      let vivienda = null;
      let alojamiento = null;
      if (user.viviendaAsignada) vivienda = user.viviendaAsignada;
      if (user.alojamientoAsignado) alojamiento = user.alojamientoAsignado;

      const servicio = new ServicioRegistro({
        titular: user._id,
        tipoTitular,
        matricula: user.matricula,
        vivienda,
        alojamiento,
        tipoServicio,
        periodo,
        numeroMedidor,
        consumo: consumo !== null ? consumo : undefined,
        importe,
        fechaVencimiento: fechaVencimiento
          ? new Date(fechaVencimiento)
          : null,
        datosExtra: row,
        origenCsv: {
          nombreArchivo,
          lineaArchivo,
        },
      });

      await servicio.save();
      importados++;
    }

    res.json({
      message: 'Importación de servicios completada.',
      archivo: nombreArchivo,
      importados,
      errores,
    });
  } catch (err) {
    console.error('[serviciosController.importServiciosCsv] Error:', err);
    res.status(500).json({
      message: 'Error importando servicios desde CSV.',
    });
  }
}

// GET /api/servicios/mios
// Devuelve todos los registros de servicios del usuario logueado
async function getMisServicios(req, res) {
  try {
    const user = req.user;

    const servicios = await ServicioRegistro.find({
      titular: user._id,
    })
      .sort({ periodo: -1, createdAt: -1 })
      .lean();

    res.json({
      servicios,
    });
  } catch (err) {
    console.error('[serviciosController.getMisServicios] Error:', err);
    res.status(500).json({
      message: 'Error obteniendo servicios del usuario.',
    });
  }
}

module.exports = {
  importServiciosCsv,
  getMisServicios,
};
