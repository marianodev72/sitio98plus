const anexo24Service = require("../../services/documentos/anexo24Service");

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

async function cerrarAnexo24(req, res) {
  try {
    const result = await anexo24Service.cerrarAnexo24(req.params.id, req.body || {}, req.user);
    return sendResult(res, result);
  } catch {
    return res.status(500).json({
      ok: false,
      error: "No es posible procesar la solicitud.",
    });
  }
}

module.exports = {
  cerrarAnexo24,
};
