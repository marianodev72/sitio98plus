import http from "./http";

export type Anexo15Adjunto = {
  id: string;
  campo: string;
  nombreOriginal: string;
  mime: string;
  size: number;
  sha256: string;
  fechaSubida?: string;
  subidoPor?: { nombre?: string; rol?: string } | null;
};

export type Anexo15Documento = {
  token: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string;
  solicitanteRol?: string;
  datos?: Record<string, any>;
  adjuntos?: Anexo15Adjunto[];
  historialEstados?: Array<Record<string, any>>;
  intervenciones?: Array<Record<string, any>>;
  signers?: Array<Record<string, any>>;
  createdAt?: string;
  updatedAt?: string;
  canEditar?: boolean;
  canEnviar?: boolean;
  canAnular?: boolean;
  canPdf?: boolean;
};

export type Anexo15FormData = {
  observaciones?: string;
  novedades?: string;
  descripcionMejoras?: string;
  detalleComprobantes?: string;
  lugarFirma?: string;
  fechaFirma?: string;
};

export async function listarMisAnexo15() {
  const res = await http.get("/anexo-15/mis");
  return (res.data?.documentos || []) as Anexo15Documento[];
}

export async function listarInspectorAnexo15() {
  const res = await http.get("/anexo-15/inspector");
  return (res.data?.documentos || []) as Anexo15Documento[];
}

export async function listarAdminAnexo15() {
  const res = await http.get("/anexo-15/admin");
  return (res.data?.documentos || []) as Anexo15Documento[];
}

export async function crearAnexo15(datos: Anexo15FormData) {
  const res = await http.post("/anexo-15", { datos });
  return res.data?.documento as Anexo15Documento;
}

export async function obtenerAnexo15(token: string) {
  const res = await http.get(`/anexo-15/${encodeURIComponent(token)}`);
  return res.data?.documento as Anexo15Documento;
}

export async function actualizarAnexo15(token: string, datos: Anexo15FormData) {
  const res = await http.patch(`/anexo-15/${encodeURIComponent(token)}`, { datos });
  return res.data?.documento as Anexo15Documento;
}

export async function enviarAnexo15(token: string) {
  const res = await http.post(`/anexo-15/${encodeURIComponent(token)}/enviar`, {});
  return res.data?.documento as Anexo15Documento;
}

export async function anularAnexo15(token: string) {
  const res = await http.post(`/anexo-15/${encodeURIComponent(token)}/anular`, {});
  return res.data?.documento as Anexo15Documento;
}

export async function inspectorDevolverAnexo15(token: string, observacion: string) {
  const res = await http.post(`/anexo-15/${encodeURIComponent(token)}/inspector/devolver`, { observacion });
  return res.data?.documento as Anexo15Documento;
}

export async function inspectorAprobarAnexo15(token: string, observacion: string) {
  const res = await http.post(`/anexo-15/${encodeURIComponent(token)}/inspector/aprobar`, { observacion });
  return res.data?.documento as Anexo15Documento;
}

export async function adminDevolverAnexo15(token: string, observacion: string) {
  const res = await http.post(`/anexo-15/${encodeURIComponent(token)}/admin/devolver`, { observacion });
  return res.data?.documento as Anexo15Documento;
}

export async function adminAprobarAnexo15(token: string, observacion: string) {
  const res = await http.post(`/anexo-15/${encodeURIComponent(token)}/admin/aprobar`, { observacion });
  return res.data?.documento as Anexo15Documento;
}

export async function subirAdjuntoAnexo15(token: string, campo: string, file: File) {
  const fd = new FormData();
  fd.append("archivo", file);
  const res = await http.post(`/anexo-15/${encodeURIComponent(token)}/adjuntos/${campo}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.documento as Anexo15Documento;
}

export async function eliminarAdjuntoAnexo15(token: string, adjuntoId: string) {
  const res = await http.delete(`/anexo-15/${encodeURIComponent(token)}/adjuntos/${encodeURIComponent(adjuntoId)}`);
  return res.data?.documento as Anexo15Documento;
}

export async function descargarPdfAnexo15(token: string, preview = false) {
  return http.get(`/anexo-15/${encodeURIComponent(token)}/pdf${preview ? "/preview" : ""}`, {
    responseType: "blob",
  });
}
