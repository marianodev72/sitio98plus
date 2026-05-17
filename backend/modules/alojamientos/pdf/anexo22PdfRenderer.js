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
  doc.font("Helvetica").fontSize(9.5).text(String(text || ""), {
    align: "justify",
    lineGap: 2,
  });
  doc.moveDown(0.4);
}

function renderRows(doc, rows = []) {
  rows.forEach(([label, value]) => field(doc, label, value));
}

function renderHistorial(doc, documento) {
  const historial = Array.isArray(documento?.historialEstados) ? documento.historialEstados : [];
  const intervenciones = Array.isArray(documento?.intervenciones) ? documento.intervenciones : [];

  sectionTitle(doc, "Historial / intervenciones");

  if (!historial.length && !intervenciones.length) {
    field(doc, "Registro", "Sin historial registrado");
    return;
  }

  historial.forEach((item, index) => {
    ensureSpace(doc, 42);
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .text(
        `${index + 1}. ${fmtDate(item?.fecha)} - ${safe(item?.estadoAnterior)} -> ${safe(
          item?.estadoNuevo
        )} - ${safe(item?.observacion)}`
      );
  });

  intervenciones.forEach((item, index) => {
    ensureSpace(doc, 42);
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .text(
        `I${index + 1}. ${fmtDate(item?.fecha)} - ${safe(item?.tipo)} - ${safe(
          item?.observacion
        )}`
      );
  });
}

function renderConformidades(doc, documento) {
  const post = findConformidad(documento, "POSTULANTE");
  const admin = findConformidad(documento, "ADMIN_GENERAL");
  const signerPost = findSigner(documento, "POSTULANTE");
  const signerAdmin = findSigner(documento, "ADMIN_GENERAL");

  sectionTitle(doc, "Conformidades");
  renderRows(doc, [
    ["Conformidad postulante", post ? "SI" : "Pendiente"],
    ["Fecha postulante", fmtDate(post?.fecha)],
    ["Firmante postulante", signerPost?.nombre || post?.rol],
    ["Cierre admin general", admin ? "SI" : "Pendiente"],
    ["Fecha admin general", fmtDate(admin?.fecha)],
    ["Firmante admin general", signerAdmin?.nombre || admin?.rol],
  ]);
}

function renderAnexo22Pdf(stream, payload = {}) {
  const documento = payload.documento || {};
  const origen = payload.origen || {};
  const datos = documento.datos || {};
  const datosOrigen = origen.datos || {};

  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
  doc.pipe(stream);

  doc.font("Helvetica").fontSize(9).text("ARMADA ARGENTINA", { align: "center" });
  doc.moveDown(0.2);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("ACTA DE ASIGNACION DE ALOJAMIENTO NAVAL - ANEXO 22", { align: "center" });
  doc.moveDown(0.8);

  paragraph(
    doc,
    "Documento institucional emitido para registrar la asignacion de alojamiento naval, su trazabilidad y las conformidades correspondientes."
  );

  sectionTitle(doc, "Datos del documento");
  renderRows(doc, [
    ["Codigo", documento.codigo],
    ["Estado", documento.estado],
    ["Estado institucional", documento.estadoInstitucional],
    ["Creacion", fmtDate(documento.createdAt)],
    ["Actualizacion", fmtDate(documento.updatedAt)],
    ["Fecha reserva", fmtDate(datos.fechaReserva)],
    ["Derivado de ANEXO_21", documento.derivadoDe || datos.anexo21Id],
  ]);

  sectionTitle(doc, "Datos del postulante");
  renderRows(doc, [
    ["Apellido", datos.apellido || datosOrigen.apellido],
    ["Nombres", datos.nombres || datosOrigen.nombres],
    ["Postulante", datos.postulanteNombre || [datosOrigen.apellido, datosOrigen.nombres].filter(Boolean).join(", ")],
    ["M.R.", datos.mr || datosOrigen.mr],
    ["Grado / escalafon", datos.gradoEscalafon || datosOrigen.gradoEscalafon],
    ["Destino actual", datos.destinoActual || datosOrigen.destinoActual],
    ["Destino futuro", datos.destinoFuturo || datosOrigen.destinoFuturo],
    ["Genero", datos.genero || datos.sexo || datosOrigen.genero || datosOrigen.sexo],
  ]);

  sectionTitle(doc, "Alojamiento / plaza");
  renderRows(doc, [
    ["Alojamiento", datos.alojamientoCodigo],
    ["Dependencia", datos.dependencia],
    ["Lugar", datos.lugar],
    ["Sector", datos.sector],
    ["Tipo", datos.tipo],
    ["Numero", datos.numero],
    ["Clase", datos.clase],
    ["Capacidad", datos.capacidad],
    ["Genero permitido", datos.generoPermitido],
    ["Plaza", datos.numeroPlaza],
    ["Codigo plaza", datos.plazaCodigo],
  ]);

  renderConformidades(doc, documento);
  renderHistorial(doc, documento);

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(`Pagina ${i + 1} de ${range.count}`, 48, doc.page.height - 36, {
        align: "right",
      });
  }

  doc.end();
}

module.exports = {
  renderAnexo22Pdf,
};
