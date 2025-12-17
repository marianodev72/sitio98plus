// src/api/adminUsers.ts
import { apiClient } from "./client";
import type { UserRole } from "./auth";

export type EstadoHabitacional = string;

export interface AdminUserSummary {
  _id: string;
  nombre: string;
  apellido: string;
  email: string;
  dni?: string;
  matricula?: string;
  telefono?: string;
  role: UserRole;
  estadoHabitacional?: EstadoHabitacional;
  barrioAsignado?: string | null;
  activo?: boolean;
  bloqueado?: boolean;
  createdAt?: string;
}

export interface UsersFilters {
  role?: string;
  estadoHabitacional?: string;
  barrio?: string;
  buscar?: string;
  activo?: string; // "true" | "false" | ""
}

function buildQueryParams(filters: UsersFilters) {
  const params: Record<string, string> = {};

  if (filters.role) params.role = filters.role;
  if (filters.estadoHabitacional)
    params.estadoHabitacional = filters.estadoHabitacional;
  if (filters.barrio) params.barrio = filters.barrio;
  if (filters.buscar) params.buscar = filters.buscar;
  if (filters.activo) params.activo = filters.activo;

  return params;
}

/**
 * GET /api/admin/usuarios
 * Lista de usuarios con filtros opcionales.
 */
export async function fetchAdminUsers(filters: UsersFilters = {}) {
  const params = buildQueryParams(filters);

  const { data } = await apiClient.get("/admin/usuarios", {
    params,
  });

  // 🔍 Debug en consola
  console.log("API /admin/usuarios raw data:", data);

  // Permitimos dos formatos:
  // 1) Un array directo
  // 2) Un objeto con propiedad `usuarios`
  if (Array.isArray(data)) {
    return data as AdminUserSummary[];
  }

  if (data && Array.isArray((data as any).usuarios)) {
    return (data as any).usuarios as AdminUserSummary[];
  }

  // Si no matchea nada, devolvemos array vacío para no romper el UI
  return [];
}
