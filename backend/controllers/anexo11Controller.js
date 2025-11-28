// backend/controllers/anexo11Controller.js

const Anexo11 = require("../models/Anexo11");
const ROLES = require("../middleware/roles");
const PDFDocument = require("pdfkit");

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

    if (String(usuario.role || "").toUpperCase() !== ROLES.PERMISIONARIO) {
      return res.status(403).json({
        ok: false,
        message: "Acceso permitido solo para permisionarios.",
      });
    }

    const body = { ...(req.body || {}) };

    if (body.permisionario && typeof body.permisionario === "object") {
      const p = body.permisionario;

      body.unidad = p.unidad || body.unidad;
      body.dpto = p.dpto || body.dpto;
      body.mb = p.mb || body.mb;
      body.mz = p.mz || body.mz;
      body.casa = p.casa || body.casa;

      body.solicito =
        p.solicita ||
        p.solicito ||
        body.solicito ||
        body.tipoSolicitud ||
        body.tipo;

      body.detalle = p.detalle || body.detalle || body.detallePedido;

      body.permisionarioNombre =
        p.apellidoNombre ||
        p.nombreCompleto ||
        body.permisionarioNombre ||
        "";

      body.grado = p.grado || body.grado || "";
    }

    const errores = [];

    if (!body.unidad) {
      errores.push("La unidad de vivienda es obligatoria.");
    }

    if (!body.dpto) {
      errores.push("El departamento es obligatorio.");
    }

    const tipoSolicitudRaw =
      body.tipoSolicitud || body.solicito || body.tipo || "";
    const tipoSolicitud = String(tipoSolicitudRaw).toUpperCase().trim();

    const tiposValidos = ["CAMBIO", "REPARACION", "VERIFICACION", "PROVISION"];
    if (!tiposValidos.includes(tipoSolicitud)) {
      errores.push(
        "Tipo de solicitud inválido. Debe ser CAMBIO, REPARACION, VERIFICACION o PROVISION."
      );
    }

    const detallePedido =
      body.detallePedido || body.detalle || body.descripcion || "";
    if (!detallePedido || !String(detallePedido).trim()) {
      errores.push("El detalle del pedido no puede estar vacío.");
    }

    if (errores.length > 0) {
      return res.status(400).json({
        ok: false,
        message: "Error en los datos enviados.",
        errores,
      });
    }

    const vivienda = extraerViviendaDelBody(body);

    const permisionarioNombre =
      body.permisionarioNombre ||
      (body.permisionario && body.permisionario.apellidoNombre) ||
      "";
    const grado = body.grado || (body.permisionario && body.permisionario.grado) || "";

    const last = await Anexo11.findOne().sort({ numero: -1 }).lean();
    const siguienteNumero = last && last.numero ? last.numero + 1 : 1;

    const nuevoAnexo = new Anexo11({
      numero: siguienteNumero,
      permisionario: {
        usuario: usuario._id,
        grado: grado,
        nombreCompleto: permisionarioNombre,
      },
      vivienda,
      tipoSolicitud,
      detallePedido: detallePedido.trim(),
      estado: "ENVIADO",
      historial: [
        {
          fecha: new Date(),
          actor: usuario._id,
          actorRole: ROLES.PERMISIONARIO,
          accion: "CREADO",
          observaciones: "Gestión iniciada por el permisionario.",
        },
      ],
    });

    await nuevoAnexo.save();

    return res.status(201).json({
      ok: true,
      message: "Anexo 11 creado correctamente.",
      anexo11: {
        id: nuevoAnexo._id,
        numero: nuevoAnexo.numero,
        estado: nuevoAnexo.estado,
        tipoSolicitud: nuevoAnexo.tipoSolicitud,
        detallePedido: nuevoAnexo.detallePedido,
        creadoEn: nuevoAnexo.createdAt,
      },
    });
  } catch (err) {
    console.error("Error en crearAnexo11:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo crear el Anexo 11.",
    });
  }
};

