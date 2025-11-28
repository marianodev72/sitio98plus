// src/pages/admin/AdminUsersPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../../components/layout/InstitutionalHeader";

const API_BASE_URL = "http://127.0.0.1:3000";

const rolesPosibles = [
  "ADMIN",
  "ADMINISTRACION",
  "ENCARGADO_GENERAL",
  "POSTULANTE",
  "PERMISIONARIO",
  "ALOJADO",
  "INSPECTOR",
  "JEFE_BARRIO",
];

const estadosPosibles = ["PENDIENTE", "APROBADO", "RECHAZADO"];

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardandoId, setGuardandoId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("zn98_token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUsuarios = async () => {
      try {
        setCargando(true);
        setError("");

        const resp = await fetch(`${API_BASE_URL}/api/users/admin`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.message || "Error cargando usuarios");
        }

        const data = await resp.json();
        setUsuarios(data.users || []);
      } catch (err) {
        console.error("[ADMIN-USUARIOS] Error:", err);
        setError(err.message || "Error cargando usuarios");
      } finally {
        setCargando(false);
      }
    };

    fetchUsuarios();
  }, [navigate]);

  const handleCambioCampo = (id, campo, valor) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [campo]: valor } : u))
    );
  };

  const handleGuardar = async (u) => {
    const token = localStorage.getItem("zn98_token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setGuardandoId(u.id);
      setError("");

      const resp = await fetch(
        `${API_BASE_URL}/api/users/admin/${u.id}/role-estado`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: u.role,
            estado: u.estado,
          }),
        }
      );

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || data.ok === false) {
        throw new Error(data.message || "Error guardando cambios");
      }

      setUsuarios((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, ...data.user } : x))
      );
    } catch (err) {
      console.error("[ADMIN-USUARIOS] Error guardando:", err);
      setError(err.message || "Error guardando cambios");
    } finally {
      setGuardandoId(null);
    }
  };

  const handleVolver = () => {
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <InstitutionalHeader />

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Usuarios y roles</h1>
            <p className="text-sm text-slate-300 mt-1">
              Administrá cuentas de administración, inspectores, jefes de barrio,
              permisionarios y alojados.
            </p>
          </div>

          <button
            onClick={handleVolver}
            className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-sm font-semibold"
          >
            Volver al panel
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/15 border border-red-500/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {cargando ? (
          <p className="text-sm text-slate-300">Cargando usuarios...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-slate-300">
            No hay usuarios registrados en el sistema.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/90">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">
                    Nombre
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Email</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Matrícula
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Grado</th>
                  <th className="px-3 py-2 text-left font-semibold">DNI</th>
                  <th className="px-3 py-2 text-left font-semibold">Rol</th>
                  <th className="px-3 py-2 text-left font-semibold">Estado</th>
                  <th className="px-3 py-2 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-slate-800 hover:bg-slate-800/60"
                  >
                    <td className="px-3 py-2">
                      {u.nombre} {u.apellido}
                    </td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.matricula || "-"}</td>
                    <td className="px-3 py-2">{u.grado || "-"}</td>
                    <td className="px-3 py-2">{u.dni || "-"}</td>
                    <td className="px-3 py-2">
                      <select
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                        value={u.role || "POSTULANTE"}
                        onChange={(e) =>
                          handleCambioCampo(u.id, "role", e.target.value)
                        }
                      >
                        {rolesPosibles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                        value={u.estado || "PENDIENTE"}
                        onChange={(e) =>
                          handleCambioCampo(u.id, "estado", e.target.value)
                        }
                      >
                        {estadosPosibles.map((est) => (
                          <option key={est} value={est}>
                            {est}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleGuardar(u)}
                        disabled={guardandoId === u.id}
                        className="px-3 py-1 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-semibold"
                      >
                        {guardandoId === u.id ? "Guardando..." : "Guardar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
