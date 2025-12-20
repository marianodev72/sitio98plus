// backend/utils/pdf.js
const PDFDocument = require("pdfkit");

function drawHeader(doc, titulo) {
  doc.fontSize(16).text("ALCALDÍA ZN98", { align: "center" }).moveDown(0.2);

  doc.fontSize(12).text(titulo || "Formulario", { align: "center" }).moveDown(1);
}

function drawKeyValues(doc, data = {}) {
  doc.fontSize(10);
  const keys = Object.keys(data);
  keys.forEach((k) => {
    const val = data[k];
    const text =
      typeof val === "object"
        ? JSON.stringify(val, null, 0)
        : val === null || val === undefined
        ? ""
        : String(val);
    doc.text(`${k}: ${text}`);
  });
}

function generateFormularioPDF(stream, formulario) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  doc.pipe(stream);

  drawHeader(doc, `Formulario: ${formulario.tipo}`);

  doc
    .fontSize(11)
    .text(`ID: ${formulario._id}`)
    .text(`Creado: ${new Date(formulario.createdAt).toLocaleString()}`)
    .text(`Actualizado: ${new Date(formulario.updatedAt).toLocaleString()}`)
    .moveDown();

  doc.fontSize(12).text("Datos del formulario", { underline: true });
  drawKeyValues(doc, formulario.campos);

  if (formulario.firmas?.length) {
    doc.moveDown().fontSize(12).text("Firmas", { underline: true });
    formulario.firmas.forEach((f, i) => {
      doc
        .fontSize(10)
        .text(
          `${i + 1}. ${f.nombre || "-"} (${f.rol || "-"}) - ${new Date(f.fecha).toLocaleString()}`
        );
    });
  }

  doc.end();
}

// --- NUEVO: PDF institucional de Viviendas (Sitio 98) ---

function drawSitio98Header(doc, titulo, fecha) {
  doc.fontSize(16).text("Sitio 98", { align: "center" }).moveDown(0.2);

  doc.fontSize(12).text(titulo || "Listado", { align: "center" }).moveDown(0.5);

  const f = fecha instanceof Date ? fecha : new Date();
  doc
    .fontSize(10)
    .text(`Fecha y hora: ${f.toLocaleString()}`, { align: "center" })
    .moveDown(1);
}

function drawFiltros(doc, filtros = {}, orden = {}) {
  doc.fontSize(11).text("Filtros aplicados", { underline: true }).moveDown(0.4);

  const keys = Object.keys(filtros);
  if (!keys.length) {
    doc.fontSize(10).text("Sin filtros.").moveDown(0.6);
  } else {
    doc.fontSize(10);
    keys.forEach((k) => doc.text(`${k}: ${String(filtros[k])}`));
    doc.moveDown(0.6);
  }

  doc.fontSize(11).text("Orden", { underline: true }).moveDown(0.4);
  const sortBy = orden?.sortBy ? String(orden.sortBy) : "-";
  const sortDir = orden?.sortDir ? String(orden.sortDir) : "-";
  doc.fontSize(10).text(`Ordenar por: ${sortBy}`).text(`Dirección: ${sortDir}`).moveDown(0.8);
}

function fitText(doc, text, maxWidth) {
  const str = text === null || text === undefined ? "" : String(text);
  if (!str) return "";
  let out = str;
  while (doc.widthOfString(out) > maxWidth && out.length > 1) {
    out = out.slice(0, -1);
  }
  return out === str ? str : out.slice(0, Math.max(0, out.length - 1)) + "…";
}

function drawTableHeader(doc, x, y, cols, rowH) {
  doc.fontSize(9).font("Helvetica-Bold");

  cols.forEach((c) => {
    doc.rect(c.x, y, c.w, rowH).stroke();
    doc.text(c.label, c.x + 3, y + 4, { width: c.w - 6, align: "left" });
  });

  doc.font("Helvetica");
}

function drawRow(doc, y, cols, rowH, values) {
  doc.fontSize(9).font("Helvetica");
  cols.forEach((c) => {
    doc.rect(c.x, y, c.w, rowH).stroke();
    const raw = values[c.key];
    const txt = fitText(doc, raw, c.w - 6);
    doc.text(txt, c.x + 3, y + 4, { width: c.w - 6, align: "left" });
  });
}

function generateViviendasListadoPDF(stream, payload = {}) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(stream);

  const titulo = payload.titulo || "Listado de Viviendas";
  const fecha = payload.fecha || new Date();
  const filtros = payload.filtros || {};
  const orden = payload.orden || {};
  const viviendas = Array.isArray(payload.viviendas) ? payload.viviendas : [];

  drawSitio98Header(doc, titulo, fecha);
  drawFiltros(doc, filtros, orden);

  // Tabla (ajustado para A4 con márgenes 40)
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const usableW = pageWidth - doc.page.margins.left - doc.page.margins.right;

  const x0 = margin;
  let y = doc.y;

  const rowH = 20;

  // Columnas: Código, Barrio, Dormitorios, Estado, Permisionario, Personas, Hacinamiento
  // Anchos proporcionales (suman ~usableW)
  const cols = [
    { key: "codigo", label: "Código", x: x0, w: Math.floor(usableW * 0.12) },
    { key: "barrio", label: "Barrio", x: 0, w: Math.floor(usableW * 0.18) },
    { key: "dormitorios", label: "Dorm.", x: 0, w: Math.floor(usableW * 0.08) },
    { key: "estado", label: "Estado", x: 0, w: Math.floor(usableW * 0.13) },
    { key: "permisionario", label: "Permisionario", x: 0, w: Math.floor(usableW * 0.23) },
    { key: "personas", label: "Personas", x: 0, w: Math.floor(usableW * 0.10) },
    { key: "hacinamiento", label: "Hacin.", x: 0, w: Math.floor(usableW * 0.16) },
  ];

  // Recalcular x acumulado
  for (let i = 1; i < cols.length; i++) {
    cols[i].x = cols[i - 1].x + cols[i - 1].w;
  }

  // Header de tabla
  drawTableHeader(doc, x0, y, cols, rowH);
  y += rowH;

  const bottomY = () => doc.page.height - doc.page.margins.bottom;

  for (let i = 0; i < viviendas.length; i++) {
    if (y + rowH > bottomY()) {
      doc.addPage();
      y = doc.page.margins.top;

      drawTableHeader(doc, x0, y, cols, rowH);
      y += rowH;
    }

    const v = viviendas[i] || {};
    const perm =
      v?.permisionario?.apellido
        ? `${v.permisionario.apellido} ${v.permisionario.nombre || ""}`.trim()
        : v?.permisionario?.nombre || "-";

    const personas =
      v?.estado === "OCUPADA" && typeof v?.cantidadHabitantes === "number"
        ? String(v.cantidadHabitantes)
        : "-";

    const hacin =
      v?.estado === "OCUPADA" && typeof v?.hacinamientoRatio === "number"
        ? Number(v.hacinamientoRatio).toFixed(2)
        : "-";

    drawRow(doc, y, cols, rowH, {
      codigo: v.codigo || "",
      barrio: v.barrio || "",
      dormitorios: v.dormitorios === 0 || v.dormitorios ? String(v.dormitorios) : "",
      estado: v.estado || "",
      permisionario: perm,
      personas,
      hacinamiento: hacin,
    });

    y += rowH;
  }

  doc.moveDown(1);
  doc.fontSize(9).text(`Total registros: ${viviendas.length}`);

  doc.end();
}

module.exports = {
  generateFormularioPDF,
  generateViviendasListadoPDF,
};
