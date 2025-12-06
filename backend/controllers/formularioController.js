// controllers/formularioController.js
// Controlador genérico de formularios / ANEXOS — Sistema ZN98

const { FormTemplate } = require('../models/FormTemplate');
const { FormSubmission, ESTADOS_FORM } = require('../models/FormSubmission');
const { User, ESTADOS_HABITACIONALES } = require('../models/User');
const { Vivienda } = require('../models/Vivienda');
const { asignarAlojamientoDesdeAnexo22 } = require('../services/anexo22Service');

// Configuración de cada ANEXO (quién puede iniciarlo, si requiere vivienda, etc.)
const ANEXO_CONFIG = {
  // VIVIENDAS FISCALES
  ANEXO_01: {
    nombre: 'Postulación a vivienda fiscal',
    requiereVivienda: false,
    creadores: ['POSTULANTE', 'PERMISIONARIO', 'ALOJADO'],
    puedeVer: ['POSTULANTE', 'PERMISIONARIO', 'ALOJADO', 'ADMIN', 'ADMIN_GENERAL']
  },
  ANEXO_02: {
    nombre: 'Asignación de vivienda fiscal',
    requiereVivienda: false, // La vivienda se elige desde datos.viviendaId
    creadores: ['ADMIN_GENERAL'],
    puedeVer: ['POSTULANTE', 'PERMISIONARIO', 'ADMIN', 'ADMIN_GENERAL'],
    cambioRolObligatorio: true // POSTULANTE -> PERMISIONARIO (ACTIVO o EN_ESPERA según caso)
  },
  ANEXO_03: {
    nombre: 'Recepción de vivienda fiscal',
    requiereVivienda: true,
    creadores: ['INSPECTOR'],
    puedeVer: ['PERMISIONARIO', 'INSPECTOR', 'ADMIN', 'ADMIN_GENERAL']
  },
  ANEXO_04: {
    nombre: 'Ausencia prolongada',
    requiereVivienda: true,
    creadores: ['PERMISIONARIO'],
    puedeVer: [
      'PERMISIONARIO',
      'JEFE_DE_BARRIO',
      'INSPECTOR',
      'ADMIN',
      'ADMIN_GENERAL'
    ],
    filtrarPorBarrioParaJefe: true
  },
  ANEXO_07: {
    nombre: 'Ampliación de novedades de vivienda fiscal',
    requiereVivienda: true,
    creadores: ['PERMISIONARIO'],
    puedeVer: ['PERMISIONARIO', 'INSPECTOR', 'ADMIN', 'ADMIN_GENERAL']
  },
  ANEXO_08: {
    nombre: 'Acta inspección previa vivienda',
    requiereVivienda: true,
    creadores: ['INSPECTOR'],
    puedeVer: ['PERMISIONARIO', 'INSPECTOR', 'ADMIN', 'ADMIN_GENERAL']
  },
  ANEXO_09: {
    nombre: 'Acta de entrega de vivienda fiscal',
    requiereVivienda: true,
    creadores: ['INSPECTOR'],
    puedeVer: ['PERMISIONARIO', 'INSPECTOR', 'ADMIN', 'ADMIN_GENERAL'],
    cambioRolOpcionalPorAdmin: true // lo cierra y puede cambiar rol/estado ADMIN_GENERAL
  },
  ANEXO_11: {
    nombre: 'Pedido de trabajo vivienda fiscal',
    requiereVivienda: true,
    creadores: ['PERMISIONARIO', 'INSPECTOR', 'JEFE_DE_BARRIO', 'ADMIN_GENERAL'],
    puedeVer: [
      'PERMISIONARIO',
      'INSPECTOR',
      'JEFE_DE_BARRIO',
      'ADMIN',
      'ADMIN_GENERAL'
    ],
    filtrarPorBarrioParaJefe: true
  },

  // ALOJAMIENTOS NAVALES (POR TIPO, NO POR UNIDAD)
  ANEXO_21: {
    nombre: 'Postulación para ocupar alojamiento naval',
    requiereVivienda: false,
    creadores: ['POSTULANTE', 'PERMISIONARIO', 'ALOJADO'],
    puedeVer: ['POSTULANTE', 'PERMISIONARIO', 'ALOJADO', 'ADMIN', 'ADMIN_GENERAL']
  },
  ANEXO_22: {
    nombre: 'Asignación de alojamiento naval (por tipo)',
    requiereVivienda: false,
    creadores: ['ADMIN_GENERAL'],
    puedeVer: ['POSTULANTE', 'ALOJADO', 'ADMIN', 'ADMIN_GENERAL'],
    cambioRolObligatorio: true // POSTULANTE -> ALOJADO (al estado ASIGNADO)
  },
  ANEXO_23: {
    nombre: 'Acta recepción alojamiento naval',
    requiereVivienda: false,
    creadores: ['INSPECTOR'],
    puedeVer: ['ALOJADO', 'INSPECTOR', 'ADMIN', 'ADMIN_GENERAL']
  },
  ANEXO_24: {
    nombre: 'Ampliación novedades alojamientos navales',
    requiereVivienda: false,
    creadores: ['INSPECTOR'],
    puedeVer: ['ALOJADO', 'INSPECTOR', 'ADMIN', 'ADMIN_GENERAL']
  },
  ANEXO_25: {
    nombre: 'Acta inspección previa alojamiento',
    requiereVivienda: false,
    creadores: ['INSPECTOR'],
    puedeVer: ['ALOJADO', 'INSPECTOR', 'ADMIN', 'ADMIN_GENERAL']
  },
  ANEXO_26: {
    nombre: 'Acta de entrega de alojamiento naval',
    requiereVivienda: false,
    creadores: ['INSPECTOR'],
    puedeVer: ['ALOJADO', 'INSPECTOR', 'ADMIN', 'ADMIN_GENERAL'],
    cambioRolOpcionalPorAdmin: true // ADMIN_GENERAL puede poner ALOJADO_BAJA u otro estado
  },
  ANEXO_28: {
    nombre: 'Pedido de trabajo alojamiento naval',
    requiereVivienda: false,
    creadores: ['ALOJADO', 'INSPECTOR', 'ADMIN_GENERAL'],
    puedeVer: ['ALOJADO', 'INSPECTOR', 'ADMIN', 'ADMIN_GENERAL']
  }
};

