// src/pages/PermisionarioGestionesMisAnexo3.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:3000";

const PermisionarioGestionesMisAnexo3 = () => {
  const navigate = useNavigate();

  const [gestiones, setGestiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const cargarGestiones = async () => {
      try {
        const token = localStorage.getItem("zn98_token");

        if (!token) {
          setErr(
            "No se encontró un token de sesión. Iniciá sesión nuevamente como permisionario."
          );
          setLoading(false);
          return;
        }

        const resp = await fetch(`${API_BASE_URL}/api/anexo3/mis`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok || data.ok === false) {
          const msgBackend =
            data.message ||
            data.msg ||
            (resp.status === 401
              ? "No autenticado."
              : "No tenés permisos para ver estas actas.");
          throw new Error(msgBackend);
        }

        const lista = data.gestiones || data.anexo3 || [];
        setGestiones(lista);
      } catch (error) {
        console.error("Error al obtener Anexos 3 del permisionario:", error);
        setErr(error.message || "Error al obtener tus actas (Anexo 3).");
      } finally {
        setLoading(false);
      }
    };

    cargarGestiones();
  }, []);

  const irADetalle = (id) => {
    navigate(`/permisionario/gestiones/anexo3/${id}`);
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <button
          className="text-sm text-sky-400 hover:text-sky-300 mb-4"
          onClick={() => navigate("/permisionario")}
        >
          ← Volver a Mis gestiones
        </button>

        <h1 className="text-2xl md:text-3xl font-semibold mb-2">
          Mis actas – Anexo 3
        </h1>
        <p className="text-slate-400 mb-6 text-sm">
          Listado de actas de recepción de vivienda fiscal generadas por el
          Inspector y asignadas a vos como permisionario.
        </p>

        {loading && (
          <div className="text-slate-300">Cargando tus actas...</div>
        )}

        {!loading && err && (
          <div className="bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 rounded-md text-sm mb-4">
            {err}
          </div>
        )}

        {!loading && !err && gestiones.length === 0 && (
          <div className="bg-slate-900/60 border border-slate-700 text-slate-200 px-4 py-3 rounded-md text-sm">
            No tenés actas de Anexo 3 asignadas por el momento.
          </div>
        )}

        {!loading && !err && gestiones.length > 0 && (
          <div className="mt-4 bg-[#0b1020] border border-slate-700/60 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/70 text-slate-300 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">N° de acta</th>
                  <th className="text-left px-4 py-3">Vivienda</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {gestiones.map((g) => (
                  <tr
                    key={g.id}
                    className="border-t border-slate-800/80 hover:bg-slate-900/60 cursor-pointer"
                    onClick={() => irADetalle(g.id)}
                  >
                    <td className="px-4 py-3 text-slate-100">
                      {g.numero || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {g.vivienda?.unidadHabitacional || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-sky-700/40 text-sky-200">
                        {g.estado || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {g.creadoEn
                        ? new Date(g.creadoEn).toLocaleString("es-AR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          irADetalle(g.id);
                        }}
                        className="text-xs px-3 py-1 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-semibold"
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
