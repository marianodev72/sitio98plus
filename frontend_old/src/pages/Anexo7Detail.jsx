// src/pages/Anexo7Detail.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

// 🔹 Misma base de API que en Anexo7List
const API_BASE_URL = "http://localhost:3000/api";

const estadoLabels = {
  BORRADOR: "Borrador",
  ENVIADO_A_INSPECTOR: "Enviado a Inspector",
  DEVUELTO_POR_INSPECTOR: "Devuelto por Inspector",
  APROBADO_POR_INSPECTOR: "Aprobado por Inspector",
  ENVIADO_A_ADMIN: "Enviado a Administración",
  APROBADO_POR_ADMIN: "Cerrado",
};

export default function Anexo7Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [anexo, setAnexo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const fetchAnexo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/anexo7/${id}`, {
          credentials: "include",
        });
        const data = await res.json();
        setAnexo(data);
      } catch (err) {
        console.error("Error cargando detalle Anexo 7:", err);
      } finally {
        setCargando(false);
      }
    };

    fetchAnexo();
  }, [id]);

  const puedeEditar =
    anexo &&
    (anexo.estado === "BORRADOR" ||
      anexo.estado === "DEVUELTO_POR_INSPECTOR");

  const handleEnviarInspector = async () => {
    if (!anexo || !puedeEditar) return;

    const ok = window.confirm(
      "¿Seguro que querés enviar este Anexo 7 al Inspector? Luego no podrás editarlo hasta que te lo devuelvan."
    );
    if (!ok) return;

    try {
      setEnviando(true);
      const res = await fetch(
        `${API_BASE_URL}/anexo7/${anexo._id}/enviar-a-inspector`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Error al enviar al inspector");
      const data = await res.json();
      setAnexo(data);
    } catch (err) {
      console.error(err);
      alert("Hubo un problema al enviar el Anexo 7 al inspector.");
    } finally {
      setEnviando(false);
    }
  };

  const handleDescargarPdf = () => {
    window.open(`${API_BASE_URL}/anexo7/${id}/pdf`, "_blank");
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#050816] text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Cargando...</p>
      </div>
    );
  }

  if (!anexo || anexo.message === "Anexo 7 no encontrado") {
    return (
      <div className="min-h-screen bg-[#050816] text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">No se encontró el Anexo 7.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <button
          className="text-sm text-sky-400 hover:text-sky-300 mb-4"
          onClick={() => navigate("/permisionario/gestiones/anexo7/mis")}
        >
          ← Volver a mis Anexo 7
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              Anexo 7 · {anexo.numero || "Sin número"}
            </h1>
            <p className="text-slate-300 text-sm">
              Ampliación de novedades de toma de viviendas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-100">
              {estadoLabels[anexo.estado] || anexo.estado || "—"}
            </span>

            {puedeEditar && (
              <Link
                to={`/permisionario/gestiones/anexo7/editar/${anexo._id}`}
                className="px-3 py-1.5 rounded-full border border-slate-600 text-xs text-slate-100 hover:bg-slate-800 transition"
              >
                Editar
              </Link>
            )}

            <button
              type="button"
              onClick={handleEnviarInspector}
              disabled={!puedeEditar || enviando}
              className="px-3 py-1.5 rounded-full bg-sky-600 hover:bg-sky-500 text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {enviando ? "Enviando..." : "Enviar a Inspector"}
            </button>

            <button
              type="button"
              onClick={handleDescargarPdf}
              className="px-3 py-1.5 rounded-full border border-sky-600 text-xs text-sky-300 hover:bg-sky-600/10 transition"
            >
              Descargar PDF
            </button>
          </div>
        </div>

        <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-4 md:p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Permisionario</p>
              <p className="text-slate-100">{anexo.nombrePermisionario}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Barrio</p>
              <p className="text-slate-100">{anexo.barrio}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Vivienda</p>
              <p className="text-slate-100">{anexo.vivienda}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Inspector</p>
              <p className="text-slate-100">{anexo.inspector}</p>
            </div>
          </div>

          <div>
            <p className="text-slate-400 text-xs mb-1">Novedades adicionales</p>
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-3 text-sm text-slate-100 whitespace-pre-line">
              {anexo.novedadesAdicionales}
            </div>
          </div>

          <div>
            <p className="text-slate-400 text-xs mb-2">Historial</p>
            {(!anexo.historial || anexo.historial.length === 0) && (
              <p className="text-slate-500 text-xs">
                No hay movimientos registrados.
              </p>
            )}
            <div className="space-y-1 max-h-64 overflow-y-auto text-xs">
              {anexo.historial?.map((h, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-start gap-3 border-b border-slate-800/80 py-1"
                >
                  <div>
                    <p className="text-slate-200">{h.accion}</p>
                    {h.comentario && (
                      <p className="text-slate-400 mt-0.5">{h.comentario}</p>
                    )}
                    <p className="text-slate-500 mt-0.5">{h.rol}</p>
                  </div>
                  <div className="text-right text-slate-500">
                    {h.fechaHora &&
                      new Date(h.fechaHora).toLocaleString("es-AR")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
