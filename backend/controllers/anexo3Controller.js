// backend/controllers/anexo3Controller.js

const Anexo3 = require("../models/Anexo3");
const ROLES = require("../middleware/roles");
const PDFDocument = require("pdfkit");

const esRole = (usuario, roleConst) =>
  String(usuario?.role || "").toUpperCase() === roleConst;

// Normaliza el ID del usuario (acepta req.user.id o req.user._id)
const getUserId = (usuario) => {
  if (!usuario) return null;
  if (usuario._id) return usuario._id.toString();
  if (usuario.id) return usuario.id.toString();
  return null;
};

// -----------------------------------------------------------------------------
// POST /api/anexo3
// Crea un nuevo Anexo 3 (lo inicia el INSPECTOR)
// -----------------------------------------------------------------------------
const crearAnexo3 = async (req, res) => {
  try {
    const usuario = req.user;
    const userId = getUserId(usuario);

    if (!usuario || !userId) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }

    if (!esRole(usuario, ROLES.INSPECTOR)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un Inspector puede iniciar un Anexo 3.",
      });
    }

    const body = req.body || {};
    const errores = [];

    if (!body.permisionarioUsuario) {
      errores.push("Es obligatorio indicar el usuario permisionario.");
    }

    if (!body.vivienda || !body.vivienda.unidadHabitacional) {
      errores.push("La unidad habitacional es obligatoria.");
    }

    if (errores.length > 0) {
      return res.status(400).json({
        ok: false,
        message: "Error en los datos enviados.",
        errores,
      });
    }

    const last = await Anexo3.findOne().sort({ numero: -1 }).lean();
    const siguienteNumero = last && last.numero ? last.numero + 1 : 1;

    const nuevo = new Anexo3({
      numero: siguienteNumero,
      permisionario: {
        usuario: body.permisionarioUsuario,
        grado: body.permisionarioGrado || "",
        nombreCompleto: body.permisionarioNombre || "",
      },
      inspector: {
        usuario: userId,
        grado: body.inspectorGrado || "",
        nombreCompleto: body.inspectorNombre || usuario.nombre || "",
      },
      vivienda: {
        unidadHabitacional: body.vivienda.unidadHabitacional,
        direccion: body.vivienda.direccion || "",
        localidad: body.vivienda.localidad || "",
        provincia: body.vivienda.provincia || "",
      },
      material: body.material || {},
      documentacion: body.documentacion || {},
      medidores: body.medidores || {},
      estadoSistemas: body.estadoSistemas || {},
      novedades: body.novedades || "",
      estado: "PENDIENTE_CONFORME_PERMISIONARIO",
      historial: [
        {
          actor: userId,
          actorRole: ROLES.INSPECTOR,
          accion: "CREADO_INSPECTOR",
          observaciones: "Acta de recepción creada por inspector.",
        },
      ],
    });

    await nuevo.save();

    return res.status(201).json({
      ok: true,
      message: "Anexo 3 creado correctamente.",
      anexo3: {
        id: nuevo._id,
        numero: nuevo.numero,
        estado: nuevo.estado,
        creadoEn: nuevo.createdAt,
        permisionario: nuevo.permisionario,
        vivienda: nuevo.vivienda,
      },
    });
  } catch (err) {
    console.error("Error en crearAnexo3:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo crear el Anexo 3.",
    });
  }
};

// -----------------------------------------------------------------------------
// GET /api/anexo3/mis
// Lista los Anexos 3 del permisionario logueado
// -----------------------------------------------------------------------------
const listarAnexos3Permisionario = async (req, res) => {
  try {
    const usuario = req.user;
    const userId = getUserId(usuario);

    if (!usuario || !userId) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }

    if (!esRole(usuario, ROLES.PERMISIONARIO)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un permisionario puede ver sus Anexos 3.",
      });
    }

    const anexos = await Anexo3.find({
      "permisionario.usuario": userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const gestiones = anexos.map((a) => ({
      id: a._id,
      numero: a.numero,
      estado: a.estado,
      creadoEn: a.createdAt,
      vivienda: a.vivienda,
    }));

    return res.json({
      ok: true,
      anexo3: gestiones,
      gestiones,
    });
  } catch (err) {
    console.error("Error en listarAnexos3Permisionario:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener el listado de Anexo 3.",
    });
  }
};

