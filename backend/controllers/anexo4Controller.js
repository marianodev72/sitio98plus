// backend/controllers/anexo4Controller.js

const Anexo4 = require("../models/Anexo4");
const ROLES = require("../middleware/roles");
const PDFDocument = require("pdfkit");

// Helpers
const esRole = (usuario, rol) =>
  String(usuario?.role || "").toUpperCase() === rol;

const parseFecha = (value) => {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return d;
};

const obtenerIdUsuario = (u) => u?.id || u?._id || u?.sub || null;

// -----------------------------------------------------------------------------
// PERMISIONARIO CREA FORMULARIO
// -----------------------------------------------------------------------------
const crearAnexo4 = async (req, res) => {
  try {
    const usuario = req.user;

    if (!esRole(usuario, ROLES.PERMISIONARIO)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un permisionario puede crear el Anexo 4.",
      });
    }

    const userId = obtenerIdUsuario(usuario);
    if (!userId) {
      return res.status(500).json({
        ok: false,
        message: "No se pudo determinar el usuario autenticado.",
      });
    }

    const body = req.body || {};

    const barrio =
      (body.barrio || body.unidadHabitacional || "").toString().trim();
    const vivienda = (body.vivienda || body.dpto || "").toString().trim();
    const representante =
      (body.representante || body.nombreConyuge || "").toString().trim();
    const destinosFamiliares =
      (body.destinosFamiliares || "").toString().trim();
    const observaciones = (body.observaciones || "").toString().trim();

    const fechaSalida = parseFecha(body.fechaSalida);
    const fechaRegreso = parseFecha(body.fechaRegreso);

    if (!barrio) {
      return res.status(400).json({
        ok: false,
        message: "Debés indicar el barrio donde se ubica la vivienda.",
      });
    }

    const last = await Anexo4.findOne().sort({ numero: -1 }).lean();
    const siguienteNumero = last && last.numero ? last.numero + 1 : 1;

    const nuevo = new Anexo4({
      numero: siguienteNumero,

      permisionario: {
        usuario: userId,
        grado: body.permisionarioGrado || "",
        nombreCompleto:
          body.permisionarioNombre ||
          usuario.nombreCompleto ||
          `${usuario.apellido || ""} ${usuario.nombre || ""}`.trim(),
      },

      datos: {
        unidadHabitacional: barrio,
        dpto: vivienda,
        nombreConyuge: representante,
        destinosFamiliares,
        observaciones,
        fechaSalida,
        fechaRegreso,
      },

      estado: "ENVIADO_PERMISIONARIO",

      historial: [
        {
          actor: userId,
          actorRole: ROLES.PERMISIONARIO,
          accion: "CREADO_PERMISIONARIO",
          observaciones: "Anexo 4 generado y enviado.",
          fecha: new Date(),
        },
      ],
    });

    await nuevo.save();

    return res.status(201).json({
      ok: true,
      message: "Anexo 4 creado correctamente.",
      id: nuevo._id,
      numero: nuevo.numero,
      estado: nuevo.estado,
    });
  } catch (err) {
    console.error("Error crearAnexo4:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo crear el Anexo 4.",
    });
  }
};

// -----------------------------------------------------------------------------
// LISTADOS
// -----------------------------------------------------------------------------

// Lista de Anexos 4 del permisionario autenticado
const listarAnexos4Permisionario = async (req, res) => {
  try {
    const usuario = req.user;
    const userId = obtenerIdUsuario(usuario);

    if (!esRole(usuario, ROLES.PERMISIONARIO)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un permisionario puede ver sus Anexos 4.",
      });
    }

    const docs = await Anexo4.find({ "permisionario.usuario": userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      ok: true,
      gestiones: docs.map((d) => ({
        id: d._id,
        numero: d.numero,
        estado: d.estado,
        creadoEn: d.createdAt,
        unidadHabitacional: d.datos?.unidadHabitacional,
      })),
    });
  } catch (err) {
    console.error("Error listarAnexos4Permisionario:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener el listado de Anexos 4.",
    });
  }
};

// Listado para Jefe de Barrio (simplificado)
const listarAnexos4JefeBarrio = async (req, res) => {
  try {
    const usuario = req.user;

    if (!esRole(usuario, ROLES.JEFE_BARRIO)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un Jefe de Barrio puede ver este listado.",
      });
    }

    const docs = await Anexo4.find().sort({ createdAt: -1 }).lean();

    return res.json({
      ok: true,
      gestiones: docs.map((d) => ({
        id: d._id,
        numero: d.numero,
        estado: d.estado,
        creadoEn: d.createdAt,
        unidadHabitacional: d.datos?.unidadHabitacional,
      })),
    });
  } catch (err) {
    console.error("Error listarAnexos4JefeBarrio:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener el listado de Anexos 4.",
    });
  }
};

