// frontend/src/api/misMantenimientos.ts
import http from "./http";

export type TipoMantenimiento =
  | "MANTENIMIENTO_ARTEFACTOS_A_GAS"
  | "SISTEMA_DE_CALEFACCION_POR_CALDERA"
  | "DESAGUES"
  | "OTROS";

const UPLOAD_TOO_LARGE_ERR =
  "Uno o más archivos superan el tamaño permitido. Adjunte PDFs de hasta 5 MB cada uno.";
const UPLOAD_ERR =
  "No se pudo enviar la documentación. Verifique que los archivos sean PDF de hasta 5 MB e intente nuevamente.";

function uploadError(e: any): Error {
  const status = e?.response?.status;
  const raw = String(e?.response?.data?.message || e?.response?.data?.error || e?.message || "");
  if (status === 413) return new Error(UPLOAD_TOO_LARGE_ERR);
  if (/MulterError|Unexpected field|LIMIT_FILE_SIZE|Payload Too Large/i.test(raw)) {
    return new Error(status === 413 ? UPLOAD_TOO_LARGE_ERR : UPLOAD_ERR);
  }
  return new Error(UPLOAD_ERR);
}

export async function listarMisMantenimientos() {
  const res = await http.get("/mis-mantenimientos");
  return res.data?.mantenimientos || [];
}

export async function crearMantenimiento(params: {
  tipoMantenimiento: TipoMantenimiento | string; // soporta texto humano también
  tecnicoInterviniente: string;
  archivos: File[];
}) {
  const fd = new FormData();
  fd.append("tipoMantenimiento", params.tipoMantenimiento);
  fd.append("tecnicoInterviniente", params.tecnicoInterviniente || "");

  // Key esperada por Multer en backend/middleware/upload.js
  for (const f of params.archivos) fd.append("documentos", f);

  try {
    const res = await http.post("/mis-mantenimientos", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data?.mantenimiento;
  } catch (e) {
    throw uploadError(e);
  }
}

export function urlFormularioBlank() {
  return "/api/mis-mantenimientos/formulario/blank";
}

export function urlConstancia(id: string) {
  return `/api/mis-mantenimientos/${encodeURIComponent(id)}/constancia.pdf`;
}

export function urlAdjuntoDownload(id: string, fileId: string) {
  return `/api/mis-mantenimientos/${encodeURIComponent(id)}/archivos/${encodeURIComponent(fileId)}/download`;
}

export function urlAdjuntoPreview(id: string, fileId: string) {
  return `/api/mis-mantenimientos/${encodeURIComponent(id)}/archivos/${encodeURIComponent(fileId)}/preview`;
}
