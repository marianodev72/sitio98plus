// backend/controllers/anexo11Controller.js

const Anexo11 = require("../models/Anexo11");
const ROLES = require("../middleware/roles");

// -----------------------------------------------------------------------------
// Helper: obtiene datos de vivienda desde el body admitiendo distintos formatos
// -----------------------------------------------------------------------------
function extraerViviendaDelBody(body = {}) {
  if (body.vivienda && typeof body.vivienda === "object") {
    return {
      unidad: body.vivienda.unidad || "",
      dpto: body.vivienda.dpto || "",
      mb: body.vivienda.mb || "",
      mz: body.vivienda.mz || "",
      casa: body.vivienda.casa || "",
    };
  }

  return {
    unidad: body.unidad || body.unidadVivienda || "",
    dpto: body.dpto || body.departamento || "",
    mb: body.mb || "",
    mz: body.mz || "",
    casa: body.casa || "",
  };
}

// -----------------------------------------------------------------------------
// POST /api/anexo11
// Crear un nuevo Anexo 11 (pedido de trabajo) - lo inicia el PERMISIONARIO
// -----------------------------------------------------------------------------
const crearAnexo11 = async (req, res) => {
  try {
    const usuario = req.user;

    if (!usuario || !usuario._id) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado.",
      });
    }

    const role = String(usuario.role || "").toUpperCase();
    if (role !== ROLES.PERMISIONARIO) {
      return res.status(403).json({
        ok: false,
        message: "Solo los permisionarios pueden crear Anexo 11.",
      });
    }

    // Clonamos el body para poder "aplanar" permisionario.*
    const body = { ...(req.body || {}) };

    // 🔧 APLANAR CAMPOS QUE VIENEN EN body.permisionario
    if (body.permisionario && typeof body.permisionario === "object") {
      const p = body.permisionario;

      body.unidad = body.unidad || p.unidad;
      body.unidadVivienda = body.unidadVivienda || p.unidad;
      body.dpto = body.dpto || p.dpto;
      body.departamento = body.departamento || p.dpto;
      body.mb = body.mb || p.mb;
      body.mz = body.mz || p.mz;
      body.casa = body.casa || p.casa;

      body.grado = body.grado || p.grado;
      body.permisionarioNombre =
        body.permisionarioNombre || p.apellidoNombre;

      body.solicito = body.solicito || p.solicita;
      body.detalle = body.detalle || p.detalle;
    }

    console.log("[ANEXO11] crearAnexo11 body:", JSON.stringify(body, null, 2));

    const vivienda = extraerViviendaDelBody(body);

    // 👇 Aceptamos varios nombres posibles para el tipo
    const rawTipo =
      body.tipoSolicitud ||
      body.solicito ||
      body.tipo ||
      body.tipo_solicitud ||
      "";
    const tipoSolicitud = rawTipo.toString().trim().toUpperCase();

    // 👇 Aceptamos varios nombres posibles para el detalle
    const detallePedido =
      (
        body.detallePedido ||
        body.detalle ||
        body.detalleSolicitud ||
        body.detalle_solicitud ||
        body.descripcion ||
        body.descripcionPedido
      )?.toString().trim() || "";

    const grado =
      (
        body.grado ||
        body.permisionarioGrado ||
        body.gradoPermisionario
      )?.toString() || "";

    const nombreCompleto =
      body.permisionarioNombre ||
      body.permisionarioNombreCompleto ||
      `${usuario.apellido || ""} ${usuario.nombre || ""}`.trim();

    // ------------------- Validaciones mínimas -------------------
    const errores = [];

    if (!vivienda.unidad || !vivienda.dpto) {
      errores.push(
        "Debés indicar al menos unidad y departamento de la vivienda."
      );
    }

    const TIPOS_VALIDOS = [
      "CAMBIO",
      "REPARACION",
      "VERIFICACION",
      "PROVISION",
    ];

    if (!TIPOS_VALIDOS.includes(tipoSolicitud)) {
      errores.push(
        "Tipo de solicitud inválido. Debe ser CAMBIO, REPARACION, VERIFICACION o PROVISION."
      );
    }

    if (!detallePedido) {
      errores.push("Debés detallar el pedido.");
    }

    if (errores.length > 0) {
      console.warn("[ANEXO11] Errores de validación:", errores);
      return res.status(400).json({
        ok: false,
        message: "Hay errores en el formulario.",
        errores,
      });
    }

    // ------------------- Lógica de guardado -------------------
    const ultimo = await Anexo11.findOne().sort({ numero: -1 }).lean();
    const siguienteNumero = ultimo && ultimo.numero ? ultimo.numero + 1 : 1;

    const doc = new Anexo11({
      numero: siguienteNumero,
      permisionario: {
        usuario: usuario._id,
        grado,
        nombreCompleto,
      },
      vivienda,
      tipoSolicitud,
      detallePedido,
      estado: "ENVIADO",
      historial: [
        {
          actor: usuario._id,
          actorRole: role,
          accion: "CREADO",
          observaciones:
            "Pedido de trabajo generado por el permisionario desde el portal.",
        },
      ],
    });

    await doc.save();

    return res.status(201).json({
      ok: true,
      message: "Pedido de trabajo creado correctamente.",
      anexo11: {
        id: doc._id,
        numero: doc.numero,
        estado: doc.estado,
        tipoSolicitud: doc.tipoSolicitud,
        creadoEn: doc.createdAt,
      },
    });
  } catch (err) {
    console.error("Error en crearAnexo11:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo crear el Anexo 11. Intentalo nuevamente.",
    });
  }
};

