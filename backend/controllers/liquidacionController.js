// controllers/liquidacionController.js
// Controlador de liquidaciones — Sistema ZN98

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const { User } = require('../models/User');
const { Liquidacion } = require('../models/Liquidacion');
const { Vivienda } = require('../models/Vivienda');
const { Alojamiento } = require('../models/Alojamiento');

// Función de ayuda para leer CSV y normalizar nombres de columnas
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

// POST /api/liquidaciones/import-csv
// Solo ADMIN / ADMIN_GENERAL
// Espera multipart/form-data con:
// - file: archivo CSV
// - periodo (opcional, si no viene en el CSV)
// Ejemplo de columnas mínimas en el CSV:
// matricula, periodo, monto, concepto, numeroLiquidacion, fechaVencimiento
async function importLiquidacionesCsv(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió archivo CSV.' });
    }

    const csvPath = req.file.path;
    const records = parseCsvFile(csvPath);

    const nombreArchivo = path.basename(csvPath);

    let importadas = 0;
    const errores = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const lineaArchivo = i + 2; // asumimos encabezado en línea 1

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

      const montoStr = row.monto || row.importe || row.total;
      const monto = montoStr ? Number(montoStr) : NaN;

      if (!montoStr || Number.isNaN(monto)) {
        errores.push({
          linea: lineaArchivo,
          matricula,
          error: 'Monto inválido o ausente.',
        });
        continue;
      }

      const concepto =
        row.concepto || row.detalle || 'DESCUENTO_HABERES_MENSUAL';

      const numeroLiquidacion =
        row.numeroliquidacion || row['numero_liquidacion'] || null;

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

      // Intentar recuperar vivienda/alojamiento actual desde el usuario
      let vivienda = null;
      let alojamiento = null;

      if (user.viviendaAsignada) {
        vivienda = user.viviendaAsignada;
      }
      if (user.alojamientoAsignado) {
        alojamiento = user.alojamientoAsignado;
      }

      // Creamos una nueva liquidación por fila
      const cargos = [
        {
          concepto,
          monto,
        },
      ];

      const liquidacion = new Liquidacion({
        titular: user._id,
        tipoTitular,
        matricula: user.matricula,
        vivienda,
        alojamiento,
        periodo,
        fechaEmision: new Date(),
        fechaVencimiento: fechaVencimiento
          ? new Date(fechaVencimiento)
          : null,
        cargos,
        montoTotal: monto,
        montoPagado: 0,
        saldoPendiente: monto,
        estado: 'PENDIENTE',
        numeroLiquidacion,
        origenCsv: {
          nombreArchivo,
          lineaArchivo,
        },
        observacionesInternas: '',
      });

      // Recalcular estado por las dudas (usa cargos/pagos)
      liquidacion.recalcularEstado();

      await liquidacion.save();
      importadas++;
    }

    res.json({
      message: 'Importación de liquidaciones completada.',
      archivo: nombreArchivo,
      importadas,
      errores,
    });
  } catch (err) {
    console.error('[liquidacionController.importLiquidacionesCsv] Error:', err);
    res.status(500).json({
      message: 'Error importando liquidaciones desde CSV.',
    });
  }
}

// GET /api/liquidaciones/mias
// Devuelve todas las liquidaciones del usuario logueado
async function getMisLiquidaciones(req, res) {
  try {
    const user = req.user;

    const liquidaciones = await Liquidacion.find({
      titular: user._id,
    })
      .sort({ periodo: -1, fechaEmision: -1 })
      .lean();

    res.json({
      liquidaciones,
    });
  } catch (err) {
    console.error('[liquidacionController.getMisLiquidaciones] Error:', err);
    res.status(500).json({
      message: 'Error obteniendo liquidaciones del usuario.',
    });
  }
}

module.exports = {
  importLiquidacionesCsv,
  getMisLiquidaciones,
};
