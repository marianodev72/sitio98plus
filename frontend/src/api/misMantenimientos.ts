// frontend/src/api/misMantenimientos.ts
import http from "./http";

export type TipoMantenimiento =
  | "MANTENIMIENTO_ARTEFACTOS_A_GAS"
  | "SISTEMA_DE_CALEFACCION_POR_CALDERA"
  | "DESAGUES"
  | "OTROS";

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

  // ✅ key EXACTA: "archivos"
  for (const f of params.archivos) fd.append("archivos", f);

  const res = await http.post("/mis-mantenimientos", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data?.mantenimiento;
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
