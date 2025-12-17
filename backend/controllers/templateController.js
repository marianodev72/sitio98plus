// controllers/templateController.js
// Controlador de plantillas (FormTemplate) — Sistema ZN98

const { FormTemplate } = require("../models/FormTemplate");

function normalizeCandidates(raw) {
  // 1) Normalización base: ANEXO 01 / ANEXO-01 / anexo_01 / etc.
  let s = String(raw || "").trim().toUpperCase();

  // Reemplazar espacios y guiones por "_"
  s = s.replace(/\s+/g, "_").replace(/-+/g, "_");

  // Asegurar prefijo ANEXO_
  s = s.replace(/^ANEXO_?/i, "ANEXO_");

  // Colapsar múltiples underscores
  s = s.replace(/_+/g, "_");

  // Quitar underscore final si lo hubiera
  s = s.replace(/_$/g, "");

  // 2) Generar candidatos para compatibilidad: ANEXO_01 y ANEXO_1
  const candidates = new Set();
  candidates.add(s);

  const m = s.match(/^ANEXO_(\d+)$/);
  if (m) {
    const n = String(parseInt(m[1], 10)); // sin ceros
    const pad2 = String(parseInt(m[1], 10)).padStart(2, "0"); // con ceros

    candidates.add(`ANEXO_${n}`);
    candidates.add(`ANEXO_${pad2}`);
  }

  return Array.from(candidates);
}

async function getTemplateByCode(req, res) {
  try {
    const candidates = normalizeCandidates(req.params.codigo);

    const template = await FormTemplate.findOne({
      code: { $in: candidates },
      activo: true,
    }).lean();

    if (!template) {
      return res.status(404).json({
        message: `No existe plantilla activa para ${candidates[0]}`,
        tried: candidates,
      });
    }

    return res.json({ template });
  } catch (err) {
    console.error("[templateController.getTemplateByCode] Error:", err);
    return res.status(500).json({ message: "Error obteniendo plantilla." });
  }
}

module.exports = {
  getTemplateByCode,
};