function getAnexoConfig(code) {
  const c = ANEXO_CONFIG[code];
  return c || null;
}

// ─────────────────────────────────────────────
// Crear un ANEXO / formulario
// POST /api/formularios/:codigo
// Body: { usuarioId?: "<id del titular>", datos: { ... } }
// ─────────────────────────────────────────────
async function crearAnexo(req, res) {
  try {
    const code = (req.params.codigo || req.params.code || '').toUpperCase();

    const config = getAnexoConfig(code);
    if (!config) {
      return res.status(404).json({ message: `No se reconoce el anexo ${code}` });
    }

    const userRole = (req.user.role || '').toUpperCase();
    if (!config.creadores.includes(userRole)) {
      return res.status(403).json({
        message: `El rol ${userRole} no puede iniciar el ${code}`
      });
    }

    const template = await FormTemplate.findOne({
      code,
      activo: true
    });

    if (!template) {
      return res.status(404).json({
        message: `No existe plantilla activa para ${code}`
      });
    }

    // ── NUEVO: determinar el usuario TITULAR del anexo ──
    // Si viene usuarioId en el body, el anexo es "para" esa persona
    // (ej.: ANEXO_02 que asigna vivienda a un POSTULANTE).
    // Si no viene, el titular es el mismo que crea (req.user).
    const usuarioId = req.body.usuarioId || req.user._id;
    const usuarioTitular = await User.findById(usuarioId);

    if (!usuarioTitular) {
      return res.status(400).json({
        message: 'Usuario titular del anexo no encontrado (usuarioId inválido).'
      });
    }

    let vivienda = null;
    let barrio = null;

    // Para anexos que requieren vivienda:
    // usamos la vivienda asignada al USUARIO TITULAR (no al que inicia el anexo).
    if (config.requiereVivienda) {
      if (!usuarioTitular.viviendaAsignada) {
        return res.status(400).json({
          message: `El anexo ${code} requiere que el usuario titular tenga una vivienda asignada.`
        });
      }
      vivienda = usuarioTitular.viviendaAsignada;
      const viv = await Vivienda.findById(vivienda);
      if (viv && viv.barrio) {
        barrio = viv.barrio;
      } else if (usuarioTitular.barrioAsignado) {
        barrio = usuarioTitular.barrioAsignado;
      }
    }

    // Si no sacamos barrio de vivienda, usamos barrioAsignado del usuario titular
    if (!barrio && usuarioTitular.barrioAsignado) {
      barrio = usuarioTitular.barrioAsignado;
    }

    const datos = req.body?.datos || {};

    const form = new FormSubmission({
      template: template._id,
      codigo: code,
      usuario: usuarioTitular._id,
      datos,
      estado: 'ENVIADO',
      vivienda,
      barrio
    });

    // El que "realiza" la acción de creación es siempre el usuario logueado (req.user)
    form.cambiarEstado('ENVIADO', req.user._id, 'Creación de anexo');

    await form.save();

    res.status(201).json({
      message: `Anexo ${code} creado correctamente.`,
      anexo: form
    });
  } catch (err) {
    console.error('[formularioController.crearAnexo] Error:', err);
    res.status(500).json({ message: 'Error creando anexo.' });
  }
}

