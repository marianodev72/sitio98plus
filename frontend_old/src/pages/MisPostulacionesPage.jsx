// src/pages/MisPostulacionesPage.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";

// Definimos la URL base acá para evitar problemas de import
const API_BASE_URL = "http://127.0.0.1:3000";

function getAuthToken() {
  try {
    return localStorage.getItem("zn98_token");
  } catch {
    return null;
  }
}

export default function MisPostulacionesPage() {
  const navigate = useNavigate();

  const [postulaciones, setPostulaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [descargandoId, setDescargandoId] = useState(null);

  useEffect(() => {
    const fetchPostulaciones = async () => {
      setCargando(true);
      setError("");

      const token = getAuthToken();

      if (!token) {
        setError("No se encontró un token de sesión. Iniciá sesión nuevamente.");
        setCargando(false);
        return;
      }

      try {
        // Para postulante usamos /api/postulaciones/mias
        const res = await fetch(`${API_BASE_URL}/api/postulaciones/mias`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Error al obtener las postulaciones.");
        }

        const lista = data?.postulaciones || [];
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

  const handleDescargarPdf = async (id) => {
    const token = getAuthToken();
    if (!token) {
      setError("No se encontró un token de sesión. Iniciá sesión nuevamente.");
      return;
    }

    try {
      setDescargandoId(id);
      setError("");

      const res = await fetch(`${API_BASE_URL}/api/postulaciones/${id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.message || "No se pudo descargar el PDF de la postulación."
        );
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `postulacion_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[POSTULACIONES] Descargar PDF:", err);
      setError(err.message || "Error al descargar el PDF de la postulación.");
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <InstitutionalHeader />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-1">Mis postulaciones</h1>
            <p className="text-sm text-gray-300">
              Aquí podés ver todas las solicitudes que realizaste para viviendas
              fiscales y alojamientos.
            </p>
          </div>

          <button
            onClick={() => navigate("/postulante")}
            className="px-4 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-sm font-medium"
          >
            Volver al panel
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/80 border border-red-700 px-4 py-3 text-sm">
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
          <div className="overflow-x-auto bg-slate-900/60 rounded-xl border border-slate-700/60">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 uppercase text-[11px] tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {postulaciones.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-slate-800 hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-3">
                      {p.tipo === "VIVIENDA"
                        ? "Vivienda fiscal"
                        : p.tipo === "ALOJAMIENTO"
                        ? "Alojamiento"
                        : p.tipo || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {p.estado === "EN_ANALISIS"
                        ? "En análisis"
                        : p.estado === "ACEPTADA"
                        ? "Aceptada"
                        : p.estado === "RECHAZADA"
                        ? "Rechazada"
                        : p.estado || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString("es-AR")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDescargarPdf(p.id)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-sky-600 hover:bg-sky-500 disabled:opacity-60"
                        disabled={descargandoId === p.id}
                      >
                        {descargandoId === p.id
                          ? "Descargando..."
                          : "Descargar PDF"}
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
