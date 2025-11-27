// backend/controllers/anexo11Controller.js
const Anexo11 = require("../models/Anexo11");

// -----------------------------------------------------------------------------
// Crear un nuevo Anexo 11 (pedido de trabajo) - lo inicia el PERMISIONARIO
// -----------------------------------------------------------------------------
const crearAnexo11 = async (req, res) => {
  try {
    const userId = req.user && req.user.id;

    console.log("BODY crearAnexo11:", JSON.stringify(req.body, null, 2));

    const { permisionario } = req.body || {};

    if (!permisionario) {
      return res.status(400).json({
        ok: false,
        message: "Faltan los datos del permisionario.",
      });
    }

    if (!permisionario.unidad || !permisionario.dpto) {
      return res.status(400).json({
        ok: false,
        message: "Unidad y departamento son obligatorios.",
      });
    }

    if (!permisionario.solicita) {
      return res.status(400).json({
        ok: false,
        message: "Debe indicar qué solicita (CAMBIO, REPARACION, etc.).",
      });
    }

    const doc = new Anexo11({
      permisionario: {
        unidad: permisionario.unidad,
        dpto: permisionario.dpto,
        mb: permisionario.mb || "",
        mz: permisionario.mz || "",
        casa: permisionario.casa || "",
        grado: permisionario.grado || "",
        apellidoNombre: permisionario.apellidoNombre || "",
        solicita: permisionario.solicita,
        detalle: permisionario.detalle || "",
      },
      creadoPor: userId || null,
      estado: "ABIERTO",
      historialEstados: [
        {
          estado: "ABIERTO",
          usuario: userId || null,
          observaciones: "Creado por permisionario.",
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
        creadoEn: doc.createdAt,
      },
    });
  } catch (err) {
    console.error("Error en crearAnexo11:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo crear el Anexo 11. Intente más tarde.",
    });
  }
};

// -----------------------------------------------------------------------------
// Listar Anexos 11 iniciados por el permisionario logueado
// -----------------------------------------------------------------------------
const listarAnexos11DelPermisionario = async (req, res) => {
  try {
    const userId = req.user && req.user.id;

    const query = {};
    if (userId) {
      query.creadoPor = userId;
    }

    const anexos = await Anexo11.find(query).sort({ createdAt: -1 }).lean();

    return res.json({
      ok: true,
      anexos: anexos.map((a) => ({
        id: a._id,
        numero: a.numero,
        estado: a.estado,
        creadoEn: a.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error en listarAnexos11DelPermisionario:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron obtener los Anexo 11.",
    });
  }
};

// -----------------------------------------------------------------------------
// Obtener detalle de un Anexo 11
//   - Si es PERMISIONARIO, solo puede ver los que creó
//   - Otros roles (ADMIN, etc.) se manejarán más adelante
// -----------------------------------------------------------------------------
const obtenerAnexo11Detalle = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const userRole = req.user && req.user.role;
    const { id } = req.params;

    const doc = await Anexo11.findById(id).lean();

    if (!doc) {
      return res.status(404).json({
        ok: false,
        message: "Anexo 11 no encontrado.",
      });
    }

    // Regla básica de seguridad:
    // - PERMISIONARIO solo ve sus propios pedidos
    if (userRole === "PERMISIONARIO" && doc.creadoPor) {
      if (String(doc.creadoPor) !== String(userId)) {
        return res.status(403).json({
          ok: false,
          message: "No tiene permiso para ver este Anexo 11.",
        });
      }
    }

    // Para otros roles autenticados (ADMIN, etc.) de momento dejamos pasar.
    // Más adelante se puede endurecer con requireRole en la ruta.

    return res.json({
      ok: true,
      anexo11: doc,
    });
  } catch (err) {
    console.error("Error en obtenerAnexo11Detalle:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener el Anexo 11.",
    });
  }
};

module.exports = {
  crearAnexo11,
  listarAnexos11DelPermisionario,
  obtenerAnexo11Detalle,
};
