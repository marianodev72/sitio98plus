// src/pages/JefeBarrioAnexo4Detalle.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:3000";

const JefeBarrioAnexo4Detalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("zn98_token");
  const user = JSON.parse(localStorage.getItem("zn98_user") || "null");

  const [anexo, setAnexo] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/anexo4/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || data.ok === false) {
        throw new Error(data.message || "No se pudo cargar el detalle.");
      }
      setAnexo(data.anexo4);
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const marcarRecibido = async () => {
    if (!window.confirm("¿Confirmás que recibiste este Anexo 4?")) return;

    const obs = window.prompt("Observaciones (opcional):") || "";

    try {
      const resp = await fetch(`${API_BASE_URL}/api/anexo4/${id}/recibir`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ observaciones: obs }),
      });

      const data = await resp.json();
      if (!resp.ok || data.ok === false) {
        throw new Error(data.message || "No se pudo registrar la recepción.");
      }

      alert("Recepción registrada correctamente.");
      await cargar();
    } catch (error) {
      alert(error.message);
    }
  };

  const formatearFecha = (f) =>
    f ? new Date(f).toLocaleDateString("es-AR") : "—";

  if (user && user.role !== "JEFE_BARRIO") {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <p className="text-slate-300">
          No tenés permisos para acceder a este panel.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate("/jefe-barrio/gestiones/anexo4")}
          className="text-sm text-sky-400 hover:text-sky-300 mb-4"
        >
          ← Volver al listado
        </button>

        {loading && <div className="text-slate-300">Cargando…</div>}
        {err && !loading && (
          <div className="text-red-400 bg-red-900/40 border border-red-700 px-3 py-2 rounded-md">
            {err}
          </div>
        )}

        {anexo && !loading && (
          <div className="bg-[#0b1020] border border-slate-700 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold">Anexo 4 - Detalle</h1>
                <p className="text-slate-400 text-sm">
                  Permisionario: {anexo.permisionario?.nombreCompleto || "—"}
                </p>
                <p className="text-slate-400 text-sm">
                  Barrio: {anexo.datos?.unidadHabitacional || "—"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="px-3 py-1 text-xs rounded-full bg-sky-600">
                  Estado: {anexo.estado}
                </span>
                {anexo.numero && (
                  <span className="text-xs text-slate-400">
                    N°: {anexo.numero}
                  </span>
                )}
                <button
                  onClick={descargarPDF}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-full text-xs font-semibold"
                >
                  Descargar PDF
                </button>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4 grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h2 className="font-semibold text-slate-300 mb-1">Barrio</h2>
                <p>{anexo.datos?.unidadHabitacional || "—"}</p>
              </div>
              <div>
                <h2 className="font-semibold text-slate-300 mb-1">Vivienda</h2>
                <p>{anexo.datos?.dpto || "—"}</p>
              </div>
              <div>
                <h2 className="font-semibold text-slate-300 mb-1">
                  Datos del representante
                </h2>
                <p>{anexo.datos?.nombreConyuge || "—"}</p>
              </div>
              <div>
                <h2 className="font-semibold text-slate-300 mb-1">
                  Destinos familiares
                </h2>
                <p>{anexo.datos?.destinosFamiliares || "—"}</p>
              </div>
              <div>
                <h2 className="font-semibold text-slate-300 mb-1">
                  Observaciones
                </h2>
                <p>{anexo.datos?.observaciones || "—"}</p>
              </div>
              <div>
                <h2 className="font-semibold text-slate-300 mb-1">Salida</h2>
                <p>{formatearFecha(anexo.datos?.fechaSalida)}</p>
              </div>
              <div>
                <h2 className="font-semibold text-slate-300 mb-1">Regreso</h2>
                <p>{formatearFecha(anexo.datos?.fechaRegreso)}</p>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-xs text-slate-400 max-w-md">
                <p>
                  Una vez que registres la recepción, el permisionario podrá ver
                  que el formulario fue recibido por el Jefe de Barrio.
                </p>
              </div>

              {anexo.estado === "ENVIADO_PERMISIONARIO" && (
                <button
                  onClick={marcarRecibido}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-sm font-semibold"
                >
                  Marcar como recibido
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JefeBarrioAnexo4Detalle;
