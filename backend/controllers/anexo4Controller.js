// backend/controllers/anexo4Controller.js

const Anexo4 = require("../models/Anexo4");
const ROLES = require("../middleware/roles");
const PDFDocument = require("pdfkit");

const esRole = (usuario, rol) =>
  String(usuario?.role || "").toUpperCase() === rol;

const parseFecha = (value) => {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return d;
};

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
        usuario: usuario._id,
        grado: body.permisionarioGrado || "",
        nombreCompleto:
          body.permisionarioNombre ||
          usuario.nombreCompleto ||
          `${usuario.apellido || ""} ${usuario.nombre || ""}`.trim(),
      },
      datos: {
        unidadHabitacional: barrio, // Barrio
        dpto: vivienda, // Vivienda
        nombreConyuge: representante, // Datos del representante
        destinosFamiliares,
        observaciones,
        fechaSalida,
        fechaRegreso,
      },
      estado: "ENVIADO_PERMISIONARIO",
      historial: [
        {
          actor: usuario._id,
          actorRole: ROLES.PERMISIONARIO,
          accion: "CREADO_PERMISIONARIO",
          observaciones: "Anexo 4 generado y enviado.",
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
// PERMISIONARIO VE SUS ANEXOS 4
// -----------------------------------------------------------------------------
const listarAnexos4Permisionario = async (req, res) => {
  try {
    const usuario = req.user;

    if (!esRole(usuario, ROLES.PERMISIONARIO)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un permisionario puede listar sus Anexo 4.",
      });
    }

    const docs = await Anexo4.find({
      "permisionario.usuario": usuario._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      ok: true,
      gestiones: docs.map((d) => ({
        id: d._id,
        numero: d.numero,
        estado: d.estado,
        creadoEn: d.createdAt,
        unidadHabitacional: d.datos.unidadHabitacional, // barrio
      })),
    });
  } catch (err) {
    console.error("Error listarAnexos4Permisionario:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron obtener los Anexo 4.",
    });
  }
};

// -----------------------------------------------------------------------------
// LISTADO PARA JEFE DE BARRIO
// -----------------------------------------------------------------------------
const listarAnexos4JefeBarrio = async (req, res) => {
  try {
    const usuario = req.user;

    if (!esRole(usuario, ROLES.JEFE_BARRIO)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un Jefe de Barrio puede ver este listado.",
      });
    }

    const docs = await Anexo4.find({}).sort({ createdAt: -1 }).lean();

    return res.json({
      ok: true,
      gestiones: docs.map((d) => ({
        id: d._id,
        numero: d.numero,
        estado: d.estado,
        creadoEn: d.createdAt,
        unidadHabitacional: d.datos.unidadHabitacional, // barrio
        permisionario: d.permisionario?.nombreCompleto || "",
      })),
    });
  } catch (err) {
    console.error("Error listarAnexos4JefeBarrio:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron obtener los Anexo 4 para Jefe de Barrio.",
    });
  }
};

// -----------------------------------------------------------------------------
// LISTADO PARA ADMIN / ADMINISTRACION
// -----------------------------------------------------------------------------
const listarAnexos4Administracion = async (req, res) => {
  try {
    const usuario = req.user;
    const role = String(usuario?.role || "").toUpperCase();

    if (role !== ROLES.ADMIN && role !== ROLES.ADMINISTRACION) {
      return res.status(403).json({
        ok: false,
        message: "Solo Administración o Admin pueden ver este listado.",
      });
    }

    const docs = await Anexo4.find({}).sort({ createdAt: -1 }).lean();

    return res.json({
      ok: true,
      gestiones: docs.map((d) => ({
        id: d._id,
        numero: d.numero,
        estado: d.estado,
        creadoEn: d.createdAt,
        unidadHabitacional: d.datos.unidadHabitacional, // barrio
        permisionario: d.permisionario?.nombreCompleto || "",
      })),
    });
  } catch (err) {
    console.error("Error listarAnexos4Administracion:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudieron obtener los Anexo 4 para Administración.",
    });
  }
};

// -----------------------------------------------------------------------------
// DETALLE DEL ANEXO 4
// -----------------------------------------------------------------------------
const obtenerAnexo4Detalle = async (req, res) => {
  try {
    const usuario = req.user;
    const { id } = req.params;

    const doc = await Anexo4.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ ok: false, message: "Anexo 4 no encontrado." });
    }

    const role = String(usuario.role || "").toUpperCase();

    const esPermisionario =
      role === ROLES.PERMISIONARIO &&
      String(doc.permisionario.usuario) === String(usuario._id);

    const esJefeBarrio = role === ROLES.JEFE_BARRIO;
    const esAdmin = role === ROLES.ADMIN || role === ROLES.ADMINISTRACION;

    if (!esPermisionario && !esJefeBarrio && !esAdmin) {
      return res.status(403).json({
        ok: false,
        message: "No tiene permiso para ver este Anexo 4.",
      });
    }

    return res.json({ ok: true, anexo4: doc });
  } catch (err) {
    console.error("Error obtenerAnexo4Detalle:", err);
    return res.status(500).json({ ok: false, message: "Error en el servidor." });
  }
};

