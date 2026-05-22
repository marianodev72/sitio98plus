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
  ensureSpace(doc, 60);
  doc.font("Helvetica").fontSize(9.5).text(safe(text), {
    align: "justify",
    lineGap: 2,
  });
  doc.moveDown(0.35);
}

function renderRows(doc, rows = []) {
  rows.forEach(([label, value]) => field(doc, label, value));
}

function findConformidad(documento, tipo) {
  const tipoUp = up(tipo);
  const conformidades = Array.isArray(documento?.conformidades) ? documento.conformidades : [];
  return conformidades.find((item) => up(item?.tipo) === tipoUp) || null;
}

function findSigner(documento, tipo) {
  const tipoUp = up(tipo);
  const signers = Array.isArray(documento?.signers) ? documento.signers : [];
  return signers.find((item) => up(item?.tipo) === tipoUp) || null;
}

function renderKeyValues(doc, title, source = {}, rows = []) {
  sectionTitle(doc, title);
  rows.forEach(([key, label]) => field(doc, label, source?.[key]));
}

function renderEstadoSistemas(doc, estados = {}) {
  sectionTitle(doc, "Estado de sistemas y elementos");
  const items = [
    ["agua", "Agua"],
    ["cloacas", "Cloacas"],
    ["electricidad", "Electricidad"],
    ["gas", "Gas"],
    ["pluviales", "Pluviales"],
    ["telefono", "Telefono"],
    ["aberturas", "Aberturas"],
    ["albanileria", "Albanileria"],
    ["alfombras", "Alfombras"],
    ["antenaTv", "Antena TV"],
    ["calefactorEstufa", "Calefactor / estufa"],
    ["calefonTermotanque", "Calefon / termotanque"],
    ["carpinteria", "Carpinteria"],
    ["cerrajeria", "Cerrajeria"],
    ["cocina", "Cocina"],
    ["desinfeccion", "Desinfeccion"],
    ["herrajes", "Herrajes"],
    ["limpieza", "Limpieza"],
    ["lustrado", "Lustrado"],
    ["parquesJardines", "Parques y jardines"],
    ["pintura", "Pintura"],
    ["pisos", "Pisos"],
    ["porteroElectrico", "Portero electrico"],
    ["sanitarios", "Sanitarios"],
    ["vidrios", "Vidrios"],
    ["estadoGeneral", "Estado general"],
  ];
  items.forEach(([key, label]) => field(doc, label, estados?.[key]));
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
    ["Alojado", typeof alojado?.ok === "boolean" ? (alojado.ok ? "Conforme" : "Sin conformidad") : "Pendiente"],
    ["Fecha alojado", fmtDate(alojado?.fecha)],
    ["ADMIN_GENERAL", admin?.ok ? "Cerrado" : "Pendiente"],
    ["Fecha cierre", fmtDate(admin?.fecha)],
  ]);

  const signers = [
    ["Inspector", findSigner(documento, "INSPECTOR")],
    ["Alojado", findSigner(documento, "ALOJADO")],
    ["Jefe organismo administrador", findSigner(documento, "ADMIN_GENERAL")],
  ].filter(([, signer]) => signer?.nombre || signer?.fecha);

  signers.forEach(([label, signer]) => {
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").fontSize(9).text(label);
    if (signer?.nombre) field(doc, "Firmante", signer.nombre);
    if (signer?.fecha) field(doc, "Fecha", fmtDate(signer.fecha));
  });
}

function renderAnexo26Pdf(stream, payload = {}) {
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
  doc.font("Helvetica-Bold").fontSize(12).text("ACTA DE ENTREGA DE ALOJAMIENTO NAVAL - ANEXO 26", {
    align: "center",
  });
  doc.moveDown(0.8);

  paragraph(
    doc,
    "A los efectos de deslindar responsabilidades, el huesped titular saliente deja constancia del estado del alojamiento naval al momento de la entrega formal, segun inventario, material, documentacion y novedades registradas en la presente acta."
  );

  sectionTitle(doc, "Datos del documento");
  renderRows(doc, [
    ["Codigo", documento.codigo],
    ["Estado", documento.estado],
    ["Estado institucional", documento.estadoInstitucional],
    ["Origen documental", origen.codigo || "ANEXO_25"],
    ["Creacion", fmtDate(documento.createdAt)],
    ["Actualizacion", fmtDate(documento.updatedAt)],
    ["Lugar firma", datos.lugarFirma || datos.lugarEntrega],
    ["Fecha firma", datos.fechaFirma],
    ["Hora firma", datos.horaFirma],
  ]);

  sectionTitle(doc, "Identificacion del huesped / alojado");
  renderRows(doc, [
    ["Grado / escalafon", datos.gradoAlojado || huesped.gradoEscalafon],
    ["Apellido", huesped.apellido],
    ["Nombres", huesped.nombres],
    ["Nombre completo", huesped.nombreCompleto],
    ["Destino actual", huesped.destinoActual],
    ["Destino futuro", huesped.destinoFuturo],
    ["Proximo destino declarado", datos.proximoDestinoAlojado],
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
    ["Lugar entrega", datos.lugarEntrega],
    ["Fecha entrega", fmtDate(datos.fechaEntrega)],
  ]);

  renderKeyValues(doc, "Material", datos.material, [
    ["llavesEdificio", "Llaves edificio"],
    ["llavesAlojamiento", "Llaves alojamiento"],
    ["llavesBaulera", "Llaves baulera"],
    ["llaveTerraza", "Llave terraza"],
    ["llaveCochera", "Llave cochera"],
    ["inventarioMuebles", "Muebles/enseres/inventario"],
    ["lineaTelefonica", "Linea telefonica"],
  ]);

  renderKeyValues(doc, "Documentacion", datos.documentacion, [
    ["reglamentoAlojamientos", "Reglamento alojamientos"],
    ["guiaTelefonica", "Guia telefonica"],
    ["reglamentoCopropiedad", "Reglamento copropiedad"],
  ]);

  renderKeyValues(doc, "Medidores", datos.medidores, [
    ["gas_m3", "Gas"],
    ["agua_m3", "Agua"],
    ["luz_kws", "Luz"],
  ]);

  renderEstadoSistemas(doc, datos.estadoSistemas);

  sectionTitle(doc, "Novedades");
  paragraph(doc, datos.novedadesTexto);

  if (String(datos.observacionesInspector || "").trim()) {
    sectionTitle(doc, "Observaciones del inspector");
    paragraph(doc, datos.observacionesInspector);
  }
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
  renderAnexo26Pdf,
};
