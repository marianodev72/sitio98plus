const anexo22Service = require("../../services/documentos/anexo22Service");

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

module.exports = {
  generarDesdeAnexo21,
  conformidadPostulante,
};
