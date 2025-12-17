import axios from "axios";

export type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  createdAt?: string;
  datos?: any;
  usuario?: any;
};

export type Vivienda = {
  _id: string;
  codigo: string;
  barrio?: string;
  numero?: string;
  estado?: string;
  meta?: any;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});

export async function getAnexosPorCodigo(codigo: string): Promise<Anexo[]> {
  const { data } = await api.get(`/api/formularios/anexo/${codigo}`);
  return data?.anexos || [];
}

export async function getMisAnexos(codigo: string): Promise<Anexo[]> {
  const { data } = await api.get(`/api/formularios/mios`, { params: { codigo } });
  return data?.anexos || [];
}

export async function getViviendasDisponibles(): Promise<Vivienda[]> {
  const { data } = await api.get(`/api/viviendas`, { params: { estado: "DISPONIBLE" } });
  return data || [];
}

export async function crearAnexo01(datos: any) {
  const { data } = await api.post(`/api/formularios/ANEXO_01`, { datos });
  return data?.anexo;
}

export async function crearAnexo02(datos: any) {
  const { data } = await api.post(`/api/formularios/ANEXO_02`, { datos });
  return data?.anexo;
}

export async function darConformidadAnexo02(id: string, observacion?: string) {
  const { data } = await api.post(`/api/formularios/${id}/conformidad`, { observacion });
  return data?.anexo;
}

// ✅ NUEVO: cierre ADMIN_GENERAL
export async function cerrarTramiteAnexo02(id: string, observacion?: string) {
  const { data } = await api.post(`/api/formularios/${id}/conformidad-admin`, { observacion });
  return data?.anexo;
}
