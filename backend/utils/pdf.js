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

/**
 * Historial al pie del PDF del formulario.
 */
function drawHistorialIntervenciones(doc, historial = []) {
  if (!Array.isArray(historial) || !historial.length) return;

  doc.addPage();
  doc.moveDown(0.5);
  doc.fontSize(12).text("Historial de intervenciones", { underline: true });
  doc.moveDown(0.4);

  doc.fontSize(9);

  historial.forEach((item, idx) => {
    const nombre = item.nombre || item.usuarioNombre || item.usuario || "-";
    const rol = item.rol || item.perfil || "";
    const fechaRaw = item.fecha || item.createdAt || item.updatedAt || null;

    let fechaTxt = "-";
    if (fechaRaw) {
      const d = new Date(fechaRaw);
      if (!Number.isNaN(d.getTime())) fechaTxt = d.toLocaleString("es-AR");
    }

    const accion = item.accion || item.descripcion || item.detalle || "";

    let lineaBase = `${idx + 1}. ${nombre}`;
    if (rol) lineaBase += ` (${rol})`;
    lineaBase += ` — ${fechaTxt}`;

    doc.text(lineaBase);
    if (accion) doc.text(`     • ${accion}`);
    doc.moveDown(0.2);
  });
}

function generateFormularioPDF(stream, formulario) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(stream);

  drawHeader(doc, `Formulario: ${formulario.tipo}`);

  doc
    .fontSize(11)
    .text(`ID: ${formulario._id}`)
    .text(`Creado: ${new Date(formulario.createdAt).toLocaleString("es-AR")}`)
    .text(`Actualizado: ${new Date(formulario.updatedAt).toLocaleString("es-AR")}`)
    .moveDown();

  doc.fontSize(12).text("Datos del formulario", { underline: true });
  drawKeyValues(doc, formulario.campos);

  if (formulario.firmas?.length) {
    doc.moveDown().fontSize(12).text("Firmas", { underline: true });
    formulario.firmas.forEach((f, i) => {
      doc
        .fontSize(10)
        .text(
          `${i + 1}. ${f.nombre || "-"} (${f.rol || "-"}) - ${new Date(
            f.fecha
          ).toLocaleString("es-AR")}`
        );
    });
  }

  const historial =
    formulario.historial ||
    formulario.intervenciones ||
    formulario.trazas ||
    [];

  drawHistorialIntervenciones(doc, historial);

  doc.end();
}

// --- PDF institucional de Viviendas (Sitio 98) ---

function drawSitio98Header(doc, titulo, fecha) {
  doc.fontSize(16).text("Sitio 98", { align: "center" }).moveDown(0.2);
  doc.fontSize(12).text(titulo || "Listado", { align: "center" }).moveDown(0.5);

  const f = fecha instanceof Date ? fecha : new Date();
  doc
    .fontSize(10)
    .text(`Fecha y hora: ${f.toLocaleString("es-AR")}`, { align: "center" })
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
  doc
    .fontSize(10)
    .text(`Ordenar por: ${sortBy}`)
    .text(`Dirección: ${sortDir}`)
    .moveDown(0.8);
}

