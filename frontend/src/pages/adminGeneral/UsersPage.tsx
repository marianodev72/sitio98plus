// C:\sitio98plus\FRONTEND\src\pages\adminGeneral\UsersPage.tsx

import { useEffect, useState } from "react";
import { fetchAdminUsers, AdminUserSummary } from "../../api/users";
import { useAuthStore } from "../../store/authStore";

const ROLES_OPCIONES = [
  { value: "TODOS", label: "Todos los roles" },
  { value: "POSTULANTE", label: "Postulante" },
  { value: "PERMISIONARIO", label: "Permisionario" },
  { value: "ALOJADO", label: "Alojado" },
  { value: "INSPECTOR", label: "Inspector" },
  { value: "JEFE_DE_BARRIO", label: "Jefe de barrio" },
  { value: "ADMIN", label: "Admin" },
  { value: "ADMIN_GENERAL", label: "Admin General" },
];

const ESTADOS_HABITACIONALES = [
  { value: "TODOS", label: "Todos" },
  { value: "SIN_VIVIENDA", label: "Sin vivienda" },
  { value: "PERMISIONARIO_ACTIVO", label: "Permisionario activo" },
  { value: "ALOJADO_ACTIVO", label: "Alojado activo" },
];

export function UsersPage() {
  const { user } = useAuthStore();
  const [usuarios, setUsuarios] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rol, setRol] = useState<string>("TODOS");
  const [estadoHabitacional, setEstadoHabitacional] = useState<string>("TODOS");
  const [buscar, setBuscar] = useState<string>("");

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchAdminUsers({
        rol: rol as any,
        estadoHabitacional,
        buscar,
      });

      setUsuarios(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Error al cargar usuarios";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user && user.role !== "ADMIN_GENERAL") {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold mb-2">Administración de usuarios</h1>
        <p className="text-red-600">No tiene permisos para acceder a este módulo.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Administración de usuarios</h1>
          <p className="text-sm text-gray-600">
            Panel del ADMIN_GENERAL para consultar y gestionar usuarios.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarUsuarios}
          className="mt-2 inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
          disabled={loading}
        >
          {loading ? "Actualizando..." : "Actualizar lista"}
        </button>
      </header>

      {/* Filtros */}
      <section className="bg-white rounded-lg shadow p-3 md:p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
            <select
              className="w-full rounded-md border px-2 py-1 text-sm"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
            >
              {ROLES_OPCIONES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Estado habitacional
            </label>
            <select
              className="w-full rounded-md border px-2 py-1 text-sm"
              value={estadoHabitacional}
              onChange={(e) => setEstadoHabitacional(e.target.value)}
            >
              {ESTADOS_HABITACIONALES.map((eopt) => (
                <option key={eopt.value} value={eopt.value}>
                  {eopt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Buscar (nombre, email, matrícula)
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-2 py-1 text-sm"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") cargarUsuarios();
              }}
              placeholder="Ej: GARCIA, usuario@armada.mil.ar, 12345"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={cargarUsuarios}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            disabled={loading}
          >
            Aplicar filtros
          </button>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla */}
      <section className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Nombre</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Matrícula</th>
              <th className="px-3 py-2 text-left font-medium">Rol</th>
              <th className="px-3 py-2 text-left font-medium">Estado habitacional</th>
              <th className="px-3 py-2 text-left font-medium">Barrio</th>
            </tr>
          </thead>

          <tbody>
            {usuarios.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                  No se encontraron usuarios con los filtros actuales.
                </td>
              </tr>
            )}

            {usuarios.map((u) => (
              <tr key={u._id} className="border-t">
                <td className="px-3 py-2">
                  {u.apellido}, {u.nombre}
                </td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.matricula}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">{u.estadoHabitacional}</td>
                <td className="px-3 py-2">{u.barrio || "-"}</td>
              </tr>
            ))}

            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                  Cargando usuarios...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default UsersPage;
