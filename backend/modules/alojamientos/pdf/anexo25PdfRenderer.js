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
  doc.moveDown(0.55);
  doc.font("Helvetica-Bold").fontSize(11).text(String(title || "").toUpperCase());
  doc.moveDown(0.25);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.4);
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
  doc.moveDown(0.35);
}

function renderRows(doc, rows = []) {
  rows.forEach(([label, value]) => field(doc, label, value));
}

function cleanList(items) {
  return Array.isArray(items) ? items.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function renderList(doc, items = []) {
  const list = cleanList(items);
  if (!list.length) {
    field(doc, "Registro", "Sin datos registrados");
    return;
  }
  list.forEach((item, index) => {
    ensureSpace(doc, 28);
    doc.font("Helvetica").fontSize(9).text(`${index + 1}. ${item}`);
  });
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

function renderRepresentante(doc, label, value) {
  const rep = value && typeof value === "object" ? value : {};
  const hasData = ["apellidoNombres", "grado", "destino"].some((key) => String(rep[key] || "").trim());
  if (!hasData) return;
  sectionTitle(doc, label);
  renderRows(doc, [
    ["Apellido y nombres", rep.apellidoNombres],
    ["Grado", rep.grado],
    ["Destino", rep.destino],
  ]);
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

function renderConformidades(doc, documento, datos) {
  const inspector = findConformidad(documento, "INSPECTOR") || datos.conformidadInspector || null;
  const alojado = findConformidad(documento, "ALOJADO") || datos.conformidadAlojado || null;
  const admin = findConformidad(documento, "ADMIN_GENERAL") || datos.conformidadAdminGeneral || null;

  sectionTitle(doc, "Firmas e intervenciones");
  renderRows(doc, [
    ["Inspector de alojamiento", inspector?.ok ? "Conformado" : "Pendiente"],
    ["Fecha inspector", fmtDate(inspector?.fecha)],
    ["Alojado", alojado?.ok ? "Conformado" : "Pendiente"],
    ["Fecha alojado", fmtDate(alojado?.fecha)],
    ["ADMIN_GENERAL", admin?.ok ? "Cerrado" : "Pendiente"],
    ["Fecha cierre", fmtDate(admin?.fecha)],
  ]);

  const signerInspector = findSigner(documento, "INSPECTOR");
  const signerAlojado = findSigner(documento, "ALOJADO");
  const signerAdmin = findSigner(documento, "ADMIN_GENERAL");
  const signers = [
    ["Inspector", signerInspector],
    ["Alojado", signerAlojado],
    ["Jefe organismo administrador", signerAdmin],
  ].filter(([, signer]) => signer?.nombre || signer?.fecha);

  signers.forEach(([label, signer]) => {
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").fontSize(9).text(label);
    if (signer?.nombre) field(doc, "Firmante", signer.nombre);
    if (signer?.fecha) field(doc, "Fecha", fmtDate(signer.fecha));
  });
}

function renderAnexo25Pdf(stream, payload = {}) {
  const documento = payload.documento || {};
  const origen = payload.origen || {};
  const datos = documento.datos || {};
  const huesped = datos.huesped || {};
  const alojamiento = datos.alojamientoSnapshot || {};
  const plaza = datos.plazaSnapshot || {};
  const inspector = datos.inspector || {};

  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
  doc.pipe(stream);

  doc.font("Helvetica").fontSize(9).text("ARMADA ARGENTINA", { align: "center" });
  doc.moveDown(0.2);
  doc.font("Helvetica-Bold").fontSize(12).text("ACTA DE INSPECCION PREVIA DE ALOJAMIENTO NAVAL - ANEXO 25", {
    align: "center",
  });
  doc.moveDown(0.8);

  paragraph(doc, "Documento institucional emitido para registrar la inspeccion previa del alojamiento naval.");

  sectionTitle(doc, "Datos del documento");
  renderRows(doc, [
    ["Codigo", documento.codigo],
    ["Estado", documento.estado],
    ["Origen documental", origen.codigo || "ANEXO_23"],
    ["Creacion", fmtDate(documento.createdAt)],
    ["Actualizacion", fmtDate(documento.updatedAt)],
    ["Lugar firma", datos.lugarFirma],
    ["Fecha firma", datos.fechaFirma],
  ]);

  sectionTitle(doc, "Identificacion del huesped / alojado");
  renderRows(doc, [
    ["Grado / escalafon", datos.gradoAlojado || huesped.gradoEscalafon],
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
    ["Lugar inspeccion", datos.lugarInspeccion],
    ["Fecha inspeccion", fmtDate(datos.fechaInspeccion)],
  ]);

  sectionTitle(doc, "Reparaciones y/o mantenimientos a cargo de la alcaldia");
  renderList(doc, datos.reparacionesArmada);

  sectionTitle(doc, "Reparaciones y/o mantenimientos a cargo del huesped");
  renderList(doc, datos.reparacionesAlojado);

  renderRepresentante(doc, "Representante 1", datos.representante1);
  renderRepresentante(doc, "Representante 2", datos.representante2);

  sectionTitle(doc, "Observaciones del inspector");
  paragraph(doc, datos.observacionesInspector);

  if (String(datos.observacionesAlojado || "").trim()) {
    sectionTitle(doc, "Observaciones del alojado");
    paragraph(doc, datos.observacionesAlojado);
  }

  if (String(datos.observacionesAdminGeneral || "").trim()) {
    sectionTitle(doc, "Observaciones ADMIN_GENERAL");
    paragraph(doc, datos.observacionesAdminGeneral);
  }

  renderConformidades(doc, documento, datos);
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
  renderAnexo25Pdf,
};