// -----------------------------------------------------------------------------
// GET /api/anexo11/mis
// Lista los Anexo 11 del permisionario logueado
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

    if (String(usuario.role || "").toUpperCase() !== ROLES.PERMISIONARIO) {
      return res.status(403).json({
        ok: false,
        message: "Acceso permitido solo para permisionarios.",
      });
    }

    const anexos = await Anexo11.find({
      "permisionario.usuario": usuario._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const gestiones = anexos.map((a) => ({
      id: a._id,
      numero: a.numero,
      estado: a.estado,
      tipoSolicitud: a.tipoSolicitud,
      detallePedido: a.detallePedido,
      creadoEn: a.createdAt,
    }));

    return res.json({
      ok: true,
      anexo11: gestiones,
      gestiones,
    });
  } catch (err) {
    console.error("Error en listarAnexos11Permisionario:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener el listado de Anexo 11.",
    });
  }
};

// -----------------------------------------------------------------------------
// GET /api/anexo11/:id
// Detalle de un Anexo 11 (permisionario lo ve solo si es suyo)
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

// -----------------------------------------------------------------------------
// GET /api/anexo11/:id/pdf
// Genera y descarga el PDF del Anexo 11 (permisionario sólo si es suyo)
// -----------------------------------------------------------------------------
const generarAnexo11PDF = async (req, res) => {
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
        message: "No tenés permiso para descargar este Anexo 11.",
      });
    }

    const nombreArchivo = `anexo11_${doc.numero || doc._id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`
    );

    const pdf = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    pdf.pipe(res);

    pdf.fontSize(16).text("ANEXO 11 - Pedido de trabajo", {
      align: "center",
    });
    pdf.moveDown();

    pdf.fontSize(10).text(`Número de gestión: ${doc.numero || doc._id}`);
    if (doc.createdAt) {
      pdf.text(
        `Fecha de creación: ${new Date(doc.createdAt).toLocaleString("es-AR")}`
      );
    }
    pdf.moveDown();

    pdf.fontSize(12).text("Datos del permisionario", { underline: true });
    pdf.moveDown(0.5);
    pdf.fontSize(10).text(
      `Permisionario: ${(doc.permisionario?.grado || "")} ${
        doc.permisionario?.nombreCompleto || ""
      }`
    );
    pdf.moveDown();

    pdf.fontSize(12).text("Datos de la vivienda", { underline: true });
    pdf.moveDown(0.5);
    if (doc.vivienda) {
      pdf
        .fontSize(10)
        .text(`Unidad: ${doc.vivienda.unidad || ""}`)
        .text(`Departamento: ${doc.vivienda.dpto || ""}`)
        .text(`MB: ${doc.vivienda.mb || ""}`)
        .text(`MZ: ${doc.vivienda.mz || ""}`)
        .text(`Casa: ${doc.vivienda.casa || ""}`);
    } else {
      pdf.fontSize(10).text("Vivienda: (sin datos)");
    }
    pdf.moveDown();

    pdf.fontSize(12).text("Solicitud", { underline: true });
    pdf.moveDown(0.5);
    pdf.fontSize(10).text(`Tipo de solicitud: ${doc.tipoSolicitud || "—"}`);
    pdf.moveDown(0.5);
    pdf.fontSize(10).text("Detalle del pedido:");
    pdf.moveDown(0.5);
    pdf.fontSize(10).text(doc.detallePedido || "—", {
      width: 500,
    });
    pdf.moveDown();

    pdf.fontSize(9).text(`Estado actual: ${doc.estado || "ENVIADO"}`, {
      align: "right",
    });

    pdf.end();
  } catch (err) {
    console.error("Error en generarAnexo11PDF:", err);
    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        message: "No se pudo generar el PDF del Anexo 11.",
      });
    }
  }
};

module.exports = {
  crearAnexo11,
  listarAnexos11Permisionario,
  obtenerAnexo11Detalle,
  generarAnexo11PDF,
};
