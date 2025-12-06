// validators/adminValidator.js
const { z } = require("zod");

// Datos básicos de usuario
const baseUserSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  apellido: z.string().trim().min(1).optional(),
  grado: z.string().trim().optional(),
  destino: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  emailInstitucional: z.string().email().optional(),
  emailPersonal: z.string().email().optional(),
  barrioAsignado: z.string().trim().optional(),
  notas: z.string().trim().optional(),
});

// Crear usuario
const createUserSchema = baseUserSchema.extend({
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  emailInstitucional: z.string().email(),
  role: z.string().min(1),
});

// Actualizar usuario (parcial)
const updateUserSchema = baseUserSchema;

// Cambiar rol
const cambiarRolSchema = z.object({
  nuevoRol: z.string().trim().min(1),
});

// Cambiar estado habitacional
const cambiarEstadoSchema = z.object({
  nuevoEstado: z.string().trim().min(1),
});

// Bloquear / desbloquear
const bloqueoSchema = z.object({
  motivo: z.string().trim().min(5),
});

// Resetear contraseña
const resetPassSchema = z.object({
  motivo: z.string().trim().min(5),
});

// Asignar o desasignar vivienda/alojamiento POR ORDEN SUPERIOR
const asignacionOSSchema = z.object({
  usuarioId: z.string().trim().min(1),
  recursoId: z.string().trim().min(1),
  motivo: z.string().trim().default("POR ORDEN SUPERIOR"),
});

function validate(schema) {
  return (req, res, next) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (e) {
      return res.status(400).json({
        error: "Datos inválidos",
        detalles: e.errors,
      });
    }
  };
}

module.exports = {
  validateCreateUser: validate(createUserSchema),
  validateUpdateUser: validate(updateUserSchema),
  validateCambioRol: validate(cambiarRolSchema),
  validateCambioEstado: validate(cambiarEstadoSchema),
  validateBloqueo: validate(bloqueoSchema),
  validateResetPass: validate(resetPassSchema),
  validateAsignacionOS: validate(asignacionOSSchema),
};
