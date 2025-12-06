// validators/userAdminValidator.js
const { z } = require('zod');

/**
 * Valores permitidos para rol y estadoHabitacional.
 * Ajusta estos arrays según los que maneje tu modelo User.
 */
const ROLES_VALIDOS = [
  'POSTULANTE',
  'PERMISIONARIO',
  'ALOJADO',
  'INSPECTOR',
  'JEFE_DE_BARRIO',
  'ADMIN',
  'ADMIN_GENERAL'
];

const ESTADOS_HABITACIONALES_VALIDOS = [
  'SIN_VIVIENDA',
  'PERMISIONARIO_ACTIVO',
  'PERMISIONARIO_BAJA',
  'ALOJADO_ACTIVO',
  'ALOJADO_BAJA',
  'BAJA_INSTITUCIONAL'
];

const actualizarRolEstadoSchema = z.object({
  role: z
    .string()
    .min(1, 'El rol es obligatorio')
    .refine((val) => ROLES_VALIDOS.includes(val), {
      message: 'Rol inválido'
    }),
  estadoHabitacional: z
    .string()
    .min(1, 'El estadoHabitacional es obligatorio')
    .refine((val) => ESTADOS_HABITACIONALES_VALIDOS.includes(val), {
      message: 'estadoHabitacional inválido'
    }),
  motivo: z
    .string()
    .min(5, 'Debe indicar un motivo mínimo')
    .max(500, 'El motivo es demasiado largo')
});

const actualizarBloqueoSchema = z.object({
  bloqueado: z.boolean({
    required_error: 'Debe indicar el valor de bloqueado'
  }),
  motivo: z
    .string()
    .min(5, 'Debe indicar un motivo mínimo')
    .max(500, 'El motivo es demasiado largo')
});

/**
 * Middleware: validar body para cambio de rol + estadoHabitacional
 */
function validateActualizarRolEstado(req, res, next) {
  try {
    const parsed = actualizarRolEstadoSchema.parse(req.body);
    req.validatedBody = parsed;
    return next();
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({
        error: 'Datos inválidos para actualización de rol/estadoHabitacional',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      });
    }
    console.error('Error en validateActualizarRolEstado:', err);
    return res.status(500).json({ error: 'Error interno de validación' });
  }
}

/**
 * Middleware: validar body para bloqueo/desbloqueo
 */
function validateActualizarBloqueo(req, res, next) {
  try {
    const parsed = actualizarBloqueoSchema.parse(req.body);
    req.validatedBody = parsed;
    return next();
  } catch (err) {
    if (err.issues) {
      return res.status(400).json({
        error: 'Datos inválidos para bloqueo/desbloqueo de usuario',
        detalles: err.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      });
    }
    console.error('Error en validateActualizarBloqueo:', err);
    return res.status(500).json({ error: 'Error interno de validación' });
  }
}

module.exports = {
  validateActualizarRolEstado,
  validateActualizarBloqueo,
  ROLES_VALIDOS,
  ESTADOS_HABITACIONALES_VALIDOS
};
