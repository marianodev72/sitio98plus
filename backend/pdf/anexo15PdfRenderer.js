const PDFDocument = require("pdfkit");

function safe(value) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function fmtDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR");
}

function boolText(value) {
  return value ? "SI" : "NO";
}

function addLine(doc, label, value) {
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(safe(value));
}

async function renderAnexo15Pdf(documento) {
  const doc = new PDFDocument({ size: "A4", margin: 44 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const datos = documento?.datos || {};
  const solicitud = datos.solicitud || {};
  const solicitante = datos.solicitanteSnapshot || {};
  const vivienda = datos.viviendaSnapshot || {};
  const alojamiento = datos.alojamientoSnapshot || {};

  doc.font("Helvetica-Bold").fontSize(15).text("ANEXO_15 - SOLICITUD DE REINTEGRO", { align: "center" });
  doc.moveDown(0.7);

  doc.fontSize(10);
  addLine(doc, "Codigo", "ANEXO_15");
  addLine(doc, "Estado", documento.estado);
  addLine(doc, "Fecha", fmtDate(documento.createdAt));
  doc.moveDown();

  doc.font("Helvetica-Bold").fontSize(12).text("Solicitante");
  doc.fontSize(10);
  addLine(doc, "Nombre", solicitante.nombre);
  addLine(doc, "Rol", solicitante.rol);
  addLine(doc, "DNI", solicitante.dni);
  addLine(doc, "Matricula", solicitante.matricula);
  addLine(doc, "Telefono", solicitante.telefono);
  doc.moveDown();

  doc.font("Helvetica-Bold").fontSize(12).text("Vivienda / alojamiento");
  doc.fontSize(10);
  addLine(doc, "Vivienda", vivienda.codigo);
  addLine(doc, "Barrio / lugar", vivienda.barrio || alojamiento.lugar);
  addLine(doc, "Estado vivienda", vivienda.estado);
  addLine(doc, "Alojamiento", alojamiento.codigo);
  addLine(doc, "Dependencia", alojamiento.dependencia);
  addLine(doc, "Sector", alojamiento.sector);
  addLine(doc, "Plaza", alojamiento.plaza);
  doc.moveDown();

  doc.font("Helvetica-Bold").fontSize(12).text("Solicitud");
  doc.fontSize(10);
  addLine(doc, "Lugar firma", solicitud.lugarFirma);
  addLine(doc, "Fecha firma", solicitud.fechaFirma);
  addLine(doc, "Observaciones", solicitud.observaciones);
  addLine(doc, "Novedades", solicitud.novedades);
  addLine(doc, "Descripcion de mejoras", solicitud.descripcionMejoras);
  addLine(doc, "Detalle comprobantes", solicitud.detalleComprobantes);
  doc.moveDown();

  doc.font("Helvetica-Bold").fontSize(12).text("Adjuntos");
  doc.font("Helvetica").fontSize(10);
  const adjuntos = Array.isArray(documento.adjuntos) ? documento.adjuntos : [];
  if (!adjuntos.length) doc.text("Sin adjuntos registrados.");
  adjuntos.forEach((a, idx) => {
    doc.text(`${idx + 1}. ${safe(a.campo)} - ${safe(a.nombreOriginal)} - ${safe(a.mime)} - ${safe(a.size)} bytes`);
  });
  doc.moveDown();

  doc.font("Helvetica-Bold").fontSize(12).text("Historial");
  doc.font("Helvetica").fontSize(9);
  const historial = Array.isArray(documento.historialEstados) ? documento.historialEstados : [];
  if (!historial.length) doc.text("Sin historial registrado.");
  historial.forEach((h, idx) => {
    const actor = h.actorSnapshot?.nombre || "";
    doc.text(
      `${idx + 1}. ${fmtDate(h.fecha)} - ${safe(h.estadoAnterior)} -> ${safe(h.estadoNuevo)} - ${safe(actor)} - ${safe(h.observacion)}`
    );
  });
  doc.moveDown();

  doc.font("Helvetica-Bold").fontSize(12).text("Firmantes");
  doc.font("Helvetica").fontSize(10);
  const signers = Array.isArray(documento.signers) ? documento.signers : [];
  if (!signers.length) doc.text("Sin firmas registradas.");
  signers.forEach((s, idx) => {
    doc.text(`${idx + 1}. ${safe(s.tipo)} - ${safe(s.nombre)} - ${fmtDate(s.fecha)} - Conforme: ${boolText(true)}`);
  });

  doc.end();
  return done;
}

module.exports = {
  renderAnexo15Pdf,
};
