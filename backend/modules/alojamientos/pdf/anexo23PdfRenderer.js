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
  doc.font("Helvetica").fontSize(9.5).text(String(text || ""), {
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

function renderTable(doc, rows = []) {
  const startX = doc.page.margins.left;
  const labelWidth = 260;
  const valueWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - labelWidth;

  rows.forEach(([label, value]) => {
    ensureSpace(doc, 26);
    const y = doc.y;
    doc.font("Helvetica").fontSize(8.8).text(safe(label), startX, y, { width: labelWidth });
    doc.font("Helvetica-Bold").fontSize(8.8).text(safe(value), startX + labelWidth, y, { width: valueWidth });
    doc.moveDown(0.35);
  });
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
      .text(`I${index + 1}. ${fmtDate(item?.fecha)} - ${safe(item?.tipo)} - ${safe(item?.observacion)}`);
  });
}

function renderConformidades(doc, documento) {
  const alojado = findConformidad(documento, "ALOJADO");
  const admin = findConformidad(documento, "ADMIN_GENERAL");
  const signerAlojado = findSigner(documento, "ALOJADO");
  const signerAdmin = findSigner(documento, "ADMIN_GENERAL");

  sectionTitle(doc, "Conformidades");
  renderRows(doc, [
    ["Conformidad alojado", alojado ? "SI" : "Pendiente"],
    ["Fecha alojado", fmtDate(alojado?.fecha)],
    ["Firmante alojado", signerAlojado?.nombre || alojado?.rol],
    ["Cierre admin general", admin ? "SI" : "Pendiente"],
    ["Fecha admin general", fmtDate(admin?.fecha)],
    ["Firmante admin general", signerAdmin?.nombre || admin?.rol],
  ]);
}

function renderFirmas(doc, documento, datos) {
  const huesped = datos.huesped || {};
  const inspector = datos.inspector || {};
  const signerAlojado = findSigner(documento, "ALOJADO");
  const signerAdmin = findSigner(documento, "ADMIN_GENERAL");

  sectionTitle(doc, "Firmas");
  ensureSpace(doc, 120);
  const width = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 24) / 3;
  const y = doc.y + 28;
  const x = doc.page.margins.left;
  const labels = [
    ["Huesped / alojado", signerAlojado?.nombre || huesped.nombreCompleto || huesped.nombre],
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

function renderAnexo23Pdf(stream, payload = {}) {
  const documento = payload.documento || {};
  const datos = documento.datos || {};
  const huesped = datos.huesped || {};
  const alojamiento = datos.alojamientoSnapshot || {};
  const plaza = datos.plazaSnapshot || {};
  const material = datos.material || {};
  const estado = datos.estadoSistemas || {};
  const inspector = datos.inspector || {};

  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
  doc.pipe(stream);

  doc.font("Helvetica").fontSize(9).text("ARMADA ARGENTINA", { align: "center" });
  doc.moveDown(0.2);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("ACTA DE RECEPCION DE ALOJAMIENTO NAVAL - ANEXO 23", { align: "center" });
  doc.moveDown(0.8);

  paragraph(
    doc,
    "Documento institucional emitido para registrar la recepcion inicial del alojamiento naval, los elementos entregados, el estado de sistemas y las conformidades correspondientes."
  );

  sectionTitle(doc, "Datos del documento");
  renderRows(doc, [
    ["Codigo", documento.codigo],
    ["Estado", documento.estado],
    ["Estado institucional", documento.estadoInstitucional],
    ["Creacion", fmtDate(documento.createdAt)],
    ["Actualizacion", fmtDate(documento.updatedAt)],
    ["Lugar firma", datos.lugarFirma],
    ["Fecha firma", datos.fechaFirma],
  ]);

  sectionTitle(doc, "Identificacion del huesped / alojado");
  renderRows(doc, [
    ["Grado / escalafon", huesped.gradoEscalafon || datos.gradoEscalafon],
    ["Apellido", huesped.apellido || datos.apellido],
    ["Nombres", huesped.nombres || datos.nombres],
    ["M.R.", huesped.mr || datos.mr],
    ["DNI", huesped.dni || datos.dni],
    ["Genero", huesped.genero || datos.genero || datos.sexo],
    ["Destino actual", huesped.destinoActual || datos.destinoActual],
    ["Destino futuro", huesped.destinoFuturo || datos.destinoFuturo],
    ["Telefono", huesped.telefono || datos.telefono],
    ["Email", huesped.email || datos.email],
  ]);

  sectionTitle(doc, "Alojamiento / plaza");
  renderRows(doc, [
    ["Alojamiento", alojamiento.alojamientoCodigo || datos.alojamientoCodigo],
    ["Plaza", plaza.numeroPlaza || datos.numeroPlaza],
    ["Codigo plaza", plaza.plazaCodigo || datos.plazaCodigo],
    ["Edificio", alojamiento.edificio || datos.edificio],
    ["Predio", alojamiento.predio || datos.predio],
    ["Lugar", alojamiento.lugar || datos.lugar],
    ["Localidad", alojamiento.localidad || datos.localidad],
    ["Provincia", alojamiento.provincia || datos.provincia],
    ["Dependencia", alojamiento.dependencia],
    ["Sector", alojamiento.sector],
    ["Tipo", alojamiento.tipo],
    ["Clase", alojamiento.clase],
    ["Inspector", inspector.nombre],
  ]);

  sectionTitle(doc, "Material entregado");
  renderTable(doc, [
    ["Llaves puertas entrada edificio", material.llavesEdificio],
    ["Llaves puerta entrada alojamiento", material.llavesAlojamiento],
    ["Llave acceso terraza", material.llaveTerraza],
    ["Llave acceso cochera", material.llaveCochera],
    ["Muebles / enseres / menajes segun inventario", material.inventarioMuebles],
    ["Linea telefonica funcionando", material.lineaTelefonica],
  ]);

  sectionTitle(doc, "Estado de sistemas y elementos");
  renderTable(doc, [
    ["Electricidad", estado.electricidad],
    ["Gas", estado.gas],
    ["Telefono", estado.telefono],
    ["Aberturas", estado.aberturas],
    ["Albanileria", estado.albanileria],
    ["Alfombras", estado.alfombras],
    ["Antena TV", estado.antenaTv],
    ["Calefactor / estufa", estado.calefactorEstufa],
    ["Calefon / termotanque", estado.calefonTermotanque],
    ["Carpinteria", estado.carpinteria],
    ["Sanitarios", estado.sanitarios],
    ["Cerrajeria", estado.cerrajeria],
    ["Cocina", estado.cocina],
    ["Desinfeccion", estado.desinfeccion],
    ["Herrajes", estado.herrajes],
    ["Limpieza", estado.limpieza],
    ["Lustrado", estado.lustrado],
    ["Pintura", estado.pintura],
    ["Pisos", estado.pisos],
    ["Vidrios", estado.vidrios],
    ["Estado general", estado.estadoGeneral],
  ]);

  sectionTitle(doc, "Novedades");
  paragraph(doc, safe(datos.novedadesTexto));

  sectionTitle(doc, "Reparacion, mantenimiento y entrega");
  paragraph(doc, safe(datos.reparacionMantenimientoEntrega));

  sectionTitle(doc, "Autorizacion de descuento");
  paragraph(
    doc,
    datos.autorizacionDescuento === true
      ? "El alojado deja constancia de la autorizacion de descuento institucional correspondiente, conforme al acta suscripta."
      : "No se registra autorizacion de descuento en el documento."
  );

  renderConformidades(doc, documento);
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
  renderAnexo23Pdf,
};