// -----------------------------------------------------------------------------
// GET /api/anexo3/:id
// Detalle del Anexo 3 (permisionario dueño / inspector asignado / admin)
// -----------------------------------------------------------------------------
const obtenerAnexo3Detalle = async (req, res) => {
  try {
    const usuario = req.user;
    const userId = getUserId(usuario);

    if (!usuario || !userId) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }

    const { id } = req.params;
    const doc = await Anexo3.findById(id).lean();

    if (!doc) {
      return res
        .status(404)
        .json({ ok: false, message: "Anexo 3 no encontrado." });
    }

    const role = String(usuario.role || "").toUpperCase();

    const esPermisionario =
      role === ROLES.PERMISIONARIO &&
      String(doc.permisionario.usuario) === String(userId);

    const esInspector =
      role === ROLES.INSPECTOR &&
      String(doc.inspector.usuario) === String(userId);

    const esAdmin = role === ROLES.ADMIN;

    if (!esPermisionario && !esInspector && !esAdmin) {
      return res.status(403).json({
        ok: false,
        message: "No tenés permiso para ver este Anexo 3.",
      });
    }

    return res.json({ ok: true, anexo3: doc });
  } catch (err) {
    console.error("Error en obtenerAnexo3Detalle:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo obtener el detalle del Anexo 3.",
    });
  }
};

// -----------------------------------------------------------------------------
// PATCH /api/anexo3/:id/conforme
// Permisionario da CONFORME -> PENDIENTE_CIERRE_ADMIN
// -----------------------------------------------------------------------------
const permisionarioDaConforme = async (req, res) => {
  try {
    const usuario = req.user;
    const userId = getUserId(usuario);

    if (!usuario || !userId) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }

    if (!esRole(usuario, ROLES.PERMISIONARIO)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un permisionario puede dar conforme.",
      });
    }

    const { id } = req.params;
    const doc = await Anexo3.findById(id);

    if (!doc) {
      return res
        .status(404)
        .json({ ok: false, message: "Anexo 3 no encontrado." });
    }

    if (String(doc.permisionario.usuario) !== String(userId)) {
      return res.status(403).json({
        ok: false,
        message: "No podés dar conforme a un Anexo 3 que no es tuyo.",
      });
    }

    if (doc.estado !== "PENDIENTE_CONFORME_PERMISIONARIO") {
      return res.status(400).json({
        ok: false,
        message:
          "Este Anexo 3 no está pendiente de conforme del permisionario.",
      });
    }

    doc.estado = "PENDIENTE_CIERRE_ADMIN";
    doc.historial.push({
      actor: userId,
      actorRole: ROLES.PERMISIONARIO,
      accion: "CONFORME_PERMISIONARIO",
      observaciones: req.body?.observaciones || "",
    });

    await doc.save();

    return res.json({
      ok: true,
      message: "Conforme registrado. El trámite quedó pendiente de cierre.",
      estado: doc.estado,
    });
  } catch (err) {
    console.error("Error en permisionarioDaConforme:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo registrar el conforme.",
    });
  }
};

// -----------------------------------------------------------------------------
// PATCH /api/anexo3/:id/revision
// Permisionario NO está de acuerdo -> EN_REVISION_INSPECTOR
// -----------------------------------------------------------------------------
const permisionarioPideRevision = async (req, res) => {
  try {
    const usuario = req.user;
    const userId = getUserId(usuario);

    if (!usuario || !userId) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }

    if (!esRole(usuario, ROLES.PERMISIONARIO)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un permisionario puede solicitar revisión.",
      });
    }

    const { id } = req.params;
    const doc = await Anexo3.findById(id);

    if (!doc) {
      return res
        .status(404)
        .json({ ok: false, message: "Anexo 3 no encontrado." });
    }

    if (String(doc.permisionario.usuario) !== String(userId)) {
      return res.status(403).json({
        ok: false,
        message: "No podés solicitar revisión de un Anexo 3 que no es tuyo.",
      });
    }

    if (doc.estado !== "PENDIENTE_CONFORME_PERMISIONARIO") {
      return res.status(400).json({
        ok: false,
        message:
          "Este Anexo 3 no está en un estado válido para pedir revisión.",
      });
    }

    doc.estado = "EN_REVISION_INSPECTOR";
    doc.historial.push({
      actor: userId,
      actorRole: ROLES.PERMISIONARIO,
      accion: "REVISION_SOLICITADA_PERMISIONARIO",
      observaciones: req.body?.observaciones || "",
    });

    await doc.save();

    return res.json({
      ok: true,
      message:
        "Se registró la solicitud de revisión. El Inspector deberá analizarla.",
      estado: doc.estado,
    });
  } catch (err) {
    console.error("Error en permisionarioPideRevision:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo registrar la solicitud de revisión.",
    });
  }
};

