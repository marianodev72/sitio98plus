const PDFDocument = require("pdfkit");

function safe(value, fallback = "--") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function fmtDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

function ensureSpace(doc, height = 80) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + height > bottom) doc.addPage();
}

function sectionTitle(doc, title) {
  ensureSpace(doc, 42);
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(11).text(String(title || "").toUpperCase());
  doc.moveDown(0.25);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.45);
}

function field(doc, label, value) {
  ensureSpace(doc, 24);
  doc.font("Helvetica-Bold").fontSize(9).text(`${label}: `, { continued: true });
  doc.font("Helvetica").fontSize(9).text(safe(value));
}

function paragraph(doc, text) {
  ensureSpace(doc, 55);
  doc.font("Helvetica").fontSize(9.5).text(safe(text), {
    align: "justify",
    lineGap: 2,
  });
  doc.moveDown(0.4);
}

function renderRows(doc, rows = []) {
  rows.forEach(([label, value]) => field(doc, label, value));
}

function findConformidad(documento, tipo) {
  const tipoUp = up(tipo);
  const conformidades = Array.isArray(documento?.conformidades) ? documento.conformidades : [];
  return conformidades.find((item) => up(item?.tipo) === tipoUp && item?.ok === true) || null;
}

function findSigner(documento, tipo) {
  const tipoUp = up(tipo);
  const signers = Array.isArray(documento?.signers) ? documento.signers : [];
  return signers.find((item) => up(item?.tipo) === tipoUp) || null;
}

function renderHistorial(doc, documento) {
  const historial = Array.isArray(documento?.historialEstados) ? documento.historialEstados : [];

  sectionTitle(doc, "Historial documental");
  if (!historial.length) {
    field(doc, "Registro", "Sin historial registrado");
    return;
  }

  historial.forEach((item, index) => {
    ensureSpace(doc, 34);
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .text(`${index + 1}. ${fmtDate(item?.fecha)} - ${safe(item?.estadoAnterior)} -> ${safe(item?.estadoNuevo)}`);
  });
}

function renderFirmas(doc, documento, datos) {
  const huesped = datos.huesped || {};
  const inspector = datos.inspector || {};
  const signerAdmin = findSigner(documento, "ADMIN_GENERAL");

  sectionTitle(doc, "Firmas");
  ensureSpace(doc, 120);
  const width = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 24) / 3;
  const y = doc.y + 28;
  const x = doc.page.margins.left;
  const labels = [
    ["Huesped / alojado", huesped.nombreCompleto || huesped.nombre],
    ["Inspector", inspector.nombre],
    ["Jefe organismo administrador", signerAdmin?.nombre],
  ];

  labels.forEach(([label, name], index) => {
    const left = x + index * (width + 12);
    doc.moveTo(left, y).lineTo(left + width, y).stroke();
    doc.font("Helvetica-Bold").fontSize(8).text(label, left, y + 6, { width, align: "center" });
    doc.font("Helvetica").fontSize(8).text(safe(name), left, y + 20, { width, align: "center" });
  });
  doc.y = y + 52;
}

function renderAnexo24Pdf(stream, payload = {}) {
  const documento = payload.documento || {};
  const origen = payload.origen || {};
  const datos = documento.datos || {};
  const huesped = datos.huesped || {};
  const alojamiento = datos.alojamientoSnapshot || {};
  const plaza = datos.plazaSnapshot || {};
  const inspector = datos.inspector || {};
  const cierreAdmin = findConformidad(documento, "ADMIN_GENERAL");

  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
  doc.pipe(stream);

  doc.font("Helvetica").fontSize(9).text("ARMADA ARGENTINA", { align: "center" });
  doc.moveDown(0.2);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("PLANILLA AMPLIACION DE NOVEDADES DEL ACTA DE RECEPCION - ANEXO 24", {
      align: "center",
    });
  doc.moveDown(0.8);

  paragraph(
    doc,
    "Documento institucional emitido para ampliar novedades asociadas al acta de recepcion de alojamiento naval."
  );

  sectionTitle(doc, "Datos del documento");
  renderRows(doc, [
    ["Codigo", documento.codigo],
    ["Estado", documento.estado],
    ["Estado institucional", documento.estadoInstitucional],
    ["Origen documental", origen.codigo || "ANEXO_23"],
    ["Creacion", fmtDate(documento.createdAt)],
    ["Actualizacion", fmtDate(documento.updatedAt)],
    ["Lugar firma", datos.lugarFirma],
    ["Fecha firma", datos.fechaFirma],
  ]);

  sectionTitle(doc, "Identificacion del huesped / alojado");
  renderRows(doc, [
    ["Grado / escalafon", huesped.gradoEscalafon],
    ["Apellido", huesped.apellido],
    ["Nombres", huesped.nombres],
    ["Nombre completo", huesped.nombreCompleto],
    ["Genero", huesped.genero],
    ["Destino actual", huesped.destinoActual],
    ["Destino futuro", huesped.destinoFuturo],
  ]);

  sectionTitle(doc, "Alojamiento / plaza");
  renderRows(doc, [
    ["Alojamiento", alojamiento.alojamientoCodigo],
    ["Plaza", plaza.numeroPlaza],
    ["Codigo plaza", plaza.plazaCodigo],
    ["Edificio", alojamiento.edificio],
    ["Predio", alojamiento.predio],
    ["Lugar", alojamiento.lugar],
    ["Localidad", alojamiento.localidad],
    ["Provincia", alojamiento.provincia],
    ["Dependencia", alojamiento.dependencia],
    ["Sector", alojamiento.sector],
    ["Tipo", alojamiento.tipo],
    ["Clase", alojamiento.clase],
    ["Inspector", inspector.nombre],
  ]);

  sectionTitle(doc, "Novedades adicionales");
  paragraph(doc, datos.novedadesTexto);

  sectionTitle(doc, "Cierre administrativo");
  renderRows(doc, [
    ["Cierre ADMIN_GENERAL", cierreAdmin ? "SI" : "Pendiente"],
    ["Fecha cierre", fmtDate(cierreAdmin?.fecha)],
  ]);

  renderFirmas(doc, documento, datos);
  renderHistorial(doc, documento);

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(8).text(`Pagina ${i + 1} de ${range.count}`, 48, doc.page.height - 36, {
      align: "right",
    });
  }

  doc.end();
}

module.exports = {
  renderAnexo24Pdf,
};
