import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

export default function AdminViviendasPage() {
  const navigate = useNavigate();
  const [viviendas, setViviendas] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  // === MISMO getAuthHeaders() QUE USERS ===
  const getAuthHeaders = () => {
    const token = localStorage.getItem("zn98_token");
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    const cargar = async () => {
      setError(null);
      setCargando(true);

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/viviendas/admin/list`,
          {
            method: "GET",
            headers: getAuthHeaders(),   // <-- ESTA LÍNEA ES LA CLAVE
            credentials: "include",
          }
        );

        if (!res.ok) {
          throw new Error(`Error cargando viviendas (status ${res.status})`);
        }

        const data = await res.json();
        setViviendas(Array.isArray(data.viviendas) ? data.viviendas : []);
      } catch (e) {
        console.error("Error cargando viviendas:", e);
        setError(e.message);
        setViviendas([]);
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-sm"
        >
          ← Volver
        </button>

        <h1 className="text-lg font-semibold">Viviendas</h1>
        <span className="text-xs text-slate-400">Administración ZN98</span>
      </header>

      <main className="flex-1 px-4 py-4">
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/15 border border-red-500/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {cargando ? (
          <p className="text-slate-300 text-sm">Cargando viviendas…</p>
        ) : viviendas.length === 0 ? (
          <p className="text-slate-300 text-sm">
            No hay viviendas registradas en el CSV.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/90">
                <tr className="text-left">
                  <th className="px-3 py-2 border-b border-slate-800">Código</th>
                  <th className="px-3 py-2 border-b border-slate-800">Barrio</th>
                  <th className="px-3 py-2 border-b border-slate-800">Unidad</th>
                  <th className="px-3 py-2 border-b border-slate-800">Dorm.</th>
                  <th className="px-3 py-2 border-b border-slate-800">Titular</th>
                  <th className="px-3 py-2 border-b border-slate-800">Estado</th>
                </tr>
              </thead>

              <tbody>
                {viviendas.map((v, index) => (
                  <tr
                    key={index}
                    className="odd:bg-slate-900/40 even:bg-slate-900/10"
                  >
                    <td className="px-3 py-2 border-b border-slate-800">{v.codigo}</td>
                    <td className="px-3 py-2 border-b border-slate-800">{v.barrio}</td>
                    <td className="px-3 py-2 border-b border-slate-800">{v.unidad}</td>
                    <td className="px-3 py-2 border-b border-slate-800">{v.dormitorios ?? "-"}</td>
                    <td className="px-3 py-2 border-b border-slate-800">{v.titular || "—"}</td>
                    <td className="px-3 py-2 border-b border-slate-800">{v.estadoOperativo}</td>
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
