import { http } from "./http";

export type ResumenMensajesNoLeidos = {
  totalNoLeidos: number;
  ultimoMensaje?: {
    asunto?: string;
    fecha?: string | null;
    origen?: string;
  } | null;
};

export async function getResumenMensajesNoLeidos(): Promise<ResumenMensajesNoLeidos> {
  const res = await http.get("/mensajes/no-leidos/resumen");
  return {
    totalNoLeidos: Number(res.data?.totalNoLeidos || 0),
    ultimoMensaje: res.data?.ultimoMensaje || null,
  };
}
