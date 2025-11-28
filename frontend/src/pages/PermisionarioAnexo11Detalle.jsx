// src/pages/PermisionarioAnexo11Detalle.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:3000";

const PermisionarioAnexo11Detalle = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchDetalle = async () => {
      try {
        const token = localStorage.getItem("zn98_token");
        if (!token) {
          setErrorMsg("No se encontró un token de sesión. Iniciá sesión nuevamente.");
          setLoading(false);
          return;
        }

        const resp = await fetch(`${API_BASE_URL}/api/anexo11/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!resp.ok) {
          let mensajeError = "No se pudo obtener el detalle del Anexo 11.";
          try {
            const json = await resp.json();
            if (json && json.message) {
              mensajeError = json.message;
            }
          } catch {
            // ignorar error de parseo
          }
          throw new Error(mensajeError);
        }

        const json = await resp.json();
        if (json && json.ok && json.anexo11) {
          setData(json.anexo11);
        } else {
          throw new Error("Respuesta inesperada del servidor.");
        }
      } catch (err) {
        console.error("Error al cargar detalle de Anexo 11:", err);
        setErrorMsg(err.message || "Error al cargar el detalle.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDetalle();
    } else {
      setLoading(false);
      setErrorMsg("Falta el ID de la gestión.");
    }
  }, [id]);

  const formatFecha = (iso) => {
    if (!iso) return "-";
    try {
      const fecha = new Date(iso);
      return fecha.toLocaleString("es-AR", {
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

  const onDescargar = async () => {
    try {
      const token = localStorage.getItem("zn98_token");
      if (!token) {
        alert("No se encontró un token de sesión. Iniciá sesión nuevamente.");
        return;
      }

      const resp = await fetch(`${API_BASE_URL}/api/anexo11/${id}/pdf`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        let mensajeError = "No se pudo descargar el Anexo 11.";
        try {
          const json = await resp.json();
          if (json && json.message) {
            mensajeError = json.message;
          }
        } catch {
          // ignoramos error de parseo JSON
        }
        throw new Error(mensajeError);
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `anexo11_${data?.numero || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar Anexo 11:", err);
      alert(err.message || "Error al descargar el Anexo 11.");
    }
  };

  // ───────────────────── estados básicos ─────────────────────

  if (!id) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="bg-slate-900 border border-slate-700 shadow-xl rounded-2xl p-6">
          <p className="text-red-400 font-medium">
            No se encontró el identificador de la gestión.
          </p>
          <button
            onClick={() => navigate("/permisionario/gestiones/mis")}
            className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-sky-500 text-sm font-medium hover:bg-sky-400 transition"
          >
            ← Volver a mis gestiones
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="bg-slate-900 border border-slate-800 shadow-xl rounded-2xl px-6 py-4">
          <p className="text-slate-300">Cargando detalle de la gestión...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="bg-slate-900 border border-red-500/40 shadow-xl rounded-2xl p-6 max-w-lg">
          <p className="text-red-400 font-semibold mb-2">Ocurrió un error</p>
          <p className="text-slate-200 text-sm">{errorMsg}</p>
          <button
            onClick={() => navigate("/permisionario/gestiones/mis")}
            className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-sky-500 text-sm font-medium hover:bg-sky-400 transition"
          >
            ← Volver a mis gestiones
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────── vista principal ─────────────────────

  const estado = data?.estado || "ENVIADO";
  const estadoColor =
    estado === "APROBADO"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
      : estado === "RECHAZADO"
      ? "bg-red-500/10 text-red-300 border-red-500/40"
      : estado === "EN_ANALISIS"
      ? "bg-amber-500/10 text-amber-300 border-amber-500/40"
      : "bg-slate-500/10 text-slate-200 border-slate-500/40";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        {/* Volver */}
        <button
          onClick={() => navigate("/permisionario/gestiones/mis")}
          className="inline-flex items-center text-sm text-sky-400 hover:text-sky-300 mb-6"
        >
          ← Volver a mis gestiones
        </button>

        {/* Card principal */}
        <div className="bg-slate-900/80 border border-slate-800 shadow-2xl rounded-3xl p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-50">
                Detalle de Anexo 11
              </h1>
              <p className="text-sm text-slate-400">
                Pedido de trabajo generado por el permisionario
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${estadoColor}`}
              >
                Estado: {estado}
              </span>
              {data?.numero && (
                <span className="text-xs text-slate-400">
                  N° de gestión: {data.numero}
                </span>
              )}
            </div>
          </div>

          {/* Grilla de datos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-2 tracking-wide uppercase">
                Datos del permisionario
              </h2>
              <div className="space-y-1 text-sm text-slate-200">
                <p>
                  <span className="font-medium text-slate-300">Nombre: </span>
                  {data?.permisionario?.nombreCompleto || "—"}
                </p>
                <p>
                  <span className="font-medium text-slate-300">Grado: </span>
                  {data?.permisionario?.grado || "—"}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-2 tracking-wide uppercase">
                Datos de la vivienda
              </h2>
              <div className="space-y-1 text-sm text-slate-200">
                <p>
                  <span className="font-medium text-slate-300">Unidad: </span>
                  {data?.vivienda?.unidad || "—"}
                </p>
                <p>
                  <span className="font-medium text-slate-300">
                    Departamento:{" "}
                  </span>
                  {data?.vivienda?.dpto || "—"}
                </p>
                <p>
                  <span className="font-medium text-slate-300">MB: </span>
                  {data?.vivienda?.mb || "—"}
                </p>
                <p>
                  <span className="font-medium text-slate-300">MZ: </span>
                  {data?.vivienda?.mz || "—"}
                </p>
                <p>
                  <span className="font-medium text-slate-300">Casa: </span>
                  {data?.vivienda?.casa || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Detalle del pedido */}
          <div className="mt-8 border-t border-slate-800 pt-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-2 tracking-wide uppercase">
              Detalle del pedido
            </h2>
            <p className="text-sm text-slate-100 whitespace-pre-line leading-relaxed">
              {data?.detallePedido || "—"}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 border-t border-slate-800 pt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-xs text-slate-400 max-w-xl">
              <p>
                <span className="font-medium text-slate-300">
                  Fecha de creación:{" "}
                </span>
                {formatFecha(data?.createdAt)}
              </p>
              <p className="mt-2">
                Esta gestión es de solo lectura. Una vez enviada, el
                permisionario no puede modificar su contenido ni su estado.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onDescargar}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/30 transition"
              >
                Descargar Anexo 11
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermisionarioAnexo11Detalle;
