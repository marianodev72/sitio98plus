// backend/controllers/anexo2Controller.js

const Anexo2 = require("../models/Anexo2");
const ViviendaOcupacion = require("../models/ViviendaOcupacion");
const Permisionario = require("../models/permisionarioModel");
const User = require("../models/user");
const Vivienda = require("../models/vivienda");

const { ROLES } = require("../middleware/auth");

// Utilidad: agrega registro al historial
function pushHistorial(doc, actorId, actorRole, accion, observaciones) {
  doc.historial.push({
    actor: actorId,
    actorRole,
    accion,
    observaciones,
    fecha: new Date(),
  });
}

// ---------------------------------------------------------------------------
// Crear Anexo 2 (ADMIN GENERAL / ADMINISTRACION)
// ---------------------------------------------------------------------------
exports.crearAnexo2 = async (req, res) => {
  try {
    const adminUser = req.user;

    const {
      userId,
      grado,
      apellidoNombres,
      matricula,
      destino,
      codigoVivienda,
      direccion,
      barrio,
      localidad,
      fechaAsignacion,
      fechaEntrega,
      postulacionId,
    } = req.body;

    if (!userId || !codigoVivienda) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos obligatorios (userId, codigoVivienda).",
      });
    }

    const usuario = await User.findById(userId);
    if (!usuario) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado.",
      });
    }

    // Podríamos validar que la vivienda exista en el catálogo
    const viviendaCatalogo = await Vivienda.findOne({ unidad: codigoVivienda });
    // No hacemos hard-fail si no existe, pero sería recomendable ajustarlo
    if (!viviendaCatalogo) {
      console.warn(
        "[ANEXO2] Advertencia: vivienda no encontrada en catálogo Mongo para código",
        codigoVivienda
      );
    }

    const anexo = new Anexo2({
      user: usuario._id,
      grado,
      apellidoNombres,
      matricula,
      destino,
      codigoVivienda,
      direccion,
      barrio,
      localidad,
      fechaAsignacion,
      fechaEntrega,
      postulacionId: postulacionId || null,
      estado: "PENDIENTE_FIRMA_PERMISIONARIO",
    });

    pushHistorial(
      anexo,
      adminUser._id,
      adminUser.role || "ADMIN",
      "CREADO_POR_ADMIN",
      "Anexo 02 creado por administrador."
    );

    await anexo.save();

    return res.json({
      ok: true,
      anexo2: anexo,
    });
  } catch (err) {
    console.error("[ANEXO2] Error al crear Anexo 02:", err);
    return res.status(500).json({
      ok: false,
      message: "Error interno al crear Anexo 02.",
    });
  }
};

// ---------------------------------------------------------------------------
// Firma del permisionario (OK inmodificable)
// ---------------------------------------------------------------------------
exports.firmarPermisionario = async (req, res) => {
  try {
    const usuario = req.user;
    const { id } = req.params;

    const anexo = await Anexo2.findById(id);
    if (!anexo) {
      return res.status(404).json({ ok: false, message: "Anexo 02 no encontrado." });
    }

    if (String(anexo.user) !== String(usuario._id)) {
      return res.status(403).json({
        ok: false,
        message: "No está autorizado para firmar este Anexo 02.",
      });
    }

    if (anexo.estado !== "PENDIENTE_FIRMA_PERMISIONARIO") {
      return res.status(400).json({
        ok: false,
        message: "El Anexo 02 no está pendiente de firma del permisionario.",
      });
    }

    anexo.firmaPermisionario = {
      usuario: usuario._id,
      nombreCompleto: anexo.apellidoNombres,
      grado: anexo.grado,
      fecha: new Date(),
    };

    anexo.estado = "PENDIENTE_CIERRE_ADMIN";

    pushHistorial(
      anexo,
      usuario._id,
      usuario.role || "PERMISIONARIO",
      "FIRMADO_PERMISIONARIO",
      "Permisionario da conformidad al Anexo 02."
    );

    await anexo.save();

    return res.json({
      ok: true,
      anexo2: anexo,
    });
  } catch (err) {
    console.error("[ANEXO2] Error al firmar Anexo 02:", err);
    return res.status(500).json({
      ok: false,
      message: "Error interno al firmar Anexo 02.",
    });
  }
};

