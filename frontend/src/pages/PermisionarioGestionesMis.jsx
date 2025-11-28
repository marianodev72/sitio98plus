// src/pages/PermisionarioGestionesMis.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:3000";

const PermisionarioGestionesMis = () => {
  const navigate = useNavigate();

  const [gestiones, setGestiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchGestiones = async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const token = localStorage.getItem("zn98_token");

        const resp = await fetch(`${API_BASE_URL}/api/anexo11/mis`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok || data.ok === false) {
          throw new Error(
            data.message || "No se pudieron obtener tus gestiones."
          );
        }

        const lista =
          data.gestiones ||
          data.anexo11 ||
          data.items ||
          data.data ||
          [];

        setGestiones(Array.isArray(lista) ? lista : []);
      } catch (err) {
        console.error("Error al cargar gestiones:", err);
        setErrorMsg(err.message || "Error al cargar tus gestiones.");
      } finally {
        setLoading(false);
      }
    };

    fetchGestiones();
  }, []);

  const formatearFecha = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const irADetalle = (id) => {
    if (!id) return;
    navigate(`/permisionario/gestiones/anexo11/${id}`);
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <button
          className="text-sm text-sky-400 hover:text-sky-300 mb-4"
          onClick={() => navigate("/permisionario/mis-gestiones")}
        >
          ← Volver a Mis gestiones
        </button>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Mis gestiones – Pedido de trabajo (Anexo 11)
        </h1>
        <p className="text-slate-300 mb-6 max-w-3xl text-sm md:text-base">
          Acá ves todos los pedidos de trabajo que iniciaste. Podés consultar el
          detalle de cada gestión, pero no modificarla una vez enviada.
        </p>

        {loading && (
          <div className="text-slate-300 text-sm bg-[#0b1020] border border-slate-700/60 rounded-xl px-4 py-3">
            Cargando tus gestiones...
          </div>
        )}

        {!loading && errorMsg && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-700/60 rounded-md px-3 py-2 mb-4">
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && gestiones.length === 0 && (
          <div className="text-sm text-slate-300 bg-[#0b1020] border border-slate-700/60 rounded-xl px-4 py-4">
            Todavía no tenés gestiones registradas de Anexo 11. Podés iniciar
            un pedido de trabajo desde la pantalla anterior.
          </div>
        )}

        {!loading && !errorMsg && gestiones.length > 0 && (
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-4 md:p-6 mt-2">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-slate-400 border-b border-slate-700/80">
                    <th className="text-left py-2 pr-4">N°</th>
                    <th className="text-left py-2 pr-4">Tipo</th>
                    <th className="text-left py-2 pr-4">Estado</th>
                    <th className="text-left py-2 pr-4">Fecha</th>
                    <th className="text-left py-2 pr-4">Detalle</th>
                    <th className="text-left py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {gestiones.map((g) => {
                    const id = g.id || g._id || "";
                    const numero = g.numero || "-";
                    const tipo =
                      g.tipoSolicitud ||
                      g.tipo ||
                      g.solicita ||
                      "—";
                    const estado =
                      g.estado ||
                      g.estadoActual ||
                      "ENVIADO";
                    const fecha =
                      g.creadoEn ||
                      g.createdAt ||
                      g.fechaCreacion ||
                      null;
                    const detalle =
                      g.detallePedido ||
                      g.detalle ||
                      g.descripcion ||
                      "";

                    return (
                      <tr
                        key={id || Math.random()}
                        className="border-b border-slate-800/60 last:border-0 hover:bg-slate-900/50 transition cursor-pointer"
                        onClick={() => irADetalle(id)}
                      >
                        <td className="py-2 pr-4 text-slate-100">
                          {numero}
                        </td>
                        <td className="py-2 pr-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-sky-500/10 border border-sky-500/40 text-sky-300">
                            {tipo}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${
                              estado === "ENVIADO"
                                ? "bg-amber-500/10 border-amber-500/60 text-amber-300"
                                : estado === "EN_ANALISIS"
                                ? "bg-sky-500/10 border-sky-500/60 text-sky-300"
                                : estado === "APROBADO"
                                ? "bg-emerald-500/10 border-emerald-500/60 text-emerald-300"
                                : estado === "RECHAZADO"
                                ? "bg-red-500/10 border-red-500/60 text-red-300"
                                : "bg-slate-500/10 border-slate-500/60 text-slate-200"
                            }`}
                          >
                            {estado}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-slate-200 whitespace-nowrap">
                          {formatearFecha(fecha)}
                        </td>
                        <td className="py-2 pr-4 text-slate-300 max-w-xs truncate">
                          {detalle}
                        </td>
                        <td
                          className="py-2 pr-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="text-xs px-3 py-1 rounded-full bg-sky-600 hover:bg-sky-500 text-white"
                            onClick={() => irADetalle(id)}
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermisionarioGestionesMis;
