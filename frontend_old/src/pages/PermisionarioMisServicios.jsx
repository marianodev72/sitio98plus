// src/pages/PermisionarioMisServicios.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";

const API_BASE_URL = "http://127.0.0.1:3000";

export default function PermisionarioMisServicios() {
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [servicios, setServicios] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        setError("");

        const token = localStorage.getItem("zn98_token");
        if (!token) {
          setError("Sesión expirada. Volvé a iniciar sesión.");
          setCargando(false);
          navigate("/login");
          return;
        }

        const resp = await fetch(
          `${API_BASE_URL}/api/permisionario/mis-servicios`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await resp.json();

        if (!resp.ok || !data.ok) {
          setError(data.msg || "No se pudieron obtener los servicios.");
          setCargando(false);
          return;
        }

        setServicios(data.servicios || {});
        setCargando(false);
      } catch (err) {
        console.error("[MIS SERVICIOS] Error:", err);
        setError("Error al conectar con el servidor.");
        setCargando(false);
      }
    };

    cargar();
  }, [navigate]);

  const copiar = (valor) => {
    if (!valor) return;
    navigator.clipboard.writeText(valor).catch(() => {});
  };

  // ---- estados intermedios ----
  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <InstitutionalHeader />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate("/permisionario")}
            className="mb-4 text-sky-400 text-sm underline"
          >
            ← Volver al panel
          </button>
          <p className="text-slate-300 text-sm">
            Cargando datos de servicios…
          </p>
        </main>
      </div>
    );
  }

  if (!servicios) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <InstitutionalHeader />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate("/permisionario")}
            className="mb-4 text-sky-400 text-sm underline"
          >
            ← Volver al panel
          </button>
          <p className="text-slate-300 text-sm">
            No se encontraron datos de servicios para tu vivienda.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <InstitutionalHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/permisionario")}
          className="mb-4 text-sky-400 text-sm underline"
        >
          ← Volver al panel
        </button>

        <h1 className="text-2xl font-semibold mb-2">Mis servicios</h1>
        <p className="text-slate-300 text-sm mb-6">
          Aquí podés consultar los números de servicio asociados a tu vivienda
          fiscal. Estos datos se actualizan desde la administración a partir de
          los registros de viviendas.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 border border-red-500/60 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-6 grid gap-4">
          {servicios.casaNumero && (
            <div>
              <p className="text-xs text-slate-400 mb-1">
                Número de casa / unidad
              </p>
              <div className="flex items-center gap-2">
                <span className="flex-1 bg-slate-800 rounded px-3 py-2 text-sm text-slate-100">
                  {servicios.casaNumero}
                </span>
                <button
                  type="button"
                  onClick={() => copiar(servicios.casaNumero)}
                  className="text-xs px-3 py-1 rounded-full bg-slate-700 hover:bg-slate-600"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-slate-400 mb-1">Servicio de luz</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 bg-slate-800 rounded px-3 py-2 text-sm text-slate-100">
                {servicios.servicioLuz || "No informado"}
              </span>
              {servicios.servicioLuz && (
                <button
                  type="button"
                  onClick={() => copiar(servicios.servicioLuz)}
                  className="text-xs px-3 py-1 rounded-full bg-slate-700 hover:bg-slate-600"
                >
                  Copiar
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">Servicio de agua</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 bg-slate-800 rounded px-3 py-2 text-sm text-slate-100">
                {servicios.servicioAgua || "No informado"}
              </span>
              {servicios.servicioAgua && (
                <button
                  type="button"
                  onClick={() => copiar(servicios.servicioAgua)}
                  className="text-xs px-3 py-1 rounded-full bg-slate-700 hover:bg-slate-600"
                >
                  Copiar
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">Servicio de gas</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 bg-slate-800 rounded px-3 py-2 text-sm text-slate-100">
                {servicios.servicioGas || "No informado"}
              </span>
              {servicios.servicioGas && (
                <button
                  type="button"
                  onClick={() => copiar(servicios.servicioGas)}
                  className="text-xs px-3 py-1 rounded-full bg-slate-700 hover:bg-slate-600"
                >
                  Copiar
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
