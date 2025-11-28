// src/pages/PermisionarioAnexo4Mis.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:3000";

const PermisionarioAnexo4Mis = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("zn98_token");

  const [gestiones, setGestiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/anexo4/mis`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();

        if (!resp.ok || data.ok === false) {
          throw new Error(data.message || "No se pudo obtener el listado.");
        }

        setGestiones(data.gestiones || []);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [token]);

  const f = (x) => new Date(x).toLocaleString("es-AR");

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate("/permisionario/mis-gestiones")}
          className="text-sm text-sky-400 hover:text-sky-300 mb-4"
        >
          ← Volver
        </button>

        <h1 className="text-2xl font-bold mb-2">Mis Anexo 4</h1>
        <p className="text-slate-400 mb-6">
          Listado de formularios enviados al Jefe de Barrio.
        </p>

        {loading && <div className="text-slate-300">Cargando...</div>}

        {errorMsg && (
          <div className="text-red-400 bg-red-900/40 border border-red-700 px-3 py-2 rounded-md mb-4">
            {errorMsg}
          </div>
        )}

        {!loading && gestiones.length === 0 && (
          <div className="bg-[#0b1020] border border-slate-700 p-4 rounded-xl">
            No tenés Anexo 4 cargados.
          </div>
        )}

        {gestiones.length > 0 && (
          <div className="bg-[#0b1020] border border-slate-700 rounded-2xl p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
                  <th className="py-2 text-left">N°</th>
                  <th className="py-2 text-left">Barrio</th>
                  <th className="py-2 text-left">Estado</th>
                  <th className="py-2 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {gestiones.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() =>
                      navigate(`/permisionario/gestiones/anexo4/${g.id}`)
                    }
                    className="border-b border-slate-800 hover:bg-slate-900 cursor-pointer"
                  >
                    <td className="py-2">{g.numero}</td>
                    <td className="py-2">{g.unidadHabitacional}</td>
                    <td className="py-2">{g.estado}</td>
                    <td className="py-2">{f(g.creadoEn)}</td>
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

export default PermisionarioAnexo4Mis;
