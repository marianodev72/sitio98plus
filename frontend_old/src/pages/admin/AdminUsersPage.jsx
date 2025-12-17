// src/pages/admin/AdminUsersPage.jsx

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { useNavigate } from "react-router-dom";

// Roles disponibles en el sistema.
// ⚠️ Ajustar esta lista si en backend hay otros valores válidos.
const AVAILABLE_ROLES = [
  "ADMIN",
  "ADMINISTRACION",
  "ENCARGADO_GENERAL",
  "INSPECTOR",
  "JEFE_BARRIO",
  "PERMISIONARIO",
  "ALOJADO",
];

export default function AdminUsersPage() {
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  // ---------------------------------------------------------------------------
  // Utilidad para obtener el token actual (fase de transición, luego se quita)
  // ---------------------------------------------------------------------------
  const getAuthHeaders = () => {
    const token = localStorage.getItem("zn98_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  // ---------------------------------------------------------------------------
  // Cargar listado de usuarios
  // ---------------------------------------------------------------------------
  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.message ||
          `Error cargando usuarios (HTTP ${res.status || "?"})`;
        throw new Error(msg);
      }

      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[AdminUsersPage] Error al cargar usuarios:", e);
      setError(e.message || "Error cargando usuarios.");
      setUsuarios([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // ---------------------------------------------------------------------------
  // Cambio de rol
  // ---------------------------------------------------------------------------
  const handleChangeRole = async (userId, newRole) => {
    if (!newRole) return;

    try {
      setSavingId(userId);
      setError("");

      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/${userId}/role`,
        {
          method: "PATCH", // Cambiar a PUT si tu backend lo usa así
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.message ||
          `Error actualizando rol (HTTP ${res.status || "?"})`;
        throw new Error(msg);
      }

      setUsuarios((prev) =>
        prev.map((u) =>
          u._id === userId
            ? {
                ...u,
                role: newRole,
              }
            : u
        )
      );
    } catch (e) {
      console.error("[AdminUsersPage] Error al cambiar rol:", e);
      setError(e.message || "Error al cambiar el rol del usuario.");
    } finally {
      setSavingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="px-6 py-6">
      {/* Botón volver */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 rounded-md text-sm 
                     bg-slate-800 border border-slate-700 
                     text-slate-200 hover:bg-slate-700 
                     transition-colors"
        >
          ← Volver
        </button>
      </div>

      <h1 className="text-2xl font-semibold mb-4 text-slate-100">
        Usuarios y roles
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/15 border border-red-500/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {cargando ? (
        <p className="text-slate-300 text-sm">Cargando usuarios...</p>
      ) : usuarios.length === 0 ? (
        <p className="text-slate-300 text-sm">No hay usuarios registrados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/60">
          <table className="min-w-full text-sm text-slate-100">
            <thead className="bg-slate-950/70 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Correo</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr
                  key={u._id || u.id}
                  className="border-t border-slate-800/80 last:border-b-slate-800/80"
                >
                  <td className="px-4 py-2 align-middle whitespace-nowrap">
                    {u.email}
                  </td>
                  <td className="px-4 py-2 align-middle whitespace-nowrap">
                    {u.nombreCompleto || u.nombre || "—"}
                  </td>
                  <td className="px-4 py-2 align-middle">
                    <select
                      className="bg-slate-950/70 border border-slate-700 rounded-md px-2 py-1 text-xs"
                      value={u.role || ""}
                      onChange={(e) =>
                        handleChangeRole(u._id || u.id, e.target.value)
                      }
                      disabled={savingId === (u._id || u.id)}
                    >
                      <option value="" disabled>
                        Seleccionar rol…
                      </option>
                      {AVAILABLE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 align-middle whitespace-nowrap">
                    {u.activo === false ? (
                      <span className="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-200">
                        Inactivo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                        Activo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-middle text-right text-xs text-slate-400">
                    {savingId === (u._id || u.id) ? "Guardando…" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