function fitText(doc, text, maxWidth) {
  const str = text === null || text === undefined ? "" : String(text);
  if (!str) return "";
  let out = str;
  while (doc.widthOfString(out) > maxWidth && out.length > 1) out = out.slice(0, -1);
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

  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const usableW = pageWidth - doc.page.margins.left - doc.page.margins.right;

  const x0 = margin;
  let y = doc.y;

  const rowH = 20;

  const cols = [
    { key: "codigo", label: "Código", x: x0, w: Math.floor(usableW * 0.12) },
    { key: "barrio", label: "Barrio", x: 0, w: Math.floor(usableW * 0.18) },
    { key: "dormitorios", label: "Dorm.", x: 0, w: Math.floor(usableW * 0.08) },
    { key: "estado", label: "Estado", x: 0, w: Math.floor(usableW * 0.13) },
    { key: "permisionario", label: "Permisionario", x: 0, w: Math.floor(usableW * 0.23) },
    { key: "personas", label: "Personas", x: 0, w: Math.floor(usableW * 0.10) },
    { key: "hacinamiento", label: "Hacin.", x: 0, w: Math.floor(usableW * 0.16) },
  ];

  for (let i = 1; i < cols.length; i++) cols[i].x = cols[i - 1].x + cols[i - 1].w;

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

/* =========================================================================
   ✅ AUDITORÍA INSTITUCIONAL (NUEVO / CORREGIDO)
   - A4 landscape
   - Sin páginas en blanco (paginado manual)
   - Leyenda + Registro + Folio en TODAS las páginas
   - Folio X/Y usando bufferPages
   ========================================================================= */

function compactFiltersLine(filtros = {}) {
  const keys = Object.keys(filtros || {});
  if (!keys.length) return "Filtros: (sin filtros)";
  const parts = [];
  for (const k of keys) {
    const v = filtros[k];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (!s) continue;
    parts.push(`${k}=${s}`);
    if (parts.length >= 8) break; // compacto
  }
  return "Filtros: " + parts.join(" | ");
}

function generateAuditInstitucionalPDF(stream, payload = {}) {
  const titulo = payload.titulo || "Auditoría Institucional — ADMIN_GENERAL";
  const fecha = payload.fecha instanceof Date ? payload.fecha : new Date();
  const filtros = payload.filtros || {};
  const orden = payload.orden || { sortBy: "createdAt", sortDir: "desc" };
  const items = Array.isArray(payload.items) ? payload.items : [];
  const leyenda =
    payload.leyenda || "USO INTERNO — Acceso exclusivo ADMIN_GENERAL — SOLO LECTURA";

  const registroId = String(payload.registroId || "").trim() || "REGISTRO-SIN-ID";

  // ✅ bufferPages para poder escribir Folio X/Y al final
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 28,
    bufferPages: true,
  });

  doc.pipe(stream);

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const m = doc.page.margins;

  // Reservas para header/footer para que NUNCA se superpongan
  const headerH = 64;
  const footerH = 40;

  const x0 = m.left;
  const x1 = pageW - m.right;

  const contentTop = m.top + headerH;
  const contentBottom = pageH - m.bottom - footerH;

  // Columnas (más anchas en horizontal)
  const usableW = x1 - x0;
  const rowH = 16;

  const cols = [
  { key: "createdAt", label: "Fecha", w: Math.floor(usableW * 0.16) },
  { key: "actorNombre", label: "Actor", w: Math.floor(usableW * 0.18) },
  { key: "actorRole", label: "Rol", w: Math.floor(usableW * 0.10) },
  { key: "actionTexto", label: "Acción", w: Math.floor(usableW * 0.22) },
  { key: "targetNombre", label: "Objeto", w: Math.floor(usableW * 0.18) },
  { key: "requestId", label: "Solicitud", w: Math.floor(usableW * 0.16) },
];

  // Ajuste para cerrar exacto al ancho usable
  const sumW = cols.reduce((a, c) => a + c.w, 0);
  if (sumW !== usableW) cols[cols.length - 1].w += usableW - sumW;

  function computeColsX() {
    let cur = x0;
    for (const c of cols) {
      c.x = cur;
      cur += c.w;
    }
  }
  computeColsX();

  function drawPageFrame(isFirstPage) {
    // Header institucional (en TODAS)
    doc.font("Helvetica-Bold").fontSize(14);
    doc.text("SITIO 98 — ZN98 Plus", x0, m.top, { width: usableW, align: "center" });

    doc.fontSize(11);
    doc.text(titulo, x0, m.top + 18, { width: usableW, align: "center" });

    doc.font("Helvetica").fontSize(9);
    doc.text(`Fecha y hora de emisión: ${fecha.toLocaleString("es-AR")}`, x0, m.top + 34, {
      width: usableW,
      align: "center",
    });

    // Línea compacta de filtros en TODAS (para impedir inserción)
    doc.fontSize(8);
    doc.text(compactFiltersLine(filtros), x0, m.top + 48, {
      width: usableW,
      align: "center",
    });

    // Footer (en TODAS)
    const fy = pageH - m.bottom - footerH + 10;

    doc.fontSize(8).font("Helvetica");
    doc.text(leyenda, x0, fy, { width: usableW, align: "center" });

    doc.fontSize(8);
    doc.text(`REGISTRO: ${registroId}`, x0, fy + 12, { width: usableW, align: "left" });

    // Folio se completa al final (X/Y) con switchToPage
    doc.text(`FOLIO: __/__`, x0, fy + 12, { width: usableW, align: "right" });

    // Separador visual arriba del contenido
    doc
      .moveTo(x0, contentTop - 10)
      .lineTo(x1, contentTop - 10)
      .stroke();
  }

  // Paginado manual
  let y = contentTop;

  function drawAuditTableHeader() {
    doc.font("Helvetica-Bold").fontSize(8);
    for (const c of cols) {
      doc.rect(c.x, y, c.w, rowH).stroke();
      doc.text(c.label, c.x + 3, y + 4, { width: c.w - 6, align: "left" });
    }
    doc.font("Helvetica").fontSize(8);
    y += rowH;
  }

  function addNewPage(isFirst = false) {
    if (!isFirst) doc.addPage({ size: "A4", layout: "landscape", margin: 28 });
    // recomputar dimensiones por si PDFKit resetea page props
    const pw = doc.page.width;
    const ph = doc.page.height;
    const mm = doc.page.margins;

    // Actualizar variables “vivas”
    // (mantengo usando pageW/pageH/m en cálculos iniciales,
    // pero en la práctica A4 landscape siempre igual)
    y = mm.top + headerH;

    drawPageFrame(isFirst);
    drawAuditTableHeader();
  }

  // Primera página
  addNewPage(true);

  function bottomLimit() {
    return doc.page.height - doc.page.margins.bottom - footerH;
  }

  for (let i = 0; i < items.length; i++) {
    if (y + rowH > bottomLimit()) {
      addNewPage(false);
    }

    const it = items[i] || {};
    const d = it.createdAt ? new Date(it.createdAt) : null;
    const createdAtTxt = d && !Number.isNaN(d.getTime()) ? d.toLocaleString("es-AR") : "";

    // Row
    doc.font("Helvetica").fontSize(8);

    const values = {
  createdAt: createdAtTxt,
  actorNombre: it.actorNombre || "Sistema",
  actorRole: it.actorRole || "",
  actionTexto: it.actionTexto || it.action || "",
  targetNombre: it.targetNombre || "",
  requestId: it.requestId || "",
};

    for (const c of cols) {
      doc.rect(c.x, y, c.w, rowH).stroke();
      const txt = fitText(doc, values[c.key], c.w - 6);
      doc.text(txt, c.x + 3, y + 4, { width: c.w - 6, align: "left" });
    }

    y += rowH;
  }

  // Totales (si entra, sino nueva página)
  if (y + 24 > bottomLimit()) addNewPage(false);

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text(`Total registros exportados: ${items.length}`, x0, y + 8, { width: usableW, align: "left" });
  doc.font("Helvetica").fontSize(8);
  doc.text(`Orden: ${String(orden.sortBy || "createdAt")} ${String(orden.sortDir || "desc")}`, x0, y + 20, {
    width: usableW,
    align: "left",
  });

  // ✅ Completar FOLIO X/Y en todas las páginas (bufferPages)
  const range = doc.bufferedPageRange(); // { start, count }
  for (let idx = range.start; idx < range.start + range.count; idx++) {
    doc.switchToPage(idx);

    const pw = doc.page.width;
    const ph = doc.page.height;
    const mm = doc.page.margins;
    const usable = pw - mm.left - mm.right;
    const fy = ph - mm.bottom - footerH + 22;

    doc.font("Helvetica").fontSize(8);
    doc.text(`FOLIO: ${idx - range.start + 1}/${range.count}`, mm.left, fy, { width: usable, align: "right" });
  }

  doc.end();
}

module.exports = {
  generateFormularioPDF,
  generateViviendasListadoPDF,
  generateAuditInstitucionalPDF,
};