// ─────────────────────────────────────────────
// Obtener MIS anexos (usuario logueado)
// GET /api/formularios/mios?codigo=ANEXO_04
// ─────────────────────────────────────────────
async function getMisAnexos(req, res) {
  try {
    const code = (req.query.codigo || '').toUpperCase() || null;

    const filter = {
      usuario: req.user._id
    };

    if (code) {
      filter.codigo = code;
    }

    const anexos = await FormSubmission.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ anexos });
  } catch (err) {
    console.error('[formularioController.getMisAnexos] Error:', err);
    res.status(500).json({ message: 'Error obteniendo anexos del usuario.' });
  }
}

// ─────────────────────────────────────────────
// Listar anexos por código según rol
// GET /api/formularios/anexo/:codigo
// ─────────────────────────────────────────────
async function listarAnexosPorCodigo(req, res) {
  try {
    const code = (req.params.codigo || '').toUpperCase();
    const config = getAnexoConfig(code);
    if (!config) {
      return res.status(404).json({ message: `No se reconoce el anexo ${code}` });
    }

    const userRole = (req.user.role || '').toUpperCase();

    if (!config.puedeVer.includes(userRole)) {
      return res.status(403).json({
        message: `El rol ${userRole} no puede ver el ${code}`
      });
    }

    const filter = { codigo: code };

    if (
      userRole === 'JEFE_DE_BARRIO' &&
      config.filtrarPorBarrioParaJefe &&
      req.user.barrioAsignado
    ) {
      filter.barrio = req.user.barrioAsignado;
    }

    const anexos = await FormSubmission.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ anexos });
  } catch (err) {
    console.error('[formularioController.listarAnexosPorCodigo] Error:', err);
    res.status(500).json({ message: 'Error listando anexos.' });
  }
}

