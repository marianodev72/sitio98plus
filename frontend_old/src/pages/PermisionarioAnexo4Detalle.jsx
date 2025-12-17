// src/pages/PermisionarioAnexo4Detalle.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:3000";

const PermisionarioAnexo4Detalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("zn98_token");

  const [anexo, setAnexo] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/anexo4/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();

        if (!resp.ok) throw new Error(data.message);

        setAnexo(data.anexo4);
      } catch (error) {
        setErr(error.message);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const descargarPDF = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/anexo4/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) throw new Error("Error al descargar PDF.");

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `anexo4_${anexo.numero}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">

        <button
          onClick={() => navigate("/permisionario/gestiones/anexo4/mis")}
          className="text-sm text-sky-400 hover:text-sky-300 mb-4"
        >
          ← Volver
        </button>

        {loading && <div className="text-slate-300">Cargando…</div>}
        {err && <div className="text-red-400">{err}</div>}

        {anexo && (
          <div className="bg-[#0b1020] border border-slate-700 rounded-2xl p-6 space-y-4">

            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold">Anexo 4</h1>
                <p className="text-slate-400 text-sm">
                  Estado: {anexo.estado}
                </p>
              </div>

              <button
                onClick={descargarPDF}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 rounded-full text-sm font-semibold"
              >
                Descargar PDF
              </button>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h2 className="font-semibold mb-1 text-slate-300">Unidad habitacional</h2>
              <p>{anexo.datos.unidadHabitacional}</p>
            </div>

            <div>
              <h2 className="font-semibold mb-1 text-slate-300">Departamento</h2>
              <p>{anexo.datos.dpto || "—"}</p>
            </div>

            <div>
              <h2 className="font-semibold mb-1 text-slate-300">Cónyuge</h2>
              <p>{anexo.datos.nombreConyuge || "—"}</p>
            </div>

            <div>
              <h2 className="font-semibold mb-1 text-slate-300">Destinos familiares</h2>
              <p>{anexo.datos.destinosFamiliares || "—"}</p>
            </div>

            <div>
              <h2 className="font-semibold mb-1 text-slate-300">Observaciones</h2>
              <p>{anexo.datos.observaciones || "—"}</p>
            </div>

            {anexo.jefeBarrio?.usuario && (
              <div className="border-t border-slate-700 pt-4">
                <h2 className="font-semibold text-slate-300 mb-1">Recepción</h2>
                <p className="text-sm">
                  Recibido por: {anexo.jefeBarrio.nombreCompleto}
                </p>
                <p className="text-slate-400 text-xs">
                  {new Date(anexo.jefeBarrio.fechaRecepcion).toLocaleString("es-AR")}
                </p>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default PermisionarioAnexo4Detalle;
