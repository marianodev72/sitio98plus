// src/pages/MisPostulacionesPage.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";

const API_BASE_URL = "http://127.0.0.1:3000";

function getAuthToken() {
  try {
    return localStorage.getItem("zn98_token");
  } catch {
    return null;
  }
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("zn98_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function MisPostulacionesPage() {
  const navigate = useNavigate();
  const [postulaciones, setPostulaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    const token = getAuthToken();

    // el backend devuelve id, pero soportamos _id por las dudas
    const userId = user?.id || user?._id;

    if (!user || !userId) {
      setError(
        "No se pudo obtener el usuario autenticado. Volvé a iniciar sesión."
      );
      setCargando(false);
      return;
    }

    const fetchPostulaciones = async () => {
      try {
        setCargando(true);
        setError("");

        const res = await fetch(
          `${API_BASE_URL}/api/postulaciones?userId=${encodeURIComponent(
            userId
          )}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data?.message || "Error al obtener las postulaciones."
          );
        }

        const data = await res.json();

        // El backend devuelve { total, page, limit, items }
        const lista = Array.isArray(data)
          ? data
          : data.items || data.results || [];

        setPostulaciones(lista);
      } catch (err) {
        console.error("[POSTULACIONES] Error:", err);
        setError(
          err.message || "Error inesperado al obtener las postulaciones."
        );
      } finally {
        setCargando(false);
      }
    };

    fetchPostulaciones();
  }, []);

  const handleVolver = () => {
    navigate("/postulante");
  };

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <InstitutionalHeader />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold mb-1">Mis postulaciones</h1>
            <p className="text-gray-300 text-sm max-w-2xl">
              Aquí podés ver todas las solicitudes que realizaste para
              viviendas fiscales y alojamientos.
            </p>
          </div>

          <button
            onClick={handleVolver}
            className="px-4 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-sm font-medium"
          >
            Volver al panel
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-900/60 border border-red-600 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {cargando ? (
          <p className="text-sm text-gray-300">Cargando postulaciones…</p>
        ) : postulaciones.length === 0 ? (
          <p className="text-sm text-gray-300">
            Todavía no registraste ninguna postulación.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg bg-slate-900/60 border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800/80 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Código</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Fecha de creación
                  </th>
                </tr>
              </thead>
              <tbody>
                {postulaciones.map((p) => (
                  <tr
                    key={p._id || p.id}
                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
                      {p.codigo || p._id || p.id || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-slate-800">
                        {p.estado || "SIN ESTADO"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString("es-AR")
                        : "-"}
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