// ─────────────────────────────────────────────
// Cambiar estado de un anexo y, según el tipo,
// realizar cambios de rol/estadoHabitacional,
// asignar vivienda (ANEXO_02),
// asignar tipo de alojamiento (ANEXO_22),
// liberar vivienda (ANEXO_09),
// activar ocupación futura (ANEXO_03),
// y limpiar tipo de alojamiento (ANEXO_26).
//
// PATCH /api/formularios/:id/estado
// ─────────────────────────────────────────────
async function actualizarEstadoAnexo(req, res) {
  try {
    const { id } = req.params;
    const {
      estado,
      observacion,
      cambiarRol,
      nuevoRol,
      nuevoEstadoHabitacional,
      tipoAlojamientoCodigo
    } = req.body || {};

    if (!estado || !ESTADOS_FORM.includes(estado)) {
      return res.status(400).json({
        message: 'Estado inválido o ausente.'
      });
    }

    const form = await FormSubmission.findById(id);
    if (!form) {
      return res.status(404).json({ message: 'Anexo no encontrado.' });
    }

    const code = form.codigo;
    const config = getAnexoConfig(code);
    if (!config) {
      return res
        .status(400)
        .json({ message: `Config de anexo no encontrada para ${code}.` });
    }

    const userRole = (req.user.role || '').toUpperCase();

    // Solo ADMIN / ADMIN_GENERAL / INSPECTOR / JEFE_DE_BARRIO pueden cambiar estados
    if (
      !['ADMIN', 'ADMIN_GENERAL', 'INSPECTOR', 'JEFE_DE_BARRIO'].includes(
        userRole
      )
    ) {
      return res.status(403).json({ message: 'Su rol no puede cambiar estados.' });
    }

    // ─────────────────────────────────────────────
    // LÓGICA DE CAMBIO DE ROL + ASIGNACIÓN (OBLIGATORIOS)
    // ─────────────────────────────────────────────
    if (config.cambioRolObligatorio && userRole === 'ADMIN_GENERAL') {
      // ANEXO_02: Asignación de vivienda fiscal
      if (code === 'ANEXO_02' && estado === 'CERRADO') {
        const usuario = await User.findById(form.usuario);
        if (!usuario) {
          return res.status(400).json({ message: 'Usuario del anexo no encontrado.' });
        }

        const rolAnterior = usuario.role;
        const estadoAnterior = usuario.estadoHabitacional;

        const viviendaId = form.datos?.viviendaId;
        const fechaDesocupacionPrevistaRaw = form.datos?.fechaDesocupacionPrevista;
        const fechaIngresoPrevistaRaw = form.datos?.fechaIngresoPrevista || null;

        if (!viviendaId) {
          return res.status(400).json({
            message:
              'El ANEXO_02 requiere datos.viviendaId en el formulario para poder asignar vivienda.'
          });
        }

        const vivienda = await Vivienda.findById(viviendaId);
        if (!vivienda) {
          return res
            .status(400)
            .json({ message: 'La vivienda seleccionada no existe.' });
        }

        // Determinar si es ASIGNACIÓN FUTURA (ASIGNADA SIN OCUPACIÓN)
        let esAsignacionFutura = false;
        let fechaIngresoPrevista = null;

        if (fechaIngresoPrevistaRaw) {
          const fi = new Date(fechaIngresoPrevistaRaw);
          if (!isNaN(fi.getTime())) {
            fechaIngresoPrevista = fi;
          }
        }

        const fechaDesocActual =
          vivienda.ocupacionActual?.fechaDesocupacionPrevista
            ? new Date(vivienda.ocupacionActual.fechaDesocupacionPrevista)
            : null;

        // Regla Opción B:
        // Si la vivienda está OCUPADA y hay fechaIngresoPrevista posterior (o igual) a la fecha de desocupación prevista del actual
        if (vivienda.estado === 'OCUPADA' && fechaIngresoPrevista) {
          if (!fechaDesocActual || fechaIngresoPrevista >= fechaDesocActual) {
            esAsignacionFutura = true;
          }
        }

        // Si NO es futura y la vivienda sigue ocupada, no podemos asignar
        if (!esAsignacionFutura && vivienda.estado === 'OCUPADA') {
          return res.status(400).json({
            message:
              'La vivienda seleccionada ya está ocupada. Use asignación futura con fecha de ingreso posterior a la desocupación actual.'
          });
        }

        // Si es asignación FUTURA (ASIGNADA SIN OCUPACIÓN)
        if (esAsignacionFutura) {
          // Usuario pasa a PERMISIONARIO_EN_ESPERA con viviendaAsignada,
          // pero la vivienda sigue con la ocupación actual.
          usuario.role = 'PERMISIONARIO';
          usuario.estadoHabitacional = 'PERMISIONARIO_EN_ESPERA';
          usuario.viviendaAsignada = vivienda._id;

          usuario.registrarCambio({
            realizadoPor: req.user._id,
            tipo: 'CAMBIO_ROL',
            campo: 'role',
            valorAnterior: rolAnterior,
            valorNuevo: usuario.role,
            motivo: `Asignación futura de vivienda (ANEXO_02)`,
            anexoCodigo: code,
            anexoId: form._id
          });

          usuario.registrarCambio({
            realizadoPor: req.user._id,
            tipo: 'CAMBIO_ESTADO_HABITACIONAL',
            campo: 'estadoHabitacional',
            valorAnterior: estadoAnterior,
            valorNuevo: usuario.estadoHabitacional,
            motivo: `Permisionario en espera de ocupar vivienda (ANEXO_02)`,
            anexoCodigo: code,
            anexoId: form._id
          });

          await usuario.save();
        } else {
          // Asignación INMEDIATA (como ya teníamos):
          usuario.role = 'PERMISIONARIO';
          usuario.estadoHabitacional = 'PERMISIONARIO_ACTIVO';

          const fechaAsignacion = new Date();
          let fechaDesocupacionPrevista = null;
          if (fechaDesocupacionPrevistaRaw) {
            const fd = new Date(fechaDesocupacionPrevistaRaw);
            if (!isNaN(fd.getTime())) {
              fechaDesocupacionPrevista = fd;
            }
          }

          // Actualizar usuario
          usuario.viviendaAsignada = vivienda._id;

          // Actualizar vivienda
          vivienda.estado = 'OCUPADA';
          vivienda.ocupacionActual = {
            permisionario: usuario._id,
            fechaAsignacion,
            fechaDesocupacionPrevista,
            recordatorio90Enviado: false
          };

          vivienda.historialOcupacion = vivienda.historialOcupacion || [];
          vivienda.historialOcupacion.push({
            permisionario: usuario._id,
            fechaIngreso: fechaAsignacion,
            fechaEgreso: null,
            motivo: 'ASIGNACION_ANEXO_02'
          });

          await vivienda.save();

          usuario.registrarCambio({
            realizadoPor: req.user._id,
            tipo: 'CAMBIO_ROL',
            campo: 'role',
            valorAnterior: rolAnterior,
            valorNuevo: usuario.role,
            motivo: `Cambio de rol por cierre de ${code}`,
            anexoCodigo: code,
            anexoId: form._id
          });

          usuario.registrarCambio({
            realizadoPor: req.user._id,
            tipo: 'CAMBIO_ESTADO_HABITACIONAL',
            campo: 'estadoHabitacional',
            valorAnterior: estadoAnterior,
            valorNuevo: usuario.estadoHabitacional,
            motivo: `Cambio de estado habitacional por cierre de ${code}`,
            anexoCodigo: code,
            anexoId: form._id
          });

          await usuario.save();
        }
      }

      // ANEXO_22: Asignación de tipo de alojamiento (C01/C02/C03/C04/CUSO) al estado ASIGNADO
      if (code === 'ANEXO_22' && estado === 'ASIGNADO') {
        if (!tipoAlojamientoCodigo) {
          return res.status(400).json({
            message:
              'Para pasar ANEXO_22 a ASIGNADO debe indicar tipoAlojamientoCodigo (C01, C02, C03, C04 o CUSO).'
          });
        }

        try {
          await asignarAlojamientoDesdeAnexo22({
            usuarioId: form.usuario,
            tipoAlojamientoCodigo,
            adminUserId: req.user._id,
            anexoId: form._id,
            motivo:
              observacion ||
              `Asignación de alojamiento (estado ASIGNADO de ${code})`
          });
        } catch (error) {
          console.error(
            '[formularioController.actualizarEstadoAnexo] Error en asignarAlojamientoDesdeAnexo22:',
            error
          );

          if (
            error.code === 'USUARIO_ID_INVALIDO' ||
            error.code === 'ADMIN_ID_INVALIDO' ||
            error.code === 'ANEXO_ID_INVALIDO' ||
            error.code === 'USUARIO_NO_ENCONTRADO' ||
            error.code === 'TIPO_ALOJAMIENTO_INVALIDO'
          ) {
            return res.status(400).json({ message: error.message });
          }

          return res
            .status(500)
            .json({ message: 'Error asignando alojamiento desde ANEXO_22.' });
        }
      }
    }

    // ─────────────────────────────────────────────
    // LÓGICA ESPECÍFICA DE RECEPCIÓN VIVIENDA (ANEXO_03)
    // Permisionario EN_ESPERA pasa a ACTIVO y vivienda pasa a OCUPADA
    // ─────────────────────────────────────────────
    if (code === 'ANEXO_03' && estado === 'CERRADO') {
      const usuario = await User.findById(form.usuario);
      if (!usuario) {
        return res.status(400).json({ message: 'Usuario del anexo no encontrado.' });
      }

      if (!usuario.viviendaAsignada) {
        return res.status(400).json({
          message:
            'El usuario no tiene viviendaAsignada. No se puede registrar recepción (ANEXO_03).'
        });
      }

      const vivienda = await Vivienda.findById(usuario.viviendaAsignada);
      if (!vivienda) {
        return res.status(400).json({
          message:
            'La vivienda asignada al usuario no existe. No se puede registrar recepción.'
        });
      }

      // Si la vivienda todavía figura OCUPADA por otro, es un error de flujo
      if (
        vivienda.estado === 'OCUPADA' &&
        vivienda.ocupacionActual &&
        String(vivienda.ocupacionActual.permisionario) !== String(usuario._id)
      ) {
        return res.status(400).json({
          message:
            'La vivienda aún figura ocupada por otro permisionario. Debe cerrarse ANEXO_09 antes de registrar la recepción.'
        });
      }

      const fechaAsignacion = new Date();

      // Intentamos recuperar fechaDesocupacionPrevista desde el ANEXO_02 más reciente
      let fechaDesocupacionPrevista = null;
      const anexo02 = await FormSubmission.findOne({
        codigo: 'ANEXO_02',
        usuario: usuario._id,
        'datos.viviendaId': String(vivienda._id),
        estado: 'CERRADO'
      }).sort({ createdAt: -1 });

      if (anexo02 && anexo02.datos && anexo02.datos.fechaDesocupacionPrevista) {
        const fd = new Date(anexo02.datos.fechaDesocupacionPrevista);
        if (!isNaN(fd.getTime())) {
          fechaDesocupacionPrevista = fd;
        }
      }

      // Actualizar vivienda como OCUPADA por este usuario
      vivienda.estado = 'OCUPADA';
      vivienda.ocupacionActual = {
        permisionario: usuario._id,
        fechaAsignacion,
        fechaDesocupacionPrevista,
        recordatorio90Enviado: false
      };

      vivienda.historialOcupacion = vivienda.historialOcupacion || [];
      vivienda.historialOcupacion.push({
        permisionario: usuario._id,
        fechaIngreso: fechaAsignacion,
        fechaEgreso: null,
        motivo: 'INGRESO_ANEXO_03'
      });

      await vivienda.save();

      // ACTUALIZAR ESTADO HABITACIONAL: EN_ESPERA → ACTIVO
      const estadoAnterior = usuario.estadoHabitacional;
      if (estadoAnterior === 'PERMISIONARIO_EN_ESPERA') {
        usuario.estadoHabitacional = 'PERMISIONARIO_ACTIVO';

        usuario.registrarCambio({
          realizadoPor: req.user._id,
          tipo: 'CAMBIO_ESTADO_HABITACIONAL',
          campo: 'estadoHabitacional',
          valorAnterior: estadoAnterior,
          valorNuevo: usuario.estadoHabitacional,
          motivo: 'Recepción de vivienda (ANEXO_03)',
          anexoCodigo: code,
          anexoId: form._id
        });

        await usuario.save();
      }
    }

    // ─────────────────────────────────────────────
    // LÓGICA ESPECÍFICA DE ENTREGA DE VIVIENDA (ANEXO_09)
    // ─────────────────────────────────────────────
    if (code === 'ANEXO_09' && estado === 'CERRADO') {
      if (form.vivienda) {
        const vivienda = await Vivienda.findById(form.vivienda);
        if (vivienda) {
          const ahora = new Date();

          // Cerrar ocupación actual, si coincide con este usuario
          if (vivienda.ocupacionActual) {
            const { permisionario } = vivienda.ocupacionActual || {};
            if (permisionario && String(permisionario) === String(form.usuario)) {
              if (Array.isArray(vivienda.historialOcupacion)) {
                const len = vivienda.historialOcupacion.length;
                for (let i = len - 1; i >= 0; i--) {
                  const entry = vivienda.historialOcupacion[i];
                  if (
                    entry.permisionario &&
                    String(entry.permisionario) === String(form.usuario) &&
                    !entry.fechaEgreso
                  ) {
                    entry.fechaEgreso = ahora;
                    entry.motivo = entry.motivo || 'ENTREGA_ANEXO_09';
                    break;
                  }
                }
              }
            }
          }

          // Limpia ocupacionActual
          vivienda.ocupacionActual = null;

          // Ver si existe un permisionario en espera para esta vivienda
          const futuroPermisionario = await User.findOne({
            viviendaAsignada: vivienda._id,
            estadoHabitacional: 'PERMISIONARIO_EN_ESPERA'
          });

          if (futuroPermisionario) {
            // La vivienda queda RESERVADA (asignada sin ocupación)
            vivienda.estado = 'RESERVADA';
          } else {
            // No hay futuro permisionario → vivienda DISPONIBLE
            vivienda.estado = 'DISPONIBLE';
          }

          await vivienda.save();
        }
      }

      // Limpiar viviendaAsignada del permisionario saliente
      const usuarioSaliente = await User.findById(form.usuario);
      if (usuarioSaliente && usuarioSaliente.viviendaAsignada) {
        usuarioSaliente.viviendaAsignada = null;
        await usuarioSaliente.save();
      }
    }

    // ─────────────────────────────────────────────
    // LÓGICA ESPECÍFICA DE ENTREGA DE ALOJAMIENTO (ANEXO_26)
    // ─────────────────────────────────────────────
    if (code === 'ANEXO_26' && estado === 'CERRADO') {
      const usuario = await User.findById(form.usuario);
      if (usuario && usuario.tipoAlojamientoCodigo) {
        const anterior = usuario.tipoAlojamientoCodigo;

        usuario.tipoAlojamientoCodigo = null;

        usuario.registrarCambio({
          realizadoPor: req.user._id,
          tipo: 'CAMBIO_ASIGNACION_ALOJAMIENTO',
          campo: 'tipoAlojamientoCodigo',
          valorAnterior: anterior,
          valorNuevo: null,
          motivo: 'Baja de alojamiento por cierre de ANEXO_26',
          anexoCodigo: code,
          anexoId: form._id
        });

        await usuario.save();
      }
    }

    // ─────────────────────────────────────────────
    // LÓGICA DE CAMBIO DE ROL "OPCIONAL" (ANEXO_09, ANEXO_26)
    // ─────────────────────────────────────────────
    if (
      config.cambioRolOpcionalPorAdmin &&
      userRole === 'ADMIN_GENERAL' &&
      cambiarRol
    ) {
      const usuario = await User.findById(form.usuario);
      if (usuario) {
        const rolAnterior = usuario.role;
        const estadoAnterior = usuario.estadoHabitacional;

        if (nuevoRol) {
          usuario.role = nuevoRol.toUpperCase();
        }

        if (nuevoEstadoHabitacional) {
          const eh = nuevoEstadoHabitacional.toUpperCase();
          if (ESTADOS_HABITACIONALES.includes(eh)) {
            usuario.estadoHabitacional = eh;
          }
        }

        usuario.registrarCambio({
          realizadoPor: req.user._id,
          tipo: 'CAMBIO_ROL',
          campo: 'role',
          valorAnterior: rolAnterior,
          valorNuevo: usuario.role,
          motivo: `Cambio de rol por ${code} (opcional)`,
          anexoCodigo: code,
          anexoId: form._id
        });

        usuario.registrarCambio({
          realizadoPor: req.user._id,
          tipo: 'CAMBIO_ESTADO_HABITACIONAL',
          campo: 'estadoHabitacional',
          valorAnterior: estadoAnterior,
          valorNuevo: usuario.estadoHabitacional,
          motivo: `Cambio de estado habitacional por ${code} (opcional)`,
          anexoCodigo: code,
          anexoId: form._id
        });

        await usuario.save();
      }
    }

    // Finalmente, registrar el cambio de estado del propio ANEXO
    form.cambiarEstado(estado, req.user._id, observacion || '');
    await form.save();

    res.json({
      message: 'Estado de anexo actualizado.',
      anexo: form
    });
  } catch (err) {
    console.error('[formularioController.actualizarEstadoAnexo] Error:', err);
    res.status(500).json({ message: 'Error actualizando estado de anexo.' });
  }
}

module.exports = {
  crearAnexo,
  getMisAnexos,
  listarAnexosPorCodigo,
  actualizarEstadoAnexo
};
