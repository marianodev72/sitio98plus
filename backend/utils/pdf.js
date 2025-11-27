// backend/utils/pdf.js
const PDFDocument = require('pdfkit');

function drawHeader(doc, titulo) {
  doc
    .fontSize(16)
    .text('ALCALDÍA ZN98', { align: 'center' })
    .moveDown(0.2);

  doc
    .fontSize(12)
    .text(titulo || 'Formulario', { align: 'center' })
    .moveDown(1);
}

function drawKeyValues(doc, data = {}) {
  doc.fontSize(10);
  const keys = Object.keys(data);
  keys.forEach((k) => {
    const val = data[k];
    const text =
      typeof val === 'object' ? JSON.stringify(val, null, 0) : (val === null || val === undefined ? '' : String(val));
    doc.text(`${k}: ${text}`);
  });
}

function generateFormularioPDF(stream, formulario) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  doc.pipe(stream);

  drawHeader(doc, `Formulario: ${formulario.tipo}`);

  doc
    .fontSize(11)
    .text(`ID: ${formulario._id}`)
    .text(`Creado: ${new Date(formulario.createdAt).toLocaleString()}`)
    .text(`Actualizado: ${new Date(formulario.updatedAt).toLocaleString()}`)
    .moveDown();

  doc.fontSize(12).text('Datos del formulario', { underline: true });
  drawKeyValues(doc, formulario.campos);

  if (formulario.firmas?.length) {
    doc.moveDown().fontSize(12).text('Firmas', { underline: true });
    formulario.firmas.forEach((f, i) => {
      doc
        .fontSize(10)
        .text(`${i + 1}. ${f.nombre || '-'} (${f.rol || '-'}) - ${new Date(f.fecha).toLocaleString()}`);
    });
  }

  doc.end();
}

module.exports = { generateFormularioPDF };
