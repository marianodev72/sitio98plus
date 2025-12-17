// src/pages/PermisionarioAnexo3Detalle.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:3000";

const PermisionarioAnexo3Detalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [anexo, setAnexo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const token = localStorage.getItem("zn98_token");

  useEffect(() => {
    const cargar = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/anexo3/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await resp.json();

        if (!resp.ok || data.ok === false) {
          throw new Error(data.message || "No se pudo obtener el Anexo 3.");
        }

        setAnexo(data.anexo3);
      } catch (error) {
        console.error("Error al cargar Anexo 3:", error);
        setErr(error.message || "Error al cargar el Anexo 3.");
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [id, token]);

  const accConforme = async () => {
    try {
      const obs = prompt("Observaciones (opcional):") || "";
      const resp = await fetch(`${API_BASE_URL}/api/anexo3/${id}/conforme`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ observaciones: obs }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data.ok === false) {
        throw new Error(data.message || "No se pudo registrar el conforme.");
      }

      alert("Conforme registrado.");
      navigate("/permisionario/gestiones/anexo3/mis");
    } catch (error) {
      console.error("Error en conforme:", error);
      alert(error.message || "Error al registrar el conforme.");
    }
  };

  const accRevision = async () => {
    try {
      const obs = prompt("Motivo de revisión:") || "";
      const resp = await fetch(`${API_BASE_URL}/api/anexo3/${id}/revision`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ observaciones: obs }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data.ok === false) {
        throw new Error(
          data.message || "No se pudo registrar la solicitud de revisión."
        );
      }

      alert("Solicitud de revisión enviada al Inspector.");
      navigate("/permisionario/gestiones/anexo3/mis");
    } catch (error) {
      console.error("Error en revisión:", error);
      alert(error.message || "Error al solicitar la revisión.");
    }
  };

  const accDescargarPDF = async () => {
    try {
      if (!token) {
        alert("No se encontró un token de sesión. Iniciá sesión nuevamente.");
        return;
      }

      const resp = await fetch(`${API_BASE_URL}/api/anexo3/${id}/pdf`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        let mensajeError = "No se pudo descargar el Anexo 3.";
        try {
          const data = await resp.json();
          if (data && data.message) mensajeError = data.message;
        } catch {
          // ignoramos error de parseo
        }
        throw new Error(mensajeError);
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `anexo3_${anexo?.numero || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar PDF de Anexo 3:", error);
      alert(error.message || "Error al descargar el PDF.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <button
          className="text-sm text-sky-400 hover:text-sky-300 mb-4"
          onClick={() => navigate("/permisionario/gestiones/anexo3/mis")}
        >
          ← Volver a mis actas
        </button>

        {loading && <div className="text-slate-300">Cargando...</div>}
        {err && !loading && (
          <div className="text-red-400 bg-red-900/40 border border-red-700 px-3 py-2 rounded-md">
            {err}
          </div>
        )}

        {anexo && !loading && (
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl font-bold">
                  Acta de recepción de vivienda fiscal (Anexo 3)
                </h1>
                <p className="text-slate-400 text-sm">
                  Generada por el Inspector. Como permisionario podés dar
                  conformidad o solicitar revisión.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="px-3 py-1 text-xs rounded-full bg-sky-600">
                  Estado: {anexo.estado}
                </span>
                {anexo.numero && (
                  <span className="text-xs text-slate-400">
                    N° de acta: {anexo.numero}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h2 className="font-semibold text-slate-200 mb-1 text-sm uppercase tracking-wide">
                  Vivienda
                </h2>
                <p className="text-sm text-slate-100">
                  {anexo.vivienda?.unidadHabitacional || "—"}
                </p>
                {anexo.vivienda?.direccion && (
                  <p className="text-xs text-slate-400 mt-1">
                    {anexo.vivienda.direccion}
                  </p>
                )}
              </div>

              <div>
                <h2 className="font-semibold text-slate-200 mb-1 text-sm uppercase tracking-wide">
                  Intervinientes
                </h2>
                <p className="text-sm text-slate-100">
                  <span className="font-medium text-slate-300">
                    Inspector:{" "}
                  </span>
                  {anexo.inspector?.nombreCompleto || "—"}
                </p>
                <p className="text-sm text-slate-100">
                  <span className="font-medium text-slate-300">
                    Permisionario:{" "}
                  </span>
                  {anexo.permisionario?.nombreCompleto || "—"}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-700 pt-4">
              <h2 className="font-semibold text-slate-200 mb-2 text-sm uppercase tracking-wide">
                Novedades / Observaciones
              </h2>
              <p className="text-sm text-slate-100 whitespace-pre-line">
                {anexo.novedades || "—"}
              </p>
            </div>

            <div className="mt-6 border-t border-slate-700 pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-xs text-slate-400 max-w-md">
                <p>
                  Esta acta forma parte del circuito de entrega de vivienda
                  fiscal. Una vez cerrada por el Administrador General, queda
                  registrada como documentación oficial.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={accDescargarPDF}
                  className="px-5 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold"
                >
                  Descargar Anexo 3
                </button>

                {anexo.estado === "PENDIENTE_CONFORME_PERMISIONARIO" && (
                  <>
                    <button
                      onClick={accConforme}
                      className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
                    >
                      Dar conforme
                    </button>
                    <button
                      onClick={accRevision}
                      className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-sm font-semibold"
                    >
                      Pedir revisión
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermisionarioAnexo3Detalle;
