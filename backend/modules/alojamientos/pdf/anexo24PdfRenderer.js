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

function textOrEmpty(value) {
  return String(value ?? "").trim();
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

function renderFirmaCompacta(doc, label, source) {
  const nombre = textOrEmpty(source?.nombre);
  const fecha = textOrEmpty(fmtDate(source?.fecha)).replace(/^--$/, "");
  const estado = source?.ok === true ? "Conformado" : "";

  doc.font("Helvetica-Bold").fontSize(9).text(label);
  if (nombre) field(doc, "Firmante", nombre);
  if (estado) field(doc, "Estado", estado);
  if (fecha) field(doc, "Fecha", fecha);
  doc.moveDown(0.25);
}

function renderFirmas(doc, documento) {
  const firmas = [
    ["Huesped / alojado", findSigner(documento, "ALOJADO") || findSigner(documento, "HUESPED") || findConformidad(documento, "ALOJADO") || findConformidad(documento, "HUESPED")],
    ["Inspector", findSigner(documento, "INSPECTOR") || findConformidad(documento, "INSPECTOR")],
    ["Jefe organismo administrador", findSigner(documento, "ADMIN_GENERAL") || findConformidad(documento, "ADMIN_GENERAL")],
  ].filter(([, source]) => Boolean(source));

  if (!firmas.length) return;

  ensureSpace(doc, 46 + firmas.length * 42);
  sectionTitle(doc, "Firmas");
  firmas.forEach(([label, source]) => renderFirmaCompacta(doc, label, source));
}

function renderAnexo24Pdf(stream, payload = {}) {
  const documento = payload.documento || {};
  const origen = payload.origen || {};
  const datos = documento.datos || {};
  const huesped = datos.huesped || {};
  const alojamiento = datos.alojamientoSnapshot || {};
  const plaza = datos.plazaSnapshot || {};
  const inspector = datos.inspector || {};
  const revisionInspector = findConformidad(documento, "INSPECTOR") || datos.conformidadInspector || null;
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

  sectionTitle(doc, "Intervencion del inspector");
  renderRows(doc, [
    ["Inspector", inspector.nombre],
    ["Revision", revisionInspector?.ok ? "SI" : "Pendiente"],
    ["Fecha revision", fmtDate(revisionInspector?.fecha)],
  ]);
  if (revisionInspector?.observacion || datos.observacionesInspector) {
    paragraph(doc, revisionInspector?.observacion || datos.observacionesInspector);
  }

  sectionTitle(doc, "Cierre administrativo");
  renderRows(doc, [
    ["Cierre ADMIN_GENERAL", cierreAdmin ? "SI" : "Pendiente"],
    ["Fecha cierre", fmtDate(cierreAdmin?.fecha)],
  ]);

  renderFirmas(doc, documento);
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