// -----------------------------------------------------------------------------
// PATCH /api/anexo3/:id/enviar-a-permisionario
// Inspector reenvía luego de revisar -> PENDIENTE_CONFORME_PERMISIONARIO
// -----------------------------------------------------------------------------
const inspectorReenviaAPermisionario = async (req, res) => {
  try {
    const usuario = req.user;
    const userId = getUserId(usuario);

    if (!usuario || !userId) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }

    if (!esRole(usuario, ROLES.INSPECTOR)) {
      return res.status(403).json({
        ok: false,
        message: "Solo un Inspector puede reenviar al permisionario.",
      });
    }

    const { id } = req.params;
    const doc = await Anexo3.findById(id);

    if (!doc) {
      return res
        .status(404)
        .json({ ok: false, message: "Anexo 3 no encontrado." });
    }

    if (String(doc.inspector.usuario) !== String(userId)) {
      return res.status(403).json({
        ok: false,
        message:
          "No sos el inspector asignado a este Anexo 3, no podés reenviarlo.",
      });
    }

    if (doc.estado !== "EN_REVISION_INSPECTOR") {
      return res.status(400).json({
        ok: false,
        message:
          "Este Anexo 3 no está en estado de revisión por parte del inspector.",
      });
    }

    doc.estado = "PENDIENTE_CONFORME_PERMISIONARIO";
    doc.historial.push({
      actor: userId,
      actorRole: ROLES.INSPECTOR,
      accion: "REENVIADO_A_PERMISIONARIO",
      observaciones: req.body?.observaciones || "",
    });

    await doc.save();

    return res.json({
      ok: true,
      message:
        "El Anexo 3 fue reenviado al permisionario y quedó pendiente de conforme.",
      estado: doc.estado,
    });
  } catch (err) {
    console.error("Error en inspectorReenviaAPermisionario:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo reenviar el Anexo 3 al permisionario.",
    });
  }
};

// -----------------------------------------------------------------------------
// PATCH /api/anexo3/:id/cerrar
// Admin General cierra el trámite -> CERRADO
// -----------------------------------------------------------------------------
const adminCierraAnexo3 = async (req, res) => {
  try {
    const usuario = req.user;
    const userId = getUserId(usuario);

    if (!usuario || !userId) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }

    if (!esRole(usuario, ROLES.ADMIN)) {
      return res.status(403).json({
        ok: false,
        message: "Solo el Administrador General puede cerrar el trámite.",
      });
    }

    const { id } = req.params;
    const doc = await Anexo3.findById(id);

    if (!doc) {
      return res
        .status(404)
        .json({ ok: false, message: "Anexo 3 no encontrado." });
    }

    if (doc.estado !== "PENDIENTE_CIERRE_ADMIN") {
      return res.status(400).json({
        ok: false,
        message:
          "Este Anexo 3 no está pendiente de cierre por el Administrador General.",
      });
    }

    doc.estado = "CERRADO";
    doc.administradorCierre = {
      usuario: userId,
      grado: req.body?.adminGrado || "",
      nombreCompleto: req.body?.adminNombre || usuario.nombre || "",
      fechaCierre: new Date(),
    };

    doc.historial.push({
      actor: userId,
      actorRole: ROLES.ADMIN,
      accion: "CERRADO_ADMIN",
      observaciones: req.body?.observaciones || "",
    });

    await doc.save();

    return res.json({
      ok: true,
      message: "El Anexo 3 fue cerrado correctamente.",
      estado: doc.estado,
    });
  } catch (err) {
    console.error("Error en adminCierraAnexo3:", err);
    return res.status(500).json({
      ok: false,
      message: "No se pudo cerrar el Anexo 3.",
    });
  }
};

