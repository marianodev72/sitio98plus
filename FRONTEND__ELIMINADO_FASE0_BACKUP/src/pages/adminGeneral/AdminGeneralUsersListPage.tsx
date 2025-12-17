// C:\sitio98plus\FRONTEND\src\pages\adminGeneral\AdminGeneralUsersListPage.tsx

import { useEffect, useState, type FormEvent } from "react";
import { useAuthStore } from "../../store/authStore";
import { apiClient } from "../../api/client";

type UserRole =
  | "POSTULANTE"
  | "PERMISIONARIO"
  | "ALOJADO"
  | "INSPECTOR"
  | "JEFE_MILITAR"
  | "ADMIN_GENERAL";

type EstadoHabitacional =
  | "SIN_VIVIENDA"
  | "POSTULANTE_EN_LISTA"
  | "PERMISIONARIO_ACTIVO"
  | "EN_PROCESO_DESALOJO"
  | "ALOJADO_ACTIVO";

interface AdminUser {
  _id: string;
  nombre: string;
  apellido: string;
  email: string;
  dni: string;
  matricula: string;
  telefono?: string;
  role: UserRole;
  estadoHabitacional?: EstadoHabitacional | null;
  barrioAsignado?: string | null;
  activo: boolean;
  bloqueado: boolean;
  viviendaAsignada?: string | null;
  createdAt?: string;
}

interface Filters {
  rol: "TODOS" | UserRole;
  estadoHabitacional: "TODOS" | EstadoHabitacional;
  buscar: string;
}

const ROLES_OPTIONS: { value: Filters["rol"]; label: string }[] = [
  { value: "TODOS", label: "Todos los roles" },
  { value: "ADMIN_GENERAL", label: "Admin General" },
  { value: "INSPECTOR", label: "Inspector" },
  { value: "JEFE_MILITAR", label: "Jefe Militar" },
  { value: "PERMISIONARIO", label: "Permisionario" },
  { value: "POSTULANTE", label: "Postulante" },
  { value: "ALOJADO", label: "Alojado" },
];

const ESTADO_OPTIONS: {
  value: Filters["estadoHabitacional"];
  label: string;
}[] = [
  { value: "TODOS", label: "Todos los estados" },
  { value: "SIN_VIVIENDA", label: "Sin vivienda" },
  { value: "POSTULANTE_EN_LISTA", label: "Postulante en lista" },
  { value: "PERMISIONARIO_ACTIVO", label: "Permisionario activo" },
  { value: "EN_PROCESO_DESALOJO", label: "En proceso de desalojo" },
  { value: "ALOJADO_ACTIVO", label: "Alojado activo" },
];

