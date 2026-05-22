const anexo28Service = require("../../services/documentos/anexo28Service");

function sendResult(res, result) {
  if (!result?.ok) {
    return res.status(result?.status || 400).json({
      ok: false,
      error: result?.code || "ERROR",
      message: result?.message || "No es posible procesar la solicitud.",
    });
  }
  return res.status(result.status || 200).json({
    ok: true,
    documento: result.documento,
  });
}

async function crearPorInspector(req, res) {
  try {
    const result = await anexo28Service.crearPorInspector(req.body || {}, req.user);
    return sendResult(res, result);
  } catch (err) {
    console.error("[anexo28Controller] crearPorInspector error:", err?.message || "Error controlado");
    return res.status(500).json({ ok: false, message: "Error interno al generar ANEXO_28" });
  }
}

async function revisarPorInspector(req, res) {
  try {
    const result = await anexo28Service.revisarPorInspector(req.params.id, req.body || {}, req.user);
    return sendResult(res, result);
  } catch (err) {
    console.error("[anexo28Controller] revisarPorInspector error:", err?.message || "Error controlado");
    return res.status(500).json({ ok: false, message: "Error interno al revisar ANEXO_28" });
  }
}

async function cerrarAnexo28(req, res) {
  try {
    const result = await anexo28Service.cerrarAnexo28(req.params.id, req.body || {}, req.user);
    return sendResult(res, result);
  } catch (err) {
    console.error("[anexo28Controller] cerrarAnexo28 error:", err?.message || "Error controlado");
    return res.status(500).json({ ok: false, message: "Error interno al cerrar ANEXO_28" });
  }
}

async function devolverAnexo28(req, res) {
  try {
    const result = await anexo28Service.devolverAInspector(req.params.id, req.body || {}, req.user);
    return sendResult(res, result);
  } catch (err) {
    console.error("[anexo28Controller] devolverAnexo28 error:", err?.message || "Error controlado");
    return res.status(500).json({ ok: false, message: "Error interno al devolver ANEXO_28" });
  }
}

module.exports = {
  crearPorInspector,
  revisarPorInspector,
  cerrarAnexo28,
  devolverAnexo28,
};
