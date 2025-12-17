import { apiClient } from "./client";

export type UserRole =
  | "POSTULANTE"
  | "PERMISIONARIO"
  | "JEFE_DE_BARRIO"
  | "INSPECTOR"
  | "ADMIN"
  | "ADMIN_GENERAL"
  | "ALOJADO";

export interface AuthUser {
  _id: string;
  nombre: string;
  apellido: string;
  email: string;
  role: UserRole;
  activo: boolean;
  barrioAsignado?: string | null;
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
  token: string;
}

export async function loginRequest(email: string, password: string) {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", {
    email,
    password,
  });
  // Podés loguear para depurar:
  // console.log("RESPUESTA LOGIN BACKEND:", data);
  return data;
}