// -----------------------------------------------------------------------------
// JEFE DE BARRIO RECIBE FORMULARIO
// -----------------------------------------------------------------------------
const jefeBarrioConfirmaRecepcion = async (req, res) => {
  try {
    const usuario = req.user;

    if (!esRole(usuario, ROLES.JEFE_BARRIO)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un Jefe de Barrio puede confirmar la recepción.",
      });
    }

    const { id } = req.params;
    const doc = await Anexo4.findById(id);

    if (!doc) {
      return res.status(404).json({ ok: false, message: "Anexo 4 no encontrado." });
    }

    if (doc.estado !== "ENVIADO_PERMISIONARIO") {
      return res.status(400).json({
        ok: false,
        message: "Este Anexo 4 ya fue recibido por el Jefe de Barrio.",
      });
    }

    doc.estado = "RECIBIDO_JEFE_BARRIO";
    doc.jefeBarrio = {
      usuario: usuario._id,
      grado: usuario.grado || "",
      nombreCompleto: usuario.nombre || "",
      fechaRecepcion: new Date(),
    };

    doc.historial.push({
      actor: usuario._id,
      actorRole: ROLES.JEFE_BARRIO,
      accion: "RECIBIDO_JEFE_BARRIO",
      observaciones: req.body?.observaciones || "",
    });

    await doc.save();

    return res.json({
      ok: true,
      message: "Anexo 4 recibido por el Jefe de Barrio.",
      estado: doc.estado,
    });
  } catch (err) {
    console.error("Error jefeBarrioConfirmaRecepcion:", err);
    return res.status(500).json({
      ok: false,
      message: "Error al registrar la recepción.",
    });
  }
};

// -----------------------------------------------------------------------------
// PDF DEL ANEXO 4
// -----------------------------------------------------------------------------
const generarAnexo4PDF = async (req, res) => {
  try {
    const usuario = req.user;
    const { id } = req.params;

    const doc = await Anexo4.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ ok: false, message: "No encontrado." });
    }

    const role = String(usuario.role || "").toUpperCase();

    const permitido =
      (role === ROLES.PERMISIONARIO &&
        String(doc.permisionario.usuario) === String(usuario._id)) ||
      role === ROLES.JEFE_BARRIO ||
      role === ROLES.ADMIN ||
      role === ROLES.ADMINISTRACION;

    if (!permitido) {
      return res.status(403).json({
        ok: false,
        message: "No tiene permiso para descargar este PDF.",
      });
    }

    const pdf = new PDFDocument({ margin: 50 });
    const nombre = `anexo4_${doc.numero}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    pdf.pipe(res);

    pdf.fontSize(16).text("ANEXO 4 - FORMULARIO DE NOVEDADES", {
      align: "center",
    });
    pdf.moveDown();

    pdf.fontSize(12).text(`Número: ${doc.numero}`);
    pdf.text(`Fecha: ${new Date(doc.createdAt).toLocaleString("es-AR")}`);
    pdf.moveDown();

    pdf.fontSize(12).text("Datos del Permisionario", { underline: true });
    pdf.fontSize(10);
    pdf.text(`Nombre: ${doc.permisionario.nombreCompleto}`);
    pdf.text(`Grado: ${doc.permisionario.grado}`);
    pdf.moveDown();

    pdf.fontSize(12).text("Datos informados", { underline: true });
    pdf.fontSize(10);
    pdf.text(`Barrio: ${doc.datos.unidadHabitacional || ""}`);
    pdf.text(`Vivienda: ${doc.datos.dpto || ""}`);
    pdf.text(`Datos del representante: ${doc.datos.nombreConyuge || ""}`);
    pdf.text(`Destinos familiares: ${doc.datos.destinosFamiliares || ""}`);
    pdf.text(`Observaciones: ${doc.datos.observaciones || ""}`);

    if (doc.datos.fechaSalida) {
      pdf.text(
        `Salida: ${new Date(doc.datos.fechaSalida).toLocaleDateString("es-AR")}`
      );
    }
    if (doc.datos.fechaRegreso) {
      pdf.text(
        `Regreso: ${new Date(doc.datos.fechaRegreso).toLocaleDateString("es-AR")}`
      );
    }

    pdf.moveDown();

    if (doc.jefeBarrio?.usuario) {
      pdf.fontSize(12).text("Recepción Jefe de Barrio", { underline: true });
      pdf.fontSize(10);
      pdf.text(`Nombre: ${doc.jefeBarrio.nombreCompleto}`);
      pdf.text(
        `Fecha recepción: ${new Date(
          doc.jefeBarrio.fechaRecepcion
        ).toLocaleString("es-AR")}`
      );
    }

    pdf.end();
  } catch (err) {
    console.error("Error generarAnexo4PDF:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo generar el PDF.",
    });
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
