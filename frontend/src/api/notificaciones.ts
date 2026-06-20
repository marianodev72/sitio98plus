import { http } from "./http";

export type PrioridadNotificacion = "INFO" | "IMPORTANTE" | "CRITICA";

export type Notificacion = {
  _id: string;
  titulo: string;
  mensaje: string;
  accionTexto?: string;
  accionUrl?: string;
  tipo: string;
  prioridad: PrioridadNotificacion;
  entidadTipo?: string;
  entidadId?: string | null;
  leida?: boolean;
  leidaAt?: string | null;
  confirmada?: boolean;
  confirmadaAt?: string | null;
  requiereConfirmacion?: boolean;
  createdAt?: string | null;
};

export async function getNotificacionesPendientes() {
  const res = await http.get("/notificaciones/pendientes");
  return (res.data?.notificaciones || []) as Notificacion[];
}

export async function marcarNotificacionLeida(id: string) {
  const res = await http.patch(`/notificaciones/${encodeURIComponent(id)}/leida`, {});
  return res.data;
}

export async function confirmarNotificacion(id: string) {
  const res = await http.patch(`/notificaciones/${encodeURIComponent(id)}/confirmar`, {});
  return res.data;
}
