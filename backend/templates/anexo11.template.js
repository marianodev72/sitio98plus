"use strict";

// backend/templates/anexo11.template.js
// PDF institucional ANEXO_11 — Pedido de trabajo / mantenimiento
// Regla: no mostrar ObjectId. Usar códigos y nombres legibles.

function fmtDate(dt) {
  try {
    return dt ? new Date(dt).toLocaleDateString("es-AR") : "—";
  } catch {
    return "—";
  }
}

function fmtDateTime(dt) {
  try {
    return dt ? new Date(dt).toLocaleString("es-AR") : "—";
  } catch {
    return "—";
  }
}

function safe(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function show(v) {
  const s = safe(v);
  return s ? s : "—";
}

function linea(doc, label, valor) {
  doc.font("Helvetica-Bold").fontSize(10).text(label + ": ", { continued: true });
  doc.font("Helvetica").fontSize(10).text(show(valor));
}

function drawHistorialIntervenciones(doc, historial = []) {
  if (!Array.isArray(historial) || !historial.length) return;

  const LEFT = 55;
  const WIDTH = 485;

  const bottomSafe = doc.page.height - doc.page.margins.bottom - 80;
  if (doc.y > bottomSafe) doc.addPage();

  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(8).text("Historial de intervenciones", LEFT, doc.y, {
    width: WIDTH,
    align: "left",
  });

  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(7);

  historial.forEach((h) => {
    const fechaTxt = fmtDateTime(h?.fecha);
    const nombre = show(h?.nombre || "Usuario");
    const rol = h?.rol ? ` (${String(h.rol)})` : "";
    const accion = h?.accion ? ` — ${String(h.accion)}` : "";
    doc.text(`• ${fechaTxt} — ${nombre}${rol}${accion}`, LEFT, doc.y, { width: WIDTH, align: "left" });
  });
}

function renderPdf({ doc, anexo, vivienda, signers = {}, historial = [] }) {
  const d = (anexo && anexo.datos) || {};

  const LEFT = 55;
  const WIDTH = 485;

  const numero = d.numeroPedidoTrabajo || "";
  const ambito = d.ambito || "VIVIENDA";

  const viviendaLabel =
    d.viviendaLabel ||
    (vivienda ? String(vivienda.codigo || vivienda.direccion || "") : "") ||
    (String(ambito).toUpperCase() === "ESPACIO_COMUN" ? "ESPACIO COMÚN" : "");

  const permNombre = d.permisionarioNombre || "";
  const prioridad = d.prioridad || "MEDIA";
  const promotorNombre = d.promotorNombre || "";
  const promotorRol = d.promotorRol || "";
  const tipoSolicitud = d.tipoSolicitud || "";

  const detalleItems = Array.isArray(d.detalleItems) ? d.detalleItems : [];
  const descripcionItems = Array.isArray(d.descripcionTrabajoItems) ? d.descripcionTrabajoItems : [];

  const obsInspector = show(d?.resolucionInspector?.motivo || d?.observacionesInspector || "");
  const obsAdmin = show(d?.observacionesAdminGeneral || d?.resolucionAdminGeneral || "");

  const fechaDoc = anexo?.createdAt || new Date();

  const signerPerm = signers.permisionario || {};
  const signerInsp = signers.inspector || {};
  const signerAdmin = signers.admin || {};

  const permLineaExtra = signerPerm.fecha ? `Conforme: ${fmtDateTime(signerPerm.fecha)}` : "";
  const inspLineaExtra = signerInsp.fecha ? `Revisión: ${fmtDateTime(signerInsp.fecha)}` : "";
  const adminLineaExtra = signerAdmin.fecha ? `Cierre: ${fmtDateTime(signerAdmin.fecha)}` : "";

  // Encabezado
  doc.font("Helvetica-Bold").fontSize(14).text("FORMULARIO DE PEDIDO DE TRABAJO", { align: "center" });
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(10).text("ANEXO 11", { align: "center" });
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(9).text("(4.05., inc. 1. y 7.04., inc. 10.)", { align: "center" });
  doc.moveDown(0.8);

  // Datos principales
  linea(doc, "Nº", numero ? `Nº ${numero}` : "—");
  linea(doc, "Fecha", fmtDate(fechaDoc));
  linea(doc, "Ámbito", ambito || "VIVIENDA");
  linea(doc, "Vivienda / Espacio", viviendaLabel);
  linea(doc, "Permisionario", permNombre || "—");
  linea(doc, "Promotor", promotorNombre || "—");
  linea(doc, "Rol del promotor", promotorRol || "—");
  linea(doc, "Tipo de solicitud", tipoSolicitud || "—");
  linea(doc, "Prioridad", prioridad || "MEDIA");

  doc.moveDown(0.6);

  // Detalle (lista editable)
  doc.font("Helvetica-Bold").fontSize(11).text("Detalle del pedido:");
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(10);

  if (!detalleItems.length) {
    doc.text("—", { width: WIDTH });
  } else {
    detalleItems.forEach((it, idx) => {
      doc.text(`• ${idx + 1}. ${String(it)}`, LEFT, doc.y, { width: WIDTH });
    });
  }

  doc.moveDown(0.6);

  // Intervención inspector
  doc.font("Helvetica-Bold").fontSize(11).text("Intervención del inspector:");
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(10);

  if (descripcionItems.length) {
    descripcionItems.forEach((it, idx) => {
      doc.text(`• ${idx + 1}. ${String(it)}`, LEFT, doc.y, { width: WIDTH });
    });
    doc.moveDown(0.2);
  }

  doc.text(obsInspector || "—", { width: WIDTH, align: "justify" });

  doc.moveDown(0.6);

  // Intervención Admin General
  doc.font("Helvetica-Bold").fontSize(11).text("Intervención del Jefe del órgano administrador:");
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(10).text(obsAdmin || "—", { width: WIDTH, align: "justify" });

  doc.moveDown(1.0);

  // Actuaciones / firmas legibles
  doc.font("Helvetica-Bold").fontSize(11).text("ACTUACIONES:");
  doc.moveDown(0.4);

  const permNombreAct = signerPerm.nombre || permNombre || "Permisionario no identificado";
  const inspNombreAct = signerInsp.nombre || d.inspectorNombre || "Inspector de barrio";
  const adminNombreAct = signerAdmin.nombre || "Jefe órgano administrador";

  doc.font("Helvetica").fontSize(10).text(
    `Permisionario: ${permNombreAct}${permLineaExtra ? " — " + permLineaExtra : ""}`,
    LEFT
  );
  doc.moveDown(0.2);
  doc.text(
    `Inspector de barrio: ${inspNombreAct}${inspLineaExtra ? " — " + inspLineaExtra : ""}`,
    LEFT
  );
  doc.moveDown(0.2);
  doc.text(
    `Jefe órgano administrador: ${adminNombreAct}${adminLineaExtra ? " — " + adminLineaExtra : ""}`,
    LEFT
  );

  doc.moveDown(0.8);
  drawHistorialIntervenciones(doc, historial);
}

module.exports = {
  code: "ANEXO_11",
  renderPdf,
};