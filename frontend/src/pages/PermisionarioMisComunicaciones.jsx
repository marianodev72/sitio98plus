// src/pages/PermisionarioMisComunicaciones.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";

const API_BASE_URL = "http://127.0.0.1:3000";

const DESTINOS = [
  { value: "INSPECTOR", label: "Inspector" },
  { value: "JEFE_BARRIO", label: "Jefe de Barrio" },
  { value: "ADMINISTRACION", label: "Administración" },
  { value: "ADMIN", label: "Administrador general" },
];

export default function PermisionarioMisComunicaciones() {
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [comunicaciones, setComunicaciones] = useState([]);

  const [enviando, setEnviando] = useState(false);
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [destino, setDestino] = useState(DESTINOS[0].value);
  const [adjuntos, setAdjuntos] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");

  // ---------------- Cargar comunicaciones ----------------

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        setError("");
        setSuccessMsg("");

        const token = localStorage.getItem("zn98_token");
        if (!token) {
          setError("Sesión expirada. Volvé a iniciar sesión.");
          setCargando(false);
          navigate("/login");
          return;
        }

        const resp = await fetch(
          `${API_BASE_URL}/api/permisionario/comunicaciones`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await resp.json();

        if (!resp.ok || !data.ok) {
          setError(data.msg || "No se pudieron obtener las comunicaciones.");
          setCargando(false);
          return;
        }

        setComunicaciones(data.comunicaciones || []);
        setCargando(false);
      } catch (err) {
        console.error("[MIS COMUNICACIONES] Error:", err);
        setError("Error al conectar con el servidor.");
        setCargando(false);
      }
    };

    cargar();
  }, [navigate]);

  // ---------------- Enviar nueva comunicación ------------

  const handleAdjuntosChange = (e) => {
    setAdjuntos(Array.from(e.target.files || []));
  };

  const handleEnviar = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!asunto.trim() || !mensaje.trim()) {
      setError("Debés completar el asunto y el mensaje.");
      return;
    }

    try {
      const token = localStorage.getItem("zn98_token");
      if (!token) {
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }

      setEnviando(true);

      const formData = new FormData();
      formData.append("asunto", asunto.trim());
      formData.append("mensaje", mensaje.trim());
      formData.append("destinatarioRole", destino);

      adjuntos.forEach((file) => {
        formData.append("adjuntos", file);
      });

      const resp = await fetch(
        `${API_BASE_URL}/api/permisionario/comunicaciones`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // NO seteamos Content-Type, lo hace el browser (boundary)
          },
          body: formData,
        }
      );

      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        setError(data.msg || "No se pudo enviar el mensaje.");
        setEnviando(false);
        return;
      }

      setComunicaciones((prev) => [data.comunicacion, ...prev]);

      setAsunto("");
      setMensaje("");
      setDestino(DESTINOS[0].value);
      setAdjuntos([]);
      setSuccessMsg("Mensaje enviado correctamente.");
      setEnviando(false);
    } catch (err) {
      console.error("[MIS COMUNICACIONES] Error enviando:", err);
      setError("Error al enviar el mensaje.");
      setEnviando(false);
    }
  };

  const formatearFecha = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const labelRol = (role) => {
    const found = DESTINOS.find((d) => d.value === role);
    if (found) return found.label;
    if (role === "PERMISIONARIO") return "Permisionario";
    if (role === "ENCARGADO_GENERAL") return "Administrador general";
    return role || "";
  };

  // ---------------- Render ----------------

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
            Cargando tus comunicaciones…
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <InstitutionalHeader />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/permisionario")}
          className="mb-4 text-sky-400 text-sm underline"
        >
          ← Volver al panel
        </button>

        <h1 className="text-2xl font-semibold mb-2">Mis comunicaciones</h1>
        <p className="text-slate-300 text-sm mb-6">
          Acá podés enviar mensajes a tu Inspector, Jefe de Barrio,
          Administración o Administrador general y ver el historial de
          comunicaciones asociadas a tu vivienda fiscal.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 border border-red-500/60 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-lg bg-emerald-900/40 border border-emerald-500/60 px-3 py-2 text-sm text-emerald-200">
            {successMsg}
          </div>
        )}

        {/* Formulario */}
        <section className="mb-8 bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-5 grid gap-3">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Enviar nueva comunicación
          </h2>

          <form onSubmit={handleEnviar} className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Asunto
                </label>
                <input
                  type="text"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  maxLength={200}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Destinatario
                </label>
                <select
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-sm text-slate-200"
                >
                  {DESTINOS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Mensaje
              </label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                maxLength={4000}
                rows={4}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm text-slate-200 resize-y"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Adjuntar archivo (PDF / JPG / PNG)
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,image/jpeg,image/png"
                onChange={handleAdjuntosChange}
                className="block w-full text-sm text-slate-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-500 file:text-slate-950 hover:file:bg-sky-400 cursor-pointer"
              />
              {adjuntos.length > 0 && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Adjuntos seleccionados: {adjuntos.length}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={enviando}
                className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-slate-950 transition-colors ${
                  enviando
                    ? "bg-sky-400/60 cursor-not-allowed"
                    : "bg-sky-500 hover:bg-sky-400"
                }`}
              >
                {enviando ? "Enviando…" : "Enviar mensaje"}
              </button>
            </div>
          </form>
        </section>

        {/* Historial */}
        <section>
          <h2 className="text-sm font-semibold text-slate-100 mb-3">
            Historial
          </h2>

          {comunicaciones.length === 0 ? (
            <p className="text-slate-400 text-sm">
              Todavía no registrás comunicaciones. Podés enviar tu primera
              consulta usando el formulario de arriba.
            </p>
          ) : (
            <div className="space-y-3">
              {comunicaciones.map((c) => (
                <article
                  key={c.id}
                  className="bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3"
                >
                  <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 mb-1.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-slate-100">
                        {c.asunto}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        De: {labelRol(c.remitenteRole)} · Para:{" "}
                        {labelRol(c.destinatarioRole)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {formatearFecha(c.createdAt)}
                    </span>
                  </header>

                  <div className="mb-2">
                    <p className="text-xs font-semibold text-slate-400">
                      Mensaje:
                    </p>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap">
                      {c.mensaje}
                    </p>
                  </div>

                  {c.adjuntos && c.adjuntos.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-slate-400">
                        Adjuntos:
                      </p>
                      <ul className="mt-1 space-y-1">
                        {c.adjuntos.map((a, idx) => (
                          <li key={idx}>
                            <a
                              href={`${API_BASE_URL}/${a.path}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-sky-400 underline"
                            >
                              {a.originalName}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
