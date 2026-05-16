const ADJUNTO_PUBLIC_FIELDS = Object.freeze([
  "id",
  "campo",
  "nombreOriginal",
  "mime",
  "size",
  "sha256",
  "fechaSubida",
  "subidoPor",
]);

function sanitizeAdjunto(adjunto) {
  if (!adjunto || typeof adjunto !== "object" || Array.isArray(adjunto)) return adjunto;

  const out = {};
  for (const field of ADJUNTO_PUBLIC_FIELDS) {
    if (adjunto[field] !== undefined) out[field] = adjunto[field];
  }
  return out;
}

function sanitizeAdjuntos(adjuntos) {
  if (!adjuntos || typeof adjuntos !== "object" || Array.isArray(adjuntos)) return adjuntos;

  const out = {};
  for (const [campo, adjunto] of Object.entries(adjuntos)) {
    out[campo] = sanitizeAdjunto(adjunto);
  }
  return out;
}

function sanitizeDatosDocumento(datos) {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return {};

  const out = { ...datos };
  if (out.adjuntos && typeof out.adjuntos === "object" && !Array.isArray(out.adjuntos)) {
    out.adjuntos = sanitizeAdjuntos(out.adjuntos);
  }
  return out;
}

module.exports = {
  sanitizeDatosDocumento,
};
