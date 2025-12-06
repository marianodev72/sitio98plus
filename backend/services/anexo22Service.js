// services/anexo22Service.js

const mongoose = require('mongoose');
const User = require('../models/User');
const {
  TIPOS_ALOJAMIENTO_VALIDOS,
  esTipoAlojamientoValido
} = require('../constants/alojamientoTipos');

/**
 * Helper interno para registrar un cambio en historialCambios del usuario.
 * 
 * Se asume que el modelo User tiene un campo:
 *   historialCambios: [{
 *     fecha,
 *     realizadoPor,
 *     tipo,
 *     campo,
 *     valorAnterior,
 *     valorNuevo,
 *     motivo,
 *     anexoCodigo,
 *     anexoId
 *   }]
 */
function registrarCambio(userDoc, {
  realizadoPor,
  tipo,
  campo,
  valorAnterior,
  valorNuevo,
  motivo,
  anexoCodigo,
  anexoId
}) {
  if (!Array.isArray(userDoc.historialCambios)) {
    userDoc.historialCambios = [];
  }

  userDoc.historialCambios.push({
    fecha: new Date(),
    realizadoPor,
    tipo,
    campo,
    valorAnterior,
    valorNuevo,
    motivo,
    anexoCodigo,
    anexoId
  });
}

/**
 * Asigna un TIPO de alojamiento a un usuario a partir de ANEXO_22.
 * 
 * Esto es lo que debe ejecutarse cuando el ANEXO_22 pasa a estado "ASIGNADO".
 * 
 * Efectos:
 * - role:                POSTULANTE -> ALOJADO (u otro rol previo -> ALOJADO)
 * - estadoHabitacional:  -> ALOJADO_ACTIVO
 * - tipoAlojamientoCodigo: uno de ['C01','C02','C03','C04','CUSO']
 * - historialCambios: CAMBIO_ROL, CAMBIO_ESTADO_HABITACIONAL, CAMBIO_ASIGNACION_ALOJAMIENTO
 * 
 * Parámetros:
 * - usuarioId: ObjectId del usuario a alojar
 * - tipoAlojamientoCodigo: string ('C01'|'C02'|'C03'|'C04'|'CUSO')
 * - adminUserId: ObjectId del ADMIN_GENERAL que ejecuta la acción
 * - anexoId: ObjectId del FormSubmission de ANEXO_22
 * - motivo: string (descripción breve; puede incluir referencia interna)
 */
async function asignarAlojamientoDesdeAnexo22({
  usuarioId,
  tipoAlojamientoCodigo,
  adminUserId,
  anexoId,
  motivo
}) {
  if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
    const error = new Error('usuarioId inválido');
    error.code = 'USUARIO_ID_INVALIDO';
    throw error;
  }

  if (adminUserId && !mongoose.Types.ObjectId.isValid(adminUserId)) {
    const error = new Error('adminUserId inválido');
    error.code = 'ADMIN_ID_INVALIDO';
    throw error;
  }

  if (anexoId && !mongoose.Types.ObjectId.isValid(anexoId)) {
    const error = new Error('ANEXO_ID_INVALIDO');
    error.code = 'ANEXO_ID_INVALIDO';
    throw error;
  }

  if (!esTipoAlojamientoValido(tipoAlojamientoCodigo)) {
    const error = new Error(
      `tipoAlojamientoCodigo inválido. Debe ser uno de: ${TIPOS_ALOJAMIENTO_VALIDOS.join(', ')}`
    );
    error.code = 'TIPO_ALOJAMIENTO_INVALIDO';
    throw error;
  }

  const usuario = await User.findById(usuarioId);
  if (!usuario) {
    const error = new Error('Usuario no encontrado');
    error.code = 'USUARIO_NO_ENCONTRADO';
    throw error;
  }

  const anexoCodigo = 'ANEXO_22';

  const cambios = [];

  // Cambio de rol -> ALOJADO (si no lo está ya)
  if (usuario.role !== 'ALOJADO') {
    cambios.push({
      tipo: 'CAMBIO_ROL',
      campo: 'role',
      valorAnterior: usuario.role,
      valorNuevo: 'ALOJADO'
    });
    usuario.role = 'ALOJADO';
  }

  // Cambio de estadoHabitacional -> ALOJADO_ACTIVO (si no lo está ya)
  if (usuario.estadoHabitacional !== 'ALOJADO_ACTIVO') {
    cambios.push({
      tipo: 'CAMBIO_ESTADO_HABITACIONAL',
      campo: 'estadoHabitacional',
      valorAnterior: usuario.estadoHabitacional,
      valorNuevo: 'ALOJADO_ACTIVO'
    });
    usuario.estadoHabitacional = 'ALOJADO_ACTIVO';
  }

  // Asignación de tipo de alojamiento
  if (usuario.tipoAlojamientoCodigo !== tipoAlojamientoCodigo) {
    cambios.push({
      tipo: 'CAMBIO_ASIGNACION_ALOJAMIENTO',
      campo: 'tipoAlojamientoCodigo',
      valorAnterior: usuario.tipoAlojamientoCodigo || null,
      valorNuevo: tipoAlojamientoCodigo
    });
    usuario.tipoAlojamientoCodigo = tipoAlojamientoCodigo;
  }

  // Si no hay cambios, devolvemos el usuario sin tocar historial
  if (cambios.length === 0) {
    const usuarioLimpio = usuario.toObject();
    if (usuarioLimpio.passwordHash) delete usuarioLimpio.passwordHash;
    if (usuarioLimpio.salt) delete usuarioLimpio.salt;
    return {
      usuario: usuarioLimpio,
      cambiosAplicados: []
    };
  }

  const realizadoPor = adminUserId ? new mongoose.Types.ObjectId(adminUserId) : null;

  cambios.forEach((c) => {
    registrarCambio(usuario, {
      realizadoPor,
      tipo: c.tipo,
      campo: c.campo,
      valorAnterior: c.valorAnterior,
      valorNuevo: c.valorNuevo,
      motivo: motivo || 'Asignación de alojamiento desde ANEXO_22',
      anexoCodigo,
      anexoId: anexoId ? new mongoose.Types.ObjectId(anexoId) : null
    });
  });

  await usuario.save();

  const usuarioLimpio = usuario.toObject();
  if (usuarioLimpio.passwordHash) delete usuarioLimpio.passwordHash;
  if (usuarioLimpio.salt) delete usuarioLimpio.salt;

  return {
    usuario: usuarioLimpio,
    cambiosAplicados: cambios
  };
}

module.exports = {
  asignarAlojamientoDesdeAnexo22
};