// ---------------------------------------------------------------------------
// Cierre por ADMIN GENERAL (asigna vivienda, crea/actualiza permisionario,
// actualiza ocupación y rol de usuario)
// ---------------------------------------------------------------------------
exports.cerrarPorAdmin = async (req, res) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;

    const anexo = await Anexo2.findById(id);
    if (!anexo) {
      return res.status(404).json({ ok: false, message: "Anexo 02 no encontrado." });
    }

    if (anexo.estado !== "PENDIENTE_CIERRE_ADMIN") {
      return res.status(400).json({
        ok: false,
        message: "El Anexo 02 no está pendiente de cierre por admin.",
      });
    }

    // 1) Crear / actualizar Permisionario
    let permisionario = null;

    if (anexo.permisionarioId) {
      permisionario = await Permisionario.findById(anexo.permisionarioId);
    }

    if (!permisionario) {
      // Creamos un Permisionario básico a partir de los datos del Anexo
      permisionario = new Permisionario({
        user: anexo.user,
        nombreCompleto: anexo.apellidoNombres,
        grado: anexo.grado,
        casaNumero: anexo.codigoVivienda,
      });
    } else {
      permisionario.casaNumero = anexo.codigoVivienda;
    }

    await permisionario.save();
    anexo.permisionarioId = permisionario._id;

    // 2) Actualizar rol del usuario a PERMISIONARIO si corresponde
    const usuario = await User.findById(anexo.user);
    if (usuario && usuario.role === "POSTULANTE") {
      usuario.role = "PERMISIONARIO";
      await usuario.save();
    }

    // 3) Reglas de ocupación:
    //    - liberar cualquier otra vivienda HABITADA por este permisionario
    //    - marcar esta vivienda como HABITADA
    const codigo = anexo.codigoVivienda;

    // Liberar otras viviendas ocupadas por este permisionario
    await ViviendaOcupacion.updateMany(
      {
        permisionario: permisionario._id,
        codigo: { $ne: codigo },
        estadoOperativo: "HABITADA",
      },
      {
        $set: {
          estadoOperativo: "DISPONIBLE",
          permisionario: null,
          permisionarioNombre: null,
          permisionarioGrado: null,
          updatedBy: adminUser._id,
          updatedAt: new Date(),
        },
      }
    );

    // Upsert de la vivienda asignada
    let ocupacion = await ViviendaOcupacion.findOne({ codigo });

    if (!ocupacion) {
      // Intentamos obtener datos del catálogo de viviendas
      const viviendaCatalogo = await Vivienda.findOne({ unidad: codigo });

      ocupacion = new ViviendaOcupacion({
        codigo,
        barrio: viviendaCatalogo ? viviendaCatalogo.barrio : anexo.barrio,
        dormitorios: viviendaCatalogo ? viviendaCatalogo.dormitorios : undefined,
      });
    }

    ocupacion.estadoOperativo = "HABITADA";
    ocupacion.permisionario = permisionario._id;
    ocupacion.permisionarioNombre = permisionario.nombreCompleto;
    ocupacion.permisionarioGrado = permisionario.grado;
    ocupacion.anexo2 = anexo._id;
    ocupacion.updatedBy = adminUser._id;
    ocupacion.updatedAt = new Date();

    await ocupacion.save();
    anexo.viviendaOcupacionId = ocupacion._id;

    // 4) Marcar firma admin y cerrar Anexo 2
    anexo.firmaAdmin = {
      usuario: adminUser._id,
      nombreCompleto: adminUser.email, // o nombre si lo agregan en user
      grado: "ADMIN_GENERAL", // ajustar si tienen el campo
      fecha: new Date(),
    };

    anexo.estado = "CERRADO";

    pushHistorial(
      anexo,
      adminUser._id,
      adminUser.role || "ADMIN",
      "CERRADO_ADMIN",
      "Admin general cierra el Anexo 02 y asigna la vivienda."
    );

    await anexo.save();

    return res.json({
      ok: true,
      anexo2: anexo,
      ocupacion,
      permisionario,
    });
  } catch (err) {
    console.error("[ANEXO2] Error al cerrar Anexo 02:", err);
    return res.status(500).json({
      ok: false,
      message: "Error interno al cerrar Anexo 02.",
    });
  }
};

// ---------------------------------------------------------------------------
// Listado básico para admin
// ---------------------------------------------------------------------------
exports.listAnexosAdmin = async (_req, res) => {
  try {
    const anexos = await Anexo2.find()
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({
      ok: true,
      anexos,
    });
  } catch (err) {
    console.error("[ANEXO2] Error al listar anexos:", err);
    return res.status(500).json({
      ok: false,
      message: "Error interno al listar Anexos 02.",
    });
  }
};

// ---------------------------------------------------------------------------
// Ver detalle (para admin y para permisionario)
// ---------------------------------------------------------------------------
exports.getAnexo2 = async (req, res) => {
  try {
    const { id } = req.params;
    const anexo = await Anexo2.findById(id);

    if (!anexo) {
      return res.status(404).json({ ok: false, message: "Anexo 02 no encontrado." });
    }

    return res.json({
      ok: true,
      anexo2: anexo,
    });
  } catch (err) {
    console.error("[ANEXO2] Error al obtener Anexo 02:", err);
    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener Anexo 02.",
    });
  }
};
