// controllers/tareasController.js
// Tareas programadas (recordatorios, procesos periódicos) — Sistema ZN98

const { Vivienda } = require('../models/Vivienda');
const { User } = require('../models/User');
const { Message } = require('../models/Message');

// Calcula el rango de un día (00:00:00 a 23:59:59) para una fecha dada
function getDiaRango(fechaBase) {
  const from = new Date(
    fechaBase.getFullYear(),
    fechaBase.getMonth(),
    fechaBase.getDate(),
    0,
    0,
    0,
    0
  );
  const to = new Date(
    fechaBase.getFullYear(),
    fechaBase.getMonth(),
    fechaBase.getDate(),
    23,
    59,
    59,
    999
  );
  return { from, to };
}

// POST /api/tareas/recordatorios-desocupacion/run
// Solo ADMIN_GENERAL
async function runRecordatoriosDesocupacion(req, res) {
  try {
    const hoy = new Date();
    const target = new Date();
    target.setDate(hoy.getDate() + 90);

    const { from, to } = getDiaRango(target);

    const viviendas = await Vivienda.find({
      'ocupacionActual.permisionario': { $ne: null },
      'ocupacionActual.fechaDesocupacionPrevista': { $gte: from, $lte: to },
      'ocupacionActual.recordatorio90Enviado': { $ne: true },
      estado: 'OCUPADA',
    }).lean();

    if (!viviendas.length) {
      return res.json({
        message:
          'No se encontraron viviendas con vencimiento de ocupación a 90 días.',
        cantidad: 0,
      });
    }

    // Cargar usuarios relevantes para notificaciones
    const admins = await User.find({
      role: 'ADMIN',
      activo: true,
      bloqueado: false,
    }).lean();

    const adminsGeneral = await User.find({
      role: 'ADMIN_GENERAL',
      activo: true,
      bloqueado: false,
    }).lean();

    const mensajesAInsertar = [];
    const viviendasIdsActualizar = [];

    for (const viv of viviendas) {
      const permId = viv.ocupacionActual?.permisionario;
      if (!permId) continue;

      const permisionario = await User.findById(permId).lean();
      if (!permisionario) continue;

      const barrio = viv.barrio || permisionario.barrioAsignado || null;

      // Inspectores del barrio
      let inspectores = [];
      if (barrio) {
        inspectores = await User.find({
          role: 'INSPECTOR',
          barrioAsignado: barrio,
          activo: true,
          bloqueado: false,
        }).lean();
      }

      const fechaDes = new Date(
        viv.ocupacionActual.fechaDesocupacionPrevista
      );
      const fechaDesStr = fechaDes.toLocaleDateString('es-AR');

      const asuntoPerm =
        'Aviso de vencimiento de ocupación de vivienda fiscal';
      const cuerpoPerm = `
Se le informa que en 90 días, el día ${fechaDesStr}, se extingue su derecho de ocupación de la vivienda fiscal "${viv.codigo}"${barrio ? ` (Barrio: ${barrio})` : ''
}.
Le solicitamos tomar conocimiento de esta situación y comunicarse con la administración en caso de dudas.
`;

      // Mensaje para permisionario
      mensajesAInsertar.push({
        remitente: null,
        destinatario: permisionario._id,
        asunto: asuntoPerm.trim(),
        cuerpo: cuerpoPerm.trim(),
        barrio: barrio || '',
        tipo: 'NOTIFICACION_SISTEMA',
        meta: {
          tipoRecordatorio: 'DESOCUPACION_90',
          viviendaId: viv._id,
          fechaDesocupacionPrevista: viv.ocupacionActual.fechaDesocupacionPrevista,
        },
      });

      // Mensajes administrativos
      const asuntoAdmin = `Recordatorio: vencimiento de ocupación de vivienda ${viv.codigo}`;
      const cuerpoAdmin = `
La vivienda "${viv.codigo}"${barrio ? ` (Barrio: ${barrio})` : ''} tiene una fecha de desocupación prevista para el día ${fechaDesStr}.
Permisionario: ${permisionario.apellido}, ${permisionario.nombre} (Matrícula: ${permisionario.matricula})
Este mensaje fue generado automáticamente a 90 días del vencimiento.
`;

      const destinatariosAdmin = [
        ...inspectores,
        ...admins,
        ...adminsGeneral,
      ];

      // evitar duplicados por _id
      const vistos = new Set();
      for (const d of destinatariosAdmin) {
        const key = String(d._id);
        if (vistos.has(key)) continue;
        vistos.add(key);

        mensajesAInsertar.push({
          remitente: null,
          destinatario: d._id,
          asunto: asuntoAdmin.trim(),
          cuerpo: cuerpoAdmin.trim(),
          barrio: barrio || '',
          tipo: 'NOTIFICACION_SISTEMA',
          meta: {
            tipoRecordatorio: 'DESOCUPACION_90',
            viviendaId: viv._id,
            fechaDesocupacionPrevista:
              viv.ocupacionActual.fechaDesocupacionPrevista,
          },
        });
      }

      viviendasIdsActualizar.push(viv._id);
    }

    if (mensajesAInsertar.length) {
      await Message.insertMany(mensajesAInsertar);
    }

    if (viviendasIdsActualizar.length) {
      await Vivienda.updateMany(
        { _id: { $in: viviendasIdsActualizar } },
        { $set: { 'ocupacionActual.recordatorio90Enviado': true } }
      );
    }

    res.json({
      message:
        'Recordatorios de desocupación procesados correctamente.',
      viviendasProcesadas: viviendasIdsActualizar.length,
      mensajesGenerados: mensajesAInsertar.length,
    });
  } catch (err) {
    console.error(
      '[tareasController.runRecordatoriosDesocupacion] Error:',
      err
    );
    res.status(500).json({
      message: 'Error ejecutando tarea de recordatorios de desocupación.',
    });
  }
}

module.exports = {
  runRecordatoriosDesocupacion,
};
