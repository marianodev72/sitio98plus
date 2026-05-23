const anexo22Service = require("../../services/documentos/anexo22Service");
const alojamientoDocumentoPdfService = require("../../services/documentos/alojamientoDocumentoPdfService");
const { renderAnexo22Pdf } = require("../../pdf/anexo22PdfRenderer");
const { renderAnexo23Pdf } = require("../../pdf/anexo23PdfRenderer");
const { renderAnexo24Pdf } = require("../../pdf/anexo24PdfRenderer");
const { renderAnexo25Pdf } = require("../../pdf/anexo25PdfRenderer");
const { renderAnexo26Pdf } = require("../../pdf/anexo26PdfRenderer");
const { renderAnexo28Pdf } = require("../../pdf/anexo28PdfRenderer");

function sendResult(res, result) {
  if (result?.ok) {
    return res.status(result.status || 200).json({
      ok: true,
      documento: result.documento,
    });
  }

  return res.status(result?.status || 400).json({
    ok: false,
    error: result?.message || "No es posible procesar la solicitud.",
  });
}

async function generarDesdeAnexo21(req, res) {
  try {
    const result = await anexo22Service.generarDesdeAnexo21({
      id: req.params.id,
      plazaId: req.body?.plazaId,
      user: req.user,
    });

    return sendResult(res, result);
  } catch {
    return res.status(500).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  }
}

async function conformidadPostulante(req, res) {
  try {
    const result = await anexo22Service.conformidadPostulante({
      id: req.params.id,
      user: req.user,
    });

    return sendResult(res, result);
  } catch {
    return res.status(500).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  }
}

async function cerrarAnexo22(req, res) {
  try {
    const result = await anexo22Service.cerrarAnexo22({
      id: req.params.id,
      user: req.user,
    });

    return sendResult(res, result);
  } catch {
    return res.status(500).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  }
}

async function descargarPdf(req, res) {
  try {
    const result = await alojamientoDocumentoPdfService.obtenerPayloadDocumentoPdf({
      id: req.params.id,
      user: req.user,
    });

    if (!result?.ok) {
      return res.status(result?.status || 404).json({
        ok: false,
        error: result?.message || "No es posible procesar la solicitud.",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    const codigo = String(result.documento?.codigo || "DOCUMENTO").toUpperCase();
    res.setHeader("Content-Disposition", `attachment; filename="${codigo}_${req.params.id}.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (codigo === "ANEXO_22") {
      return renderAnexo22Pdf(res, {
        documento: result.documento,
        origen: result.origen,
      });
    }

    if (codigo === "ANEXO_23") {
      return renderAnexo23Pdf(res, {
        documento: result.documento,
        anexo22: result.anexo22,
        anexo21: result.anexo21,
      });
    }

    if (codigo === "ANEXO_24") {
      return renderAnexo24Pdf(res, {
        documento: result.documento,
        origen: result.origen,
      });
    }

    if (codigo === "ANEXO_25") {
      return renderAnexo25Pdf(res, {
        documento: result.documento,
        origen: result.origen,
      });
    }

    if (codigo === "ANEXO_26") {
      return renderAnexo26Pdf(res, {
        documento: result.documento,
        origen: result.origen,
      });
    }

    if (codigo === "ANEXO_28") {
      return renderAnexo28Pdf(res, {
        documento: result.documento,
      });
    }

    return res.status(404).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  } catch {
    return res.status(500).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  }
}

module.exports = {
  generarDesdeAnexo21,
  conformidadPostulante,
  cerrarAnexo22,
  descargarPdf,
};