// -----------------------------------------------------------------------------
// GET /api/anexo3/:id/pdf
// Genera y descarga el PDF del Anexo 3
// (permisionario dueño / inspector asignado / admin)
// -----------------------------------------------------------------------------
const generarAnexo3PDF = async (req, res) => {
  try {
    const usuario = req.user;
    const userId = getUserId(usuario);

    if (!usuario || !userId) {
      return res.status(401).json({ ok: false, message: "No autenticado." });
    }

    const { id } = req.params;
    const doc = await Anexo3.findById(id).lean();

    if (!doc) {
      return res
        .status(404)
        .json({ ok: false, message: "Anexo 3 no encontrado." });
    }

    const role = String(usuario.role || "").toUpperCase();

    const esPermisionario =
      role === ROLES.PERMISIONARIO &&
      String(doc.permisionario.usuario) === String(userId);

    const esInspector =
      role === ROLES.INSPECTOR &&
      String(doc.inspector.usuario) === String(userId);

    const esAdmin = role === ROLES.ADMIN;

    if (!esPermisionario && !esInspector && !esAdmin) {
      return res.status(403).json({
        ok: false,
        message: "No tenés permiso para descargar este Anexo 3.",
      });
    }

    const nombreArchivo = `anexo3_${doc.numero || doc._id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`
    );

    const pdf = new PDFDocument({ size: "A4", margin: 50 });
    pdf.pipe(res);

    pdf.fontSize(16).text("ANEXO 3 - Acta de recepción de Vivienda Fiscal", {
      align: "center",
    });
    pdf.moveDown();

    pdf.fontSize(10).text(`Número de acta: ${doc.numero || doc._id}`);
    if (doc.createdAt) {
      pdf.text(
        `Fecha de emisión: ${new Date(doc.createdAt).toLocaleString("es-AR")}`
      );
    }
    pdf.moveDown();

    // Datos de vivienda
    pdf.fontSize(12).text("Datos de la vivienda", { underline: true });
    pdf.moveDown(0.5);
    pdf.fontSize(10);
    pdf.text(`Unidad habitacional: ${doc.vivienda?.unidadHabitacional || ""}`);
    if (doc.vivienda?.direccion) {
      pdf.text(`Dirección: ${doc.vivienda.direccion}`);
    }
    if (doc.vivienda?.localidad || doc.vivienda?.provincia) {
      pdf.text(
        `Localidad/Provincia: ${doc.vivienda.localidad || ""} ${
          doc.vivienda.provincia || ""
        }`
      );
    }
    pdf.moveDown();

    // Datos de personas
    pdf.fontSize(12).text("Intervinientes", { underline: true });
    pdf.moveDown(0.5);
    pdf.fontSize(10);
    pdf.text(
      `Inspector: ${doc.inspector?.grado || ""} ${
        doc.inspector?.nombreCompleto || ""
      }`
    );
    pdf.text(
      `Permisionario: ${doc.permisionario?.grado || ""} ${
        doc.permisionario?.nombreCompleto || ""
      }`
    );
    pdf.moveDown();

    // Material y documentación (solo listado simple)
    const boolToSiNo = (b) => (b ? "SI" : "NO");

    pdf.fontSize(12).text("Material entregado", { underline: true });
    pdf.moveDown(0.5);
    pdf.fontSize(10);
    pdf.text(
      `Llaves edificio: ${boolToSiNo(doc.material?.llavesEdificio || false)}`
    );
    pdf.text(
      `Llaves vivienda: ${boolToSiNo(doc.material?.llavesVivienda || false)}`
    );
    pdf.text(
      `Llaves baulera: ${boolToSiNo(doc.material?.llavesBaulera || false)}`
    );
    pdf.text(
      `Llave terraza: ${boolToSiNo(doc.material?.llaveTerraza || false)}`
    );
    pdf.text(
      `Llave cochera: ${boolToSiNo(doc.material?.llaveCochera || false)}`
    );
    pdf.text(
      `Muebles según inventario: ${boolToSiNo(
        doc.material?.mueblesSegunInventario || false
      )}`
    );
    pdf.text(
      `Línea telefónica funcionando: ${boolToSiNo(
        doc.material?.lineaTelefonicaFuncionando || false
      )}`
    );
    pdf.moveDown();

    pdf.fontSize(12).text("Documentación entregada", { underline: true });
    pdf.moveDown(0.5);
    pdf.fontSize(10);
    pdf.text(
      `Reglamento de Viviendas Fiscales: ${boolToSiNo(
        doc.documentacion?.reglamentoViviendasFiscales || false
      )}`
    );
    pdf.text(
      `Guía telefónica: ${boolToSiNo(
        doc.documentacion?.guiaTelefonica || false
      )}`
    );
    pdf.text(
      `Reglamento de copropiedad: ${boolToSiNo(
        doc.documentacion?.reglamentoCopropiedad || false
      )}`
    );
    pdf.moveDown();

    // Medidores
    pdf.fontSize(12).text("Lectura de medidores", { underline: true });
    pdf.moveDown(0.5);
    pdf.fontSize(10);
    pdf.text(`Gas (m³): ${doc.medidores?.gasM3 || "—"}`);
    pdf.text(`Agua (m³): ${doc.medidores?.aguaM3 || "—"}`);
    pdf.text(`Luz (kWh): ${doc.medidores?.luzKwh || "—"}`);
    pdf.text(`Teléfono (pulsos): ${doc.medidores?.telefonoPulsos || "—"}`);
    pdf.moveDown();

    // Novedades
    pdf.fontSize(12).text("Novedades / Observaciones", { underline: true });
    pdf.moveDown(0.5);
    pdf.fontSize(10).text(doc.novedades || "—", {
      width: 500,
    });
    pdf.moveDown();

    pdf.fontSize(9).text(`Estado actual: ${doc.estado || ""}`, {
      align: "right",
    });

    pdf.end();
  } catch (err) {
    console.error("Error en generarAnexo3PDF:", err);
    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        message: "No se pudo generar el PDF del Anexo 3.",
      });
    }
  }
};

module.exports = {
  crearAnexo3,
  listarAnexos3Permisionario,
  obtenerAnexo3Detalle,
  permisionarioDaConforme,
  permisionarioPideRevision,
  inspectorReenviaAPermisionario,
  adminCierraAnexo3,
  generarAnexo3PDF,
};