// Listado para Administración (simplificado)
const listarAnexos4Administracion = async (req, res) => {
  try {
    const usuario = req.user;

    if (!esRole(usuario, ROLES.ADMINISTRACION)) {
      return res.status(403).json({
        ok: false,
        message: "Solo Administración puede ver este listado.",
      });
    }

    const docs = await Anexo4.find().sort({ createdAt: -1 }).lean();

    return res.json({
      ok: true,
      gestiones: docs.map((d) => ({
        id: d._id,
        numero: d.numero,
        estado: d.estado,
        creadoEn: d.createdAt,
        unidadHabitacional: d.datos?.unidadHabitacional,
      })),
    });
  } catch (err) {
    console.error("Error listarAnexos4Administracion:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener el listado de Anexos 4.",
    });
  }
};

// -----------------------------------------------------------------------------
// DETALLE
// -----------------------------------------------------------------------------
const obtenerAnexo4Detalle = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.user;
    const userId = obtenerIdUsuario(usuario);

    const doc = await Anexo4.findById(id).lean();

    if (!doc) {
      return res.status(404).json({
        ok: false,
        message: "Anexo 4 no encontrado.",
      });
    }

    const rol = String(usuario?.role || "").toUpperCase();

    if (rol === ROLES.PERMISIONARIO) {
      if (String(doc.permisionario?.usuario) !== String(userId)) {
        return res.status(403).json({
          ok: false,
          message: "No estás autorizado a ver este Anexo 4.",
        });
      }
    }
    // Otros roles (JEFE_BARRIO, ADMINISTRACION, ADMIN) se permiten por ahora

    return res.json({
      ok: true,
      anexo4: doc,
    });
  } catch (err) {
    console.error("Error obtenerAnexo4Detalle:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener el detalle del Anexo 4.",
    });
  }
};

// -----------------------------------------------------------------------------
// JEFE DE BARRIO CONFIRMA RECEPCIÓN
// -----------------------------------------------------------------------------
const jefeBarrioConfirmaRecepcion = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.user;

    if (!esRole(usuario, ROLES.JEFE_BARRIO)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un Jefe de Barrio puede confirmar la recepción.",
      });
    }

    const userId = obtenerIdUsuario(usuario);

    const doc = await Anexo4.findById(id);
    if (!doc) {
      return res.status(404).json({
        ok: false,
        message: "Anexo 4 no encontrado.",
      });
    }

    doc.estado = "RECIBIDO_JEFE_BARRIO";
    doc.historial.push({
      actor: userId,
      actorRole: ROLES.JEFE_BARRIO,
      accion: "RECIBIDO_JEFE_BARRIO",
      fecha: new Date(),
    });

    await doc.save();

    return res.json({
      ok: true,
      message: "Recepción confirmada.",
    });
  } catch (err) {
    console.error("Error jefeBarrioConfirmaRecepcion:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo actualizar el Anexo 4.",
    });
  }
};

// -----------------------------------------------------------------------------
// PDF (implementación mínima)
// -----------------------------------------------------------------------------
const generarAnexo4PDF = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await Anexo4.findById(id).lean();
    if (!doc) {
      return res.status(404).json({
        ok: false,
        message: "Anexo 4 no encontrado.",
      });
    }

    const pdf = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="anexo4_${doc.numero || id}.pdf"`
    );

    pdf.pipe(res);

    pdf.fontSize(18).text("Anexo 4 - Solicitud de salida", { align: "center" });
    pdf.moveDown();

    pdf.fontSize(12).text(`Número: ${doc.numero || "-"}`);
    pdf.text(
      `Permisionario: ${doc.permisionario?.grado || ""} ${
        doc.permisionario?.nombreCompleto || ""
      }`
    );
    pdf.text(`Unidad habitacional: ${doc.datos?.unidadHabitacional || "-"}`);
    pdf.text(`Vivienda: ${doc.datos?.dpto || "-"}`);
    pdf.moveDown();

    pdf.text(`Representante / Cónyuge: ${doc.datos?.nombreConyuge || "-"}`);
    pdf.text(
      `Destino / familiares: ${doc.datos?.destinosFamiliares || "-"}`
    );
    pdf.text(`Fecha de salida: ${doc.datos?.fechaSalida || "-"}`);
    pdf.text(`Fecha de regreso: ${doc.datos?.fechaRegreso || "-"}`);
    pdf.moveDown();

    pdf.text(`Observaciones: ${doc.datos?.observaciones || "-"}`);

    pdf.end();
  } catch (err) {
    console.error("Error generarAnexo4PDF:", err);
    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        message: "No se pudo generar el PDF.",
      });
    }
  }
};

module.exports = {
  crearAnexo4,
  listarAnexos4Permisionario,
  listarAnexos4JefeBarrio,
  listarAnexos4Administracion,
  obtenerAnexo4Detalle,
  jefeBarrioConfirmaRecepcion,
  generarAnexo4PDF,
};
