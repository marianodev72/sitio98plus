// src/pages/PermisionarioGestionesMisAnexo3.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:3000";

const PermisionarioGestionesMisAnexo3 = () => {
  const navigate = useNavigate();
  const [gestiones, setGestiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const token = localStorage.getItem("zn98_token");
        const resp = await fetch(`${API_BASE_URL}/api/anexo3/mis`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await resp.json();

        if (!resp.ok || data.ok === false) {
          throw new Error(data.message || "No se pudieron obtener las actas.");
        }

        setGestiones(data.gestiones || data.anexo3 || []);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  const formatearFecha = (f) => new Date(f).toLocaleString("es-AR");

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">

        <button
          className="text-sm text-sky-400 hover:text-sky-300 mb-4"
          onClick={() => navigate("/permisionario/mis-gestiones")}
        >
          ← Volver a Mis gestiones
        </button>

        <h1 className="text-2xl font-bold mb-2">Mis actas – Anexo 3</h1>
        <p className="text-slate-300 mb-6">Listado de actas generadas por el Inspector.</p>

        {loading && <div className="text-slate-400">Cargando...</div>}

        {errorMsg && (
          <div className="text-red-400 bg-red-900/40 border border-red-700 px-3 py-2 rounded-md mb-4">
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && gestiones.length === 0 && (
          <div className="bg-[#0b1020] border border-slate-700/60 p-4 rounded-xl">
            Aún no tenés actas registradas.
          </div>
        )}

        {gestiones.length > 0 && (
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-4 mt-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-400 border-b border-slate-700/60">
                  <th className="py-2 text-left">N°</th>
                  <th className="py-2 text-left">Estado</th>
                  <th className="py-2 text-left">Vivienda</th>
                  <th className="py-2 text-left">Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gestiones.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-slate-800 hover:bg-slate-900 cursor-pointer"
                    onClick={() => navigate(`/permisionario/gestiones/anexo3/${g.id}`)}
                  >
                    <td className="py-2">{g.numero}</td>
                    <td className="py-2">{g.estado}</td>
                    <td className="py-2">{g.vivienda?.unidadHabitacional}</td>
                    <td className="py-2">{formatearFecha(g.creadoEn)}</td>
                    <td className="py-2">
                      <button
                        className="px-3 py-1 text-xs bg-sky-600 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/permisionario/gestiones/anexo3/${g.id}`);
                        }}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default PermisionarioGestionesMisAnexo3;