export function AdminGeneralUsersListPage() {
  const { user, token } = useAuthStore();

  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);
  const [filters, setFilters] = useState<Filters>({
    rol: "TODOS",
    estadoHabitacional: "TODOS",
    buscar: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // ─────────────────────────────────────────────
  // Cargar usuarios (usando apiClient)
  // ─────────────────────────────────────────────
  async function loadUsers(currentFilters: Filters = filters) {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};

      // IMPORTANTE: el backend espera "role", no "rol"
      if (currentFilters.rol && currentFilters.rol !== "TODOS") {
        params.role = currentFilters.rol;
      }
      if (
        currentFilters.estadoHabitacional &&
        currentFilters.estadoHabitacional !== "TODOS"
      ) {
        params.estadoHabitacional = currentFilters.estadoHabitacional;
      }
      if (currentFilters.buscar && currentFilters.buscar.trim() !== "") {
        params.buscar = currentFilters.buscar.trim();
      }

      const resp = await apiClient.get("/admin/users", { params });

      // Puede venir como array directo o como objeto paginado
      const raw = resp.data as any;
      const items: AdminUser[] = Array.isArray(raw)
        ? raw
        : raw.items || [];

      setUsuarios(items);
    } catch (err) {
      console.error("[AdminGeneral] Error al cargar usuarios:", err);
      setError("Error al cargar usuarios. Ver consola para más detalles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ─────────────────────────────────────────────
  // Handlers filtros
  // ─────────────────────────────────────────────
  function handleFilterChange<K extends keyof Filters>(
    key: K,
    value: Filters[K]
  ) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleApplyFilters(e: FormEvent) {
    e.preventDefault();
    await loadUsers(filters);
  }

  async function handleResetFilters() {
    const reset: Filters = {
      rol: "TODOS",
      estadoHabitacional: "TODOS",
      buscar: "",
    };
    setFilters(reset);
    await loadUsers(reset);
  }

  // ─────────────────────────────────────────────
  // Acciones: cambio de rol/estado, bloqueo, reset clave
  // ─────────────────────────────────────────────
  async function handleEditarRolEstado(userId: string) {
    const nuevoRol = window.prompt(
      "Ingrese nuevo rol (POSTULANTE, PERMISIONARIO, ALOJADO, INSPECTOR, JEFE_MILITAR, ADMIN_GENERAL):"
    ) as UserRole | null;

    if (!nuevoRol) return;

    const nuevoEstado = window.prompt(
      "Ingrese nuevo estado habitacional (SIN_VIVIENDA, POSTULANTE_EN_LISTA, PERMISIONARIO_ACTIVO, EN_PROCESO_DESALOJO, ALOJADO_ACTIVO) o deje vacío para no cambiar:"
    ) as EstadoHabitacional | "" | null;

    try {
      setActionMessage(null);

      const resp = await apiClient.patch(
        `/admin/users/${userId}/role-estado`,
        {
          role: nuevoRol,
          estadoHabitacional: nuevoEstado || undefined,
        }
      );

      if (resp.status < 200 || resp.status >= 300) {
        throw new Error("No se pudo actualizar rol/estado.");
      }

      setActionMessage("Rol/estado actualizado correctamente.");
      await loadUsers(filters);
    } catch (err) {
      console.error("Error al actualizar rol/estado:", err);
      setActionMessage("Error al actualizar rol/estado.");
    }
  }

  async function handleToggleBloqueo(userId: string, bloquear: boolean) {
    try {
      setActionMessage(null);

      const resp = await apiClient.patch(
        `/admin/users/${userId}/bloqueo`,
        {
          bloqueado: bloquear,
        }
      );

      if (resp.status < 200 || resp.status >= 300) {
        throw new Error("No se pudo cambiar el bloqueo.");
      }

      setActionMessage(
        bloquear
          ? "Usuario bloqueado correctamente."
          : "Usuario desbloqueado correctamente."
      );
      await loadUsers(filters);
    } catch (err) {
      console.error("Error al cambiar bloqueo:", err);
      setActionMessage("Error al cambiar bloqueo del usuario.");
    }
  }

  async function handleResetPassword(userId: string) {
    if (
      !window.confirm(
        "¿Seguro desea resetear la contraseña de este usuario? Se generará una clave temporal."
      )
    ) {
      return;
    }

    try {
      setActionMessage(null);

      const resp = await apiClient.post(
        `/admin/users/${userId}/reset-password`
      );

      if (resp.status < 200 || resp.status >= 300) {
        throw new Error("No se pudo resetear la contraseña.");
      }

      const data = resp.data as any;
      const tempPassword = data?.tempPassword as string | undefined;

      setActionMessage(
        tempPassword
          ? `Contraseña reseteada. Clave temporal: ${tempPassword}`
          : "Contraseña reseteada correctamente."
      );

      // NOTA: en producción, lo ideal es comunicar la clave
      // temporal por canales institucionales, no en UI.
    } catch (err) {
      console.error("Error al resetear contraseña:", err);
      setActionMessage("Error al resetear contraseña.");
    }
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Gestión de usuarios
          </h1>
          <p className="text-xs md:text-sm text-slate-600">
            Panel de administración de usuarios, roles, estados y accesos.
          </p>
        </div>
        {user && (
          <div className="text-xs md:text-sm text-right text-slate-700">
            <div>
              Sesión como:{" "}
              <span className="font-semibold">
                {user.nombre} {user.apellido}
              </span>
            </div>
            <div className="uppercase text-[10px] md:text-xs text-blue-700 font-bold">
              {user.role}
            </div>
          </div>
        )}
      </header>

      {/* Filtros */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 md:p-4 lg:p-5 space-y-3">
        <h2 className="text-sm md:text-base font-semibold text-slate-800 mb-2">
          Filtros
        </h2>
        <form
          onSubmit={handleApplyFilters}
          className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4"
        >
          <div className="flex-1 space-y-1">
            <label className="text-xs text-slate-600">Rol</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs md:text-sm"
              value={filters.rol}
              onChange={(e) =>
                handleFilterChange("rol", e.target.value as Filters["rol"])
              }
            >
              {ROLES_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 space-y-1">
            <label className="text-xs text-slate-600">Estado habitacional</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs md:text-sm"
              value={filters.estadoHabitacional}
              onChange={(e) =>
                handleFilterChange(
                  "estadoHabitacional",
                  e.target.value as Filters["estadoHabitacional"]
                )
              }
            >
              {ESTADO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 space-y-1">
            <label className="text-xs text-slate-600">
              Buscar (nombre, apellido, email, DNI, matrícula)
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs md:text-sm"
              value={filters.buscar}
              onChange={(e) => handleFilterChange("buscar", e.target.value)}
              placeholder="Ej: PEREZ, 34343434, inspector@example.com"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs md:text-sm font-medium text-white hover:bg-blue-700"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center rounded-lg bg-slate-700 px-3 py-1.5 text-xs md:text-sm font-medium text-slate-100 hover:bg-slate-800"
            >
              Limpiar filtros
            </button>
          </div>
        </form>
      </section>

      {/* Mensajes de estado */}
      {loading && (
        <div className="text-xs md:text-sm text-blue-700">
          Cargando usuarios...
        </div>
      )}
      {error && (
        <div className="text-xs md:text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {actionMessage && (
        <div className="text-xs md:text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {actionMessage}
        </div>
      )}

      {/* Tabla de usuarios */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 md:p-4 lg:p-5">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-sm md:text-base font-semibold text-slate-800">
            Usuarios del sistema
          </h2>
          <span className="text-[11px] md:text-xs text-slate-500">
            Total: {Array.isArray(usuarios) ? usuarios.length : 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px] md:text-xs text-left text-slate-700">
            <thead className="bg-slate-100 text-[10px] md:text-xs uppercase tracking-wide">
              <tr>
                <th className="px-2 py-2">Nombre</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Rol</th>
                <th className="px-2 py-2">Estado hab.</th>
                <th className="px-2 py-2">Barrio</th>
                <th className="px-2 py-2">Activo</th>
                <th className="px-2 py-2">Bloqueado</th>
                <th className="px-2 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(usuarios) && usuarios.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-4 text-center text-xs text-slate-500"
                  >
                    No se encontraron usuarios con los filtros actuales.
                  </td>
                </tr>
              ) : (
                Array.isArray(usuarios) &&
                usuarios.map((u) => (
                  <tr key={u._id} className="border-b border-slate-100">
                    <td className="px-2 py-2">
                      <div className="font-semibold">
                        {u.nombre} {u.apellido}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        DNI: {u.dni} · Mat: {u.matricula}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div>{u.email}</div>
                      <div className="text-[10px] text-slate-500">
                        Tel: {u.telefono || "-"}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center rounded-full bg-slate-800/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-50">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">
                        {u.estadoHabitacional || "-"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">
                        {u.barrioAsignado || "-"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          u.activo
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {u.activo ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          u.bloqueado
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {u.bloqueado ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditarRolEstado(u._id)}
                          className="inline-flex items-center rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-50 hover:bg-slate-900"
                        >
                          Rol / estado
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleBloqueo(u._id, !u.bloqueado)
                          }
                          className="inline-flex items-center rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-medium text-white hover:bg-amber-600"
                        >
                          {u.bloqueado ? "Desbloquear" : "Bloquear"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetPassword(u._id)}
                          className="inline-flex items-center rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-indigo-700"
                        >
                          Reset clave
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────
// EXPORTAR COMO DEFAULT (REQUERIDO POR AppRouter)
// ─────────────────────────────────────────────
export default AdminGeneralUsersListPage;