// -----------------------------------------------------------------------------
// GET /api/anexo11/mis
// Lista Anexos 11 del permisionario logueado
// -----------------------------------------------------------------------------
const listarAnexos11Permisionario = async (req, res) => {
  try {
    const usuario = req.user;

    if (!usuario || !usuario._id) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado.",
      });
    }

    const role = String(usuario.role || "").toUpperCase();
    if (role !== ROLES.PERMISIONARIO) {
      return res.status(403).json({
        ok: false,
        message: "Solo los permisionarios pueden ver sus Anexo 11.",
      });
    }

    const docs = await Anexo11.find({
      "permisionario.usuario": usuario._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      ok: true,
      anexo11: docs.map((d) => ({
        id: d._id,
        numero: d.numero,
        estado: d.estado,
        tipoSolicitud: d.tipoSolicitud,
        detallePedido: d.detallePedido,
        creadoEn: d.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error en listarAnexos11Permisionario:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron obtener los Anexo 11.",
    });
  }
};

// -----------------------------------------------------------------------------
// GET /api/anexo11/:id
// Detalle del Anexo 11 (permisionario sólo ve los suyos)
// -----------------------------------------------------------------------------
const obtenerAnexo11Detalle = async (req, res) => {
  try {
    const usuario = req.user;

    if (!usuario || !usuario._id) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado.",
      });
    }

    const { id } = req.params;

    const doc = await Anexo11.findById(id).lean();

    if (!doc) {
      return res.status(404).json({
        ok: false,
        message: "Anexo 11 no encontrado.",
      });
    }

    const role = String(usuario.role || "").toUpperCase();

    if (
      role === ROLES.PERMISIONARIO &&
      String(doc.permisionario.usuario) !== String(usuario._id)
    ) {
      return res.status(403).json({
        ok: false,
        message: "No tenés permiso para ver este Anexo 11.",
      });
    }

    return res.json({
      ok: true,
      anexo11: doc,
    });
  } catch (err) {
    console.error("Error en obtenerAnexo11Detalle:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener el detalle del Anexo 11.",
    });
  }
};

module.exports = {
  crearAnexo11,
  listarAnexos11Permisionario,
  obtenerAnexo11Detalle,
};
