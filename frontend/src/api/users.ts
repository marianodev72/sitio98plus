// src/api/users.ts
// Servicios HTTP para ADMIN_GENERAL – Gestión de usuarios

import { http } from "./http";

// Tipos de apoyo (solo para tipado en frontend)
export type UserRole =
  | "POSTULANTE"
  | "PERMISIONARIO"
  | "ALOJADO"
  | "INSPECTOR"
  | "JEFE_DE_BARRIO"
  | "ADMIN"
  | "ADMIN_GENERAL"
  | string;

export type EstadoHabitacional =
  | "SIN_VIVIENDA"
  | "PERMISIONARIO_ACTIVO"
  | "ALOJADO_ACTIVO"
  | "BAJA"
  | "SIN_VIVIENDA_ALOJAMIENTO"
  | "ALOJADO_ACTIVO_ALOJAMIENTO"
  | string;

// Resumen de usuario que devuelve el backend en /admin/usuarios
export interface AdminUserSummary {
  _id: string;
  nombre: string;
  apellido: string;
  email: string;
  matricula: string;
  role: UserRole;
  estadoHabitacional: EstadoHabitacional;
  barrio?: string | null;
  destinoActual?: string | null;
  destinoFuturo?: string | null;
}

// Filtros que enviamos como query params
export interface AdminUserFilters {
  rol?: UserRole | "TODOS";
  estadoHabitacional?: EstadoHabitacional | "TODOS";
  barrio?: string | "TODOS";
  buscar?: string;
}

/**
 * Obtiene el listado de usuarios para el panel ADMIN_GENERAL.
 * Llama a GET /admin/usuarios con filtros opcionales.
 */
export async function fetchAdminUsers(
  filters: AdminUserFilters = {}
): Promise<AdminUserSummary[]> {
  const params: Record<string, string> = {};

  const { rol, estadoHabitacional, barrio, buscar } = filters;

  if (rol && rol !== "TODOS") {
    params.rol = rol;
  }

  if (estadoHabitacional && estadoHabitacional !== "TODOS") {
    params.estadoHabitacional = estadoHabitacional;
  }

  if (barrio && barrio !== "TODOS") {
    params.barrio = barrio;
  }

  if (buscar && buscar.trim() !== "") {
    params.buscar = buscar.trim();
  }

  const { data } = await http.get<AdminUserSummary[]>("/admin/usuarios", {
    params,
  });

  return data;
}

/**
 * Cambia el rol y/o estado habitacional de un usuario.
 * Backend: PATCH /admin/usuarios/:id/rol-estado
 *
 * Body esperado:
 * {
 *   rol?: string;
 *   estadoHabitacional?: string;
 *   motivo?: string;
 * }
 *
 * Respuesta esperada:
 * {
 *   message: string;
 *   user: AdminUserSummary;
 * }
 */
export interface UpdateRolEstadoPayload {
  rol?: UserRole;
  estadoHabitacional?: EstadoHabitacional;
  motivo?: string;
}

export interface UpdateRolEstadoResponse {
  message: string;
  user: AdminUserSummary;
}

export async function updateUserRolEstado(
  userId: string,
  payload: UpdateRolEstadoPayload
): Promise<UpdateRolEstadoResponse> {
  const { data } = await http.patch<UpdateRolEstadoResponse>(
    `/admin/usuarios/${userId}/rol-estado`,
    payload
  );
  return data;
}
