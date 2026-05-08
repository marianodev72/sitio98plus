// frontend/src/api/mantenimientos.ts
import http from "./http";

export type Decision = "PENDIENTE" | "SI" | "NO";
export type TipoMantenimiento =
  | "MANTENIMIENTO_ARTEFACTOS_A_GAS"
  | "SISTEMA_DE_CALEFACCION_POR_CALDERA"
  | "DESAGUES"
  | "OTROS";

export type MantenimientoItem = {
  _id: string;
  viviendaDisplay: string;
  permisionarioDisplay: string;
  submittedAt: string;
  tipoMantenimiento: TipoMantenimiento;
  tecnicoInterviniente?: string;

  inspectorDecision: Decision;
  adminDecision: Decision;
  isClosed: boolean;

  adjuntos?: Array<{
    fileId: string;
    nombre: string;
    mimetype: string;
    size: number;
  }>;

  intervenciones?: Array<{
    actorNombre: string;
    actorRole: string;
    accion: string;
    resultado: string;
    fecha: string;
  }>;
};

const GENERIC_ERR = "No es posible procesar su solicitud";

function opaqueError(_: any): Error {
  return new Error(GENERIC_ERR);
}

function toQuery(params: Record<string, any>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

// ─────────────────────────────
// PERMISIONARIO
// ─────────────────────────────

export async function listarMisMantenimientos(): Promise<MantenimientoItem[]> {
  try {
    const res = await http.get("/mis-mantenimientos");
    return res.data?.mantenimientos || res.data?.items || [];
  } catch (e) {
    throw opaqueError(e);
  }
}

export async function crearMantenimiento(input: {
  tipoMantenimiento: TipoMantenimiento;
  tecnicoInterviniente: string;
  archivos: File[];
}): Promise<MantenimientoItem> {
  try {
    const fd = new FormData();
    fd.append("tipoMantenimiento", input.tipoMantenimiento);
    fd.append("tecnicoInterviniente", input.tecnicoInterviniente || "");

    for (const f of input.archivos || []) fd.append("archivos", f);

    const res = await http.post("/mis-mantenimientos", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data?.mantenimiento || res.data?.item;
  } catch (e) {
    throw opaqueError(e);
  }
}

export async function getMantenimiento(id: string): Promise<MantenimientoItem> {
  try {
    const res = await http.get(`/mis-mantenimientos/${encodeURIComponent(id)}`);
    return res.data?.mantenimiento || res.data?.item;
  } catch (e) {
    throw opaqueError(e);
  }
}

// URLs (descarga/preview) – navegación directa a /api
export function urlFormularioBlank(): string {
  return "/api/mis-mantenimientos/formulario/blank";
}
export function urlPreviewAdjunto(id: string, archivoId: string): string {
  return `/api/mis-mantenimientos/${encodeURIComponent(id)}/archivos/${encodeURIComponent(
    archivoId
  )}/preview`;
}
export function urlDownloadAdjunto(id: string, archivoId: string): string {
  return `/api/mis-mantenimientos/${encodeURIComponent(id)}/archivos/${encodeURIComponent(
    archivoId
  )}/download`;
}
export function urlConstanciaPdf(id: string): string {
  return `/api/mis-mantenimientos/${encodeURIComponent(id)}/constancia.pdf`;
}

// ─────────────────────────────
// INSPECTOR
// ─────────────────────────────

export async function listarMantenimientosBarrioInspector(): Promise<MantenimientoItem[]> {
  try {
    const res = await http.get("/mis-mantenimientos/inspector/barrio");
    return res.data?.mantenimientos || res.data?.items || [];
  } catch (e) {
    throw opaqueError(e);
  }
}

export async function decisionInspector(id: string, decision: "SI" | "NO"): Promise<void> {
  try {
    await http.patch(`/mis-mantenimientos/inspector/${encodeURIComponent(id)}/decision`, { decision });
  } catch (e) {
    throw opaqueError(e);
  }
}

// ─────────────────────────────
// ADMIN GENERAL
// ─────────────────────────────
// Nota: estos endpoints deben existir en el backend.
// Si todavía no los montaste, esto compila y el UI funciona,
// pero el server responderá 404 hasta que estén.
// ─────────────────────────────

export async function listarMantenimientosAdmin(filters?: {
  barrio?: string;
  vivienda?: string;
  permisionario?: string;
  inspectorDecision?: Decision;
  adminDecision?: Decision;
  isClosed?: "true" | "false";
}): Promise<MantenimientoItem[]> {
  try {
    const qs = toQuery({
      barrio: filters?.barrio,
      vivienda: filters?.vivienda,
      permisionario: filters?.permisionario,
      inspectorDecision: filters?.inspectorDecision,
      adminDecision: filters?.adminDecision,
      isClosed: filters?.isClosed,
    });

    const res = await http.get(`/mis-mantenimientos/admin${qs}`);
    return res.data?.mantenimientos || res.data?.items || [];
  } catch (e) {
    throw opaqueError(e);
  }
}

export async function decisionAdmin(id: string, decision: "SI" | "NO"): Promise<void> {
  try {
    await http.patch(`/mis-mantenimientos/admin/${encodeURIComponent(id)}/decision`, { decision });
  } catch (e) {
    throw opaqueError(e);
  }
}

export async function cierreAdmin(id: string): Promise<void> {
  try {
    await http.post(`/mis-mantenimientos/admin/${encodeURIComponent(id)}/cierre`, {});
  } catch (e) {
    throw opaqueError(e);
  }
}
