import { http } from "./http";

export type TipoAlerta =
  | "LECTURA"
  | "ACCION"
  | "CONFIRMACION"
  | "SEGUIMIENTO"
  | "NOTIFICACION";

export type PrioridadAlerta = "CRITICA" | "ALTA" | "MEDIA" | "INFO";

export type AlertaPostLogin = {
  id: string;
  tipo: TipoAlerta;
  modulo: string;
  prioridad: PrioridadAlerta;
  titulo: string;
  descripcion: string;
  accionUrl: string | null;
  entidadTipo: string | null;
  entidadId: string | null;
  cantidad: number;
  requiereAccion: boolean;
  requiereLectura: boolean;
  requiereConfirmacion: boolean;
  metadata: Record<string, unknown>;
};

export type AlertasPostLoginResumen = {
  total: number;
  alertas: AlertaPostLogin[];
};

export async function getAlertasPostLoginResumen() {
  const res = await http.get("/alertas/post-login/resumen");
  return {
    total: Number(res.data?.total || 0),
    alertas: Array.isArray(res.data?.alertas) ? (res.data.alertas as AlertaPostLogin[]) : [],
  };
}
