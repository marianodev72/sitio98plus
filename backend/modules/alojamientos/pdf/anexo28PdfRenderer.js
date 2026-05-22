const PDFDocument = require("pdfkit");

function safe(value, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function fmtDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR");
}

function yesNo(value) {
  if (value === true) return "SI";
  if (value === false) return "NO";
  return "-";
}

function ensureSpace(doc, height = 80) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function line(doc, label, value) {
  const text = safe(value);
  if (text === "-") return;
  ensureSpace(doc, 22);
  doc.font("Helvetica-Bold").fontSize(9).text(`${label}: `, { continued: true });
  doc.font("Helvetica").fontSize(9).text(text);
}

function section(doc, title) {
  ensureSpace(doc, 36);
  doc.moveDown(0.7);
  doc.font("Helvetica-Bold").fontSize(11).text(title.toUpperCase());
  doc.moveTo(doc.page.margins.left, doc.y + 2).lineTo(doc.page.width - doc.page.margins.right, doc.y + 2).stroke();
  doc.moveDown(0.6);
}

function checkLine(doc, label, value) {
  ensureSpace(doc, 18);
  doc.font("Helvetica").fontSize(9).text(`[${value ? "X" : " "}] ${label}`);
}

function renderSigners(doc, documento) {
  const signers = Array.isArray(documento?.signers)
    ? documento.signers.filter((item) => safe(item?.nombre, "") && safe(item?.tipo, ""))
    : [];
  if (!signers.length) return;

  section(doc, "Firmas e intervenciones");
  signers.forEach((item) => {
    line(doc, safe(item.tipo), `${safe(item.nombre)} - ${safe(item.rol)} - ${fmtDate(item.fecha)}`);
  });
}

function renderHistorial(doc, documento) {
  const historial = Array.isArray(documento?.historialEstados) ? documento.historialEstados : [];
  if (!historial.length) return;

  section(doc, "Historial documental");
  historial.forEach((item) => {
    ensureSpace(doc, 20);
    doc.font("Helvetica").fontSize(8).text(
      `${fmtDate(item.fecha)} - ${safe(item.estadoAnterior, "INICIO")} -> ${safe(item.estadoNuevo)}`
    );
  });
}

function renderAnexo28Pdf(res, { documento }) {
  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: false });
  doc.pipe(res);

  const datos = documento?.datos || {};
  const huesped = datos.huesped || {};
  const alojamiento = datos.alojamientoSnapshot || {};
  const plaza = datos.plazaSnapshot || {};
  const solicita = datos.solicita || {};
  const bloqueInspector = datos.bloqueInspector || {};
  const bloqueAdmin = datos.bloqueAdministrativo || {};

  doc.font("Helvetica-Bold").fontSize(13).text("ARMADA ARGENTINA", { align: "center" });
  doc.font("Helvetica-Bold").fontSize(11).text("FORMULARIO DE PEDIDO DE TRABAJO PARA ALOJAMIENTO NAVAL", {
    align: "center",
  });
  doc.moveDown(0.8);

  line(doc, "Numero", datos.numeroPedidoTrabajo);
  line(doc, "Documento", documento?.codigo);
  line(doc, "Estado", documento?.estado);

  section(doc, "Alojamiento");
  line(doc, "Predio", alojamiento.predio || alojamiento.lugar);
  line(doc, "Edificio", alojamiento.edificio || alojamiento.sector);
  line(doc, "Alojamiento", alojamiento.alojamientoCodigo);
  line(doc, "Plaza", plaza.numeroPlaza);
  line(doc, "Localidad", alojamiento.localidad);
  line(doc, "Provincia", alojamiento.provincia);

  section(doc, "Huesped / alojado");
  line(doc, "Apellido y nombre", huesped.nombreCompleto || [huesped.apellido, huesped.nombres].filter(Boolean).join(", "));
  line(doc, "Grado", huesped.gradoEscalafon);
  line(doc, "Destino", huesped.destinoActual);

  section(doc, "Pedido");
  line(doc, "Promotor", `${safe(datos.promotor?.tipo)} - ${safe(datos.promotor?.nombre)}`);
  checkLine(doc, "Cambio", solicita.cambio);
  checkLine(doc, "Reparacion", solicita.reparacion);
  checkLine(doc, "Verificacion", solicita.verificacion);
  checkLine(doc, "Provision", solicita.provision);
  line(doc, "Descripcion de lo solicitado", datos.descripcionSolicitud);
  line(doc, "Lugar y fecha", [datos.lugarFirma, fmtDate(datos.fechaFirma)].filter(Boolean).join(" - "));

  section(doc, "Inspector");
  checkLine(doc, "Emergencia", bloqueInspector.emergencia);
  checkLine(doc, "Corresponde al huesped", bloqueInspector.correspondeAlojado);
  checkLine(doc, "Novedades de acta anterior", bloqueInspector.novedadesActaAnterior);
  line(doc, "Descripcion del trabajo", bloqueInspector.descripcionTrabajo);
  line(doc, "Inspector", datos.inspector?.nombre);

  section(doc, "Encargado / division / administracion");
  checkLine(doc, "Con cargo a huesped", bloqueAdmin.cargoAlojado);
  checkLine(doc, "Con cargo a alcaldia", bloqueAdmin.cargoAlcaldia);
  checkLine(doc, "Razon seguridad", bloqueAdmin.razonSeguridad);
  checkLine(doc, "Razon preservacion", bloqueAdmin.razonPreservacion);
  checkLine(doc, "Razon presentacion", bloqueAdmin.razonPresentacion);
  line(doc, "Observaciones", datos.observacionesInspector || datos.observacionesAdminGeneral);
  line(doc, "Informe tecnico", datos.informeTecnico);
  line(doc, "Estimacion", datos.estimacion);
  line(doc, "Autorizacion", datos.autorizacion);
  line(doc, "Verificacion", datos.verificacionInspector);

  renderSigners(doc, documento);
  renderHistorial(doc, documento);

  doc.end();
}

module.exports = { renderAnexo28Pdf };
